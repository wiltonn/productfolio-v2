# Work Model

How work is represented, independently of organizational structure.

Status: **in progress.** Settled items are stated plainly; unsettled areas name the open
decision carrying them.

---

## One level of work: the WorkPackage

A **WorkPackage** is a meaningful body of work against which capacity is planned.

Examples: a customer capability launch, a product enhancement, a cloud migration, a regulatory
change, a modernization effort, a major technical-debt effort, a custom software delivery, a
shared platform enhancement.

ProductFolio models **one** level of work. Execution detail — epics, stories, tickets, defects —
lives in the delivery tools and is not a ProductFolio concept.

### Why there is no level beneath it

§13 offered a planning-unit / execution-unit split as a hypothesis to validate. The validation
came back negative.

**OBSERVED** — The original ProductFolio had no `WorkItem` at all (zero occurrences repo-wide)
and ran with nothing below its planning unit. In the newer implementation, `WorkItem` exists
*because* `ScopeItem.initiativeId` is `NOT NULL` — its own schema comment says so — and is kept
deliberately thin because a second set of demand numbers *"would immediately diverge"*.

A level below the planning unit therefore has to be argued from workflow, and no workflow argued
for it. §13's own guidance points the same way: managers are not to plan at ticket-level
precision, and a level the model never plans at earns nothing but a reconciliation problem.

### Why there is only one kind of it

**OBSERVED** — `Project` and `Initiative` are behaviourally interchangeable (`J7`): the same
container shape, the same targeting, the same attribution, the same retirement. The PRD asserts
a distinction — *"Initiative = temporary strategic outcome. Project = optional execution
container"* — that the schema never encodes, and `Project` has no administrative UI at all. The
original shipped only `Initiative`.

A WorkPackage carries no subtype. Whether it carries an *investment class* is a separate
question — see *What owns investment classification?*

### Why it is not called an Initiative

"Initiative" carries a strategic, temporary connotation. Ongoing product work that belongs to no
initiative is the case the newer implementation was largely built to represent (`E13`), and
filing it as "an Initiative" fails §25's test that a business user can explain the concept
without wincing. WorkPackage covers §12's full range without that strain.

---

## Demand belongs to the WorkPackage

A WorkPackage carries its own **demand** — the capacity and capability required to accomplish
it. Demand may be shaped by capability: three backend-weeks and two design-weeks is a different
statement from five weeks, and the difference is what makes constraint analysis possible.

That breakdown is a property of the WorkPackage's demand, **not** a separate body of work.

**This is the gap both implementations left open.** `J20` asks whether the thing you estimate
and the thing you staff should be the same record; in both codebases they were not, and were
never reconciled — demand hours and allocation hours live in unrelated tables that one endpoint
prints side by side without comparing. §22 requires demand and supply to be comparable. Hanging
both off the same record is what makes them so.

---

## Work is not owned by one organization

A WorkPackage may draw capacity from units in any branch — Commercial, Product, Engineering —
without any of those units becoming part of another, and without the work becoming
organizationally owned by whoever sponsored it (§14). Contribution of capacity and organizational
ownership are different relationships; see `ORGANIZATION_MODEL.md` and `X9`.

Work must be able to exist without a sponsor's initiative-like framing at all: ongoing product
work is a WorkPackage like any other (`I11`, `E13`).

---

## Not yet settled

- **A WorkPackage's lifecycle**, and whether its state transitions must be durably recorded.
  Carried by *What is a WorkPackage's lifecycle?*
- **What owns investment classification**, and whether a WorkPackage carries it. Carried by
  *What owns investment classification?*
- **Whether a WorkPackage is an allocation target**, and what else may be. Carried by *What can a
  weekly allocation point at?*
- **How work depends on work or on capability.** Carried by *How work depends on work* — note
  that **OBSERVED**, work-to-work dependency was never shipped in either implementation, so V2
  inherits nothing here.
- **How a commercial need becomes a commitment**, and what that commitment attaches to. Carried
  by *How a commercial need becomes a product commitment*.
