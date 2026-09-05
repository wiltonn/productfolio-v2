# Phase 1 — Interface Audit and Proposed Design

**ProductFolio V2 · Engineering quarterly-planning workspace**

| | |
|---|---|
| **Date** | 2026-09-05 |
| **Status** | Awaiting product-owner approval. No application code written. |
| **Examined** | `src/` (2,300 lines), `docs/domain/`, and the running application against the seeded database |
| **Quarter used throughout** | Q1 2027 (synthetic) — 2027-01-04 → 2027-04-02, 65 working days, empty holiday calendar |
| **Visual design** | [Capacity Workspace Redesign](https://claude.ai/code/artifact/f45f71f6-0e7a-4b6b-bb85-1b75f182f848) — mockups, token specimens and an interactive editing demo. Also exported to `docs/design/capacity-workspace-redesign.html`. |

The information architecture is already right: Census, Capacity and Allocations are Engineering-wide
views and no team has to be opened to reach them (D16). What is missing is a consistent visual system
and a way to change a number without reloading the page. This document records what is there now,
what is wrong with it, what must not change, and what I propose to build.

---

## 1. Current implementation

| Concern | How it works today |
|---|---|
| **Runtime** | Node ≥ 22.13, TypeScript executed directly by `tsx`. No build step, no runtime dependencies. |
| **Rendering** | `src/web/views.ts` (735 lines) — one exported function per page, returning HTML as template literals. `escapeHtml` is applied at every interpolation. `layout()` wraps every page. |
| **Styling** | A single `STYLE` constant of 49 CSS rules, inlined into the `<head>` of every response. No stylesheet route and no static-asset route of any kind. |
| **Forms** | Plain `<form method="post">`. Each handler writes through `src/db/repo.ts` and answers `303 See Other` back to a `back` field, which is validated against the `SAFE_BACK` allowlist in `src/web/server.ts`. |
| **Shared state** | Quarter and team ride in the query string (`?q=1&team=2`), rebuilt on every request by `contextFrom()`, defaulting to the earliest quarter. `viewHref()` carries the pair across links. |
| **Persistence** | `node:sqlite`, single file at `data/planning.db`. Every write is a small validated statement; material changes append to the durable `plan_change` log (D15). |
| **Client-side JavaScript** | None. Zero bytes. |
| **Domain layer** | `src/domain/` is pure arithmetic with no I/O — `calendar.ts`, `capacity.ts`, `planning.ts`. `src/plan.ts` assembles a team-quarter and is the only path that records judgments. `src/engineering.ts` is the read model across plans. |
| **Tests** | `node:test`, seven files. `test/workflow.test.ts` boots the real server on an ephemeral port and asserts against fetched HTML, including the X1, X6, X9 and X10 figures. |

**Assessment.** The base is sound. The domain layer is pure and tested, validation lives on the server
where it belongs, and the existing HTTP tests are exactly the regression net a presentation-layer
rewrite needs. Nothing about the architecture obstructs the work; the problems are confined to
`views.ts` and the absence of any client-side layer.

---

## 2. Page inventory

Control counts were measured in the browser against the seeded database (two teams, nine people,
seven work packages).

| Route | Purpose | Interactions | Forms | Visible inputs | Destructive buttons |
|---|---|---|---:|---:|---:|
| `/census` | Everyone in Engineering, grouped by team, with each person's capacity for the quarter | Quarter, team filter; per person: overhead %, schedule change, delete schedule, add absence, delete absence, remove person; add person | 42 | 58 | 12 |
| `/capacity` | The Engineering capacity chain and per-team breakdown | Quarter, team filter. Read-only | 2 | 0 | 0 |
| `/allocations` | Reconciliation, investment mix, work list, planning states, feasibility judgments | Quarter, team filter; per team: reserve; per package: estimate, assignment, remove, record judgment; accept work | 34 | 36 | 7 |
| `/plan/:team/:quarter` | Optional team-quarter detail — the same interactions for one team | Everything above, scoped to one team | 31 | 42 | 9 |
| `/setup` | Quarters, teams, holiday calendar | Add quarter, add team, add holiday, remove holiday | 3 | 6 | 0 |

`GET /` redirects to `/capacity?q=<earliest>`, or to `/setup` when no quarter exists.

---

## 3. Findings

### F1 — The tables are forms, not data

Census presents 58 input boxes and 42 buttons simultaneously. Every person's overhead sits in a live
number field with its own **Set** button; every schedule-change and absence form is a permanently
visible `<details>` disclosure. Reading *who is in Engineering and what is their capacity* means
reading past the controls for changing it.

The same pattern governs Allocations: each work package carries two always-live inputs (estimate and
assignment) with two **Set** buttons.

### F2 — A rejected value is discarded

A validation failure is handled by `errorPage()`, which returns a complete replacement page titled
**Could not save** with a *Go back* link. The typed value, the scroll position and the reader's place
in the table are all lost.

Verified against the running app:

```
POST /people/1/overhead   percent=250
→ 400, full HTML page: "Overhead percent must be between 0 and 100, got 250"
```

The message itself is good — it comes from `validateOverheadPercent()` in the domain layer. The
delivery mechanism throws away the user's work.

### F3 — Every save is a full page reload

Changing one number re-renders and re-fetches the entire page. Setting overhead for six people is six
reloads, each losing focus and scroll position. The figures that actually move are few and known —
the person's row, the team total, the capacity chain, the reconciliation, the planning-state counts —
but the whole document is replaced to show them.

### F4 — Destructive actions are ordinary furniture

Twelve red **Remove person** and **×** buttons sit inside the Census table with no confirmation step.
Removing a person cascades to their schedules and absences, and appends a change-log row for every
quarter their dates touch — which flags every feasibility judgment in that team-quarter for
reassessment (D15), durably, until a fresh judgment is recorded. That is a one-click action presented
at the same visual weight as a filter.

### F5 — Wide tables push the whole page sideways

The nine-column Census table has `width: 100%` and `white-space: nowrap` on numeric cells, with no
scroll container. Measured at a 1280 px window:

```
innerWidth 1280 · document.documentElement.scrollWidth 1293
```

So the document — navigation included — scrolls horizontally on a standard laptop window. There is no
responsive treatment below that width.

### F6 — Shared context is a per-page form

Quarter and team are chosen through **Show** and **Filter** forms rendered inside a card, duplicated
identically on Census, Capacity and Allocations. They are workspace context, not page content, and
changing quarter should not be a two-step submit repeated on three pages.

### What is already right

Worth stating explicitly, because none of it should be lost: the reconciliation identity is spelled
out as an identity, every percentage states its denominator, Beacon's shortfall is called out in words
alongside Atlas's headroom, reassessment reasons are listed per judgment, and synthetic data is
labelled. The content is good. It needs a system that lets it be seen.

---

## 4. Rules the redesign is measured against

Each rule traced from the domain documents to the code that enforces it. None of them changes.

| Rule | Enforced in | What the interface owes it |
|---|---|---|
| **The capacity chain** — contracted − absence = available − overhead = net delivery; ratio = overhead ÷ available | `domain/capacity.ts`; WORKFORCE_CAPACITY_MODEL | Render it as a chain with its operators; state the ratio's denominator on the tile |
| **The reconciliation identity** — net delivery = assigned + reserve + headroom; negative headroom is a shortfall, shown, never adjusted | `domain/planning.ts` `reconcile()`; QUARTERLY_PLANNING_MODEL | Keep the identity visible as an identity; never round a shortfall away or net it into a total |
| **Aggregates come from summed quantities** — never from averaging team percentages (X10: 11.8% correct, 13.9% wrong) | `engineering.ts` | Every percentage renders its denominator; a totals row is never the mean of the rows above |
| **Headroom and shortfall are never netted** — X9: Beacon is 2.9 ew short while Atlas holds 4.0 ew | `engineering.ts` totals | Two separate figures, a named warning, the residual labelled as bookkeeping — and every team listed even under a filter |
| **Feasibility is a judgment, not arithmetic** — a feasible verdict is refused unless capacity is assigned, the team-quarter has no shortfall, and reduced scope is stated | `plan.ts` `recordJudgment()`; D15 | Recording a judgment stays a deliberate multi-field action with required assumptions — never an inline edit |
| **Reassessment is durable** — the change log only grows; reverting a value never revives a judgment | `plan_change` table; `changesSinceJudgment()` | Feasibility states come back from the server after every save; no undo may quietly restore a judgment |
| **A no-change save changes nothing** — `differsMaterially()` at 0.005 ew | `db/repo.ts` | Background saves must not double-post or add spurious change-log entries |
| **The team-quarter owns capacity** — the Engineering views read and total; they never pool or own | D16 | Every editor names the team and quarter it writes to |

---

## 5. Can this stack support inline editing and background saves?

**Yes, and it should — without a framework or a component library.**

I looked for a concrete limitation that would justify a dependency and did not find one. The pages are
small, the forms are simple, the calculations must stay on the server regardless, and the entire
interaction surface reduces to: swap a read cell for an input, post it, put the server's answer back on
the page. That is roughly 180 lines of vanilla JavaScript. React, htmx or Alpine would each add more to
reason about than they remove, and every one of them costs the zero-dependency, no-build-step property
the project chose deliberately.

What does need adding is small and additive:

1. **Two new routes** — `/assets/app.css` and `/assets/app.js`, serving string constants from a new
   `src/web/assets.ts` with a content hash in the filename. Existing page URLs are untouched.
2. **Content negotiation on the existing POST routes** — a request sending `Accept: application/json`
   runs the same handler, the same `repo` call and the same validation, and receives JSON instead of a
   `303`. No new business logic.
3. **Server-rendered fragments** — the JSON carries re-rendered HTML for the regions whose figures
   moved, so the browser never computes a capacity figure.

Without JavaScript every editor remains a real form with a real submit button, and the application
behaves exactly as it does today. The enhancement is layered on, not depended upon.

### The save protocol

| Step | Actor | What happens |
|---|---|---|
| 1 | Browser | The cell commits. It takes the next sequence number for its field key (`overhead:person-1`) and aborts any request still in flight for the same key. |
| 2 | Browser | `POST /people/1/overhead` — the same URL and body the form posts today, plus `Accept: application/json`. |
| 3 | Server | Same handler, same `repo.setOverhead()`, same validation, same change-log rule. |
| 4 | Server | Success: `200` with `{ ok, regions: { … }, status }` — re-rendered HTML for the person row, the team total, the capacity chain, the reconciliation and the state counts. |
| 5 | Server | Rejected value: `422` with `{ ok: false, message }` — the message the domain already produces. |
| 6 | Browser | If the response's sequence number is not the latest for that key, it is discarded. A slow older save can never overwrite a newer value. |
| 7 | Browser | Otherwise each returned region is swapped, focus is restored by a stable key, and the result is announced in one `aria-live="polite"` region. |
| 8 | Browser | On failure the input keeps the typed value, the cell shows **Retry** and **Discard**, and a `beforeunload` guard blocks navigation while anything is dirty or in flight. |

**No optimistic figures.** A pending cell shows the value you typed and a *Saving…* state. It never
shows a recalculated capacity, reconciliation or feasibility state until the server sends one. Nothing
unconfirmed is presented as final, and the browser holds no copy of the capacity arithmetic to fall out
of step with.

---

## 6. Proposed visual direction

Full specimens and mockups are in the design artifact; this is the summary.

- **Palette** — a neutral ramp biased slightly cool (`#f4f6f8` canvas, `#ffffff` surface, `#eef1f6`
  sunken, `#151a21` ink, `#dde2ea` rules), one accent (`#1d4e89`), and three semantic colours used only
  for meaning: `#186b3a` headroom, `#8a5300` attention, `#a01f27` shortfall. Synthetic example data gets
  a quiet grey callout so it can never be mistaken for a warning. Light theme only; tokens structured so
  a dark set is a later swap.
- **Type** — system UI faces, so the app loads no fonts and keeps its zero-dependency promise. Page
  title 23/600, section 14.5/600, body 14/400, micro-labels 10.5/600 uppercase, metrics 26/600. Every
  figure that lines up in a column is tabular and right-aligned, *including inside editing inputs*, so a
  value does not shift sideways when a cell becomes editable.
- **Shell** — top navigation carrying Census, Capacity and Allocations from every page, with Setup set
  apart as utility. Quarter and team move out of page cards into a workspace context bar; the quarter
  persists across navigation and edits, and the team filter is a removable chip.
- **Tables** — their own `overflow-x: auto` container, so the page body never scrolls sideways. Hairline
  rows, no zebra, sunken totals rows with a heavier top rule, right-aligned tabular numerics, and one
  trailing actions column holding a single row-menu button.
- **Capacity chain** — tiles with the operators drawn *between* them, so the arithmetic reads as
  arithmetic, each tile carrying its own denominator note.
- **Callouts** — actionable rather than decorative: an empty holiday calendar explains the assumption it
  forces and links to Setup; a shortfall names the team it stands in.
- **Editing** — read state by default. A discoverable pencil button (mouse and keyboard) opens an
  editor; focusing a cell alone does nothing. Enter commits, Escape cancels, blur commits only when the
  value changed and no commit is in flight. Per-value **Set** buttons are removed from the read view.
- **Multi-field and destructive actions** — native `<dialog>`, naming the affected person, team, quarter
  and effective dates. Destructive actions move into the row menu behind a confirmation that spells out
  what will be removed and what it invalidates.

---

## 7. Kept separate — new business operations and persistence changes

A better editing surface asks for operations the application does not have. None of these is part of
the redesign; they are listed so they can be decided on their own merits.

### 7.1 Setting overhead silently erases its note — **defect**

The Census overhead form has no note field, but `repo.setOverhead()` writes `note = excluded.note`
unconditionally, with `form.note ?? ''` from the handler. Pressing **Set** on a person who has a
recorded note deletes it, even when the percentage is unchanged.

Reproduced against the running app:

```
before  Lena (lead)  40%  "team lead: management & admin"
POST /people/1/overhead   percent=41
after   Lena (lead)  41%  ""
```

**Recommendation:** fix it as its own change — preserve the stored note when the request carries none,
and expose the note in an *Edit overhead* dialog. This alters persistence behaviour, so it needs
explicit approval rather than being folded into visual work.

### 7.2 Operations that do not exist

| Item | What is missing | Recommendation |
|---|---|---|
| **Edit a person** | Name, joined date and left date can only be set at creation. Correcting a typo or a start date means removing and re-adding the person, which deletes their absences and logs two changes. | Needed for the effective-date operations the brief asks for. New operation — flagged, not built. |
| **Edit a WorkPackage** | Only the estimate can be changed. Name, category and notes are fixed after acceptance. Recategorising moves engineer-weeks between investment categories — a planning decision with change-log consequences. | New operation. Decide the change-log rule first. |
| **Edit or remove teams and quarters** | No rename, no delete, no change to a quarter's dates. Changing quarter dates would recompute every capacity figure in it. | New operations. Out of scope. |
| **Undo** | The change log only grows by design (D15): reverting a value is itself a change and must not revive a judgment. A true undo would have to be a forward compensating operation that restores deleted absences and schedules without resurrecting feasibility. | Defer, as the brief directs. Confirmation dialogs carry the weight instead. |
| **Commitments and baselines** | Modelled in `QUARTERLY_PLANNING_MODEL.md` but not implemented — deferred by D14. | Unchanged. The redesign leaves room for them. |

**All four repeatedly-edited numerics already have server operations** — overhead, estimate,
assignment and reserve — so inline editing itself requires no new business behaviour.

---

## 8. Recommended approach

The smallest implementation that meets the brief: keep the stack, add a shared token and component
layer, add the JSON save path to the existing routes, and convert one page at a time. Each step is a
separate commit and each leaves the application working.

| # | Step | What it establishes | Risk |
|---|---|---|---|
| 1 | **Foundation** (`assets.ts`, `ui.ts`, app shell) | Tokens, shell, tables, tiles, callouts, badges, focus states, asset routes. No behaviour change. | None — pure rendering; existing tests assert the figures still appear |
| 2 | **Capacity** | The visual foundation proved on the one page with no editing at all | None |
| 3 | **Census** | The whole editing model: inline overhead, row menus, dialogs for person, schedule and absence, confirmations, background saves | The real risk sits here; it gets the interaction tests |
| 4 | **Allocations** | The same editing applied to estimates, assignments and the reserve; judgments stay a deliberate dialog | Reconciliation and feasibility states must return correct after every save |
| 5 | **Team detail** | Reuses the components; stays a drill-down and does not become an entry point again | None |
| 6 | **Setup** | Quarters, teams and holidays in the same system; the empty-calendar callout gets somewhere to point | None |

### Material tradeoffs

| Choice | Position | Cost |
|---|---|---|
| Vanilla JS, no library | Nothing in the interaction set justifies a dependency, and a dependency costs the no-build-step property | ~180 lines of ours to maintain and test |
| Server-rendered fragments, not a JSON view model | The browser never holds a capacity figure it computed; one rendering path serves both the full page and the update | Regions need stable ids and disciplined focus restoration |
| Commit on blur — **yes** | Guarded by a per-field last-committed value and an in-flight flag, so a blur after Enter is a no-op; the server drops a no-change save anyway | The guard has to be right; it gets a dedicated test |
| Native `<dialog>` | Free modal focus trap, Escape handling and focus restoration, done correctly | Assumes a current browser — acceptable for a local tool |
| Sticky summary above ~1000 px only | Keeps the chain and reconciliation visible while editing on a desktop; below that, content wins | Two layouts to check |
| No arrow-key grid navigation | Incompatible with real buttons and inputs in cells unless a full `role="grid"` pattern with roving `tabindex` is built; done halfway it would be the least accessible part of the page | Power users tab instead |
| Light theme only | Tokens structured for a dark set later; shipping one theme keeps the contrast work honest | Revisit on request |

---

## 9. Verification plan

`npm test` and `npm run typecheck` stay green throughout. The existing suite already asserts that the
X1, X6, X9 and X10 figures appear in the rendered HTML, which is the regression net a visual rewrite
needs. Added on top, posting to the real server with `Accept: application/json`:

- a successful save returns the recalculated regions, and the figures in them are correct;
- a rejected value returns `422` with the domain's own message, and writes nothing;
- two rapid edits to the same field settle on the later value, whichever response lands first;
- re-submitting an unchanged value adds no row to the change log;
- an edit that invalidates a judgment returns that judgment flagged for reassessment;
- quarter and team survive an edit, and the write is scoped to the right team-quarter;
- Beacon's 2.9 ew shortfall stays visible while the view is filtered to Atlas.

Keyboard operation, narrow-screen behaviour and before/after screenshots are checked by driving the
running application, not by reading the source. Work lands on a feature branch as a draft PR; nothing
is merged or deployed.

---

## 10. Decisions requested

1. **Approve the visual and interaction direction** (sections 5–6 and the artifact), or say what to
   change.
2. **Decide the overhead-note defect** (7.1) — fix it as a small separate commit, or leave it and I will
   avoid that code path.
3. **Confirm the deferrals** (7.2) — person editing, WorkPackage editing, team and quarter editing, and
   undo all stay out of this work.

No application code is written yet. On approval, implementation starts at step 1.
