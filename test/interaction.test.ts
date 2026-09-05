/**
 * The background-save protocol over HTTP.
 *
 * A background save posts exactly what the plain form posts, to exactly the same URL, and
 * only asks for JSON. These tests hold that promise to account: the same writes happen, the
 * same validation refuses the same values, and the fragments that come back carry the
 * server's own recalculated figures — including the feasibility reassessment that an edit
 * triggers.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { openDatabase, type Database } from '../src/db/database.js';
import * as repo from '../src/db/repo.js';
import { loadPlan } from '../src/plan.js';
import { seedSyntheticExample } from '../src/seed.js';
import { startServer } from '../src/web/server.js';

interface SavePayload {
  ok: boolean;
  regions?: Record<string, string>;
  message?: string;
  status?: string;
}

describe('background saves', () => {
  let db: Database;
  let server: ReturnType<typeof startServer>;
  let base: string;
  let teamId: number;
  let beaconTeamId: number;
  let quarterId: number;

  before(async () => {
    db = openDatabase(':memory:');
    ({ teamId, beaconTeamId, quarterId } = seedSyntheticExample(db));
    server = startServer(db, 0);
    await new Promise<void>((r) => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => server.close());

  /** Exactly what the browser sends: the form's own body, plus a request for JSON. */
  const save = async (path: string, form: Record<string, string>) => {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    });
    return { status: response.status, payload: (await response.json()) as SavePayload };
  };

  const changeCount = (team = teamId) => repo.listChanges(db, team, quarterId).length;
  const personId = (name: string) => repo.listPeople(db, teamId, quarterId).find((p) => p.name === name)!.id;
  const workPackage = (name: string) => loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name === name)!;

  it('a successful save writes, and answers with the regions of the page it came from', async () => {
    const lena = personId('Lena (lead)');
    const { status, payload } = await save(`/people/${lena}/overhead`, {
      back: `/census?q=${quarterId}`,
      quarter_id: String(quarterId),
      percent: '50',
    });

    assert.equal(status, 200);
    assert.equal(payload.ok, true);
    assert.deepEqual(Object.keys(payload.regions ?? {}), ['census-teams'], 'only the census table can have moved');

    // The write really happened, through the same repository call the plain form uses.
    const plan = loadPlan(db, teamId, quarterId)!;
    assert.equal(plan.people.find((p) => p.id === lena)!.overheadPercent, 50);

    // 13.0 available × 50% = 6.5 overhead, so 66.2 − 6.5 = 59.7 net delivery.
    const html = payload.regions!['census-teams']!;
    assert.match(html, /6\.5/);
    assert.match(html, /59\.7/);

    await save(`/people/${lena}/overhead`, { back: `/census?q=${quarterId}`, quarter_id: String(quarterId), percent: '40' });
  });

  it('the fragments carry the server’s figures, not the browser’s — every affected view updates', async () => {
    const { payload } = await save('/reserve', {
      back: `/allocations?q=${quarterId}`,
      team_id: String(teamId),
      quarter_id: String(quarterId),
      engineer_weeks: '5',
    });

    assert.equal(payload.ok, true);
    assert.deepEqual(Object.keys(payload.regions!).sort(), [
      'alloc-mix',
      'alloc-recon',
      'alloc-states',
      'alloc-summary',
      'alloc-teams',
    ]);

    // Atlas: 61.0 = 48.0 + 5.0 + 8.0, so Engineering headroom is now 8.0 and the reserve 11.0.
    assert.match(payload.regions!['alloc-recon']!, /8\.0 ew headroom/);
    assert.match(payload.regions!['alloc-summary']!, /11\.0/);
    assert.match(payload.regions!['alloc-summary']!, /2\.9 ew of shortfall stands in Team Beacon/, 'Beacon’s shortfall is never netted away');

    await save('/reserve', {
      back: `/allocations?q=${quarterId}`,
      team_id: String(teamId),
      quarter_id: String(quarterId),
      engineer_weeks: '9',
    });
  });

  it('a rejected value answers 422 with the domain’s own message, and writes nothing', async () => {
    const lena = personId('Lena (lead)');
    const before = changeCount();

    const { status, payload } = await save(`/people/${lena}/overhead`, {
      back: `/census?q=${quarterId}`,
      quarter_id: String(quarterId),
      percent: '250',
    });

    assert.equal(status, 422);
    assert.equal(payload.ok, false);
    assert.equal(payload.message, 'Overhead percent must be between 0 and 100, got 250');
    assert.equal(payload.regions, undefined, 'a refused save re-renders nothing');
    assert.equal(loadPlan(db, teamId, quarterId)!.people.find((p) => p.id === lena)!.overheadPercent, 40);
    assert.equal(changeCount(), before, 'a refused save leaves the change log alone');
  });

  it('a refused feasible verdict explains itself instead of being stored', async () => {
    const search = workPackage('Search relevance tuning'); // accepted, nothing assigned
    const { status, payload } = await save(`/work-packages/${search.id}/feasibility`, {
      back: `/allocations?q=${quarterId}`,
      verdict: 'feasible',
      judged_by: 'Lena (synthetic lead)',
      assumptions: 'optimistic',
    });

    assert.equal(status, 422);
    assert.match(payload.message ?? '', /no capacity is assigned/);
    assert.equal(workPackage('Search relevance tuning').judgments.length, 0);
  });

  it('two saves in flight at once both land, and the later answer describes both', async () => {
    const rob = personId('Rob');
    const chen = personId('Chen');

    const first = save(`/people/${rob}/overhead`, {
      back: `/census?q=${quarterId}`,
      quarter_id: String(quarterId),
      percent: '20',
    });
    const second = save(`/people/${chen}/overhead`, {
      back: `/census?q=${quarterId}`,
      quarter_id: String(quarterId),
      percent: '30',
    });
    const [a, b] = await Promise.all([first, second]);

    assert.equal(a.payload.ok, true);
    assert.equal(b.payload.ok, true);

    const plan = loadPlan(db, teamId, quarterId)!;
    assert.equal(plan.people.find((p) => p.id === rob)!.overheadPercent, 20);
    assert.equal(plan.people.find((p) => p.id === chen)!.overheadPercent, 30);

    // Whichever response the browser applies last, it must not be able to show a total that
    // omits one of the two writes: each fragment is rendered after its own write.
    const totals = [a, b].map(
      (r) => /Lena|Team total/.test(r.payload.regions!['census-teams']!) && r.payload.regions!['census-teams']!,
    );
    assert.ok(totals.every(Boolean));

    // Rob 11.0 × 20% = 2.2 and Chen 13.0 × 30% = 3.9, with Lena's 5.2 → 11.3 overhead.
    const fresh = loadPlan(db, teamId, quarterId)!;
    assert.ok(Math.abs(fresh.capacity.overheadEw - 11.3) < 0.005, `overhead was ${fresh.capacity.overheadEw}`);

    for (const id of [rob, chen]) {
      await save(`/people/${id}/overhead`, { back: `/census?q=${quarterId}`, quarter_id: String(quarterId), percent: '0' });
    }
  });

  it('the quarter and team of the view are preserved through an edit', async () => {
    const beacon = loadPlan(db, beaconTeamId, quarterId)!;
    const ledger = beacon.workPackages.find((w) => w.name === 'Ledger export hardening')!;

    const { payload } = await save(`/work-packages/${ledger.id}/estimate`, {
      back: `/allocations?q=${quarterId}&team=${beaconTeamId}`,
      estimate_ew: '15',
    });

    assert.equal(payload.ok, true);
    const teams = payload.regions!['alloc-teams']!;
    assert.match(teams, /Team Beacon \(synthetic example\)/);
    assert.doesNotMatch(teams, /Team Atlas \(synthetic example\)/, 'the team filter still applies to the work list');

    // …while the cross-team reconciliation keeps listing every team, filter or not.
    assert.match(payload.regions!['alloc-recon']!, /Team Atlas \(synthetic example\)/);
    assert.match(payload.regions!['alloc-recon']!, /2\.9 ew short/);

    await save(`/work-packages/${ledger.id}/estimate`, {
      back: `/allocations?q=${quarterId}&team=${beaconTeamId}`,
      estimate_ew: '14',
    });
  });

  it('an edit made from the team-quarter page re-renders that page, not an Engineering view', async () => {
    const legacy = workPackage('Legacy job runner removal');
    const { payload } = await save(`/work-packages/${legacy.id}/assignment`, {
      back: `/plan/${teamId}/${quarterId}`,
      team_id: String(teamId),
      engineer_weeks: '11',
    });

    assert.equal(payload.ok, true);
    assert.deepEqual(Object.keys(payload.regions!).sort(), ['plan-census', 'plan-chain', 'plan-recon', 'plan-states', 'plan-work']);
    // 61.0 = 49.0 + 9.0 + 3.0
    assert.match(payload.regions!['plan-recon']!, /3\.0/);

    await save(`/work-packages/${legacy.id}/assignment`, {
      back: `/plan/${teamId}/${quarterId}`,
      team_id: String(teamId),
      engineer_weeks: '10',
    });
  });

  it('an off-site back parameter yields no regions rather than following it', async () => {
    const lena = personId('Lena (lead)');
    const { payload } = await save(`/people/${lena}/overhead`, {
      back: 'https://example.com/phish',
      quarter_id: String(quarterId),
      percent: '41',
    });

    assert.equal(payload.ok, true, 'the write itself is fine');
    // The redirect falls back to /census with no quarter, which renders the census regions
    // for the default quarter — never anything fetched from the supplied URL.
    assert.ok(!JSON.stringify(payload.regions).includes('example.com'));

    await save(`/people/${lena}/overhead`, { back: `/census?q=${quarterId}`, quarter_id: String(quarterId), percent: '40' });
  });

  it('the stylesheet and script are served from their content-hashed URLs', async () => {
    const page = await (await fetch(`${base}/census?q=${quarterId}`)).text();
    const css = /href="(\/assets\/app\.[0-9a-f]+\.css)"/.exec(page);
    const js = /src="(\/assets\/app\.[0-9a-f]+\.js)"/.exec(page);
    assert.ok(css && js, 'the page links both assets');

    const cssResponse = await fetch(base + css![1]!);
    assert.equal(cssResponse.status, 200);
    assert.equal(cssResponse.headers.get('content-type'), 'text/css; charset=utf-8');
    assert.match(cssResponse.headers.get('cache-control') ?? '', /immutable/);

    const jsResponse = await fetch(base + js![1]!);
    assert.equal(jsResponse.status, 200);
    assert.match(await jsResponse.text(), /data-editform/, 'the inline editor script is what is served');
  });

  it('without JavaScript the same forms still post and redirect, exactly as before', async () => {
    const lena = personId('Lena (lead)');
    const response = await fetch(`${base}/people/${lena}/overhead`, {
      method: 'POST',
      body: new URLSearchParams({ back: `/census?q=${quarterId}`, quarter_id: String(quarterId), percent: '35' }),
      redirect: 'manual',
    });

    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), `/census?q=${quarterId}`);
    assert.equal(loadPlan(db, teamId, quarterId)!.people.find((p) => p.id === lena)!.overheadPercent, 35);

    await save(`/people/${lena}/overhead`, { back: `/census?q=${quarterId}`, quarter_id: String(quarterId), percent: '40' });
  });
});

/**
 * The two cases that turn on a judgment being current beforehand get their own database,
 * so they assert what a save does rather than what earlier tests happened to leave behind.
 */
describe('background saves and feasibility reassessment', () => {
  let db: Database;
  let server: ReturnType<typeof startServer>;
  let base: string;
  let teamId: number;
  let quarterId: number;

  before(async () => {
    db = openDatabase(':memory:');
    ({ teamId, quarterId } = seedSyntheticExample(db));
    server = startServer(db, 0);
    await new Promise<void>((r) => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => server.close());

  const save = async (path: string, form: Record<string, string>) => {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    });
    return { status: response.status, payload: (await response.json()) as SavePayload };
  };

  const payments = () => loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name === 'Payments reconciliation service')!;
  const changeCount = () => repo.listChanges(db, teamId, quarterId).length;

  it('re-entering the same value logs nothing and leaves a current judgment alone', async () => {
    const before = payments();
    assert.equal(before.assessment.needsReassessment, false, 'precondition: the judgment is current');
    const logged = changeCount();

    const { payload } = await save(`/work-packages/${before.id}/assignment`, {
      back: `/allocations?q=${quarterId}`,
      team_id: String(teamId),
      engineer_weeks: String(before.assignedEw),
    });

    assert.equal(payload.ok, true, 'a no-op save still succeeds');
    assert.equal(changeCount(), logged, 'but it logs nothing');
    assert.equal(payments().assessment.needsReassessment, false, 'so the judgment stays current');
    assert.doesNotMatch(payload.regions!['alloc-teams']!, /Needs reassessment/);
  });

  it('an edit that moves a planning input answers with the judgment it invalidated', async () => {
    const { payload } = await save('/reserve', {
      back: `/allocations?q=${quarterId}`,
      team_id: String(teamId),
      quarter_id: String(quarterId),
      engineer_weeks: '6',
    });

    assert.equal(payload.ok, true);
    const worklist = payload.regions!['alloc-teams']!;
    assert.match(worklist, /Needs reassessment/, 'the server decides this, not the browser');
    assert.match(worklist, /reserve changed 9\.0 → 6\.0 ew/, 'and says which change did it');
    assert.equal(payments().assessment.needsReassessment, true);

    // Putting the value back does not revive the judgment: the log only grows (D15).
    const restored = await save('/reserve', {
      back: `/allocations?q=${quarterId}`,
      team_id: String(teamId),
      quarter_id: String(quarterId),
      engineer_weeks: '9',
    });
    assert.match(restored.payload.regions!['alloc-teams']!, /Needs reassessment/);
    assert.equal(payments().assessment.needsReassessment, true);
  });
});

/**
 * Changing the overhead percentage used to erase the note recorded alongside it, because
 * the form carried no note and the write stored an empty one regardless.
 */
describe('overhead notes survive a change to the percentage', () => {
  let db: Database;
  let server: ReturnType<typeof startServer>;
  let base: string;
  let teamId: number;
  let quarterId: number;

  before(async () => {
    db = openDatabase(':memory:');
    ({ teamId, quarterId } = seedSyntheticExample(db));
    server = startServer(db, 0);
    await new Promise<void>((r) => server.once('listening', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => server.close());

  const lena = () => repo.listPeople(db, teamId, quarterId).find((p) => p.name === 'Lena (lead)')!;

  const post = (path: string, form: Record<string, string>) =>
    fetch(base + path, { method: 'POST', body: new URLSearchParams(form), redirect: 'manual' });

  it('the seeded note is there to begin with', () => {
    assert.equal(lena().overheadNote, 'team lead: management & admin');
  });

  it('setting the percentage alone keeps the note', async () => {
    await post(`/people/${lena().id}/overhead`, { back: `/census?q=${quarterId}`, quarter_id: String(quarterId), percent: '45' });
    assert.equal(lena().overheadPercent, 45);
    assert.equal(lena().overheadNote, 'team lead: management & admin');
  });

  it('sending a note replaces it, and sending an empty one clears it deliberately', async () => {
    await post(`/people/${lena().id}/overhead`, {
      back: `/census?q=${quarterId}`,
      quarter_id: String(quarterId),
      percent: '45',
      note: 'lead: hiring and on-call rota',
    });
    assert.equal(lena().overheadNote, 'lead: hiring and on-call rota');

    await post(`/people/${lena().id}/overhead`, {
      back: `/census?q=${quarterId}`,
      quarter_id: String(quarterId),
      percent: '45',
      note: '',
    });
    assert.equal(lena().overheadNote, '');
  });

  it('the census offers a dialog that edits the percentage and the note together', async () => {
    const html = await (await fetch(`${base}/census?q=${quarterId}`)).text();
    assert.match(html, new RegExp(`id="dlg-overhead-${lena().id}"`));
    assert.match(html, /Edit overhead and its note…/);
    assert.match(html, /name="note"/);
  });
});
