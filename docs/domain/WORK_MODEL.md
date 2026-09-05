# Work Model

How work is represented. This document is the authoritative home of the WorkPackage, the
quarterly work list, estimates, the delivery investment categories, and dependencies.

Status: **active** for the first-release scope (revised 2026-09-05).

---

## One level of work: the WorkPackage

A **WorkPackage** is a meaningful body of work against which capacity is planned — a feature
delivery, a migration, a regulatory change, a sustain effort, a tech-debt effort.

ProductFolio models **one** level of work, retained from decision D4. There is no concept
beneath a WorkPackage: execution detail — epics, stories, tickets, defects — lives in the
delivery tools. Ticket estimates and detailed timesheets are never required. A WorkPackage
has no subtype; "Initiative" and "Project" are not V2 concepts
(see `REJECTED_CONCEPTS.md`).

## The quarterly work list

The **quarterly work list** is the set of WorkPackages **Accepted** for a quarter. Accepted
means exactly that the work is on the list — it says nothing about whether capacity has been
assigned to it or whether it is feasible. The full planning-state ladder
(Accepted → Assigned → Feasible → Committed) is defined in `QUARTERLY_PLANNING_MODEL.md`.

## Estimates

Each accepted WorkPackage carries a **rough capacity estimate** in **engineer-weeks**
(defined in `WORKFORCE_CAPACITY_MODEL.md`).

- Where the work requires more than one team, the estimate is broken into **team-specific
  contributions** (for example: 20 engineer-weeks = Atlas 14 + Beacon 6).
- Where the work requires a constrained specialist, the estimate may state that requirement
  explicitly (for example: including 4 engineer-weeks of the search specialist).
- Estimates are deliberately rough — comparable time-based quantities, not commitments of
  precision. They exist so assignment and feasibility have something defensible to reconcile
  against.

The estimate belongs to the WorkPackage (retained from D4: the thing you estimate and the
thing you staff are the same record).

## Delivery investment categories

Every WorkPackage on the quarterly work list is classified into exactly one **delivery
investment category**:

| Canonical label | Meaning |
|---|---|
| **New Development** | Work that creates new product or system capability — roadmap delivery. ("Roadmap Delivery" is an accepted business synonym; the canonical label is New Development.) |
| **Sustain & Maintenance** | Work that keeps existing capability running and supported — defect response, upkeep, operational support of what already exists. |
| **Tech Debt** | Work that improves the internal quality, structure or platform health of existing systems without changing what they do for users. |

Two things are deliberately **outside** these categories:

- **Overhead** (management and administration) is netted out before delivery planning and
  reported separately — never distributed across the categories
  (`WORKFORCE_CAPACITY_MODEL.md`).
- The **Unplanned Work reserve** is unclassified until it is consumed by actual work
  (`QUARTERLY_PLANNING_MODEL.md`).

Category percentages describe the **investment mix**. They never establish whether accepted
work fits — fit is a matter of reconciliation and feasibility. Any reported percentage must
state its denominator.

## Dependencies and delivery windows

A WorkPackage may **depend on** another WorkPackage (or on an external event), and may have
a **delivery window** — a date constraint such as a regulatory deadline or a vendor cutover.

Where a dependency or window constrains when work can happen inside the quarter, the plan
may add **rough monthly sequencing**: which month(s) each affected team's contribution lands
in. This is the coarsest sequencing that lets feasibility be judged; it is not a schedule,
and it is used only where a dependency or window requires it.

Work dependency is a relationship between pieces of work. It is never an organizational
relationship — see the expansion boundaries in `ORGANIZATION_MODEL.md`.

## Work ownership versus contributing teams

A WorkPackage has an owner (the team or lead answerable for it) and may draw assigned
capacity from several teams. Contributing capacity to a WorkPackage does not transfer
ownership of the work, and does not make the contributing team part of the owner's
organization. Retained from D4 and the pre-reset cross-organizational-work rule; this
boundary must survive expansion (see `ORGANIZATION_MODEL.md`).

---

## Not carried into the first release

- **WorkItem** — remains rejected as a planning concept (see `REJECTED_CONCEPTS.md`).
- **Capability-shaped demand** (backend-weeks vs design-weeks as first-class capability
  types) — deferred with the enterprise scope; the constrained-specialist mechanism covers
  the first-release need. See `OPEN_DECISIONS.md` D6.
- **Need and the Product priority ranking** — deferred; see `OPEN_DECISIONS.md` D5/D6.
