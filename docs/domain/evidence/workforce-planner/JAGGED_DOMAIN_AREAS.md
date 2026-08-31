# JAGGED DOMAIN AREAS

Places where the code indicates the underlying domain has not been settled. Each entry gives
the evidence, the competing concepts, and the unanswered question. **No resolutions proposed.**

---

## J1 — Three live "allocation percentage" concepts

**Evidence**
- `Allocation.percentage` — scenario-scoped, quarter-clamped, initiative-only.
- `WorkforceAllocation.allocationPct` — plan-scoped, week-atomic, six target types.
- `EmployeeOrgUnitLink.allocationPct` + `consumeCapacity` — org affiliation with a capacity
  claim, and its own `validateAllocationTotal` that **hard-rejects above 100%**
  (`employee-org-link.service.ts:531-561`).
- **SOURCE-ASSERTED INTENT** — The repository's analysis calls the third a *"true duplicate"*
  of the second and recommends retaining affiliation while deprecating the capacity columns.
- **OBSERVED** — Nothing has been deprecated. The recommendation is recorded as source intent,
  not proposed here as a resolution.

**Competing concepts** — "the share of a person's time claimed by an organizational unit"
versus "the share of a person's time planned against a piece of work". The org-link model says
these are the same thing; the workforce model says they are different.

**Unanswered question** — Does belonging to an org unit consume capacity, or does only work
consume capacity? The two implementations answer oppositely and both are live.

---

## J2 — Over-allocation is both forbidden and required

**Evidence**
- `WorkforceAllocation`: over-allocation is *"never rejected … A manager has to be able to see
  120% in order to fix it"* (`workforce-allocation.service.ts:33-36`), and `overAllocatedPct`
  is a first-class output.
- `EmployeeOrgUnitLink`: `ValidationError` — *"Total capacity-consuming allocation would be
  110% … Maximum is 100%"*.
- Per-row on `WorkforceAllocation`, `allocationPct` **is** capped at 100
  (`workforce.schema.ts:124`), with the message explaining that over-allocation is
  cross-row.

**Competing concepts** — over-allocation as a *data error to prevent* versus over-allocation
as a *planning signal to surface*.

**Unanswered question** — Is exceeding 100% an invalid state or an informative one? The answer
currently depends on which table you write to.

---

## J3 — `PRODUCT` is a target type with no entity

**Evidence**
- `AllocationTargetType.PRODUCT` resolves to `orgNodeId` where the node type is any of
  `PRODUCT, PLATFORM, TEAM, DIVISION, DEPARTMENT` — a list declared **three times**
  (`workforce-allocation.service.ts:39-45`, `census-allocation-proposal.ts:44-51`,
  `AddAllocationDialog.tsx:28`).
- The UI calls the picker *"Product or team"* and the group *"Products and teams"*.
- The entity-reuse audit: *"'product' is a service-layer convention over `OrgNodeType`, not a
  schema guarantee."*
- `OrgNodeType.PRODUCT` is described in the analysis as *"an enum value with no product
  semantics attached"*.

**Competing concepts** — Product as a **value-stream ownership boundary** (PRD §2.1: *"a
persistent organizational/value-stream ownership boundary"*) versus Product as **a node in the
reporting tree**.

**Unanswered question** — Is a Product an organizational unit, or a thing an organizational
unit owns? The model says the first; the PRD's language says the second. A `DIVISION` being an
acceptable "product" target is the visible cost.

---

## J4 — Two implementations of "portfolio area"

**Evidence**
- `PortfolioArea` — a flat table with `id`, `name` (unique), timestamps. No hierarchy, no
  manager, no employee relation. Referenced by `Initiative.portfolioAreaId`.
- `OrgNode.isPortfolioArea` — a Boolean on the tree. Referenced by `Initiative.orgNodeId`, and
  **validated**: `initiatives.service.ts:202,287` and `intake-request.service.ts:185,267` all
  reject a node with `isPortfolioArea = false`.
- `Initiative` carries **both**, both optional, and nothing reconciles them.
- Two roll-up functions: `rollupByPortfolioArea` and `rollupByOrgNode`.

**Competing concepts** — portfolio area as a **flat reporting label** versus portfolio area as
**a position in the org tree**.

**Unanswered question** — Which is the portfolio's organizing axis? And what does an initiative
mean when it names two different ones?

---

## J5 — Two answers to "how much is Initiative X costing"

**Evidence**
- `targets()` builds its initiative bucket as
  `buckets.filter(b => b.targetType === INITIATIVE)`
  (`workforce-aggregation.service.ts:330`).
- `initiativeContributors`, `classOf`, `summarize` and `scenarioInitiativeStaffing` all use
  `attributionOf`, which walks the work's own home.
- Consequence: an initiative whose work is entirely filed as work items reports **zero** in the
  first and correctly in the second. There is an explicit regression test for the second
  (`scenario-initiative-link.test.ts`).
- The implementation plan's risk register records this as unresolved: *"Two initiative FTE
  numbers on one page that disagree."*

**Competing concepts** — "what the allocation named" versus "where the work lives".

**Unanswered question** — When someone allocates to a work item under an initiative, are they
allocating to the item or to the initiative? Both readings are implemented and shipped.

---

## J6 — `Initiative` is the planning container, the execution parent, AND the investment class

**Evidence**
- Scenarios rank initiatives (`priorityRankings`) — planning container.
- `Project.initiativeId`, `WorkItem.initiativeId`, `ScopeItem.initiativeId` — execution parent.
- `outsideInitiativesFte` / `outsideInitiativesPct` compute the strategic-vs-BAU split purely
  from whether work attributes to an initiative — investment class.
- `WorkClass = 'INITIATIVE' | 'PRODUCT' | 'CATEGORY'` assigns the class by attribution alone.
- **There is no investment-classification field anywhere in the schema.**

**Competing concepts** — "strategic" as a *property of work* versus "strategic" as *membership
of an initiative*.

**Unanswered question** — Can work be strategic without an initiative, or non-strategic inside
one? Today: no, in both directions. An initiative at `status = PROPOSED` contributes to the
strategic share exactly like one `IN_EXECUTION`.

---

## J7 — `Project` and `Initiative` are behaviourally interchangeable

**Evidence** — as allocation targets both are: an optional-parent container; narrowable by an
optional `workCategory`; reached by `attributionOf`; rendered as a `TargetBucket`; retired
rather than deleted. The only encoded asymmetry is `Project.initiativeId` — a project may hang
off an initiative and not the reverse.
`Project` has no admin UI at all (gap 12c).

**Competing concepts** — "temporary outcome" versus "execution container". The PRD asserts the
distinction (*"Initiative = temporary strategic outcome/change. Project = optional execution
container."*); the schema does not encode it.

**Unanswered question** — What can a Project express that an Initiative cannot? Nothing in the
code answers this.

---

## J8 — Polymorphic targets via four nullable FKs plus a string key

**Evidence**
- Four nullable FKs (`orgNodeId`, `initiativeId`, `projectId`, `workItemId`) plus a canonical
  `targetKey` string, plus a database CHECK constraint enumerating six branches, plus a
  `target-key.ts` module of ~250 lines to build and parse the key, plus a **mirrored client
  copy** of the key grammar in `AddAllocationDialog.tsx` for duplicate detection.
- The stated reason the string exists: Postgres treats NULLs as distinct, so a unique index
  over the FK set *"would happily accept two identical 'Pricing Platform 30%' rows"*.
- Two of the six enum members were *declared before their tables existed* and rejected by both
  the service and the CHECK constraint until Phase 12, *"to avoid an `ALTER TYPE ... ADD VALUE`
  migration later"*.

**Competing concepts** — targets as a **closed set of typed relationships** versus targets as
**one abstract "thing work can be assigned to"**.

**Unanswered question** — Are these six genuinely different kinds of target, or six views of
one concept ("a place work lives") that happens to have several tables? The volume of
machinery required to keep them apart is the signal.

---

## J9 — `capacityPct` is designed for and never used

**Evidence** — `summarizeWeek(rows, { capacityPct })` exists, is documented
(*"A 0.6 FTE employee planned as a full 100% of *their* week is fully committed, so this is not
simply hoursPerWeek"*), and is **tested** — and no production caller anywhere passes it. The
grid's TOTAL row calls `summarizeWeek(cells)` with no options.

**Competing concepts** — "100% means all of this person's contracted week" versus "100% means
one nominal FTE, and a person may have less than 100% capacity".

**Unanswered question** — How is reduced capacity (partial leave, phased return, a 0.6 FTE
contract mid-quarter) meant to be expressed? Three mechanisms could carry it — `hoursPerWeek`,
a `RESERVED` row, `capacityPct` — and the model commits to none.

---

## J10 — `CapacityCalendar.hoursAvailable` has two contradictory meanings

**Evidence** — documented in the repository itself
(`ANALYSIS_WORKFORCE_CAPACITY.md` fact 7), counted 2-to-1:
- `capacity.calculateAvailability` **subtracts** it as PTO
  (`availableHours = baseHours - allocatedHours - ptoHours`).
- `baseline.captureSnapshot` agrees (`hoursPerWeek * 13 - hoursAvailable`).
- `scenario-calculator.getBaseHoursForPeriod` **returns it as the base hours themselves**
  (`if (entry) return entry.hoursAvailable;`).

**Competing concepts** — a calendar of *unavailability* versus a calendar of *availability*.

**Unanswered question** — Which is it? The field name says the second; two of three readers
assume the first. The workforce path sidesteps it entirely by never reading the field.

---

## J11 — Three unrelated things called "baseline"

**Evidence**
- `WorkforcePlan.isBaseline` — a rolling baseline of people's time, continuously edited.
- `ScenarioType.BASELINE` + `BaselineSnapshot` + `DriftAlert` — a frozen quarter of initiative
  staffing, captured once at lock time and immutable.
- `Scenario.isPrimary` — a third "the real one" flag.

The entity-reuse audit states the distinction: *"`BaselineSnapshot` freezes **one quarter's
initiative staffing**, demand-side, captured once at lock time and immutable. A workforce plan
is a rolling baseline of **people's time**, supply-side, continuously edited across 26 weeks."*

**Competing concepts** — baseline as *an immutable snapshot to measure drift against* versus
baseline as *the current living plan*.

**Unanswered question** — What is "the plan of record"? Three flags claim it on different axes,
and nothing relates them.

---

## J12 — `WorkforceAllocStatus` is recorded and inert

**Evidence**
- `ACTUAL | COMMITTED | PLANNED | PROPOSED`, default `PLANNED`.
- **No calculation reads it.** Every capacity computation and supply derivation filters on
  `capacityEffect`.
- **Nothing transitions it.** Census proposals land as `PROPOSED` and *"a manager confirms by
  promoting the status"* — no code performs the promotion, and there is no UI for it.
- `ACTUAL` is never written by anything. The analysis: drift detection *"is what earns PRD §9's
  `ACTUAL` status its place. **Not v1**"*.
- Consequence: an unconfirmed import proposal counts toward committed capacity, over-allocation
  and token supply exactly like a manager's deliberate commitment.

**Competing concepts** — planning certainty as *a filter on what counts* versus planning
certainty as *a label for humans*.

**Unanswered question** — Should a `PROPOSED` allocation consume capacity?

---

## J13 — Capacity arithmetic is deliberately duplicated across the wire

**Evidence** — `packages/backend/src/services/workforce/capacity-math.ts` and
`packages/frontend/src/lib/workforce-capacity.ts` implement the same functions. The frontend
file states: *"The duplication is not an oversight … a round trip per keystroke would make the
grid feel like a form. There is no shared package in this monorepo to put it in … The server
remains authoritative."* Both are pinned by matching test suites. Recorded in the debt register.

**Competing concepts** — a single domain service owning the arithmetic versus a responsive
grid.

**Unanswered question** — This is the one jagged area with a stated, deliberate rationale. The
open question is structural (does a shared package appear?), not domain — but it means
"the rule" now lives in two places and the third copy (`AddAllocationDialog`'s `keyFor`) is a
fourth mirroring of server logic on the client.

---

## J14 — Two opposite conventions for splitting an employee across skills

**Evidence**
- `capacity-supply.getSkillCapacity` **double-counts** an employee into every skill they hold,
  *"where overlap is the point"*.
- `derive-supply.ts` **splits by proficiency share**, because summing across pools *"would
  invent capacity"*.
- Both are live, in adjacent modules, on the same data.

**Competing concepts** — skill capacity as *"how many hours are available with this skill"*
versus skill capacity as *"how the person's time divides across pools"*.

**Unanswered question** — What is a skill pool a pool *of*? Both readings are defensible and
the model implements both without naming the difference in either function's name.

---

## J15 — Supply is pooled, demand is per-initiative

**Evidence** — `TokenSupply` is per (scenario, skillPool). `TokenDemand` is per (scenario,
skillPool) but **derived per-initiative** from `ScopeItem` estimates. The phase-17 work
explicitly declined to merge them: *"splitting a pool across initiatives needs an allocation
rule that does not exist yet."*
The reconciliation therefore prints `plannedHoursInQuarter` and `estimatedTotalHoursP50` side
by side and **derives no ratio**, because *"the estimate is total un-timeboxed effort and the
planned hours are one quarter's worth."*

**Competing concepts** — capacity as *fungible pooled supply* versus capacity as *assigned to
specific work*.

**Unanswered question** — Can an initiative's supply be stated at all, or only its demand?

---

## J16 — Org structure is current-state; allocation is a time series

**Evidence** — allocation rows are week-atomic and immutable-by-week. Every structural
relationship they attribute through is a **mutable scalar FK with no history**:
`Employee.hoursPerWeek`, `Employee.managerId`, `OrgNode.path`, `Initiative.orgNodeId`,
`Project.initiativeId`, `WorkItem.initiativeId`, `WorkItem.workCategory`.
Attribution runs at read time, so re-filing a work item retroactively moves every past week of
effort. `OrgNode` `/move` recomputes paths with no history, silently changing every past
subtree roll-up.
The one deliberate exception is `activeEnd`, which is set but never cleared.

**Competing concepts** — reporting as *"what we believe today about the past"* versus reporting
as *"what was true at the time"*.

**Unanswered question** — Should a reorganisation change historical reports? `OrgMembership`
and `EmployeeOrgUnitLink` both retain history and are the only structures that could answer
"as at", and no query uses them that way.

---

## J17 — `WorkCategory` mixes work purposes with non-work

**Evidence** — `MANAGEMENT` and `TIME_OFF` sit in the same enum as `FEATURE` and `BUG`, and the
schema comment admits the reason is structural: *"so overhead has a category rather than a
null"*. `CapacityEffect` then exists partly to undo that mixing.
`PLATFORM` is both a `WorkCategory` and an `OrgNodeType`. `SUPPORT` is a `WorkCategory`, an
`AllocationType` member, and a documented `CapacityEffect` special case.

**Competing concepts** — a category enum as *"what kind of work is this"* versus as *"what is
this row of the plan"*.

**Unanswered question** — Is PTO a kind of work? The enum says yes, `CapacityEffect` says no,
and both are needed to get the arithmetic right.

---

## J18 — A scenario's initiative set is untyped JSONB

**Evidence** — `Scenario.priorityRankings` is `Json?` holding `{ initiativeId, rank }[]`, read
by at least five call sites (`derive-demand.ts:45`, `scenario-calculator.service.ts:96`,
`allocation.service.ts:852,999`, `view-refresh.processor.ts:122`), each casting it
independently. It has no `source` column, which is the stated reason the phase-17 derivation
*cannot* express the `MANUAL`-protection rule and enforces append-only structurally instead.
The read path parses it leniently (a bad entry yields a null rank); the write path parses it
strictly and **refuses to rewrite an array it cannot parse**.

**Competing concepts** — scenario membership as *a ranked list* versus as *a relationship*.

**Unanswered question** — Is "the initiatives in a scenario" a first-class relationship? Today
it is a JSON blob, while the *staffing* of those same initiatives is a fully-indexed table.

---

## J19 — Rules encoded in the UI rather than a domain service

**Evidence**
- `keyFor()` in `AddAllocationDialog.tsx` reproduces the server's canonical `targetKey`
  grammar to detect duplicates client-side.
- `PRODUCT_NODE_TYPES` is declared in the frontend as well as twice in the backend.
- `LIVE_STATUSES` / `CLOSED_STATUSES` — which initiative statuses may be picked for a new
  allocation — exist **only** in `AddAllocationDialog.tsx`. The server accepts an allocation to
  a `COMPLETE` or `CANCELLED` initiative.
- `workforce-capacity.ts` mirrors the whole capacity arithmetic.

**Competing concepts** — the UI as a *view* versus the UI as a *second rule engine*.

**Unanswered question** — Is "you may not staff a completed initiative" a domain rule? It is
enforced in exactly one place, and that place is a React component.

---

## J20 — Two entities named "Item" that are not the same, and one that is a mirror

**Evidence** — `WorkItem` (allocatable, thin, required `workCategory`, nullable initiative),
`ScopeItem` (estimation, `NOT NULL` initiative, `skillDemand` JSONB, P50/P90),
`IntakeItem` (Jira read-mirror, `jiraSiteId`/`jiraIssueId` NOT NULL).
`WorkItem` exists *because* `ScopeItem.initiativeId` is NOT NULL, and stays thin *because* a
second set of demand numbers *"would immediately diverge"* from `ScopeItem`'s.

**Competing concepts** — a unit of work as *a thing to estimate* versus *a thing to staff*
versus *a thing tracked elsewhere*.

**Unanswered question** — Should the thing you estimate and the thing you staff be the same
record? The model says no, and pays for it: an initiative's demand (`ScopeItem` hours) and its
supply (`WorkforceAllocation` hours) live in unrelated tables that the reconciliation endpoint
prints side by side without comparing.

---

## J21 — Concepts declared and inert

**Evidence** — see WORKFORCE_DOMAIN_EVIDENCE.md §20. Fourteen items, including
`WorkforceAllocStatus.ACTUAL`, `capacityPct`, `deriveTokenDemand` (exported, no route, and
`CLAUDE.md` documents a route that does not exist), `Project`'s `PUT`/`archive` endpoints,
`OrgNodeType.VIRTUAL/FUNCTIONAL/CHAPTER`, and the census `regionCode`.

**Competing concepts** — anticipating a distinction versus needing one.

**Unanswered question** — Each inert concept marks a place where someone saw a domain
distinction coming and the product has not yet required it. They are the cheapest list of
"things the domain might need" the repository offers.

---

## J22 — The redesign's vocabulary is absent from the implementation

**Evidence** — zero occurrences of `Workstream`, `Product Portfolio`, `Product VP`,
`Product Area`, `Product Workstream Leader`, `OEM Division`, `Sustain`, `New Development`.
`OEM` appears only as test fixture data; `BAU` only in a UI hint string and prose.
There is **no Product/Engineering distinction of any kind** — no enum, column, flag or branch.

**Competing concepts** — a single undifferentiated org tree with a type tag, versus a
Product organization and an Engineering organization with different structures and different
relationships to work.

**Unanswered question** — Is the target vocabulary a renaming of what exists, or a genuinely
different structure? This is the single largest gap for a V2 comparison, and the repository
offers no evidence either way.
