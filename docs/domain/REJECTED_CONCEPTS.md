# Rejected Concepts

Concepts and structures deliberately excluded from V2, with the reason. Recorded so they are
not reintroduced by accident — particularly where an existing implementation still contains
them.

---

## An organizational claim on a share of a person

**What it was** — `EmployeeOrgUnitLink.allocationPct` together with `consumeCapacity`: an
organizational unit holding a percentage claim on an Employee's time, validated against a hard
100% ceiling by `validateAllocationTotal`. Present in both existing implementations; the newer
one's own analysis calls it a *"true duplicate"* of weekly allocation.

**Why rejected** — It makes organizational ownership and capacity consumption the same
relationship, which §8 requires to stay distinct. It also produces two unreconciled answers to
*how allocated is this person?*, which is the root of `J1`.

**Rejected by** — D1. Only work consumes capacity.

**Note** — Both implementations still contain these columns. Their presence is not evidence
for reinstating the concept; in the original, nothing ever read them.

---

## Capacity consumption conditional on relationship type

**What it was** — The `NEVER_CONSUMES` rule: `PRIMARY_REPORTING`, `FUNCTIONAL_ALIGNMENT` and
`CAPABILITY_POOL` may never consume capacity, while `DELIVERY_ASSIGNMENT` and
`TEMPORARY_ROTATION` do by default.

**Why rejected** — Not because the distinction is wrong, but because it is misfiled. Two of the
five types are not kinds of belonging at all — they are assignments to work wearing an
org-shaped costume. Once they are recognised as work, the rule reduces to *work consumes
capacity, membership does not*, and no consumer needs to know the taxonomy.

**What survives** — The underlying insight, which is sound and is preserved in the model: being
reported into a unit, aligned to it, or drawable from it does not spend a person's time.

**Rejected by** — D1.

---

## A percentage on Membership

**What it was** — Splitting an Employee's capacity supply across several owning units by
percentage.

**Why rejected** — It makes *whose capacity is this?* a question with more than one answer, and
reintroduces on Membership exactly the ambiguity D1 removed. An Employee has one owning
Membership and any number of non-owning Affiliations.

**Note** — If a genuine need appears to split how a person is *funded* across organizations,
that is a cost or funding concept and must be modelled as one — not as capacity ownership.

**Rejected by** — D1.

---

## Overhead as a capacity reduction

<a id="rejected-overhead-as-capacity-reduction"></a>

**What it was** — `CapacityEffect.OVERHEAD`: management duty and administration modelled as
capacity the Employee has *but has already spent*, deducted from their week alongside
`UNAVAILABLE` leave.

**Why rejected** — It models one fact twice: the person's week shrinks *and* something is being
done. Overhead is work, and belongs in allocation. The newer implementation's own behaviour
agrees — `E7` records the OVERHEAD/UNAVAILABLE distinction as stated and then never used, with
both summed into `reserved` with no branch.

**What survives** — Absence remains a genuine capacity reduction: the person is not there.

**Rejected by** — D2.

---

## A nominal full-time denominator

**What it was** — Treating 100% as one standard full-time week, so a half-time Employee tops
out at 50%.

**Why rejected** — "Is this person full?" stops being readable from their own row, and
over-allocation becomes undetectable for part-time Employees. Both existing implementations
compare against a literal `100` regardless of the person, which is this error in practice.

**What survives** — FTE, as a derived conversion for cross-person roll-ups.

**Rejected by** — D2.

---

## Productivity-discounted capacity

**What it was** — V1's `effectiveHours = allocated × proficiency × buffer × ramp`: a level-3
engineer counted as 3/5 of their hours, discounted again while ramping.

**Why rejected** — It makes an Employee's week change size depending on what they are assigned
to, so *is this person full?* cannot be answered without knowing how well their skills match
their work. Capacity is time; effectiveness is a different question. In V1 the concept was never
persisted and every multiplier defaulted off.

**What survives** — The underlying concern is real. If proficiency or ramp enter V2 they attach
to the person-and-work match through the capability model, never to the Employee's capacity.

**Rejected by** — D2.

---

## A composition grammar on organizational units

**What it was** — Making a unit's type constrain what it may contain: Product Portfolio contains
Workstream contains Area contains Team, with Engineering and Commercial declaring their own
shapes, enforced by the model.

**Why declined** — §7 requires Engineering's real structure to be investigated rather than
assumed, and §26 warns that organizational relationships move. A grammar written now would fix a
hierarchy that has not been validated.

**The accepted cost** — the type is a label, so shape correctness rests on the data. Both
existing implementations chose this and their type tags went decorative: V1's `OrgNodeType`
gates only `ROOT` and validates no parent type at all.

**Revisit if** — the type stops carrying meaning in practice, or invalid shapes appear in real
data. This is a deferral with a stated risk, not a permanent exclusion.

**Declined by** — D3.

---

## Representing Engineering with Product's levels

**What it was** — Creating Product Portfolios, Product Workstreams or Product Areas to stand in
for Engineering structure, so that one hierarchy covers everyone.

**Why rejected** — §7 forbids it outright. Engineering is a peer branch with its own unit types
and its own, ragged, depth. Borrowing Product's levels would assert a shape Engineering does not
have and make "capacity by Product Portfolio" silently wrong.

**Rejected by** — D3.

---

## WorkItem as a planning concept

**What it was** — A unit of work beneath the capacity-planning unit: a Jira epic, story, feature,
task or defect, modelled inside ProductFolio.

**Why rejected** — The only such level ever built was created by a `NOT NULL` foreign key, not by
a workflow — the newer implementation's own schema comment says `WorkItem` exists because
`ScopeItem.initiativeId` cannot be null. The original ran with nothing below its planning unit.
§13 also directs that managers not plan at ticket-level precision, so a level the model never
plans at earns only a reconciliation burden.

**What survives** — Execution detail still exists; it lives in the delivery tools.

**Rejected by** — D4.

---

## Initiative and Project as separate concepts

**What it was** — Two container concepts: a strategic, temporary Initiative and an optional
Project execution container beneath or beside it.

**Why rejected** — They are behaviourally interchangeable (`J7`): same container shape, same
targeting, same attribution, same retirement. The distinction is asserted in a PRD and encoded
nowhere, and `Project` never received an admin UI. The original shipped only `Initiative`.

**Rejected by** — D4. Both retire in favour of WorkPackage.

---

## A separate estimation grain

**What it was** — `ScopeItem`: a finer record beneath the planning unit carrying the estimates,
skill demand and P50/P90 figures.

**Why rejected** — It splits demand from supply across records that nothing reconciles. `J20`
records the consequence in both implementations: demand hours and allocation hours in unrelated
tables, printed side by side by an endpoint that never compares them. §22 requires demand and
supply to be comparable.

**What survives** — Demand shaped by capability. It is a property of the WorkPackage's demand
rather than a separate body of work.

**Rejected by** — D4.

---

## Commitment inferred from allocation

**What it was** — Treating work as committed because capacity had been allocated to it.

**Why rejected** — §25 forbids important state inferred from accidental record existence. It also
cannot represent the two cases that matter: work planned that nobody asked for, and a promise
made that has not yet been staffed. **OBSERVED** — V1 needed an "intake leakage" metric precisely
to detect the first of these, which is the symptom of the missing concept.

**Rejected by** — D5. A Commitment is its own record with terms.

---

## Priority as a property of the plan

**What it was** — `Scenario.priorityRankings`: an ordinal ranking living on the quarterly plan.

**Why rejected** — It dies with the plan, is scoped to one quarter, is invisible to the
requester, and doubles as an admission list: **OBSERVED**, unranked work carried *zero* demand
rather than low priority. Priority belongs to the demand conversation, not to a plan artefact.

**Rejected by** — D5. Product holds a single durable ranking across requesting organizations.

---

## The ask as an early state of the work

**What it was** — One record that begins life as a request and becomes the body of work, with a
lifecycle carrying the want-versus-committed distinction.

**Why rejected** — A Need and the work that answers it have different owners, different
lifecycles and different editability, and they do not correspond one-to-one: a Need may require
several WorkPackages across several organizations, and a package may serve several Needs.

**Rejected by** — D5.
