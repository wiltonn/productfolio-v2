# Domain Vocabulary

Canonical vocabulary for ProductFolio V2's first-release scope (revised 2026-09-05). Every
term has one precise meaning and one authoritative home document; definitions here are
deliberately short — the home carries the full rule.

---

## Census and organization (`ORGANIZATION_MODEL.md`)

### Person
An individual in the Engineering census; the basis of all capacity calculation.

### Team
A relatively stable workforce unit; the unit whose quarterly capacity is planned. A Person
belongs to exactly one Team at any moment.

### Engineering census
The authoritative roster: who is in Engineering, on which Team, on what working schedule,
effective when.

### Working schedule
A Person's contracted working pattern — full-time or a contracted fraction — with effective
dates.

### Effective date
The date from which a census fact (join, leave, schedule change, team change) holds. History
stays true.

### Constrained specialist
A Person whose particular expertise is required by specific work and cannot be substituted
from the rest of the team; the one sanctioned case of individual-level capacity detail.

## Capacity (`WORKFORCE_CAPACITY_MODEL.md`)

### Working day
Monday to Friday. Weekends are never working days.

### Standard full-time week
Five working days. The basis of the engineer-week.

### Engineer-week
The comparable time unit: five working days at a full-time schedule (one working day at
full-time = 0.2 engineer-weeks).

### Holiday calendar
The organization's own list of holiday dates, entered deliberately; no jurisdiction is
assumed. Holidays count as known absence for everyone in force that day.

### Quarter
The planning period: a named, inclusive date range. Its working days are derived from its
dates.

### Team-quarter
One Team in one Quarter — the primary planning unit. It owns its assignments, reserve,
reconciliation and feasibility judgments.

### Engineering-wide workspace
The Census, Capacity and Allocations views, which read across every Team in a Quarter and
share one quarter selection. A view, not a planning unit: it owns nothing, pools no capacity,
and applies every edit to a named team-quarter.

### Contracted capacity
Working time per working schedules and effective dates.

### Known absence
Working time the organization knows it will not have — leave, holidays from the holiday
calendar, training. The only reduction between contracted and available capacity; a day is
absent at most once however many entries cover it.

### Available workforce capacity
Contracted capacity − known absences.

### Overhead
Management and administration: accounted-for work reported separately, netted out of
delivery capacity and never distributed across the delivery investment categories. Stated
per person as a percentage of their available workforce capacity.

### Net delivery capacity
Available workforce capacity − overhead. The quantity the quarterly plan reconciles.

### Overhead ratio
Overhead ÷ available workforce capacity.

## Work (`WORK_MODEL.md`)

### WorkPackage
A meaningful body of work against which capacity is planned. The only level of work in the
model; no subtypes, nothing beneath it.

### Quarterly work list
The set of WorkPackages accepted for a Quarter.

### Estimate
A WorkPackage's rough capacity requirement in engineer-weeks, broken into team
contributions where several teams are required.

### Delivery investment category
Exactly one per WorkPackage: **New Development** (canonical label; "Roadmap Delivery" is an
accepted synonym), **Sustain & Maintenance**, or **Tech Debt**. Overhead and the Unplanned
Work reserve sit outside the categories.

### Dependency
One WorkPackage (or external event) that must complete before another can proceed. Never an
organizational relationship.

### Delivery window
A date constraint on a WorkPackage, such as a regulatory deadline.

### Monthly sequencing
Rough month-level placement of team contributions, used only where a dependency or delivery
window requires it.

## Quarterly planning (`QUARTERLY_PLANNING_MODEL.md`)

### Capacity assignment
A specific quantity of a named Team's net delivery capacity earmarked to an accepted
WorkPackage for the Quarter. May be partial, and partial must be visible as partial.

### Unplanned Work reserve
An explicit reserve of delivery capacity for work not yet known. Separate from overhead and
from unassigned headroom; unclassified until consumed.

### Unassigned headroom
Net delivery capacity no assignment or reserve has claimed.

### Shortfall
Negative headroom: assignments plus reserve exceeding net delivery capacity. Belongs to a
team-quarter. Always shown explicitly, never silently adjusted away and never offset against
another team's headroom.

### Engineering total
A quantity summed across the teams in a quarter. Percentages over these totals are computed
from the summed quantities, never by averaging the teams' percentages.

### Reconciliation identity
Net delivery capacity = assigned delivery capacity + Unplanned Work reserve + remaining
unassigned headroom.

### Accepted
On the quarterly work list. Says nothing about assignment or feasibility.

### Assigned
Having at least one capacity assignment.

### Feasible
Judged deliverable by the responsible technical lead given estimates, specialist
constraints, dependencies and sequencing.

### Feasibility judgment
The recorded lead judgment, its material assumptions, and the change-log position it was
made at. A feasible verdict must meet the capacity prerequisites; any judgment needs
reassessment once a later change to the team-quarter's planning inputs concerns it, and
stays so until a fresh judgment is recorded. History is kept.

### Commitment
The recorded promise that a WorkPackage (or a stated part of one) will be delivered in the
Quarter. Only feasible work may be committed; never inferred from an assignment.

### Baseline
The approved quarterly plan, preserved unchanged.

### Revision
A change to the live plan after baseline approval; compared against the baseline, never
overwriting it.

### Investment mix
Assigned delivery capacity by category, as percentages with a stated denominator — a team's
net delivery capacity, or Engineering's. Describes shape only; never evidence of fit.

---

## Reserved terms (deferred scope)

These terms keep their pre-reset meanings and must not be repurposed, but are not part of
the first release: **Enterprise**, **Commercial Division**, **Product Portfolio**,
**Product Workstream**, **Product Area**, **Membership**, **Affiliation**, **FTE**,
**Weekly Allocation**, **Workforce Plan**, **Scenario**, **Need**, **Priority**,
**Capability / Skill**, **Token**. Their prior definitions are preserved at git tag
`checkpoint/pre-engineering-quarterly-reset`.

"Workstream" in particular still refers to Product organizational structure and is never a
generic synonym for work.
