/**
 * Server-rendered HTML. No client-side framework: every page is assembled from the shared
 * vocabulary in `ui.ts`, and the browser's only job is to post a form and put the server's
 * answer back on the page.
 *
 * Three Engineering-wide views — Census, Capacity, Allocations — are the primary workspace;
 * no team needs to be opened to reach them. The team-quarter page remains available as
 * optional detail, and every edit names the team-quarter it applies to.
 *
 * Anything a background save can change is wrapped in a named region (see `ui.ts` and
 * `regions.ts`), so the server can re-render just that part.
 */

import { CATEGORIES, STATE_LABELS, type PlanningState } from '../domain/planning.js';
import type { HolidayRow, PersonRecord, QuarterRow, TeamRow } from '../db/repo.js';
import type { PersonCapacity } from '../domain/capacity.js';
import type { EngineeringQuarter, EngineeringTotals } from '../engineering.js';
import { shareOfNetDelivery } from '../engineering.js';
import type { TeamQuarterPlan, WorkPackageView } from '../plan.js';
import {
  callout,
  card,
  chain,
  dialog,
  dialogWell,
  emptyRow,
  emptyState,
  escapeHtml,
  ew,
  field,
  layout,
  numericCell,
  pageHead,
  pct,
  pill,
  plural,
  region,
  rowMenu,
  table,
  viewHref,
  type MenuItem,
  type Tone,
  type ViewContext,
} from './ui.js';

export { escapeHtml, ew, pct, viewHref, layout, errorPage, type Tab, type ViewContext } from './ui.js';

const e = escapeHtml;

const STATE_TONE: Record<PlanningState, Tone> = {
  accepted: 'neutral',
  partially_assigned: 'warn',
  assigned: 'info',
  feasible: 'good',
};

const SYNTHETIC_NOTE = callout({
  tone: 'example',
  icon: '◆',
  title: 'Synthetic example data',
  body: `<p>Names and figures are invented for illustration and reproduce the worked examples in the domain documentation.</p>`,
});

const isSynthetic = (names: string[]): boolean => names.some((n) => /synthetic/i.test(n));

function holidayCallout(plan: TeamQuarterPlan | undefined, ctx: ViewContext): string {
  if (!plan || plan.holidayCalendarSize > 0) return '';
  return callout({
    tone: 'warn',
    icon: '◐',
    title: 'The holiday calendar is empty',
    body: `<p>Capacity for this quarter is being calculated as if no day is a public holiday.
      <a href="${e(viewHref('/setup', ctx))}">Add holidays in Setup</a> if that is not right.</p>`,
  });
}

const quarterMeta = (q: QuarterRow, plan?: TeamQuarterPlan): string =>
  `${e(q.name)} · <b>${e(q.start)}</b> → <b>${e(q.end)}</b>${
    plan ? ` · <b>${plan.workingDaysInQuarter}</b> working days (Mon–Fri) · <b>${plan.holidaysInQuarter.length}</b> ${
      plan.holidaysInQuarter.length === 1 ? 'holiday' : 'holidays'
    }` : ''
  } · all figures in engineer-weeks (ew), where 1 ew = 5 working days at a full-time schedule`;

// ---- census fragments ---------------------------------------------------------------------

const scheduleText = (p: PersonRecord): string =>
  p.scheduleRows
    .slice()
    .sort((a, b) => ((a.effectiveFrom ?? '') < (b.effectiveFrom ?? '') ? -1 : 1))
    .map(
      (s) =>
        `${(s.fraction * 100).toFixed(0)}%<span class="sub2">${
          s.effectiveFrom ? `from ${e(s.effectiveFrom)}` : 'since the start'
        }</span>`,
    )
    .join('');

const absenceText = (p: PersonRecord): string =>
  p.absenceRows.length
    ? p.absenceRows
        .map((a) => `${e(a.from)} → ${e(a.to)}${a.note ? `<span class="sub2">${e(a.note)}</span>` : ''}`)
        .join('<br>')
    : '<span class="footnote">None recorded</span>';

const inForceText = (p: PersonRecord): string =>
  `${p.joined ? `joined ${e(p.joined)}` : 'in force at the start'}${p.left ? ` · left ${e(p.left)}` : ''}`;

function personMenu(p: PersonRecord): string {
  const items: MenuItem[] = [
    { label: 'Change working schedule…', dialog: `dlg-schedule-${p.id}` },
    { label: 'Add absence…', dialog: `dlg-absence-${p.id}` },
  ];
  for (const s of p.scheduleRows.filter((x) => x.effectiveFrom !== null)) {
    items.push({ label: `Remove schedule change from ${s.effectiveFrom}…`, dialog: `dlg-rm-schedule-${s.id}`, danger: true });
  }
  for (const a of p.absenceRows) {
    items.push({ label: `Remove absence ${a.from} → ${a.to}…`, dialog: `dlg-rm-absence-${a.id}`, danger: true });
  }
  items.push({ label: `Remove ${p.name} from Engineering…`, dialog: `dlg-rm-person-${p.id}`, danger: true, separated: true });
  return rowMenu({ key: `person-${p.id}`, label: p.name, items });
}

function personRow(p: PersonRecord, cap: PersonCapacity, plan: TeamQuarterPlan, back: string): string {
  const overhead = numericCell({
    field: `overhead:${p.id}`,
    label: `overhead for ${p.name}`,
    action: `/people/${p.id}/overhead`,
    name: 'percent',
    value: p.overheadPercent,
    display: `${p.overheadPercent}%`,
    unit: '%',
    step: '1',
    min: '0',
    max: '100',
    spoken: 'percent, a share of their available capacity',
    hidden: { back, quarter_id: plan.quarter.id },
    ...(p.overheadPercent > 0 || p.overheadNote
      ? { hint: `${ew(cap.overheadEw)} ew${p.overheadNote ? ` · ${e(p.overheadNote)}` : ''}` }
      : {}),
  });

  return `<tr>
  <td><span class="name">${e(p.name)}</span><span class="sub2">${inForceText(p)}</span></td>
  <td>${scheduleText(p)}</td>
  <td>${absenceText(p)}</td>
  <td class="num">${cap.workingDaysInForce}</td>
  <td class="num">${ew(cap.contractedEw)}</td>
  <td class="num">${ew(cap.absenceEw)}${cap.absenceDays ? `<span class="sub2">${plural(cap.absenceDays, 'day')}</span>` : ''}</td>
  <td class="num">${ew(cap.availableEw)}</td>
  <td class="num">${overhead}</td>
  <td class="num strong">${ew(cap.netDeliveryEw)}</td>
  <td class="mid">${personMenu(p)}</td>
</tr>`;
}

const CENSUS_HEAD = `<tr>
  <th>Person</th><th>Working schedule</th><th>Known absence</th>
  <th class="num">Days in force</th><th class="num">Contracted</th><th class="num">Absence</th>
  <th class="num">Available</th><th class="num">Overhead<span class="sub2">% of available</span></th>
  <th class="num">Net delivery</th><th><span class="sr-only">Actions</span></th>
</tr>`;

function censusTeamCard(plan: TeamQuarterPlan, back: string): string {
  const cap = plan.capacity;
  const rows = plan.people.length
    ? plan.people
        .map((p) => personRow(p, cap.people.find((c) => c.personId === p.id)!, plan, back))
        .join('') +
      `<tr class="total">
        <td>Team total</td><td></td><td></td><td></td>
        <td class="num">${ew(cap.contractedEw)}</td><td class="num">${ew(cap.absenceEw)}</td>
        <td class="num">${ew(cap.availableEw)}</td><td class="num">${ew(cap.overheadEw)}</td>
        <td class="num">${ew(cap.netDeliveryEw)}</td><td></td>
      </tr>`
    : emptyRow(10, 'Nobody is on this team yet.');

  return card({
    title: plan.team.name,
    sub: `${plural(plan.people.length, 'person', 'people')}${isSynthetic([plan.team.name]) ? ' · synthetic example' : ''}`,
    raw: table(CENSUS_HEAD, rows, PERSON_COLS),
  });
}

// ---- census dialogs -----------------------------------------------------------------------

function personDialogs(plan: TeamQuarterPlan, back: string): string[] {
  const out: string[] = [];
  const quarterScope = `${plan.team.name} · ${plan.quarter.name}`;

  for (const p of plan.people) {
    const cap = plan.capacity.people.find((c) => c.personId === p.id)!;

    out.push(
      dialog({
        id: `dlg-schedule-${p.id}`,
        title: `Change ${p.name}'s working schedule`,
        scope: `${plan.team.name} · applies from the effective date, in every quarter it touches`,
        action: `/people/${p.id}/schedules`,
        hidden: { back },
        label: `working schedule for ${p.name}`,
        submitLabel: 'Add schedule change',
        body: `<div class="pair">
        ${field('Schedule fraction', '<input type="number" name="fraction" step="0.05" min="0.05" max="1" required placeholder="0.6">', '1 = full-time')}
        ${field('Effective from', '<input type="date" name="effective_from" required>')}
      </div>
      <p>The previous schedule stays in force up to this date. Capacity before it is unchanged.</p>`,
      }),
    );

    out.push(
      dialog({
        id: `dlg-absence-${p.id}`,
        title: `Add an absence for ${p.name}`,
        scope: `${plan.team.name} · counted in every quarter the dates fall in`,
        action: `/people/${p.id}/absences`,
        hidden: { back },
        label: `absence for ${p.name}`,
        submitLabel: 'Add absence',
        body: `<div class="pair">
        ${field('From', '<input type="date" name="from" required>')}
        ${field('To', '<input type="date" name="to" required>')}
      </div>
      ${field('Note', '<input type="text" name="note" placeholder="leave">', 'optional')}
      <p>Absent days are counted at ${e(p.name)}'s scheduled fraction, and a day covered by both a holiday and leave counts once.</p>`,
      }),
    );

    for (const s of p.scheduleRows.filter((x) => x.effectiveFrom !== null)) {
      out.push(
        dialog({
          id: `dlg-rm-schedule-${s.id}`,
          title: 'Remove this schedule change?',
          scope: `${p.name} · ${plan.team.name}`,
          action: `/schedules/${s.id}/delete`,
          hidden: { back },
          label: `schedule change for ${p.name}`,
          submitLabel: 'Remove schedule change',
          destructive: true,
          body: `<p>This removes the change to <b>${(s.fraction * 100).toFixed(0)}%</b> from
          <b>${e(s.effectiveFrom ?? '')}</b>. ${e(p.name)} reverts to the schedule in force before it, and capacity
          is recalculated for every quarter from that date onwards.</p>
        <p>The change is recorded in the planning change log, so any feasibility judgment for
          ${e(quarterScope)} will need reassessment. This cannot be undone.</p>`,
        }),
      );
    }

    for (const a of p.absenceRows) {
      out.push(
        dialog({
          id: `dlg-rm-absence-${a.id}`,
          title: 'Remove this absence?',
          scope: `${p.name} · ${plan.team.name}`,
          action: `/absences/${a.id}/delete`,
          hidden: { back },
          label: `absence for ${p.name}`,
          submitLabel: 'Remove absence',
          destructive: true,
          body: `<p>This removes <b>${e(a.from)} → ${e(a.to)}</b>${a.note ? ` (${e(a.note)})` : ''} from
          ${e(p.name)}'s known absence, raising available capacity in every quarter it touches.</p>
        <p>Any feasibility judgment for ${e(quarterScope)} will need reassessment. This cannot be undone.</p>`,
        }),
      );
    }

    const judgments = plan.workPackages.filter((w) => w.judgment).length;
    const after = plan.reconciliation.netDeliveryEw - cap.netDeliveryEw;
    const gap = plan.reconciliation.assignedEw + plan.reconciliation.reserveEw - after;
    out.push(
      dialog({
        id: `dlg-rm-person-${p.id}`,
        title: `Remove ${p.name} from Engineering?`,
        scope: `${plan.team.name} · affects every quarter their dates touch`,
        action: `/people/${p.id}/delete`,
        hidden: { back },
        label: p.name,
        submitLabel: `Remove ${p.name}`,
        destructive: true,
        body: `<p>This permanently removes ${e(p.name)} and their working schedule${
          p.absenceRows.length
            ? `, along with <b>${plural(p.absenceRows.length, 'recorded absence', 'recorded absences')}</b>`
            : ''
        }.</p>
      <p>${e(quarterScope)} loses <b>${ew(cap.netDeliveryEw)} ew</b> of net delivery capacity, leaving
        <b>${ew(after)} ew</b>${
          gap > 0.005
            ? ` — which puts the team <b>${ew(gap)} ew</b> short of what is already assigned and reserved`
            : ''
        }.${
          judgments > 0
            ? ` <b>${plural(judgments, 'feasibility judgment')}</b> will need reassessment.`
            : ''
        }</p>
      <p>This cannot be undone.</p>`,
      }),
    );
  }
  return out;
}

function addPersonDialog(teams: TeamRow[], ctx: ViewContext, back: string): string {
  return dialog({
    id: 'dlg-add-person',
    title: 'Add a person to Engineering',
    scope: 'Capacity belongs to the team they join',
    action: '/people',
    hidden: { back },
    label: 'the new person',
    submitLabel: 'Add person',
    body: `${field(
      'Team',
      `<select name="team_id" required>${teams
        .map((t) => `<option value="${t.id}"${t.id === ctx.teamId ? ' selected' : ''}>${e(t.name)}</option>`)
        .join('')}</select>`,
    )}
  ${field('Name', '<input type="text" name="name" required>')}
  <div class="pair">
    ${field('Schedule fraction', '<input type="number" name="fraction" step="0.05" min="0.05" max="1" value="1" required>', '1 = full-time')}
    ${field('Joined', '<input type="date" name="joined">', 'blank = before the quarter')}
  </div>
  ${field('Left', '<input type="date" name="left">', 'blank = still here')}`,
  });
}

// ---- pages: census ------------------------------------------------------------------------

export interface CensusInput {
  quarters: QuarterRow[];
  teams: TeamRow[];
  quarter: QuarterRow | null;
  /** One plan per team in scope, already filtered. */
  plans: TeamQuarterPlan[];
  ctx: ViewContext;
}

export function censusTeamsRegion(plans: TeamQuarterPlan[], back: string): string {
  if (!plans.length) {
    return card({ raw: emptyState('No teams in scope', 'Add a team under Setup, or clear the team filter.') });
  }
  return `<div class="stack">${plans.map((p) => censusTeamCard(p, back)).join('')}</div>`;
}

export function censusPage(input: CensusInput): string {
  const { quarters, teams, quarter, plans, ctx } = input;
  const back = viewHref('/census', ctx);
  const people = plans.reduce((n, p) => n + p.people.length, 0);

  const body =
    quarter === null
      ? `${pageHead({ title: 'Engineering census' })}
${card({ raw: emptyState('No quarter selected', 'Capacity figures need a quarter. Add one under <a href="/setup">Setup</a>.') })}`
      : `${pageHead({
          title: 'Engineering census',
          meta: `${quarterMeta(quarter, plans[0])} · overhead is a share of each person's <b>own</b> available capacity`,
          actions: teams.length ? `<button type="button" class="btn" data-dialog="dlg-add-person">Add person…</button>` : '',
        })}
${
  isSynthetic(teams.map((t) => t.name)) || plans.some((p) => p.holidayCalendarSize === 0)
    ? `<div class="stack" style="margin-bottom:14px">${holidayCallout(plans[0], ctx)}${
        isSynthetic(teams.map((t) => t.name)) ? SYNTHETIC_NOTE : ''
      }</div>`
    : ''
}
${region('census-teams', censusTeamsRegion(plans, back))}
${card({
  body: `<p class="footnote"><b>Days in force</b> counts the Mon–Fri days between a person's joined and left dates,
    inside the quarter, on which a working schedule applies. <b>Contracted</b> is those days at their scheduled
    fraction. Overhead is netted out of available capacity and reported separately; it is never spread across the
    delivery investment categories.</p>`,
})}
${dialogWell([...(teams.length ? [addPersonDialog(teams, ctx, back)] : []), ...plans.flatMap((p) => personDialogs(p, back))])}`;

  return layout({
    title: 'Census',
    active: 'census',
    ctx,
    body,
    contextBar: {
      path: '/census',
      quarters,
      teams,
      ctx,
      trailing: quarter === null ? undefined : `${plural(plans.length, 'team')} · ${plural(people, 'person', 'people')}`,
    },
  });
}

// ---- pages: capacity ----------------------------------------------------------------------

export function capacityChainRegion(t: EngineeringTotals): string {
  return chain([
    { label: 'Contracted', value: ew(t.contractedEw), unit: 'ew', den: 'schedules × effective dates' },
    { op: '−' },
    { label: 'Known absence', value: ew(t.absenceEw), unit: 'ew', den: 'holidays and leave, counted once per day' },
    { op: '=' },
    { label: 'Available', value: ew(t.availableEw), unit: 'ew', den: 'workforce capacity' },
    { op: '−' },
    { label: 'Overhead', value: ew(t.overheadEw), unit: 'ew', den: 'management &amp; admin' },
    { op: '=' },
    { label: 'Net delivery', value: ew(t.netDeliveryEw), unit: 'ew', tone: 'result', den: 'capacity available to plan with' },
    {
      label: 'Overhead ratio',
      value: pct(t.overheadRatio === null ? null : t.overheadRatio * 100),
      aside: true,
      den: `${ew(t.overheadEw)} ÷ ${ew(t.availableEw)} ew available — summed, not the mean of the team ratios`,
    },
  ]);
}

export function capacityTeamsRegion(eng: EngineeringQuarter, ctx: ViewContext): string {
  const t = eng.totals;
  const shown = ctx.teamId === null ? eng.plans : eng.plans.filter((p) => p.team.id === ctx.teamId);
  const rows = shown
    .map(
      (p) => `<tr>
  <td><a href="${e(viewHref('/capacity', ctx, { teamId: p.team.id }))}">${e(p.team.name)}</a>
    <span class="sub2">${plural(p.people.length, 'person', 'people')} · <a href="/plan/${p.team.id}/${p.quarter.id}">team detail</a></span></td>
  <td class="num">${ew(p.capacity.contractedEw)}</td>
  <td class="num">${ew(p.capacity.absenceEw)}</td>
  <td class="num">${ew(p.capacity.availableEw)}</td>
  <td class="num">${ew(p.capacity.overheadEw)}</td>
  <td class="num">${pct(p.capacity.overheadRatio === null ? null : p.capacity.overheadRatio * 100)}</td>
  <td class="num strong">${ew(p.capacity.netDeliveryEw)}</td>
</tr>`,
    )
    .join('');

  const head = `<tr><th>Team</th><th class="num">Contracted</th><th class="num">Absence</th><th class="num">Available</th>
    <th class="num">Overhead</th><th class="num">Overhead ratio</th><th class="num">Net delivery</th></tr>`;
  const total = `<tr class="total">
    <td>Engineering total${ctx.teamId !== null ? ' (all teams)' : ''}</td>
    <td class="num">${ew(t.contractedEw)}</td><td class="num">${ew(t.absenceEw)}</td><td class="num">${ew(t.availableEw)}</td>
    <td class="num">${ew(t.overheadEw)}</td><td class="num">${pct(t.overheadRatio === null ? null : t.overheadRatio * 100)}</td>
    <td class="num">${ew(t.netDeliveryEw)}</td></tr>`;

  return table(head, (rows || emptyRow(7, 'No teams yet.')) + total);
}

export function capacityPage(input: {
  quarters: QuarterRow[];
  teams: TeamRow[];
  eng: EngineeringQuarter | null;
  ctx: ViewContext;
}): string {
  const { quarters, teams, eng, ctx } = input;
  const contextBar = { path: '/capacity', quarters, teams, ctx };

  if (!eng) {
    return layout({
      title: 'Capacity',
      active: 'capacity',
      ctx,
      contextBar,
      body: `${pageHead({ title: 'Engineering capacity' })}
${card({ raw: emptyState('No quarter selected', 'Add a quarter under <a href="/setup">Setup</a> to see the capacity chain.') })}`,
    });
  }

  const t = eng.totals;
  const first = eng.plans[0];
  const people = eng.plans.reduce((n, p) => n + p.people.length, 0);

  return layout({
    title: 'Capacity',
    active: 'capacity',
    ctx,
    contextBar: { ...contextBar, trailing: `${plural(eng.plans.length, 'team')} · ${plural(people, 'person', 'people')}` },
    body: `${pageHead({
      title: 'Engineering capacity',
      meta: quarterMeta(eng.quarter, first),
      actions: `<a class="btn ghost" href="${e(viewHref('/census', ctx))}">Edit people in Census</a>`,
    })}
${
  holidayCallout(first, ctx) || isSynthetic(teams.map((x) => x.name))
    ? `<div class="stack" style="margin-bottom:14px">${holidayCallout(first, ctx)}${
        isSynthetic(teams.map((x) => x.name)) ? SYNTHETIC_NOTE : ''
      }</div>`
    : ''
}
${card({
  title: 'Engineering-wide capacity chain',
  sub: `Summed across ${plural(eng.plans.length, 'team')}`,
  body: region('capacity-chain', capacityChainRegion(t)),
})}
${card({
  title: 'Per-team breakdown',
  sub: 'Capacity belongs to a team and is spendable only there',
  raw: region('capacity-teams', capacityTeamsRegion(eng, ctx)),
  foot: `<p class="footnote">Each team's overhead ratio has <b>that team's</b> available capacity as its denominator;
    the Engineering ratio has Engineering's <b>${ew(t.availableEw)} ew</b>. The total row is summed, never averaged.</p>`,
})}`,
  });
}

// ---- allocations fragments ------------------------------------------------------------------

function judgmentHtml(wp: WorkPackageView): string {
  const j = wp.judgment;
  if (!j) return '<span class="footnote">No judgment recorded.</span>';
  const history =
    wp.judgments.length > 1
      ? `<details class="history"><summary>${plural(wp.judgments.length - 1, 'earlier judgment')}</summary>
      <ol>${wp.judgments
        .slice(1)
        .map(
          (h) =>
            `<li>${h.verdict === 'feasible' ? 'Feasible' : 'Not feasible'} — ${e(h.judgedBy)}, ${e(
              h.judgedAt.slice(0, 10),
            )}${h.scopeNote ? ` · scope: ${e(h.scopeNote)}` : ''}</li>`,
        )
        .join('')}</ol></details>`
      : '';
  return `<div class="judgment">
  <span class="verdict ${j.verdict === 'feasible' ? 'yes' : 'no'}">${j.verdict === 'feasible' ? 'Feasible' : 'Not feasible'}</span>
  — ${e(j.judgedBy)}, ${e(j.judgedAt.slice(0, 10))}
  <dl>
    ${j.scopeNote ? `<dt>Scope</dt><dd>${e(j.scopeNote)}</dd>` : ''}
    <dt>Assumptions</dt><dd>${e(j.assumptions)}</dd>
  </dl>
  ${history}
</div>`;
}

function stateCell(wp: WorkPackageView): string {
  const { state, needsReassessment, reassessmentReasons } = wp.assessment;
  const base = pill(STATE_TONE[state], STATE_LABELS[state]);
  if (!needsReassessment) return base;
  return `${base}<div style="margin-top:5px">${pill('crit', 'Needs reassessment')}</div>
  <ul class="reasons">${reassessmentReasons.map((r) => `<li>${e(r)}</li>`).join('')}</ul>`;
}

function workPackageRow(wp: WorkPackageView, plan: TeamQuarterPlan, back: string): string {
  const estimate = numericCell({
    field: `estimate:${wp.id}`,
    label: `estimate for ${wp.name}`,
    action: `/work-packages/${wp.id}/estimate`,
    name: 'estimate_ew',
    value: wp.estimateEw,
    display: ew(wp.estimateEw),
    unit: 'ew',
    step: '0.1',
    min: '0',
    spoken: 'engineer-weeks',
    hidden: { back },
  });
  const assignment = numericCell({
    field: `assignment:${wp.id}`,
    label: `${plan.team.name}'s assignment to ${wp.name}`,
    action: `/work-packages/${wp.id}/assignment`,
    name: 'engineer_weeks',
    value: wp.assignedEw,
    display: ew(wp.assignedEw),
    unit: 'ew',
    step: '0.1',
    min: '0',
    spoken: 'engineer-weeks',
    hidden: { back, team_id: plan.team.id },
    hint: `${ew(wp.assignedEw)} of ${ew(wp.estimateEw)} estimated`,
  });

  return `<tr>
  <td><span class="name">${e(wp.name)}</span>${wp.notes ? `<span class="sub2">${e(wp.notes)}</span>` : ''}</td>
  <td>${e(wp.category)}</td>
  <td class="num">${estimate}</td>
  <td class="num">${assignment}</td>
  <td>${stateCell(wp)}</td>
  <td>${judgmentHtml(wp)}</td>
  <td class="mid">${rowMenu({
    key: `wp-${wp.id}`,
    label: wp.name,
    items: [
      { label: 'Record feasibility judgment…', dialog: `dlg-judge-${wp.id}` },
      { label: `Remove ${wp.name} from the work list…`, dialog: `dlg-rm-wp-${wp.id}`, danger: true, separated: true },
    ],
  })}</td>
</tr>`;
}

const WORK_HEAD = `<tr>
  <th>WorkPackage</th><th>Category</th><th class="num">Estimate (this team, ew)</th><th class="num">Assigned (ew)</th>
  <th>Planning state</th><th>Feasibility judgment</th><th><span class="sr-only">Actions</span></th>
</tr>`;

function identityHtml(plan: TeamQuarterPlan): string {
  const r = plan.reconciliation;
  return `<span class="identity">${ew(r.netDeliveryEw)} = ${ew(r.assignedEw)} + ${ew(r.reserveEw)} + <span class="${
    r.shortfallEw > 0 ? 'neg' : ''
  }">(${ew(r.headroomEw)})</span></span>`;
}

function allocationsTeamCard(plan: TeamQuarterPlan, back: string): string {
  const r = plan.reconciliation;
  const rows = plan.workPackages.length
    ? plan.workPackages.map((wp) => workPackageRow(wp, plan, back)).join('')
    : emptyRow(7, 'No work has been accepted for this team this quarter.');

  const shortfall =
    r.shortfallEw > 0
      ? callout({
          tone: 'crit',
          icon: '▲',
          title: `${plan.team.name} is overallocated by ${ew(r.shortfallEw)} ew`,
          body: `<p>Nothing has been adjusted to hide it. Reduce assignments, reduce the reserve deliberately,
            or revisit what ${e(plan.team.name)} accepted.</p>`,
        })
      : '';

  return card({
    title: plan.team.name,
    sub: `${identityHtml(plan)} <span style="margin-left:8px">net delivery = assigned + reserve + headroom</span>`,
    body: shortfall || undefined,
    raw: table(WORK_HEAD, rows, WORK_COLS),
    foot: `<button type="button" class="btn ghost small" data-dialog="dlg-accept-${plan.team.id}">Accept a WorkPackage onto ${e(
      plan.team.name,
    )}'s work list…</button>`,
  });
}

function engineeringSummary(t: EngineeringTotals): string {
  return chain([
    { label: 'Net delivery', value: ew(t.netDeliveryEw), unit: 'ew', tone: 'result', den: 'summed across the teams' },
    { op: '=' },
    { label: 'Assigned', value: ew(t.assignedEw), unit: 'ew', den: 'sum of the teams’ assignments' },
    { op: '+' },
    { label: 'Unplanned Work reserve', value: ew(t.reserveEw), unit: 'ew', den: 'sum of the teams’ reserves' },
    { op: '+' },
    {
      label: 'Unassigned headroom',
      value: ew(t.surplusHeadroomEw),
      unit: 'ew',
      tone: 'good',
      den: `held by ${plural(t.teamsWithHeadroom, 'team')} — spendable only on that team's own work`,
    },
    {
      label: 'Shortfall',
      value: ew(t.shortfallEw),
      unit: 'ew',
      tone: t.shortfallEw > 0 ? 'crit' : undefined,
      aside: true,
      den: `${plural(t.teamsWithShortfall, 'overallocated team')} — never covered by another team's headroom`,
    },
  ]);
}

export function allocationsSummaryRegion(eng: EngineeringQuarter): string {
  const t = eng.totals;
  const overallocated = eng.plans.filter((p) => p.reconciliation.shortfallEw > 0);
  const warning =
    t.shortfallEw > 0
      ? callout({
          tone: 'crit',
          icon: '▲',
          title: `${ew(t.shortfallEw)} ew of shortfall stands in ${overallocated.map((p) => p.team.name).join(', ')}`,
          body: `<p>The ${ew(t.surplusHeadroomEw)} ew of headroom held elsewhere does not cover it: capacity belongs to
            a team and its people are not interchangeable. Resolve each shortfall in that team's own reconciliation.</p>`,
        })
      : '';
  return `${engineeringSummary(t)}
${warning ? `<div style="margin-top:14px">${warning}</div>` : ''}
<p class="footnote" style="margin-top:12px">Arithmetic residual across Engineering:
  <b>${ew(t.netHeadroomEw)} ew</b> (headroom − shortfall). A bookkeeping figure, not deployable capacity.</p>`;
}

export function allocationsReconRegion(eng: EngineeringQuarter, ctx: ViewContext, back: string): string {
  const t = eng.totals;
  const rows = eng.plans
    .map((p) => {
      const r = p.reconciliation;
      const reserve = numericCell({
        field: `reserve:${p.team.id}`,
        label: `Unplanned Work reserve for ${p.team.name}`,
        action: '/reserve',
        name: 'engineer_weeks',
        value: r.reserveEw,
        display: ew(r.reserveEw),
        unit: 'ew',
        step: '0.1',
        min: '0',
        spoken: 'engineer-weeks',
        hidden: { back, team_id: p.team.id, quarter_id: p.quarter.id },
      });
      return `<tr>
  <td><a href="${e(viewHref('/allocations', ctx, { teamId: p.team.id }))}">${e(p.team.name)}</a>
    <span class="sub2"><a href="/plan/${p.team.id}/${p.quarter.id}">team detail</a></span></td>
  <td class="num">${ew(r.netDeliveryEw)}</td>
  <td class="num">${ew(r.assignedEw)}</td>
  <td class="num">${reserve}</td>
  <td class="num">${
    r.shortfallEw > 0
      ? `<span class="pill crit">${ew(r.shortfallEw)} ew short</span>`
      : `<span class="pill good">${ew(r.headroomEw)} ew headroom</span>`
  }</td>
</tr>`;
    })
    .join('');

  const head = `<tr><th>Team</th><th class="num">Net delivery</th><th class="num">Assigned</th>
    <th class="num">Unplanned Work reserve</th><th class="num">Headroom or shortfall</th></tr>`;
  const total = `<tr class="total"><td>Engineering total</td>
    <td class="num">${ew(t.netDeliveryEw)}</td><td class="num">${ew(t.assignedEw)}</td><td class="num">${ew(t.reserveEw)}</td>
    <td class="num"><span class="pill good">${ew(t.surplusHeadroomEw)} headroom</span>${
      t.shortfallEw > 0 ? ` <span class="pill crit">${ew(t.shortfallEw)} short</span>` : ''
    }</td></tr>`;

  return table(head, (rows || emptyRow(5, 'No teams yet.')) + total);
}

export function allocationsMixRegion(eng: EngineeringQuarter): string {
  const t = eng.totals;
  const head = `<tr><th>Category</th><th class="num">Assigned (ew)</th>
    <th class="num">% of Engineering net delivery capacity (${ew(t.netDeliveryEw)} ew)</th></tr>`;
  const rows =
    CATEGORIES.map(
      (c) =>
        `<tr><td>${e(c)}</td><td class="num">${ew(eng.byCategory[c].ew)}</td><td class="num">${pct(
          eng.byCategory[c].percent,
        )}</td></tr>`,
    ).join('') +
    `<tr><td>Unplanned Work reserve <span class="sub2">unclassified until consumed</span></td>
      <td class="num">${ew(t.reserveEw)}</td><td class="num">${pct(shareOfNetDelivery(t.reserveEw, t))}</td></tr>
    <tr><td>Unassigned headroom</td><td class="num">${ew(t.surplusHeadroomEw)}</td>
      <td class="num">${pct(shareOfNetDelivery(t.surplusHeadroomEw, t))}</td></tr>` +
    (t.shortfallEw > 0
      ? `<tr><td>Shortfall in overallocated teams</td>
        <td class="num"><span style="color:var(--crit)">−${ew(t.shortfallEw)}</span></td>
        <td class="num"><span style="color:var(--crit)">−${pct(shareOfNetDelivery(t.shortfallEw, t))}</span></td></tr>`
      : '');
  return table(head, rows);
}

export function allocationsStatesRegion(eng: EngineeringQuarter, ctx: ViewContext): string {
  const scope = ctx.teamId === null ? 'across Engineering' : 'across Engineering (the team filter does not narrow these counts)';
  return `<div class="pillrow">${(Object.keys(STATE_LABELS) as PlanningState[])
    .map((s) => `<span class="pill ${STATE_TONE[s]}">${e(STATE_LABELS[s])}: ${eng.stateCounts[s]}</span>`)
    .join('')}</div>
<p class="footnote" style="margin-top:8px">Non-overlapping counts ${e(scope)}.</p>`;
}

export function allocationsTeamsRegion(eng: EngineeringQuarter, ctx: ViewContext, back: string): string {
  const shown = ctx.teamId === null ? eng.plans : eng.plans.filter((p) => p.team.id === ctx.teamId);
  if (!shown.length) return card({ raw: emptyState('No teams in scope', 'Clear the team filter to see the work list.') });
  return `<div class="stack">${shown.map((p) => allocationsTeamCard(p, back)).join('')}</div>`;
}

const STATE_RULES = `<p class="footnote">States are non-overlapping. <b>Feasible</b> requires a recorded technical-lead
judgment; the arithmetic never confers it. A feasible verdict is refused unless capacity is assigned, the owning
team-quarter has no shortfall, and — when assigned capacity is below the estimate — the reduced scope is stated.
A judgment is flagged for reassessment, and stops counting as feasible, once any planning input of its team-quarter
changes, and stays flagged until a fresh judgment is recorded. Judgment history is kept.</p>`;

function workDialogs(eng: EngineeringQuarter, back: string): string[] {
  const out: string[] = [];
  for (const plan of eng.plans) {
    out.push(
      dialog({
        id: `dlg-accept-${plan.team.id}`,
        title: `Accept a WorkPackage onto ${plan.team.name}'s work list`,
        scope: `${plan.team.name} · ${plan.quarter.name}`,
        action: '/work-packages',
        hidden: { back, team_id: plan.team.id, quarter_id: plan.quarter.id },
        label: 'the WorkPackage',
        submitLabel: 'Accept onto work list',
        body: `${field('Name', '<input type="text" name="name" required>')}
      ${field(
        'Delivery investment category',
        `<select name="category">${CATEGORIES.map((c) => `<option>${e(c)}</option>`).join('')}</select>`,
      )}
      ${field('Rough estimate — this team’s contribution (ew)', '<input type="number" name="estimate_ew" step="0.1" min="0" required>')}
      ${field('Notes', '<input type="text" name="notes">', 'optional')}
      <p>Accepting work claims no capacity. It is assigned separately, and partial assignment stays visible as partial.</p>`,
      }),
    );

    for (const wp of plan.workPackages) {
      out.push(
        dialog({
          id: `dlg-judge-${wp.id}`,
          title: `Record a feasibility judgment for ${wp.name}`,
          scope: `${plan.team.name} · ${plan.quarter.name} · ${ew(wp.assignedEw)} of ${ew(wp.estimateEw)} ew assigned`,
          action: `/work-packages/${wp.id}/feasibility`,
          hidden: { back },
          label: `the judgment for ${wp.name}`,
          submitLabel: 'Record judgment',
          body: `${field(
            'Verdict',
            `<select name="verdict"><option value="feasible">Feasible</option><option value="not_feasible">Not feasible</option></select>`,
          )}
        ${field('Judged by (responsible technical lead)', '<input type="text" name="judged_by" required>')}
        ${field(
          'Material assumptions',
          '<textarea name="assumptions" rows="3" required placeholder="What this judgment rests on: estimates held, specialist availability, dependencies, delivery window…"></textarea>',
        )}
        ${field(
          'Reduced scope this judgment covers',
          '<input type="text" name="scope_note" placeholder="e.g. ingestion phase only">',
          'required when assigned capacity is below the estimate',
        )}
        <p>A feasible verdict is refused unless capacity is assigned, ${e(plan.team.name)} has no shortfall, and any
          reduced scope is stated. A not-feasible verdict is always recordable.</p>`,
        }),
      );

      out.push(
        dialog({
          id: `dlg-rm-wp-${wp.id}`,
          title: `Remove ${wp.name} from the work list?`,
          scope: `${plan.team.name} · ${plan.quarter.name}`,
          action: `/work-packages/${wp.id}/delete`,
          hidden: { back },
          label: wp.name,
          submitLabel: 'Remove from work list',
          destructive: true,
          body: `<p>This permanently removes ${e(wp.name)}, its <b>${ew(wp.assignedEw)} ew</b> assignment${
            wp.judgments.length
              ? ` and <b>${plural(wp.judgments.length, 'recorded feasibility judgment')}</b>`
              : ''
          }.</p>
        ${
          wp.assignedEw > 0.005
            ? `<p>${e(plan.team.name)} gets <b>${ew(wp.assignedEw)} ew</b> back, and every other feasibility judgment
              in ${e(plan.team.name)} · ${e(plan.quarter.name)} will need reassessment because the capacity they were
              judged against has changed.</p>`
            : ''
        }
        <p>This cannot be undone.</p>`,
        }),
      );
    }
  }
  return out;
}

export function allocationsPage(input: {
  quarters: QuarterRow[];
  teams: TeamRow[];
  eng: EngineeringQuarter | null;
  ctx: ViewContext;
}): string {
  const { quarters, teams, eng, ctx } = input;
  const contextBar = { path: '/allocations', quarters, teams, ctx };

  if (!eng) {
    return layout({
      title: 'Allocations',
      active: 'allocations',
      ctx,
      contextBar,
      body: `${pageHead({ title: 'Engineering allocations' })}
${card({ raw: emptyState('No quarter selected', 'Add a quarter under <a href="/setup">Setup</a> to plan against it.') })}`,
    });
  }

  const back = viewHref('/allocations', ctx);
  const t = eng.totals;
  const scoped = ctx.teamId !== null;
  const teamName = teams.find((x) => x.id === ctx.teamId)?.name;

  return layout({
    title: 'Allocations',
    active: 'allocations',
    ctx,
    contextBar: {
      ...contextBar,
      trailing: `${plural(eng.workPackages.length, 'WorkPackage')} · ${plural(eng.plans.length, 'team')}`,
    },
    body: `${pageHead({
      title: 'Engineering allocations',
      meta: `${quarterMeta(eng.quarter, eng.plans[0])} · assignments, reserves, reconciliation and feasibility belong to a
        team-quarter; this view collects them and never pools capacity between teams`,
    })}
${isSynthetic(teams.map((x) => x.name)) ? `<div style="margin-bottom:14px">${SYNTHETIC_NOTE}</div>` : ''}
${card({
  title: 'Engineering-wide reconciliation',
  sub: 'Summed quantities · headroom and shortfall reported separately',
  body: region('alloc-summary', allocationsSummaryRegion(eng)),
  sticky: true,
})}
${card({
  title: 'Per-team reconciliation',
  sub: 'Every team is listed whatever the filter, so a shortfall is never hidden',
  raw: region('alloc-recon', allocationsReconRegion(eng, ctx, back)),
  foot: `<p class="footnote">The Unplanned Work reserve is capacity a team intends to spend on work that is not yet
    known. It is not overhead and not headroom, and it stays outside the investment categories until it is consumed.</p>`,
})}
${card({
  title: 'Delivery investment mix',
  sub: `Denominator: Engineering net delivery capacity, ${ew(t.netDeliveryEw)} ew`,
  raw: region('alloc-mix', allocationsMixRegion(eng)),
  foot: `<p class="footnote">Percentages are computed from summed engineer-weeks over summed net delivery capacity —
    never by averaging the teams' percentages. They describe investment shape only; they never show whether work fits.</p>`,
})}
${card({
  title: 'Work list',
  sub: scoped && teamName ? `Showing ${e(teamName)} · counts below cover all teams` : undefined,
  body: `${region('alloc-states', allocationsStatesRegion(eng, ctx))}${STATE_RULES}`,
})}
${region('alloc-teams', allocationsTeamsRegion(eng, ctx, back))}
${dialogWell(workDialogs(eng, back))}`,
  });
}

// ---- pages: team-quarter detail --------------------------------------------------------------

export function planChainRegion(plan: TeamQuarterPlan): string {
  const cap = plan.capacity;
  return chain([
    { label: 'Contracted', value: ew(cap.contractedEw), unit: 'ew', den: 'schedules × effective dates' },
    { op: '−' },
    { label: 'Known absence', value: ew(cap.absenceEw), unit: 'ew', den: 'holidays and leave, counted once per day' },
    { op: '=' },
    { label: 'Available', value: ew(cap.availableEw), unit: 'ew', den: 'workforce capacity' },
    { op: '−' },
    { label: 'Overhead', value: ew(cap.overheadEw), unit: 'ew', den: 'management &amp; admin' },
    { op: '=' },
    { label: 'Net delivery', value: ew(cap.netDeliveryEw), unit: 'ew', tone: 'result' },
    {
      label: 'Overhead ratio',
      value: pct(cap.overheadRatio === null ? null : cap.overheadRatio * 100),
      aside: true,
      den: `${ew(cap.overheadEw)} ÷ ${ew(cap.availableEw)} ew available`,
    },
  ]);
}

const PERSON_COLS =
  '<colgroup><col class="name"><col class="narrow"><col class="wide">' +
  '<col class="narrow"><col class="narrow"><col class="narrow"><col class="narrow">' +
  '<col class="overhead"><col class="narrow"><col class="acts"></colgroup>';
const WORK_COLS =
  '<colgroup><col class="name"><col class="narrow"><col><col><col class="narrow"><col class="wide"><col class="acts"></colgroup>';

export function planCensusRegion(plan: TeamQuarterPlan, back: string): string {
  const cap = plan.capacity;
  const rows = plan.people.length
    ? plan.people.map((p) => personRow(p, cap.people.find((c) => c.personId === p.id)!, plan, back)).join('') +
      `<tr class="total"><td>Team total</td><td></td><td></td><td></td>
        <td class="num">${ew(cap.contractedEw)}</td><td class="num">${ew(cap.absenceEw)}</td>
        <td class="num">${ew(cap.availableEw)}</td><td class="num">${ew(cap.overheadEw)}</td>
        <td class="num">${ew(cap.netDeliveryEw)}</td><td></td></tr>`
    : emptyRow(10, 'Nobody is on this team yet.');
  return table(CENSUS_HEAD, rows, PERSON_COLS);
}

export function planWorkRegion(plan: TeamQuarterPlan, back: string): string {
  const rows = plan.workPackages.length
    ? plan.workPackages.map((wp) => workPackageRow(wp, plan, back)).join('')
    : emptyRow(7, 'No work has been accepted for this team this quarter.');
  return table(WORK_HEAD, rows, WORK_COLS);
}

export function planReconRegion(plan: TeamQuarterPlan, back: string): string {
  const r = plan.reconciliation;
  const reserve = numericCell({
    field: `reserve:${plan.team.id}`,
    label: `Unplanned Work reserve for ${plan.team.name}`,
    action: '/reserve',
    name: 'engineer_weeks',
    value: r.reserveEw,
    display: ew(r.reserveEw),
    unit: 'ew',
    step: '0.1',
    min: '0',
    spoken: 'engineer-weeks',
    hidden: { back, team_id: plan.team.id, quarter_id: plan.quarter.id },
  });

  return `${chain([
    { label: 'Net delivery', value: ew(r.netDeliveryEw), unit: 'ew', tone: 'result', den: 'from the capacity chain' },
    { op: '=' },
    { label: 'Assigned', value: ew(r.assignedEw), unit: 'ew', den: 'sum of the assignments below' },
    { op: '+' },
    { label: 'Unplanned Work reserve', value: ew(r.reserveEw), unit: 'ew', den: 'not overhead, not headroom' },
    { op: '+' },
    r.shortfallEw > 0
      ? { label: 'Shortfall', value: ew(r.shortfallEw), unit: 'ew', tone: 'crit' as const, den: 'this draft is overallocated' }
      : { label: 'Headroom', value: ew(r.headroomEw), unit: 'ew', tone: 'good' as const, den: 'unclaimed by any work' },
  ])}
<div style="margin-top:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
  <span class="ctx-label">Set the reserve</span>${reserve}
</div>
<p class="footnote" style="margin-top:10px">${identityHtml(plan)}</p>
${
  r.shortfallEw > 0
    ? `<div style="margin-top:14px">${callout({
        tone: 'crit',
        icon: '▲',
        title: `Overallocated by ${ew(r.shortfallEw)} ew`,
        body: `<p>Nothing has been adjusted to hide it. Reduce assignments, reduce the reserve deliberately, or revisit what was accepted.</p>`,
      })}</div>`
    : ''
}
<h2 class="section">Delivery investment mix</h2>
${table(
  `<tr><th>Category</th><th class="num">Assigned (ew)</th><th class="num">% of this team's net delivery capacity (${ew(
    plan.mix.denominatorEw,
  )} ew)</th></tr>`,
  CATEGORIES.map(
    (c) =>
      `<tr><td>${e(c)}</td><td class="num">${ew(plan.mix.byCategory[c].ew)}</td><td class="num">${pct(
        plan.mix.byCategory[c].percent,
      )}</td></tr>`,
  ).join('') +
    `<tr><td>Unplanned Work reserve <span class="sub2">unclassified until consumed</span></td>
      <td class="num">${ew(plan.mix.reserve.ew)}</td><td class="num">${pct(plan.mix.reserve.percent)}</td></tr>
    <tr><td>Unassigned headroom${r.shortfallEw > 0 ? ' (negative: shortfall)' : ''}</td>
      <td class="num">${ew(plan.mix.headroom.ew)}</td><td class="num">${pct(plan.mix.headroom.percent)}</td></tr>`,
)}`;
}

export function planStatesRegion(plan: TeamQuarterPlan): string {
  return `<div class="pillrow">${(Object.keys(STATE_LABELS) as PlanningState[])
    .map((s) => `<span class="pill ${STATE_TONE[s]}">${e(STATE_LABELS[s])}: ${plan.stateCounts[s]}</span>`)
    .join('')}</div>`;
}

export function planPage(plan: TeamQuarterPlan): string {
  const ctx: ViewContext = { quarterId: plan.quarter.id, teamId: plan.team.id };
  const back = `/plan/${plan.team.id}/${plan.quarter.id}`;

  const dialogs = [
    ...personDialogs(plan, back),
    dialog({
      id: 'dlg-add-person',
      title: `Add a person to ${plan.team.name}`,
      scope: `${plan.team.name} · capacity belongs to this team`,
      action: '/people',
      hidden: { back, team_id: plan.team.id },
      label: 'the new person',
      submitLabel: 'Add person',
      body: `${field('Name', '<input type="text" name="name" required>')}
      <div class="pair">
        ${field('Schedule fraction', '<input type="number" name="fraction" step="0.05" min="0.05" max="1" value="1" required>', '1 = full-time')}
        ${field('Joined', '<input type="date" name="joined">', 'blank = before the quarter')}
      </div>
      ${field('Left', '<input type="date" name="left">', 'blank = still here')}`,
    }),
  ];

  return layout({
    title: `${plan.team.name} · ${plan.quarter.name}`,
    active: 'team',
    ctx,
    body: `${pageHead({
      title: `${plan.team.name} · ${plan.quarter.name}`,
      meta: `${quarterMeta(plan.quarter, plan)} · team-quarter detail`,
      actions: `<a class="btn ghost" href="${e(viewHref('/census', ctx))}">Census</a>
        <a class="btn ghost" href="${e(viewHref('/capacity', ctx))}">Capacity</a>
        <a class="btn ghost" href="${e(viewHref('/allocations', ctx))}">Allocations</a>`,
    })}
<div class="stack" style="margin-bottom:14px">
  ${holidayCallout(plan, ctx)}
  ${isSynthetic([plan.team.name, plan.quarter.name]) ? SYNTHETIC_NOTE : ''}
  ${callout({
    tone: 'info',
    icon: '◆',
    title: 'This is optional detail',
    body: `<p>Everything here is also reachable, for this team and every other, from the Engineering-wide views.</p>`,
  })}
</div>
${card({ title: 'Capacity chain', body: region('plan-chain', planChainRegion(plan)) })}
${card({
  title: 'Census',
  sub: `${plural(plan.people.length, 'person', 'people')}`,
  raw: region('plan-census', planCensusRegion(plan, back)),
  foot: `<button type="button" class="btn ghost small" data-dialog="dlg-add-person">Add a person to ${e(
    plan.team.name,
  )}…</button>`,
})}
${card({
  title: 'Reconciliation',
  sub: 'net delivery = assigned + reserve + headroom',
  body: region('plan-recon', planReconRegion(plan, back)),
  foot: `<p class="footnote">Percentages describe investment shape only; they never show whether work fits.</p>`,
})}
${card({
  title: 'Quarterly work list',
  sub: region('plan-states', planStatesRegion(plan), 'span'),
  raw: region('plan-work', planWorkRegion(plan, back)),
  foot: `<button type="button" class="btn ghost small" data-dialog="dlg-accept-${plan.team.id}">Accept a WorkPackage onto ${e(
    plan.team.name,
  )}'s work list…</button>${STATE_RULES}`,
})}
${dialogWell([
  ...dialogs,
  dialog({
    id: `dlg-accept-${plan.team.id}`,
    title: `Accept a WorkPackage onto ${plan.team.name}'s work list`,
    scope: `${plan.team.name} · ${plan.quarter.name}`,
    action: '/work-packages',
    hidden: { back, team_id: plan.team.id, quarter_id: plan.quarter.id },
    label: 'the WorkPackage',
    submitLabel: 'Accept onto work list',
    body: `${field('Name', '<input type="text" name="name" required>')}
    ${field(
      'Delivery investment category',
      `<select name="category">${CATEGORIES.map((c) => `<option>${e(c)}</option>`).join('')}</select>`,
    )}
    ${field('Rough estimate — this team’s contribution (ew)', '<input type="number" name="estimate_ew" step="0.1" min="0" required>')}
    ${field('Notes', '<input type="text" name="notes">', 'optional')}`,
  }),
  ...plan.workPackages.flatMap((wp) => [
    dialog({
      id: `dlg-judge-${wp.id}`,
      title: `Record a feasibility judgment for ${wp.name}`,
      scope: `${plan.team.name} · ${plan.quarter.name} · ${ew(wp.assignedEw)} of ${ew(wp.estimateEw)} ew assigned`,
      action: `/work-packages/${wp.id}/feasibility`,
      hidden: { back },
      label: `the judgment for ${wp.name}`,
      submitLabel: 'Record judgment',
      body: `${field(
        'Verdict',
        `<select name="verdict"><option value="feasible">Feasible</option><option value="not_feasible">Not feasible</option></select>`,
      )}
      ${field('Judged by (responsible technical lead)', '<input type="text" name="judged_by" required>')}
      ${field('Material assumptions', '<textarea name="assumptions" rows="3" required></textarea>')}
      ${field('Reduced scope this judgment covers', '<input type="text" name="scope_note">', 'required when assigned is below the estimate')}`,
    }),
    dialog({
      id: `dlg-rm-wp-${wp.id}`,
      title: `Remove ${wp.name} from the work list?`,
      scope: `${plan.team.name} · ${plan.quarter.name}`,
      action: `/work-packages/${wp.id}/delete`,
      hidden: { back },
      label: wp.name,
      submitLabel: 'Remove from work list',
      destructive: true,
      body: `<p>This permanently removes ${e(wp.name)}, its <b>${ew(wp.assignedEw)} ew</b> assignment${
        wp.judgments.length ? ` and <b>${plural(wp.judgments.length, 'recorded feasibility judgment')}</b>` : ''
      }. This cannot be undone.</p>`,
    }),
  ]),
])}`,
  });
}

// ---- pages: setup ----------------------------------------------------------------------------

export function setupPage(input: {
  quarters: QuarterRow[];
  teams: TeamRow[];
  holidays: HolidayRow[];
  ctx: ViewContext;
}): string {
  const { quarters, teams, holidays, ctx } = input;

  const quarterRows = quarters.length
    ? quarters
        .map(
          (q) =>
            `<tr><td><span class="name">${e(q.name)}</span></td><td>${e(q.start)} → ${e(q.end)}</td>
             <td class="num"><a href="${e(viewHref('/capacity', ctx, { quarterId: q.id }))}">Open in Capacity</a></td></tr>`,
        )
        .join('')
    : emptyRow(3, 'No quarters defined yet.');

  const teamRows = teams.length
    ? teams
        .map(
          (t) =>
            `<tr><td><span class="name">${e(t.name)}</span></td>
             <td class="num"><a href="${e(viewHref('/census', ctx, { teamId: t.id }))}">Open in Census</a></td></tr>`,
        )
        .join('')
    : emptyRow(2, 'No teams defined yet.');

  const holidayRows = holidays.length
    ? holidays
        .map(
          (h) =>
            `<tr><td>${e(h.date)}</td><td>${e(h.name)}</td>
             <td class="mid">${rowMenu({
               key: `holiday-${h.date}`,
               label: `${h.name} on ${h.date}`,
               items: [{ label: 'Remove holiday…', dialog: `dlg-rm-holiday-${h.date}`, danger: true }],
             })}</td></tr>`,
        )
        .join('')
    : emptyRow(3, 'No holidays entered — capacity is calculated as if none fall in any quarter.');

  const dialogs = [
    dialog({
      id: 'dlg-add-quarter',
      title: 'Add a quarter',
      scope: 'An inclusive date range; capacity comes from the Mon–Fri days inside it',
      action: '/quarters',
      hidden: {},
      label: 'the quarter',
      submitLabel: 'Add quarter',
      body: `${field('Name', '<input type="text" name="name" required placeholder="Q1 2027">')}
      <div class="pair">${field('Start', '<input type="date" name="start" required>')}${field('End', '<input type="date" name="end" required>')}</div>`,
    }),
    dialog({
      id: 'dlg-add-team',
      title: 'Add a team',
      scope: 'A team owns capacity and is the unit a quarterly plan is made for',
      action: '/teams',
      hidden: {},
      label: 'the team',
      submitLabel: 'Add team',
      body: field('Name', '<input type="text" name="name" required placeholder="Team name">'),
    }),
    dialog({
      id: 'dlg-add-holiday',
      title: 'Add a holiday',
      scope: 'Organization-wide · counts as known absence for everyone in force that day',
      action: '/holidays',
      hidden: { back: viewHref('/setup', ctx) },
      label: 'the holiday',
      submitLabel: 'Add holiday',
      body: `<div class="pair">${field('Date', '<input type="date" name="date" required>')}${field(
        'Name',
        '<input type="text" name="name" required placeholder="Founders’ Day">',
      )}</div>
      <p>A holiday on a weekend has no effect, and a holiday inside someone's leave is counted once.</p>`,
    }),
    ...holidays.map((h) =>
      dialog({
        id: `dlg-rm-holiday-${h.date}`,
        title: `Remove ${h.name}?`,
        scope: `${h.date} · organization-wide`,
        action: '/holidays/delete',
        hidden: { date: h.date, back: viewHref('/setup', ctx) },
        label: h.name,
        submitLabel: 'Remove holiday',
        destructive: true,
        body: `<p>This raises available capacity for everyone in force on ${e(h.date)}, in every quarter containing it,
        and every feasibility judgment for those team-quarters will need reassessment. This cannot be undone.</p>`,
      }),
    ),
  ];

  return layout({
    title: 'Setup',
    active: 'setup',
    ctx,
    contextBar: { path: '/setup', quarters, teams, ctx, showTeamFilter: false },
    body: `${pageHead({
      title: 'Setup',
      meta: `Reference data for the workspace. Day-to-day planning happens under
        <a href="${e(viewHref('/census', ctx))}">Census</a>, <a href="${e(viewHref('/capacity', ctx))}">Capacity</a>
        and <a href="${e(viewHref('/allocations', ctx))}">Allocations</a>.`,
    })}
${card({
  title: 'Quarters',
  sub: 'Capacity is derived from the working days inside the range',
  raw: table(`<tr><th>Quarter</th><th>Dates</th><th class="num"></th></tr>`, quarterRows),
  foot: `<button type="button" class="btn ghost small" data-dialog="dlg-add-quarter">Add quarter…</button>`,
})}
${card({
  title: 'Teams',
  sub: 'The planning unit is the team-quarter',
  raw: table(`<tr><th>Team</th><th class="num"></th></tr>`, teamRows),
  foot: `<button type="button" class="btn ghost small" data-dialog="dlg-add-team">Add team…</button>`,
})}
${card({
  title: 'Holiday calendar',
  sub: 'Entered deliberately — no jurisdiction is assumed and nothing is fetched',
  raw: table(`<tr><th>Date</th><th>Name</th><th><span class="sr-only">Actions</span></th></tr>`, holidayRows, '<colgroup><col><col><col class="acts"></colgroup>'),
  foot: `<button type="button" class="btn ghost small" data-dialog="dlg-add-holiday">Add holiday…</button>`,
})}
${
  quarters.length && teams.length
    ? card({
        title: 'Team-quarter detail',
        sub: 'Optional — everything here is also in the Engineering-wide views',
        raw: table(
          `<tr><th>Team</th><th>Quarter</th><th class="num"></th></tr>`,
          teams
            .flatMap((t) =>
              quarters.map(
                (q) =>
                  `<tr><td>${e(t.name)}</td><td>${e(q.name)}</td>
                   <td class="num"><a href="/plan/${t.id}/${q.id}">Open team detail</a></td></tr>`,
              ),
            )
            .join(''),
        ),
      })
    : ''
}
${dialogWell(dialogs)}`,
  });
}
