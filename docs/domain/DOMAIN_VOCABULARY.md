# Domain Vocabulary

Canonical vocabulary for ProductFolio V2. Every term has one precise meaning. Where a term is
still unsettled, it is listed under *Unsettled* rather than given a provisional definition.

This is a glossary. It contains no schema, no API and no implementation detail.

---

## Settled terms

### Employee

An individual source of workforce capacity.

### Capacity

The working time an Employee has. Capacity belongs to the Employee, is finite, varies over
time, and is **time only** — it is never discounted by how effectively that time is used.

### Contracted capacity

An Employee's own working week. It is the denominator of every allocation percentage: 100%
means all of *this* Employee's week, not a nominal full-time week.

### Absence

Capacity the organization does not have — leave, holiday, statutory time away. Absence is the
only thing that reduces an Employee's capacity.

### Available capacity

Contracted capacity less Absence. The time the organization actually has from an Employee.

### Unallocated capacity

Available capacity not yet spent on work. Real headroom.

### Overhead

Not a domain concept. Management duty, administration and other non-delivery obligations are
**work**, and are allocated like any other work — see [[rejected-overhead-as-capacity-reduction]]
in `REJECTED_CONCEPTS.md`.

### FTE

An Employee's capacity expressed against a standard full-time week, so people can be compared
and summed across a team. A derived reporting conversion, never the planning unit.

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

### Organizational Unit

Any node in the enterprise's organizational structure — a Commercial Division, a Product
Portfolio, a Product Workstream, a Product Area, an Engineering Function, a Team. All units are
the same kind of thing; a unit's **type** says what it is, for reading and roll-up, and does not
constrain what may contain what.

### Enterprise

The root of the organizational structure. Commercial Divisions, the Product organization and
Engineering are peer branches beneath it. No Commercial Division is the root — OEM included.

### Commercial Division

A durable commercial/business organizational boundary. Modelled as deep as its capacity goes:
units owning people whose weeks are planned here are represented; sales and go-to-market
functions are not.

### Product Portfolio · Product Workstream · Product Area

The Product organization's unit types, in containment order as normally arranged. A Product
Portfolio is an executive Product boundary led by a Product VP; a Product Workstream is a
grouping within one; a Product Area is a durable Product responsibility.

"Workstream" refers to Product organizational structure and nothing else. It is never a generic
synonym for work.

### Engineering Function

An Engineering unit type. Engineering is a peer branch of Product, never represented by
borrowing Product's levels. Its depth varies by group.

### Team

A relatively stable unit that owns people. Teams exist in every branch.

### WorkPackage

A meaningful body of work against which capacity is planned — a capability launch, a migration,
a regulatory change, a sustain effort, a tech-debt effort, a custom software delivery.

ProductFolio models exactly one level of work. There is no concept beneath a WorkPackage:
execution detail lives in the delivery tools. A WorkPackage has no subtype — "Initiative" and
"Project" are not V2 concepts.

### Demand

The capacity and capability required to accomplish a WorkPackage. Demand belongs to the
WorkPackage and may be shaped by capability, so that it can be compared against supply.

### Contribution

An organizational unit providing capacity to a WorkPackage, through the Allocations of its
people. Contributing capacity to work never makes a unit organizationally part of the work's
sponsor.

### Need

Something a requesting organization wants — a market, customer or business requirement. A Need
has a **requesting organization**, carries a coarse magnitude for triage, and carries signals
(urgency, customer impact, business value) that inform prioritization without being a rank.

A Need is not a WorkPackage in an early state. A Need may require several WorkPackages, and a
WorkPackage may serve several Needs.

### Commitment

A promise by a delivering organization to meet a Need, on stated terms: what was agreed, for
which period, by whom, to whom. A Commitment is **frozen when made**, while the Need it answers
remains editable. It may cover part of a Need or span several.

A Commitment is never inferred from the existence of an allocation.

### Priority

A single ranking, held by Product, across all requesting organizations. Needs carry signals that
inform it; a requesting organization does not maintain its own ranking in the model.


---

## Deliberately unsettled

These terms are open questions, not vocabulary. Do not use them as though settled; say which
sense you mean and flag it.

- **Skill · Capability · Job Profile · Role · Discipline** — the capability model (§20).
- **Token** — whether the term survives at all (§21).
