# Decision Log

Domain decisions: settled, superseded and open. Concise by design — each settled rule's full
statement lives in its home document; this file records that and why it was decided, and
what superseded what.

**2026-09-05 — scope reset.** The product owner redirected ProductFolio V2 to a small
Engineering quarterly-planning system. Decisions D6–D12 record the reset. The pre-reset
entries D1–D5 are summarized below with their current status; their full original text is
preserved at git tag `checkpoint/pre-engineering-quarterly-reset`.

---

## Pre-reset decisions (D1–D5)

### D1 — Only work consumes capacity — **RETAINED (principle), machinery deferred**
Belonging to a unit never spends a person's time; membership attributes supply. Retained: a
Person belongs to exactly one Team (effective-dated), and only work receives capacity. The
Membership/Affiliation machinery and enterprise supply roll-ups are deferred with D6.

### D2 — Capacity is time; only absence reduces it — **RETAINED, refined by D8**
Retained: capacity measures working time, never productivity; known absence is the only
reduction between contracted and available capacity; part-time schedules and effective
dates are respected. Refined: D2 treated management/administration as work allocated like
any other; D8 now nets overhead out of delivery capacity and reports it separately. The
weekly percentage grain D2 was expressed in is superseded by D7.

### D3 — One organizational structure, typed but ungoverned — **DEFERRED intact**
The enterprise tree (Commercial Divisions, Product, Engineering as peers; type as label,
not grammar) remains the intended expansion shape. The first release models only
Engineering teams and people; the expansion boundaries are preserved in
`ORGANIZATION_MODEL.md`.

### D4 — One level of work: the WorkPackage — **RETAINED**
WorkPackage is the only work concept; no WorkItem, no Initiative/Project subtypes; the
estimate and the staffing hang off the same record. Unchanged by the reset — the quarterly
work list is a list of WorkPackages. Capability-shaped demand is narrowed to the
constrained-specialist mechanism for the first release.

### D5 — Need, Commitment, and a single Product ranking — **PARTLY DEFERRED**
Deferred: Need, the requesting organization, and the single Product priority ranking (with
enterprise negotiation, per D6). Retained: Commitment as an explicit record that is never
inferred from an assignment — now simplified to the quarterly commitment of feasible work
(`QUARTERLY_PLANNING_MODEL.md`). The pre-reset `DEMAND_COMMITMENT_MODEL.md` was replaced by
`QUARTERLY_PLANNING_MODEL.md`; its Need/priority content is recoverable at the checkpoint
tag. The file now at `DEMAND_COMMITMENT_MODEL.md` is a separate deferred-scope investigation
note merged from `main` (see `README.md`), not an active document.

---

## Reset decisions (2026-09-05)

### D6 — Scope: an Engineering quarterly-planning system — **DECIDED** (product owner)
The first release covers the Engineering census and quarterly capacity, a quarterly work
list, team-quarter assignments and reconciliation, and feasibility judgments with quarterly
commitments. Explicitly deferred: enterprise-wide commercial request negotiation, detailed
product/capability catalogs, scenario engines, token models and portfolio optimization,
Monte Carlo forecasting, broad skill-matching, employee-week scheduling, and
execution-level task management. Deferral is not rejection: the expansion boundaries in
`ORGANIZATION_MODEL.md` keep the road open.

### D7 — The planning unit is the team-quarter — **DECIDED** (product owner)
A quarterly plan must not require employee-by-week assignments. Two sanctioned refinements
only: individual net-capacity detail for constrained specialists, and rough monthly
sequencing where a dependency or delivery window requires it. Supersedes the employee-week
percentage allocation as the planning grain (it may return with the deferred scope).

### D8 — Overhead is netted out and reported separately — **DECIDED** (product owner)
Management and administration are accounted-for work: net delivery capacity = available
workforce capacity − overhead, with the overhead ratio (overhead ÷ available) reported.
Overhead is never distributed across the delivery investment categories. Supersedes D2's
"overhead is allocated like any other work"; still upholds D2's deeper rule that overhead
is neither invisible nor a fudge factor — it is measured and visible, just outside the
delivery categories. Home: `WORKFORCE_CAPACITY_MODEL.md`.

### D9 — Explicit Unplanned Work reserve and reconciliation identity — **DECIDED** (product owner)
Net delivery capacity = assigned delivery capacity + Unplanned Work reserve + remaining
unassigned headroom. The reserve is distinct from overhead and from headroom, stays
unclassified until consumed, and is reduced when it funds newly accepted work so nothing is
double-counted. An overallocated draft shows its shortfall explicitly. Home:
`QUARTERLY_PLANNING_MODEL.md`.

### D10 — Accepted / Assigned / Feasible, and commitment only from feasible — **DECIDED** (product owner)
Three distinct conditions, reported in non-overlapping buckets. Feasibility is a recorded
technical-lead judgment with material assumptions, reassessed when they change; aggregate
fit is necessary but insufficient (specialists and windows must also fit). Only feasible
work may be committed; partial assignment never implies coverage. Home:
`QUARTERLY_PLANNING_MODEL.md`.

### D11 — The first category's canonical label is "New Development" — **DECIDED**
Chosen over "Roadmap Delivery" for continuity with the standing business reporting
requirement; "Roadmap Delivery" is recorded as an accepted synonym. Meaning: work that
creates new product or system capability. Home: `WORK_MODEL.md`.

### D12 — Approved baselines are preserved separately from revisions — **DECIDED** (product owner)
Approval freezes the baseline; mid-quarter changes create revisions compared against it.
Home: `QUARTERLY_PLANNING_MODEL.md`.

### D13 — Calendar-derived working time — **DECIDED** (product owner, 2026-09-05; resolves O1)
Capacity is computed from the actual Monday–Friday working days inside the quarter's date
range, each person's working schedule, and their effective dates — never from an assumed
number of weeks. The standard full-time week is 5 working days = 1.0 engineer-week. Holidays
come from a configurable calendar the organization enters (no jurisdiction assumed, nothing
fetched), count as known absence for everyone in force, and a day is absent at most once
whether covered by a holiday, leave, or both. Overhead is a percentage of the person's own
available capacity. Home: `WORKFORCE_CAPACITY_MODEL.md`, "Calendar-derived working time".

### D14 — Implementation approved for the first slice — **DECIDED** (product owner, 2026-09-05)
Implementation may proceed for one team, one quarter: census, capacity chain, work list,
assignments, reserve, reconciliation, planning states and recorded feasibility judgments.
Still deferred within the first release: constrained-specialist tracking, monthly
sequencing, formal baseline approval/revision, and multi-team contributions to one
WorkPackage (the first slice records each WorkPackage's estimate as *this team's*
contribution). See `CLAUDE.md` for the implementation conventions.

---

## Open decisions

None of these blocks the first slice.

### O2 — Census source and stewardship — **OPEN, non-blocking**
What system of record feeds the Engineering census, and who maintains effective dates.

### O3 — Baseline approval authority — **OPEN, non-blocking**
Who approves the quarterly baseline. Working assumption: Engineering leadership, with each
responsible technical lead owning their feasibility judgments.

### O4 — Reserve sizing guidance — **OPEN, non-blocking**
Whether teams get default guidance for sizing the Unplanned Work reserve (for example, a
starting percentage informed by history) or size it freely per quarter.
