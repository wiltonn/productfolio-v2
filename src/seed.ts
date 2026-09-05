/**
 * Synthetic example data — two Engineering teams for one quarter. Every name and figure is
 * invented; nothing here describes a real person.
 *
 * Team Atlas reproduces worked examples X1 and X6 (net delivery 61.0 ew, balanced).
 * Team Beacon is deliberately **overallocated** (shortfall 2.9 ew) while Engineering as a
 * whole still shows headroom — worked example X9, the case the Engineering-wide views must
 * not smooth over.
 *
 * Run with `npm run seed`. **Each synthetic team is seeded independently and only when it
 * is missing**, so the seed can be re-run against an existing database — including one that
 * holds only the older Atlas-only data — without duplicating anyone or touching real teams,
 * edits, assignments or judgment history. There is never a need to delete the database.
 */

import type { Database } from './db/database.js';
import { openDatabase } from './db/database.js';
import * as repo from './db/repo.js';
import { DEFAULT_DB_PATH } from './config.js';
import { recordJudgment } from './plan.js';

export const SYNTHETIC_TEAM = 'Team Atlas (synthetic example)';
export const SYNTHETIC_TEAM_2 = 'Team Beacon (synthetic example)';
export const SYNTHETIC_QUARTER = 'Q1 2027 (synthetic)';

export interface SeedResult {
  /** Team Atlas. Named `teamId` because it is the team the worked examples follow. */
  teamId: number;
  beaconTeamId: number;
  quarterId: number;
  /** True when this run created anything at all. */
  created: boolean;
  /** Names of the teams seeded by this run; empty when everything was already present. */
  addedTeams: string[];
  quarterCreated: boolean;
}

function workPackageFor(db: Database, teamId: number, quarterId: number) {
  return (name: string, category: string, estimate: number, assigned: number, notes = '') => {
    const id = repo.addWorkPackage(db, { teamId, quarterId, name, category, estimateEw: estimate, notes });
    if (assigned > 0) repo.setAssignment(db, { workPackageId: id, teamId, engineerWeeks: assigned });
    return id;
  };
}

/**
 * Team Atlas: X1 capacity, X6 balanced plan.
 * contracted 68.8 − absence 2.6 = available 66.2 − overhead 5.2 = net delivery 61.0
 * assigned 48.0 + reserve 9.0 + headroom 4.0
 */
export function seedAtlasTeam(db: Database, teamId: number, quarterId: number): void {
  const workPackage = workPackageFor(db, teamId, quarterId);

  const lena = repo.addPerson(db, { teamId, name: 'Lena (lead)', fraction: 1 });
  const rob = repo.addPerson(db, { teamId, name: 'Rob', fraction: 1 });
  repo.addPerson(db, { teamId, name: 'Chen', fraction: 1 });
  repo.addPerson(db, { teamId, name: 'Dana', fraction: 1 });
  const priya = repo.addPerson(db, { teamId, name: 'Priya', fraction: 0.6 });
  repo.addPerson(db, { teamId, name: 'Marta', fraction: 1, joined: '2027-02-01' }); // start of week 5

  repo.addAbsence(db, { personId: rob, from: '2027-02-15', to: '2027-02-26', note: 'leave (2 weeks)' });
  repo.addAbsence(db, { personId: priya, from: '2027-03-08', to: '2027-03-12', note: 'leave (1 week at 0.6)' });
  repo.setOverhead(db, { personId: lena, quarterId, percent: 40, note: 'team lead: management & admin' });

  workPackage('Telemetry pipeline rebuild', 'New Development', 14, 8, 'X2: Atlas contribution 14 of a 20 ew package; only 8 assigned this quarter');
  const payments = workPackage('Payments reconciliation service', 'New Development', 20, 20);
  workPackage('Legacy job runner removal', 'Tech Debt', 10, 10);
  const support = workPackage('Support rotation and defect backlog', 'Sustain & Maintenance', 10, 10);
  workPackage('Search relevance tuning', 'New Development', 6, 0, 'accepted, not yet assigned');

  // Reserve before judgments: a judgment captures the team-quarter as it stands when made.
  repo.setReserve(db, { teamId, quarterId, engineerWeeks: 9 });
  recordJudgment(db, {
    workPackageId: payments,
    verdict: 'feasible',
    judgedBy: 'Lena (synthetic lead)',
    assumptions: 'Estimate of 20 ew holds; no dependency on the telemetry rebuild; Rob back from leave before the March cutover.',
  });
  recordJudgment(db, {
    workPackageId: support,
    verdict: 'feasible',
    judgedBy: 'Lena (synthetic lead)',
    assumptions: 'Defect inflow stays at the last two quarters’ average; rotation covers one engineer at a time.',
  });
}

/**
 * Team Beacon: smaller, heavier overhead, overallocated (X9).
 * contracted 33.8 − absence 1.2 = available 32.6 − overhead 6.5 = net delivery 26.1
 * assigned 23.0 + reserve 6.0 = 29.0 → shortfall 2.9, while Atlas still holds 4.0 of headroom
 */
export function seedBeaconTeam(db: Database, teamId: number, quarterId: number): void {
  const workPackage = workPackageFor(db, teamId, quarterId);

  const ana = repo.addPerson(db, { teamId, name: 'Ana (lead)', fraction: 1 });
  const bo = repo.addPerson(db, { teamId, name: 'Bo', fraction: 1 });
  repo.addPerson(db, { teamId, name: 'Cass', fraction: 0.6 });

  repo.addAbsence(db, { personId: bo, from: '2027-02-08', to: '2027-02-15', note: 'leave (6 working days)' });
  repo.setOverhead(db, { personId: ana, quarterId, percent: 50, note: 'lead of a small team: management & admin' });

  workPackage('Ledger export hardening', 'Sustain & Maintenance', 14, 14);
  const vendorSdk = workPackage(
    'Vendor SDK upgrade',
    'Tech Debt',
    9,
    9,
    'X9: Beacon is overallocated — the shortfall is shown, never covered by another team’s headroom',
  );

  repo.setReserve(db, { teamId, quarterId, engineerWeeks: 6 });
  recordJudgment(db, {
    workPackageId: vendorSdk,
    verdict: 'not_feasible',
    judgedBy: 'Ana (synthetic lead)',
    assumptions: 'Beacon is 2.9 ew overallocated this quarter; the upgrade cannot land until the reserve or another package gives way.',
  });
}

/**
 * Q1 2027 as a 13-week quarter: Monday 2027-01-04 to Friday 2027-04-02, 65 working days,
 * with an empty holiday calendar so the figures match the worked examples exactly.
 *
 * Creates only what is missing. A team that already exists is left exactly as it is —
 * its people, edits, assignments, reserve and judgment history are never touched.
 */
export function seedSyntheticExample(db: Database): SeedResult {
  const teams = repo.listTeams(db);
  const existingAtlas = teams.find((t) => t.name === SYNTHETIC_TEAM);
  const existingBeacon = teams.find((t) => t.name === SYNTHETIC_TEAM_2);
  const existingQuarter = repo.listQuarters(db).find((q) => q.name === SYNTHETIC_QUARTER);

  const quarterCreated = existingQuarter === undefined;
  const quarterId = existingQuarter?.id ?? repo.createQuarter(db, { name: SYNTHETIC_QUARTER, start: '2027-01-04', end: '2027-04-02' });

  const addedTeams: string[] = [];

  let teamId: number;
  if (existingAtlas) {
    teamId = existingAtlas.id;
  } else {
    teamId = repo.createTeam(db, SYNTHETIC_TEAM);
    seedAtlasTeam(db, teamId, quarterId);
    addedTeams.push(SYNTHETIC_TEAM);
  }

  let beaconTeamId: number;
  if (existingBeacon) {
    beaconTeamId = existingBeacon.id;
  } else {
    beaconTeamId = repo.createTeam(db, SYNTHETIC_TEAM_2);
    seedBeaconTeam(db, beaconTeamId, quarterId);
    addedTeams.push(SYNTHETIC_TEAM_2);
  }

  return { teamId, beaconTeamId, quarterId, created: addedTeams.length > 0 || quarterCreated, addedTeams, quarterCreated };
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const db = openDatabase(DEFAULT_DB_PATH);
  const r = seedSyntheticExample(db);
  if (r.addedTeams.length) console.log(`Seeded into ${DEFAULT_DB_PATH}: ${r.addedTeams.join(', ')}`);
  else console.log(`Nothing to seed — both synthetic teams are already in ${DEFAULT_DB_PATH}`);
  if (r.quarterCreated) console.log(`Created quarter ${SYNTHETIC_QUARTER}`);
  console.log('Existing teams, edits, assignments and judgment history are left untouched.');
  console.log(`Open http://127.0.0.1:3000/capacity?q=${r.quarterId} after \`npm start\``);
}
