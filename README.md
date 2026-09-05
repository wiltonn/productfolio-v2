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

## What it is not

ProductFolio is not intended to become an HRIS, a payroll system, a Jira replacement, a
detailed task-management system, or a timesheet system.

## Deferred, not abandoned

ProductFolio began as an enterprise capacity-and-portfolio redesign, and that remains the
long-term direction: who owns capacity → who provides it → what business demand exists →
what has been committed → what work consumes capacity → what capabilities it depends on →
what type of investment it represents → how allocation changes over time → what constraints
and portfolio choices exist. The first release covers the Engineering slice of that chain,
and the model preserves the boundaries needed to grow into the rest — organizational
ownership, product/capability ownership, work dependency, and work ownership versus
contributing teams stay distinct, and organizational hierarchy is never used to represent
work dependency or capability consumption.

Explicitly out of the first release: enterprise-wide commercial request negotiation,
product/capability catalogs, scenario engines, token models and portfolio optimization,
Monte Carlo forecasting, broad skill matching, employee-week scheduling, and
execution-level task management.

The pre-reset enterprise design is preserved at git tag
`checkpoint/pre-engineering-quarterly-reset`; deferred-scope investigation notes are listed
in `docs/domain/README.md`.

## Run it

Requires Node 22.13 or later (the database uses the built-in `node:sqlite`).

```sh
npm install        # three dev dependencies; no runtime dependencies
npm run seed       # loads a clearly-labelled synthetic team and quarter
npm start          # http://127.0.0.1:3000/
npm test           # 54 checks, including the worked examples in docs/domain
```

The plan is saved to `data/planning.db` and survives restarts. The synthetic example
reproduces worked examples X1 and X6 from `docs/domain/DOMAIN_EXAMPLES.md`.

## Repository structure

- `CLAUDE.md` — the current working brief, implementation status and conventions.
- `docs/domain/` — the authoritative domain model. Start at `docs/domain/README.md`.
- `docs/domain/evidence/` — historical evidence from the two legacy implementations;
  reference only.
- `docs/agents/` — conventions for agents working in this repo.
- `src/` — the application: `domain/` (pure arithmetic), `db/` (SQLite persistence),
  `web/` (server-rendered pages), `plan.ts`, `seed.ts`.
- `test/` — automated checks mirroring the domain examples.

## Current phase

Slice 1 of the first release is implemented: one team, one quarter, from census to recorded
feasibility judgments. Further slices need explicit product-owner approval — see
`CLAUDE.md`.

## Guiding principle

Prefer conceptual coherence over compatibility with ProductFolio V1. Do not preserve a V1
concept merely because code already exists for it.
