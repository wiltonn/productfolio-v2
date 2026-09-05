import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Database } from '../db/database.js';
import * as repo from '../db/repo.js';
import { loadEngineeringQuarter } from '../engineering.js';
import { loadPlan, recordJudgment } from '../plan.js';
import {
  allocationsPage,
  capacityPage,
  censusPage,
  errorPage,
  layout,
  planPage,
  setupPage,
  viewHref,
  type ViewContext,
} from './views.js';

type Form = Record<string, string>;
type Query = URLSearchParams;
type Handler = (ctx: { db: Database; params: string[]; form: Form; query: Query }) => Response;
type Response = { status: number; html?: string; redirect?: string };

const routes: Array<{ method: 'GET' | 'POST'; pattern: RegExp; handler: Handler }> = [];
const get = (pattern: RegExp, handler: Handler) => routes.push({ method: 'GET', pattern, handler });
const post = (pattern: RegExp, handler: Handler) => routes.push({ method: 'POST', pattern, handler });

const redirect = (to: string): Response => ({ status: 303, redirect: to });
const page = (html: string): Response => ({ status: 200, html });
const notFound = (): Response =>
  ({ status: 404, html: layout('Not found', '<h1>Not found</h1><p><a href="/census">Engineering census</a></p>') });

/** Only allow redirects back to pages this app serves. */
const SAFE_BACK = /^\/(census|capacity|allocations|setup)(\?(q=\d+)?(&?team=\d+)?)?$|^\/plan\/\d+\/\d+$/;

function backOf(form: Form, fallback = '/census'): string {
  const back = form.back ?? '';
  return SAFE_BACK.test(back) ? back : fallback;
}

const int = (s: string | undefined): number => Number.parseInt(s ?? '', 10);

/** The shared quarter/team selection, defaulting to the earliest quarter. */
function contextFrom(db: Database, query: Query): ViewContext {
  const quarters = repo.listQuarters(db);
  const requested = Number.parseInt(query.get('q') ?? '', 10);
  const quarterId = quarters.some((q) => q.id === requested) ? requested : (quarters[0]?.id ?? null);
  const team = Number.parseInt(query.get('team') ?? '', 10);
  const teamId = repo.listTeams(db).some((t) => t.id === team) ? team : null;
  return { quarterId, teamId };
}

// ---- Engineering-wide views ---------------------------------------------------------------------

get(/^\/$/, ({ db, query }) => {
  const ctx = contextFrom(db, query);
  return redirect(ctx.quarterId === null ? '/setup' : viewHref('/capacity', ctx));
});

get(/^\/setup$/, ({ db, query }) =>
  page(
    setupPage({
      quarters: repo.listQuarters(db),
      teams: repo.listTeams(db),
      holidays: repo.listHolidays(db),
      ctx: contextFrom(db, query),
    }),
  ),
);

get(/^\/census$/, ({ db, query }) => {
  const ctx = contextFrom(db, query);
  const quarters = repo.listQuarters(db);
  const teams = repo.listTeams(db);
  const quarter = ctx.quarterId === null ? null : (repo.getQuarter(db, ctx.quarterId) ?? null);
  const inScope = ctx.teamId === null ? teams : teams.filter((t) => t.id === ctx.teamId);
  const groups =
    quarter === null
      ? []
      : inScope.flatMap((team) => {
          const plan = loadPlan(db, team.id, quarter.id);
          return plan ? [{ team, people: plan.people, capacity: plan.capacity.people }] : [];
        });
  return page(censusPage({ quarters, teams, quarter, groups, ctx }));
});

get(/^\/capacity$/, ({ db, query }) => {
  const ctx = contextFrom(db, query);
  const eng = ctx.quarterId === null ? null : (loadEngineeringQuarter(db, ctx.quarterId) ?? null);
  return page(capacityPage({ quarters: repo.listQuarters(db), teams: repo.listTeams(db), eng, ctx }));
});

get(/^\/allocations$/, ({ db, query }) => {
  const ctx = contextFrom(db, query);
  const eng = ctx.quarterId === null ? null : (loadEngineeringQuarter(db, ctx.quarterId) ?? null);
  return page(allocationsPage({ quarters: repo.listQuarters(db), teams: repo.listTeams(db), eng, ctx }));
});

get(/^\/plan\/(\d+)\/(\d+)$/, ({ db, params }) => {
  const plan = loadPlan(db, int(params[0]), int(params[1]));
  return plan ? page(planPage(plan)) : notFound();
});

// ---- setup writes --------------------------------------------------------------------------------

post(/^\/quarters$/, ({ db, form }) => {
  repo.createQuarter(db, { name: form.name ?? '', start: form.start ?? '', end: form.end ?? '' });
  return redirect('/setup');
});

post(/^\/teams$/, ({ db, form }) => {
  repo.createTeam(db, form.name ?? '');
  return redirect('/setup');
});

post(/^\/holidays$/, ({ db, form }) => {
  repo.addHoliday(db, { date: form.date ?? '', name: form.name ?? '' });
  return redirect(backOf(form, '/setup'));
});

post(/^\/holidays\/delete$/, ({ db, form }) => {
  repo.deleteHoliday(db, form.date ?? '');
  return redirect(backOf(form, '/setup'));
});

// ---- census writes (the team is named on every form) ---------------------------------------------

post(/^\/people$/, ({ db, form }) => {
  repo.addPerson(db, {
    teamId: int(form.team_id),
    name: form.name ?? '',
    joined: form.joined ?? '',
    left: form.left ?? '',
    fraction: form.fraction ?? '',
  });
  return redirect(backOf(form));
});

post(/^\/people\/(\d+)\/delete$/, ({ db, params, form }) => {
  repo.deletePerson(db, int(params[0]));
  return redirect(backOf(form));
});

post(/^\/people\/(\d+)\/schedules$/, ({ db, params, form }) => {
  repo.addScheduleChange(db, { personId: int(params[0]), fraction: form.fraction ?? '', effectiveFrom: form.effective_from ?? '' });
  return redirect(backOf(form));
});

post(/^\/schedules\/(\d+)\/delete$/, ({ db, params, form }) => {
  repo.deleteSchedule(db, int(params[0]));
  return redirect(backOf(form));
});

post(/^\/people\/(\d+)\/absences$/, ({ db, params, form }) => {
  repo.addAbsence(db, { personId: int(params[0]), from: form.from ?? '', to: form.to ?? '', note: form.note ?? '' });
  return redirect(backOf(form));
});

post(/^\/absences\/(\d+)\/delete$/, ({ db, params, form }) => {
  repo.deleteAbsence(db, int(params[0]));
  return redirect(backOf(form));
});

post(/^\/people\/(\d+)\/overhead$/, ({ db, params, form }) => {
  repo.setOverhead(db, { personId: int(params[0]), quarterId: int(form.quarter_id), percent: form.percent ?? '', note: form.note ?? '' });
  return redirect(backOf(form));
});

// ---- work, assignments, reserve, feasibility (all owned by a team-quarter) -----------------------

post(/^\/work-packages$/, ({ db, form }) => {
  repo.addWorkPackage(db, {
    teamId: int(form.team_id),
    quarterId: int(form.quarter_id),
    name: form.name ?? '',
    category: form.category ?? '',
    estimateEw: form.estimate_ew ?? '',
    notes: form.notes ?? '',
  });
  return redirect(backOf(form));
});

post(/^\/work-packages\/(\d+)\/estimate$/, ({ db, params, form }) => {
  repo.updateEstimate(db, int(params[0]), form.estimate_ew ?? '');
  return redirect(backOf(form));
});

post(/^\/work-packages\/(\d+)\/delete$/, ({ db, params, form }) => {
  repo.deleteWorkPackage(db, int(params[0]));
  return redirect(backOf(form));
});

post(/^\/work-packages\/(\d+)\/assignment$/, ({ db, params, form }) => {
  repo.setAssignment(db, { workPackageId: int(params[0]), teamId: int(form.team_id), engineerWeeks: form.engineer_weeks ?? '' });
  return redirect(backOf(form));
});

post(/^\/work-packages\/(\d+)\/feasibility$/, ({ db, params, form }) => {
  recordJudgment(db, {
    workPackageId: int(params[0]),
    verdict: form.verdict ?? '',
    judgedBy: form.judged_by ?? '',
    assumptions: form.assumptions ?? '',
    scopeNote: form.scope_note ?? '',
  });
  return redirect(backOf(form));
});

post(/^\/reserve$/, ({ db, form }) => {
  repo.setReserve(db, { teamId: int(form.team_id), quarterId: int(form.quarter_id), engineerWeeks: form.engineer_weeks ?? '' });
  return redirect(backOf(form));
});

// ---- dispatch --------------------------------------------------------------------------------

async function readForm(req: IncomingMessage): Promise<Form> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks).toString('utf8');
  return Object.fromEntries(new URLSearchParams(body));
}

export async function handle(db: Database, req: IncomingMessage): Promise<Response> {
  const method = req.method === 'POST' ? 'POST' : 'GET';
  const url = new URL(req.url ?? '/', 'http://localhost');
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = route.pattern.exec(url.pathname);
    if (!m) continue;
    const form = method === 'POST' ? await readForm(req) : {};
    try {
      return route.handler({ db, params: m.slice(1), form, query: url.searchParams });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 400, html: errorPage(message, backOf(form)) };
    }
  }
  return notFound();
}

export function startServer(db: Database, port: number, host = '127.0.0.1') {
  const server = createServer(async (req, res: ServerResponse) => {
    const out = await handle(db, req);
    if (out.redirect) {
      res.writeHead(out.status, { Location: out.redirect });
      res.end();
      return;
    }
    res.writeHead(out.status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(out.html ?? '');
  });
  server.listen(port, host);
  return server;
}
