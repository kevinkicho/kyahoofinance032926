/**
 * Market serve policy — single decision tree for user GET vs rebuild.
 *
 * Modes (env MARKET_SERVE_MODE):
 *   cache_bootstrap (default) — serve cache when present; upstream only on
 *     cache miss or ?refresh=1 / X-Cache-Bypass. Normal page loads never fan
 *     out if a non-hollow bag exists.
 *   cache — never call upstream unless ?refresh=1 (or X-Cache-Bypass).
 *     Cache miss → degraded shell; warm/postdeploy job fills bags.
 *   live — legacy: treat miss like bootstrap (alias of cache_bootstrap).
 *
 * Query/header overrides:
 *   ?refresh=1 | X-Cache-Bypass:1  → force upstream attempt (operator ▶)
 *   ?cacheOnly=1 | X-Cache-Only:1  → never upstream this request
 */

function truthy(v) {
  return v === true || v === 1 || v === '1' || v === 'true' || v === 'yes';
}

/**
 * @returns {'cache'|'cache_bootstrap'|'live'}
 */
export function getMarketServeMode() {
  const raw = String(process.env.MARKET_SERVE_MODE || 'cache_bootstrap').toLowerCase().trim();
  if (raw === 'cache' || raw === 'cache_only' || raw === 'serve_only') return 'cache';
  if (raw === 'live' || raw === 'always') return 'live';
  return 'cache_bootstrap';
}

/**
 * @param {import('express').Request} req
 * @returns {{
 *   forceRefresh: boolean,
 *   cacheOnly: boolean,
 *   mode: string,
 *   allowUpstream: boolean,
 *   reason: string,
 * }}
 */
export function resolveMarketServePolicy(req) {
  const mode = getMarketServeMode();
  const q = req?.query || {};
  const forceRefresh = truthy(q.refresh)
    || truthy(req?.skipCache)
    || String(req?.headers?.['x-cache-bypass'] || '') === '1';
  const cacheOnly = truthy(q.cacheOnly)
    || String(req?.headers?.['x-cache-only'] || '') === '1'
    || String(process.env.MARKET_CACHE_ONLY || '') === '1';

  if (cacheOnly && !forceRefresh) {
    return {
      forceRefresh: false,
      cacheOnly: true,
      mode,
      allowUpstream: false,
      reason: 'cache_only_request',
    };
  }

  if (forceRefresh) {
    return {
      forceRefresh: true,
      cacheOnly: false,
      mode,
      allowUpstream: true,
      reason: 'force_refresh',
    };
  }

  // Normal user GET — never upstream if we will serve cache (caller checks bag).
  // allowUpstream here means "may call upstream on miss".
  if (mode === 'cache') {
    return {
      forceRefresh: false,
      cacheOnly: false,
      mode,
      allowUpstream: false,
      reason: 'serve_mode_cache',
    };
  }

  // cache_bootstrap / live: allow one upstream build when bag missing
  return {
    forceRefresh: false,
    cacheOnly: false,
    mode: mode === 'live' ? 'cache_bootstrap' : mode,
    allowUpstream: true,
    reason: 'bootstrap_on_miss',
  };
}

/**
 * Whether a live rebuild result is safe to persist (never mock; refuse hollow).
 */
export function shouldPersistLiveResult(marketName, result, isStructurallyHollowFn) {
  if (!result || typeof result !== 'object') return false;
  if (typeof isStructurallyHollowFn === 'function' && isStructurallyHollowFn(marketName, result)) {
    return false;
  }
  return true;
}
