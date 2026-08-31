# Domain Vocabulary

Canonical vocabulary for ProductFolio V2. Every term has one precise meaning. Where a term is
still unsettled, it is listed under *Unsettled* rather than given a provisional definition.

This is a glossary. It contains no schema, no API and no implementation detail.

---

## Settled terms

### Employee

An individual source of workforce capacity.

### Capacity

The working time an Employee has available. Capacity belongs to the Employee, is finite, and
varies over time.

### Membership

The relationship that makes an Employee's capacity **owned** by an organizational unit.
Membership answers *whose capacity is this?* — it attributes supply, and it never spends time.

An Employee has **exactly one** Membership at any moment. Membership is temporal: it changes,
and past Memberships remain true of the past.

### Affiliation

A non-owning relationship between an Employee and an organizational unit — being aligned to
it, or being drawable from it. An Employee may hold **any number** of Affiliations at once.

An Affiliation never owns capacity and never spends it. It exists to express that a unit may
*draw on* a person without owning them.

### Allocation

The relationship that **spends** an Employee's capacity. Only work is allocated to; capacity is
consumed by allocation and by nothing else.

### Capacity supply

The capacity an organizational unit owns, derived from the Memberships in force. A question
about supply is answered from Membership.

### Capacity consumption

The capacity spent on work, derived from Allocations. A question about what capacity went to is
answered from Allocation, never from Membership.

---

## Deliberately unsettled

These terms are open questions, not vocabulary. Do not use them as though settled; say which
sense you mean and flag it.

- **Request · Demand · Commitment · Priority · Need** — the commercial-to-product lifecycle (§9).
- **WorkPackage · WorkItem** — the work model (§12–§13).
- **Skill · Capability · Job Profile · Role · Discipline** — the capability model (§20).
- **Token** — whether the term survives at all (§21).
- **Product Area · Product Workstream · Product Portfolio** — named in the brief as
  organizational structure (§6), but their model is not yet settled.
