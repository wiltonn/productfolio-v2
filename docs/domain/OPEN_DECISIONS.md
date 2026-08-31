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
