# Original ProductFolio (V1) — Scenario, Baseline and Time

Targeted evidence extraction answering wayfinder research ticket **#7**.
**Documentation only.** No V2 design is proposed here. V1 is archaeological evidence, not
authority (CLAUDE.md §2).

## Surveyed commits

| Source | Path | Ref | Commit |
|---|---|---|---|
| Original ProductFolio (primary) | `~/dev/projects/productfolio-workspace/productfolio-v1/productfolio` | `main` | `e62c2d761f021c0063f029c3a3f96900374cf807` (2026-02-21) |
| Second working copy | `~/dev/projects/productfolio` | `v1/solver` | `07368d6ef19b23a8b6863b5bffab32fadfee76c9` (2026-03-24) |
| — | — | `feat/L2-scenario-projection` | `22d60b4335f3ee72bb8ab94c8b00fb1cc024bfa5` |
| — | — | `feat/L4-governance-decision` | `4f4c7517203ded569a746d202b74b5776770561b` |

Unless stated otherwise, citations are relative to
`productFolio/packages/backend/` in the **primary** source above. Both repos are the same
GitHub repo (`wiltonn/productfolio`); the second copy carries the later solver-line branches.

**Labels** — OBSERVED (file:line), INFERRED, UNKNOWN, OBSERVED BY ABSENCE (search scope stated).

---

## 1. Answer in brief

- A V1 Scenario was **not a deviation from a plan**. It was **the plan itself** — the only
  container in which an allocation could exist, partitioned one-per-quarter.
- There was **no plan-of-record independent of a scenario**. "The plan of record" was a
  boolean, `Scenario.isPrimary`, at most one per quarter, set by a flag flip.
- There was **no promotion operation**. Nothing merged, applied or copied a scenario's content
  onto anything else. "Promotion" in V1 = `PUT /api/scenarios/:id/primary` flipping `isPrimary`.
- **Discard = `DELETE`**, cascading to allocations. There was no archive, no tombstone, no
  version history.
- Nothing could exist outside a scenario's window, because allocations were **hard-guarded** to
  the scenario's quarter, and the migration that introduced that rule **deleted** the rows that
  violated it.
- Time was a **pre-seeded calendar tree** (WEEK → MONTH → QUARTER), not effective-dating.
- Temporal history existed for exactly one class of relationship — **employee → org unit** — and,
  unusually, V1 *did* read it as-at, but **only in roll-up reporting**. Scenario capacity
  planning used today's org. Everything else structural was a mutable scalar overwritten in
  place, and where V1 needed the past it took a **JSONB value-copy snapshot** instead.

---

## 2. What a Scenario was

### 2.1 Scenario owned the allocations

**OBSERVED** — `prisma/schema.prisma:522-546`. `Allocation.scenarioId` is `String @db.Uuid`,
**not nullable**, with `onDelete: Cascade`:

```prisma
model Allocation {
  id             String  @id @default(uuid()) @db.Uuid
  scenarioId     String  @db.Uuid
  ...
  scenario Scenario @relation(fields: [scenarioId], references: [id], onDelete: Cascade)
}
```

**OBSERVED BY ABSENCE** — searching the full backend `src/` tree of the primary source for
`plan of record` / `planOfRecord` / `promot*` returns only `README.md:95` (promoting *users* to
admin) and `docs/scenarios.md:3`. There is no `WorkforcePlan`-equivalent entity and no
allocation table outside `Scenario`.

**INFERRED** — There was nowhere in V1 to record planning intent that was not inside a scenario.
Consequence: creating a what-if and *being the plan* used the same structure, distinguished only
by flags.

### 2.2 Scenario was bound to exactly one QUARTER

**OBSERVED** — `prisma/schema.prisma:485` `periodId String @map("period_id")` (non-nullable),
and `src/services/scenarios.service.ts:154-156` rejects any non-`QUARTER` period:

```ts
if (period.type !== PeriodType.QUARTER) {
  throw new ValidationError(`Period must be of type QUARTER, got ${period.type}`);
}
```

**OBSERVED** — This was a *narrowing*. Migration
`prisma/migrations/20260129000000_scenario_quarter_lock/migration.sql` dropped a
`scenario_periods` **many-to-many junction** and collapsed each scenario to a single quarter,
picking the first period arbitrarily:

```sql
-- Step 2: Backfill period_id from scenario_periods (first period per scenario)
UPDATE "Scenario" s SET "period_id" = sp."period_id" FROM (
    SELECT DISTINCT ON ("scenario_id") "scenario_id", "period_id"
    FROM "scenario_periods" ORDER BY "scenario_id", "period_id"
) sp WHERE s."id" = sp."scenario_id";
...
-- Step 5: Drop ScenarioPeriod junction table and its foreign keys
DROP TABLE IF EXISTS "scenario_periods";
```

**INFERRED** — Scenarios were originally multi-period and were deliberately re-scoped to a
single quarter. The "first period per scenario" backfill is a silent data-meaning change for any
scenario that spanned more than one quarter.

### 2.3 Scenario was overloaded

**OBSERVED** — a single `Scenario` row simultaneously carried:

| Concern | Field | Citation |
|---|---|---|
| Quarter partition | `periodId` | `schema.prisma:485` |
| Approval workflow state | `status` (DRAFT/REVIEW/APPROVED/LOCKED) | `schema.prisma:486`, enum `:51-56` |
| Plan-of-record flag | `isPrimary` | `schema.prisma:487` |
| Lock timestamp | `planLockDate` | `schema.prisma:488` |
| Scenario *kind* | `scenarioType` (BASELINE/REVISION/WHAT_IF) | `schema.prisma:491`, enum `:77-81` |
| The initiative set + ranking | `priorityRankings Json?` | `schema.prisma:490` |
| Free-form planning assumptions | `assumptions Json?` | `schema.prisma:489` |
| **Which arithmetic engine applies** | `planningMode` (LEGACY/TOKEN) | `schema.prisma:496`, enum `:161-164` |
| Org scoping | `orgNodeId` | `schema.prisma:498` |
| Token supply and demand | via `TokenSupply.scenarioId` / `TokenDemand.scenarioId` | `schema.prisma:1242, 1261` |

**OBSERVED** — `planningMode` gates whole services:
`src/services/token-supply.service.ts:16`, `src/services/token-demand.service.ts:16`,
`src/planning/derive-demand.ts:31`, `src/planning/token-flow-model.ts:33` all throw unless
`scenario.planningMode === 'TOKEN'`.

**OBSERVED** — `TokenSupply.scenarioId` and `TokenDemand.scenarioId` are bare UUID columns with
**no Prisma relation to `Scenario`** (`schema.prisma:1241-1281`). Only `skillPool` has a
relation. Deleting a scenario therefore cascades its allocations but leaves its token rows
orphaned.

**INFERRED** — Scenario in V1 was not one concept. It was the universal partition key for
everything quarter-scoped.

### 2.4 `Scenario.version` was dead

**OBSERVED** — `version Int @default(1)` (`schema.prisma:491`) is declared and surfaced in the
service DTO (`src/services/scenarios.service.ts:26`) but is **never written**. A repo-wide grep
of `scenarios.service.ts` and `routes/scenarios.ts` finds no increment.

**OBSERVED** — the frontend "Save Version" button at
`packages/frontend/src/pages/ScenarioPlanner.tsx:1922-1928` has **no `onClick` handler**; there
is no `handleSaveVersion` in the file.

**INFERRED** — scenario versioning was designed and abandoned. No history of a scenario's own
content was retained.

---

## 3. "Baseline" — three distinct meanings, confirmed in V1

This ticket was asked to test **J11** ("three unrelated things called baseline"). V1 exhibits
the same collision, with a different third member.

| # | Thing | What it is | Citation |
|---|---|---|---|
| 1 | `ScenarioType.BASELINE` | A *kind* of scenario. Only a LOCKED BASELINE may be revised or drift-checked. | `schema.prisma:77-81`; `scenarios.service.ts:518`; `drift-alert.service.ts:22` |
| 2 | `BaselineSnapshot` | An **immutable JSONB freeze** of one scenario's capacity/demand/allocations, written once at lock. | `schema.prisma:585-599`; `baseline.service.ts:18,153` |
| 3 | `Scenario.isPrimary` | A third "this is the real one" flag, on a different axis from both. | `schema.prisma:487`; `scenarios.service.ts:350-369` |

**OBSERVED** — the three are only partly coupled. Locking sets `isPrimary` **only if no other
primary exists** for the quarter, and captures a snapshot **only if** the type is BASELINE
(`scenarios.service.ts:291-311`):

```ts
if (!existingPrimary) {
  await prisma.scenario.update({ where: { id }, data: { isPrimary: true } });
}
// Capture baseline snapshot when locking a BASELINE scenario
if (scenario.scenarioType === ScenarioType.BASELINE) {
  await baselineService.captureSnapshot(id);
}
```

**OBSERVED** — a scenario can therefore be `isPrimary` without being a BASELINE and without a
snapshot; and a LOCKED BASELINE with a snapshot need not be primary.

**INFERRED** — J11's "three flags claim the plan of record on different axes, and nothing relates
them" is **true of V1 as well**, and predates the workforce-planner. It is not a workforce-planner
regression.

### 3.1 What the snapshot was actually for: drift

**OBSERVED** — `src/services/delta-engine.service.ts:143-166` compares the frozen snapshot
against **live current rows**, not against another snapshot:

```ts
// Compare snapshot capacity entries against current live capacity data.
const employees = await prisma.employee.findMany({
  where: { id: { in: snapshotEmployeeIds } },
  include: { skills: true, capacityCalendar: { where: { periodId } } },
});
```

It then detects departed employees (`liveHours: 0`, `deltaPct: -100`) and added/removed skills
by set-differencing snapshot skills against live skills (`delta-engine.service.ts:196-200`).

**INFERRED — this is the load-bearing finding.** The only reason a JSON snapshot was needed is
that `Employee.hoursPerWeek`, `Employee.skills` and `CapacityCalendar.hoursAvailable` are
**mutable current-state with no history**. There is no way to ask "what was this employee's
capacity in Q1" other than to have frozen a copy of it. The snapshot is a workaround for absent
temporality, not a domain concept in its own right.

**OBSERVED** — `DriftAlert` (`schema.prisma:613-636`) records `capacityDriftPct`,
`demandDriftPct`, `netGapDrift` per (scenario, period), with ACTIVE/ACKNOWLEDGED/RESOLVED status
and thresholds defaulting to 5% capacity / 10% demand (`schema.prisma:637-651`).
`drift-alert.service.ts:22` restricts drift checking to `LOCKED` + `BASELINE` scenarios only.

---

## 4. Promotion and discard

### 4.1 There was no promotion

**OBSERVED** — the complete scenario route surface (`src/routes/scenarios.ts`, paths at
lines 35-367):

```
GET/POST   /api/scenarios              PUT/DELETE /api/scenarios/:id
PUT        /api/scenarios/:id/status   PUT        /api/scenarios/:id/primary
POST       /api/scenarios/:id/clone    PUT        /api/scenarios/:id/priorities
GET/POST   /api/scenarios/:id/allocations
GET        /api/scenarios/:id/capacity-demand   GET /api/scenarios/compare
GET/POST   /api/scenarios/:id/calculator[/invalidate]
POST       /api/scenarios/:id/recompute-ramp
POST       /api/scenarios/:id/auto-allocate[/apply]
GET        /api/scenarios/:id/snapshot  GET /api/scenarios/:id/delta
GET        /api/scenarios/:id/revision-delta
POST       /api/scenarios/:id/revision  PUT /api/scenarios/:id/reconcile
```

**OBSERVED BY ABSENCE** — no `/promote`, `/apply`, `/merge`, `/commit`, or `/publish` endpoint
exists. Scope: all of `src/routes/` in the primary source.

**OBSERVED** — `setPrimary` (`scenarios.service.ts:350-369`) is the entire promotion mechanism:

```ts
await prisma.$transaction([
  prisma.scenario.updateMany({
    where: { periodId: scenario.periodId, isPrimary: true },
    data: { isPrimary: false },
  }),
  prisma.scenario.update({ where: { id: scenarioId }, data: { isPrimary: true } }),
]);
```

**OBSERVED** — uniqueness of the primary is enforced **only by this transaction**. There is no
partial unique index on `(periodId, isPrimary)` in the schema (`schema.prisma:513-520` lists
plain indexes only).

**OBSERVED** — `setPrimary` has **no status precondition**. A `DRAFT` scenario can be made
primary.

**OBSERVED** — what `isPrimary` actually changes is *how allocations are labelled at read time*
(`src/services/allocation.service.ts:478`):

```ts
const isActual = ap.allocation.scenario.status === 'LOCKED' && ap.allocation.scenario.isPrimary;
```

Hours from a LOCKED + primary scenario roll up as `actualHours`; everything else is
`proposedHours` with a `proposedScenarioCount`. `docs/scenarios.md` (solver branch) states it:
*"The primary scenario's locked allocations are treated as 'actual' allocations in initiative
views (vs. 'proposed' from non-primary scenarios)."*

**OBSERVED** — `src/services/intake-planning.service.ts:44-66` derives an initiative's planning
state the same way: any allocation in any scenario ⇒ `PLANNED`; an allocation in the primary
scenario ⇒ `PRIMARY_PLANNED`.

**INFERRED** — promotion in V1 moved **no data**. It changed which pre-existing rows the read
path was willing to call real. Because scenarios are physically partitioned by `scenarioId`, the
losing scenario's rows remain in the database indefinitely, still visible as "proposed".

### 4.2 Discard was a hard delete

**OBSERVED** — `scenarios.service.ts:230-244`:

```ts
if (scenario.status === ScenarioStatus.LOCKED) {
  throw new WorkflowError('Cannot delete a LOCKED scenario.', scenario.status);
}
await prisma.scenario.delete({ where: { id } });
```

Cascade removes `Allocation` (`schema.prisma:538`), which cascades `AllocationPeriod`
(`schema.prisma:558`), `BaselineSnapshot` (`schema.prisma:597`) and `DriftAlert`
(`schema.prisma:633`). Token rows are **not** cascaded (§2.3).

**OBSERVED BY ABSENCE** — no soft-delete, `deletedAt`, `archived` or tombstone column on
`Scenario`. Scope: `schema.prisma:482-520`.

**INFERRED** — a rejected what-if left no record that it had been considered. The only surviving
trace would be `AuditEvent` rows (`schema.prisma:982-1005`), an untyped `payload Json` log
indexed by `(entityType, entityId)` — **UNKNOWN** whether scenario deletion was audited; no call
site was located in this survey.

### 4.3 The one thing that *was* a deviation: REVISION

**OBSERVED** — `createRevision` (`scenarios.service.ts:493-577`) is the closest V1 came to a
baseline/deviation pair:

- source must be `LOCKED` **and** `BASELINE` (lines 511-523);
- a `FreezePolicy` check may require a `RevisionReason` — `CRITICAL`, `COMPLIANCE`,
  `PRODUCTION_OUTAGE`, `EXEC_DIRECTIVE` (lines 525-534; `schema.prisma:83-88`);
- it creates a **new DRAFT scenario in the same quarter**, `revisionOfScenarioId` pointing at the
  baseline, `needsReconciliation: true` (lines 539-553);
- it then **copies every allocation row** into the new scenario with identical dates
  (lines 555-571).

**OBSERVED** — `computeRevisionDelta` (`delta-engine.service.ts:83-141`) diffs the revision's
allocations against the **baseline's frozen snapshot**.

**OBSERVED** — reconciliation is a flag reset only. `markReconciled`
(`scenarios.service.ts:582-598`) sets `needsReconciliation: false` and does nothing else.

**INFERRED** — a REVISION is a *fork by full copy*, not an overlay or a diff. Nothing merges it
back; it becomes primary (if at all) by the same `isPrimary` flag flip, leaving the superseded
baseline row in place. The baseline is *deviated from* only in the sense that a diff can be
computed against its snapshot.

### 4.4 FreezePolicy — a change-control gate, not a temporal concept

**OBSERVED** — `FreezePolicy` is one row per QUARTER period with a single `changeFreezeDate`
(`schema.prisma:601-611`; `src/services/freeze-policy.service.ts:21-43`).
`isFrozen` is `policy.changeFreezeDate <= new Date()` (`freeze-policy.service.ts:72`).
`validateRevisionAllowed` (lines 79-99) permits any revision once a reason string is supplied —
it does not validate the reason against the situation.

---

## 5. What happened to data outside the scenario's window

This is ticket #7's sharpest question, and V1 answers it unambiguously.

**OBSERVED** — allocations **cannot** exist outside the window. `assertDatesWithinQuarter`
(`src/services/allocation.service.ts:125-144`, called at `:600` and on update):

```ts
if (startDate < qStart || endDate > qEnd) {
  throw new ValidationError(
    `Allocation dates (...) must fall within the scenario's quarter (...)`);
}
```

**OBSERVED** — when this rule was introduced, pre-existing violating rows were **deleted**.
`prisma/migrations/20260129000000_scenario_quarter_lock/migration.sql`, Step 6:

```sql
-- Step 6: Delete allocations whose date range falls entirely outside their scenario's quarter
DELETE FROM "Allocation" a
USING "Scenario" s, "periods" p
WHERE a."scenarioId" = s."id"
  AND s."period_id" = p."id"
  AND (a."endDate" < p."start_date" OR a."startDate" > p."end_date");
```

**OBSERVED** — cloning to another quarter **offsets and clamps**, silently dropping what falls
out (`scenarios.service.ts:420-434`):

```ts
const offset = targetStart - sourceStart;
const clampedStart = new Date(Math.max(newStartDate.getTime(), targetPeriod.startDate.getTime()));
const clampedEnd   = new Date(Math.min(newEndDate.getTime(),   targetPeriod.endDate.getTime()));
if (clampedStart > clampedEnd) continue;   // dropped, no warning
```

**INFERRED** — the V2 candidate invariant **I8** ("weeks outside a scenario's quarter survive
promotion") describes the *workforce-planner's* overlay-merge behaviour. **V1 held the opposite
position**: it made out-of-window data structurally impossible, and enforced that by deletion.
The concern I8 protects against did not arise in V1 because V1 had no cross-quarter plan to
truncate — each quarter's plan was a separate scenario row, connected to the next only by an
explicit user-initiated clone.

**Cross-quarter continuity — OBSERVED BY ABSENCE.** No rollover, carry-forward or auto-seeding of
the next quarter exists. Scope: `src/services/`, `src/jobs/`, `src/routes/` of the primary
source. `cloneScenario` invoked from the "New Scenario" modal is the only path
(`docs/scenarios.md`, *Create Scenario*).

---

## 6. How V1 modelled time

### 6.1 A pre-seeded calendar tree, not effective-dating

**OBSERVED** — `Period` (`schema.prisma:235-271`) is a self-referencing hierarchy with
`type ∈ {WEEK, MONTH, QUARTER}`, `label`, `year`, `ordinal`, `parentId`, unique on
`(type, year, ordinal)`. `src/services/period.service.ts:49-150` seeds quarters, then months
under quarters, then weeks under months, for a year range.

**OBSERVED** — allocations carry raw `startDate`/`endDate` and are *materialised* into periods:
`AllocationPeriod` (`schema.prisma:548-562`) is keyed `(allocationId, periodId)` and stores
`hoursInPeriod`, `overlapRatio` ("0.0-1.0, for debugging") and `rampModifier`.

**INFERRED** — V1's atomic planning unit was the **quarter** (scenario scope, freeze policy,
snapshot, drift, token supply/demand are all quarter-keyed). Weeks exist in the calendar and in
the 13-week planner chart, but nothing is *planned* per week; weekly numbers are derived by
overlap. This differs from the workforce-planner's week-atomic allocation rows.

### 6.2 Temporal inventory

| Relationship / value | Temporal? | Citation | Used point-in-time? |
|---|---|---|---|
| `OrgMembership` employee→org node | **Yes** — `effectiveStart` / `effectiveEnd` | `schema.prisma:959-981` | **Yes** — see §6.3 |
| `EmployeeOrgUnitLink` (matrix org) | **Yes** — `startDate` / `endDate` + `relationshipType` | `schema.prisma:1362-1385` | **Yes** — see §6.3 |
| `TokenCalibration` tokens-per-hour | **Yes** — `effectiveDate`, unique `(skillPoolId, effectiveDate)` | `schema.prisma:1282-1302` | **Yes** — `derive-demand.ts:69-83` does `lte: now` + `orderBy desc`, but against wall-clock `now`, not the scenario's period. No write path found |
| `CostBand.effectiveDate` | Field exists, **series impossible** — `jobProfileId` is `@unique` | `schema.prisma:1153-1160` | **No** — `effectiveDate` never appears in a `where`; upsert overwrites the rate and its date in place (`job-profile.service.ts:153,160`) |
| `ApprovalDelegation` | **Yes** — `effectiveStart`/`effectiveEnd`, both NOT NULL | `schema.prisma:1073-1099` | **Yes** — `approval-workflow.service.ts:393-394, 560-561, 611-612` filter `lte/gte`, always against `new Date()`. Revoke truncates in place (`:536-539`) |
| `Employee.activeStart` / `activeEnd` | Partial | `schema.prisma:398-399` | **No** — read only as `activeEnd IS NULL` (`allocation.service.ts:1101`) |
| `Employee.activeStartPeriodId` / `activeEndPeriodId` | Declared | `schema.prisma:400-401` | **Never read.** Zero references in `src/` |
| `Approval` (initiative sign-off) | **Append-only, versioned** — new row per version | `schema.prisma:370-390` | Latest-version lookup (`scoping.service.ts:247-268`) |
| `ApprovalRequest.snapshotChain` | Frozen JSONB copy of the approver chain | `schema.prisma:1028-1053` | Snapshot-based, not date-based (`approval-workflow.service.ts:113, 160, 400`) |
| `ForecastRun.inputSnapshot` | Frozen JSONB, immutable run record | `schema.prisma:1176-1200` | Snapshot-based |
| `CapacityCalendar.hoursAvailable` | Per-period row, `@@id([employeeId, periodId])` | `schema.prisma:462-480` | Time-sliced, but each row is overwritten in place |
| `InitiativeStatusLog` | **Append-only history** — `fromStatus`, `toStatus`, `transitionedAt` | `schema.prisma:1202-1220` | Yes — empirical cycle-time forecasting |
| `AuditEvent` | Append-only event log, untyped `payload Json` | `schema.prisma:982-1005` | Log only |
| `BaselineSnapshot` | Frozen JSONB copy | `schema.prisma:585-599` | Diff source only |
| **`OrgNode.parentId` / `path` / `depth`** (tree *shape*) | **No** | `schema.prisma:923-957` | — |
| **`Employee.managerId`** | **No** | `schema.prisma:394` | — |
| **`Employee.hoursPerWeek`** | **No** | `schema.prisma:397` | — |
| **`Skill.proficiency` / `Domain.proficiency`** | **No** | `schema.prisma:428-460` | — |
| **`Initiative.orgNodeId`, `portfolioAreaId`** | **No** | `schema.prisma:307, 297` | — |
| **`Scenario.priorityRankings`** | **No** — untyped JSONB, no history | `schema.prisma:490` | — |
| **`TokenSupply.tokens` / `TokenDemand.tokensP50`** | **No** — one row per `(scenario, …)`, updated in place | `schema.prisma:1241-1281` | — |

### 6.3 Org membership history was genuinely used — the notable exception

**OBSERVED** — reassignment **end-dates the prior membership** rather than overwriting it
(`src/services/org-membership.service.ts:40-66`): it finds `{ employeeId, effectiveEnd: null }`,
sets `effectiveEnd` to the new `effectiveStart`, then inserts a new row.

**OBSERVED** — the reassignment is auditable and back-datable: `effectiveStart` is caller-supplied
(`org-tree.schema.ts:67,75`), and an `AuditEvent` with `action: 'REASSIGN'` and
`payload: { from, to }` is written (`org-membership.service.ts:68-76`).

**OBSERVED** — an off-by-one: the prior row's `effectiveEnd` is set to
`effectiveStart − 1 day` (`org-membership.service.ts:52-54`), leaving a one-day gap in which the
employee belongs to no org unit under a strict interval query. Recorded as an observation, not a
recommendation.

**OBSERVED** — and, unlike the workforce-planner, V1 **reads that history as-at**.
`src/services/rollup.service.ts:82-99` defines:

```ts
export function computeOverlapRatio(
  memberStart: Date, memberEnd: Date | null, periodStart: Date, periodEnd: Date
): number { ... }   // fraction of the period the membership covers
```

**OBSERVED** — `loadScenarioBundle` (`rollup.service.ts:391-415`) includes `orgMemberships` and
`orgUnitLinks` with **no `where` filter**, deliberately loading ended rows; and
`rollup.service.ts:295-300` splits an employee's hours across every org unit they belonged to
during the period, weighted by that overlap:

```ts
// Split hours proportionally across org memberships
for (const mem of memberships) {
  const ratio = computeOverlapRatio(mem.start, mem.end, periodStart, periodEnd);
  if (ratio <= 0) continue;
  const attributedHours = totalHours * ratio;
```

**OBSERVED** — the same code path switches to `EmployeeOrgUnitLink` filtered to
`relationshipType === 'PRIMARY_REPORTING'` when the `matrix_org_v1` feature flag is on
(`rollup.service.ts:240, 276-284`), using `startDate`/`endDate` identically.

**OBSERVED** — employees with **no** membership are bucketed as `unattributed`
(`rollup.service.ts:286-293`) rather than silently dropped.

**INFERRED** — an employee who moved teams mid-quarter had their quarter's hours **split between
the old and the new org unit** in V1 roll-ups. That is "what was true at the time" reporting.

### 6.3a …but only in roll-ups. Planning capacity used today's org

**OBSERVED — this materially limits §6.3.** `getEmployeesInSubtree(nodeId)`
(`src/services/org-tree.service.ts:509-541`) hard-codes `effectiveEnd: null` at `:528` with the
comment `// active memberships only`, and **takes no date parameter**.

**OBSERVED** — that is the function feeding org-scoped scenario capacity:
`src/services/scenario-calculator.service.ts:88` calls
`await getEmployeesInSubtree(orgNodeId)` with no date, so an org-scoped capacity calculation for
**any** quarter — past, present or future — uses **today's** membership.
`src/routes/org-capacity.ts:23` does the same for `GET /api/org/nodes/:id/employees`.

**OBSERVED BY ABSENCE** — no API surface accepts an as-of date.
`LinkListFiltersSchema` (`src/schemas/employee-org-link.schema.ts:78-86`) offers
`activeOnly` — a boolean — and no date filter. Every other consumer treats the interval as a
null-check: `org-tree.service.ts:268, 463-464, 482, 528`;
`org-membership.service.ts:168, 194`; `employee-org-link.service.ts:316, 350, 365, 383, 414,
447`; `allocation.service.ts:1101` (auto-allocate loads `activeEnd: { equals: null }`).

**INFERRED** — V1's as-at capability was real but confined to **retrospective reporting**.
The forward-looking planning arithmetic — the thing scenarios exist to do — read current-state
org structure only.

### 6.3b Two org mechanisms, bridged one-way, drifting

**OBSERVED** — `OrgMembership` and `EmployeeOrgUnitLink` coexist. Which one is authoritative is
decided **at read time by a feature flag** (`rollup.service.ts:240`), not by the writers.
`migrateFromMemberships` (`employee-org-link.service.ts:465-520`) is a one-shot bridge that reads
`{ effectiveEnd: null }` — **active only** (`:466`) — so ended memberships are never carried into
the link table; only the open row's `effectiveStart` survives (`:509`). Nothing keeps the two
tables in sync afterwards.

**OBSERVED** — the two paths also disagree on back-dating. `OrgMembership` accepts a caller-
supplied `effectiveStart`; `reassignPrimaryReporting`
(`employee-org-link.service.ts:248-279`) forces `const now = new Date()`, so **no back-dated or
future-effective move is possible** through the matrix-org endpoint.

**OBSERVED** — the matrix path does enforce a real DB invariant:
`prisma/migrations/20260208100000_add_matrix_org_model/migration.sql:68-70` creates a partial
unique index `employee_org_unit_links_one_active_primary ON (employee_id) WHERE
relationship_type = 'PRIMARY_REPORTING' AND end_date IS NULL`. It constrains only the *open*
interval; overlapping closed intervals remain permitted.

**OBSERVED** — `updateLink` (`employee-org-link.service.ts:127-188`) mutates `allocationPct` and
`consumeCapacity` **in place** on a live row; only an `AuditEvent` payload records the previous
value.

### 6.4 …but the tree itself was overwritten in place

**OBSERVED** — `moveNode` (`src/services/org-tree.service.ts:171-225`) rewrites the materialised
path of the node **and every descendant** with no history:

```ts
const oldPath = node.path;
const newPath = `${newParent.path}${nodeId}/`;
...
// Update all descendants: replace the old path prefix with the new one
const updatedPath = desc.path.replace(oldPath, newPath);
```

**OBSERVED** — every ancestor/subtree roll-up query is driven by that live path
(`org-tree.service.ts:420, 443, 516`).

**OBSERVED** — `org-tree.service.ts:268, 464, 482, 528` all filter memberships by
`effectiveEnd: null` — i.e. the *tree-rendering* endpoints deliberately show only current
membership. The as-at logic lives solely in `rollup.service.ts`.

**OBSERVED** — the **only** record of a prior tree shape is an `AuditEvent` with
`payload: { oldParentId, newParentId }` (`org-tree.service.ts:229-237`). `deleteNode` is a soft
delete flipping `isActive` (`schema.prisma:932`), with no end date.

**INFERRED** — V1 was split. **Who was in a unit** was historical and used historically (in
roll-ups). **What the unit's place in the hierarchy was**, and **which unit an initiative
belonged to**, were current-state only. Re-parenting an org node retroactively changed every past
subtree roll-up; moving a *person* did not.

**OBSERVED** — the consequence compounds: `rollup.service.ts` resolves a *historical* membership
to a node whose `parentId`/`path`/`depth` reflect **today's** tree. The period-weighted
attribution is therefore correct at the leaf and wrong at every ancestor after a reorg.

### 6.5 V1's actual point-in-time mechanism was the value-copy snapshot

**OBSERVED** — the same pattern appears three times, independently, always as a JSONB freeze of
data whose source rows carry no history:

| Snapshot | What it freezes | Written | Read |
|---|---|---|---|
| `BaselineSnapshot` | capacity, demand, allocations for one scenario | `baseline.service.ts:153` (at lock) | `delta-engine.service.ts` (drift) |
| `ApprovalRequest.snapshotChain` | the approver chain at request time | `approval-workflow.service.ts:113`, `approval-enforcement.service.ts:123` | `approval-workflow.service.ts:160, 400` |
| `ForecastRun.inputSnapshot` | forecast inputs for one run | `schema.prisma:1184` | run record |

**INFERRED** — where V1 needed to know "what was true then", it did not query a temporal model;
it had earlier taken a copy. Snapshotting was V1's substitute for temporality, and each snapshot
is an untyped JSONB blob whose schema is enforced only by the TypeScript cast at the read site.

### 6.6 Temporal support was only ever added, never removed

**OBSERVED** — a grep of every `prisma/migrations/*/migration.sql` for
`DROP COLUMN|DROP TABLE|RENAME COLUMN` returns exactly one hit: the `scenario_periods` drop of
§2.2. No temporal column was ever removed.

**OBSERVED** — temporal columns were introduced in four migrations only:
`20260207000000_add_org_audit_approval_models` (`OrgMembership.effectiveStart/End` at `:49-50`,
`ApprovalDelegation` at `:127-128`, indexes at `:158, :206`),
`20260207000002_add_job_profiles` (`cost_bands.effective_date` at `:35`),
`20260208000001_add_token_domain_tables` (`token_calibrations.effective_date` at `:46`, unique
index at `:88`), and `20260208100000_add_matrix_org_model` (`:30-31, :39-43, :68-70`).

**INFERRED** — temporality in V1 was a late, additive, four-model afterthought, not a founding
property of the model.

---

## 7. The later solver line abandoned persisted scenarios entirely

Included because the ticket names `feat/L2-scenario-projection` as directly relevant.

**OBSERVED** — `src/types/scenario.ts` (`v1/solver`): *"A scenario is an immutable snapshot of
projected work item states, capacity allocations, and constraint evaluations."* The type is a
`readonly` in-memory structure holding `projectedWorkItems`, a `CapacityGrid`
(`ReadonlyMap<TeamId, ReadonlyMap<PeriodId, CapacitySlot>>`), `constraints`,
`constraintResults`, `feasible`, `violations`. **No id-to-database mapping, no status, no
`isPrimary`.**

**OBSERVED** — `productFolio/packages/backend/src/engine/projection/scenario-projector.ts`
(`feat/L2-scenario-projection`): *"Builds projected Scenario objects by applying proposed changes
to the current portfolio state. The projector does NOT validate."*

**OBSERVED** — `.../projection/token-scenario-projector.ts` (`v1/solver`) states the design
decisions explicitly:

```
 *   - All projections are in-memory (no DB writes)
 *   - Supply is cloned but never mutated (transitions affect demand only)
 *   - Only L4 governance decides whether to persist
```

**OBSERVED** — `.../engine/governance/governance-engine.ts:271` (`feat/L4-governance-decision`)
`whatIf(changes)` builds `const baseline = this.projectScenario(currentItems)` from the live
in-memory item set, applies changes to a `new Map(this.items)` copy, and returns a
`WhatIfDelta` of new/resolved violations. **OBSERVED BY ABSENCE** — grepping the L4 engine for
`prisma|persist|commit` returns nothing; nothing is written back.

**INFERRED** — in the solver line the words flip meaning. "Baseline" becomes *the current state*
(computed, never stored) and "scenario" becomes *a transient projection*. The persisted
`Scenario` table remains untouched by this layer, so the two models coexist without either
superseding the other. **UNKNOWN** whether an L4 persistence path was ever designed; the
implementation plan on `feat/L2-scenario-projection` describes the new layers as attaching to
existing entities *"via FKs and computed views, without duplicating core domain concepts."*

---

## 8. Findings against the V2 evidence set

The comparison targets in `docs/domain/evidence/workforce-planner/` describe the **newer workforce-planner**,
not this codebase. Statements below are about **V1 only**.

| V2 item | V1's position | Basis |
|---|---|---|
| **J11** three baselines | **Confirmed, and older than the workforce-planner.** `ScenarioType.BASELINE`, `BaselineSnapshot`, `Scenario.isPrimary` — three axes, weakly coupled at lock time only. | §3 |
| **J16** org is current-state, allocation is a time series | **Mostly true in V1, with one real exception.** True for the org *tree*, `managerId`, `hoursPerWeek`, skills, `Initiative.orgNodeId`, and true for **planning** capacity. **False for employee→org-unit membership in roll-up reporting**, which is both stored *and read* as-at. | §6.2-6.4 |
| **J18** scenario's initiative set is untyped JSONB | **Confirmed in V1.** `Scenario.priorityRankings Json?` (`schema.prisma:490`) is the scenario's initiative set; staffing of the same initiatives is a fully indexed table. | §2.3 |
| **I6** planning intent must exist outside any scenario | **V1 violated this.** `Allocation.scenarioId` NOT NULL; no non-scenario plan exists. This is the specific pain the workforce-planner's `WorkforcePlan` was created to relieve. | §2.1 |
| **I7** a what-if must not alter the plan of record | **V1 satisfied it structurally and trivially.** Scenarios are physically disjoint row sets; no overlay, no shared rows, so no write path could cross. But V1 also had no plan of record to protect — only a flag. | §2.1, §4.1 |
| **I8** weeks outside a scenario's quarter survive promotion | **Not applicable to V1, and V1 took the opposite stance.** Out-of-window rows were forbidden by guard and **deleted** by migration; clone silently clamps. | §5 |
| **I20** org assignments change over time and history is preserved | **V1 supports I20 more strongly than the workforce-planner does**, but only in reporting. Same storage (`OrgMembership.effectiveStart/End`, `EmployeeOrgUnitLink.startDate/endDate`) *plus* a real as-at consumer in `rollup.service.ts`. | §6.3, §6.3a |

### The J16 / I20 contradiction — which side V1 was on

I20 notes its own weakness: *"The storage invariant holds. The use does not: no query filters
membership 'as at' a date."* J16 asserts *"`OrgMembership` and `EmployeeOrgUnitLink` both retain
history and are the only structures that could answer 'as at', and no query uses them that way."*

**In the original ProductFolio, one query does.** `rollup.service.ts:82-99` and `:295-300`
prorate an employee's quarterly hours across every org unit they belonged to during the quarter,
weighted by date overlap, and `loadScenarioBundle` (`:391-415`) loads ended memberships
specifically so that it can. **V1's evidence therefore lands on I20's side of the contradiction,
but narrowly and in one direction only:**

- **For retrospective roll-up reporting** — I20 holds outright. The capability is real and
  exercised.
- **For forward planning capacity** — J16 holds. `getEmployeesInSubtree`
  (`org-tree.service.ts:528`) hard-codes `effectiveEnd: null` and takes no date, and
  `scenario-calculator.service.ts:88` calls it that way, so an org-scoped capacity number for any
  quarter uses today's membership.
- **For every other structural relationship** — J16 holds. `OrgNode.path`, `managerId`,
  `Initiative.orgNodeId`, `hoursPerWeek`, `Skill.proficiency` are mutable scalars whose mutation
  retroactively rewrites history. Because `OrgNode.path` is among them, even the as-at roll-up
  is only correct at the leaf: after a reorg it attributes historically-correct leaf hours to a
  present-day ancestor (§6.4).

**INFERRED** — J16 and I20 are not contradictory once "organizational relationship" is split
along two axes at once: *membership* (person→unit) versus *structure* (unit→unit, work→unit);
and *reporting* reads versus *planning* reads. V1 shows the split concretely — it was temporal on
exactly one cell of that 2×2 and current-state on the other three. The two statements describe
different cells of the same grid, conflated under one label.

---

## 9. Open questions this survey did not settle

Resolved during this survey:

- `TokenCalibration.effectiveDate` **is** selected as-of (`derive-demand.ts:69-83`), but against
  wall-clock `now`; **no write path exists** for it anywhere in `src/` (§6.2).
- `Employee.activeStartPeriodId` / `activeEndPeriodId` are **never read** — zero references in
  `src/` outside the schema (§6.2).

Still open:

- **UNKNOWN** — Was scenario deletion written to `AuditEvent`? No call site was located; only the
  model was inspected.
- **UNKNOWN** — Whether the multi-period `scenario_periods` junction dropped in the
  2026-01-29 migration reflected a real workflow that was lost, or an unused generality.
- **UNKNOWN** — Whether any L4 governance decision was ever intended to write back to the
  persisted `Scenario`/`Allocation` tables.
- **UNKNOWN** — Which of `OrgMembership` / `EmployeeOrgUnitLink` was intended to win. The
  `matrix_org_v1` flag chooses at read time, the one-shot bridge is lossy, and nothing keeps
  them in sync (§6.3b).
- **UNKNOWN** — Whether the one-day gap left by `OrgMembership` reassignment
  (`org-membership.service.ts:52-54`) was deliberate or a defect; no test asserts either way.
