# Quarterly Planning Model

How team capacity is assigned to accepted work, reconciled, judged feasible, and committed.
This document is the authoritative home of the reconciliation identity, the Unplanned Work
reserve, the planning states, feasibility, commitments, baselines and reports.

Status: **active** for the first-release scope (revised 2026-09-05). This file replaced the
pre-reset enterprise-scope `DEMAND_COMMITMENT_MODEL.md`, whose Need/priority content is
deferred (see `OPEN_DECISIONS.md` D5, D6). The `DEMAND_COMMITMENT_MODEL.md` now on disk is a
deferred-scope investigation note, not an active document (see `README.md`).

---

## Capacity assignment

A **capacity assignment** earmarks a specific quantity of a named team's net delivery
capacity, in engineer-weeks, to an accepted WorkPackage for the quarter. Assignments are the
only way delivery capacity is attached to work in the first release.

- Assignments are per **team-quarter** — never per employee-week.
- A WorkPackage requiring several teams receives an assignment from each contributing team.
- **Partial assignment is supported and must be visible as partial.** Assigning 8 of an
  estimated 14 engineer-weeks does not imply the work is covered.

## The reconciliation identity

For every team-quarter:

```
Net delivery capacity = assigned delivery capacity
                      + Unplanned Work reserve
                      + remaining unassigned headroom
```

(Net delivery capacity is defined in `WORKFORCE_CAPACITY_MODEL.md`.)

- **Assigned delivery capacity** — the sum of the team's capacity assignments.
- **Unplanned Work reserve** — an explicit, deliberate reserve of delivery capacity for work
  that will arrive during the quarter but is not yet known. It is **not** overhead, and it
  is **not** the same as unassigned headroom: reserve is capacity the team intends to spend
  on as-yet-unknown work; headroom is capacity nothing has claimed.
- **Remaining unassigned headroom** — whatever is left. Headroom of zero is legal; negative
  headroom is a **shortfall**.

**An overallocated draft shows its shortfall explicitly.** If assignments plus reserve
exceed net delivery capacity, the identity is reported with the negative headroom stated as
a shortfall of that many engineer-weeks. Numbers are never silently scaled, trimmed or
hidden to make a draft balance.

### Consuming the reserve

When previously unknown work arrives and is accepted:

1. the work is added to the quarterly work list and **classified** into a delivery
   investment category like any other work;
2. it receives a capacity assignment;
3. the reserve is **reduced by the same amount**.

Assigned capacity rises and reserve falls in the same movement, so the identity stays
balanced and nothing is double-counted. Until reserve is consumed, it is shown separately
from classified delivery allocations — it has no investment category of its own.

## Planning states

Each WorkPackage on the quarterly work list progresses through three distinct conditions:

| State | Meaning |
|---|---|
| **Accepted** | On the quarterly work list. |
| **Assigned** | A specific quantity of a named team's capacity is earmarked to it. May be partial. |
| **Feasible** | Assigned capacity is judged sufficient given the estimate, specialist constraints, dependencies and sequencing. |

These are cumulative conditions, but reports count work in **non-overlapping buckets**:
*accepted, not yet assigned* / *assigned, not yet feasible* / *feasible*. A work item
appears in exactly one bucket.

## Feasibility

Feasibility is a recorded **judgment by the responsible technical lead**, not an arithmetic
output. The record carries:

- who judged it and when;
- the **material assumptions** it rests on (estimates held, a specialist's availability, a
  dependency landing on time, a delivery window);
- the sequencing reasoning where dependencies or windows constrained it.

Aggregate capacity fit is **necessary but insufficient**: a judgment must also confirm that
required constrained specialists fit (`WORKFORCE_CAPACITY_MODEL.md`) and that dependencies
and delivery windows fit under the rough monthly sequencing (`WORK_MODEL.md`).

**Feasibility must be reassessed when its material assumptions change.** An estimate revision,
a specialist absence, or a slipped dependency reopens the judgment; the record is updated,
not silently left stale.

## Commitment

A **Commitment** is the recorded promise that a WorkPackage (or an explicitly stated part of
one) will be delivered in the quarter.

- **Only feasible work may be committed.** Accepted or assigned work that has not been
  judged feasible is planned, not promised.
- A commitment may cover reduced scope — the committed scope is stated on the record.
- Commitments are never inferred from the existence of an assignment (retained from D5).
- When a committed item's feasibility assumptions break, the commitment is renegotiated
  explicitly; it does not silently disappear or silently persist.

## Baseline and revision

When the quarter's plan is approved, it becomes the **approved baseline**: the work list,
assignments, reserve, feasibility records and commitments as agreed.

- The baseline is **preserved unchanged**. Mid-quarter changes create a **revision**.
- Revisions are the live plan; the baseline remains available for comparison, so "what did
  we commit to?" and "what are we doing now?" have different, honest answers.
- Reports compare the current revision against the approved baseline.

## Reports

The first release reports, per quarter:

1. **Per-team capacity reconciliation** — the full chain (contracted, absences, available,
   overhead, net delivery) and the identity (assigned, reserve, headroom or shortfall).
2. **Accepted work by planning state** — non-overlapping counts: accepted-not-assigned,
   assigned-not-feasible, feasible.
3. **Assigned capacity versus estimated need** — per WorkPackage and per team contribution,
   making partial assignment visible.
4. **Overhead and overhead ratio** — overhead ÷ available workforce capacity, denominator
   stated.
5. **Delivery investment mix** — assigned capacity by category as percentages of net
   delivery capacity (denominator stated), with the Unplanned Work reserve and unassigned
   headroom shown separately, never folded into the categories.
6. **Commitments and material feasibility constraints** — what is promised, and the recorded
   assumptions and constraints the promises rest on.

Mix percentages describe investment shape only; feasibility and fit are reported through the
reconciliation and the feasibility records, never through percentages.
