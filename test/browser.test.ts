/**
 * Client behaviour, in a real browser.
 *
 * Both of these were reproduced by hand in a browser and cannot be caught by posting to the
 * server from a test: they are about what the page does with several saves at once, and
 * about what it does with a half-typed value when it navigates.
 *
 *   1. Save ordering. Ordering requests on the client establishes nothing about the order a
 *      server accepts them, and aborting a request does not un-write a save already made.
 *      The fix serializes every mutation through one queue; these tests hold requests at the
 *      network boundary to prove that only one is ever outstanding, and that what the page
 *      finally shows is what was finally persisted.
 *
 *   2. Unsaved input. A dialog save refreshes the page, which used to take a rejected edit
 *      elsewhere on the page with it. These tests type a value the server refuses, add a
 *      person, and check the refused value is still there afterwards.
 *
 * If no Chrome is installed the suites skip: they need a browser, and a machine without one
 * is not a broken build.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { openDatabase, type Database } from '../src/db/database.js';
import * as repo from '../src/db/repo.js';
import { loadPlan } from '../src/plan.js';
import { seedSyntheticExample } from '../src/seed.js';
import { startServer } from '../src/web/server.js';
import { findChrome, Page } from './browser-driver.js';

const chrome = findChrome();
const skip = chrome === null ? 'no Chrome available (set PRODUCTFOLIO_CHROME to point at one)' : false;

interface Harness {
  db: Database;
  page: Page;
  base: string;
  teamId: number;
  quarterId: number;
  close: () => Promise<void>;
}

async function harness(): Promise<Harness> {
  const db = openDatabase(':memory:');
  const { teamId, quarterId } = seedSyntheticExample(db);
  const server = startServer(db, 0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const page = await Page.launch(chrome!);
  return {
    db,
    page,
    base,
    teamId,
    quarterId,
    close: async () => {
      await page.close();
      server.close();
    },
  };
}

/** Commits a numeric cell the way a planner does: open the editor, type, press Enter. */
const commit = (field: string, value: string) => `
  var cell = document.querySelector('.cell[data-field="${field}"]');
  cell.querySelector('[data-edit]').click();
  var input = cell.querySelector('[data-input]');
  input.value = ${JSON.stringify(value)};
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  return true;
`;

const readValue = (field: string) => `
  return document.querySelector('.cell[data-field="${field}"] .v').textContent;
`;

describe('save ordering in the browser', { skip, timeout: 60000 }, () => {
  let h: Harness;
  let overheadOf: (name: string) => number;
  let personId: (name: string) => number;

  before(async () => {
    h = await harness();
    personId = (name) => repo.listPeople(h.db, h.teamId, h.quarterId).find((p) => p.name === name)!.id;
    overheadOf = (name) => repo.listPeople(h.db, h.teamId, h.quarterId).find((p) => p.name === name)!.overheadPercent;
  });

  after(async () => {
    await h.close();
  });

  it('never has more than one save outstanding, however fast the edits come', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);

    // Every save is held at the network boundary long enough that a second one, if the page
    // were willing to send it, would overlap the first.
    let outstanding = 0;
    let peak = 0;
    let saves = 0;
    await h.page.interceptRequests((request) => {
      if (request.method !== 'POST') return 0;
      saves += 1;
      outstanding += 1;
      peak = Math.max(peak, outstanding);
      setTimeout(() => {
        outstanding -= 1;
      }, 200);
      return 200;
    });

    const lena = personId('Lena (lead)');
    const rob = personId('Rob');
    const chen = personId('Chen');

    await h.page.eval(commit(`overhead:${lena}`, '50'));
    await h.page.eval(commit(`overhead:${rob}`, '20'));
    await h.page.eval(commit(`overhead:${chen}`, '30'));
    await h.page.settle();
    await h.page.stopIntercepting();

    assert.equal(peak, 1, 'saves are serialized, so the server never has to decide an order');
    assert.equal(saves, 3, 'and none of the three edits was dropped');
    assert.equal(overheadOf('Lena (lead)'), 50);
    assert.equal(overheadOf('Rob'), 20);
    assert.equal(overheadOf('Chen'), 30);
  });

  it('a save whose request is held until a later one is written still shows its own value', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const lena = personId('Lena (lead)');
    const rob = personId('Rob');

    // This is the original reproduction: hold the first person's request open long enough
    // that, without a queue, the second person's save would be written and answered first.
    let first = true;
    await h.page.interceptRequests((request) => {
      if (request.method !== 'POST') return 0;
      if (first) {
        first = false;
        return 600;
      }
      return 0;
    });

    await h.page.eval(commit(`overhead:${lena}`, '60'));
    await h.page.eval(commit(`overhead:${rob}`, '35'));
    await h.page.settle();
    await h.page.stopIntercepting();

    assert.equal(overheadOf('Lena (lead)'), 60, 'the held save was written');
    assert.equal(overheadOf('Rob'), 35);

    // What the page shows must be what was persisted — the bug was a stale 50% here.
    assert.equal(await h.page.eval(readValue(`overhead:${lena}`)), '60%');
    assert.equal(await h.page.eval(readValue(`overhead:${rob}`)), '35%');

    // …and so must every shared summary rendered from those figures.
    const plan = loadPlan(h.db, h.teamId, h.quarterId)!;
    const teamTotal = await h.page.eval<string>(`
      return [...document.querySelectorAll('tr.total')][0].querySelectorAll('td.num')[3].textContent.trim();
    `);
    assert.equal(teamTotal, plan.capacity.overheadEw.toFixed(1), 'the team total agrees with the database');
  });

  it('a delayed response cannot revert a newer value either', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const lena = personId('Lena (lead)');
    const rob = personId('Rob');

    // Hold the *answers* back instead of the requests, oldest longest.
    await h.page.eval(`
      var n = 0;
      var real = window.fetch;
      window.fetch = function () {
        var wait = n++ === 0 ? 500 : 0;
        return real.apply(this, arguments).then(function (r) {
          return new Promise(function (res) { setTimeout(function () { res(r); }, wait); });
        });
      };
      return true;
    `);

    await h.page.eval(commit(`overhead:${lena}`, '15'));
    await h.page.eval(commit(`overhead:${rob}`, '45'));
    await h.page.settle();

    assert.equal(overheadOf('Lena (lead)'), 15);
    assert.equal(overheadOf('Rob'), 45);
    assert.equal(await h.page.eval(readValue(`overhead:${lena}`)), '15%');
    assert.equal(await h.page.eval(readValue(`overhead:${rob}`)), '45%');
  });

  it('editing the same field twice while the first save is held sends the later value last', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const lena = personId('Lena (lead)');

    const bodies: string[] = [];
    let first = true;
    await h.page.interceptRequests((request) => {
      if (request.method !== 'POST') return 0;
      bodies.push(request.postData);
      if (first) {
        first = false;
        return 500;
      }
      return 0;
    });

    await h.page.eval(commit(`overhead:${lena}`, '11'));
    await h.page.eval(commit(`overhead:${lena}`, '22'));
    await h.page.settle();
    await h.page.stopIntercepting();

    assert.equal(overheadOf('Lena (lead)'), 22, 'the later edit is what is persisted');
    assert.equal(await h.page.eval(readValue(`overhead:${lena}`)), '22%');
    assert.equal(bodies.length, 2, 'the in-flight save was not aborted — it had already been accepted');
    assert.match(bodies[0]!, /percent=11/);
    assert.match(bodies[1]!, /percent=22/);
  });

  it('two edits of one field made before either is sent are coalesced into a single save', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const lena = personId('Lena (lead)');
    const rob = personId('Rob');
    const before = repo.listChanges(h.db, h.teamId, h.quarterId).length;

    const bodies: string[] = [];
    await h.page.interceptRequests((request) => {
      if (request.method !== 'POST') return 0;
      bodies.push(request.postData);
      return request.postData.includes('percent=1') ? 400 : 0;
    });

    // The first save occupies the queue; the next two are for one field and both wait, so
    // only the later value is ever sent.
    await h.page.eval(commit(`overhead:${rob}`, '1'));
    await h.page.eval(commit(`overhead:${lena}`, '33'));
    await h.page.eval(commit(`overhead:${lena}`, '44'));
    await h.page.settle();
    await h.page.stopIntercepting();

    assert.equal(bodies.length, 2, 'the superseded value is never sent');
    assert.equal(overheadOf('Lena (lead)'), 44);
    assert.equal(await h.page.eval(readValue(`overhead:${lena}`)), '44%');
    assert.equal(
      repo.listChanges(h.db, h.teamId, h.quarterId).length,
      before + 2,
      'one change logged per edit the planner actually made',
    );
  });

  it('a field waiting its turn shows the value that was typed, not the stored one', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const lena = personId('Lena (lead)');
    const rob = personId('Rob');

    await h.page.interceptRequests((request) => (request.method === 'POST' ? 700 : 0));

    await h.page.eval(commit(`overhead:${rob}`, '5'));
    await h.page.eval(commit(`overhead:${lena}`, '17'));

    // While Rob's save is in flight, Lena's is queued behind it and must not read back as
    // whatever is still in the database.
    await h.page.waitFor(`window.__productfolio.settling().indexOf('overhead:${lena}') !== -1`);
    assert.equal(await h.page.eval(readValue(`overhead:${lena}`)), '17%', 'the queued value is what is shown');

    await h.page.settle(20000);
    await h.page.stopIntercepting();
    assert.equal(overheadOf('Lena (lead)'), 17);
    assert.equal(await h.page.eval(readValue(`overhead:${lena}`)), '17%');
  });
});

describe('unsaved input in the browser', { skip, timeout: 60000 }, () => {
  let h: Harness;
  let personId: (name: string) => number;

  before(async () => {
    h = await harness();
    personId = (name) => repo.listPeople(h.db, h.teamId, h.quarterId).find((p) => p.name === name)!.id;
  });

  after(async () => {
    await h.close();
  });

  /** Types a value the server refuses, and waits for the cell to show the refusal. */
  const rejectOverhead = async (field: string, value: string) => {
    await h.page.eval(commit(field, value));
    await h.page.waitFor(`document.querySelector('.cell[data-field="${field}"]').classList.contains('failed')`);
  };

  it('a rejected value survives the refresh that a dialog save triggers', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const lena = personId('Lena (lead)');
    const field = `overhead:${lena}`;

    await rejectOverhead(field, '250');
    assert.equal(await h.page.eval<string>(`return document.querySelector('.cell[data-field="${field}"] [data-input]').value;`), '250');

    // Now add a person, which succeeds and refreshes the page.
    await h.page.eval(`
      var d = document.getElementById('dlg-add-person');
      d.showModal();
      var f = d.querySelector('form');
      f.elements.name.value = 'Nadia (synthetic)';
      f.elements.fraction.value = '1';
      f.requestSubmit();
      return true;
    `);
    await h.page.waitFor(`document.body.textContent.indexOf('Nadia (synthetic)') !== -1`, 15000);
    await h.page.waitFor('!!window.__productfolio');

    // The person was added…
    assert.ok(repo.listPeople(h.db, h.teamId, h.quarterId).some((p) => p.name === 'Nadia (synthetic)'));

    // …and the refused edit is still on the page, still refused, still holding 250.
    const state = await h.page.eval<{ value: string; failed: boolean; error: string | null; bar: string }>(`
      var cell = document.querySelector('.cell[data-field="${field}"]');
      var box = cell.parentNode.querySelector('.errbox');
      return {
        value: cell.querySelector('[data-input]').value,
        failed: cell.classList.contains('failed'),
        error: box ? box.getAttribute('data-message') : null,
        bar: document.getElementById('save-status').textContent.trim()
      };
    `);
    assert.equal(state.value, '250', 'the typed value came across the refresh');
    assert.equal(state.failed, true);
    assert.match(state.error ?? '', /between 0 and 100/);
    assert.equal(state.bar, 'Not saved', 'and the page still says so');

    // Nothing was written for it.
    assert.equal(repo.listPeople(h.db, h.teamId, h.quarterId).find((p) => p.id === lena)!.overheadPercent, 40);
  });

  it('several rejected values on different rows all survive the refresh', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const rob = `overhead:${personId('Rob')}`;
    const chen = `overhead:${personId('Chen')}`;

    await rejectOverhead(rob, '150');
    await rejectOverhead(chen, '199');

    await h.page.eval(`
      var d = document.getElementById('dlg-add-person');
      d.showModal();
      var f = d.querySelector('form');
      f.elements.name.value = 'Owen (synthetic)';
      f.elements.fraction.value = '1';
      f.requestSubmit();
      return true;
    `);
    await h.page.waitFor(`document.body.textContent.indexOf('Owen (synthetic)') !== -1`, 15000);
    await h.page.waitFor('!!window.__productfolio');

    const kept = await h.page.eval<Array<{ field: string; value: string; error: string | null }>>(`
      return ['${rob}', '${chen}'].map(function (field) {
        var cell = document.querySelector('.cell[data-field="' + field + '"]');
        var box = cell.parentNode.querySelector('.errbox');
        return {
          field: field,
          value: cell.querySelector('[data-input]').value,
          error: box ? box.getAttribute('data-message') : null
        };
      });
    `);
    assert.deepEqual(
      kept.map((k) => k.value),
      ['150', '199'],
      'both refused values came across the refresh',
    );
    for (const k of kept) assert.match(k.error ?? '', /between 0 and 100/);
  });

  it('an editor left open is committed when focus moves to a dialog, never quietly dropped', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const rob = personId('Rob');
    const field = `overhead:${rob}`;

    await h.page.eval(`
      var cell = document.querySelector('.cell[data-field="${field}"]');
      cell.querySelector('[data-edit]').click();
      cell.querySelector('[data-input]').value = '7';
      return true;
    `);

    // Opening the dialog takes focus out of the cell, which commits the edit rather than
    // abandoning it — so by the time the refresh happens there is nothing left to lose.
    await h.page.eval(`
      var d = document.getElementById('dlg-add-person');
      d.showModal();
      var f = d.querySelector('form');
      f.elements.name.value = 'Quinn (synthetic)';
      f.elements.fraction.value = '1';
      f.requestSubmit();
      return true;
    `);
    await h.page.waitFor(`document.body.textContent.indexOf('Quinn (synthetic)') !== -1`, 15000);
    await h.page.waitFor('!!window.__productfolio');

    assert.equal(
      repo.listPeople(h.db, h.teamId, h.quarterId).find((p) => p.id === rob)!.overheadPercent,
      7,
      'the open editor was committed on blur, not discarded by the refresh',
    );
    assert.equal(await h.page.eval(readValue(field)), '7%');
  });

  it('when a draft cannot be carried across, the refresh asks before discarding it', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const lena = personId('Lena (lead)');
    const field = `overhead:${lena}`;

    // Make stashing impossible, the way a browser with site data blocked would.
    await h.page.eval(`
      Object.defineProperty(window.sessionStorage, 'setItem', {
        configurable: true,
        value: function () { throw new Error('blocked'); }
      });
      return true;
    `);

    await rejectOverhead(field, '250');

    const asked = h.page.nextJavaScriptDialog(false); // decline the discard
    await h.page.eval(`window.__stillHere = 'yes'; return true;`); // a reload would clear this
    await h.page.eval(`
      var d = document.getElementById('dlg-add-person');
      d.showModal();
      var f = d.querySelector('form');
      f.elements.name.value = 'Rhea (synthetic)';
      f.elements.fraction.value = '1';
      f.requestSubmit();
      return true;
    `);

    const message = await asked;
    assert.match(message, /not been saved/i, 'the planner is told what is at stake');

    // Declining leaves the page exactly where it was, with the refused value still in it.
    await h.page.waitFor(`document.querySelector('.cell[data-field="${field}"]').classList.contains('failed')`);
    assert.equal(
      await h.page.eval<string>(`return document.querySelector('.cell[data-field="${field}"] [data-input]').value;`),
      '250',
    );
    assert.equal(await h.page.eval<string>('return window.__stillHere;'), 'yes', 'the page was not reloaded');

    // The person was still added, and the table shows her through the ordinary region
    // update — declining is only about not leaving the page and losing the draft with it.
    assert.ok(repo.listPeople(h.db, h.teamId, h.quarterId).some((p) => p.name === 'Rhea (synthetic)'));
    assert.equal(await h.page.eval<boolean>(`return document.body.textContent.indexOf('Rhea (synthetic)') !== -1;`), true);
  });

  it('a pending save is written before the dialog refresh takes the page away', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const chen = personId('Chen');

    // Hold every save long enough that the dialog's own request would, without the queue,
    // overtake the overhead edit and refresh the page out from under it.
    await h.page.interceptRequests((request) => (request.method === 'POST' ? 400 : 0));

    await h.page.eval(commit(`overhead:${chen}`, '12'));
    await h.page.eval(`
      var d = document.getElementById('dlg-add-person');
      d.showModal();
      var f = d.querySelector('form');
      f.elements.name.value = 'Pia (synthetic)';
      f.elements.fraction.value = '1';
      f.requestSubmit();
      return true;
    `);

    await h.page.waitFor(`document.body.textContent.indexOf('Pia (synthetic)') !== -1`, 20000);
    await h.page.waitFor('!!window.__productfolio');
    await h.page.stopIntercepting();

    assert.equal(
      repo.listPeople(h.db, h.teamId, h.quarterId).find((p) => p.id === chen)!.overheadPercent,
      12,
      'the pending overhead edit was written, not lost to the refresh',
    );
    assert.ok(repo.listPeople(h.db, h.teamId, h.quarterId).some((p) => p.name === 'Pia (synthetic)'));
    assert.equal(await h.page.eval(readValue(`overhead:${chen}`)), '12%', 'and the reloaded page shows it');
  });

  it('leaving the page with unsaved work is still guarded', async () => {
    await h.page.goto(`${h.base}/census?q=${h.quarterId}`);
    const rob = personId('Rob');

    assert.equal(await h.page.eval<number>('return window.__productfolio.drafts().length;'), 0);

    await h.page.eval(`
      var cell = document.querySelector('.cell[data-field="overhead:${rob}"]');
      cell.querySelector('[data-edit]').click();
      cell.querySelector('[data-input]').value = '9';
      return true;
    `);

    const drafts = await h.page.eval<Array<{ field: string; value: string }>>('return window.__productfolio.drafts();');
    assert.equal(drafts.length, 1, 'the page knows it is holding something unsaved');
    assert.equal(drafts[0]!.value, '9');

    // Navigating away raises the browser's own prompt rather than dropping the edit.
    const prompted = h.page.nextJavaScriptDialog(true);
    await h.page.eval(`window.location.assign('/capacity?q=${h.quarterId}'); return true;`);
    await prompted;
    await h.page.waitFor('!!window.__productfolio');
    assert.match(await h.page.eval<string>('return document.title;'), /Capacity/);
  });
});
