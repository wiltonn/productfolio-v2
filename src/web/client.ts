/**
 * The only client-side script. It enhances forms the server already renders; it never
 * computes a planning figure.
 *
 * What it does:
 *   - turns a numeric cell's plain form into a read-first inline editor;
 *   - posts that same form in the background and puts the server's re-rendered fragments
 *     back on the page, so an ordinary numeric edit needs no full reload;
 *   - moves multi-field and destructive actions into native dialogs with real focus
 *     management.
 *
 * **Saves are serialized through one page-wide queue.** Only one mutation is ever in flight,
 * and the next is not sent until the previous has been answered. That is what makes the
 * figures trustworthy: a response is always rendered from state that already includes every
 * earlier save, so the last answer is the final persisted state. Ordering the requests on
 * the client and hoping the server processes them in that order does not work — request
 * arrival can be reordered, and aborting a request does not un-write a save the server has
 * already accepted.
 *
 * Two consequences the code relies on: a second edit of the same field while its save is
 * still queued replaces the queued one rather than racing it, and a field waiting its turn
 * keeps showing the value that was typed, marked as saving, until the server answers.
 *
 * What it deliberately does not do: recalculate capacity, reconciliation or feasibility.
 * A pending edit shows only the value that was typed; every derived figure on the page
 * comes back from the server.
 */

export const APP_JS = String.raw`
(function () {
  'use strict';

  var SAVED_FLASH_MS = 1600;
  var DRAFT_PREFIX = 'productfolio:drafts:';

  /* ------------------------------------------------------------ the mutation queue */

  var queue = [];                        // mutations waiting to be sent, in order
  var sending = null;                    // the one mutation in flight, or null
  var queuedByKey = Object.create(null); // field key -> its queued (not yet sent) mutation
  var settling = Object.create(null);    // field key -> the value awaiting persistence
  var drainWaiters = [];
  var reloading = false;                 // set when we navigate on purpose, drafts kept

  function pendingCount() { return queue.length + (sending ? 1 : 0); }

  function live(message) {
    var el = document.getElementById('live-status');
    if (el) el.textContent = message;
  }

  function setSaveBar(html) {
    var el = document.getElementById('save-status');
    if (el) el.innerHTML = html;
  }

  function pendingHtml() { return '<span class="savestate pending"><span class="spinner"></span>Saving…</span>'; }
  function savedHtml() { return '<span class="savestate saved">✓ Saved</span>'; }
  function failedHtml() { return '<span class="savestate failed">Not saved</span>'; }

  function flashSaved() {
    setSaveBar(savedHtml());
    window.setTimeout(function () {
      if (pendingCount() === 0 && !document.querySelector('.cell.editing, .cell.failed')) setSaveBar('');
    }, SAVED_FLASH_MS);
  }

  function cssEscape(value) { return String(value).replace(/["\\]/g, '\\$&'); }

  /**
   * A later edit of a field whose save has not left yet replaces it: the planner meant the
   * newer number, and sending both would put two entries in the change log for one change.
   */
  function enqueue(entry) {
    var queued = queuedByKey[entry.key];
    if (queued) {
      queued.action = entry.action;
      queued.body = entry.body;
      queued.label = entry.label;
      queued.onSuccess = entry.onSuccess;
      queued.onError = entry.onError;
    } else {
      queuedByKey[entry.key] = entry;
      queue.push(entry);
    }
    pump();
  }

  function pump() {
    if (sending) return;
    if (!queue.length) { notifyDrained(); return; }

    var entry = queue.shift();
    if (queuedByKey[entry.key] === entry) delete queuedByKey[entry.key];
    sending = entry;

    setSaveBar(pendingHtml());
    live('Saving ' + (entry.label || 'change') + '…');

    fetch(entry.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: entry.body
    }).then(function (response) {
      return response.json().then(
        function (payload) { return { status: response.status, payload: payload }; },
        function () { return { status: response.status, payload: null }; }
      );
    }).then(function (result) {
      finish(entry, result, null);
    }).catch(function (error) {
      finish(entry, null, error);
    });
  }

  function finish(entry, result, error) {
    sending = null;
    delete settling[entry.key];

    if (!error && result && result.payload && result.payload.ok) {
      // Serialized sends mean this answer was rendered after every earlier save landed,
      // so it is safe to take as the current state of the page.
      applyRegions(result.payload.regions || {});
      if (entry.onSuccess) entry.onSuccess();
      if (pendingCount() === 0) flashSaved();
      live(result.payload.status || 'Saved.');
    } else {
      var message = error
        ? 'Couldn’t reach the server. Your value is kept — retry when the connection is back.'
        : (result && result.payload && result.payload.message) || 'The change could not be saved.';
      setSaveBar(failedHtml());
      live('Not saved. ' + message);
      if (entry.onError) entry.onError(message);
    }

    pump();
  }

  function whenDrained(fn) {
    if (pendingCount() === 0) { fn(); return; }
    drainWaiters.push(fn);
  }

  function notifyDrained() {
    if (!drainWaiters.length) return;
    var waiting = drainWaiters;
    drainWaiters = [];
    waiting.forEach(function (fn) { fn(); });
  }

  /* ------------------------------------------------------------ region swapping */

  // Editors open when a region is replaced are re-opened afterwards, so a save on one row
  // never discards what is being typed on another.
  function snapshotEditors() {
    var open = [];
    document.querySelectorAll('.cell.editing, .cell.failed').forEach(function (cell) {
      var field = cell.getAttribute('data-field');
      if (settling[field]) return; // queued or in flight: it gets its saving state back instead
      var input = cell.querySelector('[data-input]');
      var err = cell.parentNode ? cell.parentNode.querySelector('.errbox') : null;
      open.push({
        field: field,
        value: input ? input.value : null,
        failed: cell.classList.contains('failed'),
        error: err ? err.getAttribute('data-message') : null,
        focused: !!input && document.activeElement === input
      });
    });
    return open;
  }

  function restoreEditors(open) {
    open.forEach(function (state) {
      var cell = document.querySelector('.cell[data-field="' + cssEscape(state.field) + '"]');
      if (!cell) return;
      openEditor(cell, state.value, false);
      if (state.failed && state.error) showCellError(cell, state.error, false);
      if (state.focused) {
        var input = cell.querySelector('[data-input]');
        if (input) input.focus();
      }
    });
  }

  /** A field still waiting its turn keeps showing what was typed, marked as saving. */
  function restorePendingCells() {
    Object.keys(settling).forEach(function (field) {
      var cell = document.querySelector('.cell[data-field="' + cssEscape(field) + '"]');
      if (cell) showPending(cell, settling[field]);
    });
  }

  function applyRegions(regions) {
    var active = document.activeElement;
    var focusKey = active ? active.getAttribute('data-focus-key') : null;
    var open = snapshotEditors();

    Object.keys(regions).forEach(function (key) {
      var target = document.querySelector('[data-region="' + cssEscape(key) + '"]');
      if (target) target.innerHTML = regions[key];
    });

    restoreEditors(open);
    restorePendingCells();

    // Focus is only moved when the swap actually took it away, so a save landing while the
    // planner has moved on somewhere else does not pull them back.
    if (focusKey && active && !document.body.contains(active)) {
      var refocus = document.querySelector('[data-focus-key="' + cssEscape(focusKey) + '"]');
      if (refocus) refocus.focus();
    }
  }

  /* ------------------------------------------------------------ inline cell editing */

  function cellOf(node) { return node.closest ? node.closest('.cell') : null; }

  /** What the field will be worth once everything queued for it has been saved. */
  function currentValue(cell) {
    var pending = cell.getAttribute('data-pending');
    return pending === null ? cell.getAttribute('data-value') : pending;
  }

  function openEditor(cell, value, focus) {
    var input = cell.querySelector('[data-input]');
    if (!input) return;
    cell.classList.add('editing');
    cell.classList.remove('saving');
    var td = cell.closest('td');
    if (td) td.classList.add('editing');
    if (value !== null && value !== undefined) input.value = value;
    if (focus !== false) {
      input.focus();
      if (input.select) input.select();
    }
  }

  function closeEditor(cell, restoreValue) {
    var input = cell.querySelector('[data-input]');
    if (input && restoreValue) input.value = currentValue(cell);
    cell.classList.remove('editing', 'failed');
    var td = cell.closest('td');
    if (td) td.classList.remove('editing', 'failed');
    clearCellError(cell);
  }

  function showPending(cell, value) {
    cell.classList.remove('editing', 'failed');
    cell.classList.add('saving');
    var td = cell.closest('td');
    if (td) td.classList.remove('editing', 'failed');
    cell.setAttribute('data-pending', value);
    var read = cell.querySelector('.v');
    if (read) read.textContent = value + (cell.getAttribute('data-suffix') || '');
    var input = cell.querySelector('[data-input]');
    if (input) input.value = value;
  }

  function focusEditButton(cell) {
    var btn = cell.querySelector('[data-edit]');
    if (btn) btn.focus();
  }

  function clearCellError(cell) {
    var holder = cell.parentNode;
    if (!holder) return;
    var box = holder.querySelector('.errbox');
    if (box) box.remove();
    var input = cell.querySelector('[data-input]');
    if (input) input.removeAttribute('aria-invalid');
  }

  function showCellError(cell, message, focus) {
    clearCellError(cell);
    cell.classList.remove('saving');
    cell.classList.add('failed');
    var td = cell.closest('td');
    if (td) td.classList.add('failed');
    var box = document.createElement('div');
    box.className = 'errbox';
    box.setAttribute('data-message', message);
    box.setAttribute('role', 'alert');
    box.innerHTML =
      '<div></div><div class="acts">' +
      '<button type="button" data-retry>Retry</button>' +
      '<button type="button" class="ghost" data-discard>Discard</button></div>';
    box.firstChild.textContent = message;
    cell.parentNode.appendChild(box);
    var input = cell.querySelector('[data-input]');
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      if (focus !== false) input.focus();
    }
  }

  function unchanged(cell, raw) {
    var previous = currentValue(cell);
    var a = Number(raw);
    var b = Number(previous);
    if (isFinite(a) && isFinite(b)) return a === b;
    return String(raw).trim() === String(previous).trim();
  }

  function commitCell(cell) {
    var input = cell.querySelector('[data-input]');
    var form = cell.querySelector('form[data-editform]');
    if (!input || !form) return;

    // A save that re-enters the same value is not sent at all: no request, and no
    // change-log entry for the server to decide about.
    if (unchanged(cell, input.value)) {
      closeEditor(cell, true);
      focusEditButton(cell);
      live('No change.');
      return;
    }
    sendCell(cell, form);
    focusEditButton(cell);
  }

  /**
   * Hands the edit to the queue and returns the cell to a read state straight away, showing
   * the typed value as saving. The editor comes back only if the server refuses it.
   */
  function sendCell(cell, form) {
    var key = cell.getAttribute('data-field');
    var input = form.querySelector('[data-input]');
    var raw = input.value;

    settling[key] = raw;
    showPending(cell, raw);

    enqueue({
      key: key,
      action: form.getAttribute('action'),
      body: new URLSearchParams(new FormData(form)).toString(),
      label: cell.getAttribute('data-label') || 'value',
      onError: function (message) {
        var current = document.querySelector('.cell[data-field="' + cssEscape(key) + '"]') || cell;
        current.removeAttribute('data-pending');
        openEditor(current, raw, false);
        showCellError(current, message, true);
      }
    });
  }

  document.addEventListener('click', function (event) {
    var editBtn = event.target.closest('[data-edit]');
    if (editBtn) {
      var cell = cellOf(editBtn);
      if (cell) openEditor(cell, currentValue(cell), true);
      return;
    }
    var retry = event.target.closest('[data-retry]');
    if (retry) {
      var rc = retry.closest('td').querySelector('.cell');
      var form = rc && rc.querySelector('form[data-editform]');
      if (rc && form) { clearCellError(rc); sendCell(rc, form); focusEditButton(rc); }
      return;
    }
    var discard = event.target.closest('[data-discard]');
    if (discard) {
      var dc = discard.closest('td').querySelector('.cell');
      if (dc) {
        closeEditor(dc, true);
        focusEditButton(dc);
        if (pendingCount() === 0) setSaveBar('');
        live('Edit discarded.');
      }
    }
  });

  document.addEventListener('keydown', function (event) {
    var input = event.target.closest ? event.target.closest('[data-input]') : null;
    if (!input) return;
    var cell = cellOf(input);
    if (!cell) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitCell(cell);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeEditor(cell, true);
      focusEditButton(cell);
      if (pendingCount() === 0) setSaveBar('');
      live('Edit cancelled.');
    }
  });

  // Commit on blur, but only when focus really left the cell and the editor is still open,
  // so a blur following Enter — which already closed it — is a no-op.
  document.addEventListener('focusout', function (event) {
    var input = event.target.closest ? event.target.closest('[data-input]') : null;
    if (!input) return;
    var cell = cellOf(input);
    if (!cell) return;
    window.setTimeout(function () {
      if (!document.body.contains(cell)) return;
      if (cell.contains(document.activeElement)) return;
      if (!cell.classList.contains('editing')) return;
      if (cell.classList.contains('failed')) return;
      commitCell(cell);
    }, 0);
  });

  /* ------------------------------------------------------------ unsaved drafts */

  function draftKey(url) {
    var target = new URL(url, window.location.href);
    return DRAFT_PREFIX + target.pathname + target.search;
  }

  /** Editors holding something that is not saved and not on its way to being saved. */
  function collectDrafts() {
    var drafts = [];
    document.querySelectorAll('.cell.editing, .cell.failed').forEach(function (cell) {
      var input = cell.querySelector('[data-input]');
      if (!input) return;
      var failed = cell.classList.contains('failed');
      if (!failed && unchanged(cell, input.value)) return; // an open editor nobody typed in
      var box = cell.parentNode.querySelector('.errbox');
      drafts.push({
        field: cell.getAttribute('data-field'),
        value: input.value,
        error: box ? box.getAttribute('data-message') : null
      });
    });
    return drafts;
  }

  function stashDrafts(url, drafts) {
    try {
      window.sessionStorage.setItem(draftKey(url), JSON.stringify(drafts));
      return true;
    } catch (e) {
      return false;
    }
  }

  function takeStashedDrafts() {
    try {
      var key = draftKey(window.location.href);
      var raw = window.sessionStorage.getItem(key);
      if (!raw) return [];
      window.sessionStorage.removeItem(key);
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Adding or removing a person, an absence or a work package changes what the page
   * contains, not just what its figures say, so the page is loaded afresh. Anything typed
   * elsewhere and not yet saved travels across that refresh; if it cannot be carried, the
   * planner is asked before it is dropped.
   */
  function refreshKeepingDrafts(url) {
    var drafts = collectDrafts();
    if (drafts.length && !stashDrafts(url, drafts)) {
      var warning =
        drafts.length === 1
          ? 'One edit has not been saved and cannot be carried across the refresh. Discard it?'
          : drafts.length + ' edits have not been saved and cannot be carried across the refresh. Discard them?';
      if (!window.confirm(warning)) {
        live('The page was not refreshed; your unsaved edits are still here.');
        return;
      }
    }
    reloading = true;
    window.location.assign(url);
  }

  function restoreStashedDrafts() {
    var drafts = takeStashedDrafts();
    if (!drafts.length) return;
    var restored = 0;
    drafts.forEach(function (draft) {
      var cell = document.querySelector('.cell[data-field="' + cssEscape(draft.field) + '"]');
      if (!cell) return;
      restored += 1;
      openEditor(cell, draft.value, false);
      if (draft.error) showCellError(cell, draft.error, false);
    });
    if (!restored) return;
    setSaveBar(failedHtml());
    live(
      (restored === 1 ? 'One unsaved edit was' : restored + ' unsaved edits were') +
        ' kept while the page refreshed. They are still not saved.'
    );
  }

  /* ------------------------------------------------------------ dialogs */

  var lastTrigger = null;

  function openDialog(id, trigger) {
    var dialog = document.getElementById(id);
    if (!dialog || typeof dialog.showModal !== 'function') return false;
    // A dialog opened from a row menu must return focus to the menu button, not to the
    // menu item, which is hidden again the moment the menu closes.
    var origin = trigger || document.activeElement;
    var menu = origin && origin.closest ? origin.closest('.menu') : null;
    lastTrigger = menu && menu.previousElementSibling ? menu.previousElementSibling : origin;

    var err = dialog.querySelector('.err');
    if (err) err.remove();
    dialog.showModal();
    var first = dialog.querySelector('input:not([type=hidden]), select, textarea, button');
    if (first) first.focus();
    return true;
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest('[data-dialog]');
    if (opener) {
      if (openDialog(opener.getAttribute('data-dialog'), opener)) event.preventDefault();
      return;
    }
    var closer = event.target.closest('[data-close-dialog]');
    if (closer) {
      event.preventDefault();
      var dialog = closer.closest('dialog');
      if (dialog) closeDialog(dialog);
    }
  });

  document.addEventListener('close', function (event) {
    if (event.target.tagName !== 'DIALOG') return;
    if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
  }, true);

  /**
   * Multi-field and destructive actions post through the same queue, for one reason: so a
   * rejected value stays in the dialog with everything that was typed still in it. On
   * success the page is loaded afresh, but only once every other save has been answered and
   * every unsaved draft elsewhere has been put somewhere safe.
   */
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form.hasAttribute('data-dialogform')) return;
    var dialog = form.closest('dialog');
    if (!dialog) return;
    event.preventDefault();

    var submitButtons = form.querySelectorAll('button[type=submit], button:not([type])');
    submitButtons.forEach(function (b) { b.disabled = true; });
    var backField = form.querySelector('input[name=back]');
    var target = backField && backField.value ? backField.value : window.location.href;

    enqueue({
      key: 'dialog:' + (dialog.id || form.getAttribute('action')),
      action: form.getAttribute('action'),
      body: new URLSearchParams(new FormData(form)).toString(),
      label: form.getAttribute('data-label') || 'change',
      onSuccess: function () {
        submitButtons.forEach(function (b) { b.disabled = false; });
        closeDialog(dialog);
        whenDrained(function () { refreshKeepingDrafts(target); });
      },
      onError: function (message) {
        submitButtons.forEach(function (b) { b.disabled = false; });
        var existing = dialog.querySelector('.err');
        if (existing) existing.remove();
        var box = document.createElement('div');
        box.className = 'err';
        box.setAttribute('role', 'alert');
        box.textContent = message;
        var body = dialog.querySelector('.body');
        if (body) body.insertBefore(box, body.firstChild);
      }
    });
  });

  /* ------------------------------------------------------------ row menus */

  function closeMenus() {
    document.querySelectorAll('.menu[data-open]').forEach(function (menu) {
      var trigger = menu.previousElementSibling;
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      menu.removeAttribute('data-open');
      menu.hidden = true;
    });
  }

  document.addEventListener('click', function (event) {
    var dots = event.target.closest('.dots');
    if (!dots) { closeMenus(); return; }
    var menu = dots.nextElementSibling;
    if (!menu || !menu.classList.contains('menu')) return;
    var isOpen = menu.hasAttribute('data-open');
    closeMenus();
    if (isOpen) { dots.setAttribute('aria-expanded', 'false'); return; }
    menu.hidden = false;
    menu.setAttribute('data-open', '');
    dots.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector('button');
    if (first) first.focus();
  });

  document.addEventListener('keydown', function (event) {
    var menu = event.target.closest ? event.target.closest('.menu[data-open]') : null;
    if (!menu) return;
    var items = Array.prototype.slice.call(menu.querySelectorAll('button'));
    var index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      var trigger = menu.previousElementSibling;
      closeMenus();
      if (trigger) trigger.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1) % items.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length].focus();
    }
  });

  /* ------------------------------------------------------------ context bar */

  document.addEventListener('change', function (event) {
    var select = event.target.closest ? event.target.closest('[data-autosubmit]') : null;
    if (select && select.form) select.form.submit();
  });

  /* ------------------------------------------------------------ leaving the page */

  window.addEventListener('beforeunload', function (event) {
    if (reloading) return; // a refresh that has already put the drafts somewhere safe
    if (pendingCount() === 0 && !document.querySelector('.cell.editing, .cell.failed')) return;
    event.preventDefault();
    event.returnValue = '';
    return '';
  });

  restoreStashedDrafts();

  // Exposed for the browser regression tests, which need to know when the queue is idle.
  window.__productfolio = {
    pending: pendingCount,
    settling: function () { return Object.keys(settling); },
    drafts: collectDrafts
  };
})();
`;
