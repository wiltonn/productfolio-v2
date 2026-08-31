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

---

## Examples still to be added

Cases that cannot yet be written because the concepts they need are unsettled: one body of work
drawing capacity from four organizations (§14), a commercial need becoming a commitment (§9),
and a scenario deviating from the plan of record (§19).
