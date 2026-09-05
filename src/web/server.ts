import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Database } from '../db/database.js';
import * as repo from '../db/repo.js';
import { loadPlan } from '../plan.js';
import { errorPage, indexPage, layout, planPage } from './views.js';

type Form = Record<string, string>;
type Handler = (ctx: { db: Database; params: string[]; form: Form }) => Response;
type Response = { status: number; html?: string; redirect?: string };

const routes: Array<{ method: 'GET' | 'POST'; pattern: RegExp; handler: Handler }> = [];
const get = (pattern: RegExp, handler: Handler) => routes.push({ method: 'GET', pattern, handler });
const post = (pattern: RegExp, handler: Handler) => routes.push({ method: 'POST', pattern, handler });

const redirect = (to: string): Response => ({ status: 303, redirect: to });
const page = (html: string): Response => ({ status: 200, html });
const notFound = (): Response => ({ status: 404, html: layout('Not found', '<h1>Not found</h1><p><a href="/">Home</a></p>') });

/** Only allow redirects back to pages this app serves. */
function backOf(form: Form, fallback = '/'): string {
  const back = form.back ?? '';
  return /^\/plan\/\d+\/\d+$/.test(back) ? back : fallback;
}

const int = (s: string | undefined): number => Number.parseInt(s ?? '', 10);

// ---- routes ----------------------------------------------------------------------------------

get(/^\/$/, ({ db }) => page(indexPage({ quarters: repo.listQuarters(db), teams: repo.listTeams(db), holidays: repo.listHolidays(db) })));

post(/^\/quarters$/, ({ db, form }) => {
  repo.createQuarter(db, { name: form.name ?? '', start: form.start ?? '', end: form.end ?? '' });
  return redirect('/');
});

post(/^\/teams$/, ({ db, form }) => {
  repo.createTeam(db, form.name ?? '');
  return redirect('/');
});

post(/^\/holidays$/, ({ db, form }) => {
  repo.addHoliday(db, { date: form.date ?? '', name: form.name ?? '' });
  return redirect('/');
});

post(/^\/holidays\/delete$/, ({ db, form }) => {
  repo.deleteHoliday(db, form.date ?? '');
  return redirect('/');
});

get(/^\/plan\/(\d+)\/(\d+)$/, ({ db, params }) => {
  const plan = loadPlan(db, int(params[0]), int(params[1]));
  return plan ? page(planPage(plan)) : notFound();
});

post(/^\/plan\/(\d+)\/(\d+)\/people$/, ({ db, params, form }) => {
  const teamId = int(params[0]);
  repo.addPerson(db, { teamId, name: form.name ?? '', joined: form.joined ?? '', left: form.left ?? '', fraction: form.fraction ?? '' });
  return redirect(`/plan/${teamId}/${params[1]}`);
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

post(/^\/plan\/(\d+)\/(\d+)\/work-packages$/, ({ db, params, form }) => {
  repo.addWorkPackage(db, {
    teamId: int(params[0]),
    quarterId: int(params[1]),
    name: form.name ?? '',
    category: form.category ?? '',
    estimateEw: form.estimate_ew ?? '',
    notes: form.notes ?? '',
  });
  return redirect(`/plan/${params[0]}/${params[1]}`);
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
  repo.recordFeasibility(db, {
    workPackageId: int(params[0]),
    verdict: form.verdict ?? '',
    judgedBy: form.judged_by ?? '',
    assumptions: form.assumptions ?? '',
    scopeNote: form.scope_note ?? '',
  });
  return redirect(backOf(form));
});

post(/^\/plan\/(\d+)\/(\d+)\/reserve$/, ({ db, params, form }) => {
  repo.setReserve(db, { teamId: int(params[0]), quarterId: int(params[1]), engineerWeeks: form.engineer_weeks ?? '' });
  return redirect(`/plan/${params[0]}/${params[1]}`);
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
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  for (const route of routes) {
    if (route.method !== method) continue;
    const m = route.pattern.exec(path);
    if (!m) continue;
    const form = method === 'POST' ? await readForm(req) : {};
    try {
      return route.handler({ db, params: m.slice(1), form });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 400, html: errorPage(message, backOf(form, req.headers.referer?.startsWith('http') ? new URL(req.headers.referer).pathname : '/')) };
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
