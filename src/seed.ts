/**
 * Synthetic example data — Team Atlas from DOMAIN_EXAMPLES.md X1 and X6. Every name and
 * figure is invented; nothing here describes a real person.
 *
 * Run with `npm run seed`. Safe to re-run: it does nothing if the synthetic team exists.
 */

import type { Database } from './db/database.js';
import { openDatabase } from './db/database.js';
import * as repo from './db/repo.js';
import { DEFAULT_DB_PATH } from './config.js';
import { recordJudgment } from './plan.js';

export const SYNTHETIC_TEAM = 'Team Atlas (synthetic example)';
export const SYNTHETIC_QUARTER = 'Q1 2027 (synthetic)';

/**
 * Q1 2027 as a 13-week quarter: Monday 2027-01-04 to Friday 2027-04-02, 65 working days,
 * with an empty holiday calendar so the figures match X1 exactly.
 */
export function seedSyntheticExample(db: Database): { teamId: number; quarterId: number; created: boolean } {
  const existing = repo.listTeams(db).find((t) => t.name === SYNTHETIC_TEAM);
  const existingQuarter = repo.listQuarters(db).find((q) => q.name === SYNTHETIC_QUARTER);
  if (existing && existingQuarter) return { teamId: existing.id, quarterId: existingQuarter.id, created: false };

  const teamId = existing?.id ?? repo.createTeam(db, SYNTHETIC_TEAM);
  const quarterId = existingQuarter?.id ?? repo.createQuarter(db, { name: SYNTHETIC_QUARTER, start: '2027-01-04', end: '2027-04-02' });

  const lena = repo.addPerson(db, { teamId, name: 'Lena (lead)', fraction: 1 });
  const rob = repo.addPerson(db, { teamId, name: 'Rob', fraction: 1 });
  repo.addPerson(db, { teamId, name: 'Chen', fraction: 1 });
  repo.addPerson(db, { teamId, name: 'Dana', fraction: 1 });
  const priya = repo.addPerson(db, { teamId, name: 'Priya', fraction: 0.6 });
  repo.addPerson(db, { teamId, name: 'Marta', fraction: 1, joined: '2027-02-01' }); // start of week 5

  repo.addAbsence(db, { personId: rob, from: '2027-02-15', to: '2027-02-26', note: 'leave (2 weeks)' });
  repo.addAbsence(db, { personId: priya, from: '2027-03-08', to: '2027-03-12', note: 'leave (1 week at 0.6)' });
  repo.setOverhead(db, { personId: lena, quarterId, percent: 40, note: 'team lead: management & admin' });

  const wp = (name: string, category: string, estimate: number, assigned: number, notes = '') => {
    const id = repo.addWorkPackage(db, { teamId, quarterId, name, category, estimateEw: estimate, notes });
    if (assigned > 0) repo.setAssignment(db, { workPackageId: id, teamId, engineerWeeks: assigned });
    return id;
  };

  wp('Telemetry pipeline rebuild', 'New Development', 14, 8, 'X2: Atlas contribution 14 of a 20 ew package; only 8 assigned this quarter');
  const payments = wp('Payments reconciliation service', 'New Development', 20, 20);
  wp('Legacy job runner removal', 'Tech Debt', 10, 10);
  const support = wp('Support rotation and defect backlog', 'Sustain & Maintenance', 10, 10);
  wp('Search relevance tuning', 'New Development', 6, 0, 'accepted, not yet assigned');

  // Reserve before judgments: a judgment captures the team-quarter context it is made in.
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

  return { teamId, quarterId, created: true };
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const db = openDatabase(DEFAULT_DB_PATH);
  const r = seedSyntheticExample(db);
  console.log(r.created ? `Seeded synthetic example into ${DEFAULT_DB_PATH}` : 'Synthetic example already present');
  console.log(`Open http://127.0.0.1:3000/plan/${r.teamId}/${r.quarterId} after \`npm start\``);
}
