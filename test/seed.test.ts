/**
 * The seed upgrade path: running the two-team seed against a database that holds only the
 * older Atlas-only data must add Beacon and change nothing else — no duplicated people, no
 * doubled capacity, no lost edits or judgments — and must stay a no-op after that.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, type Database } from '../src/db/database.js';
import * as repo from '../src/db/repo.js';
import { loadPlan } from '../src/plan.js';
import { loadEngineeringQuarter } from '../src/engineering.js';
import { seedAtlasTeam, seedSyntheticExample, SYNTHETIC_QUARTER, SYNTHETIC_TEAM, SYNTHETIC_TEAM_2 } from '../src/seed.js';
import { close } from './helpers.js';

/** Exactly what the previous release's seed produced: one quarter, Team Atlas, nothing else. */
function legacyAtlasOnlyDatabase(): { db: Database; teamId: number; quarterId: number } {
  const db = openDatabase(':memory:');
  const quarterId = repo.createQuarter(db, { name: SYNTHETIC_QUARTER, start: '2027-01-04', end: '2027-04-02' });
  const teamId = repo.createTeam(db, SYNTHETIC_TEAM);
  seedAtlasTeam(db, teamId, quarterId);
  return { db, teamId, quarterId };
}

/** Everything about a team-quarter that a re-seed must leave alone. */
function snapshot(db: Database, teamId: number, quarterId: number) {
  const plan = loadPlan(db, teamId, quarterId)!;
  return {
    people: plan.people.map((p) => ({ id: p.id, name: p.name, joined: p.joined, left: p.left, overhead: p.overheadPercent })),
    absences: plan.people.flatMap((p) => p.absenceRows.map((a) => ({ person: p.name, from: a.from, to: a.to }))),
    work: plan.workPackages.map((w) => ({ id: w.id, name: w.name, estimate: w.estimateEw, assigned: w.assignedEw, category: w.category })),
    judgments: plan.workPackages.map((w) => ({
      name: w.name,
      count: w.judgments.length,
      verdict: w.judgment?.verdict ?? null,
      state: w.assessment.state,
      stale: w.assessment.needsReassessment,
    })),
    capacity: {
      contracted: plan.capacity.contractedEw,
      available: plan.capacity.availableEw,
      net: plan.capacity.netDeliveryEw,
    },
    reserve: plan.reconciliation.reserveEw,
    headroom: plan.reconciliation.headroomEw,
    changeLogPosition: repo.latestChangeId(db, teamId, quarterId),
  };
}

describe('seeding an existing Atlas-only database', () => {
  it('adds Beacon without duplicating Atlas or doubling its capacity', () => {
    const { db, teamId, quarterId } = legacyAtlasOnlyDatabase();
    const before = snapshot(db, teamId, quarterId);
    assert.equal(before.people.length, 6);
    close(before.capacity.net, 61.0);

    const result = seedSyntheticExample(db);

    assert.equal(result.teamId, teamId, 'the existing Atlas team is reused, not recreated');
    assert.equal(result.quarterId, quarterId, 'the existing quarter is reused');
    assert.deepEqual(result.addedTeams, [SYNTHETIC_TEAM_2], 'only Beacon was seeded');
    assert.equal(result.quarterCreated, false);
    assert.equal(result.created, true);

    const after = snapshot(db, teamId, quarterId);
    assert.deepEqual(after, before, 'Atlas is untouched: people, work, assignments, judgments, capacity and change log');
    assert.equal(after.people.length, 6, 'no duplicated people');
    close(after.capacity.net, 61.0, 'capacity is not doubled');
    assert.equal(
      after.judgments.every((j) => !j.stale),
      true,
      'no change was logged against Atlas, so its judgments stay current',
    );
  });

  it('adds Beacon exactly once, complete and correct', () => {
    const { db } = legacyAtlasOnlyDatabase();
    const { beaconTeamId, quarterId } = seedSyntheticExample(db);

    assert.equal(repo.listTeams(db).filter((t) => t.name === SYNTHETIC_TEAM_2).length, 1);
    const beacon = loadPlan(db, beaconTeamId, quarterId)!;
    assert.deepEqual(
      beacon.people.map((p) => p.name).sort(),
      ['Ana (lead)', 'Bo', 'Cass'],
    );
    close(beacon.capacity.netDeliveryEw, 26.1);
    close(beacon.reconciliation.assignedEw, 23.0);
    close(beacon.reconciliation.reserveEw, 6.0);
    close(beacon.reconciliation.shortfallEw, 2.9);
    assert.equal(beacon.workPackages.length, 2);
  });

  it('leaves the Engineering totals at the documented X9 figures after the upgrade', () => {
    const { db } = legacyAtlasOnlyDatabase();
    const { quarterId } = seedSyntheticExample(db);
    const eng = loadEngineeringQuarter(db, quarterId)!;
    close(eng.totals.netDeliveryEw, 87.1);
    close(eng.totals.surplusHeadroomEw, 4.0);
    close(eng.totals.shortfallEw, 2.9);
    assert.equal(eng.plans.length, 2);
  });

  it('re-running the seed after the upgrade changes nothing', () => {
    const { db, teamId, quarterId } = legacyAtlasOnlyDatabase();
    const { beaconTeamId } = seedSyntheticExample(db);

    const atlasBefore = snapshot(db, teamId, quarterId);
    const beaconBefore = snapshot(db, beaconTeamId, quarterId);
    const teamsBefore = repo.listTeams(db).map((t) => t.name);
    const quartersBefore = repo.listQuarters(db).map((q) => q.name);

    const again = seedSyntheticExample(db);

    assert.equal(again.created, false);
    assert.deepEqual(again.addedTeams, []);
    assert.equal(again.teamId, teamId);
    assert.equal(again.beaconTeamId, beaconTeamId);
    assert.deepEqual(snapshot(db, teamId, quarterId), atlasBefore);
    assert.deepEqual(snapshot(db, beaconTeamId, quarterId), beaconBefore);
    assert.deepEqual(repo.listTeams(db).map((t) => t.name), teamsBefore, 'no duplicate teams');
    assert.deepEqual(repo.listQuarters(db).map((q) => q.name), quartersBefore, 'no duplicate quarters');
  });

  it('preserves user edits made to a synthetic team before the upgrade', () => {
    const { db, teamId, quarterId } = legacyAtlasOnlyDatabase();
    // A planner has been working in the existing database.
    const newPerson = repo.addPerson(db, { teamId, name: 'Wes (added by the planner)', fraction: 0.8 });
    repo.setReserve(db, { teamId, quarterId, engineerWeeks: 7 });
    const telemetry = loadPlan(db, teamId, quarterId)!.workPackages.find((w) => w.name.startsWith('Telemetry'))!;
    repo.setAssignment(db, { workPackageId: telemetry.id, teamId, engineerWeeks: 11 });
    const edited = snapshot(db, teamId, quarterId);

    seedSyntheticExample(db);

    const after = snapshot(db, teamId, quarterId);
    assert.deepEqual(after, edited, 'every planner edit survives the upgrade unchanged');
    assert.ok(after.people.some((p) => p.id === newPerson && p.name === 'Wes (added by the planner)'));
    close(after.reserve, 7.0);
    assert.equal(after.work.find((w) => w.name.startsWith('Telemetry'))!.assigned, 11);
  });

  it('preserves a real team that has nothing to do with the synthetic data', () => {
    const { db, quarterId } = legacyAtlasOnlyDatabase();
    const realTeamId = repo.createTeam(db, 'Platform');
    repo.addPerson(db, { teamId: realTeamId, name: 'A real engineer', fraction: 1 });
    const before = snapshot(db, realTeamId, quarterId);

    seedSyntheticExample(db);

    assert.deepEqual(snapshot(db, realTeamId, quarterId), before);
    assert.equal(repo.listTeams(db).length, 3, 'Platform, Atlas and the newly seeded Beacon');
  });

  it('seeds Atlas alone when only Beacon is present', () => {
    const db = openDatabase(':memory:');
    const quarterId = repo.createQuarter(db, { name: SYNTHETIC_QUARTER, start: '2027-01-04', end: '2027-04-02' });
    const beaconTeamId = repo.createTeam(db, SYNTHETIC_TEAM_2);
    const result = seedSyntheticExample(db);
    assert.deepEqual(result.addedTeams, [SYNTHETIC_TEAM]);
    assert.equal(result.beaconTeamId, beaconTeamId);
    assert.equal(loadPlan(db, beaconTeamId, quarterId)!.people.length, 0, 'the pre-existing empty Beacon is left as it was');
    close(loadPlan(db, result.teamId, quarterId)!.capacity.netDeliveryEw, 61.0);
  });

  it('seeds both teams into an empty database', () => {
    const db = openDatabase(':memory:');
    const result = seedSyntheticExample(db);
    assert.deepEqual(result.addedTeams, [SYNTHETIC_TEAM, SYNTHETIC_TEAM_2]);
    assert.equal(result.quarterCreated, true);
    const eng = loadEngineeringQuarter(db, result.quarterId)!;
    close(eng.totals.netDeliveryEw, 87.1);
  });
});
