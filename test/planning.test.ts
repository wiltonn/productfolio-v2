import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessState, investmentMix, reconcile, stateCounts, type WorkPackagePlan } from '../src/domain/planning.js';
import { close } from './helpers.js';

const T0 = '2027-01-10T09:00:00.000Z';
const T1 = '2027-01-11T09:00:00.000Z';

function wp(over: Partial<WorkPackagePlan> & { name: string }): WorkPackagePlan {
  return { id: 1, category: 'New Development', estimateEw: 10, assignedEw: 0, changedAt: T0, judgment: null, ...over };
}

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
    assert.equal(assessState(wp({ name: 'Telemetry', estimateEw: 14, assignedEw: 8 })).state, 'partially_assigned');
  });

  it('accepted with no assignment is accepted; assignment ≥ estimate is assigned', () => {
    assert.equal(assessState(wp({ name: 'a', assignedEw: 0 })).state, 'accepted');
    assert.equal(assessState(wp({ name: 'b', estimateEw: 10, assignedEw: 10 })).state, 'assigned');
    assert.equal(assessState(wp({ name: 'c', estimateEw: 10, assignedEw: 12 })).state, 'assigned');
  });

  it('a positive balance never marks work feasible — only a recorded judgment does', () => {
    const fully = wp({ name: 'full', estimateEw: 10, assignedEw: 10 });
    assert.equal(assessState(fully).state, 'assigned');
    const judged = wp({
      name: 'full',
      estimateEw: 10,
      assignedEw: 10,
      judgment: { verdict: 'feasible', judgedBy: 'Lead', judgedAt: T1, assumptions: 'estimate holds', scopeNote: '' },
    });
    assert.equal(assessState(judged).state, 'feasible');
  });

  it('a partially assigned package can be judged feasible with reduced scope', () => {
    const judged = wp({
      name: 'Telemetry',
      estimateEw: 14,
      assignedEw: 8,
      judgment: { verdict: 'feasible', judgedBy: 'Lead', judgedAt: T1, assumptions: '8 ew covers ingestion', scopeNote: 'ingestion phase only' },
    });
    assert.equal(assessState(judged).state, 'feasible');
  });

  it('a "not feasible" judgment leaves the package in its assignment-derived state', () => {
    const judged = wp({
      name: 'x',
      estimateEw: 10,
      assignedEw: 10,
      judgment: { verdict: 'not_feasible', judgedBy: 'Lead', judgedAt: T1, assumptions: 'specialist overloaded', scopeNote: '' },
    });
    const a = assessState(judged);
    assert.equal(a.state, 'assigned');
    assert.equal(a.needsReassessment, false);
  });

  it('a judgment made before the latest estimate/assignment change needs reassessment and is not counted feasible', () => {
    const stale = wp({
      name: 'x',
      estimateEw: 12,
      assignedEw: 12,
      changedAt: T1,
      judgment: { verdict: 'feasible', judgedBy: 'Lead', judgedAt: T0, assumptions: 'estimate of 10 holds', scopeNote: '' },
    });
    const a = assessState(stale);
    assert.equal(a.needsReassessment, true);
    assert.equal(a.state, 'assigned');
  });

  it('state counts are non-overlapping and sum to the number of packages', () => {
    const list = [
      wp({ id: 1, name: 'a', assignedEw: 0 }),
      wp({ id: 2, name: 'b', estimateEw: 14, assignedEw: 8 }),
      wp({ id: 3, name: 'c', estimateEw: 10, assignedEw: 10 }),
      wp({ id: 4, name: 'd', estimateEw: 10, assignedEw: 10, judgment: { verdict: 'feasible', judgedBy: 'L', judgedAt: T1, assumptions: 'ok', scopeNote: '' } }),
    ];
    const counts = stateCounts(list);
    assert.deepEqual(counts, { accepted: 1, partially_assigned: 1, assigned: 1, feasible: 1 });
    assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), list.length);
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
