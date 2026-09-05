/**
 * The Engineering-wide read model over two synthetic teams:
 *   Atlas   net delivery 61.0 = assigned 48.0 + reserve  9.0 + headroom  4.0
 *   Beacon  net delivery 26.1 = assigned 23.0 + reserve  6.0 + headroom −2.9  (shortfall)
 * Engineering totals therefore show headroom 4.0 *and* shortfall 2.9 — never one netted
 * figure — while every quantity is summed before any percentage is taken.
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, type Database } from '../src/db/database.js';
import * as repo from '../src/db/repo.js';
import { loadEngineeringQuarter, shareOfNetDelivery, type EngineeringQuarter } from '../src/engineering.js';
import { loadPlan } from '../src/plan.js';
import { seedSyntheticExample } from '../src/seed.js';
import { close } from './helpers.js';

describe('Engineering-wide quarter', () => {
  let db: Database;
  let eng: EngineeringQuarter;
  let teamId: number;
  let beaconTeamId: number;
  let quarterId: number;

  before(() => {
    db = openDatabase(':memory:');
    ({ teamId, beaconTeamId, quarterId } = seedSyntheticExample(db));
    eng = loadEngineeringQuarter(db, quarterId)!;
  });

  it('covers every team in the quarter without being asked for one', () => {
    assert.equal(eng.plans.length, 2);
    assert.deepEqual(
      eng.plans.map((p) => p.team.id).sort(),
      [teamId, beaconTeamId].sort(),
    );
  });

  it('sums the capacity chain across teams', () => {
    const t = eng.totals;
    close(t.contractedEw, 102.6); // 68.8 + 33.8
    close(t.absenceEw, 3.8); // 2.6 + 1.2
    close(t.availableEw, 98.8); // 66.2 + 32.6
    close(t.overheadEw, 11.7); // 5.2 + 6.5
    close(t.netDeliveryEw, 87.1); // 61.0 + 26.1
  });

  it('computes the overhead ratio from summed quantities, not by averaging team ratios', () => {
    const [atlas, beacon] = [
      eng.plans.find((p) => p.team.id === teamId)!.capacity,
      eng.plans.find((p) => p.team.id === beaconTeamId)!.capacity,
    ];
    const meanOfRatios = (atlas.overheadRatio! + beacon.overheadRatio!) / 2;
    const summed = eng.totals.overheadRatio!;

    close(summed, 11.7 / 98.8);
    assert.equal((summed * 100).toFixed(1), '11.8');
    assert.equal((meanOfRatios * 100).toFixed(1), '13.9');
    assert.ok(Math.abs(summed - meanOfRatios) > 0.01, 'the two differ: a small team must not weigh as much as a large one');
  });

  it('computes the investment mix from summed engineer-weeks over Engineering net delivery capacity', () => {
    close(eng.byCategory['New Development'].ew, 28.0); // Atlas only
    close(eng.byCategory['Sustain & Maintenance'].ew, 24.0); // Atlas 10 + Beacon 14
    close(eng.byCategory['Tech Debt'].ew, 19.0); // Atlas 10 + Beacon 9
    close(eng.byCategory['Tech Debt'].percent!, (19.0 / 87.1) * 100);

    const meanOfTeamPercents =
      (eng.plans.find((p) => p.team.id === teamId)!.mix.byCategory['Tech Debt'].percent! +
        eng.plans.find((p) => p.team.id === beaconTeamId)!.mix.byCategory['Tech Debt'].percent!) /
      2;
    assert.ok(Math.abs(eng.byCategory['Tech Debt'].percent! - meanOfTeamPercents) > 1, 'not the mean of the teams’ percentages');
  });

  it('reports headroom and shortfall separately and never nets them into one figure', () => {
    const t = eng.totals;
    close(t.assignedEw, 71.0);
    close(t.reserveEw, 15.0);
    close(t.surplusHeadroomEw, 4.0, 'Atlas headroom');
    close(t.shortfallEw, 2.9, 'Beacon shortfall');
    assert.equal(t.teamsWithHeadroom, 1);
    assert.equal(t.teamsWithShortfall, 1);
    close(t.netHeadroomEw, 1.1, 'the arithmetic residual is positive while a team is overallocated');
  });

  it('the Engineering figures still account for every engineer-week', () => {
    const t = eng.totals;
    const categories = t.assignedEw;
    close(categories + t.reserveEw + t.surplusHeadroomEw - t.shortfallEw, t.netDeliveryEw);
    close(eng.byCategory['New Development'].ew + eng.byCategory['Sustain & Maintenance'].ew + eng.byCategory['Tech Debt'].ew, t.assignedEw);
  });

  it('a team’s shortfall is preserved on its own reconciliation, not absorbed by the total', () => {
    const beacon = eng.plans.find((p) => p.team.id === beaconTeamId)!;
    close(beacon.reconciliation.netDeliveryEw, 26.1);
    close(beacon.reconciliation.shortfallEw, 2.9);
    close(beacon.reconciliation.headroomEw, -2.9);
    const atlas = eng.plans.find((p) => p.team.id === teamId)!;
    close(atlas.reconciliation.headroomEw, 4.0);
    close(atlas.reconciliation.shortfallEw, 0);
  });

  it('sums planning states across teams without overlap', () => {
    const total = Object.values(eng.stateCounts).reduce((a, b) => a + b, 0);
    assert.equal(total, eng.workPackages.length);
    assert.deepEqual(eng.stateCounts, { accepted: 1, partially_assigned: 1, assigned: 3, feasible: 2 });
  });

  it('tags every work package with the team that owns it', () => {
    const ledger = eng.workPackages.find((w) => w.name === 'Ledger export hardening')!;
    assert.equal(ledger.team.id, beaconTeamId);
    assert.equal(ledger.teamId, beaconTeamId);
  });

  it('shares of net delivery use the Engineering denominator', () => {
    close(shareOfNetDelivery(eng.totals.reserveEw, eng.totals)!, (15.0 / 87.1) * 100);
    assert.equal(shareOfNetDelivery(1, { ...eng.totals, netDeliveryEw: 0 }), null);
  });

  it('is a read model: it does not move capacity or state between teams', () => {
    const beaconBefore = loadPlan(db, beaconTeamId, quarterId)!;
    loadEngineeringQuarter(db, quarterId);
    const beaconAfter = loadPlan(db, beaconTeamId, quarterId)!;
    close(beaconAfter.reconciliation.shortfallEw, beaconBefore.reconciliation.shortfallEw);
    close(beaconAfter.capacity.netDeliveryEw, beaconBefore.capacity.netDeliveryEw);
  });

  it('an edit through the Engineering view stays owned by its team-quarter', () => {
    const own = openDatabase(':memory:');
    const ids = seedSyntheticExample(own);
    // Raising Beacon's reserve must not touch Atlas's plan or its judgments.
    repo.setReserve(own, { teamId: ids.beaconTeamId, quarterId: ids.quarterId, engineerWeeks: 8 });
    const after = loadEngineeringQuarter(own, ids.quarterId)!;
    const atlas = after.plans.find((p) => p.team.id === ids.teamId)!;
    const beacon = after.plans.find((p) => p.team.id === ids.beaconTeamId)!;
    close(beacon.reconciliation.shortfallEw, 4.9);
    close(atlas.reconciliation.headroomEw, 4.0);
    assert.equal(atlas.workPackages.every((w) => !w.assessment.needsReassessment), true, 'Atlas judgments are untouched');
    close(after.totals.shortfallEw, 4.9);
    close(after.totals.surplusHeadroomEw, 4.0, 'still reported separately');
  });

  it('an empty quarter reports zero capacity and an undefined overhead ratio', () => {
    const own = openDatabase(':memory:');
    const q = repo.createQuarter(own, { name: 'Q3 2027', start: '2027-07-05', end: '2027-10-01' });
    repo.createTeam(own, 'Empty team');
    const empty = loadEngineeringQuarter(own, q)!;
    close(empty.totals.netDeliveryEw, 0);
    assert.equal(empty.totals.overheadRatio, null);
    assert.equal(empty.byCategory['Tech Debt'].percent, null);
    assert.equal(empty.totals.teamsWithShortfall, 0);
  });

  it('returns nothing for a quarter that does not exist', () => {
    assert.equal(loadEngineeringQuarter(db, 999999), undefined);
  });
});
