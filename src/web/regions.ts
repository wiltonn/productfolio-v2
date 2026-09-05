/**
 * Re-renders the parts of a page whose figures a save can have moved.
 *
 * A background save posts to exactly the same URL as the plain form and, on success, the
 * handler already redirects to the page the edit came from. That redirect target is all we
 * need: it names the view and carries its quarter and team, so the regions are rendered
 * from the same code the full page uses, against freshly loaded state.
 *
 * Every figure the browser displays after a save therefore comes from here. Nothing is
 * recalculated in the browser, and a region is never assembled from a different code path
 * than the page it belongs to.
 */

import type { Database } from '../db/database.js';
import * as repo from '../db/repo.js';
import { loadEngineeringQuarter } from '../engineering.js';
import { loadPlan } from '../plan.js';
import {
  allocationsMixRegion,
  allocationsReconRegion,
  allocationsStatesRegion,
  allocationsSummaryRegion,
  allocationsTeamsRegion,
  capacityChainRegion,
  capacityTeamsRegion,
  censusTeamsRegion,
  planCensusRegion,
  planChainRegion,
  planReconRegion,
  planStatesRegion,
  planWorkRegion,
} from './views.js';
import type { ViewContext } from './ui.js';

export type Regions = Record<string, string>;

function contextOf(db: Database, params: URLSearchParams): ViewContext {
  const quarters = repo.listQuarters(db);
  const requested = Number.parseInt(params.get('q') ?? '', 10);
  const quarterId = quarters.some((q) => q.id === requested) ? requested : (quarters[0]?.id ?? null);
  const team = Number.parseInt(params.get('team') ?? '', 10);
  const teamId = repo.listTeams(db).some((t) => t.id === team) ? team : null;
  return { quarterId, teamId };
}

/**
 * `back` is a path this app serves, already checked against the redirect allowlist.
 * An unknown or stale target yields no regions, and the browser simply shows the save as
 * done without changing any figure.
 */
export function regionsFor(db: Database, back: string): Regions {
  const url = new URL(back, 'http://localhost');
  const path = url.pathname;

  const plan = /^\/plan\/(\d+)\/(\d+)$/.exec(path);
  if (plan) {
    const loaded = loadPlan(db, Number(plan[1]), Number(plan[2]));
    if (!loaded) return {};
    return {
      'plan-chain': planChainRegion(loaded),
      'plan-census': planCensusRegion(loaded, back),
      'plan-recon': planReconRegion(loaded, back),
      'plan-states': planStatesRegion(loaded),
      'plan-work': planWorkRegion(loaded, back),
    };
  }

  const ctx = contextOf(db, url.searchParams);
  if (ctx.quarterId === null) return {};

  if (path === '/census') {
    const quarter = repo.getQuarter(db, ctx.quarterId);
    if (!quarter) return {};
    const teams = repo.listTeams(db);
    const inScope = ctx.teamId === null ? teams : teams.filter((t) => t.id === ctx.teamId);
    const plans = inScope.flatMap((team) => {
      const p = loadPlan(db, team.id, quarter.id);
      return p ? [p] : [];
    });
    return { 'census-teams': censusTeamsRegion(plans, back) };
  }

  const eng = loadEngineeringQuarter(db, ctx.quarterId);
  if (!eng) return {};

  if (path === '/capacity') {
    return {
      'capacity-chain': capacityChainRegion(eng.totals),
      'capacity-teams': capacityTeamsRegion(eng, ctx),
    };
  }

  if (path === '/allocations') {
    return {
      'alloc-summary': allocationsSummaryRegion(eng),
      'alloc-recon': allocationsReconRegion(eng, ctx, back),
      'alloc-mix': allocationsMixRegion(eng),
      'alloc-states': allocationsStatesRegion(eng, ctx),
      'alloc-teams': allocationsTeamsRegion(eng, ctx, back),
    };
  }

  return {};
}
