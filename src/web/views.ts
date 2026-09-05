/**
 * Server-rendered HTML. No client-side framework: an Engineering leader fills in a handful
 * of numbers per quarter, and plain forms are the clearest way to do that.
 *
 * Three Engineering-wide views — Census, Capacity, Allocations — are the primary workspace;
 * no team needs to be opened to reach them. The team-quarter page remains available as
 * optional detail, and every edit form carries the team it affects.
 */

import { CATEGORIES, STATE_LABELS, type PlanningState } from '../domain/planning.js';
import type { HolidayRow, PersonRecord, QuarterRow, TeamRow } from '../db/repo.js';
import type { PersonCapacity } from '../domain/capacity.js';
import type { EngineeringQuarter, EngineeringTotals } from '../engineering.js';
import { shareOfNetDelivery } from '../engineering.js';
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
  header { background: #1f3a5f; color: #fff; padding: 0.7rem 1.5rem; }
  header .brand { font-weight: 700; margin-right: 1rem; }
  header nav { display: inline-flex; gap: 0.4rem; flex-wrap: wrap; }
  header nav a { color: #cfe0f5; text-decoration: none; padding: 0.25rem 0.7rem; border-radius: 4px; }
  header nav a.active { background: #fff; color: #1f3a5f; font-weight: 600; }
  main { max-width: 1240px; margin: 0 auto; padding: 1rem 1.5rem 4rem; }
  h1 { font-size: 1.5rem; margin: 0.8rem 0 0.2rem; }
  h2 { font-size: 1.15rem; margin: 2rem 0 0.6rem; border-bottom: 2px solid #d5d9e0; padding-bottom: 0.25rem; }
  h3 { font-size: 1rem; margin: 1rem 0 0.4rem; }
  section.card { background: #fff; border: 1px solid #d5d9e0; border-radius: 6px; padding: 1rem 1.2rem; margin: 0.8rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
  th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #e3e6eb; vertical-align: top; }
  th { background: #eef1f5; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.group td { background: #f0f3f8; font-weight: 600; }
  tr.total td, tr.total th { background: #eef1f5; font-weight: 700; }
  form.inline { display: inline-flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; margin: 0.15rem 0; }
  form.block { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem 0.8rem; align-items: end; margin: 0.5rem 0; }
  form.block label, form.inline label { display: flex; flex-direction: column; font-size: 0.85rem; color: #444; }
  form.block label.wide { grid-column: 1 / -1; }
  form.bar { display: flex; gap: 0.6rem; align-items: end; flex-wrap: wrap; }
  input, select, textarea { font: inherit; padding: 0.3rem 0.4rem; border: 1px solid #b8bec8; border-radius: 4px; }
  input[type=number] { width: 5.5rem; }
  input[type=date] { width: 10rem; }
  button { font: inherit; padding: 0.35rem 0.8rem; border: 1px solid #1f3a5f; background: #1f3a5f; color: #fff; border-radius: 4px; cursor: pointer; }
  button.quiet { background: #fff; color: #1f3a5f; }
  button.danger { background: #fff; color: #9b1c1c; border-color: #9b1c1c; padding: 0.15rem 0.5rem; font-size: 0.85rem; }
  .muted { color: #5f6673; font-size: 0.9rem; }
  .error { background: #fdecea; border: 1px solid #e5a3a3; padding: 0.6rem 0.9rem; border-radius: 4px; }
  .warn { background: #fdecea; border: 1px solid #e5a3a3; padding: 0.5rem 0.9rem; border-radius: 4px; margin: 0.5rem 0; }
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
  .badge.team { background: #e8eaee; color: #3c4350; font-weight: 500; }
  details summary { cursor: pointer; color: #1f3a5f; }
  ul.reasons { margin: 0.2rem 0 0; padding-left: 1.1rem; font-size: 0.8rem; }
  .synthetic { background: #e8f0fe; border: 1px solid #a9c2ec; padding: 0.4rem 0.8rem; border-radius: 4px; font-size: 0.9rem; }
`;

export type Tab = 'census' | 'capacity' | 'allocations' | 'setup' | 'team';

/** The Engineering-wide views share one quarter selection, carried in the query string. */
export interface ViewContext {
  quarterId: number | null;
  teamId: number | null;
}

export function viewHref(path: string, ctx: ViewContext, over: Partial<ViewContext> = {}): string {
  const merged = { ...ctx, ...over };
  const params: string[] = [];
  if (merged.quarterId !== null) params.push(`q=${merged.quarterId}`);
  if (merged.teamId !== null) params.push(`team=${merged.teamId}`);
  return params.length ? `${path}?${params.join('&')}` : path;
}

function nav(active: Tab, ctx: ViewContext): string {
  const item = (tab: Tab, path: string, label: string) =>
    `<a href="${e(viewHref(path, ctx))}"${active === tab ? ' class="active"' : ''}>${e(label)}</a>`;
  return `<nav>${item('census', '/census', 'Census')}${item('capacity', '/capacity', 'Capacity')}${item(
    'allocations',
    '/allocations',
    'Allocations',
  )}${item('setup', '/setup', 'Setup')}</nav>`;
}

export function layout(title: string, body: string, active: Tab = 'setup', ctx: ViewContext = { quarterId: null, teamId: null }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} — ProductFolio</title><style>${STYLE}</style></head>
<body><header><span class="brand">ProductFolio</span> ${nav(active, ctx)}</header>
<main>${body}</main></body></html>`;
}

export function errorPage(message: string, backHref: string): string {
  return layout(
    'Could not save',
    `<h1>Could not save</h1><p class="error">${e(message)}</p><p><a href="${e(backHref)}">Go back</a></p>`,
  );
}

// ---- shared controls ---------------------------------------------------------------------------

function quarterSelector(path: string, quarters: QuarterRow[], ctx: ViewContext, label = 'Quarter'): string {
  if (!quarters.length) return `<p class="muted">No quarters defined yet — add one under <a href="/setup">Setup</a>.</p>`;
  const teamField = ctx.teamId !== null ? `<input type="hidden" name="team" value="${ctx.teamId}">` : '';
  return `<form class="bar" method="get" action="${e(path)}">
  <label>${e(label)} <select name="q">${quarters
    .map((q) => `<option value="${q.id}"${q.id === ctx.quarterId ? ' selected' : ''}>${e(q.name)}</option>`)
    .join('')}</select></label>${teamField}
  <button class="quiet">Show</button>
</form>`;
}

function teamFilter(path: string, teams: TeamRow[], ctx: ViewContext): string {
  if (teams.length < 2) return '';
  const quarterField = ctx.quarterId !== null ? `<input type="hidden" name="q" value="${ctx.quarterId}">` : '';
  return `<form class="bar" method="get" action="${e(path)}">
  <label>Team <select name="team"><option value="">All teams</option>${teams
    .map((t) => `<option value="${t.id}"${t.id === ctx.teamId ? ' selected' : ''}>${e(t.name)}</option>`)
    .join('')}</select></label>${quarterField}
  <button class="quiet">Filter</button>
  ${ctx.teamId !== null ? `<a href="${e(viewHref(path, ctx, { teamId: null }))}">Clear filter</a>` : ''}
</form>`;
}

function teamSelect(name: string, teams: TeamRow[], selected: number | null = null): string {
  return `<select name="${e(name)}" required>${teams
    .map((t) => `<option value="${t.id}"${t.id === selected ? ' selected' : ''}>${e(t.name)}</option>`)
    .join('')}</select>`;
}

const syntheticNote = (names: string[]): string =>
  names.some((n) => /synthetic/i.test(n))
    ? `<p class="synthetic">Includes synthetic example data. Names and figures are invented for illustration and match the worked examples in <code>docs/domain/DOMAIN_EXAMPLES.md</code>.</p>`
    : '';

// ---- shared fragments --------------------------------------------------------------------------

/** Person row cells shared by the census and the team page. `back` returns here after an edit. */
function personCells(p: PersonRecord, cap: PersonCapacity, quarterId: number, back: string, teamName?: string): string {
  const schedules = p.scheduleRows
    .slice()
    .sort((a, b) => ((a.effectiveFrom ?? '') < (b.effectiveFrom ?? '') ? -1 : 1))
    .map(
      (s) =>
        `${(s.fraction * 100).toFixed(0)}% ${s.effectiveFrom ? `from ${e(s.effectiveFrom)}` : '(initial)'}${
          s.effectiveFrom
            ? ` <form class="inline" method="post" action="/schedules/${s.id}/delete"><input type="hidden" name="back" value="${e(back)}"><button class="danger">×</button></form>`
            : ''
        }`,
    )
    .join('<br>');
  const absences = p.absenceRows.length
    ? p.absenceRows
        .map(
          (a) =>
            `${e(a.from)} → ${e(a.to)}${a.note ? ` <span class="muted">(${e(a.note)})</span>` : ''}
             <form class="inline" method="post" action="/absences/${a.id}/delete"><input type="hidden" name="back" value="${e(back)}"><button class="danger">×</button></form>`,
        )
        .join('<br>')
    : '<span class="muted">none</span>';

  return `<td><strong>${e(p.name)}</strong>${teamName ? `<br><span class="badge team">${e(teamName)}</span>` : ''}
    <br><span class="muted">${p.joined ? `joined ${e(p.joined)}` : 'in force at start'}${p.left ? `, left ${e(p.left)}` : ''}</span>
    <form class="inline" method="post" action="/people/${p.id}/delete"><input type="hidden" name="back" value="${e(back)}"><button class="danger">Remove person</button></form></td>
  <td>${schedules}
    <details><summary>Change schedule</summary>
    <form class="inline" method="post" action="/people/${p.id}/schedules"><input type="hidden" name="back" value="${e(back)}">
      <label>Fraction <input type="number" name="fraction" step="0.05" min="0.05" max="1" required placeholder="0.6"></label>
      <label>Effective from <input type="date" name="effective_from" required></label>
      <button class="quiet">Add</button></form></details></td>
  <td>${absences}
    <details><summary>Add absence</summary>
    <form class="inline" method="post" action="/people/${p.id}/absences"><input type="hidden" name="back" value="${e(back)}">
      <label>From <input type="date" name="from" required></label>
      <label>To <input type="date" name="to" required></label>
      <label>Note <input name="note" placeholder="leave"></label>
      <button class="quiet">Add</button></form></details></td>
  <td class="num">${cap.workingDaysInForce}</td>
  <td class="num">${ew(cap.contractedEw)}</td>
  <td class="num">${ew(cap.absenceEw)}<br><span class="muted">${cap.absenceDays} days</span></td>
  <td class="num">${ew(cap.availableEw)}</td>
  <td class="num">${ew(cap.overheadEw)}<br>
    <form class="inline" method="post" action="/people/${p.id}/overhead"><input type="hidden" name="back" value="${e(back)}"><input type="hidden" name="quarter_id" value="${quarterId}">
      <input type="number" name="percent" step="1" min="0" max="100" value="${p.overheadPercent}" title="Overhead as % of this person's available capacity">%
      <button class="quiet">Set</button></form>${p.overheadNote ? `<span class="muted">${e(p.overheadNote)}</span>` : ''}</td>
  <td class="num"><strong>${ew(cap.netDeliveryEw)}</strong></td>`;
}

const PERSON_HEADER = `<tr><th>Person</th><th>Working schedule</th><th>Known absences (leave)</th><th class="num">Days in force</th>
<th class="num">Contracted</th><th class="num">Absence</th><th class="num">Available</th><th class="num">Overhead</th><th class="num">Net delivery</th></tr>`;

function stateBadge(wp: WorkPackageView): string {
  const { state, needsReassessment, reassessmentReasons } = wp.assessment;
  const base = `<span class="badge ${state}">${e(STATE_LABELS[state])}</span>`;
  if (!needsReassessment) return base;
  const why = reassessmentReasons.map((r) => `<li>${e(r)}</li>`).join('');
  return `${base}<br><span class="badge stale">judgment needs reassessment</span><div class="muted">changes since it was recorded:</div><ul class="muted reasons">${why}</ul>`;
}

/** Work package row shared by the allocations view and the team page. */
function workPackageRow(wp: WorkPackageView, teamId: number, back: string, teamName?: string): string {
  const j = wp.judgment;
  const judgmentHtml = j
    ? `<div><strong>${j.verdict === 'feasible' ? 'Feasible' : 'Not feasible'}</strong> — ${e(j.judgedBy)}, ${e(j.judgedAt.slice(0, 10))}
       ${j.scopeNote ? `<br><em>Scope:</em> ${e(j.scopeNote)}` : ''}<br><em>Assumptions:</em> ${e(j.assumptions)}</div>`
    : '<span class="muted">No judgment recorded.</span>';
  return `<tr>
  <td><strong>${e(wp.name)}</strong>${teamName ? `<br><span class="badge team">${e(teamName)}</span>` : ''}
    ${wp.notes ? `<br><span class="muted">${e(wp.notes)}</span>` : ''}
    <form class="inline" method="post" action="/work-packages/${wp.id}/delete"><input type="hidden" name="back" value="${e(back)}"><button class="danger">Remove</button></form></td>
  <td>${e(wp.category)}</td>
  <td class="num"><form class="inline" method="post" action="/work-packages/${wp.id}/estimate"><input type="hidden" name="back" value="${e(back)}">
    <input type="number" name="estimate_ew" step="0.1" min="0" value="${wp.estimateEw}"> <button class="quiet">Set</button></form></td>
  <td class="num"><form class="inline" method="post" action="/work-packages/${wp.id}/assignment"><input type="hidden" name="back" value="${e(back)}"><input type="hidden" name="team_id" value="${teamId}">
    <input type="number" name="engineer_weeks" step="0.1" min="0" value="${wp.assignedEw}"> <button class="quiet">Set</button></form>
    <br><span class="muted">${ew(wp.assignedEw)} of ${ew(wp.estimateEw)} estimated</span></td>
  <td>${stateBadge(wp)}</td>
  <td>${judgmentHtml}
    <details><summary>Record feasibility judgment</summary>
    <form class="block" method="post" action="/work-packages/${wp.id}/feasibility"><input type="hidden" name="back" value="${e(back)}">
      <label>Verdict <select name="verdict"><option value="feasible">Feasible</option><option value="not_feasible">Not feasible</option></select></label>
      <label>Judged by (technical lead) <input name="judged_by" required></label>
      <label class="wide">Material assumptions <textarea name="assumptions" rows="2" required placeholder="What this judgment rests on: estimates held, specialist availability, dependencies, delivery window…"></textarea></label>
      <label class="wide">Reduced scope this judgment covers (required when assigned &lt; estimate) <input name="scope_note" placeholder="e.g. ingestion phase only"></label>
      <div><button>Record judgment</button></div>
    </form></details></td>
</tr>`;
}

const WORK_HEADER = `<tr><th>WorkPackage</th><th>Category</th><th class="num">Estimate (owning team, ew)</th><th class="num">Assigned (ew)</th><th>State</th><th>Feasibility judgment</th></tr>`;

const STATE_RULES = `<p class="muted">States are non-overlapping. <strong>Feasible</strong> requires a recorded technical-lead judgment; the arithmetic never confers it.
A feasible verdict is refused unless capacity is assigned, the owning team-quarter has no shortfall, and — when assigned capacity is below the estimate — the reduced scope is stated.
A judgment is flagged for reassessment, and stops counting as feasible, once any planning input of its team-quarter changes, and stays flagged until a fresh judgment is recorded.
Judgment history is kept.</p>`;

/** The team-quarter reconciliation identity, rendered as one row of a cross-team table. */
function teamReconciliationRow(plan: TeamQuarterPlan, back: string, ctx: ViewContext): string {
  const r = plan.reconciliation;
  return `<tr>
  <td><a href="${e(viewHref('/allocations', ctx, { teamId: plan.team.id }))}">${e(plan.team.name)}</a>
    <br><span class="muted"><a href="/plan/${plan.team.id}/${plan.quarter.id}">team detail</a></span></td>
  <td class="num">${ew(r.netDeliveryEw)}</td>
  <td class="num">${ew(r.assignedEw)}</td>
  <td class="num"><form class="inline" method="post" action="/reserve"><input type="hidden" name="back" value="${e(back)}">
    <input type="hidden" name="team_id" value="${plan.team.id}"><input type="hidden" name="quarter_id" value="${plan.quarter.id}">
    <input type="number" name="engineer_weeks" step="0.1" min="0" value="${r.reserveEw}"><button class="quiet">Set</button></form></td>
  <td class="num">${
    r.shortfallEw > 0
      ? `<span class="shortfall">SHORTFALL ${ew(r.shortfallEw)}</span>`
      : `<span class="ok">${ew(r.headroomEw)} headroom</span>`
  }</td>
</tr>`;
}

/** Engineering totals: quantities summed, headroom and shortfall never netted together. */
function engineeringTotalsTable(totals: EngineeringTotals): string {
  return `<table>
<tr><th>Engineering net delivery capacity</th><th class="num">${ew(totals.netDeliveryEw)} ew</th><td class="muted">sum of the teams' net delivery capacity</td></tr>
<tr><th>Assigned delivery capacity</th><th class="num">${ew(totals.assignedEw)} ew</th><td class="muted">sum of the teams' assignments</td></tr>
<tr><th>Unplanned Work reserve</th><th class="num">${ew(totals.reserveEw)} ew</th><td class="muted">sum of the teams' reserves</td></tr>
<tr><th>Unassigned headroom</th><th class="num"><span class="ok">${ew(totals.surplusHeadroomEw)} ew</span></th>
  <td class="muted">held by ${totals.teamsWithHeadroom} team${totals.teamsWithHeadroom === 1 ? '' : 's'} — spendable only on that team's own work</td></tr>
<tr><th>Shortfall</th><th class="num">${
    totals.shortfallEw > 0 ? `<span class="shortfall">${ew(totals.shortfallEw)} ew</span>` : '<span class="ok">0.0 ew</span>'
  }</th><td class="muted">${totals.teamsWithShortfall} overallocated team${totals.teamsWithShortfall === 1 ? '' : 's'}</td></tr>
</table>
${
  totals.shortfallEw > 0
    ? `<p class="warn"><strong>${ew(totals.shortfallEw)} ew of shortfall stands in ${totals.teamsWithShortfall} team${
        totals.teamsWithShortfall === 1 ? '' : 's'
      }.</strong> The ${ew(totals.surplusHeadroomEw)} ew of headroom elsewhere does not cover it: capacity belongs to a team and is not interchangeable.
      Resolve each team's shortfall in its own reconciliation.</p>`
    : ''
}
<p class="muted">Arithmetic residual across Engineering: ${ew(totals.netHeadroomEw)} ew (headroom − shortfall). This is a bookkeeping figure, not deployable capacity.</p>`;
}

// ---- pages -------------------------------------------------------------------------------------

export function setupPage(input: { quarters: QuarterRow[]; teams: TeamRow[]; holidays: HolidayRow[]; ctx: ViewContext }): string {
  const { quarters, teams, holidays, ctx } = input;
  const plans =
    quarters.length && teams.length
      ? `<table><tr><th>Team</th><th>Quarter</th><th>Dates</th><th></th></tr>${teams
          .map((t) =>
            quarters
              .map(
                (q) =>
                  `<tr><td>${e(t.name)}</td><td>${e(q.name)}</td><td>${e(q.start)} → ${e(q.end)}</td>
                   <td><a href="/plan/${t.id}/${q.id}">Open team detail</a></td></tr>`,
              )
              .join(''),
          )
          .join('')}</table>`
      : `<p class="muted">Add a team and a quarter to begin. Or run <code>npm run seed</code> for synthetic examples.</p>`;

  return layout(
    'Setup',
    `<h1>Setup</h1>
<p class="muted">Reference data for the Engineering workspace. Day-to-day planning happens under
<a href="${e(viewHref('/census', ctx))}">Census</a>, <a href="${e(viewHref('/capacity', ctx))}">Capacity</a> and
<a href="${e(viewHref('/allocations', ctx))}">Allocations</a>.</p>

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
<p class="muted">A team owns capacity and is the unit a quarterly plan is made for.</p>
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
</section>

<h2>Team-quarter detail</h2>
<section class="card">
<p class="muted">Optional. Everything below is also reachable from the Engineering-wide views.</p>
${plans}
</section>`,
    'setup',
    ctx,
  );
}

export interface CensusInput {
  quarters: QuarterRow[];
  teams: TeamRow[];
  quarter: QuarterRow | null;
  /** One entry per team in scope, already filtered. */
  groups: Array<{ team: TeamRow; people: PersonRecord[]; capacity: PersonCapacity[] }>;
  ctx: ViewContext;
}

export function censusPage(input: CensusInput): string {
  const { quarters, teams, quarter, groups, ctx } = input;
  const back = viewHref('/census', ctx);
  const totalPeople = groups.reduce((n, g) => n + g.people.length, 0);

  const body = groups
    .map((g) => {
      const rows = g.people.length
        ? g.people
            .map((p) => `<tr>${personCells(p, g.capacity.find((c) => c.personId === p.id)!, quarter!.id, back)}</tr>`)
            .join('')
        : `<tr><td colspan="9" class="muted">No people on this team.</td></tr>`;
      const totals = g.capacity;
      const sum = (pick: (c: PersonCapacity) => number) => totals.reduce((a, c) => a + pick(c), 0);
      return `<tr class="group"><td colspan="4">${e(g.team.name)} — ${g.people.length} ${g.people.length === 1 ? 'person' : 'people'}</td>
        <td class="num">${ew(sum((c) => c.contractedEw))}</td><td class="num">${ew(sum((c) => c.absenceEw))}</td>
        <td class="num">${ew(sum((c) => c.availableEw))}</td><td class="num">${ew(sum((c) => c.overheadEw))}</td>
        <td class="num">${ew(sum((c) => c.netDeliveryEw))}</td></tr>${rows}`;
    })
    .join('');

  return layout(
    'Census',
    `<h1>Engineering census</h1>
<p class="muted">Everyone in Engineering, grouped by team. ${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} in scope.
Capacity figures are for the selected quarter; overhead is a percentage of that person's own available capacity.</p>
${syntheticNote(teams.map((t) => t.name))}
<section class="card">
${quarterSelector('/census', quarters, ctx)}
${teamFilter('/census', teams, ctx)}
</section>
${
  quarter === null
    ? `<p class="muted">Select a quarter to see capacity figures.</p>`
    : `<section class="card">
<table>${PERSON_HEADER}${body || `<tr><td colspan="9" class="muted">No people yet.</td></tr>`}</table>
<p class="muted">All figures in engineer-weeks for ${e(quarter.name)} (${e(quarter.start)} → ${e(quarter.end)}).
Days in force = Mon–Fri days between the person's joined/left dates within the quarter that carry a schedule.</p>
</section>

<h2>Add a person</h2>
<section class="card">
<form class="block" method="post" action="/people">
  <input type="hidden" name="back" value="${e(back)}">
  <label>Team ${teamSelect('team_id', teams, ctx.teamId)}</label>
  <label>Name <input name="name" required></label>
  <label>Schedule fraction (1 = full-time) <input type="number" name="fraction" step="0.05" min="0.05" max="1" value="1" required></label>
  <label>Joined (blank = before quarter) <input type="date" name="joined"></label>
  <label>Left (blank = still here) <input type="date" name="left"></label>
  <div><button>Add person</button></div>
</form>
</section>`
}`,
    'census',
    ctx,
  );
}

export function capacityPage(input: { quarters: QuarterRow[]; teams: TeamRow[]; eng: EngineeringQuarter | null; ctx: ViewContext }): string {
  const { quarters, teams, eng, ctx } = input;
  if (!eng) {
    return layout(
      'Capacity',
      `<h1>Engineering capacity</h1>
<section class="card">${quarterSelector('/capacity', quarters, ctx)}</section>
<p class="muted">Select a quarter to see the capacity chain.</p>`,
      'capacity',
      ctx,
    );
  }
  const t = eng.totals;
  const shown = ctx.teamId === null ? eng.plans : eng.plans.filter((p) => p.team.id === ctx.teamId);
  const first = eng.plans[0];

  const teamRows = shown
    .map(
      (p) => `<tr>
  <td><a href="${e(viewHref('/capacity', ctx, { teamId: p.team.id }))}">${e(p.team.name)}</a>
    <br><span class="muted">${p.people.length} ${p.people.length === 1 ? 'person' : 'people'} · <a href="/plan/${p.team.id}/${p.quarter.id}">team detail</a></span></td>
  <td class="num">${ew(p.capacity.contractedEw)}</td>
  <td class="num">${ew(p.capacity.absenceEw)}</td>
  <td class="num">${ew(p.capacity.availableEw)}</td>
  <td class="num">${ew(p.capacity.overheadEw)}</td>
  <td class="num">${pct(p.capacity.overheadRatio === null ? null : p.capacity.overheadRatio * 100)}</td>
  <td class="num"><strong>${ew(p.capacity.netDeliveryEw)}</strong></td>
</tr>`,
    )
    .join('');

  return layout(
    'Capacity',
    `<h1>Engineering capacity — ${e(eng.quarter.name)}</h1>
<p class="muted">${e(eng.quarter.start)} → ${e(eng.quarter.end)} · ${first ? `${first.workingDaysInQuarter} working days (Mon–Fri) · ` : ''}${
      first ? `${first.holidaysInQuarter.length} holiday${first.holidaysInQuarter.length === 1 ? '' : 's'} in this quarter · ` : ''
    }unit: engineer-weeks (ew), where 1 ew = 5 working days at a full-time schedule</p>
${syntheticNote(teams.map((x) => x.name))}
<section class="card">
${quarterSelector('/capacity', quarters, ctx)}
${teamFilter('/capacity', teams, ctx)}
</section>

<h2>Engineering-wide capacity chain</h2>
<section class="card">
<div class="chain">
  <div><div class="label">Contracted capacity</div><div class="value">${ew(t.contractedEw)} ew</div><div class="muted">schedules × effective dates</div></div>
  <div><div class="label">− Known absences</div><div class="value">${ew(t.absenceEw)} ew</div><div class="muted">holidays ∪ leave, once per day</div></div>
  <div><div class="label">= Available workforce capacity</div><div class="value">${ew(t.availableEw)} ew</div></div>
  <div><div class="label">− Overhead</div><div class="value">${ew(t.overheadEw)} ew</div><div class="muted">management &amp; admin, reported separately</div></div>
  <div><div class="label">= Net delivery capacity</div><div class="value">${ew(t.netDeliveryEw)} ew</div></div>
  <div><div class="label">Overhead ratio</div><div class="value">${pct(t.overheadRatio === null ? null : t.overheadRatio * 100)}</div>
    <div class="muted">${ew(t.overheadEw)} ÷ ${ew(t.availableEw)} ew available — summed, not an average of team ratios</div></div>
</div>
</section>

<h2>Per-team breakdown</h2>
<section class="card">
<table>
<tr><th>Team</th><th class="num">Contracted</th><th class="num">Absence</th><th class="num">Available</th><th class="num">Overhead</th><th class="num">Overhead ratio</th><th class="num">Net delivery</th></tr>
${teamRows || '<tr><td colspan="7" class="muted">No teams yet.</td></tr>'}
<tr class="total"><td>Engineering total${ctx.teamId !== null ? ' (all teams)' : ''}</td><td class="num">${ew(t.contractedEw)}</td><td class="num">${ew(t.absenceEw)}</td>
  <td class="num">${ew(t.availableEw)}</td><td class="num">${ew(t.overheadEw)}</td>
  <td class="num">${pct(t.overheadRatio === null ? null : t.overheadRatio * 100)}</td><td class="num">${ew(t.netDeliveryEw)}</td></tr>
</table>
<p class="muted">Each team's overhead ratio has that team's available capacity as its denominator; the Engineering ratio has
Engineering's available capacity (${ew(t.availableEw)} ew). The total is not the mean of the rows above it.
Edit people, schedules, absences and overhead under <a href="${e(viewHref('/census', ctx))}">Census</a>.</p>
</section>`,
    'capacity',
    ctx,
  );
}

export function allocationsPage(input: { quarters: QuarterRow[]; teams: TeamRow[]; eng: EngineeringQuarter | null; ctx: ViewContext }): string {
  const { quarters, teams, eng, ctx } = input;
  if (!eng) {
    return layout(
      'Allocations',
      `<h1>Engineering allocations</h1>
<section class="card">${quarterSelector('/allocations', quarters, ctx)}</section>
<p class="muted">Select a quarter to see the work list.</p>`,
      'allocations',
      ctx,
    );
  }
  const t = eng.totals;
  const back = viewHref('/allocations', ctx);
  const shown = ctx.teamId === null ? eng.plans : eng.plans.filter((p) => p.team.id === ctx.teamId);

  const stateSummary = (Object.keys(STATE_LABELS) as PlanningState[])
    .map((s) => `<span class="badge ${s}">${e(STATE_LABELS[s])}: ${eng.stateCounts[s]}</span>`)
    .join(' ');

  const teamSections = shown
    .map((p) => {
      const r = p.reconciliation;
      const rows = p.workPackages.map((wp) => workPackageRow(wp, p.team.id, back)).join('');
      return `<h3>${e(p.team.name)}</h3>
<section class="card">
<p><code>${ew(r.netDeliveryEw)} = ${ew(r.assignedEw)} + ${ew(r.reserveEw)} + (${ew(r.headroomEw)})</code>
  — net delivery = assigned + reserve + headroom${
    r.shortfallEw > 0
      ? ` <span class="shortfall">— SHORTFALL ${ew(r.shortfallEw)} ew; this team is overallocated and nothing has been adjusted to hide it.</span>`
      : ''
  }</p>
<table>${WORK_HEADER}${rows || `<tr><td colspan="6" class="muted">No work accepted for this team.</td></tr>`}</table>
<details><summary>Accept a WorkPackage onto ${e(p.team.name)}'s work list</summary>
<form class="block" method="post" action="/work-packages">
  <input type="hidden" name="back" value="${e(back)}">
  <input type="hidden" name="team_id" value="${p.team.id}"><input type="hidden" name="quarter_id" value="${eng.quarter.id}">
  <label>Name <input name="name" required></label>
  <label>Delivery investment category <select name="category">${CATEGORIES.map((c) => `<option>${e(c)}</option>`).join('')}</select></label>
  <label>Rough estimate — this team's contribution (ew) <input type="number" name="estimate_ew" step="0.1" min="0" required></label>
  <label class="wide">Notes <input name="notes"></label>
  <div><button>Accept onto work list</button></div>
</form></details>
</section>`;
    })
    .join('');

  return layout(
    'Allocations',
    `<h1>Engineering allocations — ${e(eng.quarter.name)}</h1>
<p class="muted">All work accepted for the quarter, across teams. Assignments, reserves, reconciliation and feasibility
belong to a team-quarter; this view collects them and never pools capacity between teams.</p>
${syntheticNote(teams.map((x) => x.name))}
<section class="card">
${quarterSelector('/allocations', quarters, ctx)}
${teamFilter('/allocations', teams, ctx)}
</section>

<h2>Engineering-wide reconciliation</h2>
<section class="card">
${engineeringTotalsTable(t)}
</section>

<h2>Per-team reconciliation</h2>
<section class="card">
<table>
<tr><th>Team</th><th class="num">Net delivery</th><th class="num">Assigned</th><th class="num">Unplanned Work reserve</th><th class="num">Headroom / shortfall</th></tr>
${eng.plans.map((p) => teamReconciliationRow(p, back, ctx)).join('') || '<tr><td colspan="5" class="muted">No teams yet.</td></tr>'}
<tr class="total"><td>Engineering total</td><td class="num">${ew(t.netDeliveryEw)}</td><td class="num">${ew(t.assignedEw)}</td>
  <td class="num">${ew(t.reserveEw)}</td>
  <td class="num"><span class="ok">${ew(t.surplusHeadroomEw)} headroom</span>${
    t.shortfallEw > 0 ? ` / <span class="shortfall">${ew(t.shortfallEw)} shortfall</span>` : ''
  }</td></tr>
</table>
<p class="muted">Every team is listed here whatever the team filter, so a shortfall is never hidden by filtering.</p>
</section>

<h2>Delivery investment mix</h2>
<section class="card">
<table>
<tr><th>Category</th><th class="num">Assigned (ew)</th><th class="num">% of Engineering net delivery capacity (${ew(t.netDeliveryEw)} ew)</th></tr>
${CATEGORIES.map((c) => `<tr><td>${e(c)}</td><td class="num">${ew(eng.byCategory[c].ew)}</td><td class="num">${pct(eng.byCategory[c].percent)}</td></tr>`).join('')}
<tr><td class="muted">Unplanned Work reserve (unclassified)</td><td class="num">${ew(t.reserveEw)}</td><td class="num">${pct(shareOfNetDelivery(t.reserveEw, t))}</td></tr>
<tr><td class="muted">Unassigned headroom</td><td class="num">${ew(t.surplusHeadroomEw)}</td><td class="num">${pct(shareOfNetDelivery(t.surplusHeadroomEw, t))}</td></tr>
${
  t.shortfallEw > 0
    ? `<tr><td class="muted">Shortfall (overallocated teams)</td><td class="num"><span class="shortfall">−${ew(t.shortfallEw)}</span></td><td class="num">−${pct(
        shareOfNetDelivery(t.shortfallEw, t),
      )}</td></tr>`
    : ''
}
</table>
<p class="muted">Percentages are computed from summed engineer-weeks over Engineering net delivery capacity — never by averaging the teams' percentages.
They describe investment shape only; they never show whether work fits. Fit is the reconciliation above plus the recorded feasibility judgments.</p>
</section>

<h2>Work list</h2>
<section class="card">
<p>${stateSummary}</p>
${STATE_RULES}
</section>
${teamSections || '<p class="muted">No teams yet.</p>'}`,
    'allocations',
    ctx,
  );
}

export function planPage(plan: TeamQuarterPlan): string {
  const { team, quarter, capacity, reconciliation: rec, mix } = plan;
  const base = `/plan/${team.id}/${quarter.id}`;
  const ctx: ViewContext = { quarterId: quarter.id, teamId: team.id };

  const peopleRows = plan.people
    .map((p) => `<tr>${personCells(p, capacity.people.find((c) => c.personId === p.id)!, quarter.id, base)}</tr>`)
    .join('');
  const wpRows = plan.workPackages.map((wp) => workPackageRow(wp, team.id, base)).join('');
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
    } · unit: engineer-weeks (ew)</p>
<p class="muted">Team-quarter detail. The Engineering-wide views —
<a href="${e(viewHref('/census', ctx))}">Census</a>, <a href="${e(viewHref('/capacity', ctx))}">Capacity</a>,
<a href="${e(viewHref('/allocations', ctx))}">Allocations</a> — cover this and every other team without opening one.</p>
${syntheticNote([team.name, quarter.name])}

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
<table>${PERSON_HEADER}
${peopleRows || '<tr><td colspan="9" class="muted">No people yet.</td></tr>'}
<tr class="total"><td>Team total</td><td></td><td></td><td></td><td class="num">${ew(capacity.contractedEw)}</td><td class="num">${ew(capacity.absenceEw)}</td><td class="num">${ew(capacity.availableEw)}</td><td class="num">${ew(capacity.overheadEw)}</td><td class="num">${ew(capacity.netDeliveryEw)}</td></tr>
</table>
<h3>Add a person to ${e(team.name)}</h3>
<form class="block" method="post" action="/people">
  <input type="hidden" name="back" value="${base}"><input type="hidden" name="team_id" value="${team.id}">
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
${STATE_RULES}
<table>${WORK_HEADER}
${wpRows || '<tr><td colspan="6" class="muted">No work accepted yet.</td></tr>'}
</table>
<h3>Accept a WorkPackage onto ${e(team.name)}'s work list</h3>
<form class="block" method="post" action="/work-packages">
  <input type="hidden" name="back" value="${base}">
  <input type="hidden" name="team_id" value="${team.id}"><input type="hidden" name="quarter_id" value="${quarter.id}">
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
  <form class="inline" method="post" action="/reserve"><input type="hidden" name="back" value="${base}">
    <input type="hidden" name="team_id" value="${team.id}"><input type="hidden" name="quarter_id" value="${quarter.id}">
    <input type="number" name="engineer_weeks" step="0.1" min="0" value="${rec.reserveEw}"> ew <button class="quiet">Set reserve</button></form>
  <span class="muted">explicit reserve for work not yet known; not overhead, not headroom, unclassified until consumed</span></td></tr>
<tr><th>Remaining unassigned headroom</th><th class="num">${headroomCell}</th><td class="muted">net − assigned − reserve</td></tr>
</table>
<p><code>${ew(rec.netDeliveryEw)} = ${ew(rec.assignedEw)} + ${ew(rec.reserveEw)} + (${ew(rec.headroomEw)})</code>
${rec.shortfallEw > 0 ? '<span class="shortfall">— this draft is overallocated; nothing has been adjusted to hide it.</span>' : ''}</p>

<h3>Delivery investment mix</h3>
<table>
<tr><th>Category</th><th class="num">Assigned (ew)</th><th class="num">% of this team's net delivery capacity (${ew(mix.denominatorEw)} ew)</th></tr>
${CATEGORIES.map((c) => `<tr><td>${e(c)}</td><td class="num">${ew(mix.byCategory[c].ew)}</td><td class="num">${pct(mix.byCategory[c].percent)}</td></tr>`).join('')}
<tr><td class="muted">Unplanned Work reserve (unclassified)</td><td class="num">${ew(mix.reserve.ew)}</td><td class="num">${pct(mix.reserve.percent)}</td></tr>
<tr><td class="muted">Unassigned headroom${rec.shortfallEw > 0 ? ' (negative: shortfall)' : ''}</td><td class="num">${ew(mix.headroom.ew)}</td><td class="num">${pct(mix.headroom.percent)}</td></tr>
</table>
<p class="muted">Percentages describe investment shape only; they never show whether work fits.</p>
</section>`,
    'team',
    ctx,
  );
}
