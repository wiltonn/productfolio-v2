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

## Not yet settled

- **How many organizational structures exist, and what shape Engineering takes.** Carried by
  *How many organizational structures, and what shape is Engineering?*
- **Which organizational relationships need history or future-effective dating.** Carried by
  *Which organizational relationships need history?* Note that Membership's role as the supply
  attribution makes its temporal behaviour load-bearing for any dated roll-up.
- **Whether an organizational unit can be an allocation target**, and what it would mean given
  that units do not consume capacity. Carried by *What can a weekly allocation point at?*
