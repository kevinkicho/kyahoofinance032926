/**
 * Agent fetch orchestrator.
 *
 * Routes declare their upstream sources (name + fetcher), then call
 * `runFetchPlan`. The orchestrator:
 *   1. Builds a live observation (throttle / circuit / budget / recent errors).
 *   2. Asks the recovery planner (Ollama when configured, local scorer
 *      otherwise) for a per-source plan: which sources to call, with how
 *      many retries / backoff, or whether to skip a source entirely.
 *   3. Executes the plan with HARD safety caps so a bad AI plan cannot
 *      runaway: max total time, max total calls, max retries per source,
 *      per-source daily budget enforcement via checkApiBudget.
 *
 * When Ollama is not configured or the plan request fails, a deterministic
 * default plan is derived from the declared sources — so routes keep
 * working offline exactly as before. This is the single seam between
 * "agent decides" and "hardcoded fallback": the fallback is always
 * available and always bounded.
 *
 * See docs/AGENT_FETCH.md (created with this module).
 */

import { checkApiBudget, trackApiCall } from './rateLimits.js';
import { getFredThrottleStatus } from './fetch.js';
import {
  isCircuitOpen,
  noteUpstreamFailure,
  resetCircuit,
  listOpenCircuits,
} from './upstreamCircuit.js';

// ─── Hard safety caps (never overridden by the AI plan) ─────────────────────
const HARD_MAX_TOTAL_MS = 30_000;
const HARD_MAX_RETRIES = 4;
const HARD_MAX_CALLS = 12;
const HARD_MAX_BACKOFF_MS = 8_000;
const HARD_MIN_BACKOFF_MS = 0;

const DEFAULT_RETRIES = 2;
const DEFAULT_BACKOFF_MS = 800;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Build the live observation the planner sees. Secret-free; safe to send
 * to the model. Mirrors the recovery agent's observation shape so the same
 * system prompt can reason about both panel health and per-source fetch.
 */
export function buildFetchObservation(sources) {
  const fred = getFredThrottleStatus();
  const circuits = listOpenCircuits();
  const budget = sources.map((s) => {
    const b = checkApiBudget(s.source);
    return {
      source: s.source,
      used: b.used,
      limit: b.limit,
      pct: b.pct,
      remaining: b.remaining,
      hardBlock: b.hardBlock,
      reason: b.reason,
    };
  });
  return {
    sources: budget,
    fredThrottle: {
      used: fred.used,
      limit: fred.limit,
      pct: fred.pct,
      hot: fred.hot,
      waitMs: fred.waitMs,
    },
    openCircuits: circuits,
    note: 'Plan which sources to fetch, in what order, with retries/backoff. Skip exhausted/blocked sources.',
  };
}

/**
 * Deterministic default plan. Used when the AI planner is unavailable or
 * returns an invalid plan. Each declared source is fetched once with
 * `DEFAULT_RETRIES` and `DEFAULT_BACKOFF_MS`, skipped when its daily
 * budget is hard-blocked.
 */
function defaultPlan(sources) {
  return {
    actions: sources
      .map((s) => {
        const b = checkApiBudget(s.source);
        if (b.hardBlock) {
          return { tool: 'skip_source', source: s.source, reason: 'budget_exhausted' };
        }
        return {
          tool: 'fetch_source',
          source: s.source,
          retries: DEFAULT_RETRIES,
          backoffMs: DEFAULT_BACKOFF_MS,
        };
      }),
    planner: 'default',
    summary: 'default deterministic plan',
  };
}

/**
 * Request a plan from the AI recovery planner. Returns null on any error
 * so the caller falls back to the default plan. The route's own
 * `/api/agent/recover-plan` proxy is reused — we POST the fetch
 * observation and receive a normalized plan. The model never sees keys
 * and never executes fetches; it only proposes the sequence.
 */
async function requestAiPlan(observation, baseUrl, fetchImpl) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6_000);
    const res = await fetchImpl(`${baseUrl}/api/agent/recover-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ observation, budgets: { mode: 'fetch_plan' } }),
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.plan?.actions || !Array.isArray(body.plan.actions)) return null;
    return { ...body.plan, planner: body.planner || 'ai' };
  } catch {
    return null;
  }
}

function clampInt(n, min, max) {
  const i = Math.floor(Number(n));
  if (!Number.isFinite(i)) return min;
  return Math.max(min, Math.min(max, i));
}

/**
 * Normalize an AI plan action into a safe fetch/skip action. Unknown
 * tools become `skip_source`. Out-of-range retries/backoff are clamped
 * to the hard caps.
 */
function normalizeAction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const source = String(raw.source || '').slice(0, 80);
  if (!source) return null;
  if (raw.tool === 'skip_source') {
    return { tool: 'skip_source', source, reason: String(raw.reason || 'planner_skip').slice(0, 120) };
  }
  if (raw.tool === 'reset_circuit') {
    return { tool: 'reset_circuit', source, host: String(raw.host || '').slice(0, 120) };
  }
  if (raw.tool !== 'fetch_source') return null;
  return {
    tool: 'fetch_source',
    source,
    retries: clampInt(raw.retries, 0, HARD_MAX_RETRIES),
    backoffMs: clampInt(raw.backoffMs, HARD_MIN_BACKOFF_MS, HARD_MAX_BACKOFF_MS),
  };
}

function normalizePlan(plan, sources) {
  if (!plan?.actions) return null;
  const allowed = new Set(sources.map((s) => s.source));
  const actions = [];
  for (const raw of plan.actions) {
    const a = normalizeAction(raw);
    if (!a) continue;
    if (!allowed.has(a.source)) continue; // planner can't invent sources
    actions.push(a);
  }
  if (!actions.length) return null;
  return { actions, planner: plan.planner || 'ai', summary: String(plan.summary || '').slice(0, 200) };
}

/**
 * Execute one source fetch with retries + backoff. Returns
 * `{ source, ok, data, error, attempts }`. The fetcher is the route's
 * declared function; the orchestrator never calls upstream directly.
 *
 * `hostForCircuit` is an optional hostname the route declares so DNS
 * failures are recorded against the right circuit key (the source name
 * alone is not a hostname).
 */
async function executeFetchAction(action, fetcherByUrl, hostForCircuit, _errors, deadline) {
  const { source, retries, backoffMs } = action;
  const budget = checkApiBudget(source);
  if (budget.hardBlock) {
    return { source, ok: false, data: null, error: `budget exhausted (${budget.used}/${budget.limit})`, attempts: 0, skipped: true };
  }
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (Date.now() > deadline) {
      return { source, ok: false, data: null, error: lastErr || 'deadline exceeded', attempts: attempt, timedOut: true };
    }
    try {
      trackApiCall(source);
      const data = await fetcherByUrl(source);
      return { source, ok: true, data, error: null, attempts: attempt + 1 };
    } catch (e) {
      lastErr = e?.message || String(e);
      // Record DNS failures on the circuit so the next action can skip.
      // Use the route-declared host when available so the circuit key is
      // the real hostname, not the source display name.
      noteUpstreamFailure(hostForCircuit || source, e);
      if (attempt < retries) {
        const wait = Math.min(backoffMs, Math.max(0, deadline - Date.now()));
        if (wait > 0) await sleep(wait);
      }
    }
  }
  if (_errors) _errors[source] = lastErr;
  return { source, ok: false, data: null, error: lastErr, attempts: retries + 1 };
}

/**
 * Run a fetch plan for a set of declared sources.
 *
 * @param {object} opts
 * @param {Array<{source: string, fetcher: () => Promise<any>, host?: string}>} opts.sources
 *   Declared upstream sources. `fetcher` receives no args and returns the
 *   parsed payload; it must throw on failure. `host` (optional) is the
 *   upstream hostname used for circuit-breaker keys.
 * @param {object} [opts._errors]  Route `_errors` bag to populate on failure.
 * @param {string} [opts.baseUrl]  Base URL for the recover-plan proxy
 *   (server-side loopback). Required for AI planning; omitted → default plan.
 * @param {typeof fetch} [opts.fetchImpl]  Injectable fetch (testing).
 * @param {boolean} [opts.useAi]  Whether to consult the AI planner. Default
 *   true; set false to force the deterministic plan (tests, offline).
 * @returns {{ results: Record<string, any>, plan: object, planner: string }}
 */
export async function runFetchPlan({
  sources,
  _errors = {},
  baseUrl,
  fetchImpl = globalThis.fetch,
  useAi = true,
}) {
  if (!Array.isArray(sources) || !sources.length) {
    return { results: {}, plan: { actions: [] }, planner: 'empty' };
  }

  const fetcherByUrl = new Map(sources.map((s) => [s.source, s.fetcher]));
  const hostByUrl = new Map(sources.map((s) => [s.source, s.host || s.source]));
  const observation = buildFetchObservation(sources);

  let plan = null;
  if (useAi && baseUrl) {
    const ai = await requestAiPlan(observation, baseUrl, fetchImpl);
    plan = normalizePlan(ai, sources);
  }
  if (!plan) plan = defaultPlan(sources);

  const deadline = Date.now() + HARD_MAX_TOTAL_MS;
  let callsMade = 0;
  const results = {};

  for (const action of plan.actions) {
    if (callsMade >= HARD_MAX_CALLS) break;
    if (Date.now() > deadline) break;

    if (action.tool === 'reset_circuit' && action.host) {
      resetCircuit(action.host);
      continue;
    }
    if (action.tool === 'skip_source') {
      results[action.source] = null;
      if (_errors) _errors[action.source] = action.reason;
      continue;
    }
    // fetch_source
    const fetcher = fetcherByUrl.get(action.source);
    if (!fetcher) continue;
    callsMade++;
    const r = await executeFetchAction(action, fetcher, hostByUrl.get(action.source), _errors, deadline);
    results[action.source] = r.ok ? r.data : null;
    if (!r.ok && _errors && !_errors[action.source]) {
      _errors[action.source] = r.error;
    }
  }

  return { results, plan, planner: plan.planner };
}