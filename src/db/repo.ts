/**
 * Persistence for the one-team, one-quarter planning workflow. Plain SQL over node:sqlite;
 * every write is a small, validated statement so the plan survives across sessions.
 */

import { assertISODate, HolidayCalendar, type ISODate } from '../domain/calendar.js';
import {
  type Absence,
  type PersonInput,
  type Quarter,
  type SchedulePeriod,
  validateOverheadPercent,
  validateSchedule,
} from '../domain/capacity.js';
import { type Category, type FeasibilityJudgment, isCategory, type Verdict, type WorkPackagePlan } from '../domain/planning.js';
import type { Database } from './database.js';

export interface QuarterRow extends Quarter {
  id: number;
}

export interface TeamRow {
  id: number;
  name: string;
}

export interface HolidayRow {
  date: ISODate;
  name: string;
}

export interface PersonRecord extends PersonInput {
  teamId: number;
  scheduleRows: Array<SchedulePeriod & { id: number }>;
  absenceRows: Array<Absence & { id: number }>;
  overheadNote: string;
}

export interface WorkPackageRecord extends WorkPackagePlan {
  teamId: number;
  quarterId: number;
  notes: string;
  judgments: FeasibilityJudgment[];
}

const now = () => new Date().toISOString();

function requireText(value: string | undefined, label: string): string {
  const v = (value ?? '').trim();
  if (!v) throw new Error(`${label} is required`);
  return v;
}

function requireNumber(value: string | number | undefined, label: string): number {
  const n = typeof value === 'number' ? value : Number((value ?? '').trim());
  if (!Number.isFinite(n)) throw new Error(`${label} must be a number`);
  return n;
}

function optionalDate(value: string | undefined, label: string): ISODate | null {
  const v = (value ?? '').trim();
  return v ? assertISODate(v, label) : null;
}

// ---- quarters, teams, holidays -------------------------------------------------------------

export function createQuarter(db: Database, input: { name: string; start: string; end: string }): number {
  const name = requireText(input.name, 'Quarter name');
  const start = assertISODate(input.start.trim(), 'Quarter start');
  const end = assertISODate(input.end.trim(), 'Quarter end');
  if (end < start) throw new Error('Quarter end must not precede its start');
  const r = db.prepare('INSERT INTO quarter (name, start_date, end_date) VALUES (?, ?, ?)').run(name, start, end);
  return Number(r.lastInsertRowid);
}

export function listQuarters(db: Database): QuarterRow[] {
  return db
    .prepare('SELECT id, name, start_date AS start, end_date AS end FROM quarter ORDER BY start_date')
    .all() as unknown as QuarterRow[];
}

export function getQuarter(db: Database, id: number): QuarterRow | undefined {
  return db.prepare('SELECT id, name, start_date AS start, end_date AS end FROM quarter WHERE id = ?').get(id) as
    | QuarterRow
    | undefined;
}

export function createTeam(db: Database, name: string): number {
  const r = db.prepare('INSERT INTO team (name) VALUES (?)').run(requireText(name, 'Team name'));
  return Number(r.lastInsertRowid);
}

export function listTeams(db: Database): TeamRow[] {
  return db.prepare('SELECT id, name FROM team ORDER BY name').all() as unknown as TeamRow[];
}

export function getTeam(db: Database, id: number): TeamRow | undefined {
  return db.prepare('SELECT id, name FROM team WHERE id = ?').get(id) as TeamRow | undefined;
}

export function addHoliday(db: Database, input: { date: string; name: string }): void {
  const date = assertISODate(input.date.trim(), 'Holiday date');
  db.prepare('INSERT OR REPLACE INTO holiday (date, name) VALUES (?, ?)').run(date, requireText(input.name, 'Holiday name'));
}

export function deleteHoliday(db: Database, date: string): void {
  db.prepare('DELETE FROM holiday WHERE date = ?').run(date);
}

export function listHolidays(db: Database): HolidayRow[] {
  return db.prepare('SELECT date, name FROM holiday ORDER BY date').all() as unknown as HolidayRow[];
}

export function holidayCalendar(db: Database): HolidayCalendar {
  return new HolidayCalendar(listHolidays(db).map((h) => h.date));
}

// ---- census ----------------------------------------------------------------------------------

export function addPerson(
  db: Database,
  input: { teamId: number; name: string; joined?: string; left?: string; fraction: string | number },
): number {
  const name = requireText(input.name, 'Name');
  const joined = optionalDate(input.joined, 'Joined date');
  const left = optionalDate(input.left, 'Left date');
  if (joined && left && left < joined) throw new Error('Left date must not precede joined date');
  const schedule: SchedulePeriod = { fraction: requireNumber(input.fraction, 'Schedule fraction'), effectiveFrom: null };
  validateSchedule(schedule);

  const r = db.prepare('INSERT INTO person (team_id, name, joined_on, left_on) VALUES (?, ?, ?, ?)').run(input.teamId, name, joined, left);
  const id = Number(r.lastInsertRowid);
  db.prepare('INSERT INTO schedule (person_id, fraction, effective_from) VALUES (?, ?, NULL)').run(id, schedule.fraction);
  return id;
}

export function deletePerson(db: Database, personId: number): void {
  db.prepare('DELETE FROM person WHERE id = ?').run(personId);
}

export function addScheduleChange(db: Database, input: { personId: number; fraction: string | number; effectiveFrom: string }): void {
  const schedule: SchedulePeriod = {
    fraction: requireNumber(input.fraction, 'Schedule fraction'),
    effectiveFrom: assertISODate(input.effectiveFrom.trim(), 'Effective from'),
  };
  validateSchedule(schedule);
  db.prepare('INSERT INTO schedule (person_id, fraction, effective_from) VALUES (?, ?, ?)').run(
    input.personId,
    schedule.fraction,
    schedule.effectiveFrom,
  );
}

export function deleteSchedule(db: Database, scheduleId: number): void {
  const row = db.prepare('SELECT effective_from FROM schedule WHERE id = ?').get(scheduleId) as { effective_from: string | null } | undefined;
  if (row && row.effective_from === null) throw new Error('The initial schedule cannot be deleted; delete the person instead');
  db.prepare('DELETE FROM schedule WHERE id = ?').run(scheduleId);
}

export function addAbsence(db: Database, input: { personId: number; from: string; to: string; note?: string }): void {
  const from = assertISODate(input.from.trim(), 'Absence start');
  const to = assertISODate(input.to.trim(), 'Absence end');
  if (to < from) throw new Error('Absence end must not precede its start');
  db.prepare('INSERT INTO absence (person_id, from_date, to_date, note) VALUES (?, ?, ?, ?)').run(
    input.personId,
    from,
    to,
    (input.note ?? '').trim(),
  );
}

export function deleteAbsence(db: Database, absenceId: number): void {
  db.prepare('DELETE FROM absence WHERE id = ?').run(absenceId);
}

export function setOverhead(db: Database, input: { personId: number; quarterId: number; percent: string | number; note?: string }): void {
  const percent = requireNumber(input.percent, 'Overhead percent');
  validateOverheadPercent(percent);
  db.prepare(
    `INSERT INTO overhead (person_id, quarter_id, percent, note) VALUES (?, ?, ?, ?)
     ON CONFLICT (person_id, quarter_id) DO UPDATE SET percent = excluded.percent, note = excluded.note`,
  ).run(input.personId, input.quarterId, percent, (input.note ?? '').trim());
}

interface PersonRow {
  id: number;
  team_id: number;
  name: string;
  joined_on: string | null;
  left_on: string | null;
}

export function listPeople(db: Database, teamId: number, quarterId: number): PersonRecord[] {
  const people = db.prepare('SELECT id, team_id, name, joined_on, left_on FROM person WHERE team_id = ? ORDER BY name').all(
    teamId,
  ) as unknown as PersonRow[];
  const schedules = db.prepare('SELECT id, person_id, fraction, effective_from FROM schedule WHERE person_id = ?');
  const absences = db.prepare('SELECT id, person_id, from_date, to_date, note FROM absence WHERE person_id = ? ORDER BY from_date');
  const overhead = db.prepare('SELECT percent, note FROM overhead WHERE person_id = ? AND quarter_id = ?');

  return people.map((p) => {
    const scheduleRows = (schedules.all(p.id) as unknown as Array<{ id: number; fraction: number; effective_from: string | null }>).map(
      (s) => ({ id: s.id, fraction: s.fraction, effectiveFrom: s.effective_from }),
    );
    const absenceRows = (
      absences.all(p.id) as unknown as Array<{ id: number; from_date: string; to_date: string; note: string }>
    ).map((a) => ({ id: a.id, from: a.from_date, to: a.to_date, note: a.note }));
    const oh = overhead.get(p.id, quarterId) as { percent: number; note: string } | undefined;
    return {
      id: p.id,
      teamId: p.team_id,
      name: p.name,
      joined: p.joined_on,
      left: p.left_on,
      schedules: scheduleRows,
      scheduleRows,
      absences: absenceRows,
      absenceRows,
      overheadPercent: oh?.percent ?? 0,
      overheadNote: oh?.note ?? '',
    };
  });
}

export function getPerson(db: Database, personId: number): PersonRow | undefined {
  return db.prepare('SELECT id, team_id, name, joined_on, left_on FROM person WHERE id = ?').get(personId) as PersonRow | undefined;
}

// ---- work list, assignments, reserve, feasibility ----------------------------------------------

export function addWorkPackage(
  db: Database,
  input: { teamId: number; quarterId: number; name: string; category: string; estimateEw: string | number; notes?: string },
): number {
  const name = requireText(input.name, 'WorkPackage name');
  if (!isCategory(input.category)) throw new Error(`Unknown delivery investment category "${input.category}"`);
  const estimate = requireNumber(input.estimateEw, 'Estimate');
  if (estimate < 0) throw new Error('Estimate cannot be negative');
  const r = db
    .prepare('INSERT INTO work_package (team_id, quarter_id, name, category, estimate_ew, notes, changed_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(input.teamId, input.quarterId, name, input.category, estimate, (input.notes ?? '').trim(), now());
  return Number(r.lastInsertRowid);
}

export function updateEstimate(db: Database, workPackageId: number, estimateEw: string | number): void {
  const estimate = requireNumber(estimateEw, 'Estimate');
  if (estimate < 0) throw new Error('Estimate cannot be negative');
  db.prepare('UPDATE work_package SET estimate_ew = ?, changed_at = ? WHERE id = ?').run(estimate, now(), workPackageId);
}

export function deleteWorkPackage(db: Database, workPackageId: number): void {
  db.prepare('DELETE FROM work_package WHERE id = ?').run(workPackageId);
}

/** Earmark a quantity of a team's capacity to a WorkPackage; zero removes the assignment. */
export function setAssignment(db: Database, input: { workPackageId: number; teamId: number; engineerWeeks: string | number }): void {
  const ew = requireNumber(input.engineerWeeks, 'Assigned engineer-weeks');
  if (ew < 0) throw new Error('Assigned engineer-weeks cannot be negative');
  if (ew === 0) {
    db.prepare('DELETE FROM assignment WHERE work_package_id = ? AND team_id = ?').run(input.workPackageId, input.teamId);
  } else {
    db.prepare(
      `INSERT INTO assignment (work_package_id, team_id, engineer_weeks) VALUES (?, ?, ?)
       ON CONFLICT (work_package_id, team_id) DO UPDATE SET engineer_weeks = excluded.engineer_weeks`,
    ).run(input.workPackageId, input.teamId, ew);
  }
  db.prepare('UPDATE work_package SET changed_at = ? WHERE id = ?').run(now(), input.workPackageId);
}

export function setReserve(db: Database, input: { teamId: number; quarterId: number; engineerWeeks: string | number }): void {
  const ew = requireNumber(input.engineerWeeks, 'Unplanned Work reserve');
  if (ew < 0) throw new Error('Unplanned Work reserve cannot be negative');
  db.prepare(
    `INSERT INTO reserve (team_id, quarter_id, engineer_weeks) VALUES (?, ?, ?)
     ON CONFLICT (team_id, quarter_id) DO UPDATE SET engineer_weeks = excluded.engineer_weeks`,
  ).run(input.teamId, input.quarterId, ew);
}

export function getReserve(db: Database, teamId: number, quarterId: number): number {
  const row = db.prepare('SELECT engineer_weeks FROM reserve WHERE team_id = ? AND quarter_id = ?').get(teamId, quarterId) as
    | { engineer_weeks: number }
    | undefined;
  return row?.engineer_weeks ?? 0;
}

export function recordFeasibility(
  db: Database,
  input: { workPackageId: number; verdict: string; judgedBy: string; assumptions: string; scopeNote?: string; judgedAt?: string },
): void {
  if (input.verdict !== 'feasible' && input.verdict !== 'not_feasible') throw new Error('Verdict must be feasible or not_feasible');
  const verdict: Verdict = input.verdict;
  db.prepare(
    'INSERT INTO feasibility (work_package_id, verdict, judged_by, judged_at, assumptions, scope_note) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    input.workPackageId,
    verdict,
    requireText(input.judgedBy, 'Judged by'),
    input.judgedAt ?? now(),
    requireText(input.assumptions, 'Material assumptions'),
    (input.scopeNote ?? '').trim(),
  );
}

interface WorkPackageRow {
  id: number;
  team_id: number;
  quarter_id: number;
  name: string;
  category: string;
  estimate_ew: number;
  notes: string;
  changed_at: string;
  assigned_ew: number | null;
}

export function listWorkPackages(db: Database, teamId: number, quarterId: number): WorkPackageRecord[] {
  const rows = db
    .prepare(
      `SELECT w.id, w.team_id, w.quarter_id, w.name, w.category, w.estimate_ew, w.notes, w.changed_at,
              a.engineer_weeks AS assigned_ew
         FROM work_package w
         LEFT JOIN assignment a ON a.work_package_id = w.id AND a.team_id = w.team_id
        WHERE w.team_id = ? AND w.quarter_id = ?
        ORDER BY w.id`,
    )
    .all(teamId, quarterId) as unknown as WorkPackageRow[];
  const judgments = db.prepare(
    'SELECT verdict, judged_by, judged_at, assumptions, scope_note FROM feasibility WHERE work_package_id = ? ORDER BY judged_at DESC, id DESC',
  );
  return rows.map((r) => {
    const js = (
      judgments.all(r.id) as unknown as Array<{ verdict: Verdict; judged_by: string; judged_at: string; assumptions: string; scope_note: string }>
    ).map((j) => ({ verdict: j.verdict, judgedBy: j.judged_by, judgedAt: j.judged_at, assumptions: j.assumptions, scopeNote: j.scope_note }));
    return {
      id: r.id,
      teamId: r.team_id,
      quarterId: r.quarter_id,
      name: r.name,
      category: r.category as Category,
      estimateEw: r.estimate_ew,
      assignedEw: r.assigned_ew ?? 0,
      notes: r.notes,
      changedAt: r.changed_at,
      judgment: js[0] ?? null,
      judgments: js,
    };
  });
}

export function getWorkPackage(db: Database, id: number): { id: number; team_id: number; quarter_id: number } | undefined {
  return db.prepare('SELECT id, team_id, quarter_id FROM work_package WHERE id = ?').get(id) as
    | { id: number; team_id: number; quarter_id: number }
    | undefined;
}
