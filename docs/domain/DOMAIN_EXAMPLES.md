# Domain Examples

Concrete cases the model must represent cleanly. A proposed model that cannot express these is
revised or rejected.

Examples are drawn from the evidence packages and re-derived under the settled V2 model. Where
an example's reading changes, the change is stated.

---

## X1 — A full week across several kinds of work

```
Sarah — week of Oct 5, contracted 40h
  Customer capability work    50%
  Sustain                     20%
  Tech debt                   20%
  Management duty             10%
  ──────────────────────────────────
  available 100%   allocated 100%   unallocated 0%   AT
```

Management duty is allocated, not deducted. Sarah has spent her week, not lost part of it.

## X2 — Absence reduces the week

*Derived from `E4` in the workforce-planner evidence.*

```
contracted 100%
  Absence (leave)             40%
  Product work                60%
  ──────────────────────────────────
  available 60%   allocated 60%   unallocated 0%   AT
```

The same answer `E4` gives, without needing a rule that unallocated differs from available. A
naive `100 − allocated` would still wrongly report 40% of headroom; the model avoids it by
subtracting Absence from the denominator rather than by special-casing the arithmetic.

## X3 — Over-allocated while absent

*Derived from `E5`, which reads "over-allocated by reserved time alone".*

```
contracted 100%
  Absence (leave)             60%
  Management duty             50%
  ──────────────────────────────────
  available 40%   allocated 50%   OVER by 10%
```

Under the V2 model this is the plainer statement: someone absent for most of the week has been
given more work than the remainder holds. The original framing — over-allocated by reserved
time alone, with no work at all — was an artefact of counting management as a reduction.

## X4 — A part-time employee at full commitment

*Derived from `E6`.*

```
Employee contracted 20h/week
  Platform work              100%
  ──────────────────────────────────
  available 100%   allocated 100%   AT
  roll-up contribution: 0.5 FTE
```

Full on their own row, half in the team total. Both correct. Note that both existing
implementations report this person as *at* capacity but would also report them at capacity when
over-committed, because each compares against a literal 100 rather than the person's own week.

## X5 — Capacity is not discounted by effectiveness

```
Employee contracted 40h, proficiency 3 of 5 in the required skill
  Work                       100%
  ──────────────────────────────────
  available 100%   allocated 100%   AT
```

The Employee is full. They are not "60% full because they are a level-3 engineer". How much
gets delivered in that time is a question for estimation and capability, not for capacity —
see `original-productfolio/allocation-capacity.md` on `effectiveHours`.

## X6 — Capacity owned in one place, spent in another

```
Employee: Membership in Engineering
  Allocated to work committed to OEM      70%
  Allocated to shared platform work       30%
```

Engineering owns 1.0 FTE of supply. OEM consumes 0.7 of it. Neither statement makes the
Employee organizationally part of OEM. See `ORGANIZATION_MODEL.md`.

## X7 — Engineering's ragged depth

```
Enterprise
└── Engineering
    ├── Platform Engineering  (Engineering Function)
    │   ├── Infrastructure Group        ← intermediate grouping
    │   │   └── Networking Team
    │   └── Data Group
    │       └── Pipelines Team
    └── Developer Experience  (Engineering Function)
        └── Tooling Team                ← no intermediate grouping
```

Both branches are legal. Depth is a property of the data, not a rule of the model, so one
Engineering Function may have a group layer while its sibling does not.

## X8 — A Commercial Division modelled only as deep as its capacity

```
Enterprise
└── OEM  (Commercial Division)
    └── OEM Custom Software  (Team)      ← owns people whose weeks are planned
    ✗ OEM Sales                          ← not modelled
    ✗ OEM Commercial Operations          ← not modelled
```

The Division is a real unit and so is its software team. Its go-to-market functions own people
this system does not plan, so representing them would add structure that answers no question.

## X9 — One capability, four contributing organizations

*The §14 case, expressible once X6 and X8 hold.*

```
An OEM customer capability draws capacity from:
  OEM Custom Software        (Team, under a Commercial Division)
  A Product Area's team      (under Product)
  A shared platform team     (under Engineering)
```

Three Memberships in three branches; three sets of Allocations to **one WorkPackage**. No unit
becomes organizationally part of another, and no contributing team is owned by the sponsor.

## X10 — Ongoing product work is a WorkPackage

```
WorkPackage: "Content parser maintenance"
  no sponsor initiative, no end date framing
  allocations: 100% of one engineer, ongoing
```

*Derived from `E13`, which the evidence calls the case the newer implementation was largely
built to represent — and which that implementation then structurally excluded from "strategic"
because it belonged to no Initiative.* Under V2 there is no such exclusion: it is a WorkPackage
like any other, and how it classifies as investment is a separate question.

## X11 — Demand and supply on the same record

```
WorkPackage: "Dealer portal launch"
  Demand:   backend   3 person-weeks
            design    2 person-weeks
  Supply:   allocations from the OEM Custom Software team and a Product team
```

Both hang off the WorkPackage, so "is this adequately staffed, and in which capability is it
short?" is answerable. In both existing implementations these lived in unrelated tables that no
code compared (`J20`).

## X12 — One Need, three WorkPackages, three organizations

```
Need: "Dealers can quote finance at point of sale"
  requesting organization: Dealer Solutions
  coarse estimate: ~2 quarters
  signals: urgency HIGH, named customer commitment

satisfied by
  WorkPackage "Quoting API"           owner: a Product Area
  WorkPackage "Dealer portal surface"  owner: Dealer Solutions custom software
  WorkPackage "Rate service uplift"    owner: an Engineering platform team
```

The Need belongs to Dealer Solutions; none of the three packages does, and no owning unit
becomes part of Dealer Solutions by contributing. Compare `X9`, which shows the same shape from
the capacity side.

## X13 — A Commitment covering part of a Need

```
Commitment
  answers:  "Dealers can quote finance at point of sale"
  covers:   the Quoting API and the Rate service uplift
  period:   Q3
  agreed:   Product VP (Payments) with the Dealer Solutions lead
  frozen at agreement; the Need remains editable
```

The dealer portal surface is not committed for Q3. The Need is therefore **partly met**, and
stays visible as such — the state V1 could not express, having no commitment concept and four
unrelated things called APPROVED.

## X14 — Planned work nobody asked for

```
WorkPackage "Search index rebuild"
  demand and allocations present
  no Commitment, no Need
```

Legal and visible. It is simply work Product chose to do, distinguishable from committed work
because commitment is a record rather than an inference. **OBSERVED** — V1 needed a dedicated
"intake leakage" metric to find this case at all.

---

## Examples still to be added

Cases that cannot yet be written because the concepts they need are unsettled: one body of work
drawing capacity from four organizations (§14), a commercial need becoming a commitment (§9),
and a scenario deviating from the plan of record (§19).
