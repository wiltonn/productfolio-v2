# Quarterly Planning Model

How team capacity is assigned to accepted work, reconciled, judged feasible, and committed.
This document is the authoritative home of the reconciliation identity, the Unplanned Work
reserve, the planning states, feasibility, commitments, baselines, reports, and the
Engineering-wide workspace that reads across them.

Status: **active** for the first-release scope (revised 2026-09-05). This file replaced the
pre-reset enterprise-scope `DEMAND_COMMITMENT_MODEL.md`, whose Need/priority content is
deferred (see `OPEN_DECISIONS.md` D5, D6). The `DEMAND_COMMITMENT_MODEL.md` now on disk is a
deferred-scope investigation note, not an active document (see `README.md`).

---

## The planning unit and the workspace (D16)

Two ideas that must not be confused:

| | **Team-quarter** | **Engineering-wide workspace** |
|---|---|---|
| What it is | The **planning unit**: one team, one quarter | A **view** across every team in a quarter |
| What it owns | Assignments, the Unplanned Work reserve, the reconciliation identity, feasibility judgments and their reassessment | Nothing. It reads and totals |
| Who answers for it | The team's responsible technical lead | Engineering leadership, reading |
| Capacity | Belongs here, and is spendable only here | Is summed for reporting, never pooled |

The workspace is how people work day to day — Census, Capacity and Allocations are reached
without opening any team — but it introduces no new planning unit, no organizational layer,
and no multi-team WorkPackage. Every edit made from it is applied to a **named team-quarter**,
which the interface states on the form. Team filtering and team-level detail are conveniences,
never prerequisites.

### Two rules for Engineering-wide totals

1. **Aggregate percentages are computed from summed quantities.** The Engineering overhead
   ratio is total overhead ÷ total available capacity; the investment mix is summed
   engineer-weeks ÷ total net delivery capacity. Averaging the teams' percentages is wrong
   and is forbidden: it weighs a three-person team as heavily as a thirty-person one. See
   `DOMAIN_EXAMPLES.md` X10.
2. **Headroom and shortfall are reported separately and never netted.** One team's headroom
   cannot be spent on another team's work — the people are not interchangeable — so a team
   shortfall stays visible even when Engineering's arithmetic residual is positive, and even
   when the view is filtered to another team. See X9.

The residual (headroom − shortfall) may be shown as a bookkeeping figure, clearly labelled as
such. It is never presented as deployable capacity.

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

### Prerequisites for a feasible verdict (D15)

A *feasible* verdict is refused — not stored — unless, at the moment it is recorded:

1. some capacity is assigned to the WorkPackage;
2. the team has net delivery capacity, and the assignment does not exceed it;
3. the team-quarter has no shortfall;
4. where assigned capacity is below the estimate, the **reduced scope** the judgment covers
   is stated.

These are necessary conditions, never sufficient ones: meeting all of them makes work
*judgeable*, not feasible. A *not feasible* verdict is always recordable.

### The team-quarter reassessment rule (D15)

Each team-quarter keeps a **durable, append-only change log** of material changes to its
planning inputs. A judgment records the log position it was made at (and, for the record,
the figures at the time). It needs reassessment — and stops counting as feasible — as soon
as any later entry concerns it, and **stays that way until a fresh technical-lead judgment
is recorded**. The log only grows: reverting a change is itself a change, and a later change
that happens to restore the totals (an equal-capacity replacement for an absent specialist,
say) does not revive a judgment whose assumptions it may have broken.

| Change | Logged as |
|---|---|
| A person added or removed; a schedule change added or removed; an absence added or removed; a holiday added or removed; a person's overhead changed | team-wide change, for each quarter the dates touch |
| The Unplanned Work reserve changed | team-wide change |
| **Any** assignment changed, or assigned work removed — competing assignments included, whether or not totals still fit | team-wide change (the conservative rule) |
| A package's own estimate changed | change scoped to that package |
| Work accepted onto the list without an assignment; a holiday renamed | not logged (no capacity input changed) |
| A save that re-enters the same value (assignment, estimate, reserve, overhead) | not logged — a genuinely unchanged save is a no-op |

"Material" means beyond 0.005 engineer-weeks — smaller than anything a planner can enter,
so float noise never counts and a genuine edit always does. The log is not skill matching
and does not know *why* a change matters; it records that the inputs a lead judged against
have moved, and leaves the judgment to the lead. Reassessment replaces nothing: the new
judgment is appended and the history kept. A judgment recorded before change tracking
existed is treated as needing reassessment.

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

The Engineering-wide workspace presents these in three views — **Census** (people, schedules,
effective dates, absences and overhead across Engineering), **Capacity** (report 1 and 4) and
**Allocations** (reports 2, 3, 5 and 6) — sharing one quarter selection. The same figures are
available for a single team on its team-quarter page.

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

Each report is available both per team-quarter and totalled across Engineering. Every
Engineering total follows the two rules above: summed quantities before any percentage, and
headroom never offsetting another team's shortfall.
