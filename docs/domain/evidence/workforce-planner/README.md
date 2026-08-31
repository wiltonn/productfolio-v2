# Domain Evidence — Workforce Planner Implementation Branch

Evidence extracted from a ProductFolio workforce-planner implementation snapshot, with
selected comparisons to the legacy allocation and scenario model. **Documentation only.**
No V2 architecture, migration, or persistence design is proposed here.

## Status and scope

- This is a **deep workforce-planning evidence package**, not a complete extraction of the
  original ProductFolio V1 domain.
- The directory retains the historical name `evidence/workforce-planner/`, but readers must not interpret
  that name as “all V1 evidence.” See [COVERAGE_MATRIX.md](COVERAGE_MATRIX.md).
- The extraction claims commit `3cd0dbd`, branch `feat/workforce-capacity-planning`.
  That snapshot cannot currently be resolved in the available local clone or connected GitHub
  repository. Citations are therefore **not yet independently reproducible**. See
  [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md).
- Preserve this package as archaeological evidence. Do not synthesize V2 from it alone.

## Evidence labels

- **OBSERVED** — directly demonstrated by code, schema, tests, UI, or a captured workflow.
- **SOURCE-ASSERTED INTENT** — a requirement, rationale, recommendation, or design opinion
  stated by a PRD, ADR, implementation plan, analysis document, or code comment. This proves
  that the source made the assertion; it does not prove business truth or runtime behaviour.
- **RUNTIME OBSERVATION** — observed in a development database, workbook, or running system.
  It must name the environment and capture method to be reproducible.
- **SYNTHETIC EXAMPLE** — constructed from observed rules but not found as a fixture or
  captured runtime case.
- **INFERRED** — a likely meaning derived from evidence.
- **UNKNOWN** — the available evidence does not settle the question.
- **OBSERVED BY ABSENCE** — a scoped search found no representation. The search scope and
  source snapshot must be recorded before treating the claim as reproducible.

## Files

| File | Contents |
|---|---|
| [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md) | Claimed source, verification status, and reproducibility gate |
| [COVERAGE_MATRIX.md](COVERAGE_MATRIX.md) | Coverage against the V2 domain north star and missing extraction packets |
| [WORKFORCE_DOMAIN_EVIDENCE.md](WORKFORCE_DOMAIN_EVIDENCE.md) | 20 concepts: term, location, meaning, purpose, relationships, rules, temporality, ambiguity, confidence |
| [WORKFORCE_USER_WORKFLOWS.md](WORKFORCE_USER_WORKFLOWS.md) | 12 workflows: actor, starting state, action, objects, rules, result, ambiguity |
| [ALLOCATION_SEMANTICS.md](ALLOCATION_SEMANTICS.md) | What an allocation currently means — all 13 questions from the brief |
| [ORGANIZATION_SEMANTICS.md](ORGANIZATION_SEMANTICS.md) | Org ownership, cardinality, temporality, permanence assumptions |
| [WORK_CLASSIFICATION_EVIDENCE.md](WORK_CLASSIFICATION_EVIDENCE.md) | Every classification axis, mapped to purposes A–F |
| [DOMAIN_INVARIANTS_CANDIDATES.md](DOMAIN_INVARIANTS_CANDIDATES.md) | Candidate business rules separated from policies and implementation constraints |
| [JAGGED_DOMAIN_AREAS.md](JAGGED_DOMAIN_AREAS.md) | 22 unsettled areas: evidence, competing concepts, open question |
| [DOMAIN_EXAMPLES.md](DOMAIN_EXAMPLES.md) | 40 concrete, synthetic, runtime, and absence-based cases |
| [TERMINOLOGY_INVENTORY.md](TERMINOLOGY_INVENTORY.md) | Terms, synonyms, collisions, and the target-vocabulary gap |
| [NEXT_STEPS_USING_MATTPOCOCK_SKILLS.md](NEXT_STEPS_USING_MATTPOCOCK_SKILLS.md) | Step-by-step evidence and domain-design workflow |

## Strongest descriptive finding

The target vocabulary — Product Portfolio, Product Workstream, Product Area, Product VP,
OEM Division, Sustain, and New Development — is not represented as first-class vocabulary in
the surveyed implementation. The implementation instead uses one typed `OrgNode` tree and
workforce-specific allocation concepts. Whether those structures correspond to current
business concepts remains **UNKNOWN** until current-domain evidence is collected.

## Use gate

This package is ready to inform further evidence collection. It is not ready to serve as the
sole basis for V2 synthesis until:

1. the source snapshot is recovered and citations are spot-checked;
2. the original-main V1 extraction is completed separately;
3. current Product, Engineering, Commercial, demand/commitment, capability, and dependency
   evidence is collected; and
4. the coverage matrix has no unacknowledged gaps.
