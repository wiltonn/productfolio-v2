# Evidence Coverage Matrix

Coverage is measured against the V2 domain north star, not against the number of files in this
package.

| Domain area | Coverage | What this package provides | Missing evidence |
|---|---|---|---|
| Employee capacity and weekly allocation | **STRONG** | Arithmetic, targets, over/under-allocation, plans, overlays, workflows, edge cases | Reproducible source snapshot and current-business validation |
| Organizational representation in the implementation | **STRONG** | Manager, membership, matrix-link, OrgNode, cardinality and temporality conflicts | Actual Product, Engineering, Shared Technology, and Commercial structures |
| Work classification in the implementation | **STRONG** | WorkCategory, CapacityEffect, derived WorkClass, unsupported target vocabulary | Current three-way investment-classification semantics and ownership |
| Work structure | **PARTIAL** | Initiative, Project, WorkItem, ScopeItem, IntakeItem contrasts | Business-validated planning unit, execution unit, lifecycle, ownership, and cross-org work |
| Scenario and workforce-plan behaviour | **PARTIAL** | Baseline/overlay mechanics, source selection, reconciliation | Portfolio scenario comparison, decision criteria, and current workflow validation |
| Capability supply and demand | **PARTIAL** | Skill pools, token supply, limited demand derivation, incompatible skill-allocation conventions | Capability vocabulary, dependencies, demand semantics, calibration, constraint analysis |
| Commercial demand and Product commitment | **MISSING** | Only indirect initiative and intake references | Request/demand/priority/agreement/commitment lifecycle and quarterly negotiation workflow |
| Product/capability ownership | **MISSING** | OrgNode and allocation-target ambiguity only | Durable product, platform, shared-service, provider, owner, and consumer relationships |
| Work and capability dependency | **MISSING** | No first-class dependency evidence extracted | Dependency direction, lifecycle, criticality, and cross-organizational examples |
| Portfolio choice and governance | **WEAK** | Scenario rankings and append-only reconciliation | Decision rights, approvals, trade-offs, constraints, commitment risk, and comparison workflow |
| Forecasting and uncertainty | **WEAK** | Scope P50/P90 references and mentions of legacy forecasting | Monte Carlo inputs/outputs, confidence levels, ramp, drift, completion-risk workflows |
| Costs and financial classification | **MISSING** | CostBand is only mentioned as adjacent data | Cost, capitalisation, funding, budget, and investment decision semantics |
| Current business/domain knowledge | **MISSING** | Target vocabulary supplied by the redesign brief | Validated statements and examples from Product, Engineering, Commercial, and shared services |

## Required extraction packets

Keep these packets independent until evidence collection is complete:

1. **Original ProductFolio V1:** legacy allocation, scenarios, approvals, forecasting,
   constraints, tokens, intake, integrations, and portfolio decision behaviour.
2. **Newer workforce planner:** validate and make this package reproducible.
3. **Current Product organization:** portfolios, workstreams, areas, teams, leadership, and
   temporal changes.
4. **Current Engineering and Shared Technology:** organizational structure, common services,
   projects, Sustain, Tech Debt, and shared-capability ownership.
5. **Commercial demand and Product commitment:** quarterly request, negotiation, priority,
   agreement, commitment, and change workflows.
6. **Capability and dependency:** providers, consumers, work requirements, shared constraints,
   and dependency consequences.
7. **Investment classification:** New Development, Sustain & Maintenance, and Tech Debt across
   Product, Engineering, and Commercial software teams.

## Synthesis gate

Begin integrated V2 modeling only when each packet has:

- a named source and authority level;
- observed, inferred, intent, synthetic, runtime, and unknown statements separated;
- normal and difficult examples;
- temporal and cardinality semantics;
- unresolved questions recorded without hidden recommendations; and
- a reproducibility status.
