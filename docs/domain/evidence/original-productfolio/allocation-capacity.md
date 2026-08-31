# Original ProductFolio (V1) — Allocation Targets and Capacity Semantics

Resolves research ticket **#4**. Targeted extraction only: what an allocation could point at, what
its percentage meant, how over-allocation was treated, and whether organizational membership
consumed capacity.

V1 is **archaeological evidence, not authority** (CLAUDE.md §2). Nothing here is a V2
recommendation. Evidence labels per §28: **OBSERVED** / **INFERRED** / **UNKNOWN**.

---

## 0. Surveyed source

| Field | Value |
|---|---|
| Repository | `wiltonn/productfolio` |
| Primary surveyed commit | **`e62c2d761f021c0063f029c3a3f96900374cf807`** (`main`, 2026-02-21) |
| Secondary surveyed commit | `07368d6ef19b23a8b6863b5bffab32fadfee76c9` (`v1/solver`, 2026-03-24) |
| Solver branches read via `git show` | `feat/L3-constraint-validator` `1eee5e4886e292d727f03644a2c02e35f1203edd`; `feat/L4-governance-decision` `4f4c751` |
| Working copies | `productfolio-workspace/productfolio-v1/productfolio` (`main`), `~/dev/projects/productfolio` (`v1/solver`) |
| Working-tree state | Both clean (`git status --porcelain` empty) |
| Survey date | 2026-08-30 |

**OBSERVED** — `prisma/schema.prisma` is byte-identical across `main`, `v1/solver`,
`feat/L1..L4` (1386 lines, verified by `git show <branch>:… | md5sum`). The four service files
cited below are byte-identical between `main` and `v1/solver`. **All file:line citations in this
document are pinned to `main` @ `e62c2d7`** and hold on `v1/solver` too, except §6 (solver-branch
engine files, which do not exist on `main`).

Repo-relative prefix for all citations: `productFolio/packages/`.

**OBSERVED — reproducibility contrast.** `docs/domain/evidence/workforce-planner/SOURCE_MANIFEST.md` records that
the newer workforce-planner package is **non-reproducible**: it claims branch
`feat/workforce-capacity-planning` @ `3cd0dbd`, which no local clone can resolve and which the
GitHub repo does not expose. This V1 package *is* reproducible against a pinned full SHA.

**OBSERVED** — No branch in this repository contains `model WorkforceAllocation` or
`model WorkforcePlan` (`git show <branch>:…/schema.prisma | grep -c '^model Workforce'` returns
`0` on `main`, `v1/solver`, `feat/L3-constraint-validator`, `feat/L4-governance-decision`).

---

## 1. Headline answers

### (a) Did organizational membership itself hold a claim on a person's time?

**It was declared, budgeted and validated — and then never spent.**

**OBSERVED** — V1 has two membership models, and only the newer one carries a percentage.

- `OrgMembership` (`backend/prisma/schema.prisma:959-980`) has fields
  `employeeId`, `orgNodeId`, `effectiveStart`, `effectiveEnd` — **no percentage, FTE, weight or
  capacity field of any kind.** Membership is a set, not a claim.
- `EmployeeOrgUnitLink` (`backend/prisma/schema.prisma:1362-1385`), added by migration
  `20260208100000_add_matrix_org_model`, is the matrix-org model and carries **both** columns:

  ```prisma
  relationshipType EmployeeOrgRelationshipType  @map("relationship_type")
  allocationPct    Float?                       @map("allocation_pct")
  consumeCapacity  Boolean                      @default(false) @map("consume_capacity")
  ```

**OBSERVED** — V1 answered the ticket's question *explicitly in the schema*, and answered it
**"not by default"**: `consumeCapacity` defaults to `false`, and the question is settled
**per relationship type**, not per organization
(`backend/src/services/employee-org-link.service.ts:16-30`):

```ts
const DEFAULT_CONSUME_CAPACITY: Record<EmployeeOrgRelationshipType, boolean> = {
  PRIMARY_REPORTING: false,
  DELIVERY_ASSIGNMENT: true,
  FUNCTIONAL_ALIGNMENT: false,
  CAPABILITY_POOL: false,
  TEMPORARY_ROTATION: true,
};

/** Relationship types that NEVER consume capacity (hard rule) */
const NEVER_CONSUMES = new Set<EmployeeOrgRelationshipType>([
  'PRIMARY_REPORTING', 'FUNCTIONAL_ALIGNMENT', 'CAPABILITY_POOL',
]);
```

**INFERRED** — This is a deliberate domain distinction, not an accident: *reporting into* a unit
(`PRIMARY_REPORTING`), *being aligned to* one (`FUNCTIONAL_ALIGNMENT`) and *being drawable from*
one (`CAPABILITY_POOL`) are declared incapable of consuming time; only *being assigned to deliver*
(`DELIVERY_ASSIGNMENT`) or *being rotated into* (`TEMPORARY_ROTATION`) a unit does. `NEVER_CONSUMES`
is enforced, not advisory: create forces `consumeCapacity = false` for those types
(`employee-org-link.service.ts:53-58`) and update rejects the flag outright —
`` `Cannot set consumeCapacity=true for ${link.relationshipType} links` `` (`:138-149`).

**OBSERVED** — The claim is budgeted against a ceiling of 100%
(`employee-org-link.service.ts:528-566`), summing only active capacity-consuming links:

```ts
const projectedTotal = currentTotal + newPct;
if (projectedTotal > 100) {
  throw new ValidationError(
    `Total capacity-consuming allocation would be ${projectedTotal}% (current: ${currentTotal}% + new: ${newPct}%). Maximum is 100%.`, …);
}
```

Called on create (`:77-83`) and update (`:155-163`). It is a **must-not-exceed** rule, never a
must-total rule: an employee with zero capacity-consuming links is legal.

**OBSERVED — and this is the crux.** **No capacity, availability, supply, gap, forecast, baseline,
drift, budget or token computation in V1 reads `allocationPct` or `consumeCapacity`.** Exhaustive
grep across `backend/` and `frontend/` (excluding `node_modules`) finds them only in: the schema and
its migration; `employee-org-link.service.ts`; `schemas/employee-org-link.schema.ts`; the
service's own test file; and three frontend display sites
(`frontend/src/pages/EmployeeOrgRelationships.tsx`, `src/hooks/useEmployeeOrgLinks.ts`,
`src/types/index.ts:173-174`). `scenario-calculator.service.ts`, `capacity.service.ts`,
`allocation.service.ts`, `baseline.service.ts`, `delta-engine.service.ts`, `forecast.service.ts`,
`token-*.service.ts` and `planning/*` contain **zero** references to either field.

**OBSERVED** — The only surfacing is a progress bar
(`frontend/src/pages/EmployeeOrgRelationships.tsx:69-115`, `CapacitySummaryBar`): it sums
`link.allocationPct` and colours it `success ≤80` / `warning ≤100` / `danger >100`. Display only.

**OBSERVED** — Where membership *does* affect capacity numbers, it acts as a **filter, never as a
subtraction**. `scenario-calculator.service.ts:86-93` scopes an org node's capacity by narrowing the
allocation set to employees in the subtree:

```ts
const employeeIds = await getEmployeesInSubtree(orgNodeId);
scenario.allocations = scenario.allocations.filter((a) => employeeIdSet.has(a.employeeId));
```

So "the capacity of an org node" in V1 is *the capacity implied by its members' allocations to
initiatives* — not the sum of its members' contracted hours.

**OBSERVED** — Rollup attribution (`backend/src/services/rollup.service.ts:274-300`) splits
allocation **hours** across memberships by *temporal overlap ratio*, never by `allocationPct`; and
when the matrix-org flag is on it filters to `relationshipType === 'PRIMARY_REPORTING'` — the type
explicitly declared **non**-capacity-consuming. Cost and hours attribution therefore rides on the
relationship V1 said does not consume time.

**OBSERVED** — Migration of legacy memberships to links stamps them
`relationshipType: 'PRIMARY_REPORTING', consumeCapacity: false`
(`employee-org-link.service.ts:500-512`). Every pre-existing membership became a non-consuming link.

**OBSERVED** — The two budgets never meet. `validateAllocationTotal` sums only
`EmployeeOrgUnitLink.allocationPct` and never reads `Allocation.percentage`; `AllocationService`
never reads the links. An employee can legally be 100% org-committed *and* 130% initiative-allocated
simultaneously with no cross-check anywhere.

**Answer.** In V1, **only work consumed capacity in any arithmetic that produced a number.**
Organizational membership held a *declared, validated, hard-enforced* claim that was structurally
disconnected from every capacity calculation — an orphaned constraint layer. The concept exists;
the consumption does not.

**UNKNOWN** — Whether `EmployeeOrgUnitLink.allocationPct` was intended to eventually *replace*
`Allocation.percentage` as the supply-side statement, or to sit alongside it. No ADR, comment, test
or reconciliation addresses it.

---

### (b) Nominal vs contracted vs available vs deployable

**OBSERVED** — V1 has **no vocabulary** for this. `grep -r "nominalCapacity\|deployable"` over the
whole backend returns **zero occurrences**. The distinctions exist only as arithmetic, under four
different names, and the code paths disagree about them.

| Concept | V1's carrier | Citation |
|---|---|---|
| **Contracted** week | `Employee.hoursPerWeek Float @default(40)` | `schema.prisma:391-397` |
| **Nominal** full-time week | the literal `40` as a Zod default, and `DEFAULT_HOURS_PER_PERIOD = 520 // 40 * 13` | `schemas/resources.schema.ts:15`; `scenario-calculator.service.ts:26` |
| **Leave** | `CapacityCalendar.hoursAvailable` — read as PTO in 3 places, as base hours in 1, written as full capacity by the seed | `schema.prisma:462-474`; see §4 |
| **Available** | `availableHours = max(0, baseHours − allocatedHours − ptoHours)` | `capacity.service.ts:200` |
| **Deployable / effective** | `effectiveHours = allocatedHours × proficiency × buffer × ramp` | `scenario-calculator.service.ts:436-437` |

**OBSERVED — the percentage's denominator is the employee's own contracted week.** The single
write path that turns a percentage into hours (`allocation.service.ts:1407-1418`):

```ts
// Default hours per quarter: hoursPerWeek * 13
const hoursPerQuarter = allocation.employee.hoursPerWeek * 13;
…
hoursInPeriod: hoursPerQuarter * po.overlapRatio * (allocation.percentage / 100),
```

Not a nominal 40-hour week (a 20-hour employee at 100% yields 260h, not 520h), and **not** hours
remaining after leave — `hoursAvailable` is not consulted here at all.

**OBSERVED — but over-allocation's denominator is the bare literal `100`.**
`scenario-calculator.service.ts:716` tests `if (data.totalPercentage > 100)` against no
person-specific quantity whatsoever. A 20-hour employee at 100% is therefore *at* capacity, never
over — exactly the behaviour the newer implementation's `I1` records.

**OBSERVED — a third denominator on the read path.**
`scenario-calculator.getBaseHoursForPeriod` (`:885-900`) prefers the calendar entry over contracted
hours:

```ts
if (entry) return entry.hoursAvailable;
// Fall back to calculated hours: hoursPerWeek * 13 weeks (quarter default)
return hoursPerWeek * 13 || defaultHoursPerPeriod;
```

So the *same* stored `percentage` is worth `hoursPerWeek × 13 × pct` when written and
`hoursAvailable × pct` when read back. **The write path and the read path do not agree on what the
percentage is a percentage of.**

**OBSERVED — deployable ≠ planned, and the discount lives on the work, not the person.**
`effectiveHours` (`scenario-calculator.service.ts:429-437`) applies three multipliers to planned
hours:

```ts
const proficiencyMultiplier = proficiencyWeightEnabled ? skill.proficiency / 5 : 1;
const bufferMultiplier = 1 - bufferPercentage / 100;
const allocatedHours = baseHours * (effectiveAllocationPercentage / 100);
const effectiveHours = allocatedHours * proficiencyMultiplier * bufferMultiplier * rampModifier;
```

- `proficiencyMultiplier` — a 1-5 `Skill.proficiency` divided by 5, i.e. a level-3 engineer is
  worth 0.6 of an hour. Default **on** (`:324`).
- `bufferMultiplier` — a scenario-level reserve, default 0 (`:323`).
- `rampModifier` — a 0..1 productivity discount stored per `(allocation, period)`
  (`schema.prisma:552`), computed from `EmployeeDomainFamiliarity.familiarityLevel` against
  `Initiative.domainComplexity` (`services/ramp.service.ts:10-80`). Default **off** (`:327`).

**INFERRED** — This is V1's real nominal→deployable distinction, and it is a property of the
*pairing* of a person with a piece of work (how familiar are they with this domain, how skilled are
they at this skill), not a property of the person. It is never written back to
`AllocationPeriod.hoursInPeriod` — planned hours stay undiscounted.

**OBSERVED** — There is **no leave model at all** beyond `CapacityCalendar`. Grep for
`holiday|vacation|nonWorking|timeOff|absence` over the backend returns nothing. `overlapRatio` is
computed from raw calendar days with no working-day or holiday exclusion
(`services/period.service.ts:221-227`).

**OBSERVED** — The frontend's supply-side number is bare contracted hours with a nominal fallback
and no leave deduction at all
(`frontend/src/pages/ScenarioPlanner.tsx:186`, `:231`):
`totalWeeklyCapacity = employees.reduce((sum, e) => sum + (e.hoursPerWeek || 40), 0)`. The same file
receives that field as `defaultCapacityHours` (`:1290`), a third name for `hoursPerWeek`
(`services/resources.service.ts:91`).

**Answer.** V1 drew **contracted vs available vs deployable** in arithmetic and **nowhere in
vocabulary**, and it drew them inconsistently: the percentage means *a share of contracted hours*
when written, *a share of the capacity-calendar figure* when read, and *a share of an abstract 100*
when checked for over-allocation. "Deployable" exists only as `effectiveHours`, discounted by
proficiency, buffer and ramp, and is never persisted.

---

## 2. What could an allocation point at?

**OBSERVED** — Exactly one thing, optionally: an **Initiative**
(`backend/prisma/schema.prisma:522-547`).

```prisma
model Allocation {
  scenarioId     String         @db.Uuid
  employeeId     String         @db.Uuid
  initiativeId   String?        @db.Uuid // Nullable for unallocated capacity
  allocationType AllocationType @default(PROJECT) @map("allocation_type")
  startDate      DateTime       @db.Date
  endDate        DateTime       @db.Date
  percentage     Float          @default(100) // Allocation percentage (0-100)
}
```

There is **no** org-node, product, project, work-item, category or reserved target. No team target.
No polymorphic target discriminator. The `// Nullable for unallocated capacity` comment on
`initiativeId` is the only allocation-semantics comment in the schema.

**OBSERVED** — A null `initiativeId` does **not** mean spare headroom. `budget-report.service.ts:97-107`
files such rows under `unallocatedEmployees` **with their hours and cost intact**, and
`:136` adds `unallocatedTotalHours` into `totalAllocatedHours`. A null-initiative allocation is
*capacity committed but unattributed*, not capacity available.

**OBSERVED** — The only other axis on the row is `AllocationType ∈ {PROJECT, RUN, SUPPORT}`
(`schema.prisma:58-62`). It is a real behavioural distinction exactly once: quarter-to-quarter
scenario cloning splits on it (`services/scenarios.service.ts:411-418`):

```ts
if (alloc.allocationType === AllocationType.PROJECT) return data.includeProjectAllocations;
// RUN and SUPPORT are included if includeRunSupportAllocations is true
return data.includeRunSupportAllocations;
```

**INFERRED** — `AllocationType` is V1's coarse investment-classification axis, carried **on the
allocation row** rather than on the work. Combined with a null `initiativeId`, `RUN` and `SUPPORT`
are how V1 expressed "this person is on sustain" without inventing a fake Initiative — relevant to
CLAUDE.md §11's unresolved question about where classification belongs. Its only *behaviour* is
"does this recur next quarter?", which is a weaker distinction than a reporting rollup would need.

**OBSERVED** — Every allocation is **scenario-scoped** (`scenarioId` NOT NULL) and **quarter-clamped**:
`assertDatesWithinQuarter` throws `'Allocation dates (…) must fall within the scenario's quarter …'`
(`allocation.service.ts:121-144`). There is no plan-of-record allocation outside a scenario. V1 had
no `WorkforcePlan`; **all** workforce planning in V1 happened inside a Scenario — the practice
CLAUDE.md §19 explicitly rejects for V2.

**OBSERVED** — The atomic materialised period is the **QUARTER**, not the week.
`computeAllocationPeriods` maps the date range to `PeriodType.QUARTER` only
(`allocation.service.ts:1389-1393`). `Period` supports `WEEK | MONTH | QUARTER`
(`schema.prisma:45-49`) but nothing writes `AllocationPeriod` at week grain.

**OBSERVED — consequence, a live defect.** `capacity.service.calculateAvailability` resolves
**`PeriodType.WEEK`** periods (`capacity.service.ts:151-155`) and then looks for
`allocation.allocationPeriods.find(a => a.periodId === period.id)` (`:191`). A WEEK period id can
never match a QUARTER-grain `AllocationPeriod` row, so **`allocatedHours` is always 0** and
`GET /api/employees/:id/availability` reports `hoursPerWeek − 0 − ptoHours`. The one endpoint in V1
that answered "how much of this week is left?" never subtracted work.

---

## 3. How was over-allocation treated?

**Prevented, warned, silently clamped, silently masked, and reported — in seven different places,
by six different rules.** This is not a summary flourish; each is a distinct live code path.

| # | Site | Policy | Citation |
|---|---|---|---|
| 1 | Zod schema, single row | **Rejected** — `min(0).max(100)` | `backend/src/schemas/scenarios.schema.ts:68,84` |
| 2 | `AllocationService.create` / `update`, across rows | **No check at all** | `allocation.service.ts:576-660`, `:687-745` |
| 3 | `identifyOverallocations` | **Reported** — `> 100` becomes an `issues.overallocations` entry | `scenario-calculator.service.ts:712-728` |
| 4 | `calculateCapacity` | **Silently clamped** — `Math.min(total, allocationCapPercentage)`, default 100 | `scenario-calculator.service.ts:404-408`, default at `:322` |
| 5 | `calculateAvailability` | **Silently masked** — `allocatedHours: Math.min(allocatedHours, baseHours)` | `capacity.service.ts:206-207` |
| 6 | `autoAllocate` | **Prevented by construction** — per-employee budget `maxPct ?? 100`, decremented as it allocates | `allocation.service.ts:1059`, `:1114-1120`, `:1232-1234` |
| 7 | `EmployeeOrgUnitLink` | **Hard-rejected** — `throw new ValidationError(… Maximum is 100%.)` | `employee-org-link.service.ts:553-561` |

**OBSERVED** — #3 is the only genuine detector and it is purely advisory: it returns data, never
throws, and its output reaches a job log line
(`jobs/processors/scenario-recompute.processor.ts:58`) and a UI list
(`frontend/src/pages/OrgCapacity.tsx:181-197, 351`) and nothing else. The write path never consults
it. It is scenario-scoped (`where: { scenarioId }`, `:646-647`), so a person over-allocated *across*
two scenarios is invisible to it.

**OBSERVED** — It weights by `overlapRatio` before comparing
(`:700-701`, `effectivePercentage = allocation.percentage * ap.overlapRatio`), so a 100% allocation
covering half a quarter reads as 50% and does not trip the check. Threshold is strict `>` — exactly
100 is fine.

**OBSERVED** — Two independent masking behaviours hide the worst cases: `capacity.service.ts:206-207`
clamps reported allocated and PTO hours to `baseHours`, and
`scenario-calculator.service.ts:546-547` flattens an `Infinity` utilization (demand against zero
capacity) to `100`.

**OBSERVED** — `autoAllocate`'s prevention is partially undone downstream: consolidation of duplicate
employee+initiative pairs **sums percentages without re-capping**
(`allocation.service.ts:1265-1270`, `existing.percentage += alloc.percentage`), and the apply step
re-clamps per row only (`:1339`, `percentage: Math.min(proposed.percentage, 100)`).

**OBSERVED** — `listAllocationSummaries` sums `percentage` across **all scenarios** an employee
appears in (`allocation.service.ts:550-557`), so a person in three scenarios reports 300%,
unflagged. The newer implementation records this same behaviour as `I23`'s known exception; **V1
already had it.**

**OBSERVED** — There is a severity ladder for capacity *shortage*
(`scenario-calculator.service.ts:902-909`: `≥50 critical`, `≥30 high`, `≥15 medium`) and **no
equivalent ladder for over-allocation**. Under-supply was graded; over-commitment was not.

**INFERRED** — The asymmetry is telling. V1 treated a shortage of capacity as a portfolio fact
worth grading and an over-commitment of a person as a data-quality note worth listing. Prevention
appears exactly twice: once in a machine-generated path (`autoAllocate`), and once on the model
whose numbers nothing reads (`EmployeeOrgUnitLink`).

---

## 4. `CapacityCalendar.hoursAvailable` had three meanings in V1

**OBSERVED** — The field carries no unit or semantic comment (`schema.prisma:462-474`) and its Zod
schema bounds it only from below (`schemas/resources.schema.ts:107-117`,
`z.number().nonnegative()`) with no upper bound and no cross-check against `hoursPerWeek`.

| Meaning | Readers | Citation |
|---|---|---|
| **Unavailable** hours (PTO), subtracted | `capacity.service.ts:197-200`; `capacity.service.ts:271,276` (`batchGetPtoHours`); `baseline.service.ts:133-135` (`hoursPerWeek * 13 - hoursAvailable`); `delta-engine.service.ts:172-173,193` | 4 sites |
| **Available** base hours, returned as-is | `scenario-calculator.service.ts:885-900` (`if (entry) return entry.hoursAvailable;`) | 1 site |
| **Full quarterly capacity**, as written | `prisma/seed.ts:143-147` — `const quarterlyHours = empData.hoursPerWeek * 13; … hoursAvailable: quarterlyHours`; also `prisma/test-seed.ts:256-263` | the data itself |

**OBSERVED — the consequence is not hypothetical.** With seeded data (`hoursAvailable = 520` for a
40h employee), `capacity.service.calculateAvailability` computes
`max(0, 40 − 0 − 520) = 0`: **every seeded employee reports zero availability, every week.** The
field name asserts the second meaning, the majority of readers assume the first, and the seed writes
the third.

**INFERRED** — This is a domain question left unresolved and then encoded as a nullable float: *is a
capacity calendar a record of time the organization has, or of time it does not have?* V1 never
answered it.

---

## 5. Supply in V1 was demand-shaped

**OBSERVED** — `scenario-calculator.calculateCapacity` iterates over **allocations**, not employees
(`:292`, `:368-410`), and `continue`s when `effectiveAllocationPercentage === 0` (`:410`). An
employee with no allocation contributes **zero capacity**.

**INFERRED** — V1 had no independent statement of supply. "Capacity" meant *the hours implied by the
allocations someone had already made*. There was consequently no way to ask "how much unclaimed
capacity does this org node have?" — only "how much capacity has been claimed within it?"

**OBSERVED** — The Token model does not fix this. `TokenSupply` is **hand-entered per
(scenario, skillPool)** (`services/token-supply.service.ts:40-70`, an `upsert` of `data.tokens`) and
summed verbatim (`planning/token-flow-model.ts:56-96`). Demand *is* derived — from `ScopeItem`
`skillDemand` hours × `TokenCalibration.tokenPerHour` (`planning/derive-demand.ts:82,111-126`) — but
there is **no `derive-supply` counterpart** in V1. `SkillPool` (`schema.prisma:1222`) has no
employee or org relation at all; pools are name-matched to `Skill.name`.

**INFERRED** — This is the same asymmetry the newer implementation records as `J15`
("supply is pooled, demand is per-initiative"), in an earlier and starker form: in V1, supply was
not merely pooled, it was *typed in by hand*.

---

## 6. The solver branches add a seventh over-allocation policy

Not present on `main`. `feat/L3-constraint-validator` @ `1eee5e4` and
`feat/L4-governance-decision` @ `4f4c751`, under
`backend/src/engine/`. Cited via `git show <branch>:<path>`.

**OBSERVED** — The unit of capacity changes. `constraints/types.ts:16-20` defines
`Team { id, name, capacityByPeriod: number[] }` and `:1-5`
`TeamAllocation { teamId, periodIndex, tokens }`. **The allocation target is a TEAM and the quantity
is TOKENS** — no employee, no percentage, no hours. `governance/types.ts:168-171` reduces it further
to `CapacityPlan { periods, capacityBySkillPerPeriod: Record<string, number> }` — a **skill**, not
even a team.

**OBSERVED** — Over-allocation becomes a graded, first-class constraint
(`constraints/capacity-constraint.ts:10,51-75`): `used > available` emits a
`severity: 'error'` **violation**; otherwise `utilization > 0.85` emits a **warning**
(`DEFAULT_WARNING_THRESHOLD = 0.85`). This is the severity ladder that `main`'s over-allocation path
lacks.

**OBSERVED** — The scheduler **prevents** it structurally.
`constraints/capacity-grid.ts:212-225` `canFit` refuses any window where
`slots[p].remaining < demand.tokensPerPeriod`, and `findFeasibleWindow` (`:178-188`) scans forward
for the earliest fitting start, returning `null` if none exists in the horizon. Work is **deferred
or declared infeasible** rather than over-committed. The grid can still *represent* over-allocation
(`:9`, `utilization: number; // 0-1 (can exceed 1 if over-allocated)`) — it just will not schedule
into it.

**OBSERVED** — Governance escalates it to a gate:
`governance/governance-engine.ts:102-105`, `const approved = violations.length === 0;` — a capacity
violation **blocks the state transition**, and `:114-115` attaches
`alternativeSuggestions` from `findAlternative` instead.

**OBSERVED** — Bottleneck analysis is explicit:
`capacity-grid.ts:194-208` `getContention(periodId)` returns teams sorted by utilization descending,
commented *"Identifies bottlenecks — most-loaded teams first."*

**INFERRED** — The solver work is where V1's thinking about capacity actually matured: graded
severity, prevention by deferral rather than by rejection, alternative suggestion on refusal, and
explicit bottleneck ranking. It reached that maturity only by **abandoning the employee-percentage
model entirely** in favour of team-or-skill tokens per period. Nothing bridges the two:
`solver-bridge.service.ts` (`v1/solver` only) is the sole connection, and the constraint engine never
reads `Allocation`, `Employee` or `hoursPerWeek`.

---

## 7. Contrast with `docs/domain/evidence/workforce-planner/` (the newer workforce planner)

That directory, despite its path, documents a **different and later** implementation. The table
below settles which behaviours V1 already had.

### J1 — three live "allocation percentage" concepts

| Concept | In V1? | Evidence |
|---|---|---|
| `Allocation.percentage` — scenario-scoped, quarter-clamped, initiative-only | **YES** | `schema.prisma:522-547`; scenario-scoped `:523`, quarter-clamped `allocation.service.ts:121-144`, initiative-only (no other target FK) |
| `EmployeeOrgUnitLink.allocationPct` + `consumeCapacity`, with its own hard-rejecting `validateAllocationTotal` | **YES** | `schema.prisma:1362-1385`; `employee-org-link.service.ts:528-566` |
| `WorkforceAllocation.allocationPct` — plan-scoped, week-atomic, six target types | **NO** | No branch in this repository contains `model WorkforceAllocation` or `model WorkforcePlan` |

**Two of J1's three concepts are V1's.** The conflict J1 describes — *"the share of a person's time
claimed by an organizational unit"* versus *"the share of a person's time planned against a piece of
work"* — **originated in V1** and predates the workforce planner by at least one migration
(`20260208100000_add_matrix_org_model`). The workforce planner added a *third* percentage without
resolving the first two.

**INFERRED** — J1's framing ("the org-link model says these are the same thing") is too strong for
V1. V1's org-link model says these are the same thing **only for `DELIVERY_ASSIGNMENT` and
`TEMPORARY_ROTATION`**, and says they are explicitly *different* for `PRIMARY_REPORTING`,
`FUNCTIONAL_ALIGNMENT` and `CAPABILITY_POOL` — enforced by `NEVER_CONSUMES`. V1's answer was
conditional, per relationship type. That conditionality is itself the most interesting thing V1 has
to say on this question, and it is invisible in the newer evidence package.

### J9 — `capacityPct` designed for and never used

**Not applicable to V1.** No such seam exists. V1's equivalent gap is worse and *is* wired up: the
denominator differs between the write path (`hoursPerWeek × 13`), the read path (`hoursAvailable`)
and the over-allocation check (literal `100`), with no option to reconcile them.

### I1 — finite weekly capacity, measured against the person's own week

**Partially in V1.** The *comparison against a literal 100* is V1's
(`scenario-calculator.service.ts:716`). The *own-week* framing is not: V1's period is the
QUARTER, not the week (`allocation.service.ts:1389-1393`); there is no `CapacityState` enum, no
`EMPTY`/`UNDER`/`AT`/`OVER`, and no epsilon tolerance. V1's `hoursPerWeek` conversion exists but
feeds hours, never the over-allocation test — the same blind spot I1 records as a known exception.

### I2 — allocations are percentages of a person, not hours

**Contradicted by V1.** V1 stores **both**: `Allocation.percentage` *and* the materialised
`AllocationPeriod.hoursInPeriod` (`schema.prisma:548-563`), written at quarter grain and read back
by `calculateCapacityDemand` (`allocation.service.ts:938-943`), `baseline.service.ts:109-128` and
`jobs/processors/view-refresh.processor.ts:204-215`. I2 lists this as its known exception; in V1 it
is not an exception but the primary read path.

### I3 — unallocated is not the same as available

**In V1 as arithmetic, absent as a rule.** `capacity.service.ts:200` computes
`baseHours − allocatedHours − ptoHours`, which is the same idea. But V1 states it nowhere — no
comment, no `CapacityEffect`, no test — and the one endpoint that computes it is broken by the
week/quarter grain mismatch (§2) and poisoned by the `hoursAvailable` ambiguity (§4). **The rule was
implemented before it was understood.**

### I4 — over-allocation is reported, never prevented

**True of V1's `Allocation` path, and V1 already contained the same contradiction.**
`employee-org-link.service.ts:553-561` hard-rejects; `allocation.service.create/update` does not
check at all. I4 records this as *"directly contradicted … two policies, same question"* — **both
policies are V1's, in V1's own codebase**, and V1 adds three more the newer package does not
mention: silent clamping (`scenario-calculator.service.ts:404-408`), silent masking
(`capacity.service.ts:206-207`), and prevention-by-construction in `autoAllocate`
(`allocation.service.ts:1059,1232-1234`). On the solver branches it becomes a blocking gate (§6).

### J10 — `CapacityCalendar.hoursAvailable` has two contradictory meanings

**V1 has all three.** J10 counts the conflict 2-to-1 among readers; V1 has **4 readers to 1** plus a
seed that writes a third meaning (§4). The specific citations J10 names —
`capacity.calculateAvailability`, `baseline.captureSnapshot`,
`scenario-calculator.getBaseHoursForPeriod` — are all V1 files at
`capacity.service.ts:197-200`, `baseline.service.ts:133-135`, `scenario-calculator.service.ts:885-900`.
This jagged area is **entirely inherited**, not introduced by the workforce planner.

### Summary of provenance

| Jagged area / invariant | Origin |
|---|---|
| Org-membership capacity claim vs work capacity claim (J1) | **V1**, migration `20260208100000_add_matrix_org_model` |
| Two opposite over-allocation policies in one codebase (J2, I4) | **V1** |
| `hoursAvailable` ambiguity (J10) | **V1**, incl. a third seed-written meaning |
| Percentage summed across scenarios reporting >100% (I23 exception) | **V1**, `allocation.service.ts:550-557` |
| Hours stored alongside percentages (I2 exception) | **V1**, `AllocationPeriod.hoursInPeriod` |
| Week-atomic allocation, six target types, `CapacityEffect`, `capacityPct` seam (J9, I1, I3) | **Later** — absent from every V1 branch |
| Explicit "unallocated ≠ available" as a *stated rule* | **Later** — V1 computes it, never states it |
| Graded over-allocation severity, prevention by deferral, governance gate | **V1 solver branches only** (`feat/L3`, `feat/L4`), on a team/skill-token model that discards employee percentages |

---

## 8. Open questions this survey does not answer

**UNKNOWN** — Whether `EmployeeOrgUnitLink.allocationPct` was ever populated in a production
deployment, or only in tests and the frontend form. No fixture, migration backfill or query result
was available.

**UNKNOWN** — Whether the `NEVER_CONSUMES` set reflects a stated business rule or one engineer's
reading. There is no ADR, PRD reference or test comment explaining why `CAPABILITY_POOL` cannot
consume capacity while `TEMPORARY_ROTATION` can.

**UNKNOWN** — Whether `AllocationType ∈ {PROJECT, RUN, SUPPORT}` was intended as investment
classification. Its only behaviour is scenario-clone filtering; no report groups by it.

**UNKNOWN** — Whether the week/quarter grain mismatch in `calculateAvailability` (§2) was known.
No test covers it; `tests/org-capacity.test.ts` seeds `capacityCalendar: []`.

**UNKNOWN** — Whether the solver branches' team/skill-token capacity model was intended to replace
the employee-percentage model or to sit above it. `solver-bridge.service.ts` exists only on
`v1/solver` and was not read in depth for this ticket.
