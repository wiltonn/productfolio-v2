# ProductFolio V2

ProductFolio V2 is a clean-slate redesign of the ProductFolio domain model and application architecture.

This repository exists to define the product from first principles before implementation begins.

## Current Phase

**Domain redesign only.**

Do not begin application implementation until the V2 domain model has been reviewed and accepted.

Current work should focus on:

- domain vocabulary;
- enterprise and organizational structure;
- workforce capacity;
- weekly allocations;
- work structure;
- commercial demand and Product commitment;
- product/capability ownership and dependencies;
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

ProductFolio is intended to become an organizational capacity and portfolio decision system.

It should model:

**Who owns capacity → who provides capacity → what business demand exists → what has been committed → what work consumes capacity → what capabilities that work depends on → what type of investment it represents → how allocation changes over time → what constraints and portfolio choices exist.**

It is not intended to become:

- an HRIS;
- a payroll system;
- a Jira replacement;
- a detailed task-management system;
- a timesheet system.

## Known Enterprise Context

ProductFolio must not assume OEM is the organizational root.

The current operating context contains multiple peer Commercial Divisions, a shared Product organization, and Engineering / Shared Technology capabilities.

Conceptually:

Enterprise

├── Commercial Divisions  
│   ├── OEM  
│   ├── Dealer Solutions  
│   ├── Europe  
│   └── Financial Services / FSAAS  
│
├── Product organization  
│   └── Product Portfolios (currently six)  
│       └── Product Workstreams  
│           └── Product Areas  
│               └── Teams  
│                   └── Employees  
│
└── Engineering / Shared Technology  
    └── Functions, shared services and teams to be validated from evidence

`Product organization` and `Engineering / Shared Technology` describe operating branches. They should not automatically become persisted domain entities.

Commercial Divisions may contain dedicated custom-software teams. Those teams can own their own capacity while depending on Product-owned features, shared services, platforms, or Engineering capabilities.

Organizational ownership, product/capability ownership, and work dependency are separate domain relationships and must not be collapsed into one hierarchy.

Product Areas, teams, leaders and employee assignments may change over time. Historical and future-effective relationships therefore matter.

## Quarterly Planning Context

Commercial Divisions express customer, market and business needs.

Product groups establish and negotiate priorities against finite Product capacity.

Commercial and Product groups generally need agreement on priorities before each organization can confidently plan resources for the quarter.

A key V2 domain question is therefore how to represent the progression from:

**Commercial need → request/demand → prioritization → agreement/commitment → quarterly workforce planning.**

The exact terminology and lifecycle are not yet settled.

## Investment Classification

All planned work/capacity must ultimately roll up into exactly one of:

- New Development
- Sustain & Maintenance
- Tech Debt

This is a required enterprise reporting dimension.

It is **not yet decided** whether the classification belongs directly to work, an allocation, a planning container, or is derived through another relationship. Preserve the business invariant without prematurely choosing its implementation owner.

## Repository Structure

`docs/domain/`

Contains the authoritative V2 domain-design artifacts.

Application code should not be added until the domain model reaches an agreed baseline.

## Guiding Principle

Prefer conceptual coherence over compatibility with ProductFolio V1.

Do not preserve a V1 concept merely because code already exists for it.

Do not use organizational hierarchy to represent work dependencies or capability consumption.