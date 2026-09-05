# Work Classification Evidence

Every way the implementation categorizes work, and what each classification appears to be
doing. Purpose codes used below:

**A** organizational ownership · **B** purpose/type of work · **C** planning container ·
**D** execution container · **E** portfolio investment classification · **F** reporting label

---

## 0. Requested terms that do not exist

**OBSERVED BY ABSENCE** — Zero occurrences in the stated search scope: `New Development` /
`NEW_DEVELOPMENT`, `Sustain` / `SUSTAIN`,
`BAU` as a schema element.

**OBSERVED** — `BAU` appears three times as prose only: a UI hint
(`CapacitySummaryTiles.tsx:67` — *"FTE of product, support and BAU work"*), and
`PRD_WORKFORCE_CAPACITY.md` §14/§19.

**INFERRED** — The nearest thing to "Sustain & Maintenance" is the `MAINTENANCE` and `SUPPORT`
members of `WorkCategory`; the nearest thing to "New Development" is `FEATURE`; the nearest
thing to "BAU" is the *derived* `outsideInitiativesFte` metric (§7 below). None of the three
is a first-class investment class.

---

## 1. `WorkCategory` — the primary classification

**OBSERVED** — `schema.prisma:1570-1583`. Twelve members:
`FEATURE`, `BUG`, `MAINTENANCE`, `TECH_DEBT`, `SUPPORT`, `COMPLIANCE`, `DISCOVERY`,
`PLATFORM`, `OPERATIONS`, `MANAGEMENT`, `TIME_OFF`, `OTHER`.

**OBSERVED** — PRD §4 lists ten of these. The schema comment names the two additions and
why: *"plus MANAGEMENT and TIME_OFF so overhead has a category rather than a null"*.

**OBSERVED** — It appears in **four different roles**:

| Role | Where | Purpose |
|---|---|---|
| The item's purpose | `WorkItem.workCategory`, **required** | **B** |
| A narrowing of a structural target | `WorkforceAllocation.workCategory` on a `PRODUCT`/`INITIATIVE`/`PROJECT` row → key suffix `\|SUPPORT` | **B** + **F** |
| The target's whole identity | `CATEGORY:<X>` — an allocation whose only target is a category | **B** + **C** |
| Non-deployable time's identity | `RESERVED:<X>` — PTO, management | **not work at all** |

**OBSERVED** — Purpose codes it currently serves: **B, C, F**, and (via `RESERVED`) a fourth
thing that is not work.

**OBSERVED** — Internal tensions:
- `MANAGEMENT` and `TIME_OFF` are admitted to exist for a structural reason, not because they
  are kinds of work in the sense `FEATURE` is.
- `PLATFORM` is simultaneously a `WorkCategory` and an `OrgNodeType`.
- `SUPPORT` is a `WorkCategory`, an `AllocationType` member, and a `CapacityEffect`-relevant
  special case (explicitly `DEPLOYABLE` — *"which is real work"*).
- `OPERATIONS` (work) vs `MANAGEMENT` (overhead) vs `TIME_OFF` (absence) are three points on
  a spectrum the `CapacityEffect` enum tries to separate.

---

## 2. `CapacityEffect` — the deployability classification

**OBSERVED** — `DEPLOYABLE | OVERHEAD | UNAVAILABLE`. Schema comment: *"Orthogonal to *what*
the work is (workCategory) and *who* it is for (targetType)."*

**OBSERVED** — Purpose: **B** (a property of the work) used as **E** (whether it counts as
investable capacity).

**OBSERVED** — This is the only classification that changes a *calculation*. Every capacity
number, roll-up and token-supply derivation filters `capacityEffect = DEPLOYABLE`.

**OBSERVED** — `OVERHEAD` and `UNAVAILABLE` are summed identically in `capacity-math.ts`. No
code branches on the difference. The distinction survives only in the default-assignment rule
and the enum name.

---

## 3. `AllocationType` — the legacy classification

**OBSERVED** — `PROJECT | RUN | SUPPORT` on legacy `Allocation` (`schema.prisma:58-62, 545`).

**SOURCE-ASSERTED INTENT** — The repository's analysis calls `AllocationType` a coarse
duplicate and recommends that the newer enum supersede it while the legacy field remains in
place. Phrases such as *"on the wrong entity"* are the source author's design judgment, not
observed domain fact and not a V2 recommendation.

**OBSERVED** — `RUN` is the only place in the entire repository that gestures at "run the
business" / BAU as a class. It has no counterpart in `WorkCategory`.

**OBSERVED** — Purpose: **B** + **E**, stored on the allocation. The same work can therefore
be classified differently by two allocations.

**OBSERVED** — `PROJECT` here means "project-type work", while `AllocationTargetType.PROJECT`
means "targets a Project row", and `Project` is a table. Three meanings, one word.

---

## 4. `Initiative`

**OBSERVED** — PRD §2.1: *"a temporary, outcome-oriented body of change … may affect multiple
Products"*. Guiding statement: *"Initiative = temporary strategic outcome/change."*

**OBSERVED** — What it actually carries: `status` (a 7-state workflow), three `User` owner
fields, an optional single `orgNodeId` restricted to `isPortfolioArea` nodes, an optional
`portfolioAreaId`, `targetQuarter` (String) and `targetPeriodId`, `domainComplexity`,
`deliveryHealth`, `origin`, `customFields` (JSONB). It has `scopeItems` (estimates),
`approvals`, `allocations`, `statusLogs`, `intakeItems`, `intakeRequest`, `projects`,
`workItems`, `workforceAllocations`, `domainFamiliarity`.

**OBSERVED** — Purpose codes served **simultaneously**:
- **C** planning container — it is what a scenario ranks (`priorityRankings`)
- **D** execution container — `Project` and `WorkItem` hang off it
- **E** portfolio investment classification — "strategic vs outside-initiative" is computed
  entirely from whether work attributes to an initiative
- **F** reporting label — every roll-up has an initiative axis
- **A**, partially — `orgNodeId` makes it own a portfolio area

**OBSERVED** — The **E** role is not a field; it is an *absence test*. `summarize()` computes
`outsideInitiativesFte` as everything deployable whose `WorkClass !== 'INITIATIVE'`, and
`outsideInitiativesPct` as its share. The UI tile is labelled *"Outside initiatives"* with the
hint *"FTE of product, support and BAU work"*.

**INFERRED** — "Strategic vs BAU" is currently **derived from structure, not declared**. There
is no investment-class field anywhere. Whether work is strategic is decided by whether someone
filed it under an initiative.

---

## 5. `Project`

**OBSERVED** — PRD §5: *"an optional execution container"*, and explicitly not a mandatory
hierarchy rung. Guiding statement: *"Project = optional execution container."*

**OBSERVED** — Purpose codes served: **C** and **D**, indistinguishably. It has two
independent optional parents (`orgNodeId`, `initiativeId`), optional dates, `isActive`, and no
other semantics.

**OBSERVED** — As an allocation target it behaves **identically to Initiative**: optional
`workCategory` narrowing, reached by attribution, produces a `TargetBucket`.

**OBSERVED** — It has **no admin UI**. Gap 12c in the implementation plan: *"`PUT` and
`/archive` exist on the API with no caller."*

---

## 6. `WorkItem` vs `ScopeItem` vs `IntakeItem`

**OBSERVED** — Three "unit of work" entities.

| | `WorkItem` | `ScopeItem` | `IntakeItem` |
|---|---|---|---|
| Schema | `1739-1774` | `351-368` | `771-813` |
| Initiative link | **nullable** | **NOT NULL** | via conversion |
| Carries estimates | **no** | `estimateP50` / `estimateP90` | no |
| Carries skill demand | **no** | `skillDemand` JSONB | no |
| Carries `workCategory` | **required** | no | no |
| Jira fields | unused `externalSource`/`Ref` | none | `jiraSiteId`/`jiraIssueId` **NOT NULL** |
| Allocatable | **yes** | no | no |
| Purpose | **A + C + D** | **B-adjacent: estimation** | **F: read-mirror** |

**OBSERVED** — The stated separation: *"`ScopeItem` = estimation inside an initiative;
`IntakeItem` = Jira mirror; `WorkItem` = a persistent home for demand"*
(`ANALYSIS_WORKFORCE_CAPACITY.md`).

**OBSERVED** — The structural reason `WorkItem` exists: *"`ScopeItem.initiativeId` is **NOT
NULL**, so it structurally cannot host PRD §3's 'work item without an initiative' — and it is
an estimation artifact rather than a work home"*.

**OBSERVED** — The reason `WorkItem` stays thin: *"Neither carries estimates or skillDemand:
that is ScopeItem's job, and a second set of demand numbers would immediately diverge from
it."*

**OBSERVED** — The consequence, live as of `d2f6024`: the reconciliation endpoint reports
`plannedHoursInQuarter` (from `WorkforceAllocation`) beside `estimatedTotalHoursP50` (from
`ScopeItem`) and **derives no ratio from them**, because the two cover different windows and
attach to different entities. Demand and supply for one initiative therefore come from two
unrelated tables that cannot be compared arithmetically.

---

## 7. Derived classifications (computed, never stored)

**OBSERVED** — `WorkClass = 'INITIATIVE' | 'PRODUCT' | 'CATEGORY'`
(`workforce-aggregation.service.ts:610`). Assigned by `classOf()`: whichever attribution field
is non-null first — initiative wins, then org node, then neither.

- Purpose: **E** + **F**. This is the actual investment-class axis in the product.
- **OBSERVED** — It is computed at read time from the work's parents, so re-filing a work item
  changes its class retroactively for every past week.

**OBSERVED** — `outsideInitiativesFte` / `outsideInitiativesPct` on `CapacitySummary`.
Doc comment: *"Deployable capacity committed outside any formal initiative."* This is the
strategic-vs-BAU split of PRD §19 Q7–Q8, and it is a *residual*, not a category.

**OBSERVED** — `AttributionVia = 'DIRECT' | 'PROJECT' | 'WORK_ITEM' | 'NONE'` (added `e24aeab`)
— reports *how* effort reached an initiative, so `directFte` / `viaProjectFte` /
`viaWorkItemFte` can be separated. Purpose: **F** only.

---

## 8. Classifications on other axes that touch work

| Concept | Values | Purpose | Note |
|---|---|---|---|
| `InitiativeStatus` | PROPOSED, SCOPING, RESOURCING, IN_EXECUTION, COMPLETE, ON_HOLD, CANCELLED | **F** + workflow | validated transition graph |
| `InitiativeOrigin` | INTAKE_CONVERTED, DIRECT_PM, LEGACY | **F** | provenance |
| `DomainComplexity` | on Initiative | ramp modifier input | feeds `ramp.service.ts` |
| `DeliveryHealth` | ON_TRACK, AT_RISK, DELAYED | **F** | |
| `WorkforceAllocStatus` | ACTUAL, COMMITTED, PLANNED, PROPOSED | planning certainty | **no calculation reads it** |
| `WorkforceAllocSource` | IMPORT, MANAGER, SYSTEM_INFERRED, SCENARIO, EXTERNAL_SYSTEM | provenance | |
| `ScenarioType` | BASELINE, REVISION, WHAT_IF | **C** | |
| `EmployeeOrgRelationshipType` | 5 members | **A** | drives `consumeCapacity` |
| `SkillPool` | free-text name | capability pool | no FK to anything |

---

## 9. Concepts serving more than one purpose

**OBSERVED** — Each of the following carries two or more of the A–F roles at once:

| Concept | Roles | Evidence |
|---|---|---|
| **`Initiative`** | **A, C, D, E, F** | owns a portfolio area; is what scenarios rank; parents projects and work items; defines "strategic"; every roll-up axis |
| **`OrgNode`** | **A, C, F** | the org tree; the `PRODUCT` allocation target; the team roll-up axis; also flagged as a portfolio area |
| **`WorkCategory`** | **B, C, F** | the item's purpose; a standalone allocation target; a target narrowing; the `byWorkCategory` roll-up |
| **`Project`** | **C, D** | no encoded difference between the two |
| **`WorkItem`** | **A, C, D** | its parents *are* its organizational home, and attribution walks them |
| **`AllocationType`** | **B, E** | on the allocation rather than on the work |
| **`WorkforceAllocation.workCategory`** | **B, F** | denormalised from the item on one branch, chosen by the allocator on another |
| **`PortfolioArea` / `isPortfolioArea`** | **A, F** | two implementations, both live |

**OBSERVED** — The clearest single case: **`Initiative` is simultaneously the planning
container, the execution parent, and the investment classification.** "Is this strategic work?"
is answered by "does it attribute to an initiative?", so an organisation cannot express
strategic product work outside an initiative, nor non-strategic initiative work.
`Initiative.status = PROPOSED` work counts toward the strategic share exactly like
`IN_EXECUTION` work.

---

## 10. What the model cannot currently classify

**OBSERVED BY ABSENCE**:

1. **Investment class as a declared property.** No field says "this is Growth / Run / Change".
   It is inferred from initiative membership.
2. **Sustain as a distinct concept.** `MAINTENANCE`, `SUPPORT`, `TECH_DEBT` and `OPERATIONS`
   are four separate categories, none aggregated into a "sustain" bucket by any code.
3. **Capitalisable vs expensed.** No field, despite `CostBand` existing on `JobProfile`.
4. **Committed vs discretionary.** `WorkforceAllocStatus` gestures at it and no calculation
   reads it.
5. **Work that spans two initiatives or two products.** One structural FK per allocation row,
   CHECK-enforced.
6. **A category on a work item's allocation.** `WORK_ITEM` targets take no category suffix by
   design; the item's own category is denormalised on.
