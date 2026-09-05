/**
 * The shared interface vocabulary. Every page is assembled from these; no page carries its
 * own styling or its own markup idiom, so a change here changes the whole workspace.
 *
 * Two conventions the rest of the code depends on:
 *
 *  - **Regions.** Anything the server may have to re-render after a background save is
 *    wrapped in `region()`. The save response carries new inner HTML keyed by region name
 *    (`regions.ts`), and the browser swaps it in. Regions never nest.
 *  - **Field keys.** Every inline editor and every focusable control that survives a swap
 *    carries a stable key, so focus and half-typed values are restored afterwards.
 */

import { CSS, JS } from './assets.js';
import type { QuarterRow, TeamRow } from '../db/repo.js';

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
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

// ---- page context --------------------------------------------------------------------------

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

// ---- regions -------------------------------------------------------------------------------

/** Wraps content the server can re-render on its own after a background save. */
export function region(name: string, inner: string, tag = 'div'): string {
  return `<${tag} data-region="${e(name)}">${inner}</${tag}>`;
}

// ---- shell ---------------------------------------------------------------------------------

const PENCIL =
  '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
  '<path d="M11.2 2.3l2.5 2.5-8 8-3.2.7.7-3.2 8-8z"/></svg>';

function topbar(active: Tab, ctx: ViewContext): string {
  const item = (tab: Tab, path: string, label: string) =>
    `<a href="${e(viewHref(path, ctx))}"${active === tab ? ' aria-current="page"' : ''}>${e(label)}</a>`;
  return `<div class="topbar">
  <span class="brand">ProductFolio</span>
  <nav aria-label="Workspace">${item('census', '/census', 'Census')}${item('capacity', '/capacity', 'Capacity')}${item(
    'allocations',
    '/allocations',
    'Allocations',
  )}</nav>
  <a class="util" href="${e(viewHref('/setup', ctx))}"${active === 'setup' ? ' aria-current="page"' : ''}>Setup</a>
</div>`;
}

export interface ContextBarInput {
  /** The page the selectors submit back to, so the choice lands on the current view. */
  path: string;
  quarters: QuarterRow[];
  teams: TeamRow[];
  ctx: ViewContext;
  /** Right-hand summary, e.g. "2 teams · 9 people". */
  trailing?: string | undefined;
  /** Team filtering is offered only where it means something. */
  showTeamFilter?: boolean | undefined;
}

/**
 * Quarter and team are workspace context, not page content: they live in the shell, they
 * survive navigation, and they are preserved through every edit because each form carries
 * the current view in its `back` field.
 */
function contextBar(input: ContextBarInput): string {
  const { path, quarters, teams, ctx, trailing, showTeamFilter = true } = input;
  const quarterField = ctx.quarterId !== null ? `<input type="hidden" name="q" value="${ctx.quarterId}">` : '';

  const quarterPart = quarters.length
    ? `<form method="get" action="${e(path)}">
    <label class="ctx-label" for="ctx-quarter">Quarter</label>
    <select id="ctx-quarter" name="q" data-autosubmit>${quarters
      .map((q) => `<option value="${q.id}"${q.id === ctx.quarterId ? ' selected' : ''}>${e(q.name)}</option>`)
      .join('')}</select>
    ${ctx.teamId !== null ? `<input type="hidden" name="team" value="${ctx.teamId}">` : ''}
    <button class="btn ghost small" data-noscript>Show</button>
  </form>`
    : `<span class="ctx-label">No quarters yet</span>
    <a class="chip" href="/setup">Add one in Setup</a>`;

  const teamPart =
    !showTeamFilter || teams.length < 2
      ? ''
      : ctx.teamId === null
        ? `<form method="get" action="${e(path)}">
    <label class="ctx-label" for="ctx-team">Team</label>
    <select id="ctx-team" name="team" data-autosubmit>
      <option value="">All teams</option>
      ${teams.map((t) => `<option value="${t.id}">${e(t.name)}</option>`).join('')}
    </select>${quarterField}
    <button class="btn ghost small" data-noscript>Filter</button>
  </form>`
        : `<span class="ctx-label">Team</span>
    <span class="chip clearable">${e(teams.find((t) => t.id === ctx.teamId)?.name ?? '')}
      <a class="clear" href="${e(viewHref(path, ctx, { teamId: null }))}" aria-label="Clear the team filter and show all teams">×</a>
    </span>`;

  return `<div class="contextbar">
  ${quarterPart}
  ${teamPart}
  <span class="ctx-end">
    <span id="save-status" aria-hidden="true"></span>
    ${trailing ? `<span>${trailing}</span>` : ''}
  </span>
</div>
<p id="live-status" class="sr-only" role="status" aria-live="polite"></p>`;
}

export interface LayoutInput {
  title: string;
  active: Tab;
  ctx: ViewContext;
  body: string;
  contextBar?: ContextBarInput | undefined;
}

export function layout(input: LayoutInput): string {
  const { title, active, ctx, body } = input;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} — ProductFolio</title>
<link rel="stylesheet" href="${e(CSS.href)}">
<script>document.documentElement.className += ' js';</script>
</head>
<body>
${topbar(active, ctx)}
${input.contextBar ? contextBar(input.contextBar) : ''}
<main>${body}</main>
<script src="${e(JS.href)}" defer></script>
</body></html>`;
}

export function errorPage(message: string, backHref: string): string {
  return layout({
    title: 'Could not save',
    active: 'setup',
    ctx: { quarterId: null, teamId: null },
    body: `${pageHead({ title: 'Could not save' })}
${callout({ tone: 'crit', icon: '▲', title: 'The change was not saved', body: `<p>${e(message)}</p>` })}
<p style="margin-top:16px"><a class="btn ghost" href="${e(backHref)}">Back to the workspace</a></p>`,
  });
}

// ---- page furniture ------------------------------------------------------------------------

export function pageHead(input: { title: string; meta?: string | undefined; actions?: string | undefined }): string {
  return `<div class="pagehead">
  <div>
    <h1>${e(input.title)}</h1>
    ${input.meta ? `<p class="meta">${input.meta}</p>` : ''}
  </div>
  ${input.actions ? `<div class="actions">${input.actions}</div>` : ''}
</div>`;
}

export function card(input: {
  title?: string | undefined;
  sub?: string | undefined;
  body?: string | undefined;
  raw?: string | undefined;
  foot?: string | undefined;
  sticky?: boolean | undefined;
}): string {
  const header = input.title
    ? `<header><h2>${e(input.title)}</h2>${input.sub ? `<span class="sub">${input.sub}</span>` : ''}</header>`
    : '';
  const body = input.body !== undefined ? `<div class="body">${input.body}</div>` : '';
  const foot = input.foot ? `<div class="foot">${input.foot}</div>` : '';
  const html = `<div class="card">${header}${body}${input.raw ?? ''}${foot}</div>`;
  return input.sticky ? `<div class="sticky-summary">${html}</div>` : html;
}

export function table(head: string, body: string, cols = ''): string {
  return `<div class="tblwrap"><table class="data">${cols}<thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

export function emptyRow(colspan: number, message: string): string {
  return `<tr class="empty"><td colspan="${colspan}">${e(message)}</td></tr>`;
}

export function emptyState(title: string, body: string): string {
  return `<div class="empty"><div class="t">${e(title)}</div><div>${body}</div></div>`;
}

export type Tone = 'good' | 'warn' | 'crit' | 'info' | 'neutral' | 'example';

export function pill(tone: Tone, label: string): string {
  return `<span class="pill ${tone}">${e(label)}</span>`;
}

export function callout(input: { tone: Tone; icon: string; title: string; body: string }): string {
  return `<div class="callout ${input.tone}"><span class="ico" aria-hidden="true">${e(input.icon)}</span>
  <div><div class="t">${e(input.title)}</div>${input.body}</div></div>`;
}

export interface TileInput {
  label: string;
  value: string;
  unit?: string | undefined;
  den?: string | undefined;
  tone?: 'result' | 'good' | 'crit' | undefined;
  aside?: boolean | undefined;
}

export function tile(input: TileInput): string {
  const classes = ['tile', input.tone ?? '', input.aside ? 'aside' : ''].filter(Boolean).join(' ');
  return `<div class="${classes}">
  <div class="lbl">${e(input.label)}</div>
  <div class="val">${e(input.value)}${input.unit ? `<span class="u">${e(input.unit)}</span>` : ''}</div>
  ${input.den ? `<div class="den">${input.den}</div>` : ''}
</div>`;
}

/** A capacity chain: tiles with the operators drawn between them, so it reads as arithmetic. */
export function chain(steps: Array<TileInput | { op: string }>): string {
  return `<div class="chain">${steps
    .map((s) => ('op' in s ? `<div class="op" aria-hidden="true">${e(s.op)}</div>` : tile(s)))
    .join('')}</div>`;
}

// ---- inline numeric editing ----------------------------------------------------------------

export interface NumericCellInput {
  /** Stable key for this value, e.g. `overhead:12`. Survives a region swap. */
  field: string;
  /** Human name used in labels and announcements, e.g. `overhead for Lena`. */
  label: string;
  action: string;
  name: string;
  value: number;
  /** What the read state shows, e.g. `40%` or `9.0`. */
  display: string;
  hidden: Record<string, string | number>;
  unit?: string | undefined;
  step?: string | undefined;
  min?: string | undefined;
  max?: string | undefined;
  /** The unit word used in the button's accessible name, e.g. `percent`. */
  spoken?: string | undefined;
  hint?: string | undefined;
}

/**
 * A number that reads as data and edits deliberately. Without JavaScript this is exactly
 * the plain form it has always been; with JavaScript the form is hidden behind an edit
 * button and posted in the background.
 */
export function numericCell(input: NumericCellInput): string {
  const hidden = Object.entries(input.hidden)
    .map(([k, v]) => `<input type="hidden" name="${e(k)}" value="${e(v)}">`)
    .join('');
  const spoken = input.spoken ? ` ${input.spoken}` : '';
  return `<div class="cell" data-field="${e(input.field)}" data-value="${e(input.value)}" data-label="${e(input.label)}">
  <span class="v">${e(input.display)}</span>
  <button type="button" class="edit" data-edit data-focus-key="${e(input.field)}"
    aria-label="Edit ${e(input.label)}, currently ${e(input.display)}">${PENCIL}</button>
  <form class="editor" method="post" action="${e(input.action)}" data-editform>${hidden}
    <input type="number" name="${e(input.name)}" value="${e(input.value)}"${input.step ? ` step="${e(input.step)}"` : ''}${
      input.min !== undefined ? ` min="${e(input.min)}"` : ''
    }${input.max !== undefined ? ` max="${e(input.max)}"` : ''} data-input
      aria-label="${e(input.label)}${e(spoken)}">
    ${input.unit ? `<span class="unit" aria-hidden="true">${e(input.unit)}</span>` : ''}
    <button class="btn small" data-submit>Save</button>
  </form>
</div>${input.hint ? `<div class="hint">${input.hint}</div>` : ''}`;
}

// ---- row menus -----------------------------------------------------------------------------

export interface MenuItem {
  label: string;
  dialog: string;
  danger?: boolean | undefined;
  /** Renders a rule above this item. */
  separated?: boolean | undefined;
}

/** Destructive actions live behind this, never as permanent buttons in the table. */
export function rowMenu(input: { key: string; label: string; items: MenuItem[] }): string {
  const items = input.items
    .map(
      (i) =>
        `${i.separated ? '<hr>' : ''}<button type="button" role="menuitem" data-dialog="${e(i.dialog)}"${
          i.danger ? ' class="danger"' : ''
        }>${e(i.label)}</button>`,
    )
    .join('');
  return `<div class="rowmenu">
  <button type="button" class="dots" data-focus-key="menu:${e(input.key)}" aria-haspopup="menu"
    aria-expanded="false" aria-label="Actions for ${e(input.label)}">⋯</button>
  <div class="menu" role="menu" hidden>${items}</div>
</div>`;
}

// ---- dialogs -------------------------------------------------------------------------------

export interface DialogInput {
  id: string;
  title: string;
  /** Names the person, team, quarter or effective dates the action applies to. */
  scope: string;
  action: string;
  hidden: Record<string, string | number>;
  body: string;
  submitLabel: string;
  destructive?: boolean | undefined;
  /** Announced while saving, e.g. `absence for Priya`. */
  label?: string | undefined;
}

export function dialog(input: DialogInput): string {
  const hidden = Object.entries(input.hidden)
    .map(([k, v]) => `<input type="hidden" name="${e(k)}" value="${e(v)}">`)
    .join('');
  return `<dialog id="${e(input.id)}" aria-labelledby="${e(input.id)}-title">
  <form method="post" action="${e(input.action)}" data-dialogform data-label="${e(input.label ?? input.title)}">
    <header>
      <h2 id="${e(input.id)}-title">${e(input.title)}</h2>
      <div class="scope">${e(input.scope)}</div>
    </header>
    <div class="body">${hidden}${input.body}</div>
    <footer>
      <button type="button" class="btn ghost" data-close-dialog>Cancel</button>
      <button class="btn${input.destructive ? ' destructive' : ''}">${e(input.submitLabel)}</button>
    </footer>
  </form>
</dialog>`;
}

/** Collects a page's dialogs. Without JavaScript they render inline as ordinary forms. */
export function dialogWell(dialogs: string[]): string {
  if (!dialogs.length) return '';
  return `<div class="dialog-well"><h2 class="section">Actions</h2>${dialogs.join('')}</div>`;
}

export function field(label: string, control: string, note?: string | undefined): string {
  return `<label>${e(label)}${note ? ` <span class="note">${e(note)}</span>` : ''}${control}</label>`;
}
