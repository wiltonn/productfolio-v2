# Domain Examples

Worked examples for the first-release scope. A proposed model change that cannot represent
these cleanly — definitions and arithmetic — is revised or rejected.

Numbering restarts at this reset (2026-09-05); the enterprise-scope examples X1–X14 are
preserved at git tag `checkpoint/pre-engineering-quarterly-reset`. Each example is
independent unless it says otherwise. All quantities are engineer-weeks (ew); the quarter in
these examples has 13 planning weeks.

Throughout, capacity is time: nothing here predicts output, and no number is discounted for
proficiency.

---

## X1 — A team with part-time capacity, absences and overhead

Team Atlas, Q1:

| Person | Schedule | In force | Contracted |
|---|---|---|---|
| Lena (lead) | full-time | all quarter | 13.0 |
| Rob | full-time | all quarter | 13.0 |
| Chen | full-time | all quarter | 13.0 |
| Dana | full-time | all quarter | 13.0 |
| Priya | 0.6 part-time | all quarter | 7.8 |
| Marta | full-time | joins week 5 (works weeks 5–13) | 9.0 |
| | | **Contracted capacity** | **68.8** |

Known absences: Rob 2 weeks leave = 2.0; Priya 1 week leave at her 0.6 schedule = 0.6.

```
Available workforce capacity = 68.8 − 2.6            = 66.2
Overhead: Lena manages 40% of her time = 0.4 × 13    =  5.2
Net delivery capacity        = 66.2 − 5.2            = 61.0
Overhead ratio               = 5.2 ÷ 66.2            ≈  7.9%   (denominator: available)
```

Checks the definitions: the part-timer's week of leave removes a part-time week (0.6, not
1.0); the joiner contributes only from her effective date; overhead is netted out and
reported with its ratio, not spread across delivery categories.

## X2 — Accepted work that is only partially assigned

WorkPackage "Telemetry pipeline rebuild", category New Development.
Estimate: 20.0 ew — team contributions Atlas 14.0, Beacon 6.0.

Assignments this quarter: Atlas 8.0, Beacon 6.0 → assigned 14.0 of 20.0 estimated.

- State: **assigned, not feasible** (for the full scope). Partial assignment is visible as
  partial and does not imply coverage.
- The Atlas lead's judgment: with 8.0 of the 14.0 Atlas ew, only the ingestion phase lands
  this quarter. Either a reduced-scope commitment ("ingestion phase only") is made — with
  that scope stated on the commitment — or nothing is committed. The full package must not
  be treated as covered because assignments exist.

## X3 — A draft whose assignments exceed delivery capacity

Team Atlas (from X1): net delivery capacity 61.0.

Draft plan: assignments total 55.0, Unplanned Work reserve 9.0.

```
61.0 = 55.0 + 9.0 + headroom   →   headroom = −3.0
```

The draft is overallocated and must report: **shortfall 3.0 ew**. The identity is shown with
the negative term; nothing is scaled down, no assignment is trimmed, and the reserve is not
silently raided to make the numbers balance. Resolving the shortfall is an explicit edit —
reduce assignments, reduce the reserve deliberately, or revisit acceptance.

## X4 — Team totals fit, but a constrained specialist is overloaded

Team Delta: net delivery capacity 40.0. Plan: assigned 36.0 + reserve 3.0 + headroom 1.0 —
the identity balances and the aggregate fits.

Sam is Delta's only search specialist (constrained specialist in the census):
contracted 13.0 − absence 1.0 − overhead 1.0 = **Sam's net capacity 11.0**.

Specialist demand inside the assigned work: WP-A needs 5.0 of Sam, WP-B 4.0, WP-C 4.0 —
total **13.0 against Sam's 11.0**, an overload of 2.0.

Aggregate fit was necessary but insufficient. The lead's feasibility judgment marks WP-C
**not feasible** as sequenced, with the material assumption recorded ("requires 4.0 ew of
search expertise; Sam is the only source and is 2.0 over"). The plan changes only through an
explicit choice: descope, move specialist demand across quarters, or add substitutable help.

## X5 — Cross-team work blocked by a dependency and a delivery window

WorkPackage "Billing cutover", delivery window: must complete this quarter (regulatory).
Contributions: Beacon rates API 6.0 ew; Atlas integration 8.0 ew.
Dependencies: the vendor upgrade completes at the end of month 1 → Beacon can start in
month 2; Atlas integration can start only after Beacon's API completes.

Rough monthly sequencing (required here because a dependency and a window constrain it):

| Month | Beacon API | Atlas integration | Atlas capacity free that month |
|---|---|---|---|
| 1 | blocked (vendor) | blocked | — |
| 2 | 6.0 | blocked | — |
| 3 | — | needs 8.0 | 5.0 |

Both teams have enough **quarter-total** headroom, but all 8.0 Atlas ew must land in
month 3, where only 5.0 are free. The lead records the judgment **not feasible** with its
assumptions (vendor date, month-3 load), and the options — move 3.0 ew of other Atlas work
out of month 3, descope, or renegotiate the window. Quarter-level totals alone would have
called this plan healthy.

## X6 — Unplanned Work consuming reserve without double counting

Team Atlas, approved plan: `61.0 = assigned 48.0 + reserve 9.0 + headroom 4.0`.

Week 6: an urgent authentication patch arrives — estimate 3.0 ew. It is accepted onto the
work list, classified **Sustain & Maintenance**, and assigned 3.0 from the reserve:

```
before   61.0 = 48.0 + 9.0 + 4.0
after    61.0 = 51.0 + 6.0 + 4.0
```

The 3.0 appears exactly once — as a classified assignment. The reserve falls by the same
amount in the same movement; headroom is untouched; the identity stays balanced. Until
consumed, the remaining 6.0 of reserve stays visible as reserve, outside the investment
categories.

## X7 — A mid-quarter revision that preserves the approved baseline

Team Beacon, approved baseline **B**: `30.0 = assigned 24.0 + reserve 4.0 + headroom 2.0`,
including 6.0 assigned to "Rates API v2", committed, with the recorded material assumption
"vendor SDK v3 is API-stable".

Week 6: the assumption breaks — the SDK changes force rework, and the estimate for Beacon's
contribution rises from 6.0 to 9.0. Because a material assumption changed, feasibility is
reassessed, and a revision **R1** is created:

```
B  (preserved, unchanged)   30.0 = 24.0 + 4.0 + 2.0
R1 (live plan)              30.0 = 27.0 + 3.0 + 0.0
```

R1 adds 3.0 ew to the package by consuming the remaining headroom (2.0) and deliberately
reducing the reserve (4.0 → 3.0). The commitment is renegotiated explicitly on the new
feasibility record. Reports now show R1 against B: what was promised at approval versus what
the plan says today. B is never edited.
