# Workforce Domain Evidence

Descriptive inventory of domain concepts observed in the ProductFolio repository.
Evidence-gathering only. No redesign, no migration proposals, no judgement that the
current shape is correct.

Labels used throughout these documents are defined in `README.md`. In particular, statements
made by PRDs, ADRs, implementation plans, analysis documents, and code comments are
**SOURCE-ASSERTED INTENT** unless independently demonstrated as behaviour.

Commit surveyed: `3cd0dbd`, branch `feat/workforce-capacity-planning`.
The snapshot is currently unavailable; see `SOURCE_MANIFEST.md` before relying on citations.

---

## 0. Scope note on the requested vocabulary

**OBSERVED BY ABSENCE** — Several terms in the extraction brief do **not appear** in the
repository. A full-tree search of `packages/backend/src`, `packages/frontend/src`,
`packages/backend/prisma` and `docs/` returns zero hits for:

| Requested term | Hits |
|---|---|
| `Workstream` / `workstream` | 0 |
| `Product Portfolio` / `ProductPortfolio` | 0 |
| `Product VP` / `ProductVP` | 0 |
| `Product Area` / `productArea` | 0 (note: `PortfolioArea` exists and is a different thing) |
| `Product Workstream Leader` | 0 |
| `Sustain` / `SUSTAIN` | 0 as a domain term |
| `New Development` / `NEW_DEVELOPMENT` | 0 |
| `OEM Division` | 0 |

**OBSERVED BY ABSENCE** — Within the stated search scope, `OEM` appears twice, both as *test
fixture data*, not as a modelled concept:
`employee-census-mapper.test.ts:152` parses the string `'OEM Solutions (Thomas King)'` as a
supervisory-organization division name, and `census-allocation-proposal.test.ts:73` uses
`{ id: OEM_NODE, name: 'OEM Solutions' }` as an org node fixture.

**OBSERVED** — `BAU` appears three times, and never as a schema element: once in a UI hint
string (`CapacitySummaryTiles.tsx:67` — *"FTE of product, support and BAU work"*), and
otherwise in `docs/PRD_WORKFORCE_CAPACITY.md` §14/§19 and `docs/ANALYSIS_WORKFORCE_CAPACITY.md`
as prose. There is no `BAU` enum member, column, or classification.

**INFERRED** — The requested vocabulary is the *target* domain language of the redesign, not
the language of this implementation. This implementation uses `OrgNode`, `PortfolioArea`,
`Initiative`, `Project`, `WorkItem`, `WorkCategory`, `WorkforceAllocation`, and `SkillPool`.
Whether the difference is terminological or structural remains **UNKNOWN** until the target
business concepts are independently documented.

**UNKNOWN** — Whether "Product Area" is intended to mean `OrgNode(type = PRODUCT)`,
`PortfolioArea`, or a third thing. The repository has two candidate homes and calls neither
by that name.

---

## 1. Employee

### Current term
`Employee`.

### Where it appears
`schema.prisma:404-443`; `resources.service.ts`; `capacity.service.ts`;
`employee-census.*`; `employee-deletion-impact.service.ts`; `/api/employees`;
`Capacity.tsx` (1759 lines); every workforce service.

### Observed meaning
**OBSERVED** — A person with `name`, `role` (free-text string, not an enum),
`employmentType` (`FULL_TIME | PART_TIME | CONTRACTOR | INTERN`), `hoursPerWeek` (Float,
default 40), `activeStart` / `activeEnd`, a nullable `managerId` self-FK, a nullable
`jobProfileId`, and a nullable-unique `externalId` (`schema.prisma:404-419`).

**OBSERVED** — `hoursPerWeek` is the *only* numeric capacity attribute on the employee.
There is no per-employee FTE field and no separate "capacity percentage".

**OBSERVED** — `role` is `String`, free text. `JobProfile` is a separate optional entity
(`schema.prisma:1139`).

### User purpose
**INFERRED** — Represent enough of a person to plan their time, explicitly *not* an HRIS
record. `PRD_WORKFORCE_CAPACITY.md` §20 lists payroll, compensation, performance, recruiting,
benefits, leave management and personnel records as out of scope.

### Relationships
`manager` / `directReports` (self-FK); `skills`; `domains`; `capacityCalendar`;
`allocations` (legacy); `workforceAllocations`; `orgMemberships`; `orgUnitLinks`;
`managedOrgNodes`; `jobProfile`; `domainFamiliarity`.

### Rules
**OBSERVED** — `hoursPerWeek` defaults to 40 with no upper or lower bound in the schema.
**OBSERVED** — `externalId` is the census import's idempotency key; it is a `String`, and
zero-padding is significant, so the parser reads `cell.text` and never `cell.value`
(`CLAUDE.md`, census section).
**OBSERVED** — Every relation pointing at `Employee` is `onDelete: Cascade`, so deleting an
employee destroys all allocations in every scenario, skills, domains, capacity calendar and
org links. `Employee.managerId` and `OrgNode.managerId` are `SetNull`, so deleting a manager
orphans their direct reports (`employee-deletion-impact.service.ts`).

### Temporal behaviour
**OBSERVED** — `activeStart` / `activeEnd` bound employment. `activeEnd` is only ever *set*
from a census `Close:MM/DD/YYYY` annotation and is **never cleared by its absence** — a blank
column is treated as missing information, not an instruction to erase (`CLAUDE.md`).
**OBSERVED** — `hoursPerWeek` is a scalar with no history. Changing it retroactively changes
every past FTE number computed from it.

### Ambiguity
**OBSERVED** — Two parallel "which org is this person in" mechanisms exist: `OrgMembership`
(temporal, `effectiveStart`/`effectiveEnd`) and `EmployeeOrgUnitLink` (temporal,
`startDate`/`endDate`, plus `relationshipType`, `allocationPct`, `consumeCapacity`). Both are
live. See ORGANIZATION_SEMANTICS.md.

### Confidence
**HIGH.**

---

## 2. hoursPerWeek / employee capacity

### Current term
`Employee.hoursPerWeek`; `DEFAULT_FULL_TIME_HOURS`; "contracted capacity".

### Where it appears
`schema.prisma:409`; `capacity-math.ts:26,130-137`; `workforce-grid.service.ts:384-389`;
`workforce-aggregation.service.ts` (`summarize`); `scenario-calculator.service.ts:885-901`;
`allocation.service.ts:1407-1415`; `CapacitySummaryTiles.tsx` ("Contracted capacity").

### Observed meaning
**OBSERVED** — Two distinct roles, and they are kept apart deliberately:

1. **The denominator for FTE across employees.** `toFte(pct, hoursPerWeek, fullTimeHours = 40)`
   returns `(pct/100) * (hoursPerWeek/40)` (`capacity-math.ts:130-137`). A part-timer at 100%
   is 0.5 FTE.
2. **The denominator for over-allocation is NOT hoursPerWeek.** `summarizeWeek` takes an
   optional `capacityPct` defaulting to `FULL_ALLOCATION_PCT = 100`
   (`capacity-math.ts:64-70, 80-107`).

**OBSERVED** — A repository-wide search shows **no production caller ever passes
`capacityPct`**. It is referenced only inside `capacity-math.ts`, the mirrored
`workforce-capacity.ts`, and their tests. The grid's TOTAL row calls
`summarizeWeek(cells)` with no options (`workforce-grid.service.ts:366-374`).

**INFERRED** — In practice, "100%" always means 100% of *this employee's own contracted week*,
whatever that week is. A 20-hour employee planned at 100% reads `AT` capacity, not `OVER`,
and contributes 0.5 FTE to any roll-up. The `capacityPct` parameter is a designed-for but
unused seam.

**OBSERVED** — There is a test asserting the unused path works:
`workforce-capacity-math.test.ts:131` — *"measures against the employee own capacity, not a
nominal full week"*.

### Rules
**OBSERVED** — `DEFAULT_FULL_TIME_HOURS = 40` is a module constant, not configuration
(`capacity-math.ts:26`). `toFte` returns 0 rather than dividing by zero when
`fullTimeHours <= 0`.

### Ambiguity
**OBSERVED** — Three different "hours in a period" conventions coexist:
- Workforce path: one row = one employee-week; hours = `(pct/100) * hoursPerWeek`
  (`capacity-supply.ts:154`).
- Legacy path: `hoursPerQuarter = hoursPerWeek * 13` (`allocation.service.ts:1407`,
  `scenario-calculator.service.ts:899`).
- `CapacityCalendar.hoursAvailable` — read three ways, see §4.

### Confidence
**HIGH** for the arithmetic; **MEDIUM** for intent, because the unused `capacityPct` seam
suggests a reduced-capacity case was anticipated and never wired up.

---

## 3. WorkforcePlan

### Current term
`WorkforcePlan`. Prose calls it "the baseline plan", "the workforce plan", "the overlay".

### Where it appears
`schema.prisma:1585-1617`; `workforce-plan.service.ts`; `workforce-overlay.service.ts`;
`/api/workforce/plans*`; `WorkforcePlanner.tsx`; `capacity-supply.ts`.

### Observed meaning
**OBSERVED** — A named container for weekly allocation rows, with `status`
(`ACTIVE | ARCHIVED`), `isBaseline` (Boolean), a nullable-unique `scenarioId`,
`branchedFromPlanId`, `branchedAt`, and `horizonWeeks` (default 26, bounded 1–104).

**OBSERVED** — Schema comment: *"the organisation's **intended** allocation baseline — supply
side, rolling across a 12-26 week horizon. It is deliberately NOT a Scenario"*
(`schema.prisma:1516-1519`).

**OBSERVED** — A plan is one of exactly two kinds, distinguished only by whether
`scenarioId` is set:
- `scenarioId IS NULL` + `isBaseline = true` → the organisation's baseline. At most one
  ACTIVE such row, enforced by a partial unique index plus a service guard.
- `scenarioId = X` → a scenario overlay, a *copy* of the baseline's rows clamped to that
  scenario's quarter.

**OBSERVED** — `scenarioId` is deliberately **not** a Prisma relation, so a plan outlives the
scenario it was branched for rather than being cascaded away with it
(`schema.prisma:1596-1598`).

### User purpose
**INFERRED** — Give "what we currently intend people to work on" a home that is not a
what-if, and is not bound to a single quarter. `PRD` §6.

### Rules
**OBSERVED** — `horizonWeeks` bounded `[1, 104]` (`workforce-plan.service.ts:21-22`).
**OBSERVED** — Branching copies rows in chunks of 500 (`workforce-overlay.service.ts:47`).
**OBSERVED** — Promotion **merges**: overlay rows replace baseline rows *inside* the quarter
window; baseline rows outside it are never named in any statement's `WHERE` clause. The
baseline keeps its id rather than the overlay's `isBaseline` being flipped.
**OBSERVED** — Discard **deletes** the overlay (requires `confirm: true`), because
`scenarioId` is unique and an archived overlay would hold its scenario's slot forever.
**OBSERVED** — Promotion is transactional; the census publish deliberately is not.

### Temporal behaviour
**OBSERVED** — A plan has a rolling horizon but no start date of its own. `horizonWeeks` is a
declared width, and every read passes its own `from` + `weeks`.

### Ambiguity
**OBSERVED** — The word "baseline" means two unrelated things in this repository:
`WorkforcePlan.isBaseline` (a rolling plan of people's time) and
`ScenarioType.BASELINE` + `BaselineSnapshot` (a frozen quarter of initiative staffing).
`ANALYSIS_WORKFORCE_CAPACITY.md` fact 11 calls this out explicitly.

### Confidence
**HIGH.**

---

## 4. WorkforceAllocation

### Current term
`WorkforceAllocation`. UI calls a row "an allocation"; a cell is a week's percentage.

### Where it appears
`schema.prisma:1619-1699`; `workforce-allocation.service.ts`; `workforce-grid.service.ts`;
`workforce-aggregation.service.ts`; `capacity-supply.ts`; `target-key.ts`;
`/api/workforce/plans/:id/allocations`; `PlannerGrid.tsx`.

### Observed meaning
**OBSERVED** — One row = **one employee × one ISO week × one target**, carrying
`allocationPct`, `capacityEffect`, `status`, `source`, `notes`.

**OBSERVED** — Uniqueness is `@@unique([planId, employeeId, weekPeriodId, targetKey])`.

**OBSERVED** — `weekStart` is denormalised from `Period` so the grid renders without a join;
the comment states it is immutable for a given Period and so cannot drift
(`schema.prisma:1625-1630`).

### Rules
**OBSERVED** — `allocationPct` is validated `[0, 100]` per row, with the message:
*"A single allocation cannot exceed 100% — over-allocation is several rows summing past it"*
(`workforce.schema.ts:121-124`).
**OBSERVED** — `0` is not stored: *"0 removes the allocation: an allocation of 0% is the
absence of one"* (`workforce-allocation.service.ts:56`).
**OBSERVED** — Over-allocation across rows is **never rejected**, only reported
(`workforce-allocation.service.ts:33-36`, `capacity-math.ts:74-78`).
**OBSERVED** — A single bulk edit may cover at most `MAX_RANGE_WEEKS = 104`.
**OBSERVED** — A database CHECK constraint enforces target shape — exactly one structural FK
non-null per `targetType`, and `work_category` NOT NULL on the `WORK_ITEM` branch
(`migrations/20260830180000_.../migration.sql:131-146`).

### Temporal behaviour
**OBSERVED** — Week-atomic. No start/end dates on the row itself; the week *is* the period.
**OBSERVED** — No history table. Editing a cell overwrites it. `status` (`ACTUAL`,
`COMMITTED`, `PLANNED`, `PROPOSED`) is the only representation of planning certainty, and
nothing in the codebase transitions it automatically as time passes.

### Ambiguity
**OBSERVED** — The word "allocation" denotes **three** different records: `Allocation`
(legacy, scenario-scoped, quarter-clamped, initiative-only),
`WorkforceAllocation` (new, plan-scoped, week-atomic, six target types), and
`EmployeeOrgUnitLink.allocationPct` (org affiliation with a capacity claim). All three are
live. See ALLOCATION_SEMANTICS.md.

### Confidence
**HIGH.**

---

## 5. AllocationTargetType and targetKey

### Current term
`AllocationTargetType` (`PRODUCT | INITIATIVE | PROJECT | WORK_ITEM | CATEGORY | RESERVED`);
`targetKey`.

### Where it appears
`schema.prisma:1534-1541, 1638-1641`; `target-key.ts` (the whole file);
`AddAllocationDialog.tsx`; the target-shape CHECK constraint.

### Observed meaning
**OBSERVED** — Polymorphic allocation target implemented as *four typed nullable FKs*
(`orgNodeId`, `initiativeId`, `projectId`, `workItemId`) plus a canonical string
`targetKey` carrying the discriminator.

**OBSERVED** — The stated reason the string exists: the uniqueness constraint cannot ride the
FK columns, because Postgres treats NULLs as distinct, so a unique index over the FK set
*"would happily accept two identical 'Pricing Platform 30%' rows"* (`target-key.ts:14-19`).

**OBSERVED** — Key grammar (`target-key.ts:21-27`):
```
PRODUCT:<uuid>[|<CATEGORY>]     INITIATIVE:<uuid>[|<CATEGORY>]
PROJECT:<uuid>[|<CATEGORY>]     WORK_ITEM:<uuid>
CATEGORY:<WORK_CATEGORY>        RESERVED:<WORK_CATEGORY>
```

**OBSERVED** — `PRODUCT` does **not** resolve to a `Product` table. It resolves to an
`OrgNode` whose `type` is one of `PRODUCT | PLATFORM | TEAM | DIVISION | DEPARTMENT`
(`workforce-allocation.service.ts:39-45`). The UI labels the picker
*"Product or team"* and the option group *"Products and teams"*.

**OBSERVED** — `WORK_ITEM` takes no category suffix, because the item owns its own
`workCategory`; the row's category is denormalised from the item at write time and re-synced
by `updateWorkItem`.

### Rules
**OBSERVED** — A `PRODUCT` / `INITIATIVE` / `PROJECT` target may be *narrowed* by a
`workCategory`, producing distinct rows: "Pricing Platform" and "Pricing Platform / Support"
are two separate allocations.
**OBSERVED** — Exactly one structural concept per row. There is no way to say
"this allocation is on Initiative X *and* Product Y".

### Ambiguity
**OBSERVED** — `PRODUCT` names a target type that has no corresponding entity; five different
`OrgNodeType` values satisfy it, including `DIVISION` and `DEPARTMENT`, which are not products
in any ordinary reading.

### Confidence
**HIGH** for mechanism; **LOW** for what "PRODUCT" is supposed to denote.

---

## 6. CapacityEffect

### Current term
`CapacityEffect` (`DEPLOYABLE | OVERHEAD | UNAVAILABLE`).

### Where it appears
`schema.prisma:1561-1568`; `capacity-math.ts`; `target-key.ts:defaultCapacityEffect`;
`capacity-supply.ts`; every aggregation; `workforce-capacity.ts` (frontend mirror).

### Observed meaning
**OBSERVED** — Orthogonal to *what* the work is (`workCategory`) and *who* it is for
(`targetType`). Schema comment: *"this is what makes 'unallocated != available'
representable: PTO and management overhead are ordinary allocation rows that do not count as
deployable capacity"* (`schema.prisma:1557-1560`).

**OBSERVED** — The arithmetic (`capacity-math.ts:6-19`):
```
allocated   = sum of DEPLOYABLE rows
reserved    = sum of OVERHEAD + UNAVAILABLE rows
committed   = allocated + reserved          -- the planner's TOTAL row
unallocated = 100 - committed               -- genuinely deployable
```

**OBSERVED** — Defaults (`target-key.ts:defaultCapacityEffect`): everything is `DEPLOYABLE`
except `RESERVED` targets, where `TIME_OFF → UNAVAILABLE` and everything else → `OVERHEAD`.
The stated distinction: *"TIME_OFF is capacity the organisation does not have, whereas
management and operations overhead is capacity it has but has already spent"*.

**OBSERVED** — A `SUPPORT` category target is explicitly `DEPLOYABLE` — *"which is real work"*.

### Rules
**OBSERVED** — `unallocated` is floored at 0 and never negative.
**OBSERVED** — Only `DEPLOYABLE` rows reach `WorkforcePlanSupply.getEmployeeCapacity`,
`deriveTokenSupply` and `scenarioInitiativeStaffing`.

### Ambiguity
**OBSERVED** — `OVERHEAD` and `UNAVAILABLE` are summed identically everywhere in
`capacity-math.ts`; the only place the distinction is used is the default-assignment rule and
whatever a reader infers from the enum value. No calculation branches on `OVERHEAD` vs
`UNAVAILABLE`.

### Confidence
**HIGH** for the mechanism; **MEDIUM** that the three-way split earns its third member.

---

## 7. WorkCategory

### Current term
`WorkCategory` — `FEATURE | BUG | MAINTENANCE | TECH_DEBT | SUPPORT | COMPLIANCE | DISCOVERY |
PLATFORM | OPERATIONS | MANAGEMENT | TIME_OFF | OTHER`.

### Where it appears
`schema.prisma:1570-1583`; `WorkItem.workCategory` (required);
`WorkforceAllocation.workCategory` (nullable); `target-key.ts`; `AddAllocationDialog.tsx`;
aggregation `byWorkCategory`.

### Observed meaning
**OBSERVED** — PRD §4's list plus two additions. Schema comment: *"plus MANAGEMENT and
TIME_OFF so overhead has a category rather than a null"* (`schema.prisma:1570-1572`).

**OBSERVED** — It lives in three places at once:
1. On a `WorkItem`, **required** — the item's purpose.
2. On a `WorkforceAllocation`, **nullable** — either a narrowing of a structural target, the
   whole target (`CATEGORY:` / `RESERVED:`), or denormalised from a work item.
3. Implicitly as the target *identity* for `CATEGORY` and `RESERVED` rows.

### Ambiguity
**OBSERVED** — `MANAGEMENT` and `TIME_OFF` are admitted to be present for a structural reason
("so overhead has a category rather than a null"), not because they are kinds of work in the
same sense as `FEATURE`.
**OBSERVED** — `PLATFORM` is both a `WorkCategory` and an `OrgNodeType`.
**SOURCE-ASSERTED INTENT** — The repository's analysis describes `AllocationType`
(`PROJECT | RUN | SUPPORT`) on legacy `Allocation` as a *"direct duplicate, on the wrong
entity"*. That phrase is the source author's design judgment, not observed domain fact.
**OBSERVED** — `PROJECT` is both an `AllocationType` member and an `AllocationTargetType`
member and a table name, with three different meanings.

### Confidence
**HIGH** that the enum exists and is used; **LOW** that its members form one coherent axis.

---

## 8. WorkforceAllocStatus and WorkforceAllocSource

### Current term
`WorkforceAllocStatus` (`ACTUAL | COMMITTED | PLANNED | PROPOSED`, default `PLANNED`);
`WorkforceAllocSource` (`IMPORT | MANAGER | SYSTEM_INFERRED | SCENARIO | EXTERNAL_SYSTEM`,
default `MANAGER`).

### Where it appears
`schema.prisma:1543-1559`; `workforce-allocation.service.ts`;
`census-allocation-proposal.ts`; grid cell payload.

### Observed meaning
**OBSERVED** — `status` is the *only* representation of planning certainty. Census-inferred
rows land as `status = PROPOSED, source = IMPORT`
(`census-allocation-proposal.ts:22-27`).

**OBSERVED** — Nothing in the codebase reads `status` to change a calculation. Every capacity
computation, aggregation and supply derivation filters on `capacityEffect`, never on `status`.
`PROPOSED` rows written by a census apply are counted in capacity exactly like `COMMITTED`
rows.

**OBSERVED** — There is no automatic transition. A manager *"confirms by promoting the
status"*, and no code performs that promotion — the status is set at write time and never
advanced.

### Ambiguity
**OBSERVED** — `ACTUAL` is defined but nothing produces it and nothing consumes it.
`ANALYSIS_WORKFORCE_CAPACITY.md` C7 says drift detection *"is what earns PRD §9's `ACTUAL`
status its place. **Not v1**"*.

### Confidence
**HIGH** that the fields exist; **LOW** that they carry domain weight today.

---

## 9. Scenario

### Current term
`Scenario`.

### Where it appears
`schema.prisma:499-539`; `scenarios.service.ts`; `scenario-calculator.service.ts`;
`baseline.service.ts`; `drift-alert.service.ts`; `ScenarioPlanner.tsx` (2601 lines);
`workforce-overlay.service.ts`.

### Observed meaning
**OBSERVED** — Bound to exactly one `Period` (a QUARTER) via `periodId`. Carries `status`
(`DRAFT | LOCKED | APPROVED | …`), `isPrimary`, `scenarioType`
(`BASELINE | REVISION | WHAT_IF`), `revisionOfScenarioId`, `needsReconciliation`,
`planLockDate`, `assumptions` (JSONB), `priorityRankings` (JSONB), `planningMode`,
`capacitySource`, `orgNodeId`.

**OBSERVED** — The set of initiatives "in" a scenario is **untyped JSONB**:
`priorityRankings` is an array of `{ initiativeId, rank }`, read by at least four call sites
(`derive-demand.ts:45`, `scenario-calculator.service.ts:96`, `allocation.service.ts:852,999`,
`view-refresh.processor.ts:122`).

**OBSERVED** — Two orthogonal dispatch axes hang off a Scenario:
`planningMode` (`LEGACY | TOKEN`) picks the calculation engine; `capacitySource`
(`LEGACY | WORKFORCE_PLAN`) picks the capacity supply provider
(`schema.prisma:160-173`, `capacity-supply.ts`, `docs/ADR_SCENARIO_CAPACITY_SOURCE.md`).

### Rules
**OBSERVED** — A `LOCKED` or `APPROVED` scenario is frozen; its legacy allocations, its
workforce overlay, and (as of `d2f6024`) its priority ranking all refuse writes.
**OBSERVED** — `capacitySource` is never inferred: creating or deleting a `WorkforcePlan`
does not change it. Only an explicit `PUT /api/scenarios/:id/capacity-source` does.

### Temporal behaviour
**OBSERVED** — Quarter-bound by construction, and legacy allocations inside it are
hard-clamped to that quarter (`allocation.service.ts:122-145`).

### Ambiguity
**OBSERVED** — Three distinct baselining mechanics coexist: `ScenarioType.BASELINE` +
`BaselineSnapshot` + `DriftAlert` (frozen quarter of initiative staffing);
`Scenario.isPrimary`; `WorkforcePlan.isBaseline` (rolling plan of people's time).

### Confidence
**HIGH.**

---

## 10. Initiative

### Current term
`Initiative`.

### Where it appears
`schema.prisma:302-349`; `initiatives.service.ts`; `/api/initiatives`;
`ScenarioPlanner.tsx`; workforce allocation targets; `scenarioInitiativeStaffing`.

### Observed meaning
**OBSERVED** — A titled body of change with `status`
(`PROPOSED | SCOPING | RESOURCING | IN_EXECUTION | COMPLETE | ON_HOLD | CANCELLED`),
`businessOwnerId` (required), `productOwnerId` (required), `productLeaderId` (optional),
`portfolioAreaId` (optional), `orgNodeId` (optional, **single-valued**), `targetQuarter`
(String) and `targetPeriodId`, `domainComplexity`, `deliveryHealth`, `origin`.

**OBSERVED** — PRD §2.1 requires *"An Initiative may span multiple Products"* and
*"Products and Initiatives MUST NOT be modeled as a rigid parent/child hierarchy"*.
`Initiative.orgNodeId` is single-valued, which the analysis marks **Conflicting**:
*"Many-to-many span is not representable"* (`ANALYSIS_WORKFORCE_CAPACITY.md` §B).

**OBSERVED** — Span is instead *derived* — from the org memberships of the people allocated
to it (`initiativeContributors`), not from the allocation rows' own org column, because the
target-shape CHECK forces `org_node_id IS NULL` on an `INITIATIVE` row.
`IMPLEMENTATION_PLAN_WORKFORCE_CAPACITY.md` records this as a correction to the analysis's
original claim.

### Rules
**OBSERVED** — `orgNodeId` must reference a node with `isPortfolioArea = true` and
`isActive = true` (`initiatives.service.ts:202,287`).
**OBSERVED** — Status has a validated transition graph (`initiatives.schema.ts`
"Valid status transitions (milestone flow)").

### Ambiguity
**OBSERVED** — An initiative has three owner-ish fields (`businessOwnerId`,
`productOwnerId`, `productLeaderId`) all pointing at `User`, plus `orgNodeId` pointing at an
org node flagged `isPortfolioArea`, plus `portfolioAreaId` pointing at the separate
`PortfolioArea` table. Five ownership hooks, two of them for "portfolio area".

### Confidence
**HIGH** for the entity; **MEDIUM** for what owns it.

---

## 11. Project

### Current term
`Project`.

### Where it appears
`schema.prisma:1701-1737`; `work-catalog.service.ts`; `/api/workforce/projects`;
`AddAllocationDialog.tsx` (inline creation).

### Observed meaning
**OBSERVED** — `name`, optional unique `code`, `description`, **two independent nullable
parents** (`orgNodeId`, `initiativeId`), optional `startDate`/`endDate`, `isActive`, and
unpopulated `externalSource`/`externalRef` fields.

**OBSERVED** — Schema comment: *"Both parents optional and independent: a project may hang
off a product, an initiative, both, or neither"* (`schema.prisma:1710-1712`).

**OBSERVED** — *"Retired rather than deleted. Deleting would cascade allocation rows away, and
there is no hard-delete endpoint for that reason"* (`schema.prisma:1719-1721`).

**OBSERVED** — `externalSource`/`externalRef`: *"Populated by later integration work; nothing
writes it in v1"*.

### Ambiguity
**OBSERVED** — `Project` and `Initiative` are structurally near-identical as allocation
targets: both are optional-parent containers, both take an optional `workCategory` narrowing,
both are reached by attribution, both produce a `TargetBucket`. The only encoded difference is
that a Project may hang off an Initiative and not vice versa.
**OBSERVED** — There is no UI to browse, edit or archive a Project.
`IMPLEMENTATION_PLAN_WORKFORCE_CAPACITY.md` lists gap **12c**: *"`PUT` and `/archive` exist on
the API with no caller; fixing a mistyped project name needs an API call"*.

### Confidence
**MEDIUM** — the entity exists and is fully wired, but is barely reachable and has no
distinguishing behaviour from Initiative.

---

## 12. WorkItem

### Current term
`WorkItem`.

### Where it appears
`schema.prisma:1739-1774`; `work-catalog.service.ts`; `/api/workforce/work-items`;
`AddAllocationDialog.tsx`.

### Observed meaning
**OBSERVED** — `title`, `description`, **three independent nullable parents** (`orgNodeId`,
`initiativeId`, `projectId`), a **required** `workCategory`, `isActive`, unpopulated external
refs.

**OBSERVED** — Schema comment: *"Both are deliberately thin. Neither carries estimates or
skillDemand: that is ScopeItem's job, and a second set of demand numbers would immediately
diverge from it. These exist to be a *home for capacity*, not a Jira replacement"*
(`schema.prisma:1690-1694`).

**OBSERVED** — The four legal shapes are enumerated in the schema header
(`schema.prisma:1679-1685`):
```
Product -> Work Item
Product -> Initiative -> Work Item
Product -> Project -> Work Item
Product -> Initiative -> Project -> Work Item
```

### Rules
**OBSERVED** — `workCategory` is required: *"a null here would put the item outside every
category roll-up"*.
**OBSERVED** — Changing an item's category re-syncs `WorkforceAllocation.work_category` with
a single `updateMany`.

### Ambiguity
**OBSERVED** — `WorkItem` vs `ScopeItem` vs `IntakeItem` are three "unit of work" entities.
The analysis distinguishes them as *"`ScopeItem` = estimation inside an initiative;
`IntakeItem` = Jira mirror; `WorkItem` = a persistent home for demand"*. `ScopeItem.initiativeId`
is NOT NULL, which is the structural reason `WorkItem` was created.

### Confidence
**MEDIUM.**

---

## 13. OrgNode / OrgMembership / EmployeeOrgUnitLink

See ORGANIZATION_SEMANTICS.md for the full treatment. Summary:

**OBSERVED** — `OrgNode` is a materialized-path tree with `type ∈ {ROOT, DIVISION, DEPARTMENT,
TEAM, VIRTUAL, PRODUCT, PLATFORM, FUNCTIONAL, CHAPTER}`, a nullable `managerId`, and a
Boolean `isPortfolioArea` flag orthogonal to `type`.

**OBSERVED** — Three parallel "person belongs to org" mechanisms:
`Employee.managerId` (reporting line), `OrgMembership` (structural placement, temporal),
`EmployeeOrgUnitLink` (matrix affiliation with `relationshipType`, `allocationPct`,
`consumeCapacity`, temporal).

**OBSERVED** — `orgstructure.md`: *"An employee's manager and their org node leader may be
different people."*

### Confidence
**HIGH** that all three exist; **LOW** on which is authoritative for any given question.

---

## 14. SkillPool / TokenSupply / TokenDemand / TokenCalibration

### Current term
Token planning.

### Where it appears
`schema.prisma:1244-1337`; `planning/token-flow-model.ts`; `planning/derive-demand.ts`;
`planning/derive-supply.ts`; `/api/scenarios/:id/token-*`; `TokenLedger.tsx`.
Gated on `token_planning_v1`.

### Observed meaning
**OBSERVED** — A pooled capacity abstraction. `TokenSupply` and `TokenDemand` are per
(scenario, skillPool). `TokenCalibration.tokenPerHour` converts hours to tokens.

**OBSERVED** — Supply and demand are pooled on **different axes**: demand is derived
per-initiative from `ScopeItem` estimates (`derive-demand.ts`), supply is derived per-pool
from workforce hours (`derive-supply.ts`). There is no per-initiative supply.

**OBSERVED** — Skill→pool resolution is **by lowercase name match** in both directions
(`derive-demand.ts:60-66`; `derive-supply.ts`). `SkillPool` has no FK relation to `Skill`,
`Employee` or `JobProfile`.

**OBSERVED** — An employee's hours are **split across their pools by proficiency share**, not
duplicated into each, *"because supply there is summed across pools and compared against
demand, so one engineer with two skills would invent capacity"*. A zero-proficiency roster
falls back to an even split.

**OBSERVED** — `capacity-supply.getSkillCapacity` deliberately **double-counts** the same
employee into every skill they hold, *"where overlap is the point"*. Two capacity functions,
opposite conventions, both live.

**OBSERVED** — Unattributable hours are reported as `unattributedHours` with a warning rather
than dropped, so attributed + unattributed equals the deployable total.

**OBSERVED** — `TokenSupply.source` (`MANUAL | DERIVED_WORKFORCE`) guards hand-typed numbers.
`tokenSupplyService.upsert` stamps `MANUAL` on update as well as create: *"A human touching a
row is exactly what makes it manual."*

### Ambiguity
**OBSERVED** — `CLAUDE.md` documents `derive-token-demand` as an endpoint. It is not one —
`deriveTokenDemand` is exported from `derive-demand.ts` and has **no route and no caller**.
Recorded in the implementation plan's debt register.

### Confidence
**HIGH** for supply; **MEDIUM** for demand (derivation exists but is unreachable).

---

## 15. Period

### Current term
`Period`.

### Where it appears
`schema.prisma:244-281`; `period.service.ts`; every temporal calculation.

### Observed meaning
**OBSERVED** — `type ∈ {WEEK, MONTH, QUARTER}`, with `parentId` chaining week → month →
quarter, `@@unique([type, year, ordinal])`.

**OBSERVED** — ISO weeks are seeded by `periodService.seedPeriods`. The workforce plan service
**seeds on demand** when a horizon runs past the seeded range, and seeds `year-1 .. year+1`
when resolving a week, *"because an ISO week can belong to the neighbouring calendar year"*.

**OBSERVED** — The single rule for quarter membership: *"A week belongs to the period its
**Monday** falls in. An ISO week straddling a quarter boundary therefore lands wholly on one
side, which is what stops two weeks of the same employee being counted in two quarters"*
(`workforce-plan.service.ts:270-277`).

### Confidence
**HIGH.**

---

## 16. CapacityCalendar

### Current term
`CapacityCalendar.hoursAvailable`.

### Where it appears
`schema.prisma:479-497`; `capacity.service.ts`; `scenario-calculator.service.ts:885-901`;
`baseline.service.ts`.

### Observed meaning
**OBSERVED** — **The field has two contradictory readings, live simultaneously.**
`ANALYSIS_WORKFORCE_CAPACITY.md` fact 7 counts them 2-to-1:

| Reader | Reads `hoursAvailable` as | Evidence |
|---|---|---|
| `capacity.calculateAvailability` | **PTO to subtract** | `const ptoHours = capacityMap.get(period.id) \|\| 0; availableHours = baseHours - allocatedHours - ptoHours` (`capacity.service.ts:198-200`) |
| `baseline.captureSnapshot` | **PTO to subtract** | `hoursPerWeek * 13 - hoursAvailable` |
| `scenario-calculator.getBaseHoursForPeriod` | **the base available hours themselves** | `if (entry) return entry.hoursAvailable;` (`scenario-calculator.service.ts:892-895`) |

**OBSERVED** — The workforce path does not read this field at all.

**SOURCE-ASSERTED INTENT** — The repository's debt register describes
`capacityEffect = UNAVAILABLE` rows as the replacement and lists choosing one legacy meaning as
a migration candidate. No migration is proposed by this evidence package.

### Confidence
**HIGH** that the ambiguity exists — it is documented in two places in the repository itself.

---

## 17. Employee Census Import

### Current term
"Employee census import"; `EmployeeCensusImportBatch` / `Row`.

### Where it appears
`schema.prisma:1427-1524`; `employee-census.{parser,mapper,service}.ts`;
`jobs/processors/employee-census-publish.processor.ts`; `census-allocation-proposal.ts`;
`/api/employee-census/*`; `/admin/employee-import`.

### Observed meaning
**OBSERVED** — Staged XLSX import: upload → review the diff → publish. Nothing reaches
`Employee` until publish is called with `{ confirm: true }`.

**OBSERVED** — Source columns: `Employee ID`, `Full Name`, `Supervisory Organization`,
`Position`, `Job Title`, `Job Family`, `Worker's Manager`, and `L2`–`L9`.

**OBSERVED** — Domain rules encoded in the mapper (`employee-census.mapper.ts`):
- `Position` annotations peel off iteratively: `(On Leave)` → review badge;
  `(Close:MM/DD/YYYY)` → proposed `activeEnd`; anything else (`(DE)`, `(UK)`, `(SI/HR)`) →
  a region code that is *recorded but unused*.
- `Job Title` is the clean role; `Position` is the fallback.
- `activeEnd` is only ever set, never cleared.
- A manager name's trailing parenthetical is stripped before resolution.
- A **self-managed** row is the org root and imports with `managerId: null`.
- Manager **cycles** are detected and block the row, because `resources.service.ts` only
  guards direct self-management and nothing downstream would catch `A→B→A`.
- `Supervisory Organization` parses as `Division - Team (Manager)`, also accepting
  division-only and nested parentheses.
- `L2`–`L9` are *"a redundant denormalisation of the manager chain, used only as a
  cross-check; a mismatch is a warning, never an error"*.

**OBSERVED** — Issue codes: `MISSING_EMPLOYEE_ID`, `MISSING_FULL_NAME`, `MISSING_ROLE`,
`DUPLICATE_EMPLOYEE_ID`, `DUPLICATE_FULL_NAME`, `MANAGER_MISSING`, `MANAGER_NOT_FOUND`,
`MANAGER_CYCLE`, `MULTIPLE_ROOTS`, `L_CHAIN_MISMATCH`, `UNPARSEABLE_CLOSE_DATE`,
`UNPARSEABLE_SUPERVISORY_ORG`.

**OBSERVED** — The importer writes **employees and manager links only**. Supervisory
Organization and the L-columns are shown in a read-only "Org preview" tab; no `OrgNode`,
`EmployeeOrgUnitLink` or `JobProfile` rows are created.

### Confidence
**HIGH.**

---

## 18. Attribution

### Current term
`attributionOf` / `AttributionVia` / `WorkClass`.

### Where it appears
`workforce-aggregation.service.ts` (exported as of `e24aeab`);
`scenario-initiative-link.service.ts`.

### Observed meaning
**OBSERVED** — Deciding which initiative or org node a row's effort belongs to, by walking the
*work's own home* rather than the allocation's shape:
```
INITIATIVE -> itself
PRODUCT    -> its org node
PROJECT    -> its initiative, else its org node
WORK_ITEM  -> its initiative, else its project's initiative,
              else its org node, else its project's org node
CATEGORY / RESERVED -> nothing
```

**OBSERVED** — `WorkClass` is a three-way headline bucket: `INITIATIVE | PRODUCT | CATEGORY`,
assigned by whichever attribution field is non-null first.

**OBSERVED** — This is the *fourth* consumer of one rule and the file says so. It also names
its own counter-example: `targets()` builds its `initiatives` bucket with
`buckets.filter(b => b.targetType === INITIATIVE)`
(`workforce-aggregation.service.ts:330`), which reports **zero** for an initiative whose work
is entirely filed as work items.

### Ambiguity
**OBSERVED** — Two different answers to "how much is Initiative X costing" ship in the same
service. The implementation plan's own risk register flags this as unresolved.

### Confidence
**HIGH** — including high confidence that the inconsistency is real, since the repository
documents it.

---

## 19. PortfolioArea vs isPortfolioArea

### Current term
Both `PortfolioArea` (a table) and `OrgNode.isPortfolioArea` (a Boolean).

### Where it appears
`schema.prisma:283-300` (table); `schema.prisma:953` (flag); `portfolio-areas.service.ts`;
`org-tree.service.ts:539-548`; `initiatives.service.ts`; `intake-request.service.ts`;
`rollup.service.ts:rollupByPortfolioArea`.

### Observed meaning
**OBSERVED** — `PortfolioArea` is a **flat, name-only lookup table** (`id`, `name` unique,
timestamps) with two relations: `initiatives` and `intakeRequests`. No hierarchy, no manager,
no employee relation.

**OBSERVED** — `OrgNode.isPortfolioArea` is a Boolean flag on the tree, orthogonal to `type`.
`Initiative.orgNodeId` and `IntakeRequest.orgNodeId` **both validate that the referenced node
has `isPortfolioArea = true`** (`initiatives.service.ts:202,287`;
`intake-request.service.ts:185,267`).

**OBSERVED** — `Initiative` carries **both** `portfolioAreaId` (the table) and `orgNodeId`
(the flagged node). Both are optional. Nothing reconciles them.

**SOURCE-ASSERTED INTENT** — The implementation's entity-reuse audit rejected
`PortfolioArea` as the home for "Product", describing it as *"a flat `name`-only lookup for
rollups with no hierarchy and no employee relation"*
(`IMPLEMENTATION_PLAN_WORKFORCE_CAPACITY.md` §0). This is historical source intent, not a V2
decision.

### Confidence
**HIGH** that both exist; **LOW** on the intended distinction.

---

## 20. Concepts that are named but inert

**OBSERVED** — Each of these is declared and reachable in the schema or a type, and has no
production reader, no writer, or no route:

| Concept | Status |
|---|---|
| `WorkforceAllocStatus.ACTUAL` | never written, never read by a calculation |
| `summarizeWeek(rows, { capacityPct })` | no production caller passes the option |
| `Project.externalSource` / `externalRef` | *"nothing writes it in v1"* |
| `WorkItem.externalSource` / `externalRef` | same |
| `deriveTokenDemand` | exported, no route, no caller; `CLAUDE.md` documents a route that does not exist |
| `Project` `PUT` and `/archive` endpoints | exist with no UI caller |
| `AllocationTargetType.PROJECT` / `WORK_ITEM` | declared up front in the first migration *"though rejected by both the service and the CHECK constraint until their tables exist"* |
| `OrgNodeType.VIRTUAL`, `FUNCTIONAL`, `CHAPTER` | declared; no behaviour branches on them |
| `EmployeeCensusImportRow` region code | *"recorded but unused"* |
| `regionCode` in the census mapper | parsed, stored on the mapped row, never persisted |

**INFERRED** — This list is the clearest signal of where the model anticipated a domain
distinction that has not yet been needed or settled.
