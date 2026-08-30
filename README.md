# ProductFolio V2

ProductFolio V2 is a clean-slate redesign of the ProductFolio domain model and application architecture.

This repository exists to define the product from first principles before implementation begins.

## Current Phase

**Domain redesign only.**

Do not begin application implementation until the V2 domain model has been reviewed and accepted.

Current work should focus on:

- domain vocabulary;
- organizational structure;
- workforce capacity;
- weekly allocations;
- work structure;
- investment classification;
- scenarios;
- capability supply and demand;
- forecasting concepts;
- domain invariants;
- real-world examples;
- unresolved domain decisions.

## Evidence Sources

The V2 design is informed by three sources:

1. **Current business/domain knowledge**
   - highest authority;
   - represents the actual operating model and intended use case.

2. **Newer workforce-planner implementation**
   - evidence of recent workflows, requirements, edge cases and design tensions;
   - not assumed to have a correct domain architecture.

3. **Original ProductFolio implementation**
   - evidence of historical concepts, algorithms, forecasting, scenarios, token planning and useful implementation patterns;
   - not an architecture that V2 must preserve.

Existing code is evidence, not authority.

## Product Direction

ProductFolio should model:

**Who owns capacity → who provides capacity → what work consumes capacity → what kind of investment that work represents → how allocation changes over time → what portfolio choices are possible.**

ProductFolio is intended to become an organizational capacity and portfolio decision system.

It is not intended to become:

- an HRIS;
- a payroll system;
- a Jira replacement;
- a detailed task-management system;
- a timesheet system.

## Known Organizational Context

Current scope begins with the OEM Division.

OEM contains distinct Product and Engineering operating structures.

Product currently contains six Product Portfolios, each associated with a Product VP.

The Product organization conceptually includes:

OEM Division  
→ Product  
→ Product Portfolio  
→ Product Workstream  
→ Product Area  
→ Team  
→ Employee

Product Areas, teams, leaders and employee assignments may change over time.

Engineering capacity exists outside the Product Portfolio hierarchy and must not be forced into fake Product structures.

## Investment Classification

All planned work must ultimately roll up into exactly one of:

- New Development
- Sustain & Maintenance
- Tech Debt

The exact V2 terminology and implementation remain domain-design decisions.

## Repository Structure

`docs/domain/`

Contains the authoritative V2 domain-design artifacts.

Application code should not be added until the domain model reaches an agreed baseline.

## Guiding Principle

Prefer conceptual coherence over compatibility with ProductFolio V1.

Do not preserve a V1 concept merely because code already exists for it.