# Original ProductFolio (V1) — the work model

**Research ticket:** wiltonn/productfolio-v2 #2 — *What made Initiative, Project and WorkItem different?*

## Sources surveyed

| Source | Commit | Date |
|---|---|---|
| `wiltonn/productfolio` @ `main` (`~/dev/projects/productfolio-workspace/productfolio-v1/productfolio`) | `e62c2d761f021c0063f029c3a3f96900374cf807` — "update" | 2026-02-21 |
| Second working copy @ `v1/solver` (`~/dev/projects/productfolio`) | `07368d6ef19b23a8b6863b5bffab32fadfee76c9` — "meta: knowledge transfer to CohesionXL" | 2026-03-24 |
| Branches `feat/L1-orchestration-graph`, `feat/L2-scenario-projection`, `feat/L3-constraint-validator`, `feat/L4-governance-decision`, `feat/shared-types` | read via `git show`, no checkout | — |

All paths below are relative to `productFolio/packages/` in the surveyed repo unless stated otherwise.
Evidence labels follow CLAUDE.md §28.

**Scope note.** This document covers the *original* ProductFolio only. `docs/domain/evidence/workforce-planner/`
in this repository — despite its directory name — describes a **different, newer
workforce-planner implementation**. §7 contrasts the two explicitly.

---

## 1. Headline answer

**OBSERVED** — In the original ProductFolio, **three of the five concepts in the question do not
exist at all**. The shipped schema has 50 models
(`backend/prisma/schema.prisma`, `grep -c "^model "`). None is named `Product`, `Project` or
`WorkItem`:

- **`model Project`** — no such model. `grep -rn "model Project"` over the whole repo returns
  nothing. `Project` appears 12 times in `.ts`/`.tsx`, and every one is either a Jira project
  filter, a UI label, or a test fixture title (`backend/src/tests/forecast.test.ts:263`
  `title: 'Project Alpha'`).
- **`WorkItem`** — `grep -rn "WorkItem\|workItem"` over all `.ts`/`.tsx`/`.prisma` returns
  **0 hits**.
- **`Product`** — not an entity. It survives only as (a) two *role* fields on Initiative,
  `productOwnerId` and `productLeaderId` (`schema.prisma:297,299`), and (b) a label in
  `enum OrgNodeType { … PRODUCT PLATFORM … }` (`schema.prisma:111-121`) — an org-node type,
  not a product record.
- **`workCategory`** — 0 hits repo-wide. There is **no investment classification** of any kind.

What *does* exist is a two-level model:

```
PortfolioArea (or OrgNode.isPortfolioArea) ──┐
                                             ├─→ Initiative ──→ ScopeItem
IntakeRequest ──(one-way conversion)─────────┘        ↑              ↑
                                              Allocation      (estimation only)
```

So V1's real question is narrower: **what distinguished Initiative from ScopeItem, and
what distinguished IntakeRequest from Initiative?**

---

## 2. Initiative — the only concept with a lifecycle, and the unit of nearly everything

**OBSERVED — lifecycle.** `enum InitiativeStatus { PROPOSED SCOPING RESOURCING IN_EXECUTION
COMPLETE ON_HOLD CANCELLED }` (`schema.prisma:14-22`), enforced by a hard-coded transition
table `STATUS_TRANSITIONS` (`backend/src/schemas/initiatives.schema.ts:5-…`) and
`isValidStatusTransition` (same file, `:157-165`), which also **forbids self-transition**
(`from === to` returns `false`, `:158-160`). Enforced in
`backend/src/services/initiatives.service.ts:397-403`.

**OBSERVED — history is a first-class record.** Every transition writes an
`InitiativeStatusLog` row (`schema.prisma:1202-1216`;
`initiatives.service.ts:418` → `initiative-status-log.service.ts:14`). This log is the *sole*
input to empirical forecasting (§4).

**OBSERVED — Initiative is the unit of:**

| Concern | Citation |
|---|---|
| Allocation target | `Allocation.initiativeId` (nullable) — `schema.prisma:526` (`initiativeId String? // Nullable for unallocated capacity`) |
| Scenario priority | `PriorityRanking { initiativeId, rank }` — `backend/src/types/index.ts:67-70`, stored as untyped JSONB `Scenario.priorityRankings` (`schema.prisma:490`) |
| Token demand ledger | `TokenDemand @@unique([scenarioId, initiativeId, skillPoolId])` — `schema.prisma:1275` |
| Every rollup | `rollupByPortfolioArea` / `rollupByBusinessOwner` / `rollupByOrgNode` all group `Allocation → Initiative` — `backend/src/services/rollup.service.ts:144,192,234` |
| Forecast reporting unit | `InitiativeForecast` — `backend/src/services/forecast.service.ts:548-576` |
| Approval subject | `checkApproval({ scope: 'INITIATIVE', subjectType: 'initiative' })` — `initiatives.service.ts:382-387` |
| Domain familiarity | `EmployeeDomainFamiliarity` PK `(employeeId, initiativeId)` — `schema.prisma:564-582` |

**INFERRED** — Initiative in V1 is simultaneously the planning container, the reporting grain,
the approval subject and the execution parent. Nothing else in the shipped model carries any
of these roles.

---

## 3. ScopeItem — a genuine behavioural distinction, but only in one direction

ScopeItem is **not** a distinction in name only. It differs from Initiative in a specific,
narrow, real way — and is identical in every other way.

### 3.1 What actually differs (OBSERVED)

**It is the estimation grain, and Initiative is not.** ScopeItem is the only place
`skillDemand` (JSONB `{skill: hours}`), `estimateP50` and `estimateP90` exist
(`schema.prisma:338-355`). Initiative carries no estimate field at all.

**It is the temporal-distribution grain.** `ScopeItemPeriodDistribution (scopeItemId, periodId,
distribution 0.0–1.0)` (`schema.prisma:357-368`) — the only mechanism in V1 for spreading
effort across periods. Initiative has one flat `targetQuarter` String plus `targetPeriodId`
(`schema.prisma:302,304`).

**It is the Monte Carlo sampling unit.** In Mode A forecasting each scope item draws its *own*
lognormal sample, then the samples are pooled per initiative
(`forecast.service.ts:378-412`, esp. `:386` `lognormalSample(si.estimateP50, p90)`).

**Mutating it triggers a drift check; mutating an Initiative does not.**
`enqueueDriftCheck('demand_change')` fires on scope-item create, update and delete
(`backend/src/services/scoping.service.ts:103,156,179`) — and nowhere in
`initiatives.service.ts`.

### 3.2 What is identical (OBSERVED)

- **No lifecycle.** ScopeItem has no `status` field (`schema.prisma:338-355`). It cannot be
  proposed, approved, held or cancelled.
- **No independent permissions.** Every scope-item route uses exactly the same
  `preHandler: [requireDecisionSeat]` as every initiative route
  (`backend/src/routes/scoping.ts:53,69,82` vs `backend/src/routes/initiatives.ts:132,145,160`).
  `backend/src/lib/permissions.ts` has `initiative:read`/`initiative:write` and **no**
  scope-item permission at all — a scope item is governed entirely by its initiative.
- **No independent ownership.** No owner, sponsor or org field. Only `initiativeId` (NOT NULL,
  `onDelete: Cascade`, `schema.prisma:340` + cascade at `:351`).
- **Invisible to reporting.** ScopeItem appears in no rollup, no capacity view, and no ledger.
  `TokenDemand` is keyed to `(scenario, initiative, skillPool)` — the scope-item breakdown is
  aggregated away at `derive-demand.ts:130` (`key = \`${item.initiativeId}:${pool.id}\``) and
  never persisted.
- **Not allocatable.** `Allocation` can point at an Initiative or at nothing; it cannot point
  at a ScopeItem (`schema.prisma:522-546`).

**INFERRED** — ScopeItem is a *decomposition of an Initiative's estimate*, not a body of work.
It exists to make a single number (initiative demand) buildable from parts and spreadable
across periods. Everything it feeds collapses back to the Initiative before anyone sees it.

### 3.3 Edge cases and bugs worth salvaging (OBSERVED)

1. **P90 < P50 is accepted.** `CreateScopeItemSchema` validates only `.positive()` on each
   (`backend/src/schemas/scoping.schema.ts:11-12`). `forecast.service.ts:385` defends with
   `Math.max(si.estimateP90, si.estimateP50)`.
2. **Period distributions are not required to sum to 1.0.** Validation is per-entry only,
   `z.number().min(0).max(1)` (`backend/src/schemas/periods.schema.ts:26-29`). A scope item may
   silently over- or under-count its own effort.
3. **Two contradictory defaults for missing distributions.** Same data, opposite readings:
   - `baseline.service.ts:89` — `const distFactor = distribution?.distribution ?? 1.0` →
     a scope item with no distribution contributes its **full** demand to the period.
   - `forecast.service.ts:395-396` — `for (const pd of si.periodDistributions)` with an empty
     array → the same scope item contributes **nothing**.
4. **Skill names are matched to skill pools by lowercased string.**
   `derive-demand.ts:100` `poolByName.get(skill.toLowerCase())`; unmatched skills are warned
   and silently dropped (`:101-108`). Missing calibration falls back to 1 token/hour with a
   warning (`:112-118`).
5. **P90 is dropped on aggregation if any contributing item lacks it.**
   `derive-demand.ts:138-140` sets the aggregate P90 to `null` if any part is `null` — a
   deliberate refusal to fabricate a confidence bound.

---

## 4. Two forecast modes — the sharpest behavioural fork in V1

**OBSERVED** — `enum ForecastMode { SCOPE_BASED EMPIRICAL }` (`schema.prisma:156-159`), and
the two modes read from entirely disjoint data:

| | Mode A `SCOPE_BASED` | Mode B `EMPIRICAL` |
|---|---|---|
| Input | `ScopeItem` estimates + distributions | `InitiativeStatusLog` transitions |
| Method | per-scope-item lognormal sampling, then capacity-constrained period walk with spillover (`forecast.service.ts:422-460`) | historical cycle-time distribution, resampled |
| Cycle-time definition | n/a | **first `→ RESOURCING`** to **latest `→ COMPLETE`** (`forecast.service.ts:622-679`) |
| Degrades when | scope items missing / no estimates (warnings at `:515-528`) | fewer than `LOW_CONFIDENCE_THRESHOLD = 10` completed initiatives (`:616`) |

**INFERRED** — This is V1's most interesting intellectual property on the work model: it proves
the organisation had *two* usable notions of "how long will this take" — one bottom-up from
decomposed scope, one top-down from observed lifecycle history — and that the second requires
only that the *Initiative* have a recorded lifecycle. Mode B works with zero scope items.

**INFERRED** — Mode B's choice of `RESOURCING` (not `PROPOSED`, not `IN_EXECUTION`) as the
cycle-time start is a domain statement: the clock starts when capacity is committed, not when
the idea appears or when work begins.

---

## 5. IntakeRequest vs Initiative — the one place V1 separates *want* from *commit*

This is a **real** behavioural distinction, and the clearest V1 precedent for the
Commercial-demand-vs-Product-commitment separation in CLAUDE.md §9.

**OBSERVED — different lifecycle.** `enum IntakeRequestStatus { DRAFT TRIAGE ASSESSED APPROVED
CONVERTED CLOSED }` (`schema.prisma:96-103`) — no overlap with `InitiativeStatus`.

**OBSERVED — different fields.** `IntakeRequest` carries demand-side attributes that exist
nowhere on `Initiative`: `valueScore`, `effortEstimate`, `urgency`, `customerName`, `tags`,
`strategicThemes`, plus `requestedById` and `sponsorId` (`schema.prisma:863-921`).
`Initiative` carries delivery-side attributes: `businessOwnerId`/`productOwnerId` (both
required), `domainComplexity`, `deliveryHealth`.

**OBSERVED — one-way, gated, irreversible conversion.**
`convertToInitiative` (`backend/src/services/intake-request.service.ts:362-470`):
- requires `status === APPROVED`, else `WorkflowError` (`:376-380`);
- refuses a second conversion — `if (existing.initiativeId) throw` (`:382-384`);
- **freezes a `conversionSnapshot` JSON** of the request as it stood at conversion time
  (`:418-430`) — the request may drift afterwards, the record of what was agreed does not;
- creates the Initiative at `status: PROPOSED` with
  `origin: InitiativeOrigin.INTAKE_CONVERTED` (`:443-444`);
- runs in a single `prisma.$transaction` (`:433`);
- there is **no un-convert path** — the status guard explicitly refuses direct writes to
  `CONVERTED` (`:330-333`).

**OBSERVED — provenance is retained as a first-class enum.**
`enum InitiativeOrigin { INTAKE_CONVERTED DIRECT_PM LEGACY }` (`schema.prisma:105-109`),
indexed (`schema.prisma:332`) — the system can always report which committed work came from
a request and which a PM created directly.

**INFERRED** — V1 already knew that "something requested" and "something committed" are
different objects with different lifecycles, different attributes and different owners, joined
by an auditable one-way transition — rather than one entity with a status field.

---

## 6. Distinctions that were name only

### 6.1 `AllocationType.RUN` vs `AllocationType.SUPPORT` — name only

**OBSERVED** — `enum AllocationType { PROJECT RUN SUPPORT }` (`schema.prisma:58-62`).
A full grep of every `allocationType` reference finds exactly **one** behavioural branch, and
it does not separate RUN from SUPPORT:

```ts
// backend/src/services/scenarios.service.ts:412-418
const allocationsToClone = source.allocations.filter((alloc) => {
  if (alloc.allocationType === AllocationType.PROJECT) {
    return data.includeProjectAllocations;
  }
  // RUN and SUPPORT are included if includeRunSupportAllocations is true
  return data.includeRunSupportAllocations;
});
```

Everywhere else `allocationType` is only stored, echoed, or used to pick a badge colour
(`frontend/src/pages/ScenarioPlanner.tsx:792-796,2182-2186`). RUN and SUPPORT are never
distinguished from each other by any calculation, validation, permission or report.

**INFERRED** — the *surviving* distinction is binary: **quarter-bounded project work** vs
**work that carries forward across quarters**. That binary is real (it changes what gets cloned
on a quarter roll-forward, with date offsetting and clamping at
`scenarios.service.ts:420-434`). The three-way split is not.

**OBSERVED — this is the closest V1 gets to investment classification, and it is not one.**
It hangs off `Allocation`, not off work, so the same Initiative can hold PROJECT and RUN
allocations simultaneously with nothing reconciling them, and there is no NEW DEVELOPMENT /
SUSTAIN / TECH DEBT vocabulary anywhere in the repository.

### 6.2 `ApprovalScope.INITIATIVE` vs `SCENARIO` vs `RESOURCE_ALLOCATION` — mostly name only

**OBSERVED** — `enum ApprovalScope { RESOURCE_ALLOCATION INITIATIVE SCENARIO }`
(`schema.prisma:123-127`). `approval-enforcement.service.ts:33-…` is fully generic: the scope
is a lookup key into `ApprovalPolicy`, and the flow (feature flag → resolve chain → highest
policy → existing APPROVED request → BLOCKING deny + auto-create PENDING / ADVISORY warn) is
byte-identical for all three.

**OBSERVED — one genuine exception.** `getAffectedNodeIds`
(`backend/src/services/approval-policy.service.ts:475-…`) branches per subject type, and the
`'initiative'` branch is materially different: an initiative's approval chain is derived from
**the org memberships of the employees allocated to it** (`:489-521`), falling back to the
business owner's membership only when the initiative has no allocations (`:497-514`).

**INFERRED** — worth carrying forward as a domain observation, not as a design: in V1 *who must
approve a body of work is a function of who is staffed on it*, not of where it sits in a
hierarchy. That is the one place V1 treats organisational span as derived rather than declared.

### 6.3 `PlanningMode.LEGACY` vs `TOKEN` — a fork, not a distinction

**OBSERVED** — `enum PlanningMode { LEGACY TOKEN }` (`schema.prisma:161-164`), dispatched to
two `PlanningEngine` implementations. Each throws on the other's methods:
`LegacyTimeModel.getTokenLedgerSummary` throws (`backend/src/planning/legacy-time-model.ts:17-22`);
`TokenFlowModel.getCapacityDemand` and `.getCalculator` both throw *"not yet implemented"*
(`backend/src/planning/token-flow-model.ts:8-21`).

**INFERRED** — this is not two kinds of work; it is two half-finished representations of the
same demand living behind one enum. A scenario in TOKEN mode cannot be costed; a scenario in
LEGACY mode cannot see its constraints.

---

## 7. Contrast with `docs/domain/evidence/workforce-planner/` (the newer workforce-planner)

The newer implementation's `J6`, `J7`, `J20` and `WORKFORCE_DOMAIN_EVIDENCE.md` §10–12 describe
concepts that **had not been invented yet** in the original.

| Newer-implementation claim | Original ProductFolio |
|---|---|
| **J7** — *"`Project` and `Initiative` are behaviourally interchangeable"*; only asymmetry is `Project.initiativeId`; `Project` has no admin UI | **`Project` does not exist.** No model, no table, no route, no UI. **OBSERVED** |
| **§11** — `Project` has *"two independent nullable parents"* and *"no distinguishing behaviour from Initiative"* | No such entity to distinguish. The finding is that a *new* implementation added it and could not then justify it. |
| **J20 / §12** — `WorkItem` *"exists because `ScopeItem.initiativeId` is NOT NULL"* | `ScopeItem.initiativeId` is NOT NULL in the original too (`schema.prisma:340,351`) — **and the original simply had no allocatable unit below Initiative at all.** `WorkItem`: 0 hits. **OBSERVED** |
| **J6** — `Initiative` is planning container + execution parent + investment class; *"there is no investment-classification field anywhere in the schema"* | Confirmed and **stronger**: the original has no `workCategory`, no `WorkClass`, no investment vocabulary of any kind (0 hits). Its only proxy is `AllocationType`, and it sits on the allocation, not the work. **OBSERVED** |
| **J3** — *"`PRODUCT` is a target type with no entity"* | Same root condition, earlier: `OrgNodeType.PRODUCT` is a label on an org node (`schema.prisma:111-121`); `Product` is otherwise only the role names `productOwner`/`productLeader`. **OBSERVED** |
| **J8** — allocation targets need four nullable FKs + a `targetKey` string + a CHECK constraint + a 250-line parser | Original `Allocation` has **one** nullable target FK, `initiativeId`, and no `targetKey`. **OBSERVED** (`schema.prisma:522-546`) |
| **J4 / §10** — two implementations of "portfolio area" | Present in the original already: the `PortfolioArea` table (`schema.prisma:273-286`) *and* `OrgNode.isPortfolioArea` (`schema.prisma:934`), with `Initiative` carrying both `portfolioAreaId` and `orgNodeId` (`schema.prisma:298,307`). This duplication is inherited, not new. **OBSERVED** |

**INFERRED — the single most decision-relevant contrast.** `Project` and `WorkItem` are **not**
durable ProductFolio concepts that V2 must decide whether to keep. They are **later additions**,
and the newer implementation's own schema comments say why they were added: `WorkItem` exists
*"because `ScopeItem.initiativeId` is NOT NULL"* and stays thin because a second set of demand
numbers *"would immediately diverge"* (quoted at `JAGGED_DOMAIN_AREAS.md` J20). That is a
justification from a **database constraint**, not from a business distinction. The original ran
without either concept and still supported prioritisation, allocation, approval, rollup,
capacity analysis and two independent forecasting modes.

---

## 8. Later thinking, unshipped (label carefully)

**OBSERVED — the CohesionXL solver types (`v1/solver`, root `src/types/`, 265 lines total).**
`src/types/work-item.ts` defines the successor concept, and it is a **rename of Initiative,
not a new lower level**:

```ts
export type WorkItemState =
  | 'proposed' | 'scoping' | 'ready' | 'in_progress' | 'done' | 'cancelled';
export interface WorkItem {
  readonly id: WorkItemId;
  readonly name: string;
  readonly state: WorkItemState;
  readonly tokenRequirements: ReadonlyMap<TeamId, TokenRequirement>;
  readonly duration: number;                     // in planning periods
  readonly dependencies: readonly WorkItemId[];
}
```

Five of its six states are `InitiativeStatus` verbatim (`RESOURCING`→`ready`,
`IN_EXECUTION`→`in_progress`, `COMPLETE`→`done`; `ON_HOLD` dropped).

**INFERRED** — when the author rebuilt the model from scratch with no schema to preserve, the
result had **one** work concept, and it kept Initiative's lifecycle while dropping Initiative's
name. Two things it *added* that the shipped V1 lacked entirely:
- **`dependencies: readonly WorkItemId[]`** — work-to-work dependency. `grep -in "depend"` over
  the shipped `schema.prisma` returns **nothing**. V1 shipped no dependency concept.
- **`tokenRequirements: ReadonlyMap<TeamId, TokenRequirement>`** — demand expressed *per
  supplying team*, rather than V1's `TokenDemand` keyed on an abstract `SkillPool`
  (`schema.prisma:1260-1280`).

**OBSERVED — `feat/L1`–`L4` are unwired prototypes.** `git grep` shows the L1 orchestration
graph is imported only by `src/tests/graph-engine.test.ts`, and the L3 constraint validator only
by its own two test files. No route, service or job references them. Their schema files are
identical to `main` (50 models, none named Project/WorkItem/Product).

**OBSERVED — L1 introduces a *third* lifecycle vocabulary**, entity-agnostic and in-memory:
`backlog | ready | planned | in_progress | review | done | blocked`
(`feat/L1-orchestration-graph:…/engine/graph/default-lifecycle.json`), with declarative guards
(`requires_prior_state`, `not_blocked`) and a `TransitionGateway` that layers **structural
legality → dependency readiness → constraint approval** as three separable checks.

**INFERRED** — the salvageable idea in L1 is not the state names but the **separation of
concerns**: whether a transition is *structurally* legal, whether its *dependencies* are met,
and whether it *fits the constraints* are three different questions with three different owners.
V1's shipped `transitionStatus` conflates the first with an approval check and knows nothing of
the second (`initiatives.service.ts:381-403`).

---

## 9. Answering the ticket directly

**Drove genuinely different behaviour**

1. **Initiative vs ScopeItem** — real, but asymmetric and narrow. ScopeItem is the *estimation
   and period-distribution grain* and the Monte Carlo sampling unit; it triggers drift checks.
   It has **no** lifecycle, **no** permissions of its own, **no** owner, **no** presence in any
   report, and cannot be allocated to. Its detail is aggregated away before anything is
   persisted or displayed.
2. **IntakeRequest vs Initiative** — real and strong. Different lifecycles, disjoint attribute
   sets, gated one-way conversion, frozen conversion snapshot, retained origin.
3. **`ForecastMode.SCOPE_BASED` vs `EMPIRICAL`** — real. Disjoint inputs, disjoint algorithms,
   disjoint failure modes. Mode B needs only the Initiative lifecycle log.
4. **`AllocationType.PROJECT` vs everything else** — real but binary. It changes what is cloned
   on a quarter roll-forward, and nothing else.
5. **Approval-chain resolution for `subjectType: 'initiative'`** — real. Derived from who is
   allocated, not from a hierarchy.

**Distinctions in name only**

1. **`Project`, `WorkItem`, `Product`** — not distinctions at all in the original; the entities
   do not exist.
2. **`AllocationType.RUN` vs `SUPPORT`** — never separated by any calculation, validation,
   permission or report; only by a badge colour.
3. **`ApprovalScope` INITIATIVE / SCENARIO / RESOURCE_ALLOCATION** — one generic code path; the
   scope is a policy-lookup key. (The `getAffectedNodeIds` branch is the lone exception.)
4. **`PlanningMode` LEGACY vs TOKEN** — two half-implemented views of one demand, each throwing
   on the other's questions.

**UNKNOWN**

- Whether users ever created more than a handful of scope items per initiative, or whether
  scope-item decomposition was used in practice at all. No seed data, telemetry or fixture in
  the repository indicates real usage volume.
- Why `RUN` and `SUPPORT` were separated. No comment, commit message, test or document in
  either working copy explains the intended difference.
- Whether `ON_HOLD` was reachable in practice. It is in the transition table from every state
  (`initiatives.schema.ts:124-…`) but has no dedicated UI action found in the frontend survey.
- What the newer implementation's authors believed `Project` would express that `Initiative`
  could not. `JAGGED_DOMAIN_AREAS.md` J7 records the same gap: *"Nothing in the code answers
  this."*

---

## 10. Things a V2 decision must not lose

These are extracted observations, **not** a recommendation for V2 structure (CLAUDE.md §2).

1. **The pressure that produced `WorkItem` in the newer implementation was a NOT-NULL foreign
   key, not a business need.** Any V2 argument for a level below the planning unit needs a
   reason drawn from workflow, not from schema shape.
2. **Estimation grain and staffing grain were never the same record in either implementation** —
   and in the original they were never reconciled either: `TokenDemand` (from ScopeItems) and
   `Allocation` hours live in unrelated tables that no code compares.
3. **The one-way, snapshotted, origin-tagged conversion from request to commitment already
   existed and worked.** It is V1's best evidence for CLAUDE.md §9's want-vs-committed
   distinction — including the detail that the *agreement* must be frozen while the *request*
   remains editable.
4. **Investment classification is genuinely absent from both implementations.** V1's only
   proxy sits on `Allocation`, which means it classified *capacity*, not *work* — the same
   allocation-level placement CLAUDE.md §11 lists as an open question. V1 gives no evidence
   either way; it only shows that placing it on the allocation makes the same Initiative
   classifiable two ways at once with nothing reconciling them.
5. **Empirical (Mode B) forecasting requires only a recorded lifecycle on the planning unit** —
   and its cycle-time clock starts at *capacity commitment* (`RESOURCING`), not at proposal or
   at execution start. Whatever V2's planning unit is, if it has no durable transition log,
   this whole class of forecasting is unavailable.
6. **Work-to-work dependency was never shipped.** It appears only in the unwired solver types.
   V2 cannot inherit a dependency model from V1 — there is none.
7. **The two contradictory defaults for a missing period distribution** (`?? 1.0` in baseline
   vs. contribute-nothing in forecast) are a concrete example of what CLAUDE.md §25 calls
   important state inferred from accidental record existence.
