/**
 * Engineering-wide read model for one quarter: every team's plan, plus totals.
 *
 * This is a **view over team-quarter plans**, not a planning unit of its own. Assignments,
 * reserves, reconciliation and feasibility reassessment all remain owned by a team-quarter
 * (`plan.ts`); nothing here writes, and nothing here pools capacity across teams.
 *
 * Two rules govern the totals:
 *
 * 1. **Aggregate percentages are computed from summed quantities**, never by averaging the
 *    teams' percentages. A large team and a small one do not carry equal weight.
 * 2. **Headroom and shortfall are reported separately.** One team's headroom cannot cover
 *    another team's shortfall — the people are not interchangeable — so the two are never
 *    netted into a single reassuring number.
 */

import type { Database } from './db/database.js';
import { getQuarter, listTeams, type QuarterRow, type TeamRow } from './db/repo.js';
import { loadPlan, type TeamQuarterPlan, type WorkPackageView } from './plan.js';
import { CATEGORIES, type Category, type PlanningState } from './domain/planning.js';

export interface EngineeringTotals {
  contractedEw: number;
  absenceEw: number;
  availableEw: number;
  overheadEw: number;
  netDeliveryEw: number;
  /** Summed overhead ÷ summed available capacity. Never a mean of the team ratios. */
  overheadRatio: number | null;
  assignedEw: number;
  reserveEw: number;
  /** Σ headroom over teams that have headroom. Cannot be spent on another team's work. */
  surplusHeadroomEw: number;
  /** Σ shortfall over teams that are overallocated. Always shown, never offset. */
  shortfallEw: number;
  /** surplusHeadroom − shortfall. The arithmetic residual, not deployable capacity. */
  netHeadroomEw: number;
  teamsWithHeadroom: number;
  teamsWithShortfall: number;
}

export interface EngineeringQuarter {
  quarter: QuarterRow;
  /** One entry per team, in name order. Each is the authoritative team-quarter plan. */
  plans: TeamQuarterPlan[];
  totals: EngineeringTotals;
  /** Assigned capacity by category, summed across teams. */
  byCategory: Record<Category, { ew: number; percent: number | null }>;
  stateCounts: Record<PlanningState, number>;
  /** Every work package in the quarter, each carrying the team that owns it. */
  workPackages: Array<WorkPackageView & { team: TeamRow }>;
}

const sum = <T>(xs: T[], pick: (x: T) => number): number => xs.reduce((acc, x) => acc + pick(x), 0);

export function loadEngineeringQuarter(db: Database, quarterId: number): EngineeringQuarter | undefined {
  const quarter = getQuarter(db, quarterId);
  if (!quarter) return undefined;

  const plans = listTeams(db)
    .map((t) => loadPlan(db, t.id, quarterId))
    .filter((p): p is TeamQuarterPlan => p !== undefined);

  const availableEw = sum(plans, (p) => p.capacity.availableEw);
  const overheadEw = sum(plans, (p) => p.capacity.overheadEw);
  const netDeliveryEw = sum(plans, (p) => p.capacity.netDeliveryEw);

  const totals: EngineeringTotals = {
    contractedEw: sum(plans, (p) => p.capacity.contractedEw),
    absenceEw: sum(plans, (p) => p.capacity.absenceEw),
    availableEw,
    overheadEw,
    netDeliveryEw,
    // Summed quantities, not a mean of per-team ratios.
    overheadRatio: availableEw > 0 ? overheadEw / availableEw : null,
    assignedEw: sum(plans, (p) => p.reconciliation.assignedEw),
    reserveEw: sum(plans, (p) => p.reconciliation.reserveEw),
    surplusHeadroomEw: sum(plans, (p) => Math.max(0, p.reconciliation.headroomEw)),
    shortfallEw: sum(plans, (p) => p.reconciliation.shortfallEw),
    netHeadroomEw: 0,
    teamsWithHeadroom: plans.filter((p) => p.reconciliation.headroomEw > 0).length,
    teamsWithShortfall: plans.filter((p) => p.reconciliation.shortfallEw > 0).length,
  };
  totals.netHeadroomEw = totals.surplusHeadroomEw - totals.shortfallEw;

  const workPackages = plans.flatMap((p) => p.workPackages.map((w) => ({ ...w, team: p.team })));

  const byCategory = {} as EngineeringQuarter['byCategory'];
  for (const c of CATEGORIES) {
    const ew = sum(
      workPackages.filter((w) => w.category === c),
      (w) => w.assignedEw,
    );
    byCategory[c] = { ew, percent: netDeliveryEw > 0 ? (ew / netDeliveryEw) * 100 : null };
  }

  const stateCounts: Record<PlanningState, number> = { accepted: 0, partially_assigned: 0, assigned: 0, feasible: 0 };
  for (const p of plans) for (const s of Object.keys(stateCounts) as PlanningState[]) stateCounts[s] += p.stateCounts[s];

  return { quarter, plans, totals, byCategory, stateCounts, workPackages };
}

/** A share of Engineering net delivery capacity, for reporting alongside `byCategory`. */
export function shareOfNetDelivery(ew: number, totals: EngineeringTotals): number | null {
  return totals.netDeliveryEw > 0 ? (ew / totals.netDeliveryEw) * 100 : null;
}
