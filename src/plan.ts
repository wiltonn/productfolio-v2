/**
 * Assembles everything the plan page and the tests need for one team-quarter: the capacity
 * chain, the work list with planning states, the reconciliation identity, and the mix.
 * Also the one entry point for recording a feasibility judgment, so that every judgment is
 * stored with its context and every feasible verdict has met its prerequisites.
 */

import type { Database } from './db/database.js';
import {
  getQuarter,
  getReserve,
  getTeam,
  getWorkPackage,
  holidayCalendar,
  insertFeasibility,
  isVerdict,
  listHolidays,
  listPeople,
  listWorkPackages,
  type HolidayRow,
  type PersonRecord,
  type QuarterRow,
  type TeamRow,
  type WorkPackageRecord,
} from './db/repo.js';
import { workingDays } from './domain/calendar.js';
import { teamCapacity, type TeamCapacity } from './domain/capacity.js';
import {
  assessState,
  feasibilityPrerequisiteViolations,
  investmentMix,
  judgmentContext,
  reconcile,
  stateCounts,
  type InvestmentMix,
  type PlanningState,
  type Reconciliation,
  type StateAssessment,
} from './domain/planning.js';

export interface WorkPackageView extends WorkPackageRecord {
  assessment: StateAssessment;
}

export interface TeamQuarterPlan {
  team: TeamRow;
  quarter: QuarterRow;
  workingDaysInQuarter: number;
  holidaysInQuarter: HolidayRow[];
  holidayCalendarSize: number;
  people: PersonRecord[];
  capacity: TeamCapacity;
  workPackages: WorkPackageView[];
  reconciliation: Reconciliation;
  mix: InvestmentMix;
  stateCounts: Record<PlanningState, number>;
}

export function loadPlan(db: Database, teamId: number, quarterId: number): TeamQuarterPlan | undefined {
  const team = getTeam(db, teamId);
  const quarter = getQuarter(db, quarterId);
  if (!team || !quarter) return undefined;

  const holidays = holidayCalendar(db);
  const people = listPeople(db, teamId, quarterId);
  const capacity = teamCapacity(people, quarter, holidays);

  const wps = listWorkPackages(db, teamId, quarterId);
  const reserve = getReserve(db, teamId, quarterId);
  const reconciliation = reconcile(
    capacity.netDeliveryEw,
    wps.map((w) => w.assignedEw),
    reserve,
  );

  return {
    team,
    quarter,
    workingDaysInQuarter: workingDays(quarter.start, quarter.end).length,
    holidaysInQuarter: listHolidays(db).filter((h) => h.date >= quarter.start && h.date <= quarter.end),
    holidayCalendarSize: holidays.size,
    people,
    capacity,
    workPackages: wps.map((w) => ({ ...w, assessment: assessState(w, reconciliation) })),
    reconciliation,
    mix: investmentMix(wps, reconciliation),
    stateCounts: stateCounts(wps, reconciliation),
  };
}

/**
 * Records a technical-lead feasibility judgment against the current team-quarter context.
 * A feasible verdict is refused when its capacity prerequisites are not met; a negative
 * verdict is always accepted. Never grants feasibility on its own.
 */
export function recordJudgment(
  db: Database,
  input: { workPackageId: number; verdict: string; judgedBy: string; assumptions: string; scopeNote?: string; judgedAt?: string },
): void {
  if (!isVerdict(input.verdict)) throw new Error('Verdict must be feasible or not_feasible');
  const ref = getWorkPackage(db, input.workPackageId);
  if (!ref) throw new Error('WorkPackage not found');
  const plan = loadPlan(db, ref.team_id, ref.quarter_id);
  const wp = plan?.workPackages.find((w) => w.id === input.workPackageId);
  if (!plan || !wp) throw new Error('WorkPackage not found');

  const scopeNote = (input.scopeNote ?? '').trim();
  const context = judgmentContext(wp, plan.reconciliation);
  const violations = feasibilityPrerequisiteViolations(context, input.verdict, scopeNote);
  if (violations.length > 0) {
    throw new Error(
      `A feasible verdict cannot be recorded: ${violations.join('; ')}. Fix the plan, state the reduced scope, or record "not feasible".`,
    );
  }

  insertFeasibility(db, {
    workPackageId: input.workPackageId,
    verdict: input.verdict,
    judgedBy: input.judgedBy,
    assumptions: input.assumptions,
    scopeNote,
    ...(input.judgedAt !== undefined ? { judgedAt: input.judgedAt } : {}),
    context,
  });
}
