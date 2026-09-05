/**
 * The only client-side script. It enhances forms the server already renders; it never
 * computes a planning figure.
 *
 * What it does:
 *   - turns a numeric cell's plain form into a read-first inline editor;
 *   - posts that same form in the background and puts the server's re-rendered fragments
 *     back on the page, so an ordinary numeric edit needs no full reload;
 *   - keeps rapid edits and slow responses honest, with a per-field sequence number and a
 *     page-wide response ordinal, so a stale answer can never revert a newer value;
 *   - moves multi-field and destructive actions into native dialogs with real focus
 *     management.
 *
 * What it deliberately does not do: recalculate capacity, reconciliation or feasibility.
 * A pending edit shows only the value that was typed; every derived figure on the page
 * comes back from the server.
 */

export const APP_JS = String.raw`
(function () {
  'use strict';

  var SAVED_FLASH_MS = 1600;

  /* ------------------------------------------------------------ save bookkeeping */

  var fieldSeq = Object.create(null);   // field key -> sequence number issued
  var fieldLatest = Object.create(null); // field key -> newest sequence number
  var controllers = Object.create(null); // field key -> AbortController
  var ordinal = 0;                       // page-wide request ordinal
  var appliedOrdinal = 0;                // highest ordinal whose regions were applied
  var inFlight = 0;
  // Fields whose editor has been committed and is waiting for the server's answer. Their
  // editors are not re-opened by a region swap: the fresh read state replaces them.
  var settling = Object.create(null);

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
      if (inFlight === 0 && !document.querySelector('.cell.editing, .cell.failed')) setSaveBar('');
    }, SAVED_FLASH_MS);
  }

  /* ------------------------------------------------------------ region swapping */

  // Editors that are open when a region is replaced are re-opened afterwards, so a save
  // on one row never discards what is being typed on another.
  function snapshotEditors() {
    var open = [];
    document.querySelectorAll('.cell.editing, .cell.failed').forEach(function (cell) {
      if (settling[cell.getAttribute('data-field')]) return;
      var input = cell.querySelector('[data-input]');
      var err = cell.parentNode ? cell.parentNode.querySelector('.errbox') : null;
      open.push({
        field: cell.getAttribute('data-field'),
        value: input ? input.value : null,
        failed: cell.classList.contains('failed'),
        error: err ? err.getAttribute('data-message') : null
      });
    });
    return open;
  }

  function restoreEditors(open) {
    open.forEach(function (state) {
      var cell = document.querySelector('.cell[data-field="' + cssEscape(state.field) + '"]');
      if (!cell) return;
      openEditor(cell, state.value, false);
      if (state.failed && state.error) showCellError(cell, state.error);
    });
  }

  function cssEscape(value) { return String(value).replace(/["\\]/g, '\\$&'); }

  function applyRegions(regions, myOrdinal, focusAfter) {
    // A response issued earlier than one already applied describes older state: drop it.
    if (myOrdinal < appliedOrdinal) return false;
    appliedOrdinal = myOrdinal;

    var focusKey =
      focusAfter || (document.activeElement ? document.activeElement.getAttribute('data-focus-key') : null);
    var open = snapshotEditors();

    Object.keys(regions).forEach(function (key) {
      var target = document.querySelector('[data-region="' + cssEscape(key) + '"]');
      if (target) target.innerHTML = regions[key];
    });

    restoreEditors(open);
    if (focusKey) {
      var refocus = document.querySelector('[data-focus-key="' + cssEscape(focusKey) + '"]');
      if (refocus) refocus.focus();
    }
    return true;
  }

  /* ------------------------------------------------------------ inline cell editing */

  function cellOf(node) { return node.closest ? node.closest('.cell') : null; }

  function openEditor(cell, value, select) {
    var input = cell.querySelector('[data-input]');
    if (!input) return;
    cell.classList.add('editing');
    var td = cell.closest('td');
    if (td) td.classList.add('editing');
    if (value !== null && value !== undefined) input.value = value;
    if (select !== false) {
      input.focus();
      if (input.select) input.select();
    }
  }

  function closeEditor(cell, restoreValue) {
    var input = cell.querySelector('[data-input]');
    if (input && restoreValue) input.value = cell.getAttribute('data-value');
    cell.classList.remove('editing', 'failed');
    var td = cell.closest('td');
    if (td) td.classList.remove('editing', 'failed');
    clearCellError(cell);
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
  }

  function showCellError(cell, message) {
    clearCellError(cell);
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
      input.focus();
    }
  }

  function unchanged(cell, raw) {
    var previous = cell.getAttribute('data-value');
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
  }

  // The committed field is put aside while it is in flight: a region swap replaces it with
  // the server's fresh read state instead of re-opening what was typed, and focus returns
  // to the cell's own edit button.
  function sendCell(cell, form) {
    var key = cell.getAttribute('data-field');
    settling[key] = true;
    submitForm(form, {
      field: key,
      focusAfter: key,
      label: cell.getAttribute('data-label') || 'value',
      onPending: function () {
        cell.classList.remove('failed');
        var td = cell.closest('td');
        if (td) td.classList.remove('failed');
        clearCellError(cell);
      },
      onSettled: function () { delete settling[key]; },
      onError: function (message) {
        var current = document.querySelector('.cell[data-field="' + cssEscape(key) + '"]') || cell;
        openEditor(current, form.querySelector('[data-input]').value, false);
        showCellError(current, message);
      }
    });
  }

  document.addEventListener('click', function (event) {
    var editBtn = event.target.closest('[data-edit]');
    if (editBtn) {
      var cell = cellOf(editBtn);
      if (cell) openEditor(cell, cell.getAttribute('data-value'), true);
      return;
    }
    var retry = event.target.closest('[data-retry]');
    if (retry) {
      var rc = retry.closest('td').querySelector('.cell');
      if (rc) commitCellForced(rc);
      return;
    }
    var discard = event.target.closest('[data-discard]');
    if (discard) {
      var dc = discard.closest('td').querySelector('.cell');
      if (dc) {
        closeEditor(dc, true);
        focusEditButton(dc);
        setSaveBar('');
        live('Edit discarded.');
      }
    }
  });

  // Retry re-sends whatever is in the box, including a value equal to the stored one.
  function commitCellForced(cell) {
    var form = cell.querySelector('form[data-editform]');
    if (form) sendCell(cell, form);
  }

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
      setSaveBar('');
      live('Edit cancelled.');
    }
  });

  // Commit on blur, but only when focus really left the cell, the editor is still open,
  // and nothing is already being sent for it — so a blur following Enter is a no-op.
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
      if (cell.getAttribute('data-sending') === '1') return;
      commitCell(cell);
    }, 0);
  });

  /* ------------------------------------------------------------ posting */

  function submitForm(form, options) {
    var opts = options || {};
    var key = opts.field || form.getAttribute('action');
    var seq = (fieldSeq[key] = (fieldSeq[key] || 0) + 1);
    fieldLatest[key] = seq;
    var myOrdinal = ++ordinal;

    if (controllers[key]) controllers[key].abort();
    var controller = new AbortController();
    controllers[key] = controller;

    var cell = form.closest('.cell');
    if (cell) cell.setAttribute('data-sending', '1');
    if (opts.onPending) opts.onPending();

    inFlight += 1;
    setSaveBar(pendingHtml());
    live('Saving ' + (opts.label || 'change') + '…');

    return fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
      signal: controller.signal
    }).then(function (response) {
      return response.json().then(function (payload) { return { status: response.status, payload: payload }; });
    }).then(function (result) {
      // An answer to a superseded edit of the same field is dropped entirely.
      if (fieldLatest[key] !== seq) return;
      if (cell) cell.removeAttribute('data-sending');

      if (result.payload && result.payload.ok) {
        // The regions are applied while the field is still set aside, so the swap replaces
        // the committed editor with the server's read state instead of re-opening it.
        applyRegions(result.payload.regions || {}, myOrdinal, opts.focusAfter);
        if (opts.onSettled) opts.onSettled();
        if (opts.onSuccess) opts.onSuccess(result.payload);
        flashSaved();
        live(result.payload.status || 'Saved.');
        return;
      }
      if (opts.onSettled) opts.onSettled();
      var message = (result.payload && result.payload.message) || 'The change could not be saved.';
      setSaveBar(failedHtml());
      live('Not saved. ' + message);
      if (opts.onError) opts.onError(message);
    }).catch(function (error) {
      if (error && error.name === 'AbortError') return;
      if (fieldLatest[key] !== seq) return;
      if (cell) cell.removeAttribute('data-sending');
      if (opts.onSettled) opts.onSettled();
      var message = 'Couldn’t reach the server. Your value is kept — retry when the connection is back.';
      setSaveBar(failedHtml());
      live('Not saved. ' + message);
      if (opts.onError) opts.onError(message);
    }).then(function () {
      inFlight -= 1;
    });
  }

  /* ------------------------------------------------------------ dialogs */

  var lastTrigger = null;
  var reloading = false;  // set when a dialog save navigates on purpose

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
   * Multi-field and destructive actions post in the background for one reason only: so a
   * rejected value stays in the dialog with everything the user typed still in it. They add
   * and remove people, absences and work packages, which changes what the page contains —
   * not just what its figures say — so on success the page is loaded afresh rather than
   * patched. Ordinary numeric edits, which are the frequent ones, never reload.
   */
  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form.hasAttribute('data-dialogform')) return;
    var dialog = form.closest('dialog');
    if (!dialog) return;
    event.preventDefault();

    var submitButtons = form.querySelectorAll('button[type=submit], button:not([type])');
    submitButtons.forEach(function (b) { b.disabled = true; });

    submitForm(form, {
      field: 'dialog:' + (dialog.id || form.getAttribute('action')),
      label: form.getAttribute('data-label') || 'change',
      onSuccess: function () {
        submitButtons.forEach(function (b) { b.disabled = false; });
        closeDialog(dialog);
        var backField = form.querySelector('input[name=back]');
        reloading = true;
        window.location.assign(backField && backField.value ? backField.value : window.location.href);
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

  function closeMenus(except) {
    document.querySelectorAll('.menu[data-open]').forEach(function (menu) {
      if (menu === except) return;
      var trigger = menu.previousElementSibling;
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      menu.removeAttribute('data-open');
      menu.hidden = true;
    });
  }

  document.addEventListener('click', function (event) {
    var dots = event.target.closest('.dots');
    if (!dots) { closeMenus(null); return; }
    var menu = dots.nextElementSibling;
    if (!menu || !menu.classList.contains('menu')) return;
    var isOpen = menu.hasAttribute('data-open');
    closeMenus(null);
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
      closeMenus(null);
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
    if (reloading) return;
    var dirty = document.querySelector('.cell.editing, .cell.failed');
    if (inFlight === 0 && !dirty) return;
    event.preventDefault();
    event.returnValue = '';
    return '';
  });
})();
`;
