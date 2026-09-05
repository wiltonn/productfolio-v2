# Domain Docs

How agents should consume and maintain this repo's domain documentation.

ProductFolio V2 is documenting a **small Engineering quarterly-planning system** ahead of
implementation. There is no application code yet — the domain documents *are* the codebase.
Treat them with the care you would give production source.

## Where the domain lives

Authoritative domain design lives under **`docs/domain/`**. This repo does **not** use a root
`CONTEXT.md`, a `CONTEXT-MAP.md`, or `docs/adr/`. Do not create them — put domain content in
`docs/domain/` instead. `docs/domain/README.md` is the index: it distinguishes the active
documents, the initial-release requirements, and deferred work.

Every rule has exactly one authoritative home document. Cite the home; do not restate the
rule in a second document.

## Authority order when sources conflict

1. Explicit current business/domain statements from the product owner — currently the
   2026-09-05 Engineering quarterly-planning brief, reflected in `CLAUDE.md`.
2. The active documents under `docs/domain/` (excluding `evidence/`).
3. Historical evidence under `docs/domain/evidence/`.

## The evidence directory is historical reference

`docs/domain/evidence/` holds evidence extracted from the two legacy implementations
(`workforce-planner/` and `original-productfolio/`), gathered during the earlier
enterprise-scope redesign. It is preserved because it is expensive to regather and still
useful when a question genuinely turns on how the legacy systems behaved.

**No legacy investigation is required before making progress on the first-release scope.**
Do not block work on surveying these packages, and do not let a historical implementation
requirement override a current decision in the active documents. If you do cite evidence,
keep the two streams separate, say which stream a citation comes from, and use the evidence
labels defined in `evidence/workforce-planner/README.md` (OBSERVED / INFERRED / UNKNOWN and
their refinements). Do not promote inference to fact.

## Vocabulary

The canonical glossary is `docs/domain/DOMAIN_VOCABULARY.md`. When your output names a
domain concept, use the established term with its established meaning; do not introduce a
synonym for a settled concept or reuse a settled term for a different one. If a concept you
need has no term, that is a signal — either you are inventing language the domain doesn't
use, or there is a real gap worth recording in `OPEN_DECISIONS.md`.

## Recording decisions

There are no ADRs. Decisions live in the domain documents themselves. When a consequential
domain decision is made:

1. Update the relevant `docs/domain/` document (the rule's authoritative home).
2. Update `DOMAIN_VOCABULARY.md` if terminology changes.
3. Update `OPEN_DECISIONS.md` — it is the decision log, including superseded decisions and
   the concise reasons they were superseded.
4. Record rejected alternatives in `REJECTED_CONCEPTS.md`, with the reason.
5. Update `DOMAIN_EXAMPLES.md` if the decision changes how a worked example resolves.

A decision that exists only in conversation history has not been made.

## Flag conflicts, don't silently override

If your output contradicts a recorded decision or a worked example, surface the conflict
rather than routing around it. A proposed change that breaks the arithmetic in
`DOMAIN_EXAMPLES.md` is to be revised or rejected, not accommodated with a special case.

## The implementation gate

Do not write application code — no frameworks, no schemas, no migrations, no API routes, no
UI components — until the product owner explicitly approves moving beyond domain design for
the first-release scope. Skills that would normally produce code (`tdd`, `prototype`,
`diagnosing-bugs`) have no target here yet; if one is invoked, say so and offer the
domain-design equivalent — a worked example, an invariant, an open decision — instead.
