# ProductFolio V2 Domain Design

This directory contains the authoritative domain model for ProductFolio V2.

These documents describe the business domain independently of database, API and UI implementation.

## Documents

### DOMAIN_VOCABULARY.md

Canonical vocabulary.

Every important domain term should have one precise meaning.

Avoid synonyms for established concepts.

### DOMAIN_MODEL.md

The current integrated V2 domain model.

Describes concepts, relationships, cardinality, boundaries and important temporal behaviour.

### ORGANIZATION_MODEL.md

How organizational ownership and workforce structure are represented.

Includes:

- OEM Division;
- Product;
- Product Portfolios;
- Product Workstreams;
- Product Areas;
- Engineering;
- Teams;
- Employees;
- changing organizational assignments.

### WORK_MODEL.md

How work is represented independently from organizational structure.

Used to settle concepts such as:

- WorkPackage;
- Initiative;
- Project;
- WorkItem;
- planning targets;
- execution work.

### WORKFORCE_CAPACITY_MODEL.md

Defines:

- employee capacity;
- weekly allocation;
- Workforce Plan;
- allocation targets;
- availability;
- planned versus committed capacity;
- future allocation planning;
- derived capability supply.

### DOMAIN_INVARIANTS.md

Business rules that must remain true regardless of implementation.

Examples:

- every unit of planned work must ultimately resolve to one top-level investment classification;
- workforce allocations cannot create employee capacity;
- scenarios must not silently mutate the authoritative baseline.

### DOMAIN_EXAMPLES.md

Concrete examples used to test the model.

Examples should include normal cases and difficult edge cases across Product and Engineering.

A proposed domain model should be rejected or revised if it cannot represent these examples cleanly.

### OPEN_DECISIONS.md

Important unresolved domain decisions.

Each decision should contain:

- question;
- context;
- options;
- consequences;
- recommendation where appropriate;
- final decision once made.

### V1_DOMAIN_EXTRACTION.md

Domain concepts and useful behaviours extracted from the original ProductFolio implementation.

V1 is evidence, not authority.

### WORKFORCE_PLANNER_EVIDENCE.md

Domain evidence extracted from the newer workforce-planner implementation.

The implementation may contain inconsistent concepts.

Document observed behaviour separately from inferred intent.

### REJECTED_CONCEPTS.md

Important concepts or structures deliberately excluded from V2.

Record why they were rejected so they are not accidentally reintroduced later.

### evidence/workforce-planner/

Deep evidence from the workforce-planner implementation branch, including selected contrasts
with the original model. This is §29's second evidence stream.

Start with:

- `evidence/workforce-planner/README.md` for scope and evidence labels;
- `evidence/workforce-planner/SOURCE_MANIFEST.md` for reproducibility status;
- `evidence/workforce-planner/COVERAGE_MATRIX.md` for missing evidence streams; and
- `evidence/workforce-planner/NEXT_STEPS_USING_MATTPOCOCK_SKILLS.md` for the staged continuation plan.


### evidence/original-productfolio/

Targeted evidence from the original ProductFolio implementation — §29's first evidence stream.
Surveyed at `wiltonn/productfolio` `e62c2d7` (`main`) and `07368d6` (`v1/solver`), including the
`feat/L1`–`L4` solver branches. Unlike the workforce-planner package, these citations are
reproducible against source.

Extracted to answer specific decisions on the domain map rather than to mirror a full evidence
set: `work-model.md`, `organization.md`, `allocation-capacity.md`, `capability-token-solver.md`,
`demand-commitment.md`, `scenario-baseline-time.md`.

The two evidence directories are kept separate deliberately (§29). Do not merge them, and state
which stream any citation comes from.

---

# Evidence Labels

When documenting repository-derived findings, use:

**OBSERVED**

Directly demonstrated by code, tests, UI or documentation.

**INFERRED**

A likely domain meaning derived from observed behaviour.

**UNKNOWN**

A question that cannot currently be answered from available evidence.

---

# Domain Authority

When sources disagree:

1. Explicit current business intent.
2. Real workflows and operational requirements.
3. Proven behaviour from existing implementations.
4. Historical implementation structures and terminology.

The objective is not to reproduce either existing implementation.

The objective is to derive the smallest coherent model that accurately represents the business.

---

# Current Domain North Star

ProductFolio should model:

**Who owns capacity → who provides capacity → what work consumes capacity → what kind of investment that work represents → how allocation changes over time → what portfolio choices are possible.**
