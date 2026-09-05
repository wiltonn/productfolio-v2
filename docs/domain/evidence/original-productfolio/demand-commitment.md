# Original ProductFolio (V1) — Demand, Prioritization and Commitment

Answers wayfinder research ticket #6. Feeds *How a commercial need becomes a product
commitment* (CLAUDE.md §9, §22).

## Surveyed source

| Field | Value |
|---|---|
| Repository | `wiltonn/productfolio` |
| Working copy | `/home/wiltonn/dev/projects/productfolio-workspace/productfolio-v1/productfolio` |
| Branch | `main` |
| Commit | `e62c2d761f021c0063f029c3a3f96900374cf807` ("update", 2026-02-21) |
| Working tree | clean (`git status --porcelain` empty) |
| App root | `productFolio/packages/{backend,frontend}` |
| Total history | 36 commits |
| Survey date | 2026-08-30 |

Section 7 additionally surveys the second working copy at
`/home/wiltonn/dev/projects/productfolio` and carries its own commit table. Everything before
§7 is `main` @ `e62c2d76` only.

All paths below are relative to `productFolio/` inside that working copy. Line numbers are
from the commit above.

This is **archaeological evidence**, not authority (CLAUDE.md §2). Nothing here is a
recommendation, and no terminology is settled by this document.

---

## 0. Answer in brief

**OBSERVED** — V1 *did* have a request/commitment distinction, and it was structural: two
separate tables with two separate lifecycles, joined by an explicit, one-way, snapshotting
conversion step. `IntakeRequest` (DRAFT → TRIAGE → ASSESSED → APPROVED → CONVERTED → CLOSED)
is "something someone asked for". `Initiative` (PROPOSED → SCOPING → RESOURCING →
IN_EXECUTION → COMPLETE) is "something Product has taken on". You cannot allocate capacity to
an `IntakeRequest`; you can only allocate to an `Initiative`.

**OBSERVED BY ABSENCE** — But V1 never used the word *commitment*, and never modelled the
thing the word usually means. Zero occurrences of `commit*` as a domain term anywhere in
`packages/backend/src` or `packages/frontend/src`; the only 22 hits are the `COMMITTEE`
approval rule type. There is no state, field, entity or event that records "Product has
promised this to that requester for that quarter". What exists instead is **four unrelated
things called APPROVED**, none of which is a promise to a requester (§3).

**OBSERVED** — Priority was not a property of demand at all. Neither `IntakeRequest` nor
`Initiative` carries a rank. The only ordinal priority in the system lives on `Scenario` as
an unvalidated JSON blob, `priorityRankings: Array<{initiativeId, rank}>` — i.e. priority is
a property of *a plan*, is scoped to one quarter, is invisible to the requester, and dies
with the scenario.

**OBSERVED BY ABSENCE** — There is **no concept of a requesting organization**. Zero
occurrences of any requester-org field (`requestingOrg`, `consumingOrg`, `demandOrg`,
`businessUnit`, `divisionId`, …). The only representation of "who wants this" is two `User`
FKs (`requestedById`, `sponsorId`) and a free-text `customerName VarChar(255)`. Every org
reference in the demand path — including the approval chain — resolves to the **delivering**
side (§6).

---

## 1. How demand was expressed

### 1.1 Two intake tables, doing different jobs

**OBSERVED** — `IntakeItem` (`prisma/schema.prisma:752-796`) is a read-only mirror of a Jira
issue: `jiraSiteId` + `jiraIssueId` are NOT NULL and uniquely constrained, and the row
carries `contentHash`, `lastSyncedAt`, `lastSeenAt`, `priorityName` (Jira's own priority
string). It is populated by `services/jira-sync.service.ts`. It is not demand the
organization authored; it is demand it observed.

**OBSERVED** — `IntakeRequest` (`prisma/schema.prisma:863-921`) is the authored demand
record. Fields, grouped as the schema's own comments group them:

| Group | Fields |
|---|---|
| Identity | `title VarChar(500)`, `description Text`, `status IntakeRequestStatus` |
| Requester & Sponsor | `requestedById → User`, `sponsorId → User` (both **nullable**) |
| Classification | `portfolioAreaId`, `orgNodeId`, `targetQuarter VarChar(10)`, `valueScore Int?`, `effortEstimate VarChar(10)`, `urgency VarChar(20)`, `customerName VarChar(255)`, `tags JSONB`, `strategicThemes JSONB` |
| Source linkage | `sourceType`, `intakeItemId` (unique, optional) |
| Conversion linkage | `initiativeId` (unique, optional), `conversionSnapshot JSONB` |
| Decision log | `decisionNotes Text`, `closedReason VarChar(50)` |
| Audit | `createdBy`, `updatedBy`, timestamps |

**OBSERVED** — The demand-shaping fields are all *loose*: `valueScore` is an unconstrained
1–10 integer (`schemas/intake-request.schema.ts:50`), `effortEstimate` is a T-shirt enum
`XS|S|M|L|XL` (`:51`), `urgency` is `LOW|MEDIUM|HIGH|CRITICAL` (`:52`). None of the three is
read by any planning, allocation, forecasting or ranking code. Grep confirms `valueScore`,
`effortEstimate` and `urgency` appear only in the intake service, its schema, the intake UI,
and the `getStats()` group-by (`services/intake-request.service.ts:488-492`).

**INFERRED** — Value/effort/urgency were captured for *human triage conversation*, not for
computation. The system never scored, ranked or sequenced anything with them.

### 1.2 Effort demand lived somewhere else entirely

**OBSERVED** — The quantity the planner actually consumes is `ScopeItem.skillDemand`, a
JSONB map of skill name → hours, hanging off `Initiative` with a **NOT NULL**
`initiativeId` (`prisma/schema.prisma:338-355`), plus `estimateP50` / `estimateP90` and a
`ScopeItemPeriodDistribution` spread (`:357-368`). `docs/requirements.md:26-29` names this as
the system's demand of record.

**OBSERVED — the design intent, stated** — `PLAN.md:222` (in the repo root, present on this
commit) states the rule that makes the two-entity split load-bearing:

> **"Fundamental rule: IntakeRequests do NOT consume capacity. Only Initiatives do."**

and draws the pipeline (`PLAN.md:224-234`):
`IntakeRequest (upstream funnel) → "Convert to Initiative" → Initiative (planning unit) →
"Allocate in Scenario" → Allocation (capacity consumption)`.
`PLAN.md:236-241` lists the four ways intake was meant to influence planning, of which two
matter here: *"Providing upstream prioritization signals (value score, strategic alignment,
urgency)"* and *"Enabling a pipeline view: 'Approved but not yet planned' = demand that
hasn't been resourced"*.

**INFERRED** — "Upstream prioritization signals" is the whole of the intended link between an
approved request and the plan: intake was designed to *inform* prioritization, never to
constrain it. Nothing carries the signal across the conversion boundary (§1.1: value/effort/
urgency are read by no planning code), so even that soft link was not built.

**OBSERVED** — Consequence: demand *quantity* cannot exist before conversion. An
`IntakeRequest` structurally cannot carry hours or skills — only a T-shirt size. Sizing
happens after the request has already become an Initiative, in the `SCOPING` state
(`services/scoping.service.ts`).

**INFERRED** — V1 could not answer "how much capacity would it take to say yes to everything
Commercial asked for this quarter?", because unconverted demand has no comparable magnitude.

---

## 2. How demand was prioritized

### 2.1 Priority is a property of a plan, not of demand

**OBSERVED** — `Scenario.priorityRankings Json?` (`prisma/schema.prisma:490`) is the *only*
ordinal priority in the schema. Shape: `Array<{ initiativeId: UUID, rank: positive int }>`
(`schemas/scenarios.schema.ts:7-10`; documented at `docs/scenarios.md:216, 463`).

**OBSERVED BY ABSENCE** — `Initiative` (`schema.prisma:292-336`) has no rank, no priority, no
sequence, no sort order. `IntakeRequest` (`:863-921`) has none either; its list endpoint
orders by `createdAt: 'desc'` and offers no ordering parameter
(`services/intake-request.service.ts:100`, filters at `schemas/intake-request.schema.ts:100-111`).
There was no prioritized backlog of requests — only a filterable, date-sorted list.

**OBSERVED** — `priorityRankings` has **no referential integrity**: it is a JSON blob with no
FK, no uniqueness constraint on `rank`, no check that the referenced initiative exists, and
no check that it shares the scenario's quarter. Writes validate shape only
(`schemas/scenarios.schema.ts:7-10`). Dangling IDs are discovered at read time and downgraded
to a warning string: *"Initiative … not found (rank …)"*
(`services/allocation.service.ts` autoAllocate loop, ~`:1164`).

**OBSERVED** — Because ranking is per-`Scenario` and a `Scenario` is bound to exactly one
QUARTER `Period` (`schema.prisma:485`; `services/scenarios.service.ts` clone guard requires
`PeriodType.QUARTER`), priority does not survive across quarters unless explicitly copied.
Cloning carries it only if the caller passes `includePriorityRankings`
(`services/scenarios.service.ts:404-405`); creating a REVISION always copies it (`:550`).

**OBSERVED** — Competing scenarios may hold contradictory rankings of the same initiatives
simultaneously. The only tie-break is `Scenario.isPrimary`, one per quarter, auto-set on LOCK
if no other primary exists (`services/scenarios.service.ts:290-303`).

### 2.2 What ranking mechanically does

**OBSERVED** — Rank feeds a greedy, skill-matched allocator, `allocationService.autoAllocate`
(`services/allocation.service.ts:1058+`). It refuses to run with no rankings: *"Scenario has
no priority rankings. Add initiative rankings before auto-allocating."* (`:1075`). It sorts
ascending by rank (`:1078`), then for each initiative in order consumes each employee's
remaining percentage until either demand is met or capacity runs out, emitting
`Insufficient capacity for skill "X" on initiative "Y" (rank N): Nh shortage`.

**OBSERVED** — The UI states the semantics plainly: *"Drag and drop initiatives to set
priorities. Higher ranked items get resources first."*
(`packages/frontend/src/pages/ScenarioPlanner.tsx:929`).

**INFERRED** — Priority in V1 means exactly one thing: **order of first claim on capacity
inside one quarterly plan**. It is not a commitment, not a promise of a date, and carries no
obligation to anybody outside the plan.

**OBSERVED** — Rank also selects the *scope of demand* in three other places, all by the same
"only ranked initiatives count" rule: capacity/demand gap analysis
(`services/allocation.service.ts:852-860`), baseline demand snapshot
(`services/baseline.service.ts:69-71`), and token demand derivation
(`src/planning/derive-demand.ts:45-50`, which warns *"Scenario has no priority rankings
— no initiatives to derive demand for"*). An unranked initiative is invisible to the
scenario's demand maths even if people are allocated to it.

---

## 3. Request vs. commitment

### 3.1 What the distinction actually was

**OBSERVED** — The conversion step, `intakeRequestService.convertToInitiative`
(`services/intake-request.service.ts:362-471`), is the single hinge between "asked for" and
"taken on". Its rules:

- Source must be in `APPROVED`; any other status throws
  *"Can only convert intake requests in APPROVED status"* (`:376-380`).
- One-shot: *"This intake request has already been converted"* if `initiativeId` is set
  (`:382-384`).
- It **freezes a snapshot** of the request's own terms — title, description, `valueScore`,
  `effortEstimate`, `urgency`, `customerName`, `targetQuarter`, `tags`, `strategicThemes`,
  `convertedAt`, `convertedBy` — into `conversionSnapshot` (`:417-430`).
- Both writes happen in one transaction (`:433-468`): a new `Initiative` at
  `status = PROPOSED`, `origin = INTAKE_CONVERTED`; the request moves to `CONVERTED` and
  stores `initiativeId`.
- New required fields appear only at this moment: `businessOwnerId` and `productOwnerId` are
  mandatory on the Initiative (`schemas/intake-request.schema.ts:122-123`) and have no
  equivalent on the request.
- After conversion the request is effectively read-only — `CONVERTED` is in neither
  `EDITABLE_STATUSES` nor `NOTES_ONLY_STATUSES` (`services/intake-request.service.ts:19-28`),
  so `update()` throws *"Cannot edit intake request in CONVERTED status"* (`:236-239`).

**OBSERVED** — The UI states the intended meaning: *"A new Initiative will be created in
PROPOSED status / The intake request will move to CONVERTED (read-only) / A snapshot of the
current intake data will be preserved / The initiative will be marked as Intake-origin"*
(`packages/frontend/src/components/ConvertToInitiativeModal.tsx:222-229`).

**OBSERVED** — `InitiativeOrigin` (`schema.prisma:105-109`) records provenance permanently:
`INTAKE_CONVERTED | DIRECT_PM | LEGACY`. The UI describes `LEGACY` as *"Created before the
intake process was introduced…"*
(`docs/components/frontend-ui-components.md:750`).

**INFERRED** — The snapshot is the most commitment-like artifact V1 has: it preserves *what
was asked for, in the requester's terms, at the moment it was accepted*, so that later
mutation of the Initiative cannot rewrite the ask. But it is a passive record. Nothing reads
`conversionSnapshot` back — the only reference outside the write is the UI panel that
displays it (`packages/frontend/src/pages/IntakeRequestDetail.tsx:224`). Nothing compares
delivered scope against it, and nothing alerts when they diverge.

### 3.2 The measured gap — "intake leakage"

**OBSERVED** — `services/intake-planning.service.ts` exists solely to measure how much
planned work never came through intake. It defines three pipeline states —
`APPROVED_UNCONVERTED | CONVERTED_UNPLANNED | CONVERTED_PLANNED` (`:7-10`) — and four
coverage metrics (`:22-26`, computed `:189-205`):

- `intakeCoveragePct` — planned work that originated in intake
- `intakeLeakagePct` — planned work whose initiative `origin = DIRECT_PM`, i.e. work that
  consumed capacity without ever being requested (`:167-175`)
- `conversionRatePct` — approved requests that became initiatives
- `planningCoveragePct` — approved requests that became *staffed* initiatives

**OBSERVED** — "Planned" is defined as *existence of at least one Allocation in any Scenario
for that period* (`:34-67`), with `PRIMARY_PLANNED` if the allocation is in the primary
scenario.

**INFERRED** — This is the clearest signal in the whole codebase that V1 knew request and
commitment were different things and knew the link between them was leaky. The organization
was routinely staffing work that no one had formally requested, and someone built a KPI for
it rather than a constraint. There is no enforcement anywhere that a planned initiative must
have an intake origin.

**INFERRED** — "Commitment" in V1 is not a state; it is **inferred from the accidental
existence of an Allocation row** — precisely the anti-pattern CLAUDE.md §25 warns against
("important state inferred from accidental record existence").

### 3.3 Four unrelated things called "APPROVED"

**OBSERVED** — V1 contains four independent approval mechanisms. None references any other.

| # | Mechanism | Meaning | Where |
|---|---|---|---|
| 1 | `IntakeRequestStatus.APPROVED` | The request is worth doing | `schema.prisma:96-103`; transitions `schemas/intake-request.schema.ts:5-24` |
| 2 | `Approval` model + `SCOPING → RESOURCING` | The *estimate* is accepted | `schema.prisma:370-389`; `services/scoping.service.ts:225-275` |
| 3 | `ScenarioStatus.APPROVED` / `LOCKED` | This quarterly plan is agreed / frozen | `schema.prisma:51-56`; `services/scenarios.service.ts:38-43` |
| 4 | `ApprovalRequest` / `ApprovalPolicy` / `ApprovalDecision` | Org-tree policy chain, feature-flagged | `schema.prisma:1006-1098`; `services/approval-workflow.service.ts`, `approval-policy.service.ts`, `approval-enforcement.service.ts` |

**OBSERVED** — Mechanism 2 is versioned: each approval increments `version`
(`services/scoping.service.ts:247-252`), so re-scoping produces `v1, v2, …` — a re-baselined
estimate history. `reject()` sends the initiative back to `PROPOSED` (`:282-305`).

**OBSERVED** — Mechanism 2 does not check that an estimate exists. `submitForApproval`
(`services/scoping.service.ts:186-211`) and `approve` (`:225-275`) validate only the
initiative's current status; neither requires a single `ScopeItem`. An initiative can
therefore reach `RESOURCING` — the state that means "scope accepted, go staff it" — carrying
zero demand.

**OBSERVED** — Mechanism 4 is inert unless the `approval_enforcement_v1` feature flag is on;
with the flag off, `checkApproval` returns `{ allowed: true, enforcement: 'NONE' }`
immediately (`services/approval-enforcement.service.ts:39-45`). With no matching
`ApprovalPolicy` for the resolved chain it also returns `NONE` (`:73-76`). `BLOCKING` denies
and auto-creates a `PENDING` request; `ADVISORY` allows with a warning string (`:94-144`).

**OBSERVED BY ABSENCE** — Mechanism 4 covers `ApprovalScope = RESOURCE_ALLOCATION | INITIATIVE
| SCENARIO` (`schema.prisma:123-127`), and has exactly three call sites —
`RESOURCE_ALLOCATION` (`services/allocation.service.ts:588, 699`), `INITIATIVE`
(`services/initiatives.service.ts:383`), `SCENARIO` (`services/scenarios.service.ts:257`).
**Intake is not a scope**, and the string `IntakeRequest` does not appear anywhere in
`services/approval-*.ts`. The policy engine cannot govern the request→initiative decision at
all.

**OBSERVED BY ABSENCE** — No mechanism produces a record of the form "Product commits X to
requester Y for quarter Q". The four are chained by convention only; nothing validates that
an initiative reached `RESOURCING` because a request was approved, or that a scenario was
locked containing the initiatives whose requests were approved.

---

## 4. Who could change a priority

**OBSERVED** — Two endpoints write `priorityRankings`: `PUT /api/scenarios/:id` and the
dedicated `updatePriorities` (`services/scenarios.service.ts:455-486`; documented
`docs/scenarios.md:311-312`).

**OBSERVED** — The gate is **scenario status**, not identity:

- `LOCKED` → *"Cannot update priorities of a LOCKED scenario."* (`:457-463`)
- `APPROVED` → *"Cannot update priorities of an APPROVED scenario. Return to REVIEW first."*
  (`:465-471`); same guard in `update()` at `:194-202`
- `DRAFT` and `REVIEW` → anyone with write access may reorder

**OBSERVED** — The UI tooltips restate this: DRAFT *"Fully editable. Add allocations, set
priorities…"*; REVIEW *"Under stakeholder review. Allocations and priorities can still be
adjusted."*; APPROVED *"Allocations and priorities are frozen. Return to Review to make
changes."* (`packages/frontend/src/pages/ScenarioPlanner.tsx:1039-1041`).

**OBSERVED** — Identity checks are coarse and scenario-wide, never per-initiative:

- Status transitions require `MUTATION_ROLES = [ADMIN, PRODUCT_OWNER, BUSINESS_OWNER]`
  (`services/scenarios.service.ts:45, 341-347`).
- `LOCKED → DRAFT` is an **ADMIN-only override** (`:323-330`), the sole escape from a frozen
  plan.
- Everything on the intake path is gated by a single coarse `requireSeat('decision')` —
  create, update, delete, status transition and convert all use the same guard
  (`routes/intake-requests.ts:17, 65, 80, 93, 105, 119`).

**OBSERVED** — A "decision seat" is a *licensing* concept, not a domain role:
*"Users who MAKE decisions are licensed. Users who ARE modeled are not."*
(`docs/ORG_TO_ENTITLEMENT_MAP.md:5`). `ADMIN`, `PRODUCT_OWNER`, `BUSINESS_OWNER` and
`RESOURCE_MANAGER` all hold it.

**OBSERVED — the design intended otherwise** — `PLAN.md:134-141` specifies a different actor
for each intake state:

| Status | Meaning (verbatim) | Who Acts (verbatim) | Editable? |
|---|---|---|---|
| `DRAFT` | Initial submission, incomplete | **Requester** | Full edit |
| `TRIAGE` | Under review for priority/fit | **Product ops / PM** | Edit allowed |
| `ASSESSED` | Effort/value assessed, ready for decision | **PM / Leadership** | Edit allowed |
| `APPROVED` | **Approved for planning, not yet initiative** | **Leadership** | Limited edit |
| `CONVERTED` | Linked initiative created | System (on conversion) | Read-only (except notes) |
| `CLOSED` | Rejected, deferred, or duplicate | Any authorized | Read-only |

**OBSERVED** — Only the *Editable?* column was implemented (`EDITABLE_STATUSES` /
`NOTES_ONLY_STATUSES`, `services/intake-request.service.ts:19-28`). The *Who Acts* column has
no counterpart in code: there is no `Requester`, `Product ops`, `PM` or `Leadership` role —
`UserRole` is `ADMIN | PRODUCT_OWNER | BUSINESS_OWNER | RESOURCE_MANAGER | VIEWER`
(`schema.prisma:37-43`) — and every one of the six transitions is guarded by the same
`requireSeat('decision')`.

**OBSERVED — worth quoting exactly** — the doc's gloss on `APPROVED` is *"Approved for
planning, **not yet initiative**"*. Even in the design intent, intake approval is a decision
to *consider* the work, not a promise to deliver it.

**INFERRED / significant** — Therefore **the person who files a request, the person who
triages it, the person who approves it, and the person who converts it may be the same user,
and the system neither knows nor cares**. Separation of duties on the demand path was
designed and then not built. There is no notion that approval must come from a different
party than the request.

**OBSERVED** — Reinforcing this: the scope-approval endpoint takes the approver's identity
from the **request body**, not from the authenticated session —
`scopingService.approve(id, data.approverId, data.notes)` (`routes/scoping.ts:113-118`). The
recorded approver is self-declared.

**OBSERVED BY ABSENCE** — No `PriorityChangeLog`, no priority audit trail, and no
`AuditEvent` write on the priority path. `AuditEvent` exists (`schema.prisma:982-1004`) but
is not called by `updatePriorities`. By contrast `InitiativeStatusLog`
(`schema.prisma:1202-1220`) *does* record `fromStatus`/`toStatus`/`actorId`/`transitionedAt`
for initiative milestones, and `IntakeRequest` records only `updatedBy` plus free-text
`decisionNotes`. **Initiative status is auditable; priority is not.**

---

## 5. What happened downstream when a priority changed

**OBSERVED** — Both write paths fire the same three effects and nothing else
(`services/scenarios.service.ts:214-222` and `:481-484`):

1. `scenarioCalculatorService.invalidateCache(id)`
2. `enqueueScenarioRecompute(id, 'priority_change')` — a named reason on the job queue
3. `enqueueViewRefresh('all', 'allocation_change', [id])`

**OBSERVED** — Recompute is deduped per scenario (`recompute-{scenarioId}`) with 3 retries
and exponential backoff; view refresh also runs on a 15-minute scheduler
(`docs/scenarios.md:451`).

**OBSERVED** — Recompute **re-derives numbers; it does not re-allocate anybody**. Existing
`Allocation` rows are untouched by a rank change. Re-staffing requires an explicit
two-step call: `POST /api/scenarios/:id/auto-allocate` (preview, *"no side effects"* —
`routes/scenarios.ts:282`) then `POST /api/scenarios/:id/auto-allocate/apply` (`:293`).

**OBSERVED** — Apply is destructive: it deletes *all* `AllocationPeriod` and *all*
`Allocation` rows for the scenario inside one transaction, then recreates from the proposal
(`services/allocation.service.ts:1296-1345`). Manual staffing decisions are not preserved.

**OBSERVED** — What a rank change silently alters, because these all read
`priorityRankings` as their demand scope: skill gap analysis
(`allocation.service.ts:852`), scenario comparison (`:999`), the baseline demand snapshot
(`baseline.service.ts:69`), and token demand derivation (`src/planning/derive-demand.ts:45`).
Dropping an initiative from the ranking removes its demand from every one of these while
leaving its allocations in place.

**OBSERVED** — The scenario calculator makes the ranking an outright **admission list**: it
loads only initiatives that are *both* named in `priorityRankings` *and* in status
`RESOURCING` or `IN_EXECUTION` (`services/scenario-calculator.service.ts:191-198`). Work
absent from the ranking has zero demand — it is invisible to the plan's arithmetic rather
than merely ranked last.

**INFERRED** — Removing something from a ranking and never having ranked it are therefore
indistinguishable, and both are silent. A deprioritized initiative does not appear as
"unfunded"; it simply stops existing in the numbers.

**OBSERVED** — Once a BASELINE scenario is LOCKED, drift is detected against a frozen
`BaselineSnapshot` (`schema.prisma:585-599`; captured at
`services/scenarios.service.ts:306-310`). `DeltaEngineService.computeDelta` diffs the
snapshot's `demandSnapshot` against live state *using the scenario's current
`priorityRankings`* (`services/delta-engine.service.ts:46-51`), and
`drift-alert.service.ts` raises an alert when `totalDemandDriftPct` exceeds a
`DriftThreshold` (default 10%, `:253`), with statuses `ACTIVE | ACKNOWLEDGED | RESOLVED`.

**INFERRED** — A post-lock priority change is therefore *observable as drift* but never as an
event in its own right: the system reports "demand moved 14%", not "someone demoted
initiative X". And because rank changes are blocked in `APPROVED`/`LOCKED`, the only legal
path is to walk the plan backwards — `LOCKED → DRAFT` (ADMIN only) or `APPROVED → REVIEW` —
or to create a `REVISION` scenario, which requires a `RevisionReason` from a fixed enum
`CRITICAL | COMPLIANCE | PRODUCTION_OUTAGE | EXEC_DIRECTIVE` (`schema.prisma:83-88`) and must
pass `FreezePolicy.changeFreezeDate` (`schema.prisma:601-611`;
`services/scenarios.service.ts:525-535`). Revisions are born with
`needsReconciliation = true`.

**OBSERVED BY ABSENCE** — Nothing propagates *outward*. A priority change does not touch the
`Initiative`, does not touch the originating `IntakeRequest`, does not notify the
`requestedBy` or `sponsor` user, does not alter `deliveryHealth`, and produces no
notification of any kind. Grep finds no notification/email/webhook subsystem in
`packages/backend/src`. **The person who asked for the work cannot learn from the system that
their work was deprioritized.**

---

## 6. Requesting organization vs. delivering organization

**OBSERVED BY ABSENCE** — There is no requesting-organization concept. Searching
`packages/backend` and `packages/frontend/src` for `requestingOrg`, `requesterOrg`,
`consumingOrg`, `consumerOrg`, `demandOrg`, `customerOrg`, `businessUnit`, `divisionId`
returns **zero hits**.

**OBSERVED** — "Who wants this" is representable only as:

1. `IntakeRequest.requestedById → User` and `sponsorId → User`
   (`schema.prisma:869-873`) — both **nullable**, both individuals, neither carrying an org.
2. `IntakeRequest.customerName VarChar(255)` (`:884`) — free text, indexed nowhere, joined to
   nothing, used only as a search field (`services/intake-request.service.ts:89`).

**OBSERVED** — `IntakeRequest.orgNodeId` looks like a requesting org but is not. It is
validated to reference a node with `isPortfolioArea = true` and `isActive = true`, rejecting
anything else with *"orgNodeId must reference an active portfolio area node"*
(`services/intake-request.service.ts:182-188`, repeated at `:264-270`). A Portfolio Area is a
**Product-side responsibility area**, i.e. this field records *who will own it*, not *who
asked*. `Initiative.orgNodeId` carries the identical constraint.

**OBSERVED** — `docs/requirements.md:5` sets out as goal 1 *"Org-scoped planning (**who owns
demand**, where capacity lives)"*, and `docs/requirements.md:49-50` specifies the field:
*"Add to Initiative: `owningOrgNodeId` (nullable FK) for 'who owns demand'"* — the *owner* of
demand, not its *source*.

**OBSERVED** — `owningOrgNodeId` **was never built**. Grep across `packages/` returns zero
hits; the only occurrence in the entire tree is the requirements sentence itself
(`docs/requirements.md:50`). What shipped is the untyped `Initiative.orgNodeId`
(`schema.prisma:307`), constrained to a Portfolio Area node and used for list filtering and
as the approval-chain fallback — carrying no "owns demand" semantics anywhere in code. The
intent to name a demand-owning organization exists **only in prose**.

**OBSERVED — the sharpest evidence** — the approval chain is resolved entirely from the
**delivering** side. `getAffectedNodeIds` (`services/approval-policy.service.ts:473-538`):

- `allocation` → the org node of the allocated employee's active membership
- `initiative` → the org nodes of **all employees allocated to it**; only if there are none
  does it fall back to the business owner's node — and it does so by matching
  `User.name` to `Employee.name` as a string (`:501-514`)
- `scenario` → the org nodes of all employees allocated in it

The originating `IntakeRequest`, its `requestedBy`, its `sponsor` and its `customerName`
never enter the calculation. **An initiative is approved by the organization that will build
it, never by or with the organization that asked for it.**

**OBSERVED** — V1 *did* recognise that one body of work spans several organizations, but only
on the supply side. `CrossBuStrategy` (`schema.prisma:138-141`) offers `COMMON_ANCESTOR`
(walk up to the lowest common ancestor of the contributing nodes) or `ALL_BRANCHES` (merge
each branch's chain level-by-level, de-duplicating approvers), implemented at
`services/approval-policy.service.ts:237-278`. The comment says it plainly:
*"Used for initiatives and scenarios that involve employees from different BUs."*
Cross-BU means *many teams contributing*, never *one division asking another*.

**OBSERVED** — `OrgNodeType` (`schema.prisma:111-121`) does include `DIVISION`, alongside
`ROOT | DEPARTMENT | TEAM | VIRTUAL | PRODUCT | PLATFORM | FUNCTIONAL | CHAPTER`. It is a
single tree with no separation between commercial and delivery branches, and `DIVISION`
appears in application code only as a dropdown option and a colour class
(`frontend/src/pages/OrgTreeAdmin.tsx:438`, `components/OrgTreeSelector.tsx:6`).

**OBSERVED** — At conversion, requester identities are *repurposed as delivery roles*: the
UI defaults `businessOwnerId ← intakeRequest.sponsorId` and
`productOwnerId ← intakeRequest.requestedById`
(`frontend/src/components/ConvertToInitiativeModal.tsx:22-26`;
`docs/components/frontend-ui-components.md:696`).

**INFERRED** — This is the collapse CLAUDE.md §8 forbids. V1 assumed the requester *is* a
member of the delivering organization — that intake is an internal Product funnel, not a
cross-organizational negotiation. Under that assumption a requesting org is unnecessary, and
V1 duly has none.

**OBSERVED** — `targetQuarter` is the only field that could bind a request to a delivery
window, and it binds nothing. On both `IntakeRequest` and `Initiative` it is a
`VarChar(10)`/String validated as `/^\d{4}-Q[1-4]$/`
(`schemas/intake-request.schema.ts:45-49`) and used **only as a list filter** — every
non-test occurrence is a `where` clause, a create/copy assignment, or a CSV column
(`services/intake-request.service.ts:69`, `services/initiatives.service.ts:62,612`,
`routes/initiatives.ts:35,49`). It is never compared to `Scenario.periodId`, and nothing
validates that a scenario ranks only initiatives targeting its own quarter.

**INFERRED** — The quarter a requester asked for was a label, not a promise, and could
silently disagree with the quarter the work was actually planned in.

---

## 7. The `v1/solver` line of development (second working copy)

### 7.0 What was surveyed

Working copy `/home/wiltonn/dev/projects/productfolio` (same repository, different clone).
Every `feat/*` branch below is an **ancestor of `v1/solver`**, and each contributes one engine
layer. The four `engine/governance/` files are byte-identical between
`feat/L4-governance-decision` and `v1/solver`, so citations resolve on both.

| ref | commit |
|---|---|
| `v1/solver` | `07368d6ef19b23a8b6863b5bffab32fadfee76c9` ("meta: knowledge transfer to CohesionXL", 2026-03-24) |
| `feat/L1-orchestration-graph` | `cea081844c1a1d17a484d6ec150c8602699bba6d` |
| `feat/L2-scenario-projection` | `22d60b4335f3ee72bb8ab94c8b00fb1cc024bfa5` |
| `feat/L3-constraint-validator` | `1eee5e4886e292d727f03644a2c02e35f1203edd` |
| `feat/L4-governance-decision` | `4f4c7517203ded569a746d202b74b5776770561b` |
| `feat/shared-types` | `ad85a8a67946ba07183deeac202baccff80006ea` |
| `main` | `e62c2d76…` (same as §0–§6) |

**OBSERVED** — `packages/backend/src/engine/` **does not exist on `main`**. Everything in this
section is branch-only work that never merged, and none of it changes the §0–§6 findings.

### 7.1 The "governance engine" is a feasibility gate, not a commitment mechanism

**OBSERVED** — `engine/governance/governance-engine.ts:58` — `requestTransition(itemId,
targetState)` runs a structural check (L1), projects the portfolio (L2), validates constraints
(L3), and reduces to one line at `:104`:
`const approved = violations.length === 0;`

**OBSERVED** — Output is
`GovernanceDecision { approved, scenario, violations, warnings, alternativeSuggestions }`
(`engine/governance/types.ts:9-15`). The only "alternative" it can propose is a later start
date: `AlternativeSuggestion { startPeriod, tradeoffs }` (`:55-58`).

**OBSERVED** — There is no objective function, no maximization, no LP/CP/MIP.
`docs/solver.md:129`: *"V1 uses greedy first-fit; designed for future CP solver integration."*
`docs/solver.md:238`: *"**CP solver backend** — the CapacityGrid is designed for a future
constraint programming solver to replace the greedy first-fit algorithm."*

**OBSERVED** — Nothing is ever dropped or de-scoped. If no window fits, the projector leaves
the item unscheduled and silently continues
(`engine/projection/scenario-projector.ts:74-81`, counted later as `unscheduledItems` at
`:681`); the governance engine goes further and **overbooks on purpose** —
`governance-engine.ts:215-217`: `if (!placed) { bestPeriod = earliest; }` — then reports a
violation. There is no admission control and no cut line.

**INFERRED** — Across both the merged and unmerged lines of work, the system answers *"is this
legal?"* and never *"what should we do, given we cannot do everything?"* Portfolio choice —
the act that would produce a commitment — is not modelled anywhere.

### 7.2 No actor, no persistence, no reversal

**OBSERVED** — `WorkItemStatus = 'PROPOSED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETE'`
(`engine/governance/types.ts:73`). **No `COMMITTED`, no `APPROVED`, no `REJECTED` item state.**
Approval is a property of a *transition request*, never of the work.

**OBSERVED** — `DecisionLogEntry` (`engine/governance/types.ts:153-164`) carries
`{ id, timestamp, action, request, projectedScenario, constraintsEvaluated, result, violations,
warnings, durationMs }` — and **no `actorId`**. There is no user, approver, role or authority
anywhere in `engine/governance/`.

**OBSERVED** — The log is in-memory per engine instance
(`engine/governance/decision-log.ts:10`: `private entries: DecisionLogEntry[] = []`) and
discarded at end of request; `decisionLog` appears outside the engine only in tests.
Governance decisions are **not persisted**. The only mutation is `clear()`
(`decision-log.ts:39`) — there is no way to reverse a decision.

**OBSERVED BY ABSENCE** — Across all seven refs: no `ratify`, `endorse`, `mandate`, `veto`,
`council` or `board`. `quorum` exists only as the `COMMITTEE` approval rule
(`services/approval-policy.service.ts:346-357`;
`services/approval-workflow.service.ts:594-596`) — i.e. the same feature-flagged mechanism 4
from §3.3, unchanged.

### 7.3 The app's priority signal never reaches the solver

**OBSERVED** — `priority` is a plain `number` on the engine's `WorkItem`
(`engine/governance/types.ts:66`; `engine/projection/types.ts:22-23`, commented *"Priority rank
— lower is higher priority (1 = top)"*) and is used in exactly two places, both as a sort key:
`governance-engine.ts:581` and `engine/projection/scenario-projector.ts:202, 208`. It never
weights capacity and never scores value.

**OBSERVED — the sharpest finding on this branch** — the bridge that feeds the database into
the engine **hardcodes priority to 1 for every item**:
`services/solver-bridge.service.ts:208` (`priority: 1,` for in-flight initiatives) and `:225`
(`priority: 1,` for the item being transitioned). `Scenario.priorityRankings` is never passed
in.

**INFERRED** — The one place the organization actually expressed priority was structurally
disconnected from the one component that could have acted on it.

**OBSERVED** — What the bridge does use instead is status:
`CAPACITY_GATED_STATUSES = { RESOURCING, IN_EXECUTION }`
(`services/solver-bridge.service.ts:21-24`, applied at `:198-203`). Initiatives outside those
two states are excluded from the capacity picture entirely — neither committed nor candidate,
simply invisible. The same rule appears as `DEMAND_ACTIVE_STATUSES` in the token projector
(`engine/projection/token-scenario-projector.ts:35-41`).

**OBSERVED** — The nearest thing to "committed work is pinned" is positional, not declared:
already-placed items consume capacity *before* the backlog is scheduled
(`engine/projection/scenario-projector.ts:59-63`), and only backlog items are re-sorted.

**OBSERVED BY ABSENCE** — No `committed`, `pinned`, `fixed`, `frozen`, `mustInclude` or
`locked` field on any work item type — checked at `engine/governance/types.ts:62-71`,
`engine/projection/types.ts:13-29`, and the canonical
`feat/shared-types:src/types/work-item.ts:21-33`, which carries only `id`, `name`, `state`,
`tokenRequirements`, `duration`, `dependencies` — no priority, no requester, no sponsor, no
owning org, no commitment state.

### 7.4 L1 and L3 add nothing on this axis

**OBSERVED** — L1's lifecycle is generic and value-free:
`feat/L1-orchestration-graph:…/engine/graph/default-lifecycle.json:4` —
`"states": ["backlog","ready","planned","in_progress","review","done","blocked"]`. Its only two
guards are structural: `requiresPriorState` and `notBlocked`
(`…/engine/graph/guards.ts:7, 18`). No guard consults priority, approval, capacity or
commitment; `priority` does not appear in `engine/graph/` at all.

**OBSERVED** — L3's constraint contract carries `teamId` / `periodIndex` / `tokens` only
(`feat/L3-constraint-validator:…/engine/constraints/types.ts:1-80`). Constraints therefore
*cannot* express "protect the committed work and cut the candidates", because nothing in their
input distinguishes the two. `BudgetConstraint` is a stub (`docs/solver.md:127`).

### 7.5 Stated intent about approval and cross-BU work

**OBSERVED** — `plan.md:14` records the design decision that comes closest to a durable
promise: *"| Approval chain computation | Computed at request-creation time, then
**snapshot-frozen on the request** | Avoids mid-flight corruption; changes to tree apply to
future requests only |"* — i.e. the *approver list* is frozen, not the *commitment*.

**OBSERVED** — `plan.md:11`: *"| Initiative/Scenario attachment | **Derived from impacted
employees' nodes, not directly assigned** | An initiative can span multiple BUs; approval chain
is computed from the **union of affected nodes** |"*, and `plan.md:39`:
*"**Cross-functional initiatives**: Require approval from the highest common ancestor that has
an approval policy, OR from each affected branch — configurable per policy (`COMMON_ANCESTOR`
vs `ALL_BRANCHES` strategy)."* This confirms §6: "cross-BU" always means *several delivering
BUs*, never *one division asking another*.

**OBSERVED** — `docs/solver.md:240` names the gap the authors already knew about:
*"**Approval integration** — wire governance decisions into the approval workflow for
human-in-the-loop overrides"*. Even at the end of this line of work, the algorithmic decision
and the human decision were still unconnected.

**OBSERVED** — On `v1/solver`, `docs/PRD_v1.md` is still an empty file and
`docs/directions.md` contains only the string `aud`.

### 7.6 What the solver line does *not* change

The four §0 answers hold unchanged on `v1/solver`: the request/commitment split is still
`IntakeRequest` vs `Initiative` with no commitment vocabulary; priority is still an ordinal on
a scenario (and here is additionally discarded before it reaches the solver); commitment is
still *inferred* from `InitiativeStatus ∈ {RESOURCING, IN_EXECUTION}` plus
`Scenario.status = LOCKED` + `BaselineSnapshot`; and there is still no requesting organization.

---

## 8. Contrast with `docs/domain/evidence/workforce-planner/` (the newer workforce planner)

Despite its path, `productfolio-v2/docs/domain/evidence/workforce-planner/` describes a **different, newer**
implementation (claimed branch `feat/workforce-capacity-planning` @ `3cd0dbd`), which
`SOURCE_MANIFEST.md:5` currently records as **BLOCKED — source snapshot unavailable** and
non-reproducible. This document, by contrast, is reproducible against
`e62c2d76` on `main`.

| Question | Original V1 (this survey) | Newer workforce planner (per that evidence set) |
|---|---|---|
| Is there a demand→commitment lifecycle? | **Yes** — `IntakeRequest` 6-state lifecycle with a one-way snapshotting conversion (§3.1) | **Not covered.** `WORK_CLASSIFICATION §6` treats `IntakeItem` only as *"F: read-mirror"* of Jira and records the Initiative link merely as *"via conversion"*. `IntakeRequest` is not one of the classifications analysed |
| What is Initiative? | Planning container + execution root; ranked by scenario | *"Simultaneously"* C (planning), D (execution), E (investment class), F (reporting) and partly A (ownership) — `WORK_CLASSIFICATION §4` |
| Is priority modelled? | `Scenario.priorityRankings`, JSON, per quarter | `WORKFORCE §10` names `priorityRankings` only in passing as "what a scenario ranks"; the newer model's headline apparatus is **attribution**, not ranking |
| How is "strategic vs BAU" decided? | Not decided at all; nearest proxy is `InitiativeOrigin` (provenance) and the intake-leakage KPI (§3.2) | An **absence test**: `outsideInitiativesFte` = everything deployable whose `WorkClass !== 'INITIATIVE'`. *"Strategic vs BAU is currently derived from structure, not declared"* — `WORK_CLASSIFICATION §4` |
| Where does work "belong"? | Via `priorityRankings` membership and `Allocation.initiativeId` | Via `attributionOf` / `AttributionVia` walking *the work's own home* — `WORKFORCE §18` |
| Requesting organization? | **Absent** (§6) | **Also absent.** `WORKFORCE §18`'s attribution ladder (`INITIATIVE → itself; PRODUCT → its org node; PROJECT → its initiative else org node; WORK_ITEM → …`) resolves only to *delivery* homes. No requester dimension appears anywhere in §10 or §18 |
| Initiative org ownership | Single `orgNodeId` constrained to `isPortfolioArea` | Same constraint, same single value — and `WORKFORCE §10` flags it **Conflicting** with the PRD's *"An Initiative may span multiple Products"*, with span *derived* from contributors' memberships |
| Number of owner-ish fields on Initiative | 5 (`businessOwnerId`, `productOwnerId`, `productLeaderId`, `portfolioAreaId`, `orgNodeId`) | Identical 5 — `WORKFORCE §10` "Ambiguity": *"Five ownership hooks, two of them for 'portfolio area'"* |

**Two things the contrast makes clear:**

1. **The newer implementation lost the request/commitment distinction rather than refining
   it.** The original had a genuine two-entity, two-lifecycle separation with a frozen
   snapshot of the ask. The newer evidence set does not analyse `IntakeRequest` at all and
   reduces intake to a Jira mirror, while inventing `WorkItem`, `Project`, `WorkCategory`,
   `CapacityEffect` and `attribution` — five new ways to classify work *after* it is already
   the delivering org's problem. Both implementations answer "what kind of work is this and
   who is doing it" in increasing detail, and neither answers "who asked, and what did we
   promise them".

2. **The absence of a requesting organization is consistent across both.** That makes it a
   **stable property of the historical domain model**, not an oversight in one branch — and
   it is the single largest gap against CLAUDE.md §4–§9, where Commercial Divisions are peers
   that express need to a shared Product organization. Neither implementation can represent
   that sentence.

---

## 9. UNKNOWN

- Whether `IntakeRequest` was ever used in production, or by whom. No seed data, fixtures or
  usage telemetry in the repository. `docs/PRD_v1.md` and `docs/directions.md` are **empty
  files** on both `main` and `v1/solver`; `PLAN.md` is the only surviving statement of intake
  intent, and it is a build plan rather than a product requirement.
- Who in the real organization held each of the four "approve" powers (§3.3), and whether
  `PLAN.md`'s "Requester / Product ops / PM / Leadership" (§4) named real functions or was
  illustrative. The code encodes only
  `ADMIN | PRODUCT_OWNER | BUSINESS_OWNER | RESOURCE_MANAGER | VIEWER` and a binary decision
  seat.
- Whether `valueScore` / `effortEstimate` / `urgency` were ever intended to drive an
  automatic ranking. Nothing reads them; no doc explains them.
- Whether the four approval mechanisms were meant to compose into one path, or accreted
  independently. History is only 36 commits and messages are terse.
- What the `Authority` / `AuthorityAuditLog` registry (`schema.prisma:1304-1332`) was for in
  the demand path. It has a service and routes but no observed link to intake, initiative or
  scenario decisions.
- Whether the `approval_enforcement_v1` flag was ever enabled anywhere.

---

## 10. Questions this raises for V2 (questions only — no recommendations, no terminology)

Per CLAUDE.md §2 and §9, none of the V1 vocabulary above is proposed for V2, and *Request*,
*Demand*, *Commitment*, *Priority* and *Need* remain deliberately unsettled.

1. V1 proved that a two-entity split with a **frozen snapshot of the ask at acceptance** is
   implementable and cheap. It also proved the snapshot is worthless if nothing ever reads it
   back. Does V2 need the acceptance record to be *actively compared* against what is
   delivered, and by whom?
2. V1 located priority on *the plan*. That made priority quarter-scoped, plural
   (contradictory rankings could coexist), unauditable, and invisible to the requester. Is
   priority a property of the plan, of the demand, of the relationship between an asking and
   a delivering organization — or several distinct things currently sharing one word?
3. V1 had no separation of duties on the demand path and no notification when priority
   changed. If Commercial and Product must *agree* before either can plan (CLAUDE.md §9),
   what has to become an event with an actor, and who must be able to see it?
4. V1 measured **intake leakage** — planned work nobody requested — and did not constrain it.
   Is that a metric V2 needs, an invariant V2 should enforce, or a symptom that "requested"
   and "planned" were never the right pair to compare?
5. V1 could not size unconverted demand at all, because effort lived only on `ScopeItem`
   under a NOT NULL initiative. Does V2 need demand magnitude to exist *before* acceptance,
   and if so at what fidelity?
6. Four things called APPROVED, none of them a promise to anyone. What, precisely, is the
   state that means "Product has told a Commercial Division it will deliver this", and is it
   a state at all or a relationship?
