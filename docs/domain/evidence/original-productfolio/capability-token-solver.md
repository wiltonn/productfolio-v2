# Original ProductFolio — Capability, Skill, and the Token Solver

**Ticket:** wiltonn/productfolio-v2#5
**Status:** V1 archaeological evidence (§2). No V2 design is recommended here.
**Scope note:** Token *mathematics* is captured as salvage evidence (§30), not as a V2 decision.
The in-scope questions are the capability/skill abstraction and whether "Token" earns its place
as vocabulary.

---

## Sources surveyed

Primary working copy: `/home/wiltonn/dev/projects/productfolio` (repo `wiltonn/productfolio`).
Read without checkout via `git show <branch>:<path>`.

| Branch | Head commit | Role |
|---|---|---|
| `v1/solver` | `07368d6` *meta: knowledge transfer to CohesionXL* | **Primary.** Superset — merges L1–L4 + shared-types |
| `main` | `e62c2d7` *update* | Mainline. Carries the entire token domain; **no** engine |
| `feat/shared-types` | `ad85a8a` *feat(types): canonical CohesionXL domain model* | merged into `v1/solver` |
| `feat/L1-orchestration-graph` | `cea0818` | merged into `v1/solver` |
| `feat/L2-scenario-projection` | `22d60b4` | merged into `v1/solver` |
| `feat/L3-constraint-validator` | `1eee5e4` | merged into `v1/solver` |
| `feat/L4-governance-decision` | `4f4c751` | merged into `v1/solver` |

Origin commit for the token domain: `7e67286` *"added token math as basis"* (2026-02-07) — introduced
`schema.prisma` token models, `planning/`, `derive-demand.ts`, `token-flow-model.ts`, skill-pool
services, seed data, and 5 test files in a single commit.

Second working copy `/home/wiltonn/dev/projects/productfolio-workspace/productfolio-v1/productfolio`
(`@ main`) was checked for divergence — its token file set is identical to `v1/solver`'s.

**OBSERVED** — `git diff --stat main v1/solver -- packages/backend/src/planning/ prisma/schema.prisma`
is **empty**. The token domain (SkillPool, TokenSupply, TokenDemand, TokenCalibration, ledger,
derive-demand) is byte-identical on `main` and `v1/solver`. The solver branches add only
`src/engine/` (L1–L4), `src/types/`, and `solver-bridge.service.ts`.

Key files read in full: `docs/solver.md`, `meta.md` (1902 lines),
`migrations/20260208000001_add_token_domain_tables/migration.sql`, `schema.prisma` (token +
Skill/JobProfile regions), `planning/token-flow-model.ts`, `planning/derive-demand.ts`,
`services/{skill-pool,token-supply,solver-bridge}.service.ts`,
`engine/governance/governance-engine.ts`, `engine/constraints/{capacity-grid,capacity-constraint}.ts`,
`engine/projection/{token-types,token-scenario-projector}.ts`, `src/types/{token,constraint}.ts`,
`routes/planning.ts`, `pages/TokenLedger.tsx`, `hooks/useTokenLedger.ts`, `prisma/seed.ts`,
`.claude/plans/prisma-db-engineer.md`, `docs/components/planning-and-jobs.md`, `CLAUDE.md`, `README.md`.

---

## 1. What the solver actually computed

Three separate computations wore the "token" label. They were never unified.

### 1.1 The Token Ledger — a subtraction

**OBSERVED** — `v1/solver:packages/backend/src/planning/token-flow-model.ts:22-121`. The entire
`getTokenLedgerSummary` algorithm:

1. sum `TokenSupply.tokens` per `skillPoolId`;
2. sum `TokenDemand.tokensP50` per `skillPoolId`; sum P90 only if **every** contributing row is
   non-null, else the pool's P90 collapses to `null` (`token-flow-model.ts:74-88`);
3. `delta = supplyTokens − demandP50` (`:95`);
4. `bindingConstraints` = pools where `delta < 0`, mapped to `{poolName, deficit}`, sorted by
   deficit descending (`:100-103`);
5. a natural-language sentence per pool (`buildPoolExplanation`, `:124-144`).

**OBSERVED** — This is the *only* computation `TokenFlowModel` performs.
`getCapacityDemand` and `getCalculator` both `throw new WorkflowError('… not yet implemented')`
(`token-flow-model.ts:8-20`). TOKEN mode could not answer the questions LEGACY mode answered.

**OBSERVED** — The ledger is single-period. It reads `scenario.periodId` only to label the output
(`:113-120`). There is no time axis inside the ledger.

**INFERRED** — "Binding constraint" here is not the operations-research sense (the constraint whose
shadow price is non-zero at the optimum). It is simply *the negative rows, sorted*. No optimisation
runs; nothing is dual; nothing is relaxed. The word is aspirational.

### 1.2 The governance capacity gate — a per-skill, per-period feasibility check

**OBSERVED** — `v1/solver:packages/backend/src/engine/governance/governance-engine.ts`.
`requestTransition` (`:58-126`) runs L1 structural legality → L2 projection → L3 validation, and
mutates the in-memory item only if `violations.length === 0` (`:120-122`).

`projectScenario` (`:406-461`) spreads each item's demand evenly over its duration —
`perPeriodDemand = demand / item.duration` (`:428`) — accumulates `allocBySkill` per period, and
computes `remainingBySkill = cap − alloc`.

`validateScenario` (`:467-517`) emits `CAPACITY_EXCEEDED` wherever `remaining < 0`, with severity
`critical` when `overBy / capacity > 0.5`, else `high` (`:488`), plus `DEPENDENCY_NOT_SCHEDULED`
when `dep.startPeriod + dep.duration > item.startPeriod` (`:501`).

`generateWarnings` (`:519-558`) emits `NEAR_CAPACITY` for `0.8 < util ≤ 1.0` and
`TIGHT_DEPENDENCY_CHAIN` for chains of 3+ (`:548`).

`findAlternative` (`:664-690`) is a linear scan: shift the item one period later at a time,
re-project, re-validate, return the first violation-free start period with a human-readable
tradeoff list.

`computeHealthScore` (`:692-708`): `100 − 25·critical − 15·high − 5·other − 2·warnings − 10·(util > 0.95)`,
clamped to `[0,100]`.

### 1.3 The CapacityGrid — an immutable teams × periods matrix

**OBSERVED** — `v1/solver:packages/backend/src/engine/constraints/capacity-grid.ts`. Rows = teams,
columns = periods; every mutation returns a new grid (`allocate:105`, `deallocate:121`,
`scheduleItem:137`). Queries: `getUtilization` (`:158`), `findFeasibleWindow` — greedy forward scan
for the earliest fitting start (`:178-188`), and `getContention(periodId)` — teams sorted by
utilisation descending, documented as *"Identifies bottlenecks — most-loaded teams first"*
(`:190-208`).

**OBSERVED** — Its own header comment: *"V1 solver: greedy forward scan via `findFeasibleWindow`.
Designed to be replaced by a CP solver in V2 without changing the interface"* (`capacity-grid.ts:44-45`).
`docs/solver.md:238` repeats this.

**OBSERVED** — `utilization` is deliberately allowed to exceed 1 and becomes `Infinity` when
`total === 0` and `allocated > 0` (`capacity-grid.ts:32`) — over-allocation is representable, not
clamped.

**UNKNOWN** — Whether `CapacityGrid` was ever exercised from the live request path. The wired path
(`solver-bridge` → `GovernanceEngine`) uses the engine's own private `projectScenario`/`canFit`
(`governance-engine.ts:406,600`), **not** `CapacityGrid`. The grid is reachable only through the L3
`ConstraintValidator` path and its 454-line test file (`docs/solver.md:226`).

---

## 2. The capability / skill abstraction

### 2.1 SkillPool is a bare name

**OBSERVED** — `v1/solver:prisma/schema.prisma:1222-1239` and
`migrations/20260208000001_add_token_domain_tables/migration.sql:2-11`. `SkillPool` is
`{ id, name @unique, description?, isActive, timestamps }`. Its **only** relations are
`tokenSupplies`, `tokenDemands`, `tokenCalibrations`.

It has **no** foreign key to `Employee`, `Skill`, `JobProfile`, `Team`, `OrgNode`, or anything
organisational. `skill-pool.service.ts` is plain CRUD with soft-delete (`:58-69`).

**OBSERVED** — Seeded pools are `backend, frontend, data, qa, domain` (`prisma/seed.ts:518-524`) —
disciplines, not organisational units.

### 2.2 Five parallel, unjoined vocabularies for "skill"

**OBSERVED**, all in `v1/solver:prisma/schema.prisma`:

| # | Concept | Shape | Joined to the others? |
|---|---|---|---|
| 1 | `Skill` (`:428-443`) | `{employeeId, name: free text, proficiency 1-5}` | no |
| 2 | `JobProfileSkill` (`:1136-1150`) | `{jobProfileId, skillName: free text, expectedProficiency}` | no |
| 3 | `SkillPool` (`:1222-1239`) | `{name @unique}` | no |
| 4 | `ScopeItem.skillDemand` (`:343`) | `Json` — `{ "frontend": 2, "backend": 3 }`, free-text keys | no |
| 5 | `EmployeeOrgRelationshipType.CAPABILITY_POOL` (`:170`) | an org-membership *relationship type* | no |

The only bridge is a **case-insensitive string match**: `derive-demand.ts:60-66` builds
`poolByName` keyed on `pool.name.toLowerCase()`, then `:100` does
`poolByName.get(skill.toLowerCase())`. A miss produces a warning and the demand is silently
dropped (`:101-108`).

**OBSERVED** — the author's own retrospective, `meta.md:1543-1544`: *"Skills are stored as
`Skill { employeeId, name, proficiency }` where `name` is a free-text string … There's no skill
taxonomy, no relationships between skills, and no versioning."* And `meta.md:1662`: rebuild
differently — *"Skill model — replace free-text strings with a proper skill ontology."*

**INFERRED** — Nobody ever decided what a skill pool is a pool *of*. It is simultaneously read as a
discipline (`backend`), a demand key on a scope item, and a capacity bucket in a scenario. The
schema takes no position because nothing constrains it.

### 2.3 The solver's "Team" axis is actually a skill pool

**OBSERVED** — `v1/solver:services/solver-bridge.service.ts:167-176`. The bridge builds
`capacityBySkillPerPeriod` keyed by `supply.skillPool.name`, and `demandBySkill` likewise
(`:179-185`).

**OBSERVED** — `v1/solver:engine/projection/token-scenario-projector.ts:422-427`:
`toConstraintScenario` maps each supply row to a `ConstraintTeam`
`{ id: s.skillPoolId, name: s.skillPoolName, capacityByPeriod: [s.tokens] }`.

So `CapacityConstraint`'s per-team over-allocation message —
*"Team X is over-allocated in period P"* (`capacity-constraint.ts:55`) — actually reports on a skill
pool. **Team and skill pool are the same axis in the engine.** `src/types/constraint.ts:20` types
the constraint scope as `teamIds`, and `work-item.ts:29` keys token requirements by `TeamId`;
nothing distinguishes a team from a discipline.

---

## 3. What was normalized — and what was not

### 3.1 The stated intent

**OBSERVED** — `v1/solver:src/types/token.ts:1-13`, the only place the concept is defined in prose:

> *"Token — the fundamental capacity unit in CohesionXL. Tokens are NOT time. They are
> capability-throughput units that abstract away hours, story points, and other legacy measures."*
> `export type TokenType = 'human' | 'ai_agent' | 'blended';`

`TokenRequirement` adds `confidence: number // 0–1, how certain is this estimate`
(`src/types/token.ts:18-21`).

**INFERRED** — This is the single strongest statement of what "Token" was *for*: a unit that makes
**human and non-human (AI agent) throughput commensurable**, and that carries an explicit
confidence. That is a claim no plain "capability supply/demand" vocabulary makes.

### 3.2 The intent was never implemented

**OBSERVED** — `TokenType`, `Token`, and `TokenRequirement` appear in exactly four files:
their own definition (`src/types/token.ts`), the barrel (`src/types/index.ts:18`), one type
signature (`src/types/work-item.ts:6,29`), and one type-level test
(`src/types/__tests__/scenario.test.ts:26,69,108`). They appear **nowhere** in
`packages/backend/` and **nowhere** in the Prisma schema. `'ai_agent'` never reaches a database
column, a service, or the engine.

**OBSERVED** — the persisted token is a scaled hour, not a throughput unit.
`TokenCalibration.tokenPerHour` (`schema.prisma:1285`) and
`derive-demand.ts:121`: `const tokensP50 = hours * tokenPerHour;`.

**OBSERVED** — the engine's own field names and messages give it away:
`PortfolioSummary.totalDemandHours` / `totalCapacityHours` are populated from token totals
(`governance-engine.ts:153-154`), and the `CAPACITY_EXCEEDED` message renders tokens with an `h`
suffix — *"demand 140.0h vs capacity 100h (over by 40.0h)"* (`governance-engine.ts:489`, echoed in
`docs/solver.md:207`).

**INFERRED** — Tokens normalized nothing that hours did not already normalize. A per-pool constant
multiplier is a unit change, not a normalization: it cannot make two pools commensurable, because a
backend token and a QA token are still incomparable after scaling. The only thing `tokenPerHour`
buys is that *within* a pool, demand expressed in hours can be compared against supply expressed in
tokens — which is a conversion, not a normalization.

### 3.3 Supply was never derived from anything

**OBSERVED** — There is **no** `derive-supply.ts` on any of the seven branches (checked by
`git ls-tree -r --name-only <branch> | grep -ci derive-supply` → `0` for all).
`TokenSupply` is created only through `tokenSupplyService.upsert` from a hand-supplied
`data.tokens` (`token-supply.service.ts:40-70`), reachable via
`PUT /api/scenarios/:id/token-supply` (`routes/planning.ts:71-72`).

**OBSERVED** — No production file both references `tokenSupply` and reads employee/capacity data;
the only such files are four test files.

**OBSERVED** — Seeded supply is a flat literal: `backend 200, frontend 150, data 80, qa 60,
domain 40` (`prisma/seed.ts:593-599`), noted as *"Q1 capacity for …"*.

**OBSERVED** — `meta.md:1675`, under "Build new": *"Net-free capacity — subtract existing
allocations from supply for accurate gap analysis. **This was explicitly deferred in ProductFolio.**"*

**INFERRED** — Token supply in the original was an unverified assertion typed by a planner. It was
not reconciled against `Employee.hoursPerWeek`, `CapacityCalendar`, or `Allocation`. The ledger's
`delta` therefore compares a hand-typed number against a derived-ish number.

---

## 4. What was calibrated

**OBSERVED** — `TokenCalibration { skillPoolId, tokenPerHour default 1.0, effectiveDate @db.Date }`,
unique on `(skillPoolId, effectiveDate)` (`schema.prisma:1282-1298`;
`migration.sql:42-52,88`). This is the **only temporally-versioned concept in the token domain** —
supply and demand have no effective dates at all.

**OBSERVED** — Resolution rule, `derive-demand.ts:69-84`: load all calibrations with
`effectiveDate <= now` ordered `desc`, take first-seen per pool. Fallback `1.0` with a warning
*"No calibration for pool X — using 1:1 token-to-hour fallback"* (`:116`).

**OBSERVED** — Conversion, `derive-demand.ts:121-127`:
- `tokensP50 = hours * tokenPerHour`
- `tokensP90 = hours * (estimateP90 / estimateP50) * tokenPerHour` — the P90/P50 **ratio is taken
  from the ScopeItem's own hour estimates and applied to the per-skill hour split**, since
  `skillDemand` carries no percentile of its own.
- P90 aggregation is null-absorbing: one missing P90 nulls the whole `(initiative, pool)` bucket
  (`:136-143`).

**OBSERVED** — Seeded rates: `backend 1.0, frontend 1.2, data 0.8, qa 1.5, domain 0.5`
(`prisma/seed.ts:541-547`).

**OBSERVED — calibration was unreachable.** `deriveTokenDemand` is exported from
`planning/derive-demand.ts` and is called by **no route**: `routes/planning.ts` registers exactly
nine endpoints (planning-mode, token-supply ×3, token-demand ×4, token-ledger) and contains no
`derive` handler. Yet `README.md:228` documents
`POST /api/scenarios/:id/derive-token-demand`, and the UI ships a *"Derive Demand"* button —
`useDeriveTokenDemand` posts to `/scenarios/${scenarioId}/derive-token-demand`
(`hooks/useTokenLedger.ts:166-177`), wired into `pages/TokenLedger.tsx:165`, whose empty state reads
*"No token data available. Use 'Derive Demand' to populate from scope items."* (`TokenLedger.tsx:42`).

**INFERRED** — In the original, the only reachable way to get token demand into the database was
hand entry via `PUT/POST /api/scenarios/:id/token-demand`. Calibration existed as a table, a seed,
a documented endpoint, a UI button, and a 434-line test file — and had no live consumer. The
mathematics was written but never ran in the product.

**OBSERVED** — `token_planning_v1` is seeded **disabled** (`prisma/seed.ts:496,507`) and listed as
disabled in `meta.md:1877`, fifth in the recommended rollout order (`meta.md:1885`).

**INFERRED** — The whole token domain is unshipped. No production usage evidence exists for any of
it, so none of it carries the authority of a proven workflow.

---

## 5. Constraint and bottleneck analysis actually performed

| Analysis | Where | What it does | Real? |
|---|---|---|---|
| Pool deficit ranking ("binding constraints") | `token-flow-model.ts:100-103` | `supply − demandP50 < 0`, sorted by deficit desc | **OBSERVED** — a sort, not an optimisation |
| Per-skill per-period over-allocation | `governance-engine.ts:467-495` | `remaining < 0` → `CAPACITY_EXCEEDED` with affected items | **OBSERVED** |
| Near-capacity warning | `governance-engine.ts:519-543` (>80%); `capacity-constraint.ts:10,66` (>85%) | threshold warnings | **OBSERVED** — *two different thresholds in two live modules* |
| Team contention ranking | `capacity-grid.ts:194-208` | teams sorted by utilisation desc | **OBSERVED** — labelled "bottlenecks" |
| Dependency cycle detection | `governance-engine.ts:619-649` (DFS); `dependency-resolver.ts` (Kahn's + DFS colouring, per `meta.md:1500`) | topological sort, cycle detection, critical path (DP) | **OBSERVED** |
| Cascade-risk warning | `governance-engine.ts:546-555,651-662` | dependency chain length ≥ 3 → *"any slip cascades"* | **OBSERVED** |
| Alternative-start suggestion | `governance-engine.ts:664-690` | first feasible later start + tradeoff narrative | **OBSERVED** |
| Greedy scheduling | `governance-engine.ts:188-265`; `capacity-grid.ts:178-188` | topological sort by priority → earliest-fit forward pass | **OBSERVED** |
| What-if delta | `governance-engine.ts:271-361` | baseline vs projected: `utilizationChange`, `newViolations`, `resolvedViolations`, `capacityImpact` | **OBSERVED** |
| Portfolio health score | `governance-engine.ts:692-708` | weighted violation/warning penalty, 0–100 | **OBSERVED** — hand-tuned constants, no stated basis |
| Decision audit log | `governance-engine.ts:714-737`; `decision-log.ts` | action, request, projected scenario, constraints evaluated, result, violations, warnings, durationMs | **OBSERVED** |

**OBSERVED** — What the *wired* path actually did: the bridge collapses the whole plan into
`periods: 1` (`solver-bridge.service.ts:173-176`, *"Single-period model: all supply is available in
period 0"*), gives every work item `startPeriod: 0, duration: 1, priority: 1, dependencies: []`
(`:204-230`), and counts only initiatives already in `RESOURCING`/`IN_EXECUTION` as consuming
(`:198-203`). `docs/solver.md:237` lists multi-period as future work.

**INFERRED** — With one period, no durations, no dependencies and uniform priority, the entire L1–L4
pipeline in production reduces to exactly the ledger's arithmetic: *is summed demand greater than
summed supply, per pool?* The graph theory, the temporal scheduling, and the alternative-suggestion
search were all live code with no live inputs to work on.

**OBSERVED** — The gate was narrow by design: only transitions into `RESOURCING` or `IN_EXECUTION`
are checked (`solver-bridge.service.ts:21-24,66-68`), and if the initiative has no token demand, or
every relevant scenario is `LEGACY`, it returns `{checked: false, approved: true}` (`:91,107`).

---

## 6. Salvage: mathematics worth preserving independently of "Token"

Per §30, recorded as candidates, not recommendations. None depends on the word "token".

**Genuinely valuable, and vocabulary-independent:**

1. **Layer separation: project, then judge.** L2 builds a projected state and explicitly refuses to
   decide feasibility; L3 judges it; L4 decides and logs. `docs/solver.md:111`:
   *"L2 is pure transformation … This separation means L3 constraints can evolve independently."*
   Every projection is in-memory with no DB write; only L4 persists
   (`token-scenario-projector.ts:8-12`). This directly serves the §19 requirement that scenario
   evaluation must not silently mutate the baseline.
2. **Immutable capacity grid with over-allocation representable.** `utilization` may exceed 1 and
   becomes `Infinity` on zero capacity (`capacity-grid.ts:30-34`) — over-allocation is a value, not
   an error. Every mutation returns a new grid, so baseline and scenario coexist.
3. **Actionable rejection.** A violation carries `affectedItems` and a structured `detail`
   (`{skill, period, demand, capacity, overBy}`) plus a suggested alternative with a written
   tradeoff list (`governance-engine.ts:486-492,676-685`). Rejections tell the planner what to do
   next, not merely that they failed.
4. **Decision audit trail.** Every decision records action, request, projected scenario, constraints
   evaluated, result, violations, warnings, and duration (`governance-engine.ts:721-737`).
5. **Dependency mathematics.** Kahn's topological sort, DFS-colouring cycle detection, DP critical
   path (`meta.md:1500`; `governance-engine.ts:564-587,619-662`); cascade-risk flagging on chains ≥ 3.
6. **Two-point uncertainty carried end-to-end with null-absorbing aggregation.** P50/P90 travel from
   `ScopeItem.estimateP50/P90` through derivation to the ledger, and a single missing P90 nulls the
   whole aggregate rather than silently under-reporting (`derive-demand.ts:136-143`;
   `token-flow-model.ts:74-88`). The refusal to fabricate a P90 is the valuable part.
7. **Ratio-transfer of uncertainty.** `tokensP90 = hours × (estimateP90/estimateP50) × rate`
   (`derive-demand.ts:126`) — applying an item-level uncertainty ratio to a per-skill split that has
   no percentile of its own. A reusable trick wherever uncertainty is stated at a coarser grain than
   the split.
8. **Deficit-ranked scarcity report + natural-language explanation.** The ranked deficit list and
   `buildPoolExplanation` (`token-flow-model.ts:100-144`) are the cheapest useful thing in the whole
   domain, and they are pure arithmetic over any supply/demand pair.

**Salvage with a warning attached:**

9. `computeHealthScore` (`governance-engine.ts:692-708`) — the constants (25/15/5/2/10) have no
   stated derivation. Salvage the *idea* of a single portfolio health number; do not port the weights.
10. `findFeasibleWindow` / greedy first-fit (`capacity-grid.ts:178-188`;
    `governance-engine.ts:200-241`) — explicitly a placeholder for a CP solver
    (`capacity-grid.ts:44-45`). Salvage the interface shape, not the algorithm's optimality claims.
11. Two live near-capacity thresholds, 80% (`governance-engine.ts:528`) and 85%
    (`capacity-constraint.ts:10`) — evidence that the threshold was never a decided business rule.

**Explicitly NOT worth salvaging as mathematics:**

12. `tokenPerHour` as a unit conversion. It is a per-pool scalar that changes units without making
    pools commensurable (§3.2). What it *would* need to be to earn its keep — a
    measured, back-tested throughput coefficient — was never built: nothing compares a pool's rate
    against realised delivery. `docs/ramp.md:600` notes only as a future idea *"compare predicted
    ramp (from profiles) vs actual delivery velocity to calibrate."*
13. The single-period collapse in `solver-bridge.service.ts:173`. Not a simplification to preserve;
    it is what neutered the engine.

**Note on forecasting** — **OBSERVED**: no file matching `forecast` contains the string `token`.
The Monte Carlo forecaster (Mode A lognormal / Mode B empirical bootstrap, `meta.md:15`) is fully
independent of the token model and `meta.md:1659` calls it *"pure functions. Portable as-is."*
Whatever happens to "Token", the forecasting mathematics is unaffected.

---

## 7. Does "Token" name a business concept that capability supply/demand does not?

Evidence, both directions.

**What "Token" claimed to add** — **OBSERVED**, `src/types/token.ts:1-13`: a unit deliberately
*not* time, carrying `TokenType: 'human' | 'ai_agent' | 'blended'` and, on a requirement, a
`confidence: 0–1`. Three claims sit inside that: (a) heterogeneous capacity sources — including
non-human — reduced to one comparable number; (b) the unit is throughput, not elapsed time; (c) an
estimate's certainty travels with it.

**Claim (a) — never built.** `TokenType` reaches no database column, no service, no engine, no
route (§3.2). `'ai_agent'` exists only in a type alias and a type test.

**Claim (b) — contradicted by the implementation.** `TokenCalibration.tokenPerHour` and
`tokensP50 = hours × tokenPerHour` (`derive-demand.ts:121`) define a token *as* an hour times a
constant. The engine's own summary fields are named `totalDemandHours` / `totalCapacityHours`
(`governance-engine.ts:153-154`) and its violation message prints tokens with an `h` suffix
(`:489`). Nothing anywhere measures throughput.

**Claim (c) — partially real, but orthogonal.** P50/P90 is genuinely carried end-to-end
(`schema.prisma:1265-1266`; `token-flow-model.ts:74-88`). But `TokenRequirement.confidence` — the
part actually attached to the token *type* — is unused, and P50/P90 is a property of an **estimate**,
not of a **unit**. It attaches equally well to hours, days, or story points.

**What the persisted model actually is** — **OBSERVED**: a per-scenario, per-skill-pool quantity of
supply, a per-scenario, per-initiative, per-skill-pool quantity of demand, and a subtraction. Every
column, endpoint, computation and UI element (`TokenLedger.tsx:53-70` — *"Skill Pool / Supply /
Demand (P50) / Demand (P90) / Delta"*) is exactly *capability supply*, *capability demand*, and
*gap*, per pool, per planning period.

**INFERRED** — On the evidence in this repository, "Token" names no business concept that
"capability supply / capability demand / gap" does not already name. The distinctive content it
promised — a commensurable human-and-AI throughput unit — was declared in a type file and never
implemented. What shipped is a renamed hour.

**INFERRED** — Its costs are visible. It introduced a fifth unjoined skill vocabulary (§2.2) with
no FK to the four that already existed; it created a `SkillPool` axis that the engine silently
treats as `Team` (§2.3); and it required a whole `LEGACY | TOKEN` `PlanningMode` strangler split
that the author later judged *"a migration tool, not an architecture"* (`meta.md:1664`).

**UNKNOWN** — Whether a business stakeholder ever used, requested, or recognised the word "Token".
The flag shipped disabled, nothing in the repository records a business conversation, and no
business-facing document defines the term. §25(5) — *can a business user explain it without
referring to software terminology?* — cannot be answered from this repository, and the absence of
any such definition is itself weak evidence against.

**UNKNOWN** — Whether normalising human and agentic (AI) capacity into one unit is a real emerging
requirement for the enterprise. `src/types/token.ts:8` is the only artefact that raises it. If it is
real, it is a genuine question that "capability supply" does not obviously answer — but it needs to
come from the product owner, not from this code, because this code never implemented it.

---

## 8. Contrast with the newer workforce-planner evidence

Read against `docs/domain/evidence/workforce-planner/WORKFORCE_DOMAIN_EVIDENCE.md` §14 and
`JAGGED_DOMAIN_AREAS.md` J14/J15 (which, despite the path, describe the *newer* implementation).

| Aspect | Original ProductFolio (this document) | Newer workforce-planner (§14, J14/J15) |
|---|---|---|
| `SkillPool` shape | bare name, no FK to any org concept | same |
| Skill→pool resolution | lowercase name match, demand side only (`derive-demand.ts:60-66,100`) | lowercase name match, **both** directions |
| Supply origin | **hand-typed only.** No `derive-supply.ts` exists on any branch | `derive-supply.ts` derives supply from workforce hours; `TokenSupply.source: MANUAL \| DERIVED_WORKFORCE` |
| Employee across pools | question never arises — supply is asserted | **two live opposite conventions** (J14): proficiency-share split vs deliberate double-count |
| `deriveTokenDemand` reachable? | **no route, no caller** — documented in README, wired to a UI button that 404s | also *"no route and no caller"* (§14 Ambiguity) |
| Feature flag | `token_planning_v1` seeded disabled | gated on `token_planning_v1` |
| Net-free capacity | *"explicitly deferred"* (`meta.md:1675`) | J15: no allocation rule exists to split a pool across initiatives |

**INFERRED** — The newer implementation attempted the step the original skipped: deriving supply
from real workforce data. That step is precisely where J14 and J15 appeared. The jaggedness is not a
coding accident — it is what happens when an undefined abstraction (*a pool of what?*) is finally
forced to touch real employees. The original avoided the contradiction by never connecting the two.

**INFERRED** — Both implementations independently arrived at an unrouted `deriveTokenDemand` behind
a disabled flag. §1 warns that two implementations may carry the same mistake; here they carry the
same *abandonment*, which is stronger evidence than either alone that the derivation step never
found a workflow that wanted it.

---

## 9. Open questions this evidence cannot answer

- **UNKNOWN** — What is a skill pool a pool *of*? Neither repository takes a position (echoes J14).
- **UNKNOWN** — Is normalising human and AI-agent capacity a real requirement, or one engineer's
  speculation in `src/types/token.ts:8`? Only the product owner can settle this.
- **UNKNOWN** — Was `tokenPerHour` ever intended to be *measured* (a back-tested throughput
  coefficient) rather than *assumed*? The seeded values look like judgement calls
  (`seed.ts:541-547`) and no back-test exists.
- **UNKNOWN** — Whether `Team` and `SkillPool` were meant to be the same axis, or whether the
  conflation in `solver-bridge.service.ts:167-176` and
  `token-scenario-projector.ts:422-427` is an expedient that hardened.
- **UNKNOWN** — Whether the P50/P90 pair was ever used by a planner to make a decision, or only
  rendered. Nothing consumes P90 beyond display and a null-propagation rule.
- **UNKNOWN** — What "binding constraint" was intended to mean to a business user, given that the
  implementation is a sort and the term carries a precise, different meaning in optimisation.

---

## Evidence-label summary

Every claim above is labelled inline. In brief:

- **OBSERVED** — all schema shapes, all algorithms, the absence of `derive-supply.ts` and of a
  `derive-token-demand` route, the disabled feature flag, the `TokenType`-never-used finding, the
  hours/tokens contradiction, the Team↔SkillPool conflation, the two near-capacity thresholds, the
  single-period collapse, and the `main` ≡ `v1/solver` token-domain identity.
- **INFERRED** — that tokens normalized nothing hours did not; that the wired pipeline reduces to
  the ledger's subtraction; that "Token" names no business concept beyond capability supply/demand
  *on this repository's evidence*; that the newer implementation's jaggedness is where the original's
  unasked question surfaced.
- **UNKNOWN** — everything in §9, most importantly whether human/AI capacity normalization is a real
  business need. That question is the only part of the Token idea this evidence does not dispose of.
