/**
 * Panel recovery agent — dynamic planner + tool executor.
 *
 * Not a hard-coded behavior tree: each cycle builds a fresh observation,
 * asks a planner (Ollama via server proxy, or local observation-scored
 * heuristic) for the next actions, then executes a small tool surface under
 * hard budgets.
 *
 * Tools:
 *   refetch_market  — force-live or cache-first single market
 *   refetch_deps    — batch satellite markets (prefer cache-first)
 *   wait            — backoff for rate-limits / cold starts
 *   evaluate        — re-observe only (no HTTP)
 *   noop / stop     — end recovery
 */

import { apiUrl } from '../../lib/api';
import { buildRecoveryObservation } from './recoveryObservation.js';
import { MARKET_ENDPOINTS } from './marketEndpoints.js';

export const RECOVERY_DEFAULTS = {
  maxCycles: 3,
  maxFetchesPerCycle: 8,
  maxForceLivePerMarket: 2,
  maxTotalFetches: 20,
  maxWaitMs: 8000,
  planTimeoutMs: 25000,
  /** Prefer AI plan; fall back to local scorer when proxy unavailable */
  preferAi: true,
};

const ALLOWED_TOOLS = new Set([
  'refetch_market',
  'refetch_deps',
  'wait',
  'evaluate',
  'noop',
  'stop',
]);

/**
 * Local observation-scored planner (no fixed if/else tree of markets).
 * Ranks issues by severity score and emits a budgeted action list.
 */
export function planFromObservation(observation, budgets = {}) {
  const maxFetches = budgets.maxFetchesPerCycle ?? RECOVERY_DEFAULTS.maxFetchesPerCycle;
  const forceLiveLeft = budgets.forceLiveLeft || {};
  const markets = observation?.markets || [];
  const waitingDeps = new Set(observation?.waitingDeps || []);

  // Dynamic scores — higher = recover first
  const scored = markets
    .map((m) => {
      let score = 0;
      switch (m.symptom) {
        case 'empty_market': score = m.isTab ? 100 : 70; break;
        case 'timeout':
        case 'network': score = m.isTab ? 95 : 65; break;
        case 'hollow_shell': score = m.isTab ? 80 : 50; break;
        case 'waiting_cross': score = 40; break;
        case 'partial': score = 35; break;
        case 'rate_limit': score = 10; break;
        case 'ok': score = 0; break;
        default: score = m.panelsFetchFail ? 30 : 0;
      }
      score += Math.min(20, (m.panelsFetchFail || 0) * 2);
      if (m.hasError) score += 15;
      if (forceLiveLeft[m.marketId] === 0) score -= 40;
      return { ...m, score };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  /** @type {object[]} */
  const actions = [];
  let fetches = 0;

  // Rate-limited markets: wait first (do not stampede)
  if (scored.some((m) => m.symptom === 'rate_limit')) {
    actions.push({ tool: 'wait', ms: 2500, reason: 'rate_limit backoff before any force-live' });
  }

  // Deps first — unlock many panels at once without full-wave
  const depsToFetch = [...waitingDeps]
    .filter((id) => MARKET_ENDPOINTS[id])
    .slice(0, Math.max(0, maxFetches - fetches));
  if (depsToFetch.length) {
    actions.push({
      tool: 'refetch_deps',
      marketIds: depsToFetch,
      forceLive: false,
      reason: 'waiting_cross deps unlock incomplete panels',
    });
    fetches += depsToFetch.length;
  }

  for (const m of scored) {
    if (fetches >= maxFetches) break;
    if (m.symptom === 'rate_limit') continue;
    if (m.symptom === 'ok') continue;
    if (m.symptom === 'waiting_cross' && depsToFetch.length) continue;

    const flLeft = forceLiveLeft[m.marketId];
    const allowForce = flLeft == null || flLeft > 0;
    // Empty / timeout → force live; partial hollow → try force if budget
    const forceLive = allowForce && (
      m.symptom === 'empty_market'
      || m.symptom === 'timeout'
      || m.symptom === 'network'
      || m.symptom === 'hollow_shell'
      || (m.symptom === 'partial' && m.isTab)
    );

    if (!MARKET_ENDPOINTS[m.marketId] && m.marketId !== 'alerts') continue;

    actions.push({
      tool: 'refetch_market',
      marketId: m.marketId,
      forceLive: !!forceLive,
      reason: `${m.symptom} score=${m.score} failPanels=${m.panelsFetchFail}`,
    });
    fetches += 1;
  }

  if (!actions.length) {
    return {
      actions: [{ tool: 'noop', reason: 'observation clean or nothing actionable' }],
      stop: true,
      summary: 'No recovery actions needed',
      planner: 'local',
    };
  }

  return {
    actions,
    stop: false,
    summary: `Local plan: ${actions.length} action(s), ~${fetches} fetch(es)`,
    planner: 'local',
  };
}

/**
 * Validate and clamp a planner response to the allowed tool surface + budgets.
 */
export function normalizePlan(raw, budgets = {}) {
  const maxFetches = budgets.maxFetchesPerCycle ?? RECOVERY_DEFAULTS.maxFetchesPerCycle;
  const maxWait = budgets.maxWaitMs ?? RECOVERY_DEFAULTS.maxWaitMs;
  const forceLiveLeft = budgets.forceLiveLeft || {};
  const actionsIn = Array.isArray(raw?.actions) ? raw.actions : [];
  const actions = [];
  let fetches = 0;

  for (const a of actionsIn) {
    if (!a || typeof a !== 'object') continue;
    const tool = String(a.tool || '').toLowerCase();
    if (!ALLOWED_TOOLS.has(tool)) continue;

    if (tool === 'stop' || tool === 'noop') {
      actions.push({ tool, reason: String(a.reason || '').slice(0, 200) });
      continue;
    }
    if (tool === 'wait') {
      const ms = Math.min(maxWait, Math.max(200, Number(a.ms) || 1000));
      actions.push({ tool: 'wait', ms, reason: String(a.reason || '').slice(0, 200) });
      continue;
    }
    if (tool === 'evaluate') {
      actions.push({ tool: 'evaluate', reason: String(a.reason || '').slice(0, 200) });
      continue;
    }
    if (tool === 'refetch_deps') {
      const ids = (Array.isArray(a.marketIds) ? a.marketIds : [])
        .map(String)
        .filter((id) => MARKET_ENDPOINTS[id])
        .slice(0, Math.max(0, maxFetches - fetches));
      if (!ids.length) continue;
      const forceLive = a.forceLive === true;
      // Cap force-live on deps
      const filtered = forceLive
        ? ids.filter((id) => forceLiveLeft[id] == null || forceLiveLeft[id] > 0)
        : ids;
      if (!filtered.length) continue;
      actions.push({
        tool: 'refetch_deps',
        marketIds: filtered,
        forceLive,
        reason: String(a.reason || '').slice(0, 200),
      });
      fetches += filtered.length;
      continue;
    }
    if (tool === 'refetch_market') {
      if (fetches >= maxFetches) continue;
      const marketId = String(a.marketId || '');
      if (!marketId || (!MARKET_ENDPOINTS[marketId] && marketId !== 'alerts')) continue;
      let forceLive = a.forceLive === true;
      if (forceLive && forceLiveLeft[marketId] === 0) forceLive = false;
      actions.push({
        tool: 'refetch_market',
        marketId,
        forceLive,
        reason: String(a.reason || '').slice(0, 200),
      });
      fetches += 1;
    }
  }

  if (!actions.length) {
    return {
      actions: [{ tool: 'noop', reason: 'empty/invalid plan' }],
      stop: true,
      summary: raw?.summary || 'empty plan',
      planner: raw?.planner || 'unknown',
    };
  }

  return {
    actions,
    stop: raw?.stop === true || actions.every((x) => x.tool === 'noop' || x.tool === 'stop'),
    summary: String(raw?.summary || '').slice(0, 400),
    planner: raw?.planner || 'ai',
  };
}

/**
 * Ask server AI proxy for a recovery plan. Falls back to local planner.
 */
export async function requestRecoveryPlan(observation, opts = {}) {
  const preferAi = opts.preferAi !== false;
  const timeoutMs = opts.planTimeoutMs ?? RECOVERY_DEFAULTS.planTimeoutMs;
  const budgets = opts.budgets || {};

  if (preferAi && typeof fetch === 'function') {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(apiUrl('/api/agent/recover-plan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ observation, budgets: {
          maxFetchesPerCycle: budgets.maxFetchesPerCycle ?? RECOVERY_DEFAULTS.maxFetchesPerCycle,
        } }),
        signal: ctrl.signal,
        cache: 'no-store',
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data?.plan) {
          return normalizePlan({ ...data.plan, planner: data.planner || 'ai' }, budgets);
        }
      }
    } catch {
      // fall through to local
    }
  }

  return normalizePlan(planFromObservation(observation, budgets), budgets);
}

/**
 * Execute one normalized plan against injected tools.
 * @param {object} plan
 * @param {{
 *   refetchMarket: (marketId: string, forceLive: boolean) => Promise<unknown>,
 *   isStale?: () => boolean,
 *   onLog?: (msg: string) => void,
 * }} tools
 */
export async function executeRecoveryPlan(plan, tools) {
  const log = tools.onLog || (() => {});
  const isStale = tools.isStale || (() => false);
  const results = [];
  let fetchCount = 0;
  const forceLiveUsed = {};

  for (const action of plan.actions || []) {
    if (isStale()) {
      results.push({ action, skipped: true, reason: 'stale' });
      break;
    }
    if (action.tool === 'noop' || action.tool === 'stop') {
      results.push({ action, ok: true });
      continue;
    }
    if (action.tool === 'wait') {
      log(`[recovery] wait ${action.ms}ms — ${action.reason || ''}`);
      await new Promise((r) => setTimeout(r, action.ms || 1000));
      results.push({ action, ok: true });
      continue;
    }
    if (action.tool === 'evaluate') {
      results.push({ action, ok: true });
      continue;
    }
    if (action.tool === 'refetch_market') {
      log(`[recovery] refetch ${action.marketId} forceLive=${!!action.forceLive} — ${action.reason || ''}`);
      try {
        await tools.refetchMarket(action.marketId, !!action.forceLive);
        fetchCount += 1;
        if (action.forceLive) forceLiveUsed[action.marketId] = (forceLiveUsed[action.marketId] || 0) + 1;
        results.push({ action, ok: true });
      } catch (e) {
        results.push({ action, ok: false, error: e?.message || String(e) });
      }
      continue;
    }
    if (action.tool === 'refetch_deps') {
      const ids = action.marketIds || [];
      log(`[recovery] refetch_deps [${ids.join(',')}] forceLive=${!!action.forceLive}`);
      for (const id of ids) {
        if (isStale()) break;
        try {
          await tools.refetchMarket(id, !!action.forceLive);
          fetchCount += 1;
          if (action.forceLive) forceLiveUsed[id] = (forceLiveUsed[id] || 0) + 1;
          results.push({ action: { ...action, marketId: id }, ok: true });
        } catch (e) {
          results.push({ action: { ...action, marketId: id }, ok: false, error: e?.message || String(e) });
        }
        // gentle spacing — not a fixed tree, just anti-stampede
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }

  return { results, fetchCount, forceLiveUsed };
}

/**
 * Full multi-cycle recovery loop.
 *
 * @param {{
 *   getMarkets: () => Record<string, object>,
 *   refetchMarket: (id: string, forceLive: boolean) => Promise<unknown>,
 *   isStale?: () => boolean,
 *   tabMarketIds?: string[],
 *   onLog?: (msg: string) => void,
 *   options?: Partial<typeof RECOVERY_DEFAULTS>,
 * }} ctx
 */
export async function runRecoveryAgent(ctx) {
  const opts = { ...RECOVERY_DEFAULTS, ...(ctx.options || {}) };
  const log = ctx.onLog || ((m) => {
    if (typeof console !== 'undefined' && console.log) console.log(m);
  });
  const isStale = ctx.isStale || (() => false);

  const forceLiveLeft = {};
  let totalFetches = 0;
  const history = [];

  for (let cycle = 0; cycle < opts.maxCycles; cycle++) {
    if (isStale()) {
      history.push({ cycle, stopped: 'stale' });
      break;
    }
    if (totalFetches >= opts.maxTotalFetches) {
      history.push({ cycle, stopped: 'maxTotalFetches' });
      break;
    }

    const markets = ctx.getMarkets();
    const observation = buildRecoveryObservation(markets, {
      tabMarketIds: ctx.tabMarketIds,
    });

    // Early exit if observation is already healthy enough
    const emptyTabs = (observation.markets || []).filter(
      (m) => m.isTab && (m.symptom === 'empty_market' || m.symptom === 'timeout' || m.symptom === 'network'),
    );
    const incomplete = observation.summary?.incompletePanelCount || 0;
    if (emptyTabs.length === 0 && incomplete === 0) {
      log('[recovery] observation clean — stop');
      history.push({ cycle, stopped: 'clean', observation: observation.summary });
      break;
    }

    const remaining = opts.maxTotalFetches - totalFetches;
    const budgets = {
      maxFetchesPerCycle: Math.min(opts.maxFetchesPerCycle, remaining),
      maxWaitMs: opts.maxWaitMs,
      forceLiveLeft: { ...forceLiveLeft },
    };
    // Initialize force-live counters on first sight
    for (const m of observation.markets || []) {
      if (forceLiveLeft[m.marketId] == null) {
        forceLiveLeft[m.marketId] = opts.maxForceLivePerMarket;
      }
    }
    budgets.forceLiveLeft = { ...forceLiveLeft };

    log(`[recovery] cycle ${cycle + 1}/${opts.maxCycles} incompletePanels=${incomplete} emptyTabs=${emptyTabs.length}`);
    const plan = await requestRecoveryPlan(observation, {
      preferAi: opts.preferAi,
      planTimeoutMs: opts.planTimeoutMs,
      budgets,
    });
    log(`[recovery] planner=${plan.planner} — ${plan.summary}`);

    if (plan.stop && (plan.actions || []).every((a) => a.tool === 'noop' || a.tool === 'stop')) {
      history.push({ cycle, plan, stopped: 'planner_stop' });
      break;
    }

    const exec = await executeRecoveryPlan(plan, {
      refetchMarket: ctx.refetchMarket,
      isStale,
      onLog: log,
    });
    totalFetches += exec.fetchCount;
    for (const [id, n] of Object.entries(exec.forceLiveUsed || {})) {
      forceLiveLeft[id] = Math.max(0, (forceLiveLeft[id] ?? opts.maxForceLivePerMarket) - n);
    }

    history.push({
      cycle,
      planner: plan.planner,
      summary: plan.summary,
      actions: plan.actions,
      fetchCount: exec.fetchCount,
      observation: observation.summary,
    });

    // Brief settle so next observation sees applied state
    if (!isStale() && cycle < opts.maxCycles - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  return {
    totalFetches,
    cycles: history.length,
    history,
    forceLiveLeft,
  };
}
