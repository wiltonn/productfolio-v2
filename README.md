# ProductFolio V2

ProductFolio V2 is a small **Engineering quarterly-planning system**.

It answers, for each quarter: how much Engineering capacity exists, what work has been
accepted, how team capacity is assigned to that work, whether the plan is feasible, and what
has actually been committed.

## First release

1. **Engineering census and quarterly capacity** — people, working schedules, effective
   dates, absences, overhead; net delivery capacity per team per quarter.
2. **A quarterly work list** — accepted WorkPackages with rough estimates in engineer-weeks.
3. **Team-quarter capacity assignments and reconciliation** — explicit arithmetic, explicit
   shortfalls, an explicit Unplanned Work reserve.
4. **Feasibility and commitments** — recorded technical-lead feasibility judgments with
   their material assumptions; only feasible work is committed; approved baselines are
   preserved separately from later revisions.

The planning unit is the **team-quarter**, not the employee-week. Selective detail exists
only for constrained specialists and for rough monthly sequencing where dependencies or
delivery windows require it.

## Deferred, not abandoned

ProductFolio began as an enterprise capacity-and-portfolio redesign. That direction remains
the long-term intent, and the model preserves the boundaries needed to grow into it — but
the following are explicitly out of the first release: enterprise-wide commercial request
negotiation, product/capability catalogs, scenario engines, token models and portfolio
optimization, Monte Carlo forecasting, broad skill matching, employee-week scheduling, and
execution-level task management.

The pre-reset enterprise design is preserved at git tag
`checkpoint/pre-engineering-quarterly-reset`.

## Repository structure

- `CLAUDE.md` — the current working brief and implementation gate.
- `docs/domain/` — the authoritative domain model. Start at `docs/domain/README.md`.
- `docs/domain/evidence/` — historical evidence from the two legacy implementations;
  reference only.
- `docs/agents/` — conventions for agents working in this repo.

## Current phase

Domain documentation for the first-release scope. Application implementation does not begin
until the product owner approves moving past domain design.
