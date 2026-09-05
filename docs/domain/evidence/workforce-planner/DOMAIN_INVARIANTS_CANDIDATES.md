# Domain Invariant Candidates

Rules that appear to represent business truths rather than implementation accidents.
Each carries evidence, confidence, and known exceptions. Candidates only — nothing here is
asserted as settled.

## Candidate classification

The original list mixed business invariants, product policies, implementation constraints, and
engineering principles. They are now separated so implementation shape is not accidentally
promoted into V2 domain truth.

| Classification | Candidates | Treatment during V2 synthesis |
|---|---|---|
| **DOMAIN BEHAVIOUR CANDIDATE** | I1–I5, I8, I14, I17 | Validate against current business workflows and examples |
| **PRODUCT POLICY CANDIDATE** | I6–I7, I9–I13, I15, I18, I20–I21, I23 | Requires explicit product-owner acceptance; implementation repetition is not enough |
| **IMPLEMENTATION DESIGN DECISION** | I16, I19, I25 | Preserve as evidence of current behaviour; exclude from domain invariants unless business meaning is independently shown |
| **IMPLEMENTATION SAFETY POLICY** | I22 | Preserve the risk and desired outcome, not the cascade-based rule itself |
| **ENGINEERING PRINCIPLE** | I24 | Move to engineering guidance after the domain model is accepted |

The headings below retain their historical numbering so cross-references remain valid.

---

## I1 — An employee has finite weekly capacity, and it is measured against their own week

**Evidence** — `summarizeWeek` compares committed percentage against `capacityPct ?? 100`
(`capacity-math.ts:80-107`). `CapacityState ∈ {EMPTY, UNDER, AT, OVER}`. Six named tests cover
0%, under, exactly 100%, over, thirds, and float noise. The frontend mirrors the same rule.

**Confidence** — **HIGH.**

**Known exceptions** — The denominator is *always* literally 100 in production: no caller
passes `capacityPct` (J9). A part-timer's smaller week is invisible to over-allocation
detection and visible only in FTE.

---

## I2 — Weekly allocations are percentages of a person, not hours of a person

**Evidence** — `allocationPct` is the stored value everywhere. Hours are always **derived**:
`toHours(pct, hoursPerWeek)`, `(pct/100) * hoursPerWeek` in `capacity-supply.ts:154`. No hours
column exists on `WorkforceAllocation`.

**Confidence** — **HIGH.**

**Known exceptions** — The legacy path stores hours: `AllocationPeriod.hoursInPeriod`,
materialised at quarter grain. Two representations of the same fact, in two tables.

---

## I3 — Unallocated is not the same as available

**Evidence** — the stated load-bearing rule of `capacity-math.ts` (lines 10-19), the reason
`CapacityEffect` exists, and PRD §11 in the same words: *"Do NOT assume: Unallocated =
Available."* Two named tests: *"counts PTO against available capacity"*, *"counts management
overhead against available capacity"*.

**Confidence** — **HIGH.** This is the most consistently honoured rule in the codebase.

**Known exceptions** — The legacy `calculateAvailability` computes
`baseHours - allocatedHours - ptoHours`, which is the same idea with PTO sourced from
`CapacityCalendar` instead of from a row. The two never meet.

---

## I4 — Over-allocation is reported, never prevented

**Evidence** — `workforce-allocation.service.ts:33-36`; `capacity-math.ts:74-78`;
`overAllocatedPct`, `overAllocatedWeeks`, `overAllocatedCount` are outputs at three levels; the
per-row cap message explicitly says over-allocation is *"several rows summing past it"*.

**Confidence** — **HIGH** for the workforce model.

**Known exceptions** — **Directly contradicted** by `EmployeeOrgUnitLink.validateAllocationTotal`,
which throws above 100% (J2). Two policies, same question.

---

## I5 — The atomic planning period is the ISO week, and a week belongs to exactly one quarter

**Evidence** — `WorkforceAllocation` is keyed on `weekPeriodId`; `weekStart` is denormalised;
PRD §6 (*"the atomic planning period should be the WEEK"*). The membership rule is stated once
and shared: *"A week belongs to the period its **Monday** falls in … which is what stops two
weeks of the same employee being counted in two quarters"* (`workforce-plan.service.ts:270-277`),
called by branching, promotion **and** the supply provider.

**Confidence** — **HIGH.**

**Known exceptions** — The legacy path is quarter-grained with an `overlapRatio` float for
partial quarters. A verified test covers a 26-week horizon starting in December crossing a year
boundary.

---

## I6 — Planning intent must be able to exist outside any scenario

**Evidence** — the entire reason `WorkforcePlan` exists. `Allocation.scenarioId` is NOT NULL
and *"There is nowhere in the schema to record intent that is not inside a scenario"*
(analysis fact 1). PRD §6: *"It is NOT a Scenario."*

**Confidence** — **HIGH.**

**Known exceptions** — none.

---

## I7 — A what-if must not alter the plan of record

**Evidence** — the overlay is a copy clamped to the scenario's quarter; *"Outside that window
the baseline is the only truth, so a what-if cannot silently rewrite next year's plan."*
Verified against live Postgres by comparing the full row set byte-for-byte before and after an
overlay edit.

**Confidence** — **HIGH.**

**Known exceptions** — The reverse is unguarded: editing the baseline underneath a live overlay
is undetected and unreported (J7 in workflows, W7).

---

## I8 — Weeks outside a scenario's quarter survive promotion

**Evidence** — promotion merges in place rather than flipping `isBaseline`, so rows outside the
window *"are never named in a statement's `WHERE` clause"*. A naive replace *"would silently
truncate the plan to a single quarter."* Verified against ~640 in-quarter and 706 out-of-quarter
rows.

**Confidence** — **HIGH.**

---

## I9 — Inferred or imported data must not silently become authoritative

**Evidence** — applied three times, independently:
- Census employee import: staged → reviewed → published with `{ confirm: true }`.
- Census allocation proposals: `status = PROPOSED`, `source = IMPORT`, opt-in per publish.
- Token supply: `MANUAL` is never overwritten, and editing a derived row by hand re-stamps it
  `MANUAL` — *"A human touching a row is exactly what makes it manual."*
- Priority-ranking derivation: appends only, never reorders or removes.

PRD §15 states it: *"imported/inferred allocation must not silently become authoritative."*

**Confidence** — **HIGH.** Four independent implementations of one principle is the strongest
convergent evidence in the repository.

**Known exceptions** — The protection is at the *write* boundary only. Once a `PROPOSED` row
exists it counts as capacity identically to a confirmed one (J12).

---

## I10 — Absence of data is not an instruction to delete

**Evidence** —
- `activeEnd` is set from a `Close:` date but never cleared: *"a blank column is missing
  information, not an instruction to erase."*
- Derivation writes nothing when the plan staffs nobody: *"an empty plan is a
  misconfiguration, and wiping a scenario's supply over one would be the wrong reading of it."*
- An employee whose census row is `INVALID` is **not** offered for deletion: *"the file does
  mention them, and offering a present employee for a cascading delete would be dangerous."*

**Confidence** — **HIGH.**

**Known exceptions** — `allocationPct = 0` **is** treated as deletion, deliberately:
*"an allocation of 0% is the absence of one."* An explicit zero and a missing row are the same
thing for allocations, and different things everywhere else.

---

## I11 — Work must be able to exist without an initiative

**Evidence** — PRD §3/§5, restated in the guiding domain statement. Implemented as: nullable
`WorkItem.initiativeId`, nullable `Project.initiativeId`, `PRODUCT` and `CATEGORY` allocation
targets, and `outsideInitiativesFte` as a headline metric. The dialog hint: *"Product work does
not have to belong to an initiative."* `WorkItem` exists **because** `ScopeItem.initiativeId` is
NOT NULL.

**Confidence** — **HIGH.**

**Known exceptions** — Such work is structurally excluded from "strategic" (J6), and there is no
way to mark it strategic.

---

## I12 — Every work item needs an organizational home, but not a hierarchy position

**Evidence** — PRD §3: *"Every Work Item should have a meaningful organizational/work home, but
not every Work Item needs an Initiative."* Schema: all three parents nullable, and the four
legal shapes enumerated in the schema header. The dialog states the consequence of no home:
*"Without a home, this work can only be reported as uncategorised."*

**Confidence** — **MEDIUM.** The rule is stated as a *should* and enforced nowhere — a work item
with all three parents null is legal and creatable through the UI.

---

## I13 — Work purpose and work hierarchy are separate axes

**Evidence** — PRD §4: *"Work hierarchy and work purpose are separate concepts"*, and the
guiding statement's closing line: *"Work hierarchy and capacity allocation hierarchy are
related, but they are not the same thing."* Implemented as `workCategory` orthogonal to
`targetType`, and `CapacityEffect` orthogonal to both.

**Confidence** — **MEDIUM.** The axes are separate in the schema but entangled in practice:
`CATEGORY` and `RESERVED` are target *types* whose whole identity is a category (J17).

---

## I14 — A work item owns its category; an allocation may not contradict it

**Evidence** — `WORK_ITEM` targets take **no** category suffix in `targetKey`. Two reasons on
record: a second category *"would let the two disagree"*, and the key *"would change whenever
an item was recategorised, orphaning every row written under the old one."* The row's
`work_category` is denormalised from the item at write time, required by the CHECK constraint,
and re-synced by `updateWorkItem` with a single `updateMany`.

**Confidence** — **HIGH.**

**Known exceptions** — The re-sync rewrites **past** weeks too, so recategorising an item
retroactively changes historical category reporting (J16).

---

## I15 — Capacity supply must have exactly one source per scenario, and it must be explicit

**Classification** — **PRODUCT POLICY CANDIDATE.** The explicit-authority requirement may be
domain-relevant; the exact enum and single-source mechanism are implementation design.

**Evidence** — `Scenario.capacitySource` with `docs/ADR_SCENARIO_CAPACITY_SOURCE.md`:
*"Row existence infers nothing — creating or deleting a `WorkforcePlan` never changes a
scenario's capacity authority."* Asserted by test: overlay operations *"never read
capacitySource at all"*. Zero capacity is returned rather than a silent fallback.

**Confidence** — **HIGH.** Explicitly deliberated and documented in an ADR.

---

## I16 — `capacitySource` and `planningMode` are orthogonal

**Classification** — **IMPLEMENTATION DESIGN DECISION.** The two questions may be distinct,
but the current pair of dispatch axes is not itself a business invariant.

**Evidence** — a parameterised test over all four combinations
(`capacity-source.test.ts:311-325`). The ADR rejects a third `PlanningEngine` *"for multiplying
the two axes together (four engines, growing multiplicatively)"*. The `GET` returns both
together *"because they are routinely confused."*

**Confidence** — **HIGH.**

---

## I17 — An employee's hours must not be double-counted across skill pools

**Evidence** — `derive-supply.ts` splits by proficiency share: *"supply there is summed across
pools and compared against demand, so one engineer with two skills would invent capacity."*
Zero-proficiency falls back to an even split rather than dividing by zero.

**Confidence** — **HIGH** for the token ledger.

**Known exceptions** — `capacity-supply.getSkillCapacity` deliberately **does** double-count,
*"where overlap is the point"* (J14). The invariant holds per-consumer, not globally.

---

## I18 — The parts must sum to the whole

**Evidence** — applied independently four times:
- `initiativeContributors` reports `unattributedFte` for contributors with no live membership.
- `deriveTokenSupply` reports `unattributedHours` with a warning.
- `scenarioInitiativeStaffing` asserts `attributed + unattributed === deployableFte` as a named
  test.
- `summarize()` computes `unallocatedFte` as an explicit residual, floored at zero.

The stated discipline: report what could not be attributed rather than dropping it.

**Confidence** — **HIGH.** Four independent implementations.

---

## I19 — One allocation names exactly one structural target

**Classification** — **IMPLEMENTATION DESIGN DECISION.** This is CHECK-enforced current
behaviour and may be a limitation rather than a V2 domain truth.

**Evidence** — the database CHECK constraint enumerates six branches, each requiring exactly one
non-null FK and explicitly nulling the other three
(`migrations/20260830180000_.../migration.sql:131-146`), plus a raw-insert test bypassing the
service.

**Confidence** — **HIGH** as an implementation invariant.

**Known exceptions** — It is contradicted by *intent*: PRD §2.1 requires an initiative to span
multiple products, and this constraint is precisely why that span cannot be read from the
allocation rows and must be derived from contributors' memberships instead.

---

## I20 — Organizational assignments change over time and history is preserved

**Evidence** — `OrgMembership.effectiveStart`/`effectiveEnd` with automatic end-dating on
reassignment; `EmployeeOrgUnitLink.startDate`/`endDate`; `orgstructure.md`: *"This preserves a
full membership history per employee."*

**Confidence** — **MEDIUM.** The *storage* invariant holds. The *use* does not: no query filters
membership "as at" a date, and every other structural relationship
(`managerId`, `OrgNode.path`, `Initiative.orgNodeId`, `WorkItem.initiativeId`) is a mutable
scalar with no history (J16).

---

## I21 — A person's manager and their org-unit leader may differ

**Evidence** — `orgstructure.md` states it directly. `Employee.managerId` and
`OrgNode.managerId` are independent columns; approval resolution reads the latter.

**Confidence** — **HIGH** as a stated intent.

**Known exceptions** — The census import writes only `managerId` and creates no org nodes, so in
any census-fed installation only one of the two hierarchies exists.

---

## I22 — Deleting a person destroys planning history, so it must be gated

**Classification** — **IMPLEMENTATION SAFETY POLICY.** The durable domain concern is that
planning history must be preserved or consciously disposed of. Cascade behaviour and typed
confirmation are implementation-specific.

**Evidence** — every relation to `Employee` is `onDelete: Cascade`;
`employee-deletion-impact.service.ts` is the single source of truth for the blast radius; the
audit entry is written **before** the delete *"because afterwards the cascaded rows are gone and
it is the only remaining evidence"*; `confirm` is required only when the impact is `DATA_LOSS`.

**Confidence** — **HIGH.**

**Known exceptions** — `activeEnd` offers a non-destructive alternative and nothing steers a
user toward it.

---

## I23 — Aggregate percentages across time are averaged, not summed

**Evidence** — `summarizeHorizon`: *"'Sarah is 80% allocated across the quarter' is the number a
manager means — a sum over 13 weeks would read 1040%."* FTE roll-ups divide by window length so
the result *"reads as an average headcount rather than a sum over weeks."*

**Confidence** — **HIGH.**

**Known exceptions** — `listAllocationSummaries` **sums** `percentage` across scenarios,
reporting 300% for an employee present in three. Documented in the debt register as wrong, and
still what the Capacity page shows.

---

## I24 — One rule, one implementation

**Classification** — **ENGINEERING PRINCIPLE.** This belongs in later architecture guidance,
not in the V2 business-domain invariant set.

**Evidence** — stated repeatedly and acted on: `resolveWeeksInPeriod` shared by branching,
promotion and supply *"if any of them had its own rule, a scenario's overlay and its capacity
numbers would disagree about scope"*; `attributionOf` promoted to an export rather than copied,
*"so a fifth reading `targetType` directly would be a fifth answer to one question"*;
`assertScenarioEditable` given a parameter rather than a third copy;
`employee-deletion-impact.service.ts` as *"the single source of truth"* so both delete paths
report the same numbers.

**Confidence** — **HIGH** as an intent.

**Known exceptions** — Violated in at least four live places: `capacity-math` duplicated in the
frontend (deliberately); `PRODUCT_NODE_TYPES` declared three times; `targetKey` grammar mirrored
in `AddAllocationDialog`; `targets().initiatives` disagreeing with attribution (J5).

---

## I25 — Estimation and staffing are separate records

**Classification** — **IMPLEMENTATION DESIGN DECISION.** “Estimate” and “staffing” may be
separate domain facts, but requiring separate records is a persistence choice.

**Evidence** — `WorkItem` carries no estimates *"and a second set of demand numbers would
immediately diverge"* from `ScopeItem`'s. The reconciliation prints planned hours and estimated
hours side by side and **derives no ratio**, because they cover different windows.

**Confidence** — **MEDIUM.** The separation is deliberate and stated; whether it is a business
truth or an artefact of `ScopeItem` predating `WorkItem` is not established (J20).
