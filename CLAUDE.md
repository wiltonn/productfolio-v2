# ProductFolio V2 — Claude Instructions

## Primary Instruction

ProductFolio V2 is currently in a DOMAIN REDESIGN phase.

Do not write application code unless explicitly instructed to begin implementation.

Do not scaffold frameworks.

Do not create Prisma models.

Do not create database migrations.

Do not create API routes.

Do not create React components.

Do not prematurely translate domain concepts into persistence structures.

Domain semantics come first.

---

## Evidence Hierarchy

When evidence conflicts, use this authority order:

1. Explicit current business/domain statements from the product owner.
2. Repeated real workflows and requirements evidenced by the newer workforce planner.
3. Valuable proven concepts from the original ProductFolio implementation.
4. Existing schema names, class names and implementation structure.

Existing implementation does not override explicit domain intent.

Do not choose concepts by majority vote between old implementations.

Two implementations may contain the same historical mistake.

---

## V1 Is Evidence, Not Authority

The original ProductFolio repository should be treated as archaeological evidence.

Extract:

- useful concepts;
- algorithms;
- behaviours;
- business rules;
- edge cases;
- forecasting approaches;
- constraint logic;
- planning ideas.

Do NOT assume its:

- domain boundaries;
- terminology;
- schema;
- hierarchy;
- service structure;
- Legacy/Token split

should survive into V2.

---

## Workforce Planner Is Also Evidence

The newer workforce-planner implementation contains valuable recent product thinking.

However, it is known to contain overlapping and jagged domain concepts.

Use it to discover:

- intended workflows;
- manager needs;
- weekly allocation semantics;
- organizational relationships;
- edge cases;
- implicit business rules.

Do not preserve its architecture automatically.

---

## Core Current Business Facts

The current scope includes the OEM Division.

OEM contains distinct Product and Engineering structures.

Product currently has six Product Portfolios.

A Product Portfolio has a Product VP.

Product Workstream Leaders are responsible for Product Areas.

Product Areas may change ownership.

Teams within Product Areas are relatively stable but can move.

Employees can move between teams.

Organizational relationships therefore have temporal behaviour and may require historical and future-effective representation.

Engineering capacity exists outside Product Portfolios.

Do not create fake Product structures to represent Engineering.

All work must ultimately classify as exactly one of:

- New Development
- Sustain & Maintenance
- Tech Debt

---

## Critical Domain Separation

Do not collapse these dimensions into one hierarchy.

### Organization

Who owns or provides capacity?

Examples:

Division  
Product Portfolio  
Product Workstream  
Product Area  
Engineering structure  
Team  
Employee

### Work

What is being accomplished?

Potential concepts may include:

WorkPackage  
Project  
Initiative  
WorkItem

Their final definitions are not yet settled.

### Allocation

How employee capacity is distributed over time.

### Investment classification

Why/type of investment:

New Development  
Sustain & Maintenance  
Tech Debt

### Scenario

A hypothetical change to an authoritative baseline.

These dimensions may relate to each other but are not the same hierarchy.

---

## Current Working Concepts

These are hypotheses, not immutable implementation requirements.

### Workforce Plan

The authoritative intended workforce allocation baseline.

### Weekly Allocation

Percentage of employee capacity assigned to a planning target for a week.

The week is currently the preferred atomic planning period.

### Scenario

A hypothetical deviation from the Workforce Plan.

### Team

A relatively stable capacity unit.

### Employee

Individual workforce capacity whose availability and organizational assignment may change over time.

### Capability / Skill

A representation of the type of organizational capacity an employee/team can provide.

### WorkPackage

A candidate abstraction representing a meaningful body of work against which capacity can be planned.

This concept must be validated before implementation.

### WorkItem

Potential execution-level demand beneath the capacity-planning level.

Managers should not generally be required to allocate workforce capacity at ticket-level precision.

---

## Domain Design Rules

Before accepting a concept, ask:

1. Does it represent a real business distinction?
2. Does the distinction cause different behaviour?
3. Does it have a clear lifecycle?
4. Does it have a clear owner?
5. Can a user explain it without referring to the database?
6. Does another concept already represent the same thing?
7. Is it being created only to preserve V1 compatibility?

Avoid concepts distinguished only by terminology.

Avoid nullable-field combinations that hide unresolved domain distinctions.

Avoid implicit behaviour where important authority/state can be explicit.

Avoid forced organizational hierarchies.

Avoid false precision.

---

## Domain Documentation

Authoritative design documents belong under:

`docs/domain/`

When an important domain decision is made:

1. update the relevant domain document;
2. update terminology if necessary;
3. update open decisions;
4. record rejected alternatives where useful.

Do not allow important domain decisions to exist only in chat history.

---

## Required Design Behaviour

When analyzing an unresolved domain issue:

- identify the actual business question;
- distinguish observed evidence from inference;
- identify competing interpretations;
- explain consequences;
- recommend the smallest coherent model;
- ask for product-owner input only when the decision is genuinely consequential.

Use explicit labels where useful:

**OBSERVED** — directly supported by evidence.

**INFERRED** — interpretation of evidence.

**UNKNOWN** — repository/business information does not currently answer it.

---

## Preserve Useful V1 Intellectual Property

A clean domain redesign does not mean discarding useful work.

Potential candidates for later selective salvage include:

- forecasting algorithms;
- Monte Carlo approaches;
- constraint detection;
- binding-constraint analysis;
- planning calculations;
- import logic;
- useful UI interaction patterns;
- scenario evaluation concepts;
- skill/capacity reasoning.

Do not port them until their V2 domain meaning is clear.

---

## Implementation Gate

Do not begin implementation until the product owner explicitly approves moving beyond domain design.

Before implementation begins, V2 should have an agreed:

- vocabulary;
- organizational model;
- work model;
- allocation model;
- investment classification;
- workforce-plan semantics;
- scenario semantics;
- capability/capacity model;
- key invariants;
- representative domain examples.

When implementation eventually begins, derive software architecture from the accepted domain rather than fitting the domain into a preferred framework.