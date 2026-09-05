# ProductFolio V2 Domain Design

The authoritative domain model for ProductFolio V2: a small **Engineering
quarterly-planning system** (scope reset 2026-09-05 — see `OPEN_DECISIONS.md` D6).

These documents describe the business domain independently of database, API and UI
implementation. Every rule has exactly one authoritative home; other documents point to it
rather than restating it.

## Active documents

All of these exist on disk and are current:

| Document | Authoritative for |
|---|---|
| `DOMAIN_VOCABULARY.md` | Canonical terms, one meaning each, with home pointers |
| `ORGANIZATION_MODEL.md` | The Engineering census — people, teams, schedules, effective dates — and the expansion boundaries |
| `WORKFORCE_CAPACITY_MODEL.md` | The capacity arithmetic: contracted → available → net delivery; absence, overhead, overhead ratio, constrained specialists |
| `WORK_MODEL.md` | WorkPackage, the quarterly work list, estimates, delivery investment categories, dependencies and delivery windows |
| `QUARTERLY_PLANNING_MODEL.md` | Assignments, the reconciliation identity, the Unplanned Work reserve, planning states, feasibility, commitments, baselines, reports |
| `DOMAIN_EXAMPLES.md` | Worked examples X1–X8 validating definitions and arithmetic; X1, X3, X6, X8 are asserted by `test/` |
| `OPEN_DECISIONS.md` | The decision log — settled, superseded and open decisions |
| `REJECTED_CONCEPTS.md` | Deliberately excluded concepts, with reasons |

## What the first release must support

1. Engineering census and quarterly capacity.
2. A quarterly work list of estimated WorkPackages.
3. Team-quarter capacity assignments and reconciliation.
4. Defensible feasibility judgments and quarterly commitments, with approved baselines
   preserved separately from revisions.

The planning unit is the team-quarter; a quarterly plan never requires employee-by-week
assignments.

**Implementation status:** slice 1 (one team, one quarter: census → capacity chain → work
list → assignments → reserve → reconciliation → planning states → recorded feasibility
judgments) is implemented under `src/`; see `OPEN_DECISIONS.md` D14 for what remains within
the first release.

## Deferred work

Deferred with the scope reset (D6), not abandoned: enterprise-wide commercial request
negotiation (Need, priority ranking), detailed product/capability catalogs, scenario
engines, token models and portfolio optimization, Monte Carlo forecasting, broad
skill-matching, employee-week scheduling, and execution-level task management. The
expansion boundaries in `ORGANIZATION_MODEL.md` keep these paths open, and the full
pre-reset design is preserved at git tag `checkpoint/pre-engineering-quarterly-reset`.

## `evidence/` — historical reference

`evidence/workforce-planner/` and `evidence/original-productfolio/` hold domain evidence
extracted from the two legacy implementations during the earlier enterprise-scope redesign.
They are preserved as historical reference: useful when a question genuinely turns on
legacy behaviour, never authoritative over the active documents, and **no legacy
investigation is required** before progressing the first-release scope. If citing them,
keep the two streams separate and use the evidence labels defined in
`evidence/workforce-planner/README.md`.

## Authority order

1. Explicit current business/domain statements from the product owner.
2. The active documents above.
3. Historical evidence under `evidence/`.

## Recording decisions

See `docs/agents/domain.md` for the working conventions: update the rule's home document,
the vocabulary, the decision log, rejected concepts and the examples together — a decision
that exists only in conversation history has not been made.
