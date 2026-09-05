# Workforce Capacity Model

How Engineering capacity is measured. This document is the authoritative home of the
capacity arithmetic; other documents reference it and do not restate it.

Status: **active** for the first-release scope (revised 2026-09-05).

---

## Capacity is time

Capacity measures **working time, not productivity**. It is never discounted by proficiency,
ramp-up or estimating buffers — those describe how much gets done in the time, which is an
estimation question, not a capacity question. Capacity and predicted output must never be
conflated.

## The unit and the period

- The atomic quantity is the **engineer-week**: one week of one person's full contracted
  working schedule. A half-time person contributes 0.5 engineer-weeks per week.
- The planning period is the **quarter**. Team capacity is stated per team per quarter.
- The planning unit is the **team-quarter**. Individual-level detail exists in the model
  only where this document says it does (constrained specialists) — a quarterly plan must
  not require employee-by-week assignments.

## The capacity chain

Four quantities, each derived from the one before:

| Quantity | Definition |
|---|---|
| **Contracted capacity** | Working time per the person's working schedule and effective dates |
| **Available workforce capacity** | Contracted capacity − known absences |
| **Net delivery capacity** | Available workforce capacity − overhead |
| *(assignment happens here)* | See `QUARTERLY_PLANNING_MODEL.md` for the reconciliation of net delivery capacity |

### Contracted capacity

Contracted capacity reflects each person's **working schedule** and **effective dates**:

- part-time arrangements count at their contracted fraction;
- a person joining during the quarter contributes only from their start date;
- a person leaving during the quarter contributes only until their end date;
- schedule changes mid-quarter apply from their effective date.

A team's contracted capacity for a quarter is the sum over its members of the engineer-weeks
their schedules yield during the weeks their team membership is in force.

### Known absences

A **known absence** is working time the organization knows it will not have: planned leave,
parental leave, public holidays, training commitments and similar. Absences are recorded at
the fraction of the person's schedule they remove (a part-timer's week of leave removes a
part-time week).

**Available workforce capacity = contracted capacity − known absences.**

### Overhead

**Overhead** is management and administration: accounted-for work that keeps the team
running but does not deliver on the work list. It is real, expected work — not waste and not
absence — and it is **reported separately**.

- **Net delivery capacity = available workforce capacity − overhead.**
- **Overhead ratio = overhead ÷ available workforce capacity.** (State this denominator
  whenever the ratio is reported.)
- Overhead must **not** be distributed across the delivery investment categories. Doing so
  would overstate delivery capacity and corrupt the investment mix.

Overhead is typically stated per person per quarter (for example, a lead who spends 40% of
their time managing carries 0.4 × their weeks as overhead) and summed to the team.

## Team-quarter capacity

Everything above rolls up to one statement per team per quarter:

```
contracted → (− known absences) → available → (− overhead) → net delivery capacity
```

Net delivery capacity is the number the quarterly plan reconciles against; the
reconciliation identity and its terms (assigned capacity, Unplanned Work reserve, unassigned
headroom, shortfall) are defined in `QUARTERLY_PLANNING_MODEL.md`.

## Constrained specialists

Where a team contains a **constrained specialist** — a person whose particular expertise is
required by specific work and cannot be substituted from the rest of the team — the plan may
track that person's own net capacity and the demands on it individually.

This is the deliberate, selective exception to team-level planning. It exists because
aggregate team fit is necessary but insufficient: a plan whose team totals fit can still be
infeasible because one specialist is overloaded (see `DOMAIN_EXAMPLES.md` X4). It is not a
license for general individual scheduling.

---

## Not carried into the first release

- **Weekly percentage allocation per employee** — the earlier planning grain. Deferred; see
  `OPEN_DECISIONS.md` D7.
- **FTE conversions, Membership/Affiliation machinery, capability-shaped supply** — deferred
  with the enterprise scope; see `OPEN_DECISIONS.md` D6.
