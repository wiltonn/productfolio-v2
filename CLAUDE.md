# ProductFolio V2 — Claude Instructions

## Primary Instruction

ProductFolio V2 is currently in a **DOMAIN REDESIGN** phase.

Do not write application code unless explicitly instructed to begin implementation.

Do not scaffold frameworks.

Do not create Prisma models.

Do not create database migrations.

Do not create API routes.

Do not create React components.

Do not prematurely translate domain concepts into persistence structures.

Domain semantics come first.

The objective is to derive the smallest coherent domain model that accurately represents how the organization plans capacity, prioritizes work, coordinates dependencies, and makes portfolio decisions.

---

# 1. Evidence Hierarchy

When evidence conflicts, use this authority order:

1. **Explicit current business/domain statements from the product owner**
2. **Repeated real workflows and operational requirements evidenced by the newer workforce-planner implementation**
3. **Valuable proven concepts from the original ProductFolio implementation**
4. **Existing schema names, class names, terminology and implementation structure**

Existing implementation does not override explicit current domain intent.

Do not choose concepts by majority vote between old implementations.

Two implementations may contain the same historical mistake.

Existing code is evidence, not authority.

---

# 2. V1 Is Archaeological Evidence

The original ProductFolio repository should be treated as archaeological evidence.

Extract:

- useful domain concepts;
- algorithms;
- behaviours;
- business rules;
- edge cases;
- forecasting approaches;
- constraint logic;
- planning calculations;
- scenario concepts;
- useful UX patterns;
- capability and skill concepts.

Do NOT assume its:

- domain boundaries;
- terminology;
- schema;
- hierarchy;
- service structure;
- Product / Initiative / Project relationships;
- Scenario model;
- Legacy / Token split

should survive into V2.

A concept should survive because it accurately represents the current domain, not because implementation already exists for it.

---

# 3. Newer Workforce Planner Is Also Evidence

The newer workforce-planner implementation contains more recent product thinking and operational requirements.

It is also known to contain overlapping and jagged domain concepts.

Use it to discover:

- manager workflows;
- weekly allocation semantics;
- employee-capacity rules;
- organizational relationships;
- Product structures;
- Engineering structures;
- Project and Sustain work;
- future-quarter planning;
- edge cases;
- hidden business rules;
- assumptions embedded in UI;
- concepts that became difficult to implement because the underlying domain distinction was unclear.

Do not preserve its architecture automatically.

Complex implementation is often evidence of an unresolved domain question.

---

# 4. Enterprise Context

ProductFolio must no longer assume that OEM is the root organizational entity.

There are multiple **Commercial Divisions**, including currently:

- OEM
- Dealer Solutions
- Europe
- Financial Services / FSAAS

These divisions are peers.

Commercial Divisions primarily manage:

- go-to-market activity;
- customer and market needs;
- commercial commitments;
- some dedicated/custom software delivery.

Product is a shared organization that supports multiple Commercial Divisions.

Shared Engineering / Technology capabilities may also support Product and Commercial software teams.

Conceptually:

Enterprise

├── Commercial Divisions  
│   ├── OEM  
│   ├── Dealer Solutions  
│   ├── Europe  
│   └── Financial Services / FSAAS  
│
├── Product Organization  
│
└── Engineering / Shared Technology

This is a conceptual operating structure, not yet a persistence model.

Do not automatically create generic database entities corresponding to every label shown here.

---

# 5. Commercial Divisions

A Commercial Division represents a durable business/commercial organizational boundary.

Commercial Divisions may contain:

- sales / go-to-market functions;
- commercial operations;
- custom software teams;
- customer-specific delivery functions;
- other dedicated capacity.

Some Commercial Divisions have dedicated software teams.

Those teams may independently deliver custom software while depending on:

- Product-owned features;
- common services;
- shared platforms;
- shared Engineering capabilities.

Do NOT force Commercial software teams into the Product Portfolio hierarchy.

Organizational ownership and delivery dependency are separate concepts.

---

# 6. Product Organization

Product currently contains six Product Portfolios.

Each Product Portfolio has a Product VP.

Conceptually:

Product Organization  
→ Product Portfolio  
→ Product Workstream  
→ Product Area  
→ Team  
→ Employee

### Product Portfolio

A durable executive Product portfolio boundary.

There are currently six.

A Product VP is responsible for a Product Portfolio.

### Product Workstream

An organizational grouping within a Product Portfolio.

A Product Workstream Leader is responsible for one or more Product Areas.

The term **Product Workstream** refers to organizational Product structure.

Do not reuse "workstream" casually as a generic synonym for work.

### Product Area

A durable Product responsibility / ownership area.

Product Areas can change ownership over time.

A Product Area may move between Product Workstreams.

### Team

Teams are relatively stable workforce/capacity units.

However:

- teams may move between Product Areas;
- team structure may change;
- employees may move between teams;
- team ownership may change over time.

Organizational relationships therefore have temporal behaviour.

Historical and future-effective assignments may be important.

Do not assume organizational relationships are permanent.

---

# 7. Engineering and Shared Technology

Engineering capacity exists outside the Product Portfolio structure.

Engineering work is often more directly:

- Project-oriented;
- Sustain-oriented;
- Maintenance-oriented;
- Tech-Debt-oriented.

Do NOT create fake Product Portfolios, Product Workstreams, or Product Areas to represent Engineering.

Investigate the actual Engineering organization from evidence.

Possible structures may include:

Engineering  
→ Engineering Group / Function  
→ Team  
→ Employee

but do not assume the intermediate hierarchy until it is validated.

Some Engineering or Shared Technology teams may own reusable common services or platforms used by:

- Product teams;
- Commercial custom-software teams;
- multiple Commercial Divisions.

Organizational ownership of a common service must remain distinct from the teams or divisions that consume it.

---

# 8. Three Relationships Must Remain Distinct

This is a critical V2 domain rule.

Do not collapse the following into one hierarchy.

## 8.1 Organizational Ownership

Who owns the people and capacity?

Examples:

- Commercial Division
- Product Portfolio
- Product Workstream
- Product Area
- Engineering Function
- Team
- Employee

## 8.2 Product / Capability Ownership

Who owns a durable reusable product, platform, service or capability?

Examples:

- shared API;
- data product;
- platform;
- common service;
- reusable Product capability.

A Commercial Division may depend on a Product-owned capability without organizationally belonging to Product.

## 8.3 Work Dependency

What work depends on other work or capability?

Example:

OEM Custom Software Work  
→ depends on Product feature  
→ which depends on Shared Platform enhancement

This dependency is not an organizational parent/child relationship.

Organizational ownership, capability ownership, and work dependency must be modeled separately.

---

# 9. Commercial and Product Quarterly Planning

A major business workflow is cross-organizational quarterly planning.

Commercial Divisions express market/customer/business needs.

Product groups establish and negotiate priorities against finite Product capacity.

Commercial and Product groups generally need agreement on priorities before each organization can confidently plan quarterly resources.

Conceptually:

Commercial Need  
→ Product Request / Demand  
→ Prioritization  
→ Agreement / Commitment  
→ Quarterly workforce planning

This interaction may become a central ProductFolio domain capability.

Do not prematurely settle terminology such as:

- Request
- Demand
- Commitment
- Priority
- Need

Analyze the actual business semantics first.

However, explicitly preserve the distinction between:

**something Commercial wants**

and

**something Product has committed to deliver**.

That distinction may drive real planning behaviour.

---

# 10. Critical Domain Separation

Do not represent ProductFolio as a single hierarchy such as:

Division  
→ Product  
→ Initiative  
→ Project  
→ WorkItem  
→ Employee

That model does not represent reality.

ProductFolio has several intersecting dimensions.

## Organization

Who owns and provides capacity?

## Product / Capability

Who owns durable reusable capability?

## Work

What are we trying to accomplish?

## Demand / Commitment

What has one organizational group requested, prioritized or committed to?

## Allocation

How is employee capacity distributed over time?

## Investment Classification

What broad type of investment does the capacity represent?

## Dependency

What work/capability relies on other work/capability?

## Scenario

What hypothetical change to the current plan are we evaluating?

These dimensions relate but are not one hierarchy.

---

# 11. Mandatory Investment Classification

All planned work/capacity must ultimately roll up to exactly one of three top-level investment classifications:

- **NEW DEVELOPMENT**
- **SUSTAIN & MAINTENANCE**
- **TECH DEBT**

This is a business reporting requirement.

The system must ultimately support questions such as:

- What percentage of Enterprise capacity is New Development?
- What percentage is Sustain & Maintenance?
- What percentage is Tech Debt?
- How does this vary by Commercial Division?
- How does this vary by Product Portfolio?
- How does this vary by Product Area?
- How does this vary by Engineering?
- How does the mix change quarter over quarter?

Do not encode these as fake Initiatives or Projects.

Important unresolved question:

It is NOT yet decided whether this classification belongs directly to:

- Work;
- WorkPackage;
- Allocation;
- planning target;
- or is derived through another relationship.

Do not assume a database location yet.

Preserve the business invariant while investigating the correct semantic owner.

---

# 12. Work Model Is Not Yet Settled

Do not assume the existing distinction between:

- Product;
- Initiative;
- Project;
- ScopeItem;
- WorkItem

should survive unchanged.

Challenge each one.

A concept should exist only if it represents a meaningful business distinction that causes different behaviour.

In particular, investigate whether **Initiative** and **Project** require separate first-class domain concepts.

Consider whether a broader concept such as:

### WorkPackage

could represent:

> A meaningful body of work against which capacity is planned.

Examples might include:

- customer capability launch;
- product enhancement;
- cloud migration;
- regulatory change;
- modernization effort;
- major technical-debt effort;
- custom software delivery;
- shared platform enhancement.

However:

**WorkPackage is currently a hypothesis, not an approved V2 entity.**

Validate it against actual workflows before accepting it.

---

# 13. WorkItem

WorkItem may represent execution-level demand beneath the capacity-planning level.

Potential examples:

- Jira Epic;
- Jira Story;
- feature;
- engineering task;
- defect;
- implementation item.

Managers should not generally be required to plan workforce capacity at individual ticket-level precision.

A possible distinction is:

WorkPackage = capacity-planning unit

WorkItem = execution unit

This must be validated rather than assumed.

---

# 14. Cross-Organizational Work

A single meaningful body of work may require capacity from multiple organizational structures.

Example:

OEM customer capability

may require:

- OEM custom-software team work;
- Product feature development;
- Shared Platform changes;
- Engineering support.

The work therefore cannot be owned structurally by only one hierarchy if that prevents multiple contributing teams from being represented.

Model:

**business/work ownership**

separately from:

**capacity contribution**.

A team contributing capacity to work does not necessarily become organizationally owned by that work sponsor.

---

# 15. Common Services and Shared Capabilities

Some reusable services or capabilities are used by both Product and Commercial software teams.

Examples may include:

- authentication;
- data services;
- APIs;
- integration platforms;
- shared infrastructure;
- common frameworks.

Do not duplicate these capabilities under every consumer.

The model should eventually be able to represent:

- who owns/provides the capability;
- which teams provide its capacity;
- which products/work depend on it;
- which Commercial Divisions consume it;
- what planned work changes it.

Do not yet decide whether the correct abstraction is:

- Product Area;
- Capability;
- Shared Service;
- Platform;
- Product;
- another concept.

Investigate and recommend the smallest coherent vocabulary.

---

# 16. Workforce Capacity

Employee represents an individual source of workforce capacity.

Employee capacity varies over time.

Weekly granularity is currently the preferred atomic planning period.

Managers need to see and manage percentage allocation by employee by week.

Conceptually:

Employee  
→ Weekly Allocation  
→ Planning Target  
→ Percentage  
→ Week

Example:

Sarah — week of Oct 5

- Customer Capability Work — 50%
- Sustain — 20%
- Tech Debt — 20%
- Remaining / Other — 10%

Do not assume that unallocated capacity automatically means deployable capacity.

Employee nominal capacity and deployable capacity may differ.

---

# 17. Weekly Allocation

WeeklyAllocation represents how employee capacity is intentionally distributed over time.

The system should support manager planning across upcoming weeks and quarters.

Managers need to:

- see employees across weeks;
- see percentage allocations;
- identify over-allocation;
- identify under-allocation;
- change future allocation;
- move capacity between work;
- understand capacity impact immediately.

Do not assume allocations must point to individual WorkItems.

Determine the smallest useful set of allocation targets from the real planning workflows.

Potential targets may include:

- Product Area;
- work/planning package;
- Project;
- Sustain;
- another durable planning bucket.

Avoid generic polymorphism unless the domain genuinely requires it.

---

# 18. Workforce Plan

WorkforcePlan currently represents:

> The authoritative intended workforce allocation baseline.

It answers:

> What do we currently expect people to work on?

Managers should be able to update future workforce planning without creating a Scenario.

Workforce planning and scenario analysis are distinct concepts.

---

# 19. Scenario

Scenario currently represents:

> A hypothetical deviation from the authoritative baseline.

Conceptually:

Workforce Plan  
→ Scenario A  
→ Scenario B  
→ Scenario C

A Scenario should not be the place where normal workforce planning begins.

Scenario evaluation may alter:

- workforce allocation;
- work priority;
- sequencing;
- capacity;
- demand assumptions;
- capability availability.

Do not silently mutate the baseline when evaluating a Scenario.

---

# 20. Capability / Skill

Employees and teams may provide capabilities or skills.

Work may require capabilities or skills.

The model should eventually support determining:

- what capability exists;
- how much exists;
- how much is committed;
- how much is available;
- what work requires it;
- where constraints exist;
- which shared capabilities constrain multiple organizations.

Do not yet determine whether:

- Skill;
- Capability;
- Job Profile;
- Role;
- Discipline;
- or some combination

is the correct abstraction.

Analyze evidence first.

---

# 21. Token Model

Do NOT assume the current Token implementation should survive.

Determine what intellectual value it provides.

Potentially useful concepts include:

- normalization of heterogeneous capacity;
- capability supply;
- capability demand;
- calibration;
- token ledger;
- binding constraints;
- bottleneck detection;
- portfolio optimization;
- constraint analysis.

Prefer a conceptual flow such as:

Employees  
→ Workforce Allocations  
→ Available Capability  
→ Capacity Supply  
→ Work Demand  
→ Constraint Analysis

over manually invented independent Token supply where possible.

Determine whether "Token" remains useful business/domain terminology in V2.

Preserve valuable mathematics or algorithms even if Token terminology is retired.

---

# 22. Demand

Demand should represent capacity/capability required to accomplish work.

Investigate how demand relates to:

- Commercial needs;
- Product commitments;
- WorkPackage;
- Project;
- WorkItem;
- scope;
- effort;
- skills;
- capability;
- TokenDemand;
- forecasts.

Demand and capacity supply must eventually be comparable.

Do not implement formulas during domain design.

Settle semantics first.

---

# 23. Forecasting

Review the existing forecasting and Monte Carlo concepts independently from their current implementation.

Potential useful questions include:

- When is work likely to finish?
- What is the P50 / P80 delivery date?
- What capability is constraining delivery?
- How does reallocation affect delivery?
- What dependencies threaten delivery?
- What portfolio choice changes risk?
- What commercial commitment becomes at risk if Product priority changes?

Preserve valuable statistical concepts without forcing the V1 domain model around them.

---

# 24. Current Working Concepts

These concepts are hypotheses or likely durable concepts.

They are not immutable implementation requirements.

### Commercial Division

A durable commercial/business organizational boundary.

### Product Portfolio

A durable executive Product portfolio boundary.

### Product Workstream

A Product organizational grouping.

### Product Area

A durable Product responsibility / ownership area.

### Team

A relatively stable workforce/capacity unit.

### Employee

Individual workforce capacity.

### Workforce Plan

Authoritative intended workforce allocation baseline.

### Weekly Allocation

Percentage of employee capacity assigned to a planning target for a week.

### Scenario

Hypothetical deviation from the baseline.

### Capability / Skill

Type of organizational capacity.

### WorkPackage

Candidate capacity-planning abstraction that must be validated.

### WorkItem

Candidate execution-level work abstraction.

### Commercial Demand / Commitment

A likely important distinction describing how commercial needs become Product delivery commitments.

Exact terminology and lifecycle are not yet settled.

---

# 25. Domain Design Rules

Before accepting any domain concept, ask:

1. Does it represent a real business distinction?
2. Does that distinction cause different behaviour?
3. Does it have a clear lifecycle?
4. Does it have a clear owner?
5. Can a business user explain it without referring to software/database terminology?
6. Does another concept already represent the same thing?
7. Is the concept merely preserving V1 compatibility?
8. Is this actually an organizational relationship, capability relationship, work relationship, allocation relationship or dependency relationship?
9. Does the concept need temporal behaviour?
10. Would removing the concept make the domain meaningfully less expressive?

Avoid:

- concepts distinguished only by terminology;
- fake hierarchy;
- generic abstractions introduced only to make persistence easier;
- nullable-field combinations that hide unresolved distinctions;
- important state inferred from accidental record existence;
- duplicated representations of capacity;
- false WorkItem-level planning precision;
- implicit permanent organizational relationships;
- using organizational ownership to represent work dependency.

---

# 26. Temporal Relationships

Organizational reality changes.

Potential examples:

- Product Area moves between Product Workstreams;
- Product Workstream leadership changes;
- Team moves between Product Areas;
- Employee moves between Teams;
- Commercial software team changes ownership;
- capability ownership changes;
- employee capacity changes;
- workforce allocation changes;
- quarterly plan becomes current.

Do not assume today's relationship should overwrite historical truth.

During domain design, explicitly identify relationships that need:

- historical validity;
- effective dates;
- future-effective planning.

Do not design tables yet.

Define temporal semantics first.

---

# 27. Domain Documentation

Authoritative design documents belong under:

`docs/domain/`

Important decisions must not exist only in Claude conversation history.

When a consequential domain decision is made:

1. update the relevant domain document;
2. update canonical vocabulary;
3. update open decisions;
4. record rejected alternatives where useful;
5. update domain examples if the decision affects them.

---

# 28. Evidence Labels

When analyzing repository-derived evidence, explicitly distinguish:

### OBSERVED

Directly demonstrated by:

- code;
- tests;
- UI;
- data model;
- documentation;
- actual workflow.

### INFERRED

Likely domain intent derived from observed evidence.

### UNKNOWN

Important question not answered by available evidence.

Do not convert inference into fact without justification.

---

# 29. Domain Extraction Before Synthesis

Do NOT immediately create the V2 domain model after inspecting one repository.

Evidence should first be extracted independently from:

1. Original ProductFolio
2. Newer Workforce Planner
3. Explicit business/domain knowledge

Only after evidence collection should synthesis begin.

Preferred sequence:

Original V1  
→ V1 domain extraction

New Workforce Planner  
→ Workforce domain evidence

Explicit business knowledge  
→ Current domain facts

Then:

All evidence  
→ Domain synthesis  
→ V2 model

Do not allow the first repository inspected to anchor interpretation of subsequent evidence.

---

# 30. Preserve Useful Intellectual Property

A clean redesign does not mean discarding useful work.

Potential later salvage candidates include:

- forecasting algorithms;
- Monte Carlo logic;
- constraint detection;
- binding-constraint analysis;
- scenario comparison;
- planning calculations;
- import logic;
- useful manager-planning UX;
- skill/capacity reasoning;
- portfolio optimization concepts.

Do not port these until their meaning in the V2 domain is clear.

---

# 31. Implementation Gate

Do not begin application implementation until the product owner explicitly approves moving beyond domain design.

Before implementation, V2 should have an agreed:

- enterprise organizational model;
- Commercial Division model;
- Product organizational model;
- Engineering / Shared Technology model;
- team and employee model;
- product/capability ownership model;
- work model;
- demand/commitment model;
- allocation model;
- investment classification;
- Workforce Plan semantics;
- Scenario semantics;
- dependency model;
- capability/capacity model;
- key temporal relationships;
- domain vocabulary;
- domain invariants;
- representative domain examples.

Only after these are sufficiently coherent should software architecture be derived.

---

# 32. Guiding Domain Questions

The proposed V2 model should eventually make it possible to answer:

## Enterprise

- Where is workforce capacity organizationally owned?
- How is capacity distributed across Commercial, Product and Engineering organizations?
- What percentage of capacity is New Development, Sustain & Maintenance, or Tech Debt?

## Commercial

- What work does each Commercial Division need?
- Which needs depend on Product?
- Which needs are handled by dedicated Commercial software teams?
- What has Product actually committed to?
- Which quarterly commercial plans depend on Product commitments?

## Product

- What priorities are committed for the quarter?
- Which Commercial Divisions depend on those priorities?
- Which Product Portfolios, Workstreams and Product Areas are contributing?
- How much capacity is being spent on New Development, Sustain and Tech Debt?

## Engineering / Shared Technology

- Which common services are constrained?
- Which Commercial and Product work depends on those services?
- What Engineering capacity is project work versus Sustain versus Tech Debt?

## Workforce

- What is each employee expected to work on each week?
- Who is overallocated?
- Where is deployable capacity available?
- How will allocation change next quarter?

## Work

- What meaningful work is underway?
- Who requested it?
- Who owns it?
- Who contributes capacity?
- What does it depend on?
- What investment classification does it represent?

## Portfolio

- What work competes for the same capacity?
- What commitments are at risk?
- What Product priorities constrain Commercial planning?
- What shared capability is the binding constraint?
- What should change to improve the portfolio outcome?

---

# 33. Domain North Star

ProductFolio V2 should model:

**Who owns capacity  
→ who provides capacity  
→ what business demand exists  
→ what has been committed  
→ what work consumes capacity  
→ what capabilities that work depends on  
→ what type of investment it represents  
→ how allocation changes over time  
→ what dependencies and constraints exist  
→ what portfolio choices are possible.**

The system should model organizational reality first.

Software architecture comes afterward.