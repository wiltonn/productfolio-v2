# Domain Examples

Concrete cases drawn from fixtures, tests, UI flows, code paths, source-authored requirements,
runtime checks, and constructed edge cases. Names are the repository's own where they are
already generic; otherwise anonymised.

Each example states what the system does and what it cannot express.

## Source-type audit

The original file described all 40 cases as extracted examples, but the source types differ.
Use the package labels in `README.md` when citing them.

| Examples | Current source type |
|---|---|
| E1, E13, E14 | **SOURCE-ASSERTED INTENT** reproduced or illustrated by implementation behaviour |
| E2–E12, E16–E23, E26–E28, E30–E32, E34–E39 | Primarily **OBSERVED** code, test, UI, or service behaviour; exact commit citations still require source recovery |
| E15, E40 | **OBSERVED BY ABSENCE**; search scope and snapshot must be pinned |
| E24, E25, E29 | Include **RUNTIME OBSERVATION** claims; preserve a test or redacted capture before relying on exact counts |
| E33 | **SYNTHETIC EXAMPLE** constructed from two independently observed validators |
| E37 | **SYNTHETIC EXAMPLE** constructed from observed picker and roll-up rules |

Only 31 of 40 sections originally contained an explicit `Source` marker. The sections needing
an explicit source entry are E23, E25, E28, E31, E35, E36, E37, E39, and E40. Their current
content is retained, but they are not fully traceable until `SOURCE_MANIFEST.md` is resolved and
each section names a repository-relative path plus a test, line range, query, or search command.

---

## E1 — One person split across four targets in one week

**Source** — PRD §8, reproduced by the target-key model and the grid.

```
Sarah, week of Sep 7:
  PRODUCT:<pricing-platform>            30%   DEPLOYABLE
  INITIATIVE:<dynamic-pricing>          40%   DEPLOYABLE
  PRODUCT:<pricing-platform>|SUPPORT    10%   DEPLOYABLE
  PROJECT:<data-migration>              10%   DEPLOYABLE
  ────────────────────────────────────────────
  committed 90%   unallocated 10%   state UNDER
```

**OBSERVED** — Four rows, four distinct `targetKey`s. Note rows 1 and 3 name the *same org
node* and are distinct only by the category suffix.

**Cannot express** — that the 30% and the 10% are the same product's work seen two ways; the
roll-up treats them as two buckets.

---

## E2 — Exactly 100% via three equal thirds

**Source** — `workforce-capacity-math.test.ts:110`, *"treats three equal thirds as exactly at
capacity"*.

```
33.33 + 33.33 + 33.34  →  committed 100   state AT   unallocated 0
```

**OBSERVED** — `EPSILON = 1e-6` and 6-decimal rounding exist *"so 'exactly 100%' means what a
manager means by it"*. A companion test asserts a genuine fractional over-allocation is still
detected.

---

## E3 — Over-allocation is stored and shown

**Source** — `workforce-capacity-math.test.ts:49`.

```
PRODUCT 70% + INITIATIVE 60%  →  committed 130   overAllocated 30   state OVER
```

**OBSERVED** — Written without complaint. The grid colours the cell, the employee's
`overAllocatedWeeks` increments, `grid.overAllocatedCount` increments, and the header shows
*"N over-allocated"* in red.

---

## E4 — Fully committed with zero deployable capacity

**Source** — the stated rationale in `capacity-math.ts:16-19`.

```
PRODUCT                   60%   DEPLOYABLE
RESERVED:TIME_OFF         40%   UNAVAILABLE
────────────────────────────────────────────
allocated 60   reserved 40   committed 100   unallocated 0   state AT
```

**OBSERVED** — *"a naive '100 - allocated' would report as 40% of headroom that does not
exist."* This is the example the module is built around.

---

## E5 — Over-allocated by reserved time alone

**Source** — `workforce-capacity-math.test.ts:78`, *"flags over-allocation caused by reserved
time alone"*.

```
RESERVED:TIME_OFF      60%
RESERVED:MANAGEMENT    50%
────────────────────────────
allocated 0   reserved 110   committed 110   state OVER
```

**OBSERVED** — Someone can be over-allocated while doing no deployable work at all.

---

## E6 — Part-timer at 100% of their own week

**Source** — `workforce-capacity-math.test.ts:151`, plus `toFte`.

```
Employee: hoursPerWeek = 20
  PRODUCT:<platform>  100%
  →  state AT (not OVER)
  →  toFte(100, 20) = 0.5 FTE
  →  toHours(100, 20) = 20 hours
```

**OBSERVED** — The two denominators diverge here and this is the clearest case. In a team
roll-up this person contributes 0.5, in the grid they read "full".

---

## E7 — Manager overhead is capacity spent, not capacity absent

**Source** — `defaultCapacityEffect` and its comment.

```
RESERVED:MANAGEMENT  25%  →  OVERHEAD    ("capacity it has but has already spent")
RESERVED:TIME_OFF    20%  →  UNAVAILABLE ("capacity the organisation does not have")
```

**OBSERVED** — The distinction is stated and then **never used**: `capacity-math.ts` sums both
into `reserved` with no branch.

---

## E8 — Support is real work

**Source** — `defaultCapacityEffect`: *"Everything else — including a SUPPORT category, which
is real work — is deployable."*

```
CATEGORY:SUPPORT   15%  →  DEPLOYABLE, counted in allocatedFte
RESERVED:SUPPORT   15%  →  OVERHEAD,   counted in reservedFte
```

**OBSERVED** — The **same category** yields opposite capacity treatment depending on the target
type chosen in the dialog. A user picking "Category" and a user picking "Reserved time" for
support produce different capacity numbers.

---

## E9 — An initiative whose work is all work items reports zero in one view

**Source** — `scenario-initiative-link.test.ts`, the explicit regression test for J5.

```
emp-1  WORK_ITEM:<pg-upgrade>  100%   (item.initiativeId = dynamic-pricing)
emp-2  WORK_ITEM:<pg-upgrade>   50%

scenarioInitiativeStaffing → Dynamic Pricing: fte 1.5, viaWorkItemFte 1.5, directFte 0
targets().initiatives        → Dynamic Pricing: ABSENT (targetType is WORK_ITEM)
```

**OBSERVED** — Two shipped views, two answers, same data.

---

## E10 — Reaching an initiative through a project

**Source** — `scenario-initiative-link.test.ts`, *"reaches an initiative through a work item
filed under one of its projects"*.

```
WORK_ITEM:<pg-upgrade>  →  item.initiativeId = null, item.projectId = data-migration
                        →  project.initiativeId = checkout-rewrite
                        →  attributed to Checkout Rewrite, via = 'WORK_ITEM'
```

**OBSERVED** — Two hops. `AttributionVia` records which rung reached the home.

---

## E11 — One initiative, three attribution paths

**Source** — `scenario-initiative-link.test.ts`, *"splits one initiative into direct, project
and work-item shares"*.

```
emp-1  INITIATIVE:<dynamic-pricing>  100%   → directFte      1.00
emp-2  PROJECT:<data-migration>       50%   → viaProjectFte  0.50   (project → initiative)
emp-3  WORK_ITEM:<pg-upgrade>         25%   → viaWorkItemFte 0.25   (item → initiative)
────────────────────────────────────────────────────────────────
Dynamic Pricing: 1.75 FTE across 3 people
```

**OBSERVED** — Three managers can express the same commitment at three levels of precision, and
the roll-up reconciles them.

---

## E12 — The parts sum to the whole, including the homeless

**Source** — `scenario-initiative-link.test.ts`, *"initiative FTE plus unattributed equals the
deployable total"*.

```
INITIATIVE:<dynamic-pricing>  100%  →  1.0  attributed
PRODUCT:<pricing-platform>     80%  →  0.8  unattributed (product work, no initiative)
CATEGORY:<support>             40%  →  0.4  unattributed (no structural home at all)
WORK_ITEM:<orphan>             20%  →  0.2  unattributed (item has no parents)
────────────────────────────────────────────────────────
attributed 1.0 + unattributed 1.4 = deployable 2.4
```

**OBSERVED** — An `outsideInitiativesPct` of 58% for this roster.

---

## E13 — Product work with no initiative

**Source** — PRD §2.1, the dialog hint, `outsideInitiativesFte`.

```
PRODUCT:<content-parser>  100%   for 13 weeks
→ WorkClass = 'PRODUCT'
→ counted in outsideInitiativesFte
→ invisible to every initiative view and to scenario priority rankings
```

**OBSERVED** — This is the case the whole feature was built to represent, and it is
structurally excluded from "strategic" (J6).

---

## E14 — Technical debt

**Source** — the `WorkCategory` enum and PRD §4 Q *"How much capacity is going toward technical
debt?"*

Three ways to express the same thing, producing three different roll-up shapes:

```
(a) CATEGORY:TECH_DEBT                             → categories bucket, no product attribution
(b) PRODUCT:<pricing-platform>|TECH_DEBT           → products bucket, byWorkCategory bucket
(c) WORK_ITEM:<x> where item.workCategory=TECH_DEBT → workItems bucket, category denormalised
```

**OBSERVED** — Only (b) and (c) attribute to a product. Only (b) and (c) appear in
`byWorkCategory` with a home. Nothing steers a user toward one.

---

## E15 — Sustain / maintenance work

**Source** — by absence.

```
No SUSTAIN concept exists. The nearest expressible set:
  CATEGORY:MAINTENANCE
  CATEGORY:SUPPORT
  CATEGORY:OPERATIONS
  CATEGORY:TECH_DEBT
```

**OBSERVED** — Four separate members, aggregated into a "sustain" bucket by **no** code. A
portfolio leader asking "how much on sustain?" must sum four categories by hand, and must also
decide whether `BUG` belongs.

---

## E16 — Census proposal for a team that exists

**Source** — `census-allocation-proposal.test.ts`.

```
Sheet row: Supervisory Organization = "Product & Technology - CD&A (Jane Doe)"
Parsed:    division = "Product & Technology", team = "CD&A"
Matched:   OrgNode "CD&A"  (TEAM matched before DIVISION)
Proposed:  PRODUCT:<cd&a-node>  100%  status=PROPOSED source=IMPORT
           × every week of the plan horizon
```

**OBSERVED** — *"The team is matched before the division, because `Product & Technology - CD&A`
should land on CD&A rather than on all of Product & Technology."*

---

## E17 — Census proposal for a team that does not exist

**Source** — same file, `unmatchedOrgs`.

```
Supervisory Organization = "OEM Solutions (Thomas King)"    (division-only form)
No OrgNode named "OEM Solutions"
→ no proposal written
→ unmatchedOrgs: [{ supervisoryOrg: "OEM Solutions (Thomas King)",
                    headcount: 14, division: "OEM Solutions", team: null }]
```

**OBSERVED** — *"which is the 'surface it for manager review' half of §15, and doubles as a
worklist: create the node, reload the preview, and the proposal appears."* Verified end to end.

---

## E18 — Census proposal declines to argue with the plan

**Source** — proposal rule 3.

```
Employee already has:  PRODUCT:<platform> 40%  in the window
Proposal would add:    PRODUCT:<their-team> 100%
Result:                skipped whole; skippedAlreadyAllocated += 1
```

**OBSERVED** — *"A 100% proposal beside a manager's existing 40% would over-allocate someone as
a side effect of an import."* This also makes re-applying safe: the second run finds its own
first run's rows.

---

## E19 — Census sets a leaving date but never clears one

**Source** — the mapper.

```
Position = "Senior Engineer (Close:09/05/2026)"  →  proposes activeEnd = 2026-09-05
Position = "Senior Engineer"                     →  activeEnd LEFT AS IS
```

**OBSERVED** — *"a blank column is missing information, not an instruction to erase."*

---

## E20 — Census annotations peeled iteratively

**Source** — `employee-census.mapper.ts:132`.

```
"Tech Ops - Corporate (On Leave) (Close:09/05/2026)"
  → base      = "Tech Ops - Corporate"
  → onLeave   = true            (review badge)
  → closeDate = 2026-09-05      (proposed activeEnd)

"Engineer (DE)"  → regionCode = "DE"   — recorded and never persisted
```

---

## E21 — Manager cycle blocks a row

**Source** — issue code `MANAGER_CYCLE`.

```
Row A: manager = B     Row B: manager = A
→ both rows blocked
```

**OBSERVED** — Necessary because *"`resources.service.ts` only guards direct self-management,
so nothing downstream would catch `A→B→A`."* A **self**-managed row is different: it is the org
root and imports with `managerId: null`.

---

## E22 — Range edit across a quarter

**Source** — `RangeEditBar`, `bulkSetRange`.

```
Drag Oct 5 → Dec 21 on Sarah's "AI Initiative" row, apply 40%
→ PUT bulk { weeks: 12, allocationPct: 40 }
→ { created: 5, updated: 4, deleted: 0, unchanged: 3 }
```

**OBSERVED** — Three weeks already at 40% are left alone, not rewritten.

---

## E23 — Clearing a row

```
Select the whole horizon, press Clear  →  allocationPct = 0
→ { deleted: 13 }, the row disappears from the grid
```

**OBSERVED** — *"an allocation of 0% is the absence of one."*

---

## E24 — Scenario overlay leaves the baseline untouched

**Source** — verified against live Postgres, 117 checks.

```
Baseline plan: 640 rows inside Q4, 706 rows outside
Branch for Scenario A  →  overlay with 640 copied rows (Q4 only)
Edit the overlay heavily
Compare the baseline's full row set byte-for-byte  →  identical
```

**OBSERVED** — Ordered by `(weekStart, targetKey, employeeId)`, after an earlier version of the
check proved non-deterministic because 50 employees shared a `targetKey`.

---

## E25 — Promotion preserves weeks outside the quarter

```
Promote the overlay
→ replacedRows  640   (baseline rows inside Q4, replaced)
→ promotedRows  640
→ preservedRows 706   (outside Q4, never named in any WHERE clause)
```

**OBSERVED** — The baseline keeps its id, so a bookmarked grid URL still resolves.

---

## E26 — Scenario on WORKFORCE_PLAN with no plan at all

**Source** — `capacity-supply.ts:121-126`.

```
capacitySource = WORKFORCE_PLAN, no overlay, no active baseline
→ getEmployeeCapacity() returns []
→ the scenario reports ZERO capacity
```

**OBSERVED** — *"Zero capacity is the honest answer — better than silently falling back to the
legacy numbers, which would hide that the source is unusable."*

---

## E27 — Token supply splits one engineer across two pools

**Source** — `derive-supply.ts` decision 1.

```
Engineer: 40 h/week, 100% deployable for 13 weeks = 520 hours
Skills:   backend proficiency 4, data proficiency 2
Split by proficiency share (4:2):
  backend pool  → 346.7 h
  data pool     → 173.3 h
  total          520 h  (exactly preserved)
```

**OBSERVED** — Contrast `getSkillCapacity`, which would report **520 h in each pool**,
deliberately. Two live conventions (J14).

---

## E28 — An employee whose skills match no pool

```
Skills: ["Salesforce Admin"]; no SkillPool named "salesforce admin"
→ unattributedHours += 520, warning emitted
→ attributed + unattributed = deployable total
```

**OBSERVED** — Reported, never dropped.

---

## E29 — A hand-typed token supply survives re-derivation

**Source** — the Phase-14 gate, verified end to end.

```
derive  →  backend pool 4,160 tokens (source = DERIVED_WORKFORCE)
human edits it to 3,800   →  upsert stamps source = MANUAL
derive again              →  backend stays 3,800; the data pool beside it still updates
```

**OBSERVED** — On the real dev database all 35 existing `TokenSupply` rows read `MANUAL`.

---

## E30 — Ranked but nobody on it

**Source** — the reconciliation endpoint.

```
Scenario Q4 priorityRankings: [ {Checkout Rewrite, 1}, {Billing Migration, 2} ]
Plan staffs:                  Checkout Rewrite 3.0 FTE, Dynamic Pricing 4.2 FTE

both:               Checkout Rewrite   rank 1, 3.0 FTE, 1,560 planned h, 2,000 scope-P50 h
rankedButUnstaffed: Billing Migration  rank 2, 0 FTE
staffedButUnranked: Dynamic Pricing    4.2 FTE
```

**OBSERVED** — The two hour columns are printed side by side with **no ratio**: the estimate is
total un-timeboxed effort, the planned hours are one quarter's worth.

---

## E31 — Deriving appends, never reorders

```
Before: [ {Checkout, 1}, {Billing, 2} ]
Plan also staffs: Dynamic Pricing 4.2 FTE, Search Relevance 0.8 FTE
After:  [ {Checkout, 1}, {Billing, 2}, {Dynamic Pricing, 3}, {Search Relevance, 4} ]
suggestedRemovals: [ Billing Migration — ranked, 0 FTE ]   ← reported, never acted on
```

**OBSERVED** — An existing entry with extra fields survives **by reference**, asserted by
identity (`toBe`), not equality. Running twice appends nothing.

---

## E32 — Deleting an employee destroys planning history

**Source** — `employee-deletion-impact.service.ts`.

```
Delete an employee who is:
  allocated in 3 scenarios     → all Allocation rows destroyed (Cascade)
  in a workforce plan          → all WorkforceAllocation rows destroyed (Cascade)
  manager of 4 direct reports  → those 4 orphaned (managerId SetNull)
  manager of 2 org nodes       → those nodes orphaned (SetNull)
  holder of skills/domains/calendar/org links → all destroyed

impact = DATA_LOSS  →  409 unless confirm=true and the name is typed
Audit entry written BEFORE the delete
```

---

## E33 — Two capacity validators disagreeing on one person

**Source** — J1/J2, constructible from the two live services.

```
EmployeeOrgUnitLink:  DELIVERY_ASSIGNMENT to Platform, allocationPct 80, consumeCapacity true
                      → a second consuming link at 30% is REJECTED (110% > 100%)

WorkforceAllocation:  the same person, same weeks, 80% + 30% = 110%
                      → ACCEPTED and displayed as OVER
```

**OBSERVED** — Same question, same person, opposite answers, both live.

---

## E34 — The Capacity page reports 300%

**Source** — `listAllocationSummaries`, documented as debt.

```
Employee present in 3 scenarios, 100% in each
→ summary.currentQuarterPct = 300
```

**OBSERVED** — *"Reports 300% for an employee present in 3 scenarios."* This is what the
Capacity page shows today.

---

## E35 — A work item recategorised rewrites the past

```
WorkItem "Upgrade PostgreSQL": workCategory MAINTENANCE
26 weeks of allocation rows carry work_category = MAINTENANCE
Change the item to TECH_DEBT
→ updateWorkItem re-syncs with a single updateMany
→ ALL 26 weeks, including elapsed ones, now report TECH_DEBT
```

**OBSERVED** — Necessary to keep the row and the item from disagreeing (I14); the cost is that
historical category reporting is not stable (J16).

---

## E36 — A completed initiative can still be staffed by the API

```
Initiative status = COMPLETE
UI:     excluded from the picker (LIVE_STATUSES / CLOSED_STATUSES in AddAllocationDialog.tsx)
API:    POST an INITIATIVE allocation to it  →  ACCEPTED
```

**OBSERVED** — The rule lives only in a React component (J19).

---

## E37 — Allocating to a division as if it were a product

```
Dialog "Product or team" offers OrgNodeType ∈ {PRODUCT, PLATFORM, TEAM, DIVISION, DEPARTMENT}
A user picks the DIVISION "Product & Technology"
→ targetKey = PRODUCT:<division-uuid>
→ appears in the "products" roll-up beside actual products
```

**OBSERVED** — No roll-up distinguishes granularity, so a division's bar and a team's bar sit
side by side and may double-count the same people's work at two levels.

---

## E38 — A week straddling a quarter boundary

**Source** — `resolveWeeksInPeriod`.

```
ISO week Mon 29 Dec 2025 – Sun 4 Jan 2026
Monday falls in Q4 2025  →  the whole week belongs to Q4 2025
                         →  contributes nothing to Q1 2026
```

**OBSERVED** — *"which is what stops two weeks of the same employee being counted in two
quarters."* Verified: a 26-week horizon started in December crosses into the next year and
weeks come out strictly consecutive.

---

## E39 — Planning past the seeded calendar

```
Horizon: 26 weeks from a date beyond the seeded Period range
→ seedPeriods(lastSeeded.year, lastSeeded.year + ceil(26/52) + 1)
→ re-query
Resolving a single week seeds year-1 .. year+1, "because an ISO week can belong to the
neighbouring calendar year"
```

---

## E40 — A person moved between teams mid-quarter

**OBSERVED, by absence.** There is no "move" operation for a person's allocations.

```
What a manager actually does:
  weeks 1–6   PRODUCT:<team-a>  100%
  weeks 7–13  PRODUCT:<team-b>  100%   (a second row, first row cleared for those weeks)
```

**Cannot express** — that this was one transfer rather than two independent decisions.
`OrgMembership` records the *structural* move with dates, and nothing connects the two facts.
Team roll-ups group by the employee's **current** membership, so weeks 1–6 are reported under
Team B once the membership flips.
