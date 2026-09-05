/**
 * End-to-end: the persisted workflow for one team and one quarter, through the repository
 * and through the HTTP interface, checked against the domain examples.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { openDatabase, type Database } from '../src/db/database.js';
import * as repo from '../src/db/repo.js';
import { loadPlan } from '../src/plan.js';
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

  it('changing an estimate after a feasibility judgment flags it for reassessment', async () => {
    const payments = loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name === 'Payments reconciliation service')!;
    assert.equal(payments.assessment.state, 'feasible');
    await new Promise((r) => setTimeout(r, 5)); // ensure a later timestamp
    repo.updateEstimate(db, payments.id, 24);
    const after1 = loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.id === payments.id)!;
    assert.equal(after1.assessment.needsReassessment, true);
    assert.equal(after1.assessment.state, 'partially_assigned'); // 20 of 24
    repo.recordFeasibility(db, { workPackageId: payments.id, verdict: 'feasible', judgedBy: 'Lena (synthetic lead)', assumptions: 'reassessed at 24 ew', scopeNote: 'phase 1 only' });
    const after2 = loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.id === payments.id)!;
    assert.equal(after2.assessment.state, 'feasible');
    assert.equal(after2.judgments.length, 2, 'judgment history is kept');
    repo.updateEstimate(db, payments.id, 20);
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
    assert.throws(() => repo.recordFeasibility(db, { workPackageId: 1, verdict: 'feasible', judgedBy: 'L', assumptions: '  ' }), /assumptions/i);
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

  it('returns a 400 error page for invalid input', async () => {
    const r = await post(`/plan/${teamId}/${quarterId}/people`, { name: 'Nope', fraction: '2' });
    assert.equal(r.status, 400);
    assert.match(await r.text(), /fraction/);
  });

  it('404s for an unknown plan', async () => {
    assert.equal((await fetch(`${base}/plan/999/999`)).status, 404);
  });
});
