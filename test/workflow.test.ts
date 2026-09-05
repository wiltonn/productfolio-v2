/**
 * End-to-end: the persisted workflow for one team and one quarter, through the repository
 * and through the HTTP interface, checked against the domain examples.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase, type Database } from '../src/db/database.js';
import * as repo from '../src/db/repo.js';
import { loadPlan, recordJudgment } from '../src/plan.js';
import { seedSyntheticExample } from '../src/seed.js';
import { startServer } from '../src/web/server.js';
import { close } from './helpers.js';

describe('persisted workflow — synthetic Team Atlas', () => {
  let db: Database;
  let teamId: number;
  let quarterId: number;

  before(() => {
    db = openDatabase(':memory:');
    ({ teamId, quarterId } = seedSyntheticExample(db));
  });

  it('seeding is idempotent', () => {
    const again = seedSyntheticExample(db);
    assert.equal(again.created, false);
    assert.equal(again.teamId, teamId);
  });

  it('reproduces X1 capacity and the X6 approved plan from persisted data', () => {
    const plan = loadPlan(db, teamId, quarterId)!;
    assert.equal(plan.workingDaysInQuarter, 65);
    close(plan.capacity.contractedEw, 68.8);
    close(plan.capacity.availableEw, 66.2);
    close(plan.capacity.netDeliveryEw, 61.0);
    close(plan.reconciliation.assignedEw, 48.0);
    close(plan.reconciliation.reserveEw, 9.0);
    close(plan.reconciliation.headroomEw, 4.0);
    assert.deepEqual(plan.stateCounts, { accepted: 1, partially_assigned: 1, assigned: 1, feasible: 2 });
  });

  it('X6: accepting unplanned work against the reserve keeps the identity balanced', () => {
    const id = repo.addWorkPackage(db, {
      teamId,
      quarterId,
      name: 'Urgent authentication patch',
      category: 'Sustain & Maintenance',
      estimateEw: 3,
    });
    repo.setAssignment(db, { workPackageId: id, teamId, engineerWeeks: 3 });
    repo.setReserve(db, { teamId, quarterId, engineerWeeks: 6 });
    const plan = loadPlan(db, teamId, quarterId)!;
    close(plan.reconciliation.assignedEw, 51.0);
    close(plan.reconciliation.reserveEw, 6.0);
    close(plan.reconciliation.headroomEw, 4.0);
    close(plan.mix.byCategory['Sustain & Maintenance'].ew, 13.0);
    // restore
    repo.deleteWorkPackage(db, id);
    repo.setReserve(db, { teamId, quarterId, engineerWeeks: 9 });
  });

  it('X3: pushing assignments past net delivery capacity shows a shortfall instead of adjusting anything', () => {
    const search = loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name === 'Search relevance tuning')!;
    repo.setAssignment(db, { workPackageId: search.id, teamId, engineerWeeks: 7 }); // 48 + 7 + 9 = 64 > 61
    const plan = loadPlan(db, teamId, quarterId)!;
    close(plan.reconciliation.shortfallEw, 3.0);
    close(plan.reconciliation.headroomEw, -3.0);
    close(plan.reconciliation.assignedEw, 55.0, 'assignments are reported as entered');
    repo.setAssignment(db, { workPackageId: search.id, teamId, engineerWeeks: 0 });
  });

  it('changing an estimate after a feasibility judgment flags it for reassessment', () => {
    const own = openDatabase(':memory:');
    const ids = seedSyntheticExample(own);
    const find = () => loadPlan(own, ids.teamId, ids.quarterId)!.workPackages.find((w) => w.name === 'Payments reconciliation service')!;
    const payments = find();
    assert.equal(payments.assessment.state, 'feasible');
    repo.updateEstimate(own, payments.id, 24);
    const after1 = find();
    assert.equal(after1.assessment.needsReassessment, true);
    assert.deepEqual(after1.assessment.reassessmentReasons, ['estimate for "Payments reconciliation service" changed 20.0 → 24.0 ew']);
    assert.equal(after1.assessment.state, 'partially_assigned'); // 20 of 24
    recordJudgment(own, { workPackageId: payments.id, verdict: 'feasible', judgedBy: 'Lena (synthetic lead)', assumptions: 'reassessed at 24 ew', scopeNote: 'phase 1 only' });
    const after2 = find();
    assert.equal(after2.assessment.state, 'feasible');
    assert.equal(after2.judgments.length, 2, 'judgment history is kept');
    const ctx = after2.judgment!.context!;
    close(ctx.estimateEw, 24);
    close(ctx.assignedEw, 20);
    close(ctx.netDeliveryEw, 61);
    close(ctx.reserveEw, 9);
    close(ctx.shortfallEw, 0);
    assert.equal(after2.judgment!.planChangeId, repo.latestChangeId(own, ids.teamId, ids.quarterId));
  });

  it('a holiday entered in the calendar reduces available capacity for everyone in force, once', async () => {
    repo.addHoliday(db, { date: '2027-02-17', name: 'Synthetic holiday (inside Rob’s leave)' });
    const plan = loadPlan(db, teamId, quarterId)!;
    // Lena, Chen, Dana, Marta lose 0.2 each; Priya loses 0.12; Rob is already on leave that day → no change.
    close(plan.capacity.absenceEw, 2.6 + 0.2 * 4 + 0.12);
    assert.equal(plan.holidaysInQuarter.length, 1);
    repo.deleteHoliday(db, '2027-02-17');
  });

  it('rejects invalid input with a clear message rather than storing it', () => {
    assert.throws(() => repo.addPerson(db, { teamId, name: 'Bad', fraction: '1.5' }), /fraction/);
    assert.throws(() => repo.addAbsence(db, { personId: 1, from: '2027-03-10', to: '2027-03-01' }), /precede/);
    assert.throws(() => repo.addWorkPackage(db, { teamId, quarterId, name: 'x', category: 'Other', estimateEw: 1 }), /category/);
    assert.throws(() => recordJudgment(db, { workPackageId: 1, verdict: 'not_feasible', judgedBy: 'L', assumptions: '  ' }), /assumptions/i);
    assert.throws(() => recordJudgment(db, { workPackageId: 1, verdict: 'maybe', judgedBy: 'L', assumptions: 'x' }), /Verdict/);
  });
});

/**
 * Regression cases for the team-quarter reassessment rule and the feasible-verdict
 * prerequisites (D15). Each case starts from a fresh synthetic plan:
 * net 61.0 = assigned 48.0 (Telemetry 8/14, Payments 20/20 feasible, Legacy 10/10,
 * Support 10/10 feasible, Search 0/6) + reserve 9.0 + headroom 4.0.
 */
describe('feasibility reassessment and prerequisites (persisted)', () => {
  function fresh() {
    const db = openDatabase(':memory:');
    const { teamId, quarterId } = seedSyntheticExample(db);
    const find = (name: string) => loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name.startsWith(name))!;
    return { db, teamId, quarterId, find };
  }
  const lead = { judgedBy: 'Lena (synthetic lead)', assumptions: 'estimate holds' };

  it('zero assigned capacity: a feasible verdict is refused; a negative verdict is recorded', () => {
    const { db, find } = fresh();
    const search = find('Search');
    assert.equal(search.assignedEw, 0);
    assert.throws(() => recordJudgment(db, { workPackageId: search.id, verdict: 'feasible', ...lead }), /no capacity is assigned/);
    assert.equal(find('Search').judgments.length, 0, 'the refused verdict was not stored');
    recordJudgment(db, { workPackageId: search.id, verdict: 'not_feasible', ...lead, assumptions: 'nothing assigned yet' });
    const after = find('Search');
    assert.equal(after.judgment!.verdict, 'not_feasible');
    assert.equal(after.assessment.state, 'accepted');
  });

  it('capacity dropping to zero after a judgment flags it and blocks a fresh feasible verdict', () => {
    const { db, teamId, quarterId, find } = fresh();
    assert.equal(find('Payments').assessment.state, 'feasible');
    for (const p of repo.listPeople(db, teamId, quarterId)) repo.deletePerson(db, p.id);
    const plan = loadPlan(db, teamId, quarterId)!;
    close(plan.capacity.netDeliveryEw, 0);
    const payments = find('Payments');
    assert.equal(payments.assessment.needsReassessment, true);
    assert.equal(payments.assessment.state, 'assigned');
    assert.equal(payments.assessment.reassessmentReasons.filter((r) => /^person removed: /.test(r)).length, 6);
    assert.throws(() => recordJudgment(db, { workPackageId: payments.id, verdict: 'feasible', ...lead }), /no net delivery capacity/);
    recordJudgment(db, { workPackageId: payments.id, verdict: 'not_feasible', ...lead, assumptions: 'team disbanded' });
    assert.equal(find('Payments').judgments.length, 2, 'history preserved');
  });

  it('a competing assignment flags every judgment in the team-quarter, even when totals still fit', () => {
    const { db, teamId, find } = fresh();
    const search = find('Search');
    repo.setAssignment(db, { workPackageId: search.id, teamId, engineerWeeks: 3 }); // headroom 4 → 1, no shortfall
    const payments = find('Payments');
    assert.equal(payments.assessment.needsReassessment, true);
    assert.equal(payments.assessment.state, 'assigned');
    assert.deepEqual(payments.assessment.reassessmentReasons, ['assignment to "Search relevance tuning" changed 0.0 → 3.0 ew']);
    assert.equal(find('Support').assessment.needsReassessment, true);

    repo.setAssignment(db, { workPackageId: search.id, teamId, engineerWeeks: 7 }); // shortfall 3
    assert.throws(() => recordJudgment(db, { workPackageId: payments.id, verdict: 'feasible', ...lead }), /overallocated by 3\.0 ew/);
    repo.setAssignment(db, { workPackageId: search.id, teamId, engineerWeeks: 0 }); // fully reverted
    assert.equal(find('Payments').assessment.needsReassessment, true, 'reverting the competing assignment does not revive the judgment');
    recordJudgment(db, { workPackageId: payments.id, verdict: 'feasible', ...lead, assumptions: 're-judged after the Search reshuffle' });
    assert.equal(find('Payments').assessment.state, 'feasible');
    assert.equal(find('Support').assessment.needsReassessment, true, 'the other judgment still awaits its own reassessment');
  });

  it('reserve changes flag judgments; re-saving the same reserve does not; restoring it does not clear the flag', () => {
    const { db, teamId, quarterId, find } = fresh();
    repo.setReserve(db, { teamId, quarterId, engineerWeeks: 9 }); // no-op
    assert.equal(find('Payments').assessment.needsReassessment, false);
    repo.setReserve(db, { teamId, quarterId, engineerWeeks: 6 });
    const payments = find('Payments');
    assert.equal(payments.assessment.needsReassessment, true);
    assert.match(payments.assessment.reassessmentReasons[0]!, /reserve changed 9\.0 → 6\.0/);
    assert.equal(find('Support').assessment.needsReassessment, true, 'every judgment in the team-quarter is affected');
    repo.setReserve(db, { teamId, quarterId, engineerWeeks: 9 });
    const reverted = find('Payments');
    assert.equal(reverted.assessment.needsReassessment, true, 'the totals match again but the judgment stays flagged');
    assert.deepEqual(reverted.assessment.reassessmentReasons, [
      'Unplanned Work reserve changed 9.0 → 6.0 ew',
      'Unplanned Work reserve changed 6.0 → 9.0 ew',
    ]);
  });

  it('partial assignment without a stated reduced scope is refused; with it, feasible is recorded', () => {
    const { db, find } = fresh();
    const telemetry = find('Telemetry'); // 8 of 14
    assert.throws(() => recordJudgment(db, { workPackageId: telemetry.id, verdict: 'feasible', ...lead }), /reduced scope/);
    assert.throws(() => recordJudgment(db, { workPackageId: telemetry.id, verdict: 'feasible', ...lead, scopeNote: '  ' }), /reduced scope/);
    recordJudgment(db, { workPackageId: telemetry.id, verdict: 'feasible', ...lead, scopeNote: 'ingestion phase only' });
    assert.equal(find('Telemetry').assessment.state, 'feasible');
  });

  it('a genuinely unchanged save is a no-op; a change that is then reverted is not', () => {
    const { db, teamId, quarterId, find } = fresh();
    const payments = find('Payments');
    const lena = repo.listPeople(db, teamId, quarterId).find((p) => p.name.startsWith('Lena'))!;
    const before = repo.latestChangeId(db, teamId, quarterId);
    repo.setAssignment(db, { workPackageId: payments.id, teamId, engineerWeeks: 20 }); // same value
    repo.updateEstimate(db, payments.id, 20); // same value
    repo.setReserve(db, { teamId, quarterId, engineerWeeks: 9 }); // same value
    repo.setOverhead(db, { personId: lena.id, quarterId, percent: 40, note: 'team lead: management & admin' }); // same value
    repo.addHoliday(db, { date: '2027-06-01', name: 'outside the quarter' }); // no quarter affected
    assert.equal(repo.latestChangeId(db, teamId, quarterId), before, 'nothing was logged');
    assert.equal(find('Payments').assessment.needsReassessment, false);

    repo.updateEstimate(db, payments.id, 24);
    assert.equal(find('Payments').assessment.needsReassessment, true);
    repo.updateEstimate(db, payments.id, 20); // reverted
    const after = find('Payments');
    assert.equal(after.assessment.needsReassessment, true, 'change-then-revert leaves the judgment needing reassessment');
    assert.deepEqual(after.assessment.reassessmentReasons, [
      'estimate for "Payments reconciliation service" changed 20.0 → 24.0 ew',
      'estimate for "Payments reconciliation service" changed 24.0 → 20.0 ew',
    ]);
    assert.equal(after.judgments.length, 1);
    assert.equal(find('Support').assessment.needsReassessment, false, 'another package’s estimate does not concern this judgment');
  });

  it('equal-capacity replacement: an absent specialist plus a new equal person does not revive the judgment', () => {
    const { db, teamId, quarterId, find } = fresh();
    const payments = find('Payments');
    recordJudgment(db, {
      workPackageId: payments.id,
      verdict: 'feasible',
      judgedBy: 'Lena (synthetic lead)',
      assumptions: 'Chen (the only engineer who knows the ledger format) is available for the March cutover.',
    });
    assert.equal(find('Payments').assessment.state, 'feasible');
    const net0 = loadPlan(db, teamId, quarterId)!.capacity.netDeliveryEw;

    const chen = repo.listPeople(db, teamId, quarterId).find((p) => p.name === 'Chen')!;
    repo.addAbsence(db, { personId: chen.id, from: '2027-01-04', to: '2027-04-02', note: 'extended leave' });
    assert.equal(find('Payments').assessment.needsReassessment, true);

    repo.addPerson(db, { teamId, name: 'Sam (synthetic, same schedule as Chen)', fraction: 1 });
    const plan = loadPlan(db, teamId, quarterId)!;
    close(plan.capacity.netDeliveryEw, net0, 'the totals are back to exactly what the lead judged against');
    const after = find('Payments');
    assert.equal(after.assessment.needsReassessment, true, 'but the judgment is not revived: the specialist is still absent');
    assert.equal(after.assessment.state, 'assigned');
    assert.deepEqual(after.assessment.reassessmentReasons, [
      'absence added for Chen: 2027-01-04 → 2027-04-02',
      'person added: Sam (synthetic, same schedule as Chen) (100%)',
    ]);
    assert.throws(() => recordJudgment(db, { workPackageId: payments.id, verdict: 'feasible', ...lead, assumptions: '' }), /assumptions/i);
    recordJudgment(db, { workPackageId: payments.id, verdict: 'not_feasible', ...lead, assumptions: 'Sam does not know the ledger format' });
    assert.equal(find('Payments').assessment.needsReassessment, false, 'a fresh judgment is current');
    assert.equal(find('Payments').assessment.state, 'assigned');
    assert.equal(find('Payments').judgments.length, 3, 'history preserved');
  });

  it('a person-level capacity change (new absence) flags judgments and removing it does not clear them', () => {
    const { db, teamId, quarterId, find } = fresh();
    const chen = repo.listPeople(db, teamId, quarterId).find((p) => p.name === 'Chen')!;
    repo.addAbsence(db, { personId: chen.id, from: '2027-03-15', to: '2027-03-19', note: 'leave' });
    const payments = find('Payments');
    assert.equal(payments.assessment.needsReassessment, true);
    assert.deepEqual(payments.assessment.reassessmentReasons, ['absence added for Chen: 2027-03-15 → 2027-03-19']);
    const absence = repo.listPeople(db, teamId, quarterId).find((p) => p.name === 'Chen')!.absenceRows[0]!;
    repo.deleteAbsence(db, absence.id);
    assert.equal(find('Payments').assessment.needsReassessment, true);
    assert.equal(find('Payments').assessment.reassessmentReasons.length, 2);
  });

  it('changes are logged only for quarters the dates touch', () => {
    const { db, teamId, quarterId, find } = fresh();
    const next = repo.createQuarter(db, { name: 'Q2 2027 (synthetic)', start: '2027-04-05', end: '2027-07-02' });
    const chen = repo.listPeople(db, teamId, quarterId).find((p) => p.name === 'Chen')!;
    repo.addAbsence(db, { personId: chen.id, from: '2027-05-03', to: '2027-05-07', note: 'next quarter' });
    assert.equal(find('Payments').assessment.needsReassessment, false, 'an absence next quarter does not touch this quarter');
    assert.equal(repo.latestChangeId(db, teamId, next) > 0, true);
    repo.addHoliday(db, { date: '2027-02-17', name: 'inside Q1' });
    assert.equal(find('Payments').assessment.needsReassessment, true);
    assert.deepEqual(find('Payments').assessment.reassessmentReasons, ['holiday added: 2027-02-17 (inside Q1)']);
  });

  it('a judgment stored without context (pre-D15 row) is treated as stale, never as feasible', () => {
    const { db, find } = fresh();
    const legacy = find('Legacy');
    db.prepare('INSERT INTO feasibility (work_package_id, verdict, judged_by, judged_at, assumptions) VALUES (?, ?, ?, ?, ?)').run(
      legacy.id,
      'feasible',
      'Old lead',
      '2027-01-01T00:00:00.000Z',
      'recorded before contexts existed',
    );
    const after = find('Legacy');
    assert.equal(after.judgment!.context, null);
    assert.equal(after.judgment!.planChangeId, null);
    assert.equal(after.assessment.needsReassessment, true);
    assert.equal(after.assessment.state, 'assigned');
    assert.deepEqual(after.assessment.reassessmentReasons, ['judgment predates change tracking']);
  });

  it('an existing database created before D15 gains the context columns on open', () => {
    const path = join(tmpdir(), `pf-migrate-${process.pid}-${Date.now()}.db`);
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE feasibility (id INTEGER PRIMARY KEY, work_package_id INTEGER NOT NULL, verdict TEXT NOT NULL,
              judged_by TEXT NOT NULL, judged_at TEXT NOT NULL, assumptions TEXT NOT NULL, scope_note TEXT NOT NULL DEFAULT '')`);
    old.close();
    const db = openDatabase(path);
    const cols = (db.prepare('PRAGMA table_info(feasibility)').all() as unknown as Array<{ name: string }>).map((c) => c.name);
    assert.ok(cols.includes('ctx_net_delivery_ew'));
    assert.ok(cols.includes('plan_change_id'));
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as unknown as Array<{ name: string }>).map((t) => t.name);
    assert.ok(tables.includes('plan_change'));
    db.close();
    rmSync(path, { force: true });
  });
});

describe('HTTP interface', () => {
  let db: Database;
  let base: string;
  let server: ReturnType<typeof startServer>;
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

  const post = (path: string, form: Record<string, string>) =>
    fetch(base + path, { method: 'POST', body: new URLSearchParams(form), redirect: 'manual' });

  it('serves the home page and the plan page with the capacity chain', async () => {
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Team Atlas \(synthetic example\)/);

    const plan = await fetch(`${base}/plan/${teamId}/${quarterId}`);
    const html = await plan.text();
    assert.match(html, /Net delivery capacity/);
    assert.match(html, /61\.0 ew/);
    assert.match(html, /7\.9%/);
    assert.match(html, /Synthetic example data/);
  });

  it('adds a person through the form and reflects the new capacity', async () => {
    const r = await post(`/plan/${teamId}/${quarterId}/people`, { name: 'Sam (synthetic)', fraction: '0.5', joined: '2027-03-01', left: '' });
    assert.equal(r.status, 303);
    const html = await (await fetch(`${base}/plan/${teamId}/${quarterId}`)).text();
    assert.match(html, /Sam \(synthetic\)/);
    close(loadPlan(db, teamId, quarterId)!.capacity.contractedEw, 68.8 + 2.5); // 25 days × 0.5 / 5
  });

  it('shows the shortfall when an assignment overallocates the team', async () => {
    const search = loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name === 'Search relevance tuning')!;
    await post(`/work-packages/${search.id}/assignment`, { team_id: String(teamId), engineer_weeks: '10', back: `/plan/${teamId}/${quarterId}` });
    const html = await (await fetch(`${base}/plan/${teamId}/${quarterId}`)).text();
    assert.match(html, /SHORTFALL/);
    await post(`/work-packages/${search.id}/assignment`, { team_id: String(teamId), engineer_weeks: '0', back: `/plan/${teamId}/${quarterId}` });
  });

  it('refuses a feasible verdict on unassigned work through the form, with the reason', async () => {
    const search = loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name === 'Search relevance tuning')!;
    const r = await post(`/work-packages/${search.id}/feasibility`, {
      verdict: 'feasible',
      judged_by: 'Lena (synthetic lead)',
      assumptions: 'optimistic',
      back: `/plan/${teamId}/${quarterId}`,
    });
    assert.equal(r.status, 400);
    assert.match(await r.text(), /no capacity is assigned/);
  });

  it('shows why a judgment needs reassessment after the reserve changes', async () => {
    await post(`/plan/${teamId}/${quarterId}/reserve`, { engineer_weeks: '6' });
    const html = await (await fetch(`${base}/plan/${teamId}/${quarterId}`)).text();
    assert.match(html, /judgment needs reassessment/);
    assert.match(html, /reserve changed 9\.0 → 6\.0 ew/);
    await post(`/plan/${teamId}/${quarterId}/reserve`, { engineer_weeks: '9' });
  });

  it('returns a 400 error page for invalid input', async () => {
    const r = await post(`/plan/${teamId}/${quarterId}/people`, { name: 'Nope', fraction: '2' });
    assert.equal(r.status, 400);
    assert.match(await r.text(), /fraction/);
  });

  it('404s for an unknown plan', async () => {
    assert.equal((await fetch(`${base}/plan/999/999`)).status, 404);
  });
});
