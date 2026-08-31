# Workforce Planner User Workflows

Workflows actually supported or implied by the implementation. Each is documented as:
actor · starting state · action · domain objects · rules/calculations · resulting state ·
unresolved ambiguity.

---

## W1 — Manager imports the employee census

**Actor** — an admin with `requireSeat('decision')` and `employee:write`. Route
`/admin/employee-import`; no feature flag.

**Starting state** — an XLSX export from an HR system (observed real file: 2,326 rows,
147 KB) with columns `Employee ID`, `Full Name`, `Supervisory Organization`, `Position`,
`Job Title`, `Job Family`, `Worker's Manager`, `L2`–`L9`.

**Action** — three explicit steps: `POST /api/employee-census/batches` (browser
base64-encodes the workbook into a JSON body — there is no multipart plugin), review the diff
in six tabs (New / Changes / Unchanged / Problems / Not in file / Org preview), then
`POST .../publish` with `{ confirm: true }`. `POST .../abandon` discards instead.

**Domain objects** — `EmployeeCensusImportBatch`, `EmployeeCensusImportRow`, `Employee`,
optionally `WorkforceAllocation` (proposals), `AuditEvent`, the `employee-census-publish`
BullMQ queue.

**Rules / calculations**
- Idempotency on `Employee.externalId`. Re-importing the same file yields all `UNCHANGED` and
  writes nothing. Employee IDs are strings; zero padding (`"001008"`) is significant, so the
  parser reads `cell.text`, never `cell.value`.
- `Position` annotations peel off iteratively: `(On Leave)` → review badge,
  `(Close:MM/DD/YYYY)` → proposed `activeEnd`, anything else (`(DE)`, `(UK)`, `(SI/HR)`) →
  a region code recorded but unused.
- `activeEnd` is only ever **set**, never cleared: *"a blank column is missing information,
  not an instruction to erase"*.
- A manager name's trailing parenthetical is stripped before resolution.
- A **self-managed** row is the org root and imports with `managerId: null`.
- Manager **cycles** block the row — `resources.service.ts` only guards direct
  self-management, so `A→B→A` would otherwise pass.
- `L2`–`L9` are a redundant denormalisation of the manager chain; a mismatch is a **warning**,
  never an error.
- Publish runs three passes: **A** upsert employees with `managerId` untouched (so a manager
  appearing later in the file than their report still exists), **B** set `managerId` grouped by
  target manager as one `updateMany` each, **C** opt-in hard deletes one at a time, each
  preceded by an audit entry.
- A **stale-batch guard** aborts publish if the employee set changed between staging and
  publishing.
- Nothing is wrapped in a transaction, deliberately: *"Postgres aborts a whole transaction on
  first error, which would roll back writes the summary already counted."* A failed chunk is
  retried row-by-row so per-row error attribution survives batching.

**Resulting state** — `Employee` rows created/updated, manager links set. **No `OrgNode`,
`EmployeeOrgUnitLink` or `JobProfile` rows are ever created.** Supervisory Organization and
the L-columns are shown in a read-only Org preview tab only.

**Unresolved ambiguity**
- The file's richest organizational signal (`Supervisory Organization` → `Division - Team
  (Manager)`) is parsed, displayed, used to *propose allocations*, and then discarded. Nothing
  persists the org structure it describes.
- **UNKNOWN** — whether the census is intended to become the source of truth for org
  structure, or to remain a people-only feed.

**Complexity signal** — three publish passes, a stale-batch guard, a `PUBLISHING`-state
recovery path for killed workers, a 200-entry error cap persisted twice, and an amber-vs-green
banner distinction. **INFERRED** — the complexity is operational (scale, partial failure), not
domain ambiguity.

---

## W2 — Census proposes allocations

**Actor** — the same admin, at publish time.

**Starting state** — a staged batch, an ACTIVE baseline `WorkforcePlan`, and org nodes that
may or may not match the sheet's supervisory organizations.

**Action** — `GET /api/employee-census/batches/:id/allocation-proposals` previews;
`proposeAllocations: true` on the publish body applies.

**Rules / calculations**
- The proposal is *"this person's deployable time goes to their own team's product work, at
  100%, for the plan's horizon"* — a `PRODUCT` target at `PROPOSED_PCT = 100`.
- The **team** is matched before the **division**, *"because `Product & Technology - CD&A`
  should land on CD&A rather than on all of Product & Technology"*.
- The L2–L9 chain is deliberately **not** used as a second source: *"inferring allocation from
  it would mean trusting a column the importer has already decided not to trust."*
- Four rules: nothing is authoritative (`status = PROPOSED`, `source = IMPORT`); applying is
  opt-in per publish; **proposals fill gaps and never argue with the plan** — anyone with *any*
  allocation in the window is skipped whole; no org node, no proposal.
- Unmatched supervisory orgs appear in `unmatchedOrgs` with a headcount and the
  division/team looked for — *"which doubles as a worklist"*.
- The preview is **recomputed, not frozen**, so it stops being stale the moment someone creates
  the missing node.
- Pass D runs last and **cannot fail the publish**: a missing set of proposals is *"a reviewable
  gap, not a reason to fail a 2,300-row import"*.

**Resulting state** — `PROPOSED`/`IMPORT` weekly rows across the plan horizon, indistinguishable
from manual rows to every capacity calculation.

**Unresolved ambiguity**
- **OBSERVED** — Nothing promotes a `PROPOSED` row. The design says *"a manager confirms by
  promoting the status"*, and no code performs the promotion. There is no UI for it.
- **OBSERVED** — `PROPOSED` rows count toward committed capacity, over-allocation and token
  supply exactly like `COMMITTED` rows. The distinction is recorded and inert.
- **UNKNOWN** — whether an unconfirmed proposal should count as capacity.

---

## W3 — Manager plans weekly allocations in the grid

**Actor** — a manager on `/workforce`, behind `workforce_plan_v1`.

**Starting state** — an ACTIVE baseline plan (if none, the page offers a single button to
create one). Horizon defaults to 13 weeks from this Monday; options are 12 / 13 / 26.

**Action** — the loop the PRD names: **scan → identify problem → adjust → see impact**.
Three views: Planner, Roll-ups, Scenario link.

**Domain objects** — `WorkforcePlan`, `WorkforceAllocation`, `Period(WEEK)`, `Employee`, and
whichever of `OrgNode` / `Initiative` / `Project` / `WorkItem` a row targets.

**Rules / calculations**
- Employees down, weeks across, one row per target, a TOTAL row per employee. Rows are ordered
  `PRODUCT, INITIATIVE, PROJECT, WORK_ITEM, CATEGORY, RESERVED` — *"Reserved time sits at the
  bottom, under the real work, the way it would in a planning spreadsheet."*
- The TOTAL is computed from the same rows the grid renders *"so the total can never disagree
  with the cells above it."*
- Cell colouring by `CapacityState ∈ {EMPTY, UNDER, AT, OVER}`.
- The client recomputes the TOTAL on keystroke using a **mirror** of the backend arithmetic
  (`workforce-capacity.ts`), because *"a round trip per keystroke would make the grid feel like
  a form."* The server stays authoritative.
- `?managerId=` filters the roster; an "Over-allocated only" checkbox filters to employees with
  `horizon.overAllocatedWeeks > 0`.
- Every query is batched across the whole roster — a constant number of statements regardless
  of headcount.

**Resulting state** — weekly rows written; capacity numbers move immediately.

**Unresolved ambiguity**
- **OBSERVED** — The grid only ever opens the **baseline**. `useWorkforceBaseline()` is the only
  plan loader on the page; there is no plan or scenario selector for the grid itself. Overlays
  exist and are API-only.
- **UNKNOWN** — how a manager edits a scenario overlay in the UI. The implementation plan calls
  this *"the largest gap: overlays are the point of Phase 13 and no button reaches them."*

---

## W4 — Manager range-edits a run of weeks

**Actor** — the same manager.

**Starting state** — a row with per-week values.

**Action** — click-drag across cells in one row, then apply a percentage (or Clear) in the
`RangeEditBar`.

**Rules / calculations**
- `PUT .../bulk` takes `{ employeeId, target, from, weeks, weekIndices, allocationPct }` and
  returns `{ weeks, created, updated, deleted, unchanged }` — **unchanged weeks are left alone
  rather than rewritten**.
- Capped at `MAX_RANGE_WEEKS = 104`.
- Applying `0` **deletes** the rows: *"an allocation of 0% is the absence of one."*
- Changing the horizon clears any live selection, *"because a selection held across that change
  would point at the wrong weeks."*
- A drag can end anywhere, so the mouse-up is caught on `window`, not per cell.

**Resulting state** — a contiguous run of weeks at one value.

**Unresolved ambiguity** — **OBSERVED** — a range edit does not distinguish "correct the past"
from "change the plan going forward". Both write identical rows and neither touches `status`.

---

## W5 — Manager adds an allocation row

**Actor** — the same manager, via the `+` on an employee row.

**Action** — one dialog, *"the one place in the planner where a dialog is right: choosing a
target is a search across products, initiatives, projects and work items, not a value to type
into a cell."*

**Rules / calculations**
- Six kinds offered, with hint text that is the clearest statement of intent in the codebase:
  - **Product** — *"Ongoing ownership work. Product work does not have to belong to an
    initiative."*
  - **Initiative** — *"A temporary, outcome-oriented effort, which may span several products."*
  - **Project** — *"An optional execution container. A project may sit under an initiative,
    under a product, or on its own."*
  - **Work item** — *"One piece of executable work. Allocating this precisely is a choice,
    never a requirement."*
  - **Category** — *"Work with no structural home — support, maintenance, discovery."*
  - **Reserved time** — *"Time that is not deployable: PTO, management, administration."*
- The duplicate check runs **client-side** against a mirrored `keyFor()` that reproduces the
  server's canonical `targetKey` grammar.
- Projects and work items can be **created inline**, with a single "Belongs to" select
  encoding org node / initiative / project — *"a single 'Home' control beats three
  mutually-exclusive pickers, and it makes 'no home' a deliberate choice rather than three
  fields left blank."* The hint states the consequence: *"Without a home, this work can only be
  reported as uncategorised."*
- A new row is filled **across the whole visible horizon** and trimmed afterwards.

**Resulting state** — a new target row across the horizon.

**Unresolved ambiguity**
- **OBSERVED** — the "Product or team" picker accepts `PRODUCT, PLATFORM, TEAM, DIVISION,
  DEPARTMENT`. A user allocating to a division and a user allocating to a team produce the same
  target type with different granularity, and no roll-up distinguishes them.
- **OBSERVED** — inline creation is the *only* way to create a Project or WorkItem in the UI,
  and there is no way to edit or archive one afterwards.

---

## W6 — Manager reads roll-ups

**Actor** — manager or portfolio leader, Roll-ups tab.

**Rules / calculations**
- Five stat tiles: Contracted capacity, Committed to work, Deployable, Reserved,
  Outside initiatives.
- Ranked bars in a **single hue** for product / initiative / category, *"length already
  carries magnitude, so shading by value would encode the same thing twice"*.
- The team panel is a **stacked bar on a capacity track**, *"so unallocated capacity is
  literally the empty space at the end"*.
- FTE divided by window length so it *"reads as an average headcount rather than a sum over
  weeks"*.
- Reserved time is deliberately **not** a fourth series: *"it is capacity the organisation does
  not have, so it reads as neutral absence rather than a kind of output."*
- Two questions kept apart because they need different sources:
  | Question | Endpoint | Grouped by |
  |---|---|---|
  | How much capacity does X *consume*? | `/aggregations/targets` | the allocation's target |
  | How much of X's capacity goes to initiatives? | `/aggregations/teams` | the employee's org membership |

**Unresolved ambiguity**
- **OBSERVED** — `/aggregations/targets` returns `initiatives` filtered by
  `targetType === INITIATIVE`, while `initiativeContributors` and the scenario link use
  attribution. **An initiative whose work is all filed as work items reports zero in the
  first and correctly in the second.** The implementation plan's risk register flags this.

---

## W7 — Scenario overlay: branch, promote, discard

**Actor** — API-only. No UI reaches it.

**Rules / calculations**
- The overlay covers the **intersection of the plan and the scenario's quarter**. Outside that
  window the baseline is the only truth, *"so a what-if cannot silently rewrite next year's
  plan."*
- Branching **copies rows** rather than storing deltas, in chunks of 500. Rationale: every read
  stays a flat `WHERE planId = ?`; a delta overlay *"forces a baseline merge into every one of
  those queries, and needs tombstone rows to express 'remove this allocation'."* ~8k rows per
  overlay; *"revisit past roughly 50 concurrent overlays."*
- Promotion **merges into the baseline in place** rather than flipping `isBaseline`. Two
  reasons: weeks outside the quarter survive *structurally* (never named in a `WHERE` clause)
  rather than by a copy step that could be written wrong; and the baseline keeps its id so a
  bookmarked URL does not start pointing at an archived plan.
- Promotion is **transactional**; a half-finished promotion is *"simply corrupt, and there is
  nothing per-row to attribute."*
- Discard **deletes** (requires `confirm: true`), because `scenarioId` is unique and an archived
  overlay would hold the slot forever.
- One definition of "the quarter's weeks", shared by branching, promotion and the supply
  provider: a week belongs to the quarter its **Monday** falls in.
- A `LOCKED` or `APPROVED` scenario freezes its overlay.
- Creating or deleting an overlay says **nothing** about capacity authority — that is
  `Scenario.capacitySource`, changed only by an explicit write.

**Unresolved ambiguity**
- **OBSERVED** — an overlay is a *copy*, so once branched it stops tracking baseline changes.
  Nothing detects or reports divergence.
- **UNKNOWN** — what should happen to a scenario overlay when the baseline is edited underneath
  it.

---

## W8 — Choosing a scenario's capacity source

**Actor** — API-only (`PUT /api/scenarios/:id/capacity-source`).

**Rules** — `capacitySource ∈ {LEGACY, WORKFORCE_PLAN}`, default `LEGACY`, orthogonal to
`planningMode ∈ {LEGACY, TOKEN}`. All four combinations are valid and tested. The `GET`
returns both together *"because they are routinely confused, and seeing them side by side is
the cheapest way to show they are separate."*

**Rationale on record** — `docs/ADR_SCENARIO_CAPACITY_SOURCE.md` chose explicit over
row-existence inference. A third `PlanningEngine` was rejected *"for multiplying the two axes
together (four engines, growing multiplicatively)."*

**Unresolved ambiguity** — **OBSERVED** — a scenario on `WORKFORCE_PLAN` with no overlay and no
baseline gets **zero capacity**, deliberately: *"Zero capacity is the honest answer — better
than silently falling back to the legacy numbers, which would hide that the source is
unusable."*

---

## W9 — Deriving token supply from the plan

**Actor** — API-only (`POST /api/scenarios/:id/derive-token-supply?dryRun=true`).

**Rules / calculations**
- Sum `DEPLOYABLE` allocation × `hoursPerWeek` over the scenario quarter's weeks; resolve
  skills to pools **by lowercase name match**, the same rule `derive-demand.ts` uses; apply
  `TokenCalibration.tokenPerHour`.
- An employee's hours are **split across their pools by proficiency share, never duplicated**,
  *"so one engineer with two skills would invent capacity"* otherwise. Zero-proficiency falls
  back to an even split.
- `capacity-supply.getSkillCapacity` deliberately **does** double-count, *"where overlap is the
  point"*. Two functions, opposite conventions, both live.
- Unattributable hours are reported as `unattributedHours` with a warning, never dropped.
- Requires `capacitySource = WORKFORCE_PLAN`; otherwise the ledger would contradict the
  scenario's own declared source.
- `MANUAL` rows are never overwritten, and `upsert` stamps `MANUAL` on **update** as well as
  create: *"A human touching a row is exactly what makes it manual."*
- **Nothing is written when the derivation finds no employees**: *"an empty plan is a
  misconfiguration, and wiping a scenario's supply over one would be the wrong reading of it."*

**Unresolved ambiguity** — **OBSERVED** — supply is per-pool; demand is per-initiative-per-pool.
There is no per-initiative supply, so a per-initiative ledger is not computable. The phase-17
work explicitly declined to invent one.

---

## W10 — Reconciling scenario initiatives against the plan

**Actor** — manager, `/workforce` → Scenario link tab (added `3cd0dbd`).

**Rules / calculations**
- Three lists: **staffed but unranked** (the plan spends capacity on it; the scenario never
  ranked it), **ranked but unstaffed** (a commitment with nobody on it), **both**.
- Deliberately **not gated on `capacitySource`** — *"reading what the plan says about a
  scenario still on LEGACY is the reconciliation a user needs; refusing to show it would be
  refusing to show the disagreement."*
- The derive endpoint **appends only**: initiatives the plan staffs but the scenario does not
  rank are added at the end of `priorityRankings`, ordered by planned FTE. Never reorders,
  never removes. Rationale on record: `priorityRankings` is untyped JSONB with no `source`
  column, so the `TokenSupply.source = MANUAL` protection *cannot be expressed*, and the
  discipline is enforced structurally instead.
- "Allocate someone" is **two clicks by design**: the panel knows the initiative but has no
  employee context, so it carries the initiative back to the grid and the next `+` supplies the
  person.
- `plannedHoursInQuarter` and `estimatedTotalHoursP50/P90` are printed side by side with **no
  ratio derived**, because the estimate is total un-timeboxed effort and the planned hours are
  one quarter's worth.

**Unresolved ambiguity**
- **OBSERVED** — this reconciles *plan-staffed vs scenario-ranked*. It does **not** reconcile
  `WorkforceAllocation` against legacy `Allocation`. Nothing does.
- **UNKNOWN** — whether "the scenario's initiatives" should be JSONB rankings at all.

---

## W11 — Deleting an employee

**Actor** — manager (single delete) or census reviewer (bulk).

**Rules** — every relation to `Employee` is `onDelete: Cascade`, so a delete *"never fails on a
foreign key — it destroys dependent rows: **all allocations in every scenario**, plus skills,
domains, capacity calendar, and org links."* `managerId` and `OrgNode.managerId` are `SetNull`,
so deleting a manager **orphans their direct reports**.

| | Census bulk delete | Single delete |
|---|---|---|
| Entry | "Not in file" tab, opt-in per row | trash icon on `/capacity` |
| Unconfirmed | ids not in the absent list rejected | **409** with impact in `details.impact` |
| Confirmation | type `DELETE <n>` | type the employee's name |
| Audit | `CENSUS_DELETE` | `DELETE` |

`confirm` is only required when the impact is `DATA_LOSS`. The audit entry is always written
**before** the delete, *"because afterwards the cascaded rows are gone and it is the only
remaining evidence."*

**OBSERVED** — An employee whose census row is `INVALID` is **not** listed as absent — *"the
file does mention them, and offering a present employee for a cascading delete would be
dangerous."*

**Unresolved ambiguity** — **UNKNOWN** — whether a departed employee should be deleted at all,
versus `activeEnd`-dated. Both paths exist and only one preserves history.

---

## W12 — Workflows the brief names that are NOT supported

**OBSERVED BY ABSENCE**:

| Workflow | Status |
|---|---|
| Assign an employee to a team **through the planner** | Not supported. Membership is `/api/org/memberships`, a separate admin surface. |
| Teams belong to Product Areas | Only via the generic `OrgNode` parent tree; nothing enforces or names such a relationship. |
| Allocations move between areas **over time** | Only by editing week rows. There is no "transfer" operation and no record that a move happened. |
| Allocations span date ranges | Not in the workforce path — a row is one week. Only legacy `Allocation` has ranges. |
| Managers plan **future quarters** | Supported only within `horizonWeeks` (≤104) from a chosen `from` date. Nothing is quarter-scoped in the planner. |
| Engineering capacity as a distinct thing | No such concept. |
| Sustain work as a bucket | No such concept; four separate `WorkCategory` members approximate it. |
| Scenario alters allocations **in the UI** | API-only. |
