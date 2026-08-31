# Open Decisions

Important domain decisions, open and closed. Each carries question, context, options,
consequences and — once made — the decision.

Decisions are worked through the domain map on the issue tracker; this file is the durable
record, not the queue.

---

## D1 — Does belonging to an org unit consume capacity? **DECIDED**

**Question** — Does belonging to an organizational unit consume an Employee's capacity, or does
only work consume capacity?

**Context** — Both existing implementations answer, and they answer differently.

- The original ProductFolio settled it **per relationship type** in the schema.
  `EmployeeOrgUnitLink.consumeCapacity` defaults false; a hard `NEVER_CONSUMES` rule blocks
  `PRIMARY_REPORTING`, `FUNCTIONAL_ALIGNMENT` and `CAPABILITY_POOL`, while
  `DELIVERY_ASSIGNMENT` and `TEMPORARY_ROTATION` default true. Capacity-consuming links are
  summed and hard-rejected above 100%. **OBSERVED** — and yet no capacity, supply, gap,
  forecast, baseline or token computation reads either field. V1's behaviour says only work
  consumes; V1's schema says it depends.
- The newer workforce-planner inherited both halves and reconciled neither (`J1`): an org link
  holding a capacity claim, and a separate weekly allocation against work, with nothing
  reconciling them and no service reading more than one.

**Options considered**

1. Only work consumes capacity; Membership is pure supply attribution.
2. It depends on the relationship type — preserve the conditional rule as domain truth.
3. Belonging consumes capacity; work draws from within the unit's claim.

**Decision** — **Only work consumes capacity.**

Option 2 was rejected on the observation that its five relationship types are not five kinds of
belonging. Three are *states of belonging* — who manages you, who you are aligned to, who may
draw on you. Two are *acts of assignment* — you have been placed somewhere to do something.
Once the two assignment types are recognised as work rather than membership, the conditional
rule collapses into option 1, and the apparent three-way choice disappears.

Option 3 was rejected because it makes organizational ownership and capacity spend the same
relationship, which §8 forbids.

**Consequences**

- Membership determines **whose capacity supply** an Employee is, and nothing about how it is
  spent. Owned-capacity roll-ups follow Membership; spent-capacity roll-ups follow Allocation.
- An Employee has exactly one owning Membership at a time, and any number of non-owning
  Affiliations. No percentage ever lands on a Membership — a percentage there would make
  *whose capacity is this?* ambiguous, which is the root of `J1`.
- An organizational unit is not, on its own, a thing that capacity can be spent on. What this
  means for allocation targets is carried by *What can a weekly allocation point at?*
- Membership's temporal behaviour becomes load-bearing: every dated supply roll-up depends on
  which Membership was in force. Carried by *Which organizational relationships need history?*
- Whether Affiliations need a typed taxonomy — and whether "may be drawn from" is an
  organizational or a capability concept — is carried by *Capability, shared service, or
  platform — which abstraction?*

**Evidence** — `original-productfolio/allocation-capacity.md`,
`original-productfolio/organization.md`, `workforce-planner/JAGGED_DOMAIN_AREAS.md` `J1`.

---

## D2 — Nominal capacity versus deployable capacity **DECIDED**

**Question** — What does an allocation percentage measure, what reduces capacity, and which of
nominal / contracted / available / deployable the domain needs as distinct concepts.

**Context** — V1 used **three different denominators for one stored percentage**: the write path
converted against `hoursPerWeek × 13`, the read path preferred `CapacityCalendar.hoursAvailable`,
and the over-allocation check compared against a bare literal `100` (**OBSERVED**). Nothing
reconciled them. The newer implementation has a single `capacityPct ?? 100` designed, documented
and tested for this problem, which **no production caller ever passes** (`J9`) — so it too is
always the literal 100.

The two codebases also mean different things by "deployable": the newer one means capacity that
can go to work (`DEPLOYABLE` / `OVERHEAD` / `UNAVAILABLE`); V1 meant
`effectiveHours = allocated × proficiency × buffer × ramp`, a productivity discount that is a
property of the person-and-work pairing and was never persisted.

**Decisions**

1. **100% means the Employee's own contracted week.** A half-time Employee planned at 100% is
   fully committed. FTE becomes a derived conversion for cross-person roll-ups, not the planning
   unit. Rejected: a nominal full-time denominator, under which a part-timer can never register
   as over-allocated.
2. **Absence is the only thing that reduces capacity. Overhead is work.** Management duty and
   administration are allocated like any other work rather than deducted. Rejected: the
   `OVERHEAD` / `UNAVAILABLE` split, whose distinction the newer build states and never uses
   (`E7` — both are summed into `reserved` with no branch).
3. **Capacity is time, never discounted by effectiveness.** Proficiency, ramp and buffer describe
   how much gets done, not how much time exists. If they matter they attach to the
   person-and-work match through the capability model.

**Consequences**

- `available = contracted − absence`; `unallocated = available − allocated`. **`I3` dissolves**:
  "unallocated is not the same as available" was true only because overhead was modelled as a
  capacity reduction. It is now derivable rather than a standing rule, and must be restated
  rather than promoted — carried by *Which invariant candidates are real?*
- Over-allocation is measured against the Employee's own available week, never a literal 100.
  Both existing implementations get this wrong for part-time Employees.
- §11 must accommodate management and administrative work, which is capacity spent but is not
  obviously one of the three investment classes. §16's own example hints at a residual with its
  "Remaining / Other 10%" line. Carried by *What owns investment classification?*

**Evidence** — `workforce-planner/DOMAIN_INVARIANTS_CANDIDATES.md` `I1`–`I3`;
`workforce-planner/JAGGED_DOMAIN_AREAS.md` `J9`, `J10`; `workforce-planner/DOMAIN_EXAMPLES.md`
`E4`–`E7`; `original-productfolio/allocation-capacity.md` §(b).

---

## D3 — How many organizational structures, and what shape is Engineering? **DECIDED**

**Question** — One typed tree, several distinct structures, or a shared abstraction with a shape
per branch? Does Engineering have an intermediate grouping? Do Commercial Divisions have
internal structure the model must see?

**Context** — The evidence cannot answer this. **OBSERVED** — neither implementation has any
Product/Engineering distinction: no enum member, no column, no branch, no test. Both model one
undifferentiated tree with a type tag. V1's nine-member `OrgNodeType` gates exactly one thing
(`ROOT`), performs no parent-type validation, and four of its members were appended a day after
the rest inside a matrix-org migration with no supporting code, test or UI. "Engineering" appears
in either codebase only as an example team name. The workforce-planner source is unreachable, so
no further archaeology is possible. This decision rests on explicit business statement, which
outranks both codebases anyway.

**Decisions**

1. **One organizational structure**: a single tree of Organizational Units rooted at the
   Enterprise, with Commercial Divisions, Product and Engineering as peer branches. OEM is a
   Commercial Division, not the root.
2. **The type labels, it does not constrain.** No composition grammar: the model does not declare
   what may contain what. Rejected: a per-branch grammar making the type a real constraint.
   Reason for the choice — §7 requires Engineering's structure to be investigated rather than
   assumed and §26 warns that organizational relationships move, so encoding a grammar now would
   fix a hierarchy that has not been validated.
3. **Engineering's depth varies by group.** Some functions have an intermediate grouping between
   the function and its teams; others go straight to teams. Depth is data, not model.
4. **Commercial Divisions are modelled as deep as their capacity goes.** Dedicated software and
   delivery teams are units; sales, go-to-market and commercial operations are not modelled.

**Consequences**

- Shape correctness is a property of the data rather than of the model. Nothing prevents a
  Division under a Team. Both existing implementations made this same choice and their type tags
  went decorative — that is the known failure mode, and the mitigation is data validation plus
  revisiting this decision if the type stops meaning anything.
- §5 and §14 stay answerable: an OEM custom-software team is a real unit that can contribute
  capacity alongside Product and Engineering without OEM's commercial functions appearing.
- Resolves the open question of what the model does with the assumption that OEM was the root:
  it is a Commercial Division beneath the Enterprise, and nothing above a Division is
  division-specific.

**Evidence** — `original-productfolio/organization.md`;
`workforce-planner/ORGANIZATION_SEMANTICS.md` §0; `workforce-planner/JAGGED_DOMAIN_AREAS.md` `J4`.
