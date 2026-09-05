/**
 * Assembles everything the plan page and the tests need for one team-quarter: the capacity
 * chain, the work list with planning states, the reconciliation identity, and the mix.
 */

import type { Database } from './db/database.js';
import {
  getQuarter,
  getReserve,
  getTeam,
  holidayCalendar,
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
  investmentMix,
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
    workPackages: wps.map((w) => ({ ...w, assessment: assessState(w) })),
    reconciliation,
    mix: investmentMix(wps, reconciliation),
    stateCounts: stateCounts(wps),
  };
}
