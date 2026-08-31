# Workforce Capacity Model

How employee capacity, its reduction and its consumption are represented.

Status: **in progress.** Settled items are stated plainly; unsettled areas name the open
decision carrying them.

---

## Capacity is time

An Employee's capacity is their working time. It is not adjusted for how effectively that time
is used — proficiency, ramp-up and estimating buffers describe *how much gets done*, not *how
much time exists*.

This matters because the alternative makes a person's week change size depending on what they
are pointed at, and *is this person full?* becomes unanswerable without knowing how well their
skills match their assignments.

## The three quantities

| Quantity | Meaning | Derived from |
|---|---|---|
| **Contracted capacity** | The Employee's own working week. The denominator of every percentage. | The Employee |
| **Available capacity** | Contracted capacity less Absence. The time the organization actually has. | Contracted − Absence |
| **Unallocated capacity** | Available capacity not yet spent. Real headroom. | Available − Allocated |

**100% means all of this Employee's own contracted week** — not a nominal full-time week. A
half-time Employee planned at 100% is fully committed, and is over-allocated above it.

### FTE is a derived conversion, not the planning unit

FTE expresses an Employee's capacity against a standard full-time week so that people can be
compared and summed across a team. It is a reporting conversion applied to the planning
numbers; it is never what a manager plans in.

A half-time Employee planned at 100% therefore reads as **full** on their own row and as
**0.5** in the team roll-up. Both are correct: they answer different questions.

## Absence

Absence is capacity the organization does not have — leave, holiday, statutory time away. It
reduces available capacity.

Absence is the **only** thing that reduces capacity. Everything else a person spends time on is
work, and is allocated.

## Overhead is work

Management duty, administration and other non-delivery obligations are **work**, not capacity
reductions. They are allocated like anything else.

A manager who spends a quarter of their time managing has not lost that time — they have spent
it. The alternative models the same fact twice: once as a smaller week, once as a thing being
done.

**Consequence:** *unallocated* and *available* are the same headroom. The rule that they differ
(`I3` in the workforce-planner evidence) was true only because overhead was modelled as a
capacity reduction; once overhead is work, the distinction is derivable rather than a standing
warning. Carried to *Which invariant candidates are real?* for restatement.

## Over-allocation

Over-allocation is allocation beyond **available** capacity — measured against the Employee's
own week after Absence, never against a nominal week and never against a bare literal 100.

Both existing implementations compared against a literal `100` regardless of the person, which
makes over-allocation undetectable for exactly the part-time Employees most at risk of it.

---

## Not yet settled

- **Whether over-allocation is prevented or merely reported.** Carried by *Which invariant
  candidates are real?* (`I4`, `J2`).
- **What an allocation may point at.** Carried by *What can a weekly allocation point at?*
- **How management and administrative work classify** against the three investment classes,
  given §11 requires everything to roll up to exactly one. Carried by *What owns investment
  classification?*
- **Whether proficiency or ramp enter the model at all**, and if so as a property of the
  person-and-work match. Carried by *Capability, shared service, or platform — which
  abstraction?*
