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
