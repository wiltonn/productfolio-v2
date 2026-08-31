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
