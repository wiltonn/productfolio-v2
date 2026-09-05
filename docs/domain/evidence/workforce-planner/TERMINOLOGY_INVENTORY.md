# Terminology Inventory

Every meaningful term used by the schema, backend, frontend and documentation, with synonyms
and conflicts. Terminology is **not** cleaned up here.

---

## 1. Terms with more than one meaning

| Term | Meaning A | Meaning B | Meaning C |
|---|---|---|---|
| **allocation** | `Allocation` — scenario-scoped, quarter-clamped, initiative-only | `WorkforceAllocation` — plan-scoped, week-atomic, six target types | `EmployeeOrgUnitLink.allocationPct` — an org unit's claim on a person |
| **baseline** | `WorkforcePlan.isBaseline` — rolling plan of people's time | `ScenarioType.BASELINE` + `BaselineSnapshot` — frozen quarter of initiative staffing | `Scenario.isPrimary` — a third "the real one" flag |
| **PROJECT** | `AllocationType.PROJECT` — "project-type work" on a legacy allocation | `AllocationTargetType.PROJECT` — targets a Project row | `Project` — the table |
| **PLATFORM** | `OrgNodeType.PLATFORM` — an org unit | `WorkCategory.PLATFORM` — a kind of work | — |
| **SUPPORT** | `WorkCategory.SUPPORT` — deployable work | `AllocationType.SUPPORT` — legacy work type | `RESERVED:SUPPORT` — overhead (opposite capacity effect) |
| **portfolio area** | `PortfolioArea` — flat name-only table | `OrgNode.isPortfolioArea` — Boolean on the tree | — |
| **capacity** | contracted capacity (`hoursPerWeek`) | deployable capacity (`unallocated`) | `CapacityCalendar.hoursAvailable` (itself two-meaninged) |
| **available** | `availableHours` in `calculateAvailability` (legacy) | explicitly ≠ `unallocated` in the workforce model | `hoursAvailable` as base hours (`scenario-calculator`) |
| **source** | `WorkforceAllocSource` — how an allocation arose | `TokenSupply.source` — MANUAL vs derived | `CapacitySource` — which provider answers | `IntakeSourceType`, `FamiliaritySource` |
| **status** | `WorkforceAllocStatus` | `InitiativeStatus` | `ScenarioStatus`, `WorkforcePlanStatus`, `CensusImportBatchStatus`, `ApprovalRequestStatus` |
| **role** | `Employee.role` — free-text job title | `UserRole` — an authorization enum | `ApprovalRuleType.ROLE_BASED` |
| **manager** | `Employee.managerId` — reporting line | `OrgNode.managerId` — unit leader | "manager" as the planner's user persona |
| **plan** | `WorkforcePlan` — the entity | "the plan" — the baseline specifically | `PlanningService` / `planningMode` — the calculation engine |
| **item** | `WorkItem` | `ScopeItem` | `IntakeItem` |
| **demand** | `TokenDemand` — tokens per pool | `calculateCapacityDemand` — hours | `ScopeItem` estimates |
| **product** | `OrgNodeType.PRODUCT` | `AllocationTargetType.PRODUCT` (accepts 5 node types) | `Initiative.productOwnerId` / `productLeaderId` (point at `User`) |

---

## 2. Different terms for the same thing

| Concept | Terms in use |
|---|---|
| A person | `Employee` (capacity model) · `User` (auth model) — **no FK between them** |
| A person's org placement | `OrgMembership` · `EmployeeOrgUnitLink` · `Employee.managerId` |
| Share of a person's time | `percentage` · `allocationPct` · `allocationPct` (org link) · `effectiveAllocationPercentage` (calculator) |
| Full-time equivalent | `FTE` · `hoursPerWeek / 40` · `toFte()` · `capacityFte` · `deployableFte` |
| A week | `Period(type=WEEK)` · `weekPeriodId` · `weekStart` · `weekIndex` (grid) · "the week of Sep 7" (UI) |
| A quarter | `Period(type=QUARTER)` · `Scenario.periodId` · `Initiative.targetQuarter` (a **String**) · `targetPeriodId` |
| The org unit a thing belongs to | `orgNodeId` · "home" (dialog) · "Belongs to" (dialog label) · `WorkHome` (aggregation type) |
| Work outside initiatives | `outsideInitiativesFte` · `WorkClass !== 'INITIATIVE'` · "BAU" (UI hint) · `AllocationType.RUN` (legacy) |
| Non-deployable time | `RESERVED` (target type) · `OVERHEAD`/`UNAVAILABLE` (capacity effect) · `reservedPct` · "Reserved time" (UI) · PTO (legacy) |
| Over-allocation | `overAllocatedPct` · `state = 'OVER'` · `overAllocatedWeeks` · `issues.overallocations` (calculator) |
| Branching a plan | "branch" · "overlay" · "what-if" · `WHAT_IF` (scenario type) · `createRevision` (a different mechanism) |

---

## 3. Schema terms (Prisma)

**Models** — `User`, `RefreshToken`, `Period`, `PortfolioArea`, `Initiative`, `ScopeItem`,
`ScopeItemPeriodDistribution`, `Approval`, `Employee`, `Skill`, `Domain`, `CapacityCalendar`,
`Scenario`, `Allocation`, `AllocationPeriod`, `EmployeeDomainFamiliarity`, `BaselineSnapshot`,
`FreezePolicy`, `DriftAlert`, `DriftThreshold`, `JiraConnection`, `JiraSite`,
`JiraProjectSelection`, `IntakeItem`, `IntegrationSyncCursor`, `IntegrationSyncRun`,
`IntegrationWriteActionLog`, `IntakeRequest`, `OrgNode`, `OrgMembership`, `AuditEvent`,
`ApprovalPolicy`, `ApprovalRequest`, `ApprovalDecision`, `ApprovalDelegation`, `FeatureFlag`,
`JobProfile`, `JobProfileSkill`, `CostBand`, `ForecastRun`, `InitiativeStatusLog`, `SkillPool`,
`TokenSupply`, `TokenDemand`, `TokenCalibration`, `Authority`, `AuthorityAuditLog`,
`TenantConfig`, `EntitlementEvent`, `EmployeeOrgUnitLink`, `EmployeeCensusImportBatch`,
`EmployeeCensusImportRow`, **`WorkforcePlan`**, **`WorkforceAllocation`**, **`Project`**,
**`WorkItem`**.

**Enums (workforce-relevant)**

| Enum | Members |
|---|---|
| `AllocationTargetType` | PRODUCT, INITIATIVE, PROJECT, WORK_ITEM, CATEGORY, RESERVED |
| `WorkforceAllocStatus` | ACTUAL, COMMITTED, PLANNED, PROPOSED |
| `WorkforceAllocSource` | IMPORT, MANAGER, SYSTEM_INFERRED, SCENARIO, EXTERNAL_SYSTEM |
| `CapacityEffect` | DEPLOYABLE, OVERHEAD, UNAVAILABLE |
| `WorkCategory` | FEATURE, BUG, MAINTENANCE, TECH_DEBT, SUPPORT, COMPLIANCE, DISCOVERY, PLATFORM, OPERATIONS, MANAGEMENT, TIME_OFF, OTHER |
| `WorkforcePlanStatus` | ACTIVE, ARCHIVED |
| `CapacitySource` | LEGACY, WORKFORCE_PLAN |
| `PlanningMode` | LEGACY, TOKEN |
| `OrgNodeType` | ROOT, DIVISION, DEPARTMENT, TEAM, VIRTUAL, PRODUCT, PLATFORM, FUNCTIONAL, CHAPTER |
| `EmployeeOrgRelationshipType` | PRIMARY_REPORTING, DELIVERY_ASSIGNMENT, FUNCTIONAL_ALIGNMENT, CAPABILITY_POOL, TEMPORARY_ROTATION |
| `AllocationType` (legacy) | PROJECT, RUN, SUPPORT |
| `EmploymentType` | FULL_TIME, PART_TIME, CONTRACTOR, INTERN |
| `InitiativeStatus` | PROPOSED, SCOPING, RESOURCING, IN_EXECUTION, COMPLETE, ON_HOLD, CANCELLED |
| `InitiativeOrigin` | INTAKE_CONVERTED, DIRECT_PM, LEGACY |
| `ScenarioType` | BASELINE, REVISION, WHAT_IF |
| `ScenarioStatus` | DRAFT, LOCKED, APPROVED, … |
| `PeriodType` | WEEK, MONTH, QUARTER |
| `TokenSupplySource` | MANUAL, DERIVED_WORKFORCE |
| `DomainComplexity`, `DeliveryHealth`, `FamiliaritySource`, `ForecastMode`, `RevisionReason`, `PolicyEnforcement`, `CensusImportBatchStatus`, `CensusRowAction`, `ApprovalScope`, `ApprovalRuleType`, `CrossBuStrategy` | — |

---

## 4. Backend service vocabulary

| Term | Where | Meaning |
|---|---|---|
| `targetKey` | `target-key.ts` | canonical string form of an allocation target |
| `TargetColumns` | same | the persistable column set |
| `attributionOf` / `Attribution` / `AttributionVia` | `workforce-aggregation.service.ts` | where a row's work lives, and via which rung |
| `WorkClass` | same | INITIATIVE \| PRODUCT \| CATEGORY |
| `WorkHome` / `WorkHomes` | same | resolved parents of a project or work item |
| `summarizeWeek` / `summarizeHorizon` | `capacity-math.ts` | the capacity arithmetic |
| `CapacityState` | same | EMPTY \| UNDER \| AT \| OVER |
| `committedPct` / `allocatedPct` / `reservedPct` / `unallocatedPct` / `overAllocatedPct` | same | the five capacity numbers |
| `toFte` / `toHours` | same | unit conversions |
| `FULL_ALLOCATION_PCT` (100) / `DEFAULT_FULL_TIME_HOURS` (40) | same | the two constants |
| `resolveWeeksInPeriod` / `resolveHorizonWeeks` | `workforce-plan.service.ts` | the single week-membership rule |
| `resolvePlanForScenario` | `capacity-supply.ts` | overlay-else-baseline |
| `CapacitySupplyProvider` | same | the supply dispatch interface |
| `PlanningEngine` / `PlanningService.getEngine` | `planning/` | the engine dispatch |
| `branchForScenario` / `promoteOverlay` / `discardOverlay` | `workforce-overlay.service.ts` | the overlay lifecycle |
| `deriveTokenSupply` / `deriveTokenDemand` | `planning/derive-*.ts` | pool derivation (**demand has no route**) |
| `unattributedHours` / `unattributedFte` | several | the "parts sum to the whole" residual |
| `scenarioInitiativeStaffing` / `reconcileScenarioInitiatives` | `scenario-initiative-link.service.ts` | the plan↔scenario link |
| `analyzeDeletionImpact` | `employee-deletion-impact.service.ts` | cascade blast radius |
| `assertScenarioEditable` / `assertDatesWithinQuarter` | two services each | the freeze and quarter-clamp guards |
| `validateAllocationTotal` | `employee-org-link.service.ts` | the ≤100% hard reject |
| `consumeCapacity` / `NEVER_CONSUMES` | same | whether an affiliation claims time |
| `PRODUCT_NODE_TYPES` | **three files** | which org node types may be a product target |
| `parseSupervisoryOrg` / `MappedRow` / `RowIssue` | census mapper | import parsing |

---

## 5. Frontend vocabulary, and where it differs from the schema

| UI text | Schema term | Note |
|---|---|---|
| "Workforce planner" | `WorkforcePlan` + grid | |
| "Planner" / "Roll-ups" / "Scenario link" | the three tabs | "Scenario link" has no schema counterpart |
| **"Product or team"** | `AllocationTargetType.PRODUCT` | the UI admits the target is not only products |
| **"Products and teams"** | `products` bucket | same |
| "Initiative" | `INITIATIVE` | |
| "Project" | `PROJECT` | |
| "Work item" | `WORK_ITEM` | |
| "Category" | `CATEGORY` | |
| **"Reserved time"** | `RESERVED` | |
| **"Belongs to"** / "home" | `orgNodeId` / `initiativeId` / `projectId` | one control, three columns |
| **"Nothing in particular"** | all parents null | |
| **"Contracted capacity"** | `capacityFte` | |
| **"Committed to work"** | `allocatedFte` | note: excludes reserved, despite "committed" meaning the opposite in `capacity-math.ts` |
| **"Deployable"** | `unallocatedFte` | |
| **"Reserved"** | `reservedFte` | |
| **"Outside initiatives"** | `outsideInitiativesFte` | hint says *"product, support and BAU work"* — the only "BAU" in the product |
| "Over-allocated only" | `overAllocatedWeeks > 0` | |
| "Add across the horizon" | `bulkSetRange` over the visible weeks | |
| "Set as Primary" | `Scenario.isPrimary` | |
| "Workforce plan" (scenario list link) | `/workforce?scenario=<id>` | |
| "Agreed" / "Disagreements" | `both.length` / the two mismatch lists | no schema counterpart |
| "Staffed, but not ranked" / "Ranked, but not staffed" | reconciliation lists | |
| "Planned hours" / "Scope P50" | `plannedHoursInQuarter` / `estimatedTotalHoursP50` | deliberately never combined |
| "In this scenario" / "Live" / "Other" | picker groups | `LIVE_STATUSES` exists **only** in the component |

**OBSERVED** — The clearest UI/schema divergence: the tiles label `allocatedFte` as
*"Committed to work"* while `capacity-math.ts` defines `committed = allocated + reserved`. The
same word, two totals, in the same feature.

---

## 6. Documentation vocabulary not present in code

From `PRD_WORKFORCE_CAPACITY.md` and `ANALYSIS_WORKFORCE_CAPACITY.md`:

| Term | Status |
|---|---|
| "Product" as *"a persistent organizational/value-stream ownership boundary"* | prose only; implemented as an `OrgNode` allow-list |
| "value stream" | prose only |
| "BAU" | prose + one UI hint; no schema element |
| "strategic initiatives" | prose; implemented as the absence-test `outsideInitiativesFte` |
| "EmployeeWeeklyAllocation" | the PRD's proposed name; became `WorkforceAllocation` |
| "allocationTarget", "allocationStatus" | PRD field names; became `targetKey`/`targetType`, `status` |
| "WORK_CATEGORY" as a target type | PRD §8; became `CATEGORY` and `RESERVED` |
| "Token Capacity" | prose; `TokenSupply`/`TokenDemand`/`SkillPool` |
| "Skill Pool Capacity" | prose; `SkillPool` has no capacity field |
| "Employee → Allocation → Capacity → Demand → Scenario" | the stated goal chain |

---

## 7. Terms from the redesign brief with ZERO occurrences

**OBSERVED BY ABSENCE** — reported by a full-tree search of `packages/`, `prisma/` and
`docs/`. Re-run and record the exact command after the source snapshot is recovered:

| Term | Occurrences | Nearest thing in the repository |
|---|---|---|
| `Workstream` | **0** | nothing |
| `Product Workstream Leader` | **0** | nothing |
| `Product Portfolio` | **0** | `PortfolioArea` (flat table) |
| `Product VP` | **0** | `Initiative.productLeaderId` → `User` |
| `Product Area` | **0** | `PortfolioArea` **or** `OrgNode.isPortfolioArea` **or** `OrgNodeType.PRODUCT` |
| `OEM Division` | **0** | `'OEM Solutions'` appears **only as test fixture data** |
| `Sustain` | **0** | `MAINTENANCE` + `SUPPORT` + `OPERATIONS` + `TECH_DEBT`, never aggregated |
| `New Development` | **0** | `WorkCategory.FEATURE` |
| `BAU` (as a schema element) | **0** | `AllocationType.RUN` (legacy) · `outsideInitiativesFte` (derived) · one UI hint |
| Engineering vs Product distinction | **0** | no enum, column, flag or branch anywhere |

---

## 8. Glossary of the implementation's own coinages

| Term | Definition as used here |
|---|---|
| **committed** | allocated + reserved — everything claiming a person's week |
| **deployable** | capacity that can be put on work; also the `DEPLOYABLE` capacity effect |
| **unallocated** | `100 − committed`, floored at 0. Explicitly **not** "available" |
| **reserved** | OVERHEAD + UNAVAILABLE, summed together everywhere |
| **attribution** | walking the work's own home to find its initiative or org node |
| **overlay** | a scenario-bound copy of the baseline plan, clamped to that scenario's quarter |
| **promotion** | merging an overlay back into the baseline, preserving weeks outside the quarter |
| **the horizon** | the `from` + `weeks` window a grid or roll-up is showing |
| **target** | what an allocation points at — one of six types |
| **target key** | the canonical string identifying a target, carrying the uniqueness constraint |
| **plan of record / baseline** | the single ACTIVE `isBaseline` workforce plan |
| **work home** | the org node / initiative / project a work item hangs off |
| **capacity effect** | whether a row's percentage produces deployable capacity |
| **work class** | INITIATIVE / PRODUCT / CATEGORY — the derived investment axis |
| **outside initiatives** | deployable FTE whose work class is not INITIATIVE |
