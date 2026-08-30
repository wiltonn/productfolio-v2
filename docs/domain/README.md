# ProductFolio V2 Domain Design

This directory contains the authoritative domain design for ProductFolio V2.

These documents describe the business domain independently of database, API and UI implementation.

## Documents

### DOMAIN_VOCABULARY.md

Canonical vocabulary.

Every important domain term should have one precise meaning.

Avoid synonyms for established concepts.

### DOMAIN_MODEL.md

The current integrated V2 domain model.

Describes concepts, relationships, cardinality, boundaries and important temporal behaviour.

Do not create this from a single evidence source. Domain synthesis should occur only after V1, workforce-planner and explicit business evidence have been collected independently.

### ORGANIZATION_MODEL.md

How organizational ownership and workforce structure are represented.

Includes investigation of:

- Commercial Divisions such as OEM, Dealer Solutions, Europe and Financial Services / FSAAS;
- Product organization;
- Product Portfolios;
- Product Workstreams;
- Product Areas;
- Commercial custom-software teams;
- Engineering / Shared Technology;
- Teams;
- Employees;
- changing organizational assignments;
- historical and future-effective relationships.

Organizational ownership must remain distinct from product/capability ownership and work dependency.

### WORK_MODEL.md

How work is represented independently from organizational structure.

Used to settle concepts such as:

- WorkPackage;
- Initiative;
- Project;
- WorkItem;
- planning targets;
- execution work;
- cross-organizational work.

Existing V1 terminology is evidence, not a required V2 hierarchy.

### WORKFORCE_CAPACITY_MODEL.md

Defines and investigates:

- employee capacity;
- weekly allocation;
- Workforce Plan;
- allocation targets;
- availability;
- planned versus committed capacity;
- future allocation planning;
- derived capability supply;
- quarterly workforce planning.

### DEMAND_COMMITMENT_MODEL.md

Investigates how market, customer and Commercial Division needs become Product priorities and delivery commitments.

Questions include:

- what constitutes a Commercial need or demand;
- how requests reach Product;
- how prioritization is represented;
- what distinguishes requested work from committed work;
- how commitments affect quarterly workforce planning;
- how changes to commitments create downstream planning risk.

Terminology such as `Need`, `Request`, `Demand`, `Priority` and `Commitment` is not yet settled.

### CAPABILITY_DEPENDENCY_MODEL.md

Investigates reusable Product, platform, service and Engineering capabilities and the dependencies on them.

Questions include:

- who owns a durable reusable capability;
- which teams provide or maintain it;
- which Commercial Divisions or Product areas consume it;
- how work depends on Product features or shared services;
- how dependencies create capacity constraints;
- how capability ownership differs from organizational ownership.

Do not assume `Capability`, `Product Area`, `Platform`, `Shared Service` or another term is the final abstraction until evidence is reviewed.

### DOMAIN_INVARIANTS.md

Business rules that must remain true regardless of implementation.

Examples:

- every unit of planned work/capacity must ultimately resolve to one top-level investment classification;
- workforce allocations cannot create employee capacity;
- scenarios must not silently mutate the authoritative baseline;
- organizational ownership must not be used as a substitute for work dependency;
- something Commercial wants is not automatically something Product has committed to deliver.

### DOMAIN_EXAMPLES.md

Concrete examples used to test the model.

Examples should include normal cases and difficult edge cases across:

- Commercial Divisions;
- Product;
- Engineering / Shared Technology;
- custom software;
- shared capabilities;
- quarterly planning;
- cross-organizational dependencies;
- New Development;
- Sustain & Maintenance;
- Tech Debt.

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

Do not choose concepts by majority vote between implementations. Two codebases may contain the same historical mistake.

---

# Evidence Before Synthesis

Preferred sequence:

Original ProductFolio V1  
→ independent domain extraction

Newer Workforce Planner  
→ independent workforce/domain evidence extraction

Explicit current business knowledge  
→ current domain facts and corrections

Then:

All evidence  
→ domain synthesis  
→ V2 domain model

Do not allow the first repository inspected to anchor interpretation of subsequent evidence.

---

# Current Domain North Star

ProductFolio should model:

**Who owns capacity → who provides capacity → what business demand exists → what has been committed → what work consumes capacity → what capabilities that work depends on → what type of investment it represents → how allocation changes over time → what constraints and portfolio choices exist.**