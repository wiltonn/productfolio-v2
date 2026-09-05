# Source Manifest

## Verification status

**BLOCKED — source snapshot unavailable.**

The evidence remains useful as an extraction artifact, but its code and line citations cannot
currently be independently reproduced.

## Claimed extraction source

| Field | Value |
|---|---|
| Repository | `wiltonn/productfolio` |
| Claimed branch | `feat/workforce-capacity-planning` |
| Claimed commit | `3cd0dbd` (short SHA only) |
| Evidence location | `productfolio-v2/docs/domain/evidence/workforce-planner/` |
| Evidence focus | Newer workforce planner, with selected legacy-model contrasts |
| Extraction date | Not recorded in the original package |
| Working-tree state | Not recorded in the original package |

## Verification performed on 2026-08-30

- The available local ProductFolio clone is on `main` at
  `e62c2d761f021c0063f029c3a3f96900374cf807`.
- The local clone cannot resolve `3cd0dbd` as a Git object.
- The connected GitHub repository does not expose the claimed feature branch.
- The evidence directory is currently untracked in the V2 working tree.
- Current `main` does not contain the workforce-planner schema and service files named by this
  package, so its line references cannot be checked against `main`.

These facts do not disprove the extracted findings. They make the findings non-reproducible
until the surveyed tree is recovered.

## Recovery actions

Complete these before promoting any claim from archaeological evidence to synthesis input:

1. Search the original development machine, alternate clones, worktrees, reflogs, patches,
   bundles, and unpushed branches for the full commit containing `3cd0dbd`.
2. If the exact Git object cannot be recovered, locate the source tree used for extraction and
   commit it on a preservation branch without modifying its contents.
3. Record the full 40-character SHA, repository URL, branch, extraction date, and whether the
   source tree was dirty.
4. Replace bare basenames with repository-relative paths and stable commit links.
5. Re-run all zero-occurrence searches against the pinned tree and record the exact commands
   and searched roots.
6. Spot-check at least one claim from every evidence file, plus every HIGH-confidence claim
   used later in V2 synthesis.
7. Preserve runtime-only evidence as a test, fixture, query result, or redacted capture.

## Citation requirements after recovery

Every material claim should name:

- evidence type;
- repository and full commit;
- repository-relative file path;
- exact line range, named test, query, or workflow capture;
- confidence and known counter-evidence; and
- whether the statement describes behaviour, source-authored intent, or a recommendation.

## Runtime and external-data observations

Claims involving a “real dev database,” a 2,326-row workbook, row counts, or live Postgres
checks are **RUNTIME OBSERVATIONS**. They remain non-reproducible unless a safe, redacted
artifact or executable characterization test is preserved. Do not commit sensitive employee
data to satisfy this requirement.

