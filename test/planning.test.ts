import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assessState,
  changesSinceJudgment,
  feasibilityPrerequisiteViolations,
  investmentMix,
  judgmentContext,
  reconcile,
  stateCounts,
  type FeasibilityJudgment,
  type JudgmentContext,
  type PlanChange,
  type WorkPackagePlan,
} from '../src/domain/planning.js';
import { close } from './helpers.js';

const T1 = '2027-01-11T09:00:00.000Z';
const NO_CHANGES: PlanChange[] = [];

function wp(over: Partial<WorkPackagePlan> & { name: string }): WorkPackagePlan {
  return { id: 1, category: 'New Development', estimateEw: 10, assignedEw: 0, judgment: null, ...over };
}

/** A judgment recorded at change-log position `planChangeId` in the given context. */
function judged(
  base: Partial<WorkPackagePlan> & { name: string },
  rec: { netDeliveryEw: number; reserveEw: number; shortfallEw: number },
  verdict: FeasibilityJudgment['verdict'] = 'feasible',
  scopeNote = '',
  planChangeId = 0,
): WorkPackagePlan {
  const w = wp(base);
  const context: JudgmentContext = {
    estimateEw: w.estimateEw,
    assignedEw: w.assignedEw,
    netDeliveryEw: rec.netDeliveryEw,
    reserveEw: rec.reserveEw,
    shortfallEw: rec.shortfallEw,
  };
  return { ...w, judgment: { verdict, judgedBy: 'Lead', judgedAt: T1, assumptions: 'estimate holds', scopeNote, context, planChangeId } };
}

const change = (id: number, description: string, workPackageId: number | null = null): PlanChange => ({
  id,
  workPackageId,
  changedAt: T1,
  description,
});

const balanced = reconcile(61.0, [20, 10, 10, 8], 9.0); // headroom 4.0

describe('reconciliation identity (X3, X6)', () => {
  it('X3: an overallocated draft reports its shortfall explicitly', () => {
    const r = reconcile(61.0, [55.0], 9.0);
    close(r.headroomEw, -3.0);
    close(r.shortfallEw, 3.0);
    close(r.assignedEw + r.reserveEw + r.headroomEw, r.netDeliveryEw, 'identity holds even when overallocated');
  });

  it('X6: consuming reserve for newly accepted work keeps the identity balanced with no double count', () => {
    const before = reconcile(61.0, [8, 20, 10, 10], 9.0);
    close(before.headroomEw, 4.0);
    const after = reconcile(61.0, [8, 20, 10, 10, 3], 6.0); // +3 assigned, −3 reserve
    close(after.assignedEw, 51.0);
    close(after.reserveEw, 6.0);
    close(after.headroomEw, 4.0, 'headroom untouched');
    close(after.shortfallEw, 0);
  });

  it('X7: a revision that grows an estimate consumes headroom then reserve, and the identity still balances', () => {
    const baseline = reconcile(30.0, [6, 18], 4.0);
    close(baseline.headroomEw, 2.0);
    const revision = reconcile(30.0, [9, 18], 3.0);
    close(revision.headroomEw, 0.0);
    close(revision.assignedEw, 27.0);
  });

  it('a negative reserve is rejected rather than silently absorbed', () => {
    assert.throws(() => reconcile(10, [], -1));
  });
});

describe('planning states (X2, D10)', () => {
  it('X2: 8 of 14 assigned is partially assigned, and does not imply coverage', () => {
    assert.equal(assessState(wp({ name: 'Telemetry', estimateEw: 14, assignedEw: 8 }), balanced, NO_CHANGES).state, 'partially_assigned');
  });

  it('accepted with no assignment is accepted; assignment ≥ estimate is assigned', () => {
    assert.equal(assessState(wp({ name: 'a', assignedEw: 0 }), balanced, NO_CHANGES).state, 'accepted');
    assert.equal(assessState(wp({ name: 'b', estimateEw: 10, assignedEw: 10 }), balanced, NO_CHANGES).state, 'assigned');
    assert.equal(assessState(wp({ name: 'c', estimateEw: 10, assignedEw: 12 }), balanced, NO_CHANGES).state, 'assigned');
  });

  it('a positive balance never marks work feasible — only a recorded judgment does', () => {
    assert.equal(assessState(wp({ name: 'full', estimateEw: 10, assignedEw: 10 }), balanced, NO_CHANGES).state, 'assigned');
    assert.equal(assessState(judged({ name: 'full', estimateEw: 10, assignedEw: 10 }, balanced), balanced, NO_CHANGES).state, 'feasible');
  });

  it('a partially assigned package can be judged feasible with reduced scope', () => {
    const w = judged({ name: 'Telemetry', estimateEw: 14, assignedEw: 8 }, balanced, 'feasible', 'ingestion phase only');
    assert.equal(assessState(w, balanced, NO_CHANGES).state, 'feasible');
  });

  it('a "not feasible" judgment leaves the package in its assignment-derived state', () => {
    const a = assessState(judged({ name: 'x', estimateEw: 10, assignedEw: 10 }, balanced, 'not_feasible'), balanced, NO_CHANGES);
    assert.equal(a.state, 'assigned');
    assert.equal(a.needsReassessment, false);
  });

  it('state counts are non-overlapping and sum to the number of packages', () => {
    const list = [
      wp({ id: 1, name: 'a', assignedEw: 0 }),
      wp({ id: 2, name: 'b', estimateEw: 14, assignedEw: 8 }),
      wp({ id: 3, name: 'c', estimateEw: 10, assignedEw: 10 }),
      judged({ id: 4, name: 'd', estimateEw: 10, assignedEw: 10 }, balanced),
    ];
    const counts = stateCounts(list, balanced, NO_CHANGES);
    assert.deepEqual(counts, { accepted: 1, partially_assigned: 1, assigned: 1, feasible: 1 });
    assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), list.length);
  });
});

describe('feasibility prerequisites (D15)', () => {
  const ctx = (over: Partial<JudgmentContext>): JudgmentContext => ({
    estimateEw: 10,
    assignedEw: 10,
    netDeliveryEw: 61,
    reserveEw: 9,
    shortfallEw: 0,
    ...over,
  });

  it('a feasible verdict with zero assigned capacity is refused', () => {
    const v = feasibilityPrerequisiteViolations(ctx({ assignedEw: 0 }), 'feasible', '');
    assert.equal(v.length, 1);
    assert.match(v[0]!, /no capacity is assigned/);
  });

  it('a feasible verdict when the team has no net delivery capacity is refused', () => {
    const v = feasibilityPrerequisiteViolations(ctx({ netDeliveryEw: 0, shortfallEw: 19 }), 'feasible', '');
    assert.ok(v.some((m) => /no net delivery capacity/.test(m)));
  });

  it('a feasible verdict while the team-quarter has a shortfall is refused', () => {
    const v = feasibilityPrerequisiteViolations(ctx({ shortfallEw: 3 }), 'feasible', '');
    assert.equal(v.length, 1);
    assert.match(v[0]!, /overallocated by 3\.0 ew/);
  });

  it('partial assignment without a stated reduced scope is refused; with scope it passes', () => {
    assert.match(feasibilityPrerequisiteViolations(ctx({ estimateEw: 14, assignedEw: 8 }), 'feasible', '')[0]!, /reduced scope/);
    assert.deepEqual(feasibilityPrerequisiteViolations(ctx({ estimateEw: 14, assignedEw: 8 }), 'feasible', 'ingestion only'), []);
    assert.deepEqual(feasibilityPrerequisiteViolations(ctx({ estimateEw: 14, assignedEw: 8 }), 'feasible', '   '), [
      'assigned capacity (8.0 ew) is below the estimate (14.0 ew); state the reduced scope this judgment covers',
    ]);
  });

  it('meeting every prerequisite yields no violations, and still does not make work feasible by itself', () => {
    assert.deepEqual(feasibilityPrerequisiteViolations(ctx({}), 'feasible', ''), []);
    assert.equal(assessState(wp({ name: 'x', estimateEw: 10, assignedEw: 10 }), balanced, NO_CHANGES).state, 'assigned');
  });

  it('a negative verdict is always recordable', () => {
    assert.deepEqual(feasibilityPrerequisiteViolations(ctx({ assignedEw: 0, netDeliveryEw: 0, shortfallEw: 40 }), 'not_feasible', ''), []);
  });
});

describe('team-quarter reassessment rule (D15) — durable change log', () => {
  const judgment = { planChangeId: 3 };

  it('no changes logged since the judgment → current', () => {
    const log = [change(1, 'person added: Chen'), change(2, 'assignment to "A" changed 0.0 → 20.0 ew'), change(3, 'reserve changed 0.0 → 9.0 ew')];
    assert.deepEqual(changesSinceJudgment(log, 1, judgment), []);
  });

  it('any team-wide change logged after the judgment → needs reassessment, in log order', () => {
    const log = [change(3, 'older'), change(5, 'absence added for Chen: 2027-03-15 → 2027-03-19'), change(4, 'person added: Sam (100%)')];
    const since = changesSinceJudgment(log, 1, judgment);
    assert.deepEqual(
      since.map((c) => c.id),
      [5, 4],
    );
    const a = assessState(judged({ name: 'x', estimateEw: 20, assignedEw: 20 }, balanced, 'feasible', '', 3), balanced, log);
    assert.equal(a.needsReassessment, true);
    assert.equal(a.state, 'assigned');
    assert.deepEqual(a.reassessmentReasons, ['person added: Sam (100%)', 'absence added for Chen: 2027-03-15 → 2027-03-19']);
  });

  it('a competing assignment is material even when totals still fit (conservative rule)', () => {
    const log = [change(4, 'assignment to "Search" changed 0.0 → 3.0 ew')];
    assert.equal(assessState(judged({ name: 'x', estimateEw: 20, assignedEw: 20 }, balanced, 'feasible', '', 3), balanced, log).needsReassessment, true);
  });

  it('another package’s own estimate change is not material to this package', () => {
    const log = [change(4, 'estimate for "Other" changed 6.0 → 9.0 ew', 99)];
    assert.deepEqual(changesSinceJudgment(log, 1, judgment), []);
    assert.equal(changesSinceJudgment(log, 99, judgment).length, 1);
  });

  it('once flagged, a judgment stays flagged: the log only grows, so a revert is another change', () => {
    const log = [change(4, 'Unplanned Work reserve changed 9.0 → 6.0 ew'), change(5, 'Unplanned Work reserve changed 6.0 → 9.0 ew')];
    const a = assessState(judged({ name: 'x', estimateEw: 20, assignedEw: 20 }, balanced, 'feasible', '', 3), balanced, log);
    assert.equal(a.needsReassessment, true, 'totals match the judgment context again, but the judgment is not revived');
    assert.equal(a.reassessmentReasons.length, 2);
  });

  it('a fresh judgment at the current log position is current, and only that clears the flag', () => {
    const log = [change(4, 'x'), change(5, 'y')];
    assert.equal(assessState(judged({ name: 'x', estimateEw: 20, assignedEw: 20 }, balanced, 'feasible', '', 5), balanced, log).needsReassessment, false);
  });

  it('a judgment recorded before change tracking is always stale', () => {
    const since = changesSinceJudgment([], 1, { planChangeId: null });
    assert.equal(since.length, 1);
    assert.match(since[0]!.description, /predates change tracking/);
  });

  it('a stale feasible judgment never counts as feasible, and prerequisites are re-checked for a current one', () => {
    // Current judgment, but the team is now overallocated: prerequisites fail → not feasible.
    const short = reconcile(40.0, [20, 10, 10, 8], 9.0);
    const a = assessState(judged({ name: 'x', estimateEw: 20, assignedEw: 20 }, short, 'feasible', '', 0), short, NO_CHANGES);
    assert.equal(a.state, 'assigned');
  });

  it('judgmentContext captures the current figures for the record', () => {
    const c = judgmentContext(wp({ name: 'x', estimateEw: 14, assignedEw: 8 }), balanced);
    assert.deepEqual(c, { estimateEw: 14, assignedEw: 8, netDeliveryEw: 61, reserveEw: 9, shortfallEw: 0 });
  });
});

describe('investment mix', () => {
  it('uses net delivery capacity as the denominator and shows reserve and headroom separately', () => {
    const list = [
      wp({ id: 1, name: 'nd', category: 'New Development', assignedEw: 28 }),
      wp({ id: 2, name: 'td', category: 'Tech Debt', assignedEw: 10 }),
      wp({ id: 3, name: 'sm', category: 'Sustain & Maintenance', assignedEw: 10 }),
    ];
    const rec = reconcile(61.0, list.map((w) => w.assignedEw), 9.0);
    const mix = investmentMix(list, rec);
    close(mix.denominatorEw, 61.0);
    close(mix.byCategory['New Development'].percent!, (28 / 61) * 100);
    close(mix.reserve.ew, 9.0);
    close(mix.headroom.ew, 4.0);
    const total =
      mix.byCategory['New Development'].ew + mix.byCategory['Tech Debt'].ew + mix.byCategory['Sustain & Maintenance'].ew + mix.reserve.ew + mix.headroom.ew;
    close(total, 61.0, 'categories + reserve + headroom account for all net delivery capacity');
  });

  it('percentages are undefined, not zero or infinite, when net delivery capacity is zero', () => {
    const mix = investmentMix([], reconcile(0, [], 0));
    assert.equal(mix.reserve.percent, null);
  });
});
