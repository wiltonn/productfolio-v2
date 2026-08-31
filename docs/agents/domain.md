# Domain Docs

How the engineering skills should consume this repo's domain documentation.

ProductFolio V2 is in a **domain redesign** phase. There is no application code — the domain
documents *are* the codebase. Treat them with the care you would give production source.

## Where the domain lives

Authoritative domain design lives under **`docs/domain/`** (CLAUDE.md §27). This repo does
**not** use a root `CONTEXT.md`, a `CONTEXT-MAP.md`, or `docs/adr/`. Do not create them —
put domain content in `docs/domain/` instead.

```
docs/domain/
├── README.md                       ← the index: describes every planned document
└── evidence/
    ├── workforce-planner/          ← the newer implementation (§29 stream 2)
    └── original-productfolio/      ← the original ProductFolio (§29 stream 1)
```

The two evidence directories are **separate streams on purpose** (§29): evidence is extracted
independently from each implementation so that the first one inspected does not anchor the
reading of the second. Never merge them, and always say which stream a citation comes from.

`docs/domain/README.md` is the map. It describes eleven documents —
`DOMAIN_VOCABULARY.md`, `DOMAIN_MODEL.md`, `ORGANIZATION_MODEL.md`, `WORK_MODEL.md`,
`WORKFORCE_CAPACITY_MODEL.md`, `DOMAIN_INVARIANTS.md`, `DOMAIN_EXAMPLES.md`,
`OPEN_DECISIONS.md`, `V1_DOMAIN_EXTRACTION.md`, `WORKFORCE_PLANNER_EVIDENCE.md`,
`REJECTED_CONCEPTS.md` — and states what each is for.

**Most of those documents do not exist yet.** The README is a plan, not an inventory. Before
citing one, check whether it is on disk. When you create one, follow the purpose the README
assigns it rather than inventing a new shape, and don't fold two of them into one file.

## Before exploring or proposing anything, read

1. **`CLAUDE.md`** at the repo root — the standing domain brief. §4–§24 carry the current
   business facts (Commercial Divisions, the Product hierarchy, Engineering, investment
   classification, the three relationships that must stay distinct). §25 is the test any new
   concept must pass.
2. **`docs/domain/README.md`** — the document map and the authority order.
3. The specific `docs/domain/` documents covering the area you're about to touch.
4. **`docs/domain/evidence/workforce-planner/`** — before asserting anything about how the existing
   implementations behave.

## The evidence directory

`docs/domain/evidence/workforce-planner/` holds evidence extracted from the **workforce-planner**
implementation, surveyed at commit `3cd0dbd` on branch `feat/workforce-capacity-planning`.
That snapshot is currently unavailable in the local clone and connected GitHub repository.
Read `evidence/workforce-planner/SOURCE_MANIFEST.md` before relying on code or line citations.

> **This stream is not reproducible.** Its citations cannot be checked against source, so
> where it conflicts with `original-productfolio/` — whose citations *are* reproducible against
> `wiltonn/productfolio` — the reproducible stream wins on matters of fact. This does not
> lower its value on matters of intent: it is the more recent product thinking.

| File | What it holds |
|---|---|
| `README.md` | Index, labels, and the headline finding |
| `SOURCE_MANIFEST.md` | Claimed source, verification status, and recovery gate |
| `COVERAGE_MATRIX.md` | Coverage against the V2 north star and missing evidence streams |
| `WORKFORCE_DOMAIN_EVIDENCE.md` | 20 concepts: meaning, relationships, rules, temporality, confidence |
| `WORKFORCE_USER_WORKFLOWS.md` | 12 workflows (W1–W12): actor, action, objects, rules, ambiguity |
| `ALLOCATION_SEMANTICS.md` | What an allocation currently means — three live, unreconciled meanings |
| `ORGANIZATION_SEMANTICS.md` | Org ownership, cardinality, temporality, permanence assumptions |
| `WORK_CLASSIFICATION_EVIDENCE.md` | Every classification axis, mapped to its purpose |
| `DOMAIN_INVARIANTS_CANDIDATES.md` | 25 candidate rules (I1–I25) with evidence and exceptions |
| `JAGGED_DOMAIN_AREAS.md` | 22 unsettled areas (J1–J22): competing concepts, open question |
| `DOMAIN_EXAMPLES.md` | 40 concrete cases (E1–E40) from fixtures, tests and code paths |
| `TERMINOLOGY_INVENTORY.md` | Terms, synonyms and collisions in the existing implementation |
| `NEXT_STEPS_USING_MATTPOCOCK_SKILLS.md` | Ordered continuation plan for evidence and domain design |

These entries are **stably numbered**. Cite them — `J7`, `I18`, `E15` — rather than
paraphrasing; it is the cheapest way to make a claim checkable.

The headline finding is worth carrying into analysis: the redesign's vocabulary
(Product Portfolio, Product Workstream, Product Area, Product VP, Sustain, New Development)
is not represented as first-class vocabulary in the surveyed implementation, and the surveyed
scope contains no Product/Engineering distinction. Whether the difference is terminological or
structural remains **UNKNOWN** until current business concepts are independently documented.
Never quietly map a V2 term onto an implementation term as though they were equivalent.

## Evidence labels are mandatory

Any claim about an implementation or source must use the labels defined by
`evidence/workforce-planner/README.md`:

- **OBSERVED** — demonstrated by code, schema, tests, UI, or a captured workflow.
- **SOURCE-ASSERTED INTENT** — a PRD, ADR, plan, analysis, or comment states a requirement,
  rationale, recommendation, or design opinion.
- **RUNTIME OBSERVATION** — captured from a database, workbook, or running system.
- **SYNTHETIC EXAMPLE** — constructed from observed rules rather than found as a fixture.
- **OBSERVED BY ABSENCE** — a scoped search found no representation; record the search scope.
- **INFERRED** — a likely meaning derived from evidence.
- **UNKNOWN** — the available evidence does not settle it.

Do not promote intent, inference, runtime anecdotes, synthetic examples, or absence searches
to observed business truth. Say UNKNOWN rather than guessing—an honest gap is more useful than
a plausible answer.

## Authority order when sources conflict

1. Explicit current business/domain statements from the product owner.
2. Real workflows and operational requirements evidenced by the workforce-planner work.
3. Proven concepts and behaviour from the original ProductFolio implementation.
4. Existing schema names, class names, terminology and structure.

Existing code is evidence, not authority. Two implementations sharing a concept is not a vote
in its favour — they may share the same historical mistake.

## Vocabulary

The canonical glossary will be `docs/domain/DOMAIN_VOCABULARY.md`. Until it exists, the
working vocabulary is **CLAUDE.md §24 (Current Working Concepts)**, and
`evidence/workforce-planner/TERMINOLOGY_INVENTORY.md` records which terms are already overloaded in the
existing implementations.

When your output names a domain concept — a document heading, an issue title, a hypothesis, an
example — use the established term with its established meaning. Do not introduce a synonym
for a settled concept, and do not reuse a settled term for a different concept. "Workstream"
in particular means Product organizational structure and nothing else (CLAUDE.md §6).

Several terms are **deliberately unsettled** — Request, Demand, Commitment, Priority, Need
(§9); WorkPackage and WorkItem (§12–13); Skill vs Capability vs Role (§20); whether Token
survives (§21). Treat these as open questions, not as vocabulary. If you need one, say which
sense you mean and flag it as unresolved.

If a concept you need has no term at all, that is a signal: either you're inventing language
the domain doesn't use (reconsider), or there's a real gap worth recording in
`OPEN_DECISIONS.md`.

## Recording decisions

There are no ADRs in this repo. Decisions live in the domain documents themselves.

When a consequential domain decision is made (CLAUDE.md §27):

1. Update the relevant `docs/domain/` document.
2. Update the canonical vocabulary.
3. Update `OPEN_DECISIONS.md` — each entry carries question, context, options, consequences,
   a recommendation where appropriate, and the final decision once made.
4. Record rejected alternatives in `REJECTED_CONCEPTS.md`, **with the reason**, so they are
   not accidentally reintroduced.
5. Update `DOMAIN_EXAMPLES.md` if the decision changes how an example resolves.

A decision that exists only in conversation history has not been made.

## Flag conflicts, don't silently override

If your output contradicts a recorded decision, an invariant, or an explicit statement in
CLAUDE.md, surface it rather than routing around it:

> _Contradicts I18 (the parts must sum to the whole) — but worth reopening because…_

The same applies to the domain examples: a proposed model that cannot represent
`DOMAIN_EXAMPLES.md` cleanly is to be revised or rejected, not accommodated with a special
case.

## The implementation gate

CLAUDE.md §1 and §31: **do not write application code.** No frameworks, no Prisma models, no
migrations, no API routes, no React components, and no premature translation of domain
concepts into persistence structures — until the product owner explicitly approves moving
past domain design.

Skills that would normally produce code (`tdd`, `implement`, `prototype`, `diagnosing-bugs`)
have no target here yet. If one is invoked, say so and offer the domain-design equivalent —
a worked example, an invariant, an open decision — instead of writing code anyway.
