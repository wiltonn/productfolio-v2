# Step-by-Step Plan Using `mattpocock/skills`

Source: [mattpocock/skills](https://github.com/mattpocock/skills). The repository describes
its skills as small, composable, and editable. This plan adapts them to ProductFolio's current
**domain-design-only** phase.

## Destination

Produce a synthesis-ready evidence base and an agreed ProductFolio V2 domain model without
starting application implementation.

## 1. Preserve this evidence baseline

1. Review and commit the documentation-only evidence changes.
2. Recover or preserve the source snapshot described in [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md).
3. Keep the original V1, workforce planner, and current-business evidence streams separate.

Completion criterion: every evidence stream has a named source, scope, authority, and
reproducibility status.

## 2. Install a focused, editable skill set

Follow the source repository's Codex installation path:

```text
npx skills@latest add mattpocock/skills
```

Select these skills rather than installing an undifferentiated workflow bundle:

| Skill | Role in ProductFolio |
|---|---|
| `setup-matt-pocock-skills` | Configure issue tracking and domain-document pointers |
| `wayfinder` | Map the multi-session domain effort as decision and research tickets |
| `grill-with-docs` | Interview the product owner while capturing vocabulary and decisions |
| `grilling` | Required interview discipline behind `grill-with-docs` and `wayfinder` |
| `domain-modeling` | Challenge terms, stress-test examples, and update the glossary/ADRs |
| `research` | Extract evidence from source code and primary business sources |
| `writing-for-agents` | Keep `CLAUDE.md` and agent pointers concise and reliable |
| `to-spec` | Convert the resolved domain conversation into an approval artifact |
| `to-tickets` | Break approved follow-up work into blocked, verifiable slices |

Do not use `implement`, `tdd`, or code-architecture skills until the repository's domain
implementation gate is explicitly approved.

Completion criterion: the selected skills are available to Codex and no duplicate installation
method has been used.

## 3. Review the completed `setup-matt-pocock-skills` configuration

Setup has already produced an Agent skills block in `CLAUDE.md` plus:

- `docs/agents/issue-tracker.md` — GitHub Issues in `wiltonn/productfolio-v2`;
- `docs/agents/triage-labels.md` — the five default triage labels; and
- `docs/agents/domain.md` — `docs/domain/` as the authoritative, single domain context.

Do not rerun setup unless changing the tracker or deliberately rebuilding this configuration.
Review and commit these files with the evidence package. Preserve the configured rule that this
repository does not create a duplicate `CONTEXT.md` or separate `docs/adr/`; vocabulary,
decisions, examples, and rejected alternatives remain in the existing `docs/domain/` document
map.

Completion criterion: the setup files and evidence labels agree, and `CLAUDE.md` contains one
concise Agent skills block.

## 4. Start a `wayfinder` map for domain readiness

Use this destination:

> ProductFolio V2 has independently collected, reproducible evidence; resolved vocabulary and
> relationships; representative Product, Engineering, Commercial, and cross-organizational
> examples; and an approved integrated domain model ready for architecture—not implementation.

Create initial tickets only for questions already sharp enough to answer:

1. Recover the workforce-planner source snapshot.
2. Extract original-main V1 evidence.
3. Validate Product organization vocabulary and temporal relationships.
4. Discover Engineering and Shared Technology structure.
5. Define the Commercial demand-to-Product commitment lifecycle.
6. Define product/capability ownership separately from organization.
7. Define work and capability dependency semantics.
8. Validate the three investment classifications across all organizations.
9. Evaluate useful V1 forecasting, token, and constraint concepts.
10. Define the evidence-complete synthesis gate.

Keep unclear downstream questions in the map's “Not yet specified” section rather than
pretending the whole route is already known.

Completion criterion: the map exposes a frontier of unblocked evidence or decision tickets,
and every ticket resolves one question within a single focused session.

## 5. Use `research` for repository and documentary evidence

For each evidence ticket:

1. Name the exact question and authority level.
2. Require primary sources: pinned code, tests, schemas, first-party docs, captured workflows,
   or product-owner statements.
3. Save one evidence packet under `docs/domain/evidence/<source>/`.
4. Apply the evidence labels defined by this package.
5. Update [COVERAGE_MATRIX.md](COVERAGE_MATRIX.md) when the packet is complete.

Completion criterion: each material claim has a reproducible source or an explicit blocked
status; recommendations remain outside the evidence packet.

## 6. Use `grill-with-docs` for current-domain evidence

Run separate sessions with people who can speak for:

1. Commercial quarterly planning;
2. Product Portfolio and Workstream ownership;
3. Engineering and Shared Technology;
4. workforce planning;
5. portfolio decision making and commitments.

During each session, use `domain-modeling` to:

- challenge overloaded terms;
- separate organization, capability ownership, work, demand/commitment, allocation, and
  dependency;
- test normal and adversarial examples;
- update canonical vocabulary immediately when a term is resolved; and
- create an ADR only for a consequential, hard-to-reverse trade-off.

Completion criterion: every accepted term has one meaning, unresolved terms remain explicit,
and examples cover Product, Engineering, Commercial, and shared-capability cases.

## 7. Resolve the wayfinder frontier

For each ticket:

1. Claim it before work begins.
2. Use `research` for primary-source questions or `grill-with-docs` for human decisions.
3. Record the answer in exactly one authoritative place.
4. Update the wayfinder map with a one-line decision gist and link.
5. Graduate newly visible questions from “Not yet specified” only when they become precise.

Completion criterion: no unresolved ticket blocks domain synthesis, and remaining unknowns are
explicitly accepted or out of scope.

## 8. Run the synthesis gate

Before writing the integrated V2 model, confirm:

- the source manifest is reproducible or its missing snapshot is explicitly excluded;
- every row in the coverage matrix is sufficiently covered or consciously deferred;
- current business intent outranks implementation structure;
- organization, capability ownership, work, demand/commitment, allocation, dependency,
  investment classification, and scenario remain distinct;
- temporal relationships and cross-organizational examples are represented; and
- candidate invariants contain business truths rather than database or service constraints.

Completion criterion: the product owner explicitly approves beginning domain synthesis.

## 9. Use `to-spec` for the approved domain model

Adapt the output to a **domain acceptance specification**, not a software implementation spec.
Include:

- problem and desired business outcomes;
- canonical concepts and relationships;
- lifecycle, cardinality, and temporal decisions;
- accepted invariants;
- representative and adversarial examples;
- unresolved but accepted unknowns; and
- explicit exclusions from V2.

Completion criterion: the specification is reviewable without referring to database, API, or
UI design.

## 10. Use `to-tickets` only after approval

First create tickets for any remaining documentation or validation work. Application tickets
must wait for explicit approval to cross the implementation gate.

When implementation is approved later, use vertical slices with blocking edges and acceptance
criteria derived from the approved domain examples and invariants.

Completion criterion: every ticket is independently verifiable, correctly blocked, and does
not smuggle unresolved domain decisions into implementation.
