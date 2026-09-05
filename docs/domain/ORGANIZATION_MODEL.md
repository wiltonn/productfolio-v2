# Organization Model

How the Engineering organization and its people are represented, and the boundaries the
model must preserve as it expands. This document is the authoritative home of the census and
the expansion boundaries.

Status: **active** for the first-release scope (revised 2026-09-05).

---

## First-release scope: Engineering only

The first release models the **Engineering organization**: its teams and its people. No
Commercial Division, Product Portfolio, Product Workstream or Product Area is modelled yet.

## The census

The **Engineering census** is the authoritative roster: who is in Engineering, on which
team, on what working schedule, effective when.

- **Person** — an individual in the census. The basis of all capacity calculation
  (`WORKFORCE_CAPACITY_MODEL.md`). Carries a working schedule (full-time or a contracted
  fraction) with effective dates.
- **Team** — a relatively stable workforce unit; the unit whose quarter capacity is planned.
  Every person in the census belongs to exactly one team at any moment (retained from D1:
  membership attributes supply and never spends time).
- **Team membership is effective-dated.** People join, leave, change schedule and change
  team mid-quarter; the census records when each fact takes effect, and a team's
  capacity for a quarter is computed from the memberships and schedules in force week by
  week. History stays true — a past quarter's plan reads against the census as it was.
- Teams may optionally be grouped (for example under an Engineering function) for reporting.
  Grouping depth is data, not a rule of the model (retained from D3).

The census also records each person's expected **overhead** and, where relevant, marks a
person as a **constrained specialist** (both defined in `WORKFORCE_CAPACITY_MODEL.md`).

## Expansion boundaries

These distinctions are safeguards for later growth, not instructions to build the enterprise
model now. Nothing in the first release may collapse them:

1. **Organizational ownership** — which unit owns a person's capacity — is one relationship.
2. **Product/service ownership** — which team owns a durable product, platform or service —
   is a different relationship, never derived from org structure.
3. **Work dependency** — what work depends on other work — is a relationship between pieces
   of work, never an organizational parent/child link.
4. **Work ownership versus contributing teams** — a team contributing capacity to work is
   not thereby owned by the work's owner or sponsor (`WORK_MODEL.md`).

Two standing prohibitions carry forward unchanged:

- **Engineering must never be represented with fake Product structures** — no invented
  Product Portfolios, Workstreams or Areas to make Engineering fit a Product hierarchy.
- **OEM must not be assumed to own the shared Product organization.** When the model grows
  beyond Engineering, Commercial Divisions, Product and Engineering are peers; no division
  is the root.

---

## Not carried into the first release

- The **enterprise organizational tree** (Enterprise → Commercial Divisions / Product /
  Engineering as peer branches, typed but ungoverned units) — the D3 design is deferred
  intact and remains the intended shape at expansion.
- **Affiliation** (non-owning drawable relationships) — deferred with the capability model.
- Modelling Commercial Divisions and the Product organization at all.
