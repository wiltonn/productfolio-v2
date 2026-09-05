/**
 * Team-quarter reconciliation and planning states (QUARTERLY_PLANNING_MODEL.md, D9, D10, D15).
 *
 *   net delivery capacity = assigned + Unplanned Work reserve + headroom
 *
 * Negative headroom is a shortfall and is reported, never adjusted away. Feasibility is a
 * recorded technical-lead judgment; the arithmetic here never confers it. It does two
 * things around a judgment: it refuses a *feasible* verdict whose capacity prerequisites
 * are not met, and it flags a judgment for reassessment when the team-quarter's planning
 * inputs have changed since it was made — durably, until a fresh judgment is recorded.
 */

export const CATEGORIES = ['New Development', 'Sustain & Maintenance', 'Tech Debt'] as const;
export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export type Verdict = 'feasible' | 'not_feasible';

/**
 * The material team-quarter facts a judgment rests on, captured when it is recorded.
 * A judgment stays current only while these are unchanged.
 */
export interface JudgmentContext {
  /** This WorkPackage's estimate for this team, in engineer-weeks. */
  estimateEw: number;
  /** This team's assignment to this WorkPackage. */
  assignedEw: number;
  /** The team's net delivery capacity for the quarter. */
  netDeliveryEw: number;
  /** The team's Unplanned Work reserve. */
  reserveEw: number;
  /** The team-quarter shortfall (0 when the plan balances). */
  shortfallEw: number;
}

export interface FeasibilityJudgment {
  verdict: Verdict;
  judgedBy: string;
  /** ISO timestamp. */
  judgedAt: string;
  assumptions: string;
  scopeNote: string;
  /** The figures at the time of judgment, kept for the record. null for pre-D15 rows. */
  context: JudgmentContext | null;
  /**
   * Position in the team-quarter change log when the judgment was made: the id of the
   * latest change then recorded (0 if none). null for rows recorded before change
   * tracking; such judgments are always stale.
   */
  planChangeId: number | null;
}

/**
 * One material change to a team-quarter's planning inputs, appended durably when it
 * happens. Ids only ever grow, so undoing a change is itself a further change.
 */
export interface PlanChange {
  id: number;
  /** Set when the change concerns one WorkPackage only (its own estimate). */
  workPackageId: number | null;
  changedAt: string;
  description: string;
}

export interface WorkPackagePlan {
  id: number;
  name: string;
  category: Category;
  /** Rough estimate of this team's contribution, in engineer-weeks. */
  estimateEw: number;
  /** This team's capacity assignment, in engineer-weeks. 0 when unassigned. */
  assignedEw: number;
  judgment: FeasibilityJudgment | null;
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

/** The context a judgment on `wp` would be made in right now. */
export function judgmentContext(wp: Pick<WorkPackagePlan, 'estimateEw' | 'assignedEw'>, rec: Reconciliation): JudgmentContext {
  return {
    estimateEw: wp.estimateEw,
    assignedEw: wp.assignedEw,
    netDeliveryEw: rec.netDeliveryEw,
    reserveEw: rec.reserveEw,
    shortfallEw: rec.shortfallEw,
  };
}

/**
 * Smaller than any quantity a planner can enter (inputs step by 0.1 ew; computed values
 * are multiples of 0.01 ew at the finest schedule fraction), so float noise never counts
 * as a change and a genuine edit always does.
 */
export const MATERIAL_CHANGE_EW = 0.005;

const fmt = (n: number) => n.toFixed(1);

/** Whether two engineer-week quantities differ materially. */
export function differsMaterially(a: number, b: number): boolean {
  return Math.abs(a - b) > MATERIAL_CHANGE_EW;
}

/**
 * The changes to a team-quarter's planning inputs recorded after a judgment was made, as
 * far as they concern this WorkPackage: every team-wide change (census, holidays,
 * reserve, any assignment — competing ones included, whether or not totals still fit)
 * plus changes scoped to this package (its own estimate). Non-empty means the judgment
 * needs reassessment. Because the log only grows, reverting a change never empties it —
 * only a fresh judgment does.
 */
export function changesSinceJudgment(
  changes: PlanChange[],
  workPackageId: number,
  judgment: Pick<FeasibilityJudgment, 'planChangeId'>,
): PlanChange[] {
  if (judgment.planChangeId === null) {
    return [{ id: 0, workPackageId: null, changedAt: '', description: 'judgment predates change tracking' }];
  }
  const since = judgment.planChangeId;
  return changes.filter((c) => c.id > since && (c.workPackageId === null || c.workPackageId === workPackageId));
}

/**
 * Necessary conditions for a *feasible* verdict. Meeting them never makes work feasible —
 * only the lead's judgment does — but a feasible verdict that fails them is refused.
 * A negative verdict is always recordable.
 */
export function feasibilityPrerequisiteViolations(ctx: JudgmentContext, verdict: Verdict, scopeNote: string): string[] {
  if (verdict !== 'feasible') return [];
  const violations: string[] = [];
  if (ctx.assignedEw <= 0) violations.push('no capacity is assigned to this WorkPackage');
  if (ctx.netDeliveryEw <= 0) violations.push('the team has no net delivery capacity this quarter');
  else if (ctx.assignedEw > ctx.netDeliveryEw + MATERIAL_CHANGE_EW) {
    violations.push(`the assignment (${fmt(ctx.assignedEw)} ew) exceeds the team's net delivery capacity (${fmt(ctx.netDeliveryEw)} ew)`);
  }
  if (ctx.shortfallEw > MATERIAL_CHANGE_EW) {
    violations.push(`the team-quarter is overallocated by ${fmt(ctx.shortfallEw)} ew; resolve the shortfall first`);
  }
  if (ctx.assignedEw > 0 && ctx.assignedEw + MATERIAL_CHANGE_EW < ctx.estimateEw && scopeNote.trim() === '') {
    violations.push(
      `assigned capacity (${fmt(ctx.assignedEw)} ew) is below the estimate (${fmt(ctx.estimateEw)} ew); state the reduced scope this judgment covers`,
    );
  }
  return violations;
}

/**
 * Non-overlapping planning states. `feasible` requires a current feasible judgment whose
 * prerequisites still hold; the others are derived from assignment alone.
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
  /** A judgment exists but planning inputs changed after it was made. */
  needsReassessment: boolean;
  /** The changes recorded since the judgment, for the planner. Empty when current. */
  reassessmentReasons: string[];
  /** The recorded judgment, current or stale. */
  judgment: FeasibilityJudgment | null;
}

/**
 * `changes` is the team-quarter's change log (any order). Feasibility requires a feasible
 * judgment with no changes logged since it, whose prerequisites still hold.
 */
export function assessState(wp: WorkPackagePlan, rec: Reconciliation, changes: PlanChange[]): StateAssessment {
  const since = wp.judgment ? changesSinceJudgment(changes, wp.id, wp.judgment) : [];
  const stale = since.length > 0;
  const currentlyFeasible =
    wp.judgment?.verdict === 'feasible' &&
    !stale &&
    feasibilityPrerequisiteViolations(judgmentContext(wp, rec), 'feasible', wp.judgment.scopeNote).length === 0;

  let state: PlanningState;
  if (currentlyFeasible) state = 'feasible';
  else if (wp.assignedEw <= 0) state = 'accepted';
  else if (wp.assignedEw < wp.estimateEw) state = 'partially_assigned';
  else state = 'assigned';
  return {
    state,
    needsReassessment: stale,
    reassessmentReasons: [...since].sort((a, b) => a.id - b.id).map((c) => c.description),
    judgment: wp.judgment,
  };
}

export function stateCounts(wps: WorkPackagePlan[], rec: Reconciliation, changes: PlanChange[]): Record<PlanningState, number> {
  const counts: Record<PlanningState, number> = { accepted: 0, partially_assigned: 0, assigned: 0, feasible: 0 };
  for (const wp of wps) counts[assessState(wp, rec, changes).state] += 1;
  return counts;
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
