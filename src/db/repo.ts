/**
 * Persistence for the one-team, one-quarter planning workflow. Plain SQL over node:sqlite;
 * every write is a small, validated statement so the plan survives across sessions.
 *
 * Every mutation that materially changes a team-quarter's planning inputs appends a row to
 * the durable `plan_change` log (D15). Judgments record the log position they were made
 * at; later rows mean they need reassessment, until a fresh judgment is recorded. A save
 * that changes nothing appends nothing.
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
import {
  type Category,
  differsMaterially,
  type FeasibilityJudgment,
  isCategory,
  type JudgmentContext,
  type PlanChange,
  type Verdict,
  type WorkPackagePlan,
} from '../domain/planning.js';
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
  /** ISO timestamp of the last change to estimate or assignment (informational). */
  changedAt: string;
  judgments: FeasibilityJudgment[];
}

const now = () => new Date().toISOString();
const fmt = (n: number) => n.toFixed(1);

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

// ---- the change log ----------------------------------------------------------------------------

function logChange(db: Database, teamId: number, quarterId: number, description: string, workPackageId: number | null = null): void {
  db.prepare('INSERT INTO plan_change (team_id, quarter_id, work_package_id, changed_at, description) VALUES (?, ?, ?, ?, ?)').run(
    teamId,
    quarterId,
    workPackageId,
    now(),
    description,
  );
}

/** Quarters whose date range intersects [from, to] (null bounds are open). */
function quartersIntersecting(db: Database, from: ISODate | null, to: ISODate | null): QuarterRow[] {
  return listQuarters(db).filter((q) => (from === null || from <= q.end) && (to === null || to >= q.start));
}

function logForQuarters(db: Database, teamId: number, quarters: QuarterRow[], description: string): void {
  for (const q of quarters) logChange(db, teamId, q.id, description);
}

export function listChanges(db: Database, teamId: number, quarterId: number): PlanChange[] {
  return (
    db
      .prepare('SELECT id, work_package_id, changed_at, description FROM plan_change WHERE team_id = ? AND quarter_id = ? ORDER BY id')
      .all(teamId, quarterId) as unknown as Array<{ id: number; work_package_id: number | null; changed_at: string; description: string }>
  ).map((c) => ({ id: c.id, workPackageId: c.work_package_id, changedAt: c.changed_at, description: c.description }));
}

/** The latest change id recorded for a team-quarter, or 0 when none has been. */
export function latestChangeId(db: Database, teamId: number, quarterId: number): number {
  const row = db.prepare('SELECT COALESCE(MAX(id), 0) AS id FROM plan_change WHERE team_id = ? AND quarter_id = ?').get(teamId, quarterId) as {
    id: number;
  };
  return row.id;
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

/** A holiday affects every team in every quarter that contains the date. */
function logHolidayChange(db: Database, date: ISODate, description: string): void {
  const quarters = quartersIntersecting(db, date, date);
  for (const t of listTeams(db)) logForQuarters(db, t.id, quarters, description);
}

export function addHoliday(db: Database, input: { date: string; name: string }): void {
  const date = assertISODate(input.date.trim(), 'Holiday date');
  const name = requireText(input.name, 'Holiday name');
  const existing = db.prepare('SELECT name FROM holiday WHERE date = ?').get(date) as { name: string } | undefined;
  db.prepare('INSERT OR REPLACE INTO holiday (date, name) VALUES (?, ?)').run(date, name);
  if (!existing) logHolidayChange(db, date, `holiday added: ${date} (${name})`);
  // Renaming an existing holiday changes no capacity, so it is not logged.
}

export function deleteHoliday(db: Database, date: string): void {
  const existing = db.prepare('SELECT name FROM holiday WHERE date = ?').get(date) as { name: string } | undefined;
  if (!existing) return;
  db.prepare('DELETE FROM holiday WHERE date = ?').run(date);
  logHolidayChange(db, date, `holiday removed: ${date} (${existing.name})`);
}

export function listHolidays(db: Database): HolidayRow[] {
  return db.prepare('SELECT date, name FROM holiday ORDER BY date').all() as unknown as HolidayRow[];
}

export function holidayCalendar(db: Database): HolidayCalendar {
  return new HolidayCalendar(listHolidays(db).map((h) => h.date));
}

// ---- census ----------------------------------------------------------------------------------

interface PersonRow {
  id: number;
  team_id: number;
  name: string;
  joined_on: string | null;
  left_on: string | null;
}

export function getPerson(db: Database, personId: number): PersonRow | undefined {
  return db.prepare('SELECT id, team_id, name, joined_on, left_on FROM person WHERE id = ?').get(personId) as PersonRow | undefined;
}

function requirePerson(db: Database, personId: number): PersonRow {
  const p = getPerson(db, personId);
  if (!p) throw new Error('Person not found');
  return p;
}

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
  logForQuarters(db, input.teamId, quartersIntersecting(db, joined, left), `person added: ${name} (${(schedule.fraction * 100).toFixed(0)}%)`);
  return id;
}

export function deletePerson(db: Database, personId: number): void {
  const p = getPerson(db, personId);
  if (!p) return;
  db.prepare('DELETE FROM person WHERE id = ?').run(personId);
  logForQuarters(db, p.team_id, quartersIntersecting(db, p.joined_on, p.left_on), `person removed: ${p.name}`);
}

export function addScheduleChange(db: Database, input: { personId: number; fraction: string | number; effectiveFrom: string }): void {
  const p = requirePerson(db, input.personId);
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
  logForQuarters(
    db,
    p.team_id,
    quartersIntersecting(db, schedule.effectiveFrom, p.left_on),
    `schedule change for ${p.name}: ${(schedule.fraction * 100).toFixed(0)}% from ${schedule.effectiveFrom}`,
  );
}

export function deleteSchedule(db: Database, scheduleId: number): void {
  const row = db.prepare('SELECT person_id, fraction, effective_from FROM schedule WHERE id = ?').get(scheduleId) as
    | { person_id: number; fraction: number; effective_from: string | null }
    | undefined;
  if (!row) return;
  if (row.effective_from === null) throw new Error('The initial schedule cannot be deleted; delete the person instead');
  const p = requirePerson(db, row.person_id);
  db.prepare('DELETE FROM schedule WHERE id = ?').run(scheduleId);
  logForQuarters(
    db,
    p.team_id,
    quartersIntersecting(db, row.effective_from, p.left_on),
    `schedule change removed for ${p.name}: ${(row.fraction * 100).toFixed(0)}% from ${row.effective_from}`,
  );
}

export function addAbsence(db: Database, input: { personId: number; from: string; to: string; note?: string }): void {
  const p = requirePerson(db, input.personId);
  const from = assertISODate(input.from.trim(), 'Absence start');
  const to = assertISODate(input.to.trim(), 'Absence end');
  if (to < from) throw new Error('Absence end must not precede its start');
  db.prepare('INSERT INTO absence (person_id, from_date, to_date, note) VALUES (?, ?, ?, ?)').run(
    input.personId,
    from,
    to,
    (input.note ?? '').trim(),
  );
  logForQuarters(db, p.team_id, quartersIntersecting(db, from, to), `absence added for ${p.name}: ${from} → ${to}`);
}

export function deleteAbsence(db: Database, absenceId: number): void {
  const row = db.prepare('SELECT person_id, from_date, to_date FROM absence WHERE id = ?').get(absenceId) as
    | { person_id: number; from_date: string; to_date: string }
    | undefined;
  if (!row) return;
  const p = requirePerson(db, row.person_id);
  db.prepare('DELETE FROM absence WHERE id = ?').run(absenceId);
  logForQuarters(db, p.team_id, quartersIntersecting(db, row.from_date, row.to_date), `absence removed for ${p.name}: ${row.from_date} → ${row.to_date}`);
}

/**
 * Sets the overhead percentage, and the note only when one is supplied. A caller that
 * changes the percentage alone — the inline editor does — must not silently discard the
 * recorded reason for it; omitting `note` keeps whatever is stored.
 */
export function setOverhead(db: Database, input: { personId: number; quarterId: number; percent: string | number; note?: string }): void {
  const p = requirePerson(db, input.personId);
  const percent = requireNumber(input.percent, 'Overhead percent');
  validateOverheadPercent(percent);
  const before = db
    .prepare('SELECT percent, note FROM overhead WHERE person_id = ? AND quarter_id = ?')
    .get(input.personId, input.quarterId) as { percent: number; note: string } | undefined;
  const note = input.note === undefined ? (before?.note ?? '') : input.note.trim();
  db.prepare(
    `INSERT INTO overhead (person_id, quarter_id, percent, note) VALUES (?, ?, ?, ?)
     ON CONFLICT (person_id, quarter_id) DO UPDATE SET percent = excluded.percent, note = excluded.note`,
  ).run(input.personId, input.quarterId, percent, note);
  const previous = before?.percent ?? 0;
  if (previous !== percent) logChange(db, p.team_id, input.quarterId, `overhead for ${p.name} changed ${previous}% → ${percent}%`);
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

// ---- work list, assignments, reserve, feasibility ----------------------------------------------

interface WorkPackageRef {
  id: number;
  team_id: number;
  quarter_id: number;
  name: string;
  estimate_ew: number;
}

export function getWorkPackage(db: Database, id: number): WorkPackageRef | undefined {
  return db.prepare('SELECT id, team_id, quarter_id, name, estimate_ew FROM work_package WHERE id = ?').get(id) as WorkPackageRef | undefined;
}

function requireWorkPackage(db: Database, id: number): WorkPackageRef {
  const wp = getWorkPackage(db, id);
  if (!wp) throw new Error('WorkPackage not found');
  return wp;
}

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
  // Accepting work claims no capacity, so nothing is logged until it is assigned.
  return Number(r.lastInsertRowid);
}

export function updateEstimate(db: Database, workPackageId: number, estimateEw: string | number): void {
  const wp = requireWorkPackage(db, workPackageId);
  const estimate = requireNumber(estimateEw, 'Estimate');
  if (estimate < 0) throw new Error('Estimate cannot be negative');
  if (!differsMaterially(wp.estimate_ew, estimate)) return;
  db.prepare('UPDATE work_package SET estimate_ew = ?, changed_at = ? WHERE id = ?').run(estimate, now(), workPackageId);
  // An estimate concerns this package's own judgment only, so the change is scoped to it.
  logChange(db, wp.team_id, wp.quarter_id, `estimate for "${wp.name}" changed ${fmt(wp.estimate_ew)} → ${fmt(estimate)} ew`, wp.id);
}

export function deleteWorkPackage(db: Database, workPackageId: number): void {
  const wp = getWorkPackage(db, workPackageId);
  if (!wp) return;
  const assigned = getAssignment(db, workPackageId, wp.team_id);
  db.prepare('DELETE FROM work_package WHERE id = ?').run(workPackageId);
  // Removing assigned work frees capacity for everyone else: a team-wide change.
  if (assigned > 0) logChange(db, wp.team_id, wp.quarter_id, `WorkPackage "${wp.name}" removed (had ${fmt(assigned)} ew assigned)`);
}

export function getAssignment(db: Database, workPackageId: number, teamId: number): number {
  const row = db.prepare('SELECT engineer_weeks FROM assignment WHERE work_package_id = ? AND team_id = ?').get(workPackageId, teamId) as
    | { engineer_weeks: number }
    | undefined;
  return row?.engineer_weeks ?? 0;
}

/** Earmark a quantity of a team's capacity to a WorkPackage; zero removes the assignment. */
export function setAssignment(db: Database, input: { workPackageId: number; teamId: number; engineerWeeks: string | number }): void {
  const wp = requireWorkPackage(db, input.workPackageId);
  const ew = requireNumber(input.engineerWeeks, 'Assigned engineer-weeks');
  if (ew < 0) throw new Error('Assigned engineer-weeks cannot be negative');
  const before = getAssignment(db, input.workPackageId, input.teamId);
  if (!differsMaterially(before, ew)) return;
  if (ew === 0) {
    db.prepare('DELETE FROM assignment WHERE work_package_id = ? AND team_id = ?').run(input.workPackageId, input.teamId);
  } else {
    db.prepare(
      `INSERT INTO assignment (work_package_id, team_id, engineer_weeks) VALUES (?, ?, ?)
       ON CONFLICT (work_package_id, team_id) DO UPDATE SET engineer_weeks = excluded.engineer_weeks`,
    ).run(input.workPackageId, input.teamId, ew);
  }
  db.prepare('UPDATE work_package SET changed_at = ? WHERE id = ?').run(now(), input.workPackageId);
  // Any assignment is a claim on the shared team-quarter capacity, so every judgment in
  // the team-quarter — not just this package's — is affected (the conservative rule).
  logChange(db, wp.team_id, wp.quarter_id, `assignment to "${wp.name}" changed ${fmt(before)} → ${fmt(ew)} ew`);
}

export function setReserve(db: Database, input: { teamId: number; quarterId: number; engineerWeeks: string | number }): void {
  const ew = requireNumber(input.engineerWeeks, 'Unplanned Work reserve');
  if (ew < 0) throw new Error('Unplanned Work reserve cannot be negative');
  const before = getReserve(db, input.teamId, input.quarterId);
  if (!differsMaterially(before, ew)) return;
  db.prepare(
    `INSERT INTO reserve (team_id, quarter_id, engineer_weeks) VALUES (?, ?, ?)
     ON CONFLICT (team_id, quarter_id) DO UPDATE SET engineer_weeks = excluded.engineer_weeks`,
  ).run(input.teamId, input.quarterId, ew);
  logChange(db, input.teamId, input.quarterId, `Unplanned Work reserve changed ${fmt(before)} → ${fmt(ew)} ew`);
}

export function getReserve(db: Database, teamId: number, quarterId: number): number {
  const row = db.prepare('SELECT engineer_weeks FROM reserve WHERE team_id = ? AND quarter_id = ?').get(teamId, quarterId) as
    | { engineer_weeks: number }
    | undefined;
  return row?.engineer_weeks ?? 0;
}

export function isVerdict(value: string): value is Verdict {
  return value === 'feasible' || value === 'not_feasible';
}

/**
 * Stores a judgment together with the figures and the change-log position it was made at.
 * Callers are expected to go through `recordJudgment` in `plan.ts`, which enforces the
 * prerequisites; this function only persists.
 */
export function insertFeasibility(
  db: Database,
  input: {
    workPackageId: number;
    verdict: Verdict;
    judgedBy: string;
    assumptions: string;
    scopeNote?: string;
    judgedAt?: string;
    context: JudgmentContext;
    planChangeId: number;
  },
): void {
  db.prepare(
    `INSERT INTO feasibility (work_package_id, verdict, judged_by, judged_at, assumptions, scope_note,
                              ctx_estimate_ew, ctx_assigned_ew, ctx_net_delivery_ew, ctx_reserve_ew, ctx_shortfall_ew, plan_change_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.workPackageId,
    input.verdict,
    requireText(input.judgedBy, 'Judged by'),
    input.judgedAt ?? now(),
    requireText(input.assumptions, 'Material assumptions'),
    (input.scopeNote ?? '').trim(),
    input.context.estimateEw,
    input.context.assignedEw,
    input.context.netDeliveryEw,
    input.context.reserveEw,
    input.context.shortfallEw,
    input.planChangeId,
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
    `SELECT verdict, judged_by, judged_at, assumptions, scope_note,
            ctx_estimate_ew, ctx_assigned_ew, ctx_net_delivery_ew, ctx_reserve_ew, ctx_shortfall_ew, plan_change_id
       FROM feasibility WHERE work_package_id = ? ORDER BY judged_at DESC, id DESC`,
  );
  return rows.map((r) => {
    const js = (judgments.all(r.id) as unknown as FeasibilityRow[]).map(toJudgment);
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

interface FeasibilityRow {
  verdict: Verdict;
  judged_by: string;
  judged_at: string;
  assumptions: string;
  scope_note: string;
  ctx_estimate_ew: number | null;
  ctx_assigned_ew: number | null;
  ctx_net_delivery_ew: number | null;
  ctx_reserve_ew: number | null;
  ctx_shortfall_ew: number | null;
  plan_change_id: number | null;
}

function toJudgment(j: FeasibilityRow): FeasibilityJudgment {
  const context: JudgmentContext | null =
    j.ctx_estimate_ew === null ||
    j.ctx_assigned_ew === null ||
    j.ctx_net_delivery_ew === null ||
    j.ctx_reserve_ew === null ||
    j.ctx_shortfall_ew === null
      ? null
      : {
          estimateEw: j.ctx_estimate_ew,
          assignedEw: j.ctx_assigned_ew,
          netDeliveryEw: j.ctx_net_delivery_ew,
          reserveEw: j.ctx_reserve_ew,
          shortfallEw: j.ctx_shortfall_ew,
        };
  return {
    verdict: j.verdict,
    judgedBy: j.judged_by,
    judgedAt: j.judged_at,
    assumptions: j.assumptions,
    scopeNote: j.scope_note,
    context,
    planChangeId: j.plan_change_id,
  };
}
