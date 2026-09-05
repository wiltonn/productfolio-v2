# Rejected Concepts

Concepts and structures deliberately excluded, with the reason — recorded so they are not
reintroduced by accident, particularly where a legacy implementation still contains them.
Entries predating the 2026-09-05 scope reset are kept where they still guard a live rule;
the full pre-reset file is at git tag `checkpoint/pre-engineering-quarterly-reset`.
Deferred-scope items are **not** listed here — deferral is recorded in `OPEN_DECISIONS.md`
D6, and deferred concepts remain candidates for expansion.

---

## Distributing overhead across delivery investment categories

**What it would be** — Spreading management and administration time proportionally into New
Development, Sustain & Maintenance and Tech Debt.

**Why rejected** — It overstates delivery capacity and corrupts the investment mix: the
categories would each silently contain time that delivers nothing on the work list, and the
overhead ratio — a number leadership needs — would become invisible. Overhead is netted out
and reported separately with its ratio.

**Rejected by** — D8.

---

## Invisible or unaccounted overhead

**What it was** — Legacy `CapacityEffect.OVERHEAD`: management duty deducted from a
person's week alongside leave, indistinguishable from absence and reported nowhere. (The
legacy build's own behaviour never used the distinction it declared — OVERHEAD and
UNAVAILABLE were summed with no branch.)

**Why rejected** — It models accounted-for work as missing time. Overhead is real, expected
work: it is measured, netted out of delivery capacity, and reported with an explicit ratio.
Absence remains the only true capacity reduction.

**History** — D2 first rejected the silent deduction by treating overhead as allocated
work; D8 refines that to netting-out with separate reporting. What is rejected throughout
is overhead that cannot be seen.

**Rejected by** — D2, refined by D8.

---

## Silent adjustment of an overallocated draft

**What it would be** — Scaling assignments down, trimming the reserve, or capping totals so
a draft plan always appears to balance.

**Why rejected** — The shortfall *is* the information. A draft whose assignments plus
reserve exceed net delivery capacity must report the negative headroom explicitly; hiding
it converts a planning decision into an arithmetic accident.

**Rejected by** — D9.

---

## Investment-mix percentages as evidence of fit

**What it would be** — Reading "60% New Development / 30% Sustain / 10% Tech Debt" as
evidence that the accepted work fits the quarter.

**Why rejected** — Percentages describe the shape of investment, not sufficiency. Fit is
established only by the reconciliation identity and the feasibility judgments (aggregate
fit being necessary but insufficient). Every reported percentage must state its
denominator.

**Rejected by** — D10.

---

## Employee-week precision as a planning requirement

**What it would be** — Requiring the quarterly plan to say what each person does each week,
or requiring ticket estimates and timesheets to plan capacity.

**Why rejected** — The planning unit is the team-quarter. Individual detail exists only for
constrained specialists, and month-level sequencing only where a dependency or delivery
window requires it. (Weekly allocation as a future capability is deferred with D6, not
rejected; what is rejected is *requiring* that precision to plan a quarter.)

**Rejected by** — D7.

---

## Reviving a feasibility judgment because the totals match again

**What it was** — Deciding whether a judgment is current by comparing the team-quarter's
present totals (net delivery capacity, reserve, shortfall, the package's estimate and
assignment) against a snapshot taken when it was recorded.

**Why rejected** — Totals can be restored while the assumptions cannot. A lead judges work
feasible on a named specialist's availability; the specialist goes on leave; an
equal-capacity person is added. The totals match the snapshot again and the judgment
silently returns to Feasible with the specialist still absent. Feasibility is a human
judgment about specific inputs, so invalidation must follow changes to those inputs and
persist until a human re-judges.

**What survives** — The figures at judgment time are still stored, for the record.

**Rejected by** — D15 (revised).

---

## Pre-reset rejections still in force

Condensed; full text at the checkpoint tag.

- **An organizational claim on a share of a person** (`allocationPct` on org links) — makes
  ownership and consumption one relationship and yields two answers to "how loaded is this
  person?". *Rejected by D1.*
- **Productivity-discounted capacity** (`effectiveHours = allocated × proficiency × buffer
  × ramp`) — makes a person's week change size by assignment; capacity is time. *Rejected
  by D2.*
- **A nominal full-time denominator** — part-time schedules count at their contracted
  fraction; over-allocation is measured against the person's own schedule, never a literal
  100%. *Rejected by D2.*
- **Representing Engineering with Product's levels** — no fake Product Portfolios,
  Workstreams or Areas for Engineering, ever. *Rejected by D3; carried as an expansion
  boundary.*
- **WorkItem as a planning concept** and **Initiative/Project as separate concepts** — one
  level of work, no subtypes; execution detail lives in delivery tools. *Rejected by D4.*
- **A separate estimation grain** beneath the planning unit — splits the estimate from the
  staffing across records nothing reconciles. *Rejected by D4.*
- **Commitment inferred from allocation** — a commitment is its own record; an assignment
  existing promises nothing. *Rejected by D5, retained in D10.*
