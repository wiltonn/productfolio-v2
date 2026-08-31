# Demand and Commitment Model

How a commercial need becomes something Product has promised to deliver.

Status: **in progress.** Settled items are stated plainly; unsettled areas name the open
decision carrying them.

---

## The three concepts

| Concept | What it is | Who owns it |
|---|---|---|
| **Need** | Something an organization wants — a market, customer or business requirement | The requesting organization |
| **Commitment** | A promise by a delivering organization to meet a Need, on stated terms | Agreed between the two |
| **WorkPackage** | The body of work that does it, and consumes capacity | The owning organization |

A Need is **not** a WorkPackage in an early state. They are separate concepts related
**many-to-many**: one Need may take several WorkPackages to satisfy — including packages owned
by different organizations — and one WorkPackage may serve several Needs.

§9's distinction is thereby structural, not a flag: *what Commercial wants* and *what Product
has committed to deliver* are different records with different owners and different lifecycles.

## Need

A Need is authored by a requesting organization — typically a Commercial Division, though
nothing restricts it to one.

**A Need has a requesting organization.** **OBSERVED** — neither existing implementation had
one: requester and sponsor pointed at individual users and were both nullable, so the model
could not say which division wanted something. That was the largest gap against §4–§9.

A Need carries a **coarse magnitude** of its own — enough to triage before anyone has scoped
it. It also carries **signals**: urgency, customer impact, business value. Signals inform
prioritization; they are not a rank.

A Need persists. It may be partly met, met by work across several organizations, or never met
at all — and remains visible in each case.

## Two magnitudes, deliberately

| | Grain | Purpose |
|---|---|---|
| A Need's estimate | Coarse | Triage: what would it cost to say yes? |
| A WorkPackage's demand | Capability-shaped | Planning: what capacity, of what kind |

**These are never summed together, and never reconciled.** They are answers to different
questions at different fidelities, and treating them as comparable is the mistake `J20` records
in both implementations.

The reason a Need needs its own number at all: **OBSERVED** — V1's request could carry only a
T-shirt size and real sizing happened after conversion, so it could not answer *what would it
cost to say yes to everything asked for this quarter?* You cannot scope everything in order to
decide what to scope.

## Commitment

A Commitment is a record with its own terms — what was agreed, for which period, by whom, to
whom. It links a Need to the delivery that answers it, and may cover part of a Need or span
several.

**A Commitment is frozen when made, while the Need it answers stays editable.** This is the one
idea worth keeping from V1's `conversionSnapshot`: the agreement must not drift silently as the
ask evolves.

**A Commitment is never inferred.** **OBSERVED** — V1 had four unrelated things called APPROVED,
none of them a promise to a requester, and commitment was read from an allocation row existing.
§25 forbids important state inferred from accidental record existence, and V1 needed an "intake
leakage" metric precisely to detect planned work nobody had asked for.

## Priority

**Product holds a single prioritized ranking** across all requesting organizations. A requesting
organization does not maintain its own ordinal ranking in the model.

Needs carry signals — urgency, value, customer impact — which inform that ranking without
constituting a second one.

**The accepted consequence** — a requesting organization cannot express relative importance
among its own Needs, and cannot read its position from the model. **OBSERVED** — V1's priority
was worse in a different way: it lived on the plan as unvalidated JSON, was scoped to one
quarter, died with the scenario, was invisible to requesters, and doubled as an admission list,
since unranked work read as *zero* demand rather than low priority. V2's ranking is durable and
belongs to the demand conversation rather than to a plan.

---

## Not yet settled

- **What states a Commitment moves through**, and what happens to one at a quarter boundary.
  Carried by *What states does a Commitment move through?*
- **What a WorkPackage's lifecycle is**, and whether capacity may be allocated to work nobody
  has committed to. Carried by *What is a WorkPackage's lifecycle?*
- **Whether an unmet Need constrains anything**, or is purely informational.
