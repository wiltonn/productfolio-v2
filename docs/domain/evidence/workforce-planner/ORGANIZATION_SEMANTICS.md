# Organization Semantics

How the implementation currently represents organizational ownership.

---

## 0. The requested vocabulary is absent

**OBSERVED BY ABSENCE** — Zero occurrences in the stated repository search scope (schema,
backend, frontend, docs):
`Workstream`, `Product Portfolio`, `Product VP`, `Product Workstream Leader`,
`Product Area`, `OEM Division`.

**OBSERVED** — `OEM` appears only as *fixture data* — `'OEM Solutions (Thomas King)'` in
`employee-census-mapper.test.ts:152` (a supervisory-organization string being parsed) and
`{ id: OEM_NODE, name: 'OEM Solutions' }` in `census-allocation-proposal.test.ts:73`.

**OBSERVED BY ABSENCE** — The surveyed scope contains **no Product/Engineering distinction of
any kind**. No enum member, no
column, no branch, no flag, no test separates a Product organization from an Engineering
organization. The word "Engineering" appears in the PRD and analysis only as an *example team
name* ("Data Engineering: Platform 6.2 FTE").

**INFERRED** — The implementation models a **single undifferentiated org tree** with a type
tag, and expresses everything the brief calls Portfolio / Workstream / Area / Team as nodes of
that one tree.

---

## 1. The three parallel structures

**OBSERVED** — An employee's organizational placement is representable in three independent
ways, all live, none derived from the others.

### 1a. Manager hierarchy — `Employee.managerId`

- Self-referential nullable FK (`schema.prisma:407`), `onDelete: SetNull`.
- Cardinality: **one-to-many** (one manager, many reports).
- **No history.** A scalar column. Changing it changes the past.
- **No future dating.**
- Written by: manual employee edit, and census publish **pass B**.
- The census detects **cycles** (`MANAGER_CYCLE`) because *"`resources.service.ts` only guards
  direct self-management, so nothing downstream would catch `A→B→A`"*.
- A **self-managed** row is treated as the org root and imports with `managerId: null`.
  `MULTIPLE_ROOTS` is an issue code, so more than one is flagged.

### 1b. Structural placement — `OrgMembership`

- `employeeId` + `orgNodeId` + `effectiveStart` + `effectiveEnd?` (`schema.prisma:981-1002`).
- Cardinality: **many-to-many over time**. No unique constraint prevents two concurrent
  memberships.
- **History retained.** `orgstructure.md`: *"When an employee is reassigned to a new node, the
  previous membership's `effectiveEnd` is set automatically. This preserves a full membership
  history per employee."*
- **Future dating is structurally possible** (`effectiveStart` is a settable DateTime) but no
  service accepts a future start and no query filters on "as at" a date.
- Read by: `getEmployeesInSubtree`, `initiativeContributors`, the aggregation service's
  team roll-up, `/aggregations/teams`.

### 1c. Matrix affiliation — `EmployeeOrgUnitLink`

- `employeeId` + `orgNodeId` + `relationshipType` + `allocationPct?` + `consumeCapacity` +
  `startDate` + `endDate?` (`schema.prisma:1397-1425`).
- `EmployeeOrgRelationshipType ∈ {PRIMARY_REPORTING, DELIVERY_ASSIGNMENT,
  FUNCTIONAL_ALIGNMENT, CAPABILITY_POOL, TEMPORARY_ROTATION}`.
- Cardinality: **many-to-many over time**, except `PRIMARY_REPORTING`, which is enforced to at
  most one active link per employee, in the service *and* the database.
- Capacity rules (`employee-org-link.service.ts:16-29`):
  ```
  DEFAULT_CONSUME_CAPACITY = { PRIMARY_REPORTING: false, DELIVERY_ASSIGNMENT: true,
                               FUNCTIONAL_ALIGNMENT: false, CAPABILITY_POOL: false,
                               TEMPORARY_ROTATION: true }
  NEVER_CONSUMES = { PRIMARY_REPORTING, FUNCTIONAL_ALIGNMENT, CAPABILITY_POOL }  // hard rule
  ```
- `validateAllocationTotal` sums `allocationPct` across active `consumeCapacity` links and
  **hard-rejects above 100%** (`employee-org-link.service.ts:531-561`).

**OBSERVED** — `orgstructure.md` states the design intent for 1a vs 1b: *"Two parallel
hierarchies coexist … An employee's manager and their org node leader may be different
people."*

**SOURCE-ASSERTED INTENT** — The repository's analysis document calls 1c's capacity columns a
**true duplicate** of `WorkforceAllocation`: *"Both are '% of this employee's time, claimed
by an org unit, validated to ≤100%'. Must not both feed capacity math."* Its debt register
recommends retaining the link for affiliation and deprecating the two capacity columns.

**OBSERVED** — No such deprecation has occurred. The recommendation is retained here only as
historical source intent; it is not evidence that V2 should adopt that disposition.

**UNKNOWN** — Which of the three answers "what team is this person on". Different consumers
pick different ones:
- `/aggregations/teams` → `OrgMembership`
- deletion-impact → `OrgMembership` *and* `EmployeeOrgUnitLink` *and* `managerId`
- census import → `managerId` only
- capacity validation → `EmployeeOrgUnitLink` only

---

## 2. OrgNode — the one tree

**OBSERVED** — `schema.prisma:942-979`.

| Field | Observation |
|---|---|
| `type` | `ROOT \| DIVISION \| DEPARTMENT \| TEAM \| VIRTUAL \| PRODUCT \| PLATFORM \| FUNCTIONAL \| CHAPTER` |
| `parentId` / `path` / `depth` | Materialized path (`/aaa/bbb/ccc/`), recomputed on move |
| `managerId` | Nullable FK to `Employee`, `SetNull` |
| `isPortfolioArea` | **Boolean flag orthogonal to `type`** |
| `isActive` | Soft-delete |
| `metadata` | JSONB, free-form |
| `code` | **Unique** short code |

**OBSERVED** — `orgstructure.md` documents only five of the nine types
(`ROOT, DIVISION, DEPARTMENT, TEAM, VIRTUAL`). `PRODUCT`, `PLATFORM`, `FUNCTIONAL` and
`CHAPTER` exist in the schema and are undocumented there.

**OBSERVED** — **No behaviour branches on `VIRTUAL`, `FUNCTIONAL` or `CHAPTER`.** They are
declared and inert. A `CHAPTER` node appears once, in a test fixture asserting it is *excluded*
from the product picker (`AddAllocationDialog.test.tsx`: `{ id: 'chapter-1', name: 'Testing
Guild', type: 'CHAPTER' }`).

**OBSERVED** — The only place `type` is load-bearing is the **product-target allow-list**,
declared identically in three files:
```ts
PRODUCT_NODE_TYPES = [PRODUCT, PLATFORM, TEAM, DIVISION, DEPARTMENT]
```
(`workforce-allocation.service.ts:39-45`, `census-allocation-proposal.ts:44-51`,
`AddAllocationDialog.tsx:28`).

**INFERRED** — A "product" is not a type in this model; it is a *membership of an allow-list*
that also contains divisions, departments and teams. Everything except `ROOT`, `VIRTUAL`,
`FUNCTIONAL` and `CHAPTER` counts as a product for allocation purposes.

**OBSERVED** — Node **moves recompute paths** (`POST /api/org/nodes/:id/move`). There is no
history of the previous path. **Moving a node silently rewrites every historical roll-up
computed by subtree**, because `getEmployeesInSubtree` is a path-prefix query against the
*current* path.

---

## 3. `PortfolioArea` vs `isPortfolioArea`

**OBSERVED** — Two unrelated implementations of the same words.

| | `PortfolioArea` (table) | `OrgNode.isPortfolioArea` (flag) |
|---|---|---|
| Shape | `id`, `name` (unique), timestamps. Nothing else. | Boolean on a tree node |
| Hierarchy | none | inherits the tree |
| Manager | none | the node's `managerId` |
| Employees | **no relation** | via `OrgMembership` |
| Referenced by | `Initiative.portfolioAreaId`, `IntakeRequest.portfolioAreaId` | `Initiative.orgNodeId`, `IntakeRequest.orgNodeId` |
| Validated | no | **yes** — `initiatives.service.ts:202,287` and `intake-request.service.ts:185,267` all reject a node with `isPortfolioArea = false` or `isActive = false` |
| Roll-up | `rollupByPortfolioArea` | `rollupByOrgNode` |

**OBSERVED** — `Initiative` carries **both** foreign keys, both optional, and nothing
reconciles them. An initiative may name a `PortfolioArea` row, an `isPortfolioArea` org node,
both, or neither.

**SOURCE-ASSERTED INTENT** — The implementation's entity-reuse audit rejected the table as a
home for "Product", describing it as *"a flat `name`-only lookup for rollups with no hierarchy
and no employee relation"*. This records that audit's design judgment, not a V2 decision.

**UNKNOWN** — Whether "Product Area" in the redesign brief corresponds to the table, the flag,
`OrgNodeType.PRODUCT`, or none of them.

---

## 4. Relationship cardinality and temporality summary

| Relationship | Cardinality | Can change | History | Future-dated | Changing it rewrites history? |
|---|---|---|---|---|---|
| Employee → manager | 1:N | yes | **no** | no | **yes** — silently |
| Employee → OrgNode (membership) | M:N over time | yes | **yes** | possible, unused | no |
| Employee → OrgNode (matrix link) | M:N over time | yes | **yes** | possible, unused | no |
| OrgNode → parent | 1:N | yes (`/move`) | **no** | no | **yes** — subtree roll-ups |
| OrgNode → manager (leader) | 1:1 nullable | yes | **no** | no | **yes** |
| Initiative → OrgNode | **1:1 nullable** | yes | **no** | no | **yes** |
| Initiative → PortfolioArea | 1:1 nullable | yes | no | no | yes |
| Project → OrgNode / Initiative | two independent 1:1 nullable | yes | no | no | yes |
| WorkItem → OrgNode / Initiative / Project | three independent 1:1 nullable | yes | no | no | yes |
| Employee → JobProfile | 1:1 nullable | yes | no | no | yes |
| WorkforceAllocation → target | exactly one, CHECK-enforced | per row per week | **the weekly rows are the history** | yes — write a future week | no |

**INFERRED** — The only relationship in the entire model that carries genuine temporal
history *and* is used that way is the weekly allocation row itself. Every structural
relationship is a scalar FK that overwrites its own past.

---

## 5. Leader assignment vs structural assignment

**OBSERVED** — They are separate and can disagree:
- Structural: `OrgMembership` / `EmployeeOrgUnitLink` place a person *in* a node.
- Leadership: `OrgNode.managerId` names one Employee as the node's leader.
- Reporting: `Employee.managerId` names that person's direct manager.

**OBSERVED** — `orgstructure.md` states the disagreement is intentional: *"An employee's
manager and their org node leader may be different people."*

**OBSERVED** — Approval policy resolution reads leadership, not membership:
`ApprovalRuleType ∈ {NODE_MANAGER, SPECIFIC_PERSON, ROLE_BASED, ANCESTOR_MANAGER, COMMITTEE,
FALLBACK_ADMIN}`, with `ANCESTOR_MANAGER` walking the tree.

**OBSERVED** — Initiative "ownership" is a **fourth** axis and points at `User`, not
`Employee`: `businessOwnerId` (required), `productOwnerId` (required),
`productLeaderId` (optional). `User` and `Employee` are separate tables with no FK between
them.

**UNKNOWN** — How `User` and `Employee` relate. `User` has `role: UserRole` and `auth0Sub`;
`Employee` has `role: String` and `externalId`. Nothing joins them. An initiative's "Product
Owner" is therefore not resolvable to a person with capacity.

---

## 6. Where the code assumes permanence that the business does not have

**OBSERVED** — Each of these is a scalar FK or column with no temporal qualifier, read by
calculations that produce historical numbers:

1. **`Employee.hoursPerWeek`.** Every FTE number ever computed uses today's value. A person
   who went 1.0 → 0.6 FTE in July has their January capacity recomputed at 0.6.
2. **`Employee.managerId`.** The manager filter on the grid (`?managerId=`) selects by
   *today's* manager, then reports historical weeks.
3. **`OrgNode.path`.** `getEmployeesInSubtree` is a path-prefix query. Reorganising the tree
   rewrites which employees were "in" a division for every past week.
4. **`Initiative.orgNodeId`.** Single-valued and mutable; moving an initiative between
   portfolio areas rewrites its whole history of area attribution.
5. **`Project.initiativeId` / `WorkItem.initiativeId`.** Attribution walks these *at read
   time*. Re-filing a work item under a different initiative retroactively moves every past
   week of effort to the new initiative.
6. **`WorkItem.workCategory`.** Changing it re-syncs `WorkforceAllocation.work_category` with
   an `updateMany` across **all** weeks, past included.
7. **`Employee.role`** (free-text) and **`jobProfileId`.** Scalars; skill-pool derivation uses
   current skills to attribute historical hours.

**OBSERVED** — The one deliberate exception is `activeEnd`, which the census import will
**set** from a `Close:` date but never **clear**: *"a blank column is missing information, not
an instruction to erase"*.

**INFERRED** — The model treats org structure as a *current-state lookup* and allocation as a
*time series*. Reports that combine the two are only correct as at the moment they are run.

---

## 7. Engineering vs Product

**OBSERVED** — **Nothing distinguishes them.** There is no `EngineeringTeam`, no
`orgKind`, no `discipline`, no `function` field. Skills (`Skill.name`, free text) and
`SkillPool` (free-text name) are the only capability axis, and they attach to people, not to
org units.

**OBSERVED** — `SkillPool` has **no relation** to `Employee`, `Skill`, `JobProfile` or
`OrgNode`. Skill→pool resolution is a **lowercase string match** on the pool name, used
identically in `derive-demand.ts` and `derive-supply.ts`.

**OBSERVED** — `CLAUDE.md` names five example pools: backend, frontend, data, qa, domain.
These are disciplines, but they are pools of *people's skills*, not organizational units.

**UNKNOWN** — How Engineering ownership of Sustain/Project work would be represented. There is
no relationship between an org node and a project or work item other than
`Project.orgNodeId` / `WorkItem.orgNodeId`, which are the same nullable "home" field used for
products.
