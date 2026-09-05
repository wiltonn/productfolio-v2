# Allocation Semantics

What "an allocation" currently means in this repository. Behaviour, source-authored intent,
and unresolved authority questions are labeled separately using `README.md`.

---

## 0. There are three distinct records called "allocation"

**OBSERVED** — All three are live, all three store a percentage of a person's time, and none
of them is derived from the others.

| | `Allocation` (legacy) | `WorkforceAllocation` | `EmployeeOrgUnitLink` |
|---|---|---|---|
| Schema | `schema.prisma:541-565` | `schema.prisma:1619-1699` | `schema.prisma:1397-1425` |
| Scope | `scenarioId` **NOT NULL** | `planId` | none — employee↔orgNode |
| Grain | date range, clamped to one quarter | one ISO week | date range, open-ended |
| Percentage field | `percentage` (Float, default 100) | `allocationPct` (Float) | `allocationPct` (Float?) |
| Target | `initiativeId` (nullable) only | six target types | `orgNodeId` |
| ≤100% validator | none | none across rows; ≤100 per row | **yes**, `validateAllocationTotal` |
| Materialisation | `AllocationPeriod` at QUARTER grain | none — the week is the row | none |
| Feeds capacity math | `capacity.calculateAvailability`, `scenario-calculator` | `capacity-math`, all workforce roll-ups, `deriveTokenSupply` | its own `consumeCapacity` validator |

**SOURCE-ASSERTED INTENT** — The repository's analysis calls the third a *"true duplicate"*
of the second and states that both must not feed capacity math
(`ANALYSIS_WORKFORCE_CAPACITY.md`). This records the analysis author's recommendation, not an
observed domain rule or V2 decision.

**UNKNOWN** — Which is authoritative when they disagree. Nothing reconciles them, no service
reads more than one, and no test asserts a relationship between them.

Everything below concerns `WorkforceAllocation` unless stated.

---

## 1. Is allocation a percentage of nominal capacity or available capacity?

**OBSERVED** — Of the employee's **own contracted week**, not of a nominal 40-hour week and
not of hours remaining after PTO.

`summarizeWeek(rows, options)` uses `options.capacityPct ?? FULL_ALLOCATION_PCT` where
`FULL_ALLOCATION_PCT = 100` (`capacity-math.ts:64-81`). The doc comment on the option says:
*"The employee's own weekly capacity in percentage points. Defaults to 100. A 0.6 FTE employee
planned as a full 100% of *their* week is fully committed, so this is not simply
hoursPerWeek"*.

**OBSERVED** — **No production caller ever passes `capacityPct`.** A repository-wide search
for the identifier outside `capacity-math.ts`, the mirrored frontend `workforce-capacity.ts`,
and their two test files returns nothing. The grid's TOTAL row calls `summarizeWeek(cells)`
with no second argument (`workforce-grid.service.ts:366-374`).

**INFERRED** — In practice the denominator is always exactly 100, meaning "all of this
person's contracted time". A 20-hour employee at 100% is `AT` capacity, never `OVER`.

**OBSERVED** — PTO does **not** reduce the denominator. It is subtracted from the *numerator
side* as a row: PTO occupies percentage points as a `RESERVED:TIME_OFF` allocation with
`capacityEffect = UNAVAILABLE`, and `unallocated = 100 − (allocated + reserved)`
(`capacity-math.ts:6-19`).

**UNKNOWN** — Whether the unused `capacityPct` seam was meant for a reduced-capacity case
(partial leave, ramp, phased return) that the model has not yet decided how to express.

---

## 2. Is 100% always one FTE?

**OBSERVED** — **No.** Two separate conversions exist and they disagree by design.

- Over/under-allocation: 100% of the employee's own week = "at capacity", regardless of hours.
- FTE: `toFte(pct, hoursPerWeek, 40) = (pct/100) * (hoursPerWeek/40)`
  (`capacity-math.ts:130-137`). 100% of a 20-hour employee is **0.5 FTE**.

**OBSERVED** — Comment: *"FTE is relative to a nominal full-time week, not to the employee's
own hours, which is what makes team totals addable: 100% of a 20-hour part-timer is 0.5 FTE,
so 'Platform: 6.2 FTE' means 6.2 full-time weeks of capacity regardless of how many people it
came from"*.

**OBSERVED** — Tests pin both: *"converts a full week of a full-timer to one FTE"* and
*"converts a full week of a half-timer to half an FTE"* (`workforce-capacity-math.test.ts:146-151`).

**OBSERVED** — `DEFAULT_FULL_TIME_HOURS = 40` is a module constant, not configuration. There
is a test for a non-40-hour full-time week, but no caller supplies one.

---

## 3. Can employee capacity itself be less than 100%?

**OBSERVED** — Only through `hoursPerWeek`, and only for FTE purposes. `hoursPerWeek` is a
Float with no bounds and no history.

**OBSERVED** — There is no per-employee, per-period capacity multiplier in the workforce path.
`CapacityCalendar` exists but the workforce services never read it.

**UNKNOWN** — How to express "this person is at 60% capacity for six weeks". Two mechanisms
could express it (a `RESERVED` row, or the unused `capacityPct`) and the repository picks
neither.

---

## 4. Can allocations overlap?

**OBSERVED** — Rows for the same employee and week **coexist by design** — that is the
central data shape. The uniqueness constraint is
`@@unique([planId, employeeId, weekPeriodId, targetKey])`, so a person may hold any number of
rows in a week provided each names a distinct target.

**OBSERVED** — Two rows *cannot* name the same target in the same week. `targetKey` exists
precisely to enforce that, because a unique index over the nullable FK set would not:
*"Postgres treats NULLs as distinct, so a unique index over (planId, employeeId,
weekPeriodId, orgNodeId, initiativeId, workCategory) would happily accept two identical
'Pricing Platform 30%' rows"* (`target-key.ts:14-19`).

**OBSERVED** — `PRODUCT:<uuid>` and `PRODUCT:<uuid>|SUPPORT` are **different keys**, so the
same product may appear twice for one person in one week if narrowed by different categories.

---

## 5. What happens above 100%?

**OBSERVED** — It is **stored, computed and displayed. Never rejected.**

- Per-row: `allocationPct` is validated `[0, 100]` with the message
  *"A single allocation cannot exceed 100% — over-allocation is several rows summing past it"*
  (`workforce.schema.ts:121-124`).
- Across rows: no validation at all. `summarizeWeek` returns
  `overAllocatedPct = max(0, committed − capacity)` and `state = 'OVER'`.
- Service comment: *"Over-allocation is never rejected. A manager has to be able to see 120%
  in order to fix it, and refusing the write only pushes the plan into a spreadsheet where
  nothing can analyse it"* (`workforce-allocation.service.ts:33-36`).

**OBSERVED** — Over-allocation is reported at three levels: the week (`state = 'OVER'`), the
horizon (`overAllocatedWeeks` count), and the grid (`overAllocatedCount` of employees).

**OBSERVED** — Contrast: `EmployeeOrgUnitLink` **does** hard-reject past 100%, throwing
`ValidationError` with *"Maximum is 100%"* (`employee-org-link.service.ts:553-561`). Two
opposite policies on the same underlying question, in the same codebase.

---

## 6. Is under-allocation meaningful? Does "unallocated" mean available?

**OBSERVED** — Under-allocation is a first-class state: `CapacityState ∈ {EMPTY, UNDER, AT,
OVER}` (`capacity-math.ts:41`). `EMPTY` is distinguished from `UNDER` — zero rows, or a
committed total within epsilon of zero.

**OBSERVED** — **"Unallocated" explicitly does NOT mean "available".** This is the module's
stated load-bearing rule:

> *"The load-bearing rule is that unallocated is NOT the same as available … An employee at
> 60% project work and 40% PTO is fully committed with zero deployable capacity left, which a
> naive '100 - allocated' would report as 40% of headroom that does not exist."*
> (`capacity-math.ts:10-19`)

**OBSERVED** — The vocabulary is three-tier and consistently applied:
`allocated` (DEPLOYABLE only) → `committed` (allocated + reserved) → `unallocated`
(`100 − committed`, floored at 0).

**OBSERVED** — PRD §11 states the requirement in the same words: *"Do NOT assume: Unallocated
= Available"*.

---

## 7. How are PTO, leave, management, support and overhead handled?

**OBSERVED** — As **ordinary allocation rows** with a non-deployable `capacityEffect`. There
is no separate PTO table in the workforce path.

| Kind | How represented | `capacityEffect` |
|---|---|---|
| PTO / leave | `RESERVED:TIME_OFF` row | `UNAVAILABLE` |
| Management | `RESERVED:MANAGEMENT` row | `OVERHEAD` |
| Administration / operations overhead | `RESERVED:<category>` row | `OVERHEAD` |
| Support | `CATEGORY:SUPPORT`, or `PRODUCT:<id>\|SUPPORT` | **`DEPLOYABLE`** |
| Maintenance, tech debt, compliance | a category on any target | `DEPLOYABLE` |

**OBSERVED** — The assignment rule (`target-key.ts:defaultCapacityEffect`): everything is
`DEPLOYABLE` except `RESERVED` targets; within `RESERVED`, `TIME_OFF → UNAVAILABLE` and
everything else → `OVERHEAD`. The stated reason: *"TIME_OFF is capacity the organisation does
not have, whereas management and operations overhead is capacity it has but has already
spent. Everything else — including a SUPPORT category, which is real work — is deployable."*

**OBSERVED** — `capacityEffect` may be **overridden per row** by the caller
(`AllocationWriteInput.capacityEffect`). The default is only a default.

**OBSERVED** — `OVERHEAD` and `UNAVAILABLE` are summed identically in every calculation. No
code branches on the difference.

**OBSERVED** — The legacy path handles PTO completely differently: as
`CapacityCalendar.hoursAvailable`, subtracted from base hours
(`capacity.service.ts:198-200`). The two mechanisms do not interoperate.

---

## 8. What can an allocation target?

**OBSERVED** — Exactly six types, and the CHECK constraint enforces exactly one structural
target per row.

| Requested target | Supported? | How |
|---|---|---|
| Product Portfolio | **No such concept** | — |
| Product Workstream | **No such concept** | — |
| Product Area | **Ambiguous** | `PortfolioArea` (flat table) is not targetable; `OrgNode.isPortfolioArea` nodes are targetable only as `PRODUCT` |
| Product | **Yes, indirectly** | `PRODUCT` → `orgNodeId`, where the node's type ∈ `{PRODUCT, PLATFORM, TEAM, DIVISION, DEPARTMENT}` |
| Team | **Yes** — via the same `PRODUCT` target type | `OrgNodeType.TEAM` is in the accepted list |
| Initiative | **Yes** | `INITIATIVE` → `initiativeId` |
| Project | **Yes** | `PROJECT` → `projectId` |
| Work Item | **Yes** | `WORK_ITEM` → `workItemId` |
| Sustain bucket | **No such concept** | nearest are `CATEGORY:MAINTENANCE` / `SUPPORT` / `TECH_DEBT` |
| "Other" | **Yes** | `CATEGORY:OTHER` |
| Reserved / non-work | **Yes** | `RESERVED:<category>` |

**OBSERVED** — There is **no separate TEAM target type**. A team allocation is a `PRODUCT`
allocation whose org node happens to be a `TEAM`. The picker label is *"Product or team"* and
the option group is *"Products and teams"* (`AddAllocationDialog.tsx`).

**OBSERVED** — `DIVISION` and `DEPARTMENT` are also accepted as `PRODUCT` targets.

---

## 9. Can one allocation reference multiple concepts?

**OBSERVED** — **No, structurally.** The CHECK constraint requires exactly one non-null
structural FK per row, and explicitly nulls the others:

```sql
("target_type" = 'INITIATIVE'
   AND "initiative_id" IS NOT NULL
   AND "org_node_id" IS NULL AND "project_id" IS NULL AND "work_item_id" IS NULL)
```

**OBSERVED** — There is **one secondary axis**: a `PRODUCT`, `INITIATIVE` or `PROJECT` target
may carry an optional `workCategory`, producing e.g. `"Pricing Platform / Support"`. That is
the only way one row expresses two things.

**OBSERVED** — Multiple concepts are recovered **by attribution, not by the row**. A
`WORK_ITEM` row reaches both an initiative and an org node by walking the item's parents
(`attributionOf`). The row itself names only the item.

**OBSERVED** — This is why *"which products contribute people to Initiative X"* cannot be
answered from the allocation rows: an `INITIATIVE` row is *required* to have
`org_node_id IS NULL`. It is answered from the contributors' `OrgMembership` instead, and the
implementation plan records this as a **correction to the original analysis**, which had
claimed a `GROUP BY orgNodeId` would work.

---

## 10. Are date ranges converted to weeks? How are partial weeks handled?

**OBSERVED** — The workforce path has **no date ranges at all**. A row *is* a week. The API
accepts a `from` date and either a `to` date or a `weeks` count, and the service resolves
those to whole `Period` rows of `type = WEEK`.

**OBSERVED** — There are **no partial weeks**. A date lands in whatever ISO week contains it,
and the whole week is written. `findWeekContaining(date)` finds the `WEEK` period where
`startDate <= date <= endDate`.

**OBSERVED** — Quarter membership is resolved by a single stated rule:
*"A week belongs to the period its **Monday** falls in. An ISO week straddling a quarter
boundary therefore lands wholly on one side, which is what stops two weeks of the same
employee being counted in two quarters"* (`workforce-plan.service.ts:270-277`). The comment
adds that this is deliberately the *single* definition, shared by branching, promotion and
the capacity supply provider.

**OBSERVED** — Weeks are **seeded on demand**. If a horizon runs past the seeded range the
service calls `periodService.seedPeriods` forward; resolving a week seeds `year-1 .. year+1`
*"because an ISO week can belong to the neighbouring calendar year"*.

**OBSERVED** — The **legacy** path does convert ranges, and at a coarser grain:
`computeAllocationPeriods` maps a date range to `PeriodType.QUARTER` rows and computes
`hoursInPeriod = hoursPerWeek * 13 * overlapRatio * (percentage/100)`
(`allocation.service.ts:1407-1415`). Partial quarters are handled by `overlapRatio`, a
0.0–1.0 float the schema comments describe as *"for debugging"*.

---

## 11. How are future allocations distinguished from current/actual?

**OBSERVED** — **Only by `WorkforceAllocStatus`**, and only if someone sets it.

- The enum is `ACTUAL | COMMITTED | PLANNED | PROPOSED`, defaulting to `PLANNED`.
- **Nothing derives status from the calendar.** A row for last week and a row for next
  quarter both default to `PLANNED`.
- **Nothing transitions status automatically.** Census-inferred rows are written as
  `PROPOSED` and the design says *"a manager confirms by promoting the status"* — no code
  performs that promotion.
- **No calculation reads status.** Every capacity computation, roll-up and supply derivation
  filters on `capacityEffect`. A `PROPOSED` row counts toward committed capacity exactly like
  a `COMMITTED` one.

**OBSERVED** — `ACTUAL` is never written by any code path. The analysis says drift detection
*"is what earns PRD §9's `ACTUAL` status its place. **Not v1**"*.

**INFERRED** — The past/future distinction is currently carried entirely by `weekStart`
relative to today, computed nowhere and stored nowhere.

**UNKNOWN** — Whether `ACTUAL` is meant to mean "observed from a time-tracking system",
"the week has elapsed", or "a manager confirmed it".

---

## 12. What is authoritative when records conflict?

**OBSERVED** — Four separate authority mechanisms, each answering a different question, none
answering the general one.

1. **Which plan speaks for a scenario** — `resolvePlanForScenario`: the scenario's own ACTIVE
   overlay if it has one, otherwise the ACTIVE baseline, otherwise nothing
   (`capacity-supply.ts`). Returning *nothing* is deliberate: *"Zero capacity is the honest
   answer — better than silently falling back to the legacy numbers, which would hide that the
   source is unusable."*

2. **Which capacity source a scenario uses** — `Scenario.capacitySource`
   (`LEGACY | WORKFORCE_PLAN`), explicit and never inferred.
   `docs/ADR_SCENARIO_CAPACITY_SOURCE.md` records the decision: *"Row existence infers
   nothing — creating or deleting a `WorkforcePlan` never changes a scenario's capacity
   authority."*

3. **Manual vs derived token supply** — `TokenSupply.source`. `MANUAL` is never overwritten,
   and `upsert` stamps `MANUAL` on **update** as well as create: *"A human touching a row is
   exactly what makes it manual."*

4. **Server vs client capacity math** — the frontend mirrors `capacity-math.ts` in
   `workforce-capacity.ts` so the TOTAL row updates without a round trip. The comment states:
   *"The server remains authoritative. These values are replaced by the server's on the next
   successful fetch; if the two ever disagree, the server wins."*

**UNKNOWN** — There is no authority rule for the case that matters most for a redesign:
`Allocation` says Sarah is 50% on Initiative X in Q4 and `WorkforceAllocation` says 30%.
Nothing reads both, nothing compares them, and no test covers it. As of `d2f6024` the
`/initiative-reconciliation` endpoint reports a *different* disagreement — plan-staffed vs
scenario-ranked initiatives — but not this one.

---

## 13. Additional observed rules

**OBSERVED** — `0` is not a stored value. *"0 removes the allocation: an allocation of 0% is
the absence of one"* (`workforce-allocation.service.ts:56`). Setting a range to 0 is how the
UI removes a row.

**OBSERVED** — Bulk range edits are capped at `MAX_RANGE_WEEKS = 104` and return
`{ weeks, created, updated, deleted, unchanged }` — unchanged weeks are left alone rather than
rewritten.

**OBSERVED** — Adding a row from the dialog fills **the whole visible horizon** at the chosen
percentage: *"A new row is filled across the whole visible horizon; the manager then trims it
in the grid, which is far less work than filling it week by week"*
(`WorkforcePlanner.tsx`).

**OBSERVED** — Workforce writes deliberately skip the machinery legacy writes run.
*"Allocation.create runs approval enforcement, ramp modifier computation, cache invalidation
and three job enqueues. A grid that edits 26 cells in one gesture cannot pay that, and the PRD
explicitly defers approval workflow, so nothing of the sort happens here"*
(`workforce-allocation.service.ts:22-31`).

**OBSERVED** — Float tolerance is explicit: `EPSILON = 1e-6`, outputs rounded to 6 decimals,
*"so 'exactly 100%' means what a manager means by it"*. There is a test that three equal
thirds read as exactly at capacity.

**OBSERVED** — Horizon aggregation **averages, never sums**: *"'Sarah is 80% allocated across
the quarter' is the number a manager means — a sum over 13 weeks would read 1040%"*.

**OBSERVED** — FTE roll-ups divide by the window length so the number *"reads as an average
headcount rather than a sum over weeks"* (`workforce-aggregation.service.ts`).
