/**
 * The one stylesheet. Every visual decision in the workspace is made here, through tokens
 * and shared component classes — pages never carry their own styling.
 *
 * Served from a content-hashed URL (see `assets.ts`) so it is fetched once and cached, and
 * so a change to it can never be served stale.
 *
 * Light theme only, deliberately: the tokens are named by role rather than by colour, so a
 * dark set is a later addition to this block and not a rewrite of the components.
 */

export const APP_CSS = String.raw`
:root {
  color-scheme: light;

  /* Neutrals, biased slightly cool so they sit with the accent rather than beside it. */
  --canvas:#f4f6f8;
  --surface:#ffffff;
  --sunken:#eef1f6;
  --raised:#fafbfd;
  --ink:#151a21;
  --ink-2:#414c5c;
  --ink-3:#6b7686;
  --rule:#dde2ea;
  --rule-2:#c5cdd9;

  /* One accent. */
  --accent:#1d4e89;
  --accent-2:#17406f;
  --accent-tint:#e6eef8;
  --accent-edge:#c9dbf1;

  /* Semantic colour, used only for meaning — never for emphasis. */
  --good:#186b3a;
  --good-tint:#e1f0e7;
  --good-edge:#c3e0cf;
  --warn:#8a5300;
  --warn-tint:#faeed7;
  --warn-edge:#ebdcbb;
  --crit:#a01f27;
  --crit-tint:#fae9ea;
  --crit-edge:#eecdd0;

  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
  --r-control:6px; --r-card:9px; --r-pill:999px;
  --focus:0 0 0 3px rgba(29,78,137,.28);
  --pop:0 1px 2px rgba(21,26,33,.06), 0 8px 24px rgba(21,26,33,.14);

  --font:ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

*, *::before, *::after { box-sizing:border-box; }

body {
  margin:0; background:var(--canvas); color:var(--ink);
  font-family:var(--font); font-size:14px; line-height:1.5;
  -webkit-font-smoothing:antialiased;
}

:focus-visible { outline:2px solid var(--accent); outline-offset:2px; box-shadow:var(--focus); border-radius:4px; }
a { color:var(--accent); text-underline-offset:2px; }
a:hover { color:var(--accent-2); }

.sr-only {
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0;
}

/* ---------------------------------------------------------------- app shell */

.topbar {
  background:#12253d; color:#fff; display:flex; align-items:center;
  gap:20px; padding:0 20px; height:52px; flex-wrap:wrap;
}
.topbar .brand { font-weight:600; font-size:15px; letter-spacing:-.01em; }
.topbar nav { display:flex; gap:2px; margin-right:auto; flex-wrap:wrap; }
.topbar nav a {
  color:#c3d6ee; text-decoration:none; font-size:13.5px; font-weight:500;
  padding:6px 12px; border-radius:var(--r-control);
}
.topbar nav a:hover { background:rgba(255,255,255,.09); color:#fff; }
.topbar nav a[aria-current="page"] { background:rgba(255,255,255,.14); color:#fff; }
.topbar .util { color:#9db4d1; text-decoration:none; font-size:13px; padding:6px 10px; border-radius:var(--r-control); }
.topbar .util:hover { background:rgba(255,255,255,.09); color:#fff; }
.topbar :focus-visible { outline-color:#fff; box-shadow:none; }

.contextbar {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  background:var(--surface); border-bottom:1px solid var(--rule); padding:9px 20px;
}
.contextbar form { display:contents; }
.ctx-label {
  font-size:11px; font-weight:600; letter-spacing:.08em;
  text-transform:uppercase; color:var(--ink-3);
}
.ctx-end { margin-left:auto; display:flex; align-items:center; gap:10px; font-size:12px; color:var(--ink-3); }

main { padding:20px; max-width:1240px; margin:0 auto; }

.pagehead { display:flex; align-items:flex-start; gap:20px; flex-wrap:wrap; margin-bottom:16px; }
.pagehead h1 { font-size:23px; font-weight:600; letter-spacing:-.015em; margin:0 0 5px; line-height:1.2; }
.pagehead .meta { font-size:12.5px; color:var(--ink-3); margin:0; max-width:92ch; }
.pagehead .meta b { color:var(--ink-2); font-weight:500; font-variant-numeric:tabular-nums; }
.pagehead .actions { margin-left:auto; display:flex; gap:8px; flex-wrap:wrap; }

/* ---------------------------------------------------------------- controls */

select, input[type="number"], input[type="text"], input[type="date"], textarea {
  font:inherit; color:var(--ink); background:var(--surface);
  border:1px solid var(--rule-2); border-radius:var(--r-control); padding:5px 8px;
  max-width:100%;
}
textarea { resize:vertical; }
input[type="number"] { font-variant-numeric:tabular-nums; text-align:right; }
input:disabled, select:disabled { background:var(--sunken); color:var(--ink-3); }

.btn {
  font:inherit; font-size:13px; font-weight:500; cursor:pointer;
  background:var(--accent); color:#fff; border:1px solid var(--accent);
  border-radius:var(--r-control); padding:6px 13px; text-decoration:none;
  display:inline-flex; align-items:center; gap:6px;
}
.btn:hover { background:var(--accent-2); border-color:var(--accent-2); color:#fff; }
.btn.ghost { background:var(--surface); color:var(--accent); border-color:var(--rule-2); }
.btn.ghost:hover { background:var(--accent-tint); border-color:var(--accent-edge); color:var(--accent); }
.btn.destructive { background:var(--crit); border-color:var(--crit); color:#fff; }
.btn.destructive:hover { background:#8a1a21; border-color:#8a1a21; }
.btn.small { font-size:12px; padding:4px 9px; }

.chip {
  display:inline-flex; align-items:center; gap:6px; background:var(--accent-tint);
  color:var(--accent); border:1px solid var(--accent-edge); border-radius:var(--r-pill);
  padding:3px 11px; font-size:12.5px; font-weight:500; text-decoration:none;
}
.chip.clearable { padding-right:5px; }
.chip a.clear {
  width:18px; height:18px; border-radius:var(--r-pill); display:grid; place-items:center;
  color:var(--accent); text-decoration:none; font-size:13px; line-height:1;
}
.chip a.clear:hover { background:#d3e2f4; }

/* ---------------------------------------------------------------- cards */

.card { background:var(--surface); border:1px solid var(--rule); border-radius:var(--r-card); }
.card > header {
  display:flex; align-items:baseline; gap:10px; flex-wrap:wrap;
  padding:12px 16px; border-bottom:1px solid var(--rule);
}
.card > header h2, .card > header h3 { font-size:14.5px; font-weight:600; margin:0; letter-spacing:-.005em; }
.card > header .sub { font-size:12px; color:var(--ink-3); margin-left:auto; }
.card > .body { padding:16px; }
.card > .body > :first-child { margin-top:0; }
.card > .body > :last-child { margin-bottom:0; }
.card > .foot { padding:11px 16px; border-top:1px solid var(--rule); background:var(--raised); border-radius:0 0 var(--r-card) var(--r-card); }
/* Grid and flex children default to min-width:auto, which lets a wide table stretch its
   card past the page. Allowing them to shrink is what makes .tblwrap actually scroll. */
.stack { display:grid; gap:12px; }
.stack > * { min-width:0; }
.card { min-width:0; }
.stack + .card, .card + .card, .card + .stack, .stack + .stack { margin-top:14px; }

h2.section { font-size:15px; font-weight:600; margin:26px 0 10px; letter-spacing:-.005em; }
h2.section:first-child { margin-top:0; }

/* ---------------------------------------------------------------- capacity chain */

.chain { display:flex; align-items:stretch; flex-wrap:wrap; }
.chain .op {
  display:flex; align-items:flex-start; justify-content:center; width:30px; flex:none;
  padding-top:24px; font-size:18px; color:var(--ink-3); line-height:1;
}
.tile { flex:1 1 150px; min-width:140px; padding:2px 0; }
.tile .lbl {
  font-size:10.5px; font-weight:600; letter-spacing:.07em; text-transform:uppercase;
  color:var(--ink-3); margin-bottom:5px; line-height:1.35;
}
.tile .val {
  font-size:26px; font-weight:600; letter-spacing:-.02em; line-height:1.1;
  font-variant-numeric:tabular-nums; color:var(--ink);
}
.tile .val .u { font-size:13px; font-weight:500; color:var(--ink-3); margin-left:3px; letter-spacing:0; }
.tile .den { font-size:11.5px; color:var(--ink-3); margin-top:4px; line-height:1.4; }
.tile.result .val { color:var(--accent); }
.tile.good .val { color:var(--good); }
.tile.crit .val { color:var(--crit); }
.tile.aside { border-left:1px solid var(--rule); padding-left:18px; margin-left:12px; }

/* ---------------------------------------------------------------- tables */

.tblwrap { overflow-x:auto; max-width:100%; }
table.data { border-collapse:collapse; width:100%; font-size:13.5px; }
table.data th, table.data td { padding:9px 12px; border-bottom:1px solid var(--rule); text-align:left; vertical-align:top; }
table.data thead th {
  font-size:10.5px; font-weight:600; letter-spacing:.07em; text-transform:uppercase;
  color:var(--ink-3); background:var(--sunken); border-bottom:1px solid var(--rule-2);
  white-space:nowrap; padding-top:8px; padding-bottom:8px; vertical-align:bottom;
  position:sticky; top:0; z-index:2;
}
table.data td.num, table.data th.num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
table.data td.mid { vertical-align:middle; }
table.data tbody tr:hover { background:var(--raised); }
table.data tbody tr:last-child td { border-bottom:0; }
table.data .strong { font-weight:600; }
table.data .name { font-weight:600; }
table.data .sub2 { display:block; font-size:11.5px; color:var(--ink-3); margin-top:2px; font-weight:400; }
table.data tr.total td {
  background:var(--sunken); font-weight:600;
  border-top:1px solid var(--rule-2); border-bottom:0;
}
table.data tr.total td:first-child { border-radius:0 0 0 var(--r-card); }
table.data tr.group th, table.data tr.group td {
  background:var(--raised); font-weight:600; font-size:12.5px;
  border-bottom:1px solid var(--rule-2); border-top:1px solid var(--rule-2);
  position:sticky; top:29px; z-index:1;
}
table.data tr.empty td { color:var(--ink-3); }
table.data col.acts { width:44px; }
table.data col.name { width:14%; min-width:130px; }
table.data col.wide { width:18%; }
table.data col.narrow { width:8%; }
table.data col.overhead { width:12%; min-width:120px; }
table.data tr.total td:first-child { white-space:nowrap; }
.card > .tblwrap table.data thead th:first-child { border-top-left-radius:var(--r-card); }
.card > .tblwrap table.data thead th:last-child { border-top-right-radius:var(--r-card); }

/* ---------------------------------------------------------------- pills & callouts */

.pill {
  display:inline-block; border-radius:var(--r-pill); padding:2px 9px;
  font-size:11.5px; font-weight:600; white-space:nowrap; line-height:1.5;
}
.pill.good { background:var(--good-tint); color:var(--good); }
.pill.crit { background:var(--crit-tint); color:var(--crit); }
.pill.warn { background:var(--warn-tint); color:var(--warn); }
.pill.neutral { background:var(--sunken); color:var(--ink-2); }
.pill.info { background:var(--accent-tint); color:var(--accent); }
.pill + .pill { margin-left:5px; }
.pillrow { display:flex; flex-wrap:wrap; gap:6px; }

.callout {
  display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:start;
  border:1px solid var(--rule); border-left-width:3px; border-radius:0 8px 8px 0;
  padding:11px 14px; font-size:13px; background:var(--surface); border-left-color:var(--rule-2);
}
.callout .ico { font-size:14px; line-height:1.5; }
.callout .t { font-weight:600; margin-bottom:2px; }
.callout p { margin:0; color:var(--ink-2); }
.callout p + p { margin-top:5px; }
.callout.crit { background:var(--crit-tint); border-color:var(--crit-edge); border-left-color:var(--crit); }
.callout.crit .t, .callout.crit .ico { color:var(--crit); }
.callout.warn { background:var(--warn-tint); border-color:var(--warn-edge); border-left-color:var(--warn); }
.callout.warn .t, .callout.warn .ico { color:var(--warn); }
.callout.good { background:var(--good-tint); border-color:var(--good-edge); border-left-color:var(--good); }
.callout.good .t, .callout.good .ico { color:var(--good); }
.callout.example { background:var(--sunken); border-color:var(--rule); border-left-color:var(--rule-2); color:var(--ink-2); }
.callout.example .t, .callout.example .ico { color:var(--ink-2); }

.empty { padding:22px 16px; text-align:center; color:var(--ink-3); font-size:13px; }
.empty .t { font-weight:600; color:var(--ink-2); margin-bottom:3px; font-size:14px; }

.footnote { font-size:12px; color:var(--ink-3); margin:0; }
.footnote b { color:var(--ink-2); font-weight:500; }
.footnote + .footnote { margin-top:6px; }
.card > .body > .footnote:not(:first-child) { margin-top:8px; }
[data-region] + .footnote { margin-top:8px; }
.identity {
  font-family:var(--mono); font-size:13px; background:var(--sunken);
  border-radius:var(--r-control); padding:7px 11px; display:inline-block;
  color:var(--ink-2); font-variant-numeric:tabular-nums;
}
.identity .neg { color:var(--crit); font-weight:600; }

/* ---------------------------------------------------------------- editable cells */

.cell { display:flex; align-items:center; justify-content:flex-end; gap:7px; min-height:26px; }
.cell .v { font-variant-numeric:tabular-nums; }
.cell .edit {
  all:unset; box-sizing:border-box; cursor:pointer; width:24px; height:24px;
  border-radius:5px; display:none; place-items:center; color:var(--ink-3);
  flex:none; border:1px solid transparent;
}
.cell .edit svg { width:13px; height:13px; display:block; }
tr:hover .cell .edit, .cell .edit:focus-visible { color:var(--accent); border-color:var(--rule-2); background:var(--surface); }
.cell .editor { display:inline-flex; align-items:center; gap:6px; justify-content:flex-end; flex-wrap:wrap; }
.cell .editor input[type="number"] { width:78px; }
.cell .editor .unit { color:var(--ink-3); font-size:12.5px; }
.hint { font-size:11px; color:var(--ink-3); text-align:right; margin-top:3px; max-width:150px; margin-left:auto; line-height:1.35; }
/* A value handed to the save queue and waiting its turn: shown as typed, marked pending. */
.cell.saving .v { color:var(--ink-3); }
td.editing { background:var(--accent-tint) !important; }
td.failed { background:var(--crit-tint) !important; }

/* JavaScript on: read first, edit deliberately. */
html.js .cell .v { display:inline; }
html.js .cell .edit { display:grid; }
html.js .cell .editor { display:none; }
html.js .cell .editor [data-submit] { display:none; }
html.js .cell.editing .editor { display:inline-flex; }
html.js .cell.editing .v, html.js .cell.editing .edit { display:none; }
/* JavaScript off: the plain form is the interface, exactly as before. */
html:not(.js) .cell .v { display:none; }

.savestate { display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:500; white-space:nowrap; }
.savestate.pending { color:var(--ink-3); }
.savestate.saved { color:var(--good); }
.savestate.failed { color:var(--crit); }
.spinner {
  width:11px; height:11px; border-radius:var(--r-pill); flex:none;
  border:2px solid var(--rule-2); border-top-color:var(--accent);
  animation:spin .7s linear infinite;
}
@keyframes spin { to { transform:rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spinner { animation-duration:2.4s; } }

.errbox {
  margin-top:6px; background:var(--crit-tint); border:1px solid var(--crit-edge);
  border-radius:var(--r-control); padding:7px 9px; font-size:12px; color:#7d1a21;
  text-align:left; max-width:320px; margin-left:auto;
}
.errbox .acts { display:flex; gap:8px; margin-top:6px; }
.errbox button {
  font:inherit; font-size:12px; font-weight:500; cursor:pointer; border-radius:5px;
  padding:3px 9px; border:1px solid var(--crit); background:var(--crit); color:#fff;
}
.errbox button.ghost { background:transparent; color:var(--crit); }

/* ---------------------------------------------------------------- row menus */

.rowmenu { position:relative; display:flex; justify-content:flex-end; }
.dots {
  all:unset; box-sizing:border-box; cursor:pointer; width:26px; height:26px;
  border-radius:var(--r-control); display:grid; place-items:center; color:var(--ink-3);
  border:1px solid transparent; font-size:16px; line-height:1;
}
tr:hover .dots, .dots:focus-visible, .dots[aria-expanded="true"] {
  color:var(--ink); border-color:var(--rule-2); background:var(--surface);
}
.menu {
  position:absolute; right:0; top:30px; z-index:30; min-width:220px;
  background:var(--surface); border:1px solid var(--rule-2); border-radius:8px;
  box-shadow:var(--pop); padding:5px; text-align:left;
}
.menu button {
  all:unset; box-sizing:border-box; display:block; width:100%; cursor:pointer;
  padding:7px 10px; border-radius:5px; font-size:13px; color:var(--ink-2);
}
.menu button:hover, .menu button:focus-visible { background:var(--sunken); color:var(--ink); }
.menu button.danger { color:var(--crit); }
.menu button.danger:hover, .menu button.danger:focus-visible { background:var(--crit-tint); color:var(--crit); }
.menu hr { border:0; border-top:1px solid var(--rule); margin:5px 0; }
html:not(.js) .rowmenu { display:none; }
/* Selectors submit themselves once the script is running, so their buttons are redundant. */
html.js [data-noscript] { display:none; }

/* ---------------------------------------------------------------- dialog well */

/* Without JavaScript a dialog cannot be opened, so every dialog renders inline as an
   ordinary form card instead — no action becomes unreachable, and no markup is duplicated. */
.dialog-well { margin-top:26px; }
html.js .dialog-well { margin-top:0; }
html.js .dialog-well > h2 { display:none; }
html:not(.js) dialog {
  display:block; position:static; width:auto; margin:0 0 14px;
  border-radius:var(--r-card); box-shadow:none;
}
html:not(.js) dialog::backdrop { display:none; }
html:not(.js) [data-close-dialog] { display:none; }

/* ---------------------------------------------------------------- dialogs */

dialog {
  border:1px solid var(--rule-2); border-radius:11px; box-shadow:var(--pop);
  padding:0; width:min(500px, calc(100vw - 32px)); color:var(--ink);
  background:var(--surface);
}
dialog::backdrop { background:rgba(18,37,61,.42); }
dialog > header { padding:14px 18px 12px; border-bottom:1px solid var(--rule); }
dialog h2 { margin:0 0 3px; font-size:15.5px; font-weight:600; }
dialog .scope { font-size:12px; color:var(--ink-3); }
dialog .body { padding:16px 18px; display:grid; gap:12px; }
dialog .body > p { margin:0; font-size:13px; color:var(--ink-2); }
dialog footer {
  padding:12px 18px; border-top:1px solid var(--rule); display:flex; gap:8px;
  justify-content:flex-end; background:var(--raised); flex-wrap:wrap;
}
dialog label { display:grid; gap:4px; font-size:12px; font-weight:500; color:var(--ink-2); }
dialog label .note { font-weight:400; color:var(--ink-3); }
dialog .pair { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
dialog .err {
  background:var(--crit-tint); border:1px solid var(--crit-edge); border-radius:var(--r-control);
  padding:8px 10px; font-size:12.5px; color:#7d1a21;
}

/* ---------------------------------------------------------------- judgments */

.judgment { font-size:12.5px; }
.judgment .verdict { font-weight:600; }
.judgment .verdict.yes { color:var(--good); }
.judgment .verdict.no { color:var(--crit); }
.judgment dl { margin:4px 0 0; display:grid; grid-template-columns:auto 1fr; gap:2px 8px; }
.judgment dt { font-size:11px; color:var(--ink-3); text-transform:uppercase; letter-spacing:.06em; font-weight:600; padding-top:2px; }
.judgment dd { margin:0; color:var(--ink-2); }
.reasons { margin:5px 0 0; padding-left:16px; font-size:11.5px; color:var(--ink-2); }
.reasons li { margin-bottom:2px; }
.history { margin-top:6px; font-size:12px; }
.history summary { cursor:pointer; color:var(--accent); }
.history ol { margin:6px 0 0; padding-left:18px; color:var(--ink-2); }

/* ---------------------------------------------------------------- sticky summary */

@media (min-width: 1000px) {
  .sticky-summary { position:sticky; top:0; z-index:10; }
  .sticky-summary .card { box-shadow:0 4px 12px rgba(21,26,33,.05); }
}

@media (max-width: 700px) {
  main { padding:14px; }
  .pagehead .actions { margin-left:0; }
  dialog .pair { grid-template-columns:1fr; }
  .tile { flex-basis:130px; }
  .chain .op { width:22px; }
}
`;
