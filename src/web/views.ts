/**
 * Server-rendered HTML. No client-side framework: an Engineering leader fills in a handful
 * of numbers per quarter, and plain forms are the clearest way to do that.
 */

import { CATEGORIES, STATE_LABELS, type PlanningState } from '../domain/planning.js';
import type { HolidayRow, QuarterRow, TeamRow } from '../db/repo.js';
import type { TeamQuarterPlan, WorkPackageView } from '../plan.js';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const e = escapeHtml;

/** Engineer-weeks, always one decimal so 61 and 61.0 read the same. */
export const ew = (n: number): string => (Math.abs(n) < 0.05 ? '0.0' : n.toFixed(1));
export const pct = (n: number | null): string => (n === null ? '—' : `${n.toFixed(1)}%`);

const STYLE = `
  :root { color-scheme: light; }
  body { font: 15px/1.45 system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; background: #f6f7f9; color: #1c1e21; }
  header { background: #1f3a5f; color: #fff; padding: 0.7rem 1.5rem; display: flex; gap: 1.5rem; align-items: baseline; }
  header a { color: #fff; }
  main { max-width: 1180px; margin: 0 auto; padding: 1rem 1.5rem 4rem; }
  h1 { font-size: 1.5rem; margin: 0.8rem 0; }
  h2 { font-size: 1.15rem; margin: 2rem 0 0.6rem; border-bottom: 2px solid #d5d9e0; padding-bottom: 0.25rem; }
  h3 { font-size: 1rem; margin: 1rem 0 0.4rem; }
  section.card { background: #fff; border: 1px solid #d5d9e0; border-radius: 6px; padding: 1rem 1.2rem; margin: 0.8rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
  th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #e3e6eb; vertical-align: top; }
  th { background: #eef1f5; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  form.inline { display: inline-flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; margin: 0.15rem 0; }
  form.block { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem 0.8rem; align-items: end; margin: 0.5rem 0; }
  form.block label, form.inline label { display: flex; flex-direction: column; font-size: 0.85rem; color: #444; }
  form.block label.wide { grid-column: 1 / -1; }
  input, select, textarea { font: inherit; padding: 0.3rem 0.4rem; border: 1px solid #b8bec8; border-radius: 4px; }
  input[type=number] { width: 5.5rem; }
  input[type=date] { width: 10rem; }
  button { font: inherit; padding: 0.35rem 0.8rem; border: 1px solid #1f3a5f; background: #1f3a5f; color: #fff; border-radius: 4px; cursor: pointer; }
  button.quiet { background: #fff; color: #1f3a5f; }
  button.danger { background: #fff; color: #9b1c1c; border-color: #9b1c1c; padding: 0.15rem 0.5rem; font-size: 0.85rem; }
  .muted { color: #5f6673; font-size: 0.9rem; }
  .note { background: #fff8e1; border: 1px solid #f1d78a; padding: 0.5rem 0.8rem; border-radius: 4px; margin: 0.5rem 0; }
  .error { background: #fdecea; border: 1px solid #e5a3a3; padding: 0.6rem 0.9rem; border-radius: 4px; }
  .ok { color: #1a6b2f; font-weight: 600; }
  .shortfall { color: #9b1c1c; font-weight: 700; }
  .chain { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.6rem; }
  .chain div { background: #eef1f5; border-radius: 6px; padding: 0.6rem 0.8rem; }
  .chain .label { font-size: 0.8rem; color: #5f6673; }
  .chain .value { font-size: 1.35rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
  .badge.accepted { background: #e8eaee; color: #3c4350; }
  .badge.partially_assigned { background: #fff1d6; color: #7a4d00; }
  .badge.assigned { background: #dfe9f7; color: #1f3a5f; }
  .badge.feasible { background: #d9f0e0; color: #1a6b2f; }
  .badge.stale { background: #fdecea; color: #9b1c1c; }
  details summary { cursor: pointer; color: #1f3a5f; }
  ul.reasons { margin: 0.2rem 0 0; padding-left: 1.1rem; font-size: 0.8rem; }
  .synthetic { background: #e8f0fe; border: 1px solid #a9c2ec; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.9rem; }
`;

export function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} — ProductFolio</title><style>${STYLE}</style></head>
<body><header><strong>ProductFolio</strong> <span>Engineering quarterly planning</span> <a href="/">Home</a></header>
<main>${body}</main></body></html>`;
}

export function errorPage(message: string, backHref: string): string {
  return layout(
    'Could not save',
    `<h1>Could not save</h1><p class="error">${e(message)}</p><p><a href="${e(backHref)}">Go back</a></p>`,
  );
}

export function indexPage(input: { quarters: QuarterRow[]; teams: TeamRow[]; holidays: HolidayRow[] }): string {
  const { quarters, teams, holidays } = input;
  const plans =
    quarters.length && teams.length
      ? `<table><tr><th>Team</th><th>Quarter</th><th>Dates</th><th></th></tr>${teams
          .map((t) =>
            quarters
              .map(
                (q) =>
                  `<tr><td>${e(t.name)}</td><td>${e(q.name)}</td><td>${e(q.start)} → ${e(q.end)}</td>
                   <td><a href="/plan/${t.id}/${q.id}">Open plan</a></td></tr>`,
              )
              .join(''),
          )
          .join('')}</table>`
      : `<p class="muted">Create a team and a quarter to open a plan. Or run <code>npm run seed</code> for a synthetic example.</p>`;

  return layout(
    'Home',
    `<h1>Team-quarter plans</h1>
${plans}

<h2>Quarters</h2>
<section class="card">
<p class="muted">A quarter is an inclusive date range. Capacity is computed from the Monday–Friday working days inside it.</p>
<form class="block" method="post" action="/quarters">
  <label>Name <input name="name" required placeholder="Q1 2027"></label>
  <label>Start <input type="date" name="start" required></label>
  <label>End <input type="date" name="end" required></label>
  <div><button>Add quarter</button></div>
</form>
</section>

<h2>Teams</h2>
<section class="card">
<form class="block" method="post" action="/teams">
  <label>Name <input name="name" required placeholder="Team name"></label>
  <div><button>Add team</button></div>
</form>
</section>

<h2>Holiday calendar</h2>
<section class="card">
<p class="muted">Organization-wide holidays, entered deliberately. The system assumes no jurisdiction and fetches nothing.
Holidays count as known absence for everyone in force that day; a holiday on a weekend has no effect; a holiday inside
someone's leave is counted once.</p>
${
  holidays.length
    ? `<table><tr><th>Date</th><th>Name</th><th></th></tr>${holidays
        .map(
          (h) =>
            `<tr><td>${e(h.date)}</td><td>${e(h.name)}</td><td><form class="inline" method="post" action="/holidays/delete">
             <input type="hidden" name="date" value="${e(h.date)}"><button class="danger">Remove</button></form></td></tr>`,
        )
        .join('')}</table>`
    : `<p class="muted">No holidays entered.</p>`
}
<form class="block" method="post" action="/holidays">
  <label>Date <input type="date" name="date" required></label>
  <label>Name <input name="name" required placeholder="e.g. Founders' Day"></label>
  <div><button>Add holiday</button></div>
</form>
</section>`,
  );
}

function stateBadge(wp: WorkPackageView): string {
  const { state, needsReassessment, reassessmentReasons } = wp.assessment;
  const base = `<span class="badge ${state}">${e(STATE_LABELS[state])}</span>`;
  if (!needsReassessment) return base;
  const why = reassessmentReasons.map((r) => `<li>${e(r)}</li>`).join('');
  return `${base}<br><span class="badge stale">judgment needs reassessment</span><div class="muted">changes since it was recorded:</div><ul class="muted reasons">${why}</ul>`;
}

export function planPage(plan: TeamQuarterPlan, opts: { synthetic?: boolean } = {}): string {
  const { team, quarter, capacity, reconciliation: rec, mix } = plan;
  const base = `/plan/${team.id}/${quarter.id}`;
  const isSynthetic = opts.synthetic || /synthetic/i.test(team.name) || /synthetic/i.test(quarter.name);

  const peopleRows = plan.people
    .map((p) => {
      const cap = capacity.people.find((c) => c.personId === p.id)!;
      const schedules = p.scheduleRows
        .slice()
        .sort((a, b) => (a.effectiveFrom ?? '') < (b.effectiveFrom ?? '') ? -1 : 1)
        .map(
          (s) =>
            `${(s.fraction * 100).toFixed(0)}% ${s.effectiveFrom ? `from ${e(s.effectiveFrom)}` : '(initial)'}${
              s.effectiveFrom
                ? ` <form class="inline" method="post" action="/schedules/${s.id}/delete"><input type="hidden" name="back" value="${base}"><button class="danger">×</button></form>`
                : ''
            }`,
        )
        .join('<br>');
      const absences = p.absenceRows.length
        ? p.absenceRows
            .map(
              (a) =>
                `${e(a.from)} → ${e(a.to)}${a.note ? ` <span class="muted">(${e(a.note)})</span>` : ''}
                 <form class="inline" method="post" action="/absences/${a.id}/delete"><input type="hidden" name="back" value="${base}"><button class="danger">×</button></form>`,
            )
            .join('<br>')
        : '<span class="muted">none</span>';
      return `<tr>
  <td><strong>${e(p.name)}</strong><br><span class="muted">${p.joined ? `joined ${e(p.joined)}` : 'in force at start'}${
    p.left ? `, left ${e(p.left)}` : ''
  }</span>
    <form class="inline" method="post" action="/people/${p.id}/delete"><input type="hidden" name="back" value="${base}"><button class="danger">Remove person</button></form></td>
  <td>${schedules}
    <details><summary>Change schedule</summary>
    <form class="inline" method="post" action="/people/${p.id}/schedules"><input type="hidden" name="back" value="${base}">
      <label>Fraction <input type="number" name="fraction" step="0.05" min="0.05" max="1" required placeholder="0.6"></label>
      <label>Effective from <input type="date" name="effective_from" required></label>
      <button class="quiet">Add</button></form></details></td>
  <td>${absences}
    <details><summary>Add absence</summary>
    <form class="inline" method="post" action="/people/${p.id}/absences"><input type="hidden" name="back" value="${base}">
      <label>From <input type="date" name="from" required></label>
      <label>To <input type="date" name="to" required></label>
      <label>Note <input name="note" placeholder="leave"></label>
      <button class="quiet">Add</button></form></details></td>
  <td class="num">${cap.workingDaysInForce}</td>
  <td class="num">${ew(cap.contractedEw)}</td>
  <td class="num">${ew(cap.absenceEw)}<br><span class="muted">${cap.absenceDays} days</span></td>
  <td class="num">${ew(cap.availableEw)}</td>
  <td class="num">${ew(cap.overheadEw)}<br>
    <form class="inline" method="post" action="/people/${p.id}/overhead"><input type="hidden" name="back" value="${base}"><input type="hidden" name="quarter_id" value="${quarter.id}">
      <input type="number" name="percent" step="1" min="0" max="100" value="${p.overheadPercent}" title="Overhead as % of this person's available capacity">%
      <button class="quiet">Set</button></form>${p.overheadNote ? `<span class="muted">${e(p.overheadNote)}</span>` : ''}</td>
  <td class="num"><strong>${ew(cap.netDeliveryEw)}</strong></td>
</tr>`;
    })
    .join('');

  const wpRows = plan.workPackages
    .map((wp) => {
      const j = wp.judgment;
      const judgmentHtml = j
        ? `<div><strong>${j.verdict === 'feasible' ? 'Feasible' : 'Not feasible'}</strong> — ${e(j.judgedBy)}, ${e(j.judgedAt.slice(0, 10))}
           ${j.scopeNote ? `<br><em>Scope:</em> ${e(j.scopeNote)}` : ''}<br><em>Assumptions:</em> ${e(j.assumptions)}</div>`
        : '<span class="muted">No judgment recorded.</span>';
      return `<tr>
  <td><strong>${e(wp.name)}</strong>${wp.notes ? `<br><span class="muted">${e(wp.notes)}</span>` : ''}
    <form class="inline" method="post" action="/work-packages/${wp.id}/delete"><input type="hidden" name="back" value="${base}"><button class="danger">Remove</button></form></td>
  <td>${e(wp.category)}</td>
  <td class="num"><form class="inline" method="post" action="/work-packages/${wp.id}/estimate"><input type="hidden" name="back" value="${base}">
    <input type="number" name="estimate_ew" step="0.1" min="0" value="${wp.estimateEw}"> <button class="quiet">Set</button></form></td>
  <td class="num"><form class="inline" method="post" action="/work-packages/${wp.id}/assignment"><input type="hidden" name="back" value="${base}"><input type="hidden" name="team_id" value="${team.id}">
    <input type="number" name="engineer_weeks" step="0.1" min="0" value="${wp.assignedEw}"> <button class="quiet">Set</button></form>
    <br><span class="muted">${ew(wp.assignedEw)} of ${ew(wp.estimateEw)} estimated</span></td>
  <td>${stateBadge(wp)}</td>
  <td>${judgmentHtml}
    <details><summary>Record feasibility judgment</summary>
    <form class="block" method="post" action="/work-packages/${wp.id}/feasibility"><input type="hidden" name="back" value="${base}">
      <label>Verdict <select name="verdict"><option value="feasible">Feasible</option><option value="not_feasible">Not feasible</option></select></label>
      <label>Judged by (technical lead) <input name="judged_by" required></label>
      <label class="wide">Material assumptions <textarea name="assumptions" rows="2" required placeholder="What this judgment rests on: estimates held, specialist availability, dependencies, delivery window…"></textarea></label>
      <label class="wide">Reduced scope this judgment covers (required when assigned &lt; estimate) <input name="scope_note" placeholder="e.g. ingestion phase only"></label>
      <div><button>Record judgment</button></div>
    </form></details></td>
</tr>`;
    })
    .join('');

  const stateSummary = (Object.keys(STATE_LABELS) as PlanningState[])
    .map((s) => `<span class="badge ${s}">${e(STATE_LABELS[s])}: ${plan.stateCounts[s]}</span>`)
    .join(' ');

  const headroomCell =
    rec.shortfallEw > 0
      ? `<span class="shortfall">SHORTFALL ${ew(rec.shortfallEw)} ew</span><br><span class="muted">headroom ${ew(rec.headroomEw)}</span>`
      : `<span class="ok">${ew(rec.headroomEw)} ew headroom</span>`;

  return layout(
    `${team.name} · ${quarter.name}`,
    `<h1>${e(team.name)} · ${e(quarter.name)}</h1>
<p class="muted">${e(quarter.start)} → ${e(quarter.end)} · ${plan.workingDaysInQuarter} working days (Mon–Fri) · ${
      plan.holidaysInQuarter.length
    } holiday${plan.holidaysInQuarter.length === 1 ? '' : 's'} in this quarter${
      plan.holidayCalendarSize === 0 ? ' · <strong>holiday calendar is empty</strong>' : ''
    } · unit: engineer-weeks (ew), where 1 ew = 5 working days at a full-time schedule</p>
${isSynthetic ? `<p class="synthetic">Synthetic example data. Names and figures are invented for illustration and match worked example X1/X6 in <code>docs/domain/DOMAIN_EXAMPLES.md</code>.</p>` : ''}

<h2>1 · Capacity chain</h2>
<section class="card">
<div class="chain">
  <div><div class="label">Contracted capacity</div><div class="value">${ew(capacity.contractedEw)} ew</div><div class="muted">schedules × effective dates</div></div>
  <div><div class="label">− Known absences</div><div class="value">${ew(capacity.absenceEw)} ew</div><div class="muted">holidays ∪ leave, once per day</div></div>
  <div><div class="label">= Available workforce capacity</div><div class="value">${ew(capacity.availableEw)} ew</div></div>
  <div><div class="label">− Overhead</div><div class="value">${ew(capacity.overheadEw)} ew</div><div class="muted">management &amp; admin, reported separately</div></div>
  <div><div class="label">= Net delivery capacity</div><div class="value">${ew(capacity.netDeliveryEw)} ew</div></div>
  <div><div class="label">Overhead ratio</div><div class="value">${pct(capacity.overheadRatio === null ? null : capacity.overheadRatio * 100)}</div><div class="muted">overhead ÷ available workforce capacity</div></div>
</div>
</section>

<h2>2 · Census</h2>
<section class="card">
<table>
<tr><th>Person</th><th>Working schedule</th><th>Known absences (leave)</th><th class="num">Days in force</th><th class="num">Contracted</th><th class="num">Absence</th><th class="num">Available</th><th class="num">Overhead</th><th class="num">Net delivery</th></tr>
${peopleRows || '<tr><td colspan="9" class="muted">No people yet.</td></tr>'}
<tr><th>Team total</th><th></th><th></th><th></th><th class="num">${ew(capacity.contractedEw)}</th><th class="num">${ew(capacity.absenceEw)}</th><th class="num">${ew(capacity.availableEw)}</th><th class="num">${ew(capacity.overheadEw)}</th><th class="num">${ew(capacity.netDeliveryEw)}</th></tr>
</table>
<p class="muted">All figures in engineer-weeks. Overhead is entered as a percentage of the person's own available capacity for this quarter.
Days in force = Mon–Fri days between the person's joined/left dates within the quarter that carry a schedule.</p>
<h3>Add a person</h3>
<form class="block" method="post" action="${base}/people">
  <label>Name <input name="name" required></label>
  <label>Schedule fraction (1 = full-time) <input type="number" name="fraction" step="0.05" min="0.05" max="1" value="1" required></label>
  <label>Joined (blank = before quarter) <input type="date" name="joined"></label>
  <label>Left (blank = still here) <input type="date" name="left"></label>
  <div><button>Add person</button></div>
</form>
</section>

<h2>3 · Quarterly work list</h2>
<section class="card">
<p>${stateSummary}</p>
<p class="muted">States are non-overlapping. <strong>Feasible</strong> requires a recorded technical-lead judgment; the arithmetic never confers it.
A feasible verdict is refused unless capacity is assigned, the team-quarter has no shortfall, and — when assigned capacity is below the estimate — the reduced scope is stated.
A judgment is flagged for reassessment, and stops counting as feasible, when any planning input of this team-quarter changes after it was made: people, schedules,
absences, holidays, overhead, the Unplanned Work reserve, any assignment (competing ones included, even when totals still fit), or this package's own estimate.
The flag persists until a fresh judgment is recorded — reverting the change, or a later change that happens to restore the totals, does not clear it.
Re-saving an unchanged value records no change. Judgment history is kept.</p>
<table>
<tr><th>WorkPackage</th><th>Category</th><th class="num">Estimate (this team, ew)</th><th class="num">Assigned (ew)</th><th>State</th><th>Feasibility judgment</th></tr>
${wpRows || '<tr><td colspan="6" class="muted">No work accepted yet.</td></tr>'}
</table>
<h3>Accept a WorkPackage onto the list</h3>
<form class="block" method="post" action="${base}/work-packages">
  <label>Name <input name="name" required></label>
  <label>Delivery investment category <select name="category">${CATEGORIES.map((c) => `<option>${e(c)}</option>`).join('')}</select></label>
  <label>Rough estimate — this team's contribution (ew) <input type="number" name="estimate_ew" step="0.1" min="0" required></label>
  <label class="wide">Notes <input name="notes"></label>
  <div><button>Accept onto work list</button></div>
</form>
</section>

<h2>4 · Reconciliation</h2>
<section class="card">
<table>
<tr><th>Net delivery capacity</th><th class="num">${ew(rec.netDeliveryEw)} ew</th><td class="muted">from the capacity chain</td></tr>
<tr><th>Assigned delivery capacity</th><th class="num">${ew(rec.assignedEw)} ew</th><td class="muted">sum of assignments above</td></tr>
<tr><th>Unplanned Work reserve</th><th class="num">${ew(rec.reserveEw)} ew</th><td>
  <form class="inline" method="post" action="${base}/reserve"><input type="number" name="engineer_weeks" step="0.1" min="0" value="${rec.reserveEw}"> ew <button class="quiet">Set reserve</button></form>
  <span class="muted">explicit reserve for work not yet known; not overhead, not headroom, unclassified until consumed</span></td></tr>
<tr><th>Remaining unassigned headroom</th><th class="num">${headroomCell}</th><td class="muted">net − assigned − reserve</td></tr>
</table>
<p><code>${ew(rec.netDeliveryEw)} = ${ew(rec.assignedEw)} + ${ew(rec.reserveEw)} + (${ew(rec.headroomEw)})</code>
${rec.shortfallEw > 0 ? '<span class="shortfall">— this draft is overallocated; nothing has been adjusted to hide it.</span>' : ''}</p>

<h3>Delivery investment mix</h3>
<table>
<tr><th>Category</th><th class="num">Assigned (ew)</th><th class="num">% of net delivery capacity (${ew(mix.denominatorEw)} ew)</th></tr>
${CATEGORIES.map((c) => `<tr><td>${e(c)}</td><td class="num">${ew(mix.byCategory[c].ew)}</td><td class="num">${pct(mix.byCategory[c].percent)}</td></tr>`).join('')}
<tr><td class="muted">Unplanned Work reserve (unclassified)</td><td class="num">${ew(mix.reserve.ew)}</td><td class="num">${pct(mix.reserve.percent)}</td></tr>
<tr><td class="muted">Unassigned headroom${rec.shortfallEw > 0 ? ' (negative: shortfall)' : ''}</td><td class="num">${ew(mix.headroom.ew)}</td><td class="num">${pct(mix.headroom.percent)}</td></tr>
</table>
<p class="muted">Percentages describe investment shape only; they never show whether work fits. Fit is the reconciliation above plus the recorded feasibility judgments.</p>
</section>`,
  );
}
