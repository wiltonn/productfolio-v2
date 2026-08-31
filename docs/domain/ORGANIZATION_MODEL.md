# Organization Model

How organizational ownership and workforce structure are represented.

Status: **in progress.** This document records what has been settled. Unsettled areas are named
as such and carry a pointer to the open decision.

---

## Ownership and consumption are different relationships

The model draws a hard line between two questions that look alike and behave differently:

| Question | Answered from | Never answered from |
|---|---|---|
| Whose capacity is this? | Membership | Allocation |
| What was that capacity spent on? | Allocation | Membership |

**Only work consumes capacity.** Belonging to an organizational unit does not spend an
Employee's time, however that belonging is described. An organizational unit holds no claim on
a share of a person.

This keeps §8.1 (organizational ownership) separate from §14 (capacity contribution), and it is
what allows one body of work to draw capacity from several organizations without any of them
owning the others' people.

### Why the distinction is not merely tidy

An Engineer whose Membership is in Engineering, allocated to work committed to OEM, must appear
as **Engineering's capacity** and as **OEM's consumption** at the same time. A model in which
belonging consumes capacity cannot express this without double-counting the person or
misattributing the supply.

---

## Membership

An Employee's capacity is owned by exactly one organizational unit at any moment.

- Membership attributes **supply**; it never spends time.
- Exactly one is in force at a time. There is no percentage on a Membership, because a
  percentage would make *whose capacity is this?* a question with more than one answer.
- Membership is temporal. It changes, and history stays true — see the open decision on
  temporal relationships.

## Affiliation

An Employee may additionally hold any number of non-owning **Affiliations** — relationships
expressing that a unit is aligned with, or may draw upon, a person it does not own.

An Affiliation owns nothing and spends nothing. It exists so the model can say *this unit may
draw on this person* without that statement becoming a claim on their time.

**Open:** whether V2 needs a typed taxonomy of Affiliations, and whether "may be drawn from"
belongs here at all or is properly a concept of the capability model. Carried by
*Capability, shared service, or platform — which abstraction?*

---

## One structure, typed units

The enterprise is **one organizational structure**: a single tree of **Organizational Units**
rooted at the Enterprise, with Commercial Divisions, the Product organization and Engineering
as peer branches beneath it.

OEM is a Commercial Division within that tree. It is not the root, and nothing above a Division
is division-specific.

Every unit is the same kind of thing, which is what lets Membership, capacity supply and
traversal work uniformly regardless of which branch a person sits in.

### The type is a label, not a grammar

Each unit carries a **type** — Commercial Division, Product Portfolio, Product Workstream,
Product Area, Engineering Function, Team, and so on. The type says what a unit *is*, for
reading and for roll-up: *capacity by Product Portfolio*, *capacity by Commercial Division*.

The type deliberately does **not** constrain composition. The model does not declare what may
contain what. This was a considered choice: §7 requires Engineering's structure to be
investigated rather than assumed, and §26 warns that organizational relationships move, so
encoding a composition grammar now would fix a hierarchy that has not been validated.

**The accepted consequence** — shape correctness is a property of the *data*, not of the model.
Nothing prevents a Division being placed under a Team. Both existing implementations took this
same approach and their type tags went decorative: V1's nine-member `OrgNodeType` gates exactly
one thing (`ROOT`), has no parent-type validation at all, and four of its nine members were
appended in a migration with no supporting code, test or UI. That is the failure mode to watch
for; the mitigation is validating the data, and revisiting this decision if the type stops
meaning anything.

## Engineering

Engineering is a peer branch, not a Product Portfolio. It is never represented by borrowing
Product's levels (§7).

**Its depth varies by group.** Some Engineering functions have an intermediate grouping between
the function and its teams; others run straight to teams. Depth is a property of the data, not
a rule of the model — which the absence of a composition grammar supports directly.

## Commercial Divisions

A Commercial Division is modelled **as deep as its capacity goes, and no deeper**.

- Units that own people whose weeks are planned here — dedicated software and delivery teams —
  are modelled as Organizational Units.
- Functions whose capacity this system does not plan — sales, go-to-market, commercial
  operations — are **not** modelled. As far as they are concerned the Division is a single unit.

This keeps §5 and §14 answerable: an OEM custom-software team is a real unit that owns capacity
and can contribute to work alongside Product and Engineering, while the rest of OEM adds no
structure the system asks questions about.

---

## Not yet settled

- **Which organizational relationships need history or future-effective dating.** Carried by
  *Which organizational relationships need history?* Note that Membership's role as the supply
  attribution makes its temporal behaviour load-bearing for any dated roll-up.
- **Whether an organizational unit can be an allocation target**, and what it would mean given
  that units do not consume capacity. Carried by *What can a weekly allocation point at?*
- **Whether Product Area is also the capability-ownership concept**, or whether capability
  ownership is a separate relationship. Carried by *Capability, shared service, or platform —
  which abstraction?*
