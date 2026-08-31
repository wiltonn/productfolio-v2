# Original ProductFolio (V1) — Organizational Structure and Ownership

**Question (issue #3):** How did V1 represent organizational structure and ownership? Was there a
Product vs Engineering distinction, a division/portfolio concept above the team, how did an
employee attach to the structure, and what happened when someone moved?

**Surveyed commit:** `e62c2d761f021c0063f029c3a3f96900374cf807` — `wiltonn/productfolio` @ `main`,
2026-02-21, *"update"*. Working copy:
`~/dev/projects/productfolio-workspace/productfolio-v1/productfolio`.

**Also checked:** `~/dev/projects/productfolio` @ `v1/solver`
(`07368d6ef19b23a8b6863b5bffab32fadfee76c9`, 2026-03-24, *"meta: knowledge transfer to
CohesionXL"*). **OBSERVED** — `git diff main v1/solver -- productFolio/packages/backend/prisma/schema.prisma`
returns **empty**. The solver branches (L1–L4) changed nothing in the org model. Everything below
holds for both.

**Path prefix** used in citations: `productFolio/packages/`. Docs cited as `productFolio/docs/`.

**Status:** archaeological evidence per CLAUDE.md §2. Nothing here is a recommendation for V2.

---

## 0. Answer in one paragraph

**OBSERVED** — V1 modelled the organization as **one tree** (`OrgNode`) with a **nine-member type
tag**, a single enforced `ROOT`, materialized paths, and a nullable `managerId` naming a node
*leader*. An employee attached to it in **three independent, simultaneously live ways**: the
manager chain (`Employee.managerId`), a dated structural membership (`OrgMembership`), and a dated
matrix affiliation (`EmployeeOrgUnitLink`). **There was no Product-vs-Engineering distinction of
any kind in the schema** — Engineering and Product existed only as two seeded `DIVISION` *node
names*. Moving a person between units was **dated, not overwritten**: the prior membership was
end-dated the day before the new one started, and history was retained. Moving a *node* between
parents was **overwritten**: paths were recomputed in place with no history.

---

## 1. `OrgNode` — one tree, nine types, five of them offerable

**OBSERVED** — `backend/prisma/schema.prisma:923-957`:

| Field | Observation |
|---|---|
| `type` | `OrgNodeType` (`schema.prisma:111-122`) |
| `parentId` / `path` / `depth` | Materialized path, recomputed on move |
| `managerId` | Nullable FK → `Employee`; the node's **leader**, distinct from anyone's manager |
| `isPortfolioArea` | Boolean flag **orthogonal to `type`** (`schema.prisma:934`) |
| `isActive` | Soft delete |
| `code` | **Unique** short code |
| `metadata` | JSONB, free-form |

**OBSERVED** — `OrgNodeType = ROOT | DIVISION | DEPARTMENT | TEAM | VIRTUAL | PRODUCT | PLATFORM |
FUNCTIONAL | CHAPTER` (`schema.prisma:111-122`).

**OBSERVED — the enum has a datable history.** The tree shipped with **five** types
(`backend/prisma/migrations/20260207000000_add_org_audit_approval_models/migration.sql:8`:
`CREATE TYPE "OrgNodeType" AS ENUM ('ROOT','DIVISION','DEPARTMENT','TEAM','VIRTUAL')`). `PRODUCT`,
`PLATFORM`, `FUNCTIONAL` and `CHAPTER` were appended one day later, in the *same migration that
introduced the matrix org model*
(`migrations/20260208100000_add_matrix_org_model/migration.sql:1-5`).

**INFERRED** — The four late types were added as part of a matrix-org effort, not as a considered
extension of the type vocabulary. They are the least-supported members of the enum in every layer
below.

**OBSERVED — only five of the nine are creatable through the UI.** The node-create dropdown offers
`ROOT` (only when there is no parent), `DIVISION`, `DEPARTMENT`, `TEAM`, `VIRTUAL`
(`frontend/src/pages/OrgTreeAdmin.tsx:436-441`). `PRODUCT`, `PLATFORM`, `FUNCTIONAL` and `CHAPTER`
are valid in the Zod schema (`backend/src/schemas/org-tree.schema.ts:5-14`) and the TS union
(`frontend/src/types/index.ts:159`) but **cannot be created by a user**.

**OBSERVED — `type` is load-bearing for exactly one thing: `ROOT`.** Grepping all non-test
backend/frontend source, the only `type`-based branches are:
- `org-tree.service.ts:39-49` — a `ROOT` node must have no parent, and **at most one active `ROOT`
  may exist** (`'An active ROOT node already exists'`).
- `org-tree.service.ts:178` — `'Cannot move the ROOT node'`.
- `org-tree.service.ts:254` — `'Cannot delete the ROOT node'`.

**OBSERVED** — Nothing else in V1 reads `type` to decide behaviour. `DIVISION`, `DEPARTMENT`,
`TEAM`, `VIRTUAL`, `PRODUCT`, `PLATFORM`, `FUNCTIONAL` and `CHAPTER` are **decorative** — they
drive a colour badge (`frontend/src/components/OrgTreeSelector.tsx:7`) and nothing else.

**OBSERVED** — There is **no parent-type validation**. `createNode` checks only that a non-`ROOT`
node has a parent and that the parent is active (`org-tree.service.ts:49-70`). A `DIVISION` may be
created under a `TEAM`; a `CHAPTER` under a `DEPARTMENT`. Depth carries no meaning beyond a counter.

**INFERRED** — The nine types are a **labelling convention**, not a structural grammar. The tree's
only real invariant is "single root, acyclic".

---

## 2. Was there a Product vs Engineering distinction?

**OBSERVED BY ABSENCE** — **No.** No `orgKind`, no `discipline`, no `function` column, no enum
member, no flag and no code branch separates a Product organization from an Engineering
organization anywhere in `backend/prisma/schema.prisma`, `backend/src` or `frontend/src`.

**OBSERVED — the distinction exists only as seed *data*.** `backend/prisma/seed.ts:666-680` creates
one `ROOT` (`ProductFolio Corp`, code `PF`) with **two peer `DIVISION` children**:

```
ROOT  "ProductFolio Corp"  (PF)
 ├── DIVISION "Engineering" (ENG)
 └── DIVISION "Product"     (PROD)
```

**OBSERVED** — Teams are created only under Engineering: `Platform Team` (`PLAT`), `Frontend Team`
(`FE`), `Data Team` (`DATA`), all `type: TEAM` (`seed.ts:683-694`, `seed.ts:723-725`). Nine of the
ten seeded employees are assigned to those three Engineering teams; exactly one (`Lisa Thompson`)
is assigned directly to the `Product` division node (`seed.ts:735-746`).

**INFERRED** — Product and Engineering were understood by the author as **peer divisions**, but
that understanding never left the fixture. Nothing in the model can tell you which branch is which
except reading the node's `name`.

**OBSERVED — source-asserted intent confirms Engineering was an *instance*, not a kind.** The
requirements doc frames the whole org feature as *"Goal: enable 'Engineering org capacity vs demand'
views"* (`productFolio/docs/requirements.md:39`). Engineering is named as one org node you would
scope a query to — not as a category of org node.

**OBSERVED** — Every other appearance of "Engineering" in V1 is a node name, a portfolio-area name
(`Platform Engineering`, `seed.ts:164`, `seed.ts:700`), a skill-pool name (`Backend Engineering`,
`skill-pool.test.ts:61`), a UI placeholder (`OrgTreeAdmin.tsx:416` `placeholder="e.g. Engineering"`),
or a test fixture.

### 2a. Contrast with the newer implementation

**Same finding, same cause.** `docs/domain/evidence/workforce-planner/ORGANIZATION_SEMANTICS.md` §7 reports the
newer workforce-planner has *"no Product/Engineering distinction of any kind"* and models *"a single
undifferentiated org tree with a type tag"*. **The newer implementation did not lose a distinction
here — it inherited the absence.** V1's `OrgNode` (9 types, `isPortfolioArea`, materialized path,
`managerId`, `code` unique, `metadata` JSONB) and the newer one are the *same model*; the newer
doc's line numbers (`942-979`) sit ~19 lines below V1's (`923-957`) because of intervening schema
growth, not because the org model changed.

**OBSERVED — one difference, and it runs the other way.** The newer implementation made `type`
*more* load-bearing than V1 did, by adding the product-target allow-list
`PRODUCT_NODE_TYPES = [PRODUCT, PLATFORM, TEAM, DIVISION, DEPARTMENT]` (newer doc §2). **That
allow-list does not exist in V1.** In V1 `type` gates nothing but `ROOT`.

---

## 3. Was there a division or portfolio concept above the team?

**OBSERVED — `DIVISION` and `DEPARTMENT` exist only as tag values** on the same tree (§1). There is
no separate Division entity, no tenancy boundary, no peer-root concept. **`org-tree.service.ts:43-49`
enforces at most one active `ROOT`,** so V1 structurally cannot represent multiple peer top-level
organizations except as siblings beneath a single synthetic corporate root.

**OBSERVED — "portfolio area" is implemented twice, in two unrelated ways.**

| | `PortfolioArea` (table) | `OrgNode.isPortfolioArea` (flag) |
|---|---|---|
| Definition | `schema.prisma:273-287` — `id`, `name` (unique), timestamps. Nothing else. | `schema.prisma:934` — boolean on a tree node |
| Hierarchy | none | inherits the tree |
| Manager / employees | **none** | node's `managerId`; members via `OrgMembership` |
| Referenced by | `Initiative.portfolioAreaId` (`schema.prisma:298`), `IntakeRequest.portfolioAreaId` (`schema.prisma:876`) | `Initiative.orgNodeId` (`schema.prisma:307`), `IntakeRequest.orgNodeId` (`schema.prisma:878`) |
| Validated | no | **yes** — `initiatives.service.ts:202,287` and `intake-request.service.ts:185,267` all reject a node with `isPortfolioArea = false` or `isActive = false` |

**OBSERVED** — `Initiative` carries **both** FKs, both nullable, and nothing reconciles them
(`schema.prisma:298,307`). Same for `IntakeRequest` (`schema.prisma:876,878`). `Scenario`
(`schema.prisma:498`) and `ForecastRun` (`schema.prisma:1180`) carry `orgNodeId` only.

**OBSERVED — the seed deliberately duplicates the same four names into both representations.**
`seed.ts:164` creates `PortfolioArea` rows for `Customer Experience`, `Platform Engineering`,
`Data & Analytics`, `Security & Compliance`; `seed.ts:696-722` then creates four `OrgNode`s with
the same names, `type: VIRTUAL`, `isPortfolioArea: true`, **parented directly to `ROOT`** — a third
branch alongside Engineering and Product, with the comment *"mirrors the PortfolioArea records"*.

**INFERRED** — In V1 a portfolio area was neither a Product concept nor an Engineering concept. It
was a **cross-cutting demand-attribution bucket hung off the root of the same tree that holds
capacity**, so that an initiative could be attributed to a "where" that is not a real reporting
unit. `VIRTUAL` was the type chosen to say "this node holds no reporting line".

**OBSERVED** — Portfolio-area nodes are queried separately from the tree
(`org-tree.service.ts:545-554`, `listPortfolioAreaNodes`: `where: { isPortfolioArea: true,
isActive: true }`) and are protected from deletion while initiatives or intake requests reference
them (`org-tree.service.ts:276-285`).

**Contrast** — the newer doc's §3 reports this exact duplication unchanged. **Carried forward
verbatim.**

**UNKNOWN** — Whether the brief's "Product Portfolio" / "Product Area" corresponds to the
`PortfolioArea` table, the `isPortfolioArea` flag, `OrgNodeType.PRODUCT`, or none. V1 offers no
evidence either way; the two portfolio implementations are not even reconciled with each other.

---

## 4. How did an employee attach to the structure? Three ways, all live at once

### 4a. Manager chain — `Employee.managerId`

**OBSERVED** — `schema.prisma:395,408-409`. Self-referential nullable FK, `manager` /
`directReports`. **A scalar column: no history, no effective dates.** Changing it rewrites the past.

**OBSERVED** — This is *not* the org tree. `productFolio/docs/orgstructure.md` states the split is
deliberate: *"Two parallel hierarchies coexist … An employee's manager and their org node leader
may be different people."*

**OBSERVED** — `OrgNode.managerId` is a **third** thing again: the node's leader
(`schema.prisma:931`), validated only to exist as an Employee (`org-tree.service.ts:71-78`).

### 4b. Structural membership — `OrgMembership` (dated)

**OBSERVED** — `schema.prisma:959-980`: `employeeId` + `orgNodeId` + `effectiveStart` +
`effectiveEnd?`. **No unique constraint** prevents two concurrent memberships.

**OBSERVED — reassignment is dated, not overwritten.** `assignEmployeeToNode`
(`backend/src/services/org-membership.service.ts:25-78`) finds the current membership
(`effectiveEnd: null`), and inside a transaction sets its `effectiveEnd` to **the day before the
new `effectiveStart`** (`org-membership.service.ts:49-57`), then creates the new row. History is
preserved; an audit event is written with `action: 'REASSIGN'` and `payload: { from, to }`
(`org-membership.service.ts:68-76`).

**OBSERVED** — `getMembershipHistory(employeeId)` returns the full ordered history
(`org-membership.service.ts:200-215`), exposed at `GET /api/org/memberships/employee/:id`.

**OBSERVED — future dating is accepted as input but has an unguarded consequence.**
`AssignInput.effectiveStart` is an optional `Date` (`org-membership.service.ts:9-13`) defaulting to
`new Date()`. Nothing rejects a future value. But `getActiveMembership` and every "current" query
filter on **`effectiveEnd: null` alone**, never on `effectiveStart <= now`
(`org-membership.service.ts:189-198`; `listMemberships` at `:157`; `getEmployeesInSubtree` at
`org-tree.service.ts:525-531`; the coverage report at `org-tree.service.ts:461-484`).
**A future-dated transfer therefore takes effect immediately for every "who is in this node now"
query** while the outgoing membership is simultaneously stamped as already ended. There is no
"as at date" query anywhere in V1.

**INFERRED** — The temporal columns were designed for *history*, and the future-dating case
described in `orgstructure.md` (*"Future-dated transfers"*) was documented as an intent but never
implemented in the read path.

### 4c. Matrix affiliation — `EmployeeOrgUnitLink` (dated, typed, capacity-bearing)

**OBSERVED** — `schema.prisma:1362-1386`: `employeeId` + `orgNodeId` + `relationshipType` +
`allocationPct?` + `consumeCapacity` + `startDate` + `endDate?`. Added
2026-02-08 (`migrations/20260208100000_add_matrix_org_model/`).

**OBSERVED** — `EmployeeOrgRelationshipType = PRIMARY_REPORTING | DELIVERY_ASSIGNMENT |
FUNCTIONAL_ALIGNMENT | CAPABILITY_POOL | TEMPORARY_ROTATION` (`schema.prisma:166-172`).

**OBSERVED — this is the one place V1 gave organizational attachment real semantics.**
`backend/src/services/employee-org-link.service.ts:16-29`:

```ts
const DEFAULT_CONSUME_CAPACITY = {
  PRIMARY_REPORTING: false, DELIVERY_ASSIGNMENT: true, FUNCTIONAL_ALIGNMENT: false,
  CAPABILITY_POOL: false, TEMPORARY_ROTATION: true,
};
/** Relationship types that NEVER consume capacity (hard rule) */
const NEVER_CONSUMES = new Set(['PRIMARY_REPORTING','FUNCTIONAL_ALIGNMENT','CAPABILITY_POOL']);
```

**INFERRED — the business rule encoded here is the sharpest organizational statement in V1:**
*being reported into a unit, being functionally aligned to it, or being in its capability pool does
not spend your time; being assigned to deliver for it, or rotated into it, does.* Ownership of a
person and consumption of that person's capacity are explicitly different relationships.

**OBSERVED** — `consumeCapacity = true` is rejected outright for a `NEVER_CONSUMES` type, on
create (`employee-org-link.service.ts:54-59`) and on update (`:141-150`,
`'Cannot set consumeCapacity=true for ${link.relationshipType} links'`).

**OBSERVED** — `validateAllocationTotal` (`employee-org-link.service.ts:531-563`) sums
`allocationPct` over the employee's **active, capacity-consuming** links and **hard-rejects above
100%**.

**OBSERVED — at most one active `PRIMARY_REPORTING` per employee, enforced twice.** In the service
(`employee-org-link.service.ts:61-74`, `ConflictError`) *and* in the database as a partial unique
index (`migrations/20260208100000_add_matrix_org_model/migration.sql:66-70`):
```sql
CREATE UNIQUE INDEX "employee_org_unit_links_one_active_primary"
  ON "employee_org_unit_links"("employee_id")
  WHERE "relationship_type" = 'PRIMARY_REPORTING' AND "end_date" IS NULL;
```

**OBSERVED** — Moving someone's home org has a **dedicated atomic operation**:
`reassignPrimaryReporting` end-dates the old link and creates the new one in one transaction
(`employee-org-link.service.ts:230-280`). `getHomeOrg(employeeId)` resolves the active
`PRIMARY_REPORTING` link (`:344-357`), commented *"backward compat"*.

**OBSERVED** — `getLinkHistory(employeeId)` returns all links, ended ones included
(`employee-org-link.service.ts:568-583`).

### 4d. 4b and 4c were meant to converge, and never did

**OBSERVED** — `migrateFromMemberships(dryRun = true)`
(`employee-org-link.service.ts:460-520`) reads every active `OrgMembership` and creates a
`PRIMARY_REPORTING` link for each employee that lacks one, carrying `startDate:
membership.effectiveStart` and `consumeCapacity: false`.

**OBSERVED** — The whole link surface is behind a feature flag: `matrix_org_v1`
(`backend/src/routes/employee-org-links.ts:11,18`; `frontend/src/pages/Capacity.tsx:1005,1606`).

**OBSERVED** — `OrgMembership` was never deprecated. At the surveyed commit **both models are
live**, and different consumers read different ones:
- `getEmployeesInSubtree` → `OrgMembership` only (`org-tree.service.ts:525-531`)
- node deletion guard → `OrgMembership` only (`org-tree.service.ts:266-274`)
- coverage report ("unassigned employees") → `OrgMembership` only (`org-tree.service.ts:461-484`)
- capacity ≤100% validation → `EmployeeOrgUnitLink` only (`employee-org-link.service.ts:531-563`)
- roll-up attribution → **whichever the flag says** (`rollup.service.ts:240,276-282`)

**INFERRED** — V1 shipped a second, better-specified org-attachment model beside the first, wrote
the migration to retire the first, put the whole thing behind a flag, and stopped. **The two
overlapping attachment models in the newer implementation are this unfinished migration, inherited.**

---

## 5. What happened when someone moved — and when a *unit* moved

**OBSERVED** — Two different answers, and V1 is inconsistent between them.

| Change | Mechanism | History? | Rewrites the past? |
|---|---|---|---|
| Employee → different node | `assignEmployeeToNode` end-dates prior membership to `effectiveStart − 1 day`, creates new (`org-membership.service.ts:41-66`) | **yes** | no |
| Employee → different home org (matrix) | `reassignPrimaryReporting`, atomic end + create (`employee-org-link.service.ts:230-280`) | **yes** | no |
| Employee → different manager | `Employee.managerId` scalar update | **no** | **yes** |
| **Node → different parent** | `moveNode`: recomputes `path` + `depth` for the node and every descendant in a transaction (`org-tree.service.ts:171-228`) | **no** | **yes** |
| Node deactivated | `isActive = false` soft delete, policies deactivated with it (`org-tree.service.ts:287-296`) | flag only | n/a |

**OBSERVED** — `moveNode` validates cycles by checking `newParent.path.includes('/' + nodeId + '/')`
(`org-tree.service.ts:184-189`) and refuses to move `ROOT` (`:178`). It writes an audit event, but
**stores no prior path**. Because `getEmployeesInSubtree` is a `path.startsWith` prefix query
against the *current* path (`org-tree.service.ts:514-520`), **re-parenting a node silently changes
which employees are reported as having been in a division in every past period.**

**OBSERVED** — Deletion is guarded, not cascaded: a node with active children, active memberships,
or (if `isPortfolioArea`) linked initiatives/intake requests cannot be deleted
(`org-tree.service.ts:256-285`).

**OBSERVED — a latent inconsistency in `path` itself.** `createNode` builds UUID paths with a
trailing slash — `/${node.id}/`, or `${parentPath}${node.id}/` (`org-tree.service.ts:99-101`) — but
`seed.ts` writes **code-based paths with no trailing slash**: `'/PF'`, `'/PF/ENG'`,
`` `${engNode.path}/${code}` `` (`seed.ts:672,675,679,689`). Seeded and API-created nodes therefore
carry incompatible path schemes in the same column, and prefix queries mixing them are unreliable.

**INFERRED** — V1 treated **people as temporal and structure as current-state**. Person-to-unit
attachment is versioned; unit-to-unit attachment is not.

---

## 6. The capability the newer implementation lost: temporal org attribution

This is the sharpest V1-vs-newer contrast, and it runs in V1's favour.

**OBSERVED** — V1's roll-up **prorated an employee's hours across their membership history by
temporal overlap with the reporting window**. `backend/src/services/rollup.service.ts:82-99`:

```ts
export function computeOverlapRatio(memberStart, memberEnd, periodStart, periodEnd): number {
  const effectiveEnd = memberEnd ?? periodEnd;
  const overlapStart = memberStart > periodStart ? memberStart : periodStart;
  const overlapEnd   = effectiveEnd < periodEnd ? effectiveEnd : periodEnd;
  const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
  if (overlapMs <= 0) return 0;
  const totalMs = periodEnd.getTime() - periodStart.getTime();
  if (totalMs <= 0) return 0;
  return Math.min(1, Math.max(0, overlapMs / totalMs));
}
```

**OBSERVED** — Applied at `rollup.service.ts:293-300`: for each allocation, **every** overlapping
membership contributes `totalHours * ratio` to its org node — *"Split hours proportionally across
org memberships"* (`rollup.service.ts:294`). Employees with no membership fall into an explicit
`unattributed` bucket rather than being dropped (`rollup.service.ts:285-292`).

**OBSERVED** — The source it reads is flag-switched (`rollup.service.ts:240,276-282`): with
`matrix_org_v1` off it uses `OrgMembership` windows; with it on, `EmployeeOrgUnitLink` windows
filtered to `PRIMARY_REPORTING`.

**OBSERVED** — This is covered by tests: `backend/src/tests/rollup.test.ts:176-232` exercises
`computeOverlapRatio` directly, and `rollup.test.ts:768-829` asserts the split for *"Employee in
Engineering until Feb 14, then in Design from Feb 14 onward"*, expecting Engineering to receive
*"roughly half (Jan 1 – Feb 14 = 44 days out of 89)"*.

**Contrast** — `docs/domain/evidence/workforce-planner/ORGANIZATION_SEMANTICS.md` §4 concludes of the newer
implementation: *"The only relationship in the entire model that carries genuine temporal history
and is used that way is the weekly allocation row itself. Every structural relationship is a scalar
FK that overwrites its own past."* §2 adds that the newer `getEmployeesInSubtree` is a current-path
prefix query, so *"moving a node silently rewrites every historical roll-up computed by subtree"*.

**OBSERVED** — **V1 had, and used, temporally-correct org attribution of effort. The newer
implementation does not.** V1's dated membership columns are the same ones the newer schema still
carries; what was lost is the *consumer* — `computeOverlapRatio` and the proration loop. This is a
salvage candidate under CLAUDE.md §30, independent of whether `OrgNode` survives.

**OBSERVED — the caveat.** V1's proration is still only half-temporal. It is correct across
*membership* changes, but every other input it reads is a current-state scalar: `Employee.hoursPerWeek`
(`schema.prisma:397`), `jobProfile.costBand.hourlyRate` (`rollup.service.ts:271`), and the node
`path` itself. A tree move still rewrites the answer.

---

## 7. Ownership was expressed on four unconnected axes

**OBSERVED** — V1 distinguished, without reconciling:

1. **Structural placement** — `OrgMembership` / `EmployeeOrgUnitLink` put a person *in* a node.
2. **Node leadership** — `OrgNode.managerId` names one Employee as the unit's leader
   (`schema.prisma:931`).
3. **Reporting line** — `Employee.managerId` names that person's manager (`schema.prisma:395`).
4. **Work ownership** — `Initiative.businessOwnerId` (required), `productOwnerId` (required),
   `productLeaderId` (optional) (`schema.prisma:296-297,299`) — which point at **`User`**, not
   `Employee`.

**OBSERVED** — `User` (`schema.prisma:183-214`, `role: UserRole`, `auth0Sub`) and `Employee`
(`schema.prisma:391-427`, `role: String`) are separate tables **with no foreign key between them**.
An initiative's Product Owner is not resolvable to a person with capacity.

**OBSERVED — unlike the newer implementation, V1 documented this split as deliberate.**
`productFolio/docs/ORG_TO_ENTITLEMENT_MAP.md`: *"Core Rule: Users who MAKE decisions are licensed.
Users who ARE modeled are not."* — with `Employee (no User) → seat:resource`, *"Modeled resource,
not a system actor"*. `UserRole = ADMIN | PRODUCT_OWNER | BUSINESS_OWNER | RESOURCE_MANAGER |
VIEWER` (`schema.prisma:37-43`).

**Contrast** — the newer doc §5 records *"How `User` and `Employee` relate"* as **UNKNOWN**. In V1
it is answered, and the answer is commercial (seat licensing), not organizational. **INFERRED** —
the split is a billing artefact that happens to sit exactly where a V2 domain would want a person.

**OBSERVED — approval authority resolves through the tree, off leadership, not membership.**
`ApprovalPolicy` attaches to an `OrgNode` (`schema.prisma:1006-1027`);
`ApprovalRuleType = NODE_MANAGER | SPECIFIC_PERSON | ROLE_BASED | ANCESTOR_MANAGER | COMMITTEE |
FALLBACK_ADMIN` (`schema.prisma:129-137`); `ANCESTOR_MANAGER` walks up the materialized path.

**OBSERVED — V1 anticipated work spanning organizational branches.** `CrossBuStrategy =
COMMON_ANCESTOR | ALL_BRANCHES` (`schema.prisma:138-141`), defaulting to `COMMON_ANCESTOR`
(`backend/src/services/approval-policy.service.ts:66,241,293-300`). *"BU"* is otherwise undefined
anywhere in the codebase — there is no BusinessUnit entity and no `DIVISION`-specific behaviour.

**INFERRED** — `CrossBuStrategy` is the only structural admission in V1 that a decision may
implicate more than one organizational branch. It resolves it by tree geometry (nearest common
ancestor, or every branch) rather than by any concept of a division boundary. It is **approval**
routing, not work dependency: V1 has no relationship expressing "this work depends on that unit's
work".

---

## 8. Things V1 has that the org model does not connect to

**OBSERVED** — `Employee` carries **no `department` column**. `resources.service.ts:87` returns
`department: null, // Not in schema`, while the frontend still renders a Department input and
filter (`frontend/src/pages/Capacity.tsx:53,101,400-406`;
`frontend/src/hooks/useEmployees.ts:10,84,141`), with `employee.department || 'Engineering'` as the
display fallback (`Capacity.tsx:101`). **INFERRED** — a vestigial flat org attribute, superseded by
the tree, never removed from the UI.

**OBSERVED** — `Skill` and `Domain` attach to `Employee`, never to `OrgNode`
(`schema.prisma:428-461`). `SkillPool` (`schema.prisma:1222-1240`) has no relation to `OrgNode`.
Capability is a property of people; the org tree carries none.

**OBSERVED** — Org-scoped capacity views existed but were flag-gated:
`GET /api/org/nodes/:id/employees` and `GET /api/org/nodes/:id/capacity?scenarioId=`, both behind
`org_capacity_view` (`backend/src/routes/org-capacity.ts:12-77`). The capacity route resolves
through `ScenarioCalculatorService.calculate(scenarioId, { orgNodeId })` — **org scope is a filter
on a scenario, not a planning unit in its own right.**

**OBSERVED** — `productFolio/docs/requirements.md:41-55` shows the org feature was specified as
`OrgNode` + **`OrgAssignment`** (`percent` 0–100, `isPrimary` for *"home org"*) plus
`Initiative.owningOrgNodeId`. What shipped is `EmployeeOrgUnitLink` (`allocationPct`,
`PRIMARY_REPORTING`) and `Initiative.orgNodeId`. **INFERRED** — the matrix intent (`percent` +
`isPrimary`) predates the five-way `EmployeeOrgRelationshipType`; the relationship taxonomy was
elaborated during implementation, not specified up front.

---

## 9. Open questions this survey does not answer

- **UNKNOWN** — Whether any real deployment ever populated more than the seeded two-division tree.
  All org shape evidence is fixture data.
- **UNKNOWN** — Why `PRODUCT`, `PLATFORM`, `FUNCTIONAL` and `CHAPTER` were added. They arrive in
  the matrix-org migration with no accompanying code, doc, test or UI, and remain uncreatable.
- **UNKNOWN** — Which of the three attachment mechanisms was intended to be authoritative at the
  surveyed commit. The migration and flag point at `EmployeeOrgUnitLink`; the majority of read paths
  still use `OrgMembership`.
- **UNKNOWN** — How V1 would have expressed Engineering *owning* Sustain or Tech-Debt work. There
  is no relationship from an org node to work other than the same nullable `orgNodeId` used for
  portfolio areas, and no investment-classification concept attached to org structure at all.
