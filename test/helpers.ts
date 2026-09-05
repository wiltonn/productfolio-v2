import assert from 'node:assert/strict';

/** Engineer-week arithmetic accumulates fifths; compare to a tolerance, not exactly. */
export function close(actual: number, expected: number, label?: string, eps = 1e-9): void {
  assert.ok(Math.abs(actual - expected) < eps, `${label ?? 'value'}: expected ${expected}, got ${actual}`);
}

/** Q1 2027 as used by DOMAIN_EXAMPLES.md: Monday 2027-01-04 to Friday 2027-04-02, 65 working days. */
export const Q1_2027 = { name: 'Q1 2027', start: '2027-01-04', end: '2027-04-02' };
