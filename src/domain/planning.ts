/**
 * Team-quarter reconciliation and planning states (QUARTERLY_PLANNING_MODEL.md, D9, D10).
 *
 *   net delivery capacity = assigned + Unplanned Work reserve + headroom
 *
 * Negative headroom is a shortfall and is reported, never adjusted away. Feasibility is a
 * recorded technical-lead judgment; the arithmetic here never confers it.
 */

export const CATEGORIES = ['New Development', 'Sustain & Maintenance', 'Tech Debt'] as const;
export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export type Verdict = 'feasible' | 'not_feasible';

export interface FeasibilityJudgment {
  verdict: Verdict;
  judgedBy: string;
  /** ISO timestamp. */
  judgedAt: string;
  assumptions: string;
  scopeNote: string;
}

export interface WorkPackagePlan {
  id: number;
  name: string;
  category: Category;
  /** Rough estimate of this team's contribution, in engineer-weeks. */
  estimateEw: number;
  /** This team's capacity assignment, in engineer-weeks. 0 when unassigned. */
  assignedEw: number;
  /** ISO timestamp of the last change to estimate or assignment. */
  changedAt: string;
  judgment: FeasibilityJudgment | null;
}

/**
 * Non-overlapping planning states. `feasible` requires a current (non-stale) feasible
 * judgment; the others are derived from assignment alone.
 */
export type PlanningState = 'accepted' | 'partially_assigned' | 'assigned' | 'feasible';

export const STATE_LABELS: Record<PlanningState, string> = {
  accepted: 'Accepted — not yet assigned',
  partially_assigned: 'Partially assigned',
  assigned: 'Assigned',
  feasible: 'Feasible',
};

export interface StateAssessment {
  state: PlanningState;
  /** A judgment exists but the estimate or assignment changed after it was made. */
  needsReassessment: boolean;
  /** The recorded judgment, current or stale. */
  judgment: FeasibilityJudgment | null;
}

export function judgmentIsStale(wp: Pick<WorkPackagePlan, 'changedAt' | 'judgment'>): boolean {
  return wp.judgment !== null && wp.changedAt > wp.judgment.judgedAt;
}

export function assessState(wp: WorkPackagePlan): StateAssessment {
  const stale = judgmentIsStale(wp);
  const currentlyFeasible = wp.judgment?.verdict === 'feasible' && !stale;
  let state: PlanningState;
  if (currentlyFeasible) state = 'feasible';
  else if (wp.assignedEw <= 0) state = 'accepted';
  else if (wp.assignedEw < wp.estimateEw) state = 'partially_assigned';
  else state = 'assigned';
  return { state, needsReassessment: stale, judgment: wp.judgment };
}

export function stateCounts(wps: WorkPackagePlan[]): Record<PlanningState, number> {
  const counts: Record<PlanningState, number> = { accepted: 0, partially_assigned: 0, assigned: 0, feasible: 0 };
  for (const wp of wps) counts[assessState(wp).state] += 1;
  return counts;
}

export interface Reconciliation {
  netDeliveryEw: number;
  assignedEw: number;
  reserveEw: number;
  /** net − assigned − reserve. Negative when overallocated. */
  headroomEw: number;
  /** max(0, −headroom): the explicit shortfall of an overallocated draft. */
  shortfallEw: number;
}

export function reconcile(netDeliveryEw: number, assignedEws: number[], reserveEw: number): Reconciliation {
  if (reserveEw < 0) throw new Error('Unplanned Work reserve cannot be negative');
  const assignedEw = assignedEws.reduce((a, b) => a + b, 0);
  const headroomEw = netDeliveryEw - assignedEw - reserveEw;
  return {
    netDeliveryEw,
    assignedEw,
    reserveEw,
    headroomEw,
    shortfallEw: headroomEw < 0 ? -headroomEw : 0,
  };
}

export interface InvestmentMix {
  /** The denominator: net delivery capacity in engineer-weeks. */
  denominatorEw: number;
  byCategory: Record<Category, { ew: number; percent: number | null }>;
  reserve: { ew: number; percent: number | null };
  headroom: { ew: number; percent: number | null };
}

/** Assigned capacity by category as a share of net delivery capacity, reserve and headroom shown separately. */
export function investmentMix(wps: WorkPackagePlan[], rec: Reconciliation): InvestmentMix {
  const pct = (ew: number) => (rec.netDeliveryEw > 0 ? (ew / rec.netDeliveryEw) * 100 : null);
  const byCategory = {} as InvestmentMix['byCategory'];
  for (const c of CATEGORIES) {
    const ew = wps.filter((w) => w.category === c).reduce((a, w) => a + w.assignedEw, 0);
    byCategory[c] = { ew, percent: pct(ew) };
  }
  return {
    denominatorEw: rec.netDeliveryEw,
    byCategory,
    reserve: { ew: rec.reserveEw, percent: pct(rec.reserveEw) },
    headroom: { ew: rec.headroomEw, percent: pct(rec.headroomEw) },
  };
}
