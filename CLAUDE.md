# ProductFolio V2 — Claude Instructions

## Current brief

ProductFolio V2 is being built as a **small Engineering quarterly-planning system**.

This brief supersedes the earlier enterprise-wide domain-redesign brief (2026-09-05). The
enterprise concerns — commercial request negotiation, product/capability catalogs, scenario
engines, token models, Monte Carlo forecasting, skill matching, employee-week scheduling —
are **deferred**, not abandoned. The prior brief and decision record are preserved at git tag
`checkpoint/pre-engineering-quarterly-reset`.

## First-release scope

1. **Engineering census and quarterly capacity** — who is in Engineering, on what working
   schedule, with what effective dates; the capacity arithmetic per team per quarter.
2. **A quarterly work list** — the WorkPackages accepted for the quarter, each with a rough
   capacity estimate in engineer-weeks.
3. **Team-quarter capacity assignments and reconciliation** — earmarking team capacity to
   accepted work, with an explicit reconciliation identity and explicit shortfalls.
4. **A defensible feasibility judgment and quarterly commitments** — recorded technical-lead
   judgments with material assumptions; only feasible work is committed; approved baselines
   preserved separately from revisions.

The primary planning unit is the **team-quarter**. A quarterly plan must not require
employee-by-week assignments. Selective detail is allowed for constrained specialists, and
rough monthly sequencing where dependencies or delivery windows require it. General
individual scheduling is out of scope.

## Where the model lives

The authoritative domain model is under `docs/domain/`. Do not restate its rules here or
elsewhere — each rule has one home:

- `docs/domain/DOMAIN_VOCABULARY.md` — canonical terms.
- `docs/domain/ORGANIZATION_MODEL.md` — census, teams, effective dates, expansion boundaries.
- `docs/domain/WORKFORCE_CAPACITY_MODEL.md` — the capacity arithmetic
  (contracted → available → net delivery), absence, overhead, overhead ratio, specialists.
- `docs/domain/WORK_MODEL.md` — WorkPackage, the quarterly work list, estimates, delivery
  investment categories, dependencies and delivery windows.
- `docs/domain/QUARTERLY_PLANNING_MODEL.md` — assignments, the reconciliation identity, the
  Unplanned Work reserve, planning states, feasibility, commitments, baselines, reports.
- `docs/domain/DOMAIN_EXAMPLES.md` — worked examples that any change must keep valid.
- `docs/domain/OPEN_DECISIONS.md` — the decision log, including superseded decisions.
- `docs/domain/REJECTED_CONCEPTS.md` — what was deliberately excluded, and why.
- `docs/domain/evidence/` — **historical reference only.** Evidence extracted from the two
  legacy implementations. It must not override the current decisions, and no legacy
  investigation is required before making progress on the first-release scope.

## Domain ground rules

- Capacity measures **working time, not productivity**.
- Category percentages describe investment mix; they never establish whether work fits.
  Always state a percentage's denominator.
- Aggregate capacity fit is necessary but insufficient: constrained specialists and delivery
  windows must also fit.
- An overallocated draft shows its shortfall explicitly; numbers are never silently adjusted.
- Preserve the expansion boundaries in `docs/domain/ORGANIZATION_MODEL.md`: organizational
  ownership, product/service ownership, work dependency, and work ownership versus
  contributing teams stay distinct. Engineering never gets fake Product structures.

## Implementation status and gate

**Slice 1 is approved and implemented** (D14, 2026-09-05): one team, one quarter — census,
capacity chain, work list, assignments, reserve, reconciliation, planning states, recorded
feasibility judgments. Persisted locally; runnable with synthetic data.

Anything beyond that slice — constrained-specialist tracking, monthly sequencing, formal
baseline approval and revisions, multi-team contributions, and everything in the deferred
list — still needs explicit product-owner approval before it is built. Routine
implementation and documentation decisions within the approved slice do not; genuine
business ambiguities that block a coherent model do.

## Implementation conventions

- **Stack:** Node ≥ 22.13, TypeScript run directly with `tsx` (no build step), the built-in
  `node:sqlite` for a single-file database, server-rendered HTML on `node:http` with plain
  forms, `node:test` for tests. Zero runtime dependencies; do not add a framework, ORM or
  client-side bundle for this slice.
- **Layout:** `src/domain/` holds pure arithmetic with no I/O (`calendar.ts`,
  `capacity.ts`, `planning.ts`); `src/db/` holds the schema and repository; `src/plan.ts`
  assembles one team-quarter and is the only path that records judgments;
  `src/engineering.ts` is the Engineering-wide read model over those plans; `src/web/`
  renders and routes; `src/seed.ts` loads the synthetic examples; `test/` mirrors the
  domain examples.
- **Commands:** `npm start` (serve on port 3000), `npm run seed` (adds any missing synthetic
  team — idempotent, never destructive, never requires deleting the database),
  `npm test`, `npm run typecheck`. The database lives at `data/planning.db` (gitignored;
  override with `PRODUCTFOLIO_DB`).
- **Rules of the code:** the domain layer must reproduce `docs/domain/DOMAIN_EXAMPLES.md`
  exactly and the tests assert it; every displayed quantity states its unit
  (engineer-weeks) and every percentage its denominator; arithmetic flags shortfalls and
  staleness but never confers feasibility; synthetic data is labelled synthetic.
- **Workspace vs planning unit (D16):** Census, Capacity and Allocations are Engineering-wide
  views over team-quarters. They read and total; they never own state, pool capacity, or
  edit without naming the team affected. Engineering percentages come from summed
  quantities, and a team's shortfall is never offset by another team's headroom.

---

## Agent skills

### Issue tracker

Issues live as GitHub issues in `wiltonn/productfolio-v2`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles use their default label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Authoritative domain design lives under `docs/domain/`; there is no root `CONTEXT.md` and no `docs/adr/`. See `docs/agents/domain.md`.
