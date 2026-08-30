# Capability & Dependency Model

## Status

**Domain investigation — not settled.**

This document exists to investigate durable reusable capabilities, their ownership, and the work or organizations that depend on them.

Do not translate this document directly into database entities until the domain semantics are agreed.

## Business Context

Commercial custom-software teams, Product teams and Engineering / Shared Technology teams may depend on common reusable capabilities.

Examples may include:

- shared APIs;
- data products;
- authentication;
- integration services;
- platform components;
- shared infrastructure;
- common frameworks.

A capability may be organizationally owned by one area while being consumed by many others.

Therefore:

**organizational ownership ≠ capability ownership ≠ work dependency.**

These relationships must remain distinct.

## Questions to Investigate

1. What makes something a durable reusable capability rather than simply a Product Area or WorkPackage?
2. Who owns a capability?
3. Can capability ownership move over time?
4. Is the owner an organizational unit, a team, or both?
5. Can multiple teams jointly provide one capability?
6. Can a Product Area own multiple capabilities?
7. Can a Commercial Division directly own a reusable capability?
8. How should custom-software teams depend on Product-owned features or shared services?
9. How should one body of work depend on another body of work?
10. How should work depend directly on an existing capability?
11. Is a dependency simply present/absent, or does it need timing, criticality, confidence or required-by dates?
12. How are shared capabilities connected to skill/capacity supply?
13. How do capability constraints become portfolio constraints?
14. How should changes to capability ownership or availability affect historical and future planning?
15. Are `Product`, `Product Area`, `Platform`, `Shared Service` and `Capability` distinct concepts or overlapping terminology?

## Important Distinctions

### Organizational ownership

Who owns the people/capacity that provides or maintains something?

### Capability ownership

Who is accountable for the durable reusable capability?

### Consumption

Which organizational groups, Products or work use the capability?

### Work dependency

What planned work cannot proceed, finish, or deliver value without another capability or body of work?

### Capacity contribution

Which teams or employees are currently spending capacity to create, sustain, maintain or reduce technical debt in the capability?

Do not collapse these into one parent-child hierarchy.

## Evidence to Collect

During V1 and workforce-planner extraction, look for:

- Product or Product Area ownership fields;
- shared service concepts;
- platforms;
- dependencies between initiatives/projects/scope items;
- teams that support multiple organizational areas;
- cross-Product dependencies;
- Engineering dependencies;
- skill pools;
- binding constraints;
- capacity bottlenecks;
- Product features used by custom-software teams;
- UI relationships that imply provider/consumer semantics;
- comments or tests that reveal hidden dependency rules.

Use **OBSERVED**, **INFERRED** and **UNKNOWN** when recording evidence.

## Domain Tests / Example Questions

A future model should be able to represent questions such as:

- OEM custom software depends on an authentication feature owned by Product. Who owns the capacity and who owns the capability?
- Europe and Dealer Solutions both consume the same shared data service. How is that represented without duplicating the service?
- Product feature work depends on an Engineering platform enhancement. Which dependency is constraining delivery?
- A shared-service team is fully allocated to Sustain work. Which Product or Commercial commitments are put at risk?
- A capability changes organizational owner next quarter. How should historical ownership and future planning be represented?

## Open Decisions

No final domain entities are approved by this document.

Candidate terms to evaluate include:

- Capability
- Product
- Product Area
- Platform
- Shared Service
- Service
- Feature
- Dependency
- Consumption

Prefer the smallest vocabulary that preserves real distinctions in ownership, reuse, capacity and dependency behaviour.