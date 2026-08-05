/**
 * Frontend market → API endpoint map.
 * Generated from shared/api-routing.json so Vite, Express, and the hub stay aligned.
 */
import routing from '../../../shared/api-routing.json';

/** @type {Record<string, string>} */
export const MARKET_ENDPOINTS = Object.fromEntries(
  Object.entries(routing.markets).map(([id, cfg]) => [id, cfg.primary])
);

/** All fetchable market ids (DataProvider wave). */
export const ALL_FETCH_IDS = Object.keys(MARKET_ENDPOINTS);

/** Splash / tab bar market ids (user-facing tabs). */
export const TAB_MARKET_IDS = [...routing.tabMarkets];

/**
 * Dependency endpoints a tab needs for full panel coverage
 * (cross-market data: treasuryTIC, nyfed, fema, …).
 * @param {string} marketId
 * @returns {string[]}
 */
export function getMarketDependencyPaths(marketId) {
  const cfg = routing.markets[marketId];
  if (!cfg) return [];
  return [...(cfg.deps || [])];
}

/**
 * Resolve every API path required for a tab: primary + deps.
 * @param {string} marketId
 * @returns {string[]}
 */
export function getMarketFetchPlan(marketId) {
  const cfg = routing.markets[marketId];
  if (!cfg) return [];
  const paths = [cfg.primary, ...(cfg.deps || [])];
  return [...new Set(paths)];
}

/**
 * All unique API paths needed to fully hydrate every tab market.
 * Used by tests and the /api/panel-routing diagnostic.
 */
export function getAllRequiredApiPaths() {
  const paths = new Set(routing.health || []);
  for (const id of TAB_MARKET_IDS) {
    for (const p of getMarketFetchPlan(id)) paths.add(p);
  }
  for (const p of Object.keys(routing.aliases || {})) paths.add(p);
  return [...paths].sort();
}

export function getProxyPaths() {
  return [...(routing.proxyPaths || [])];
}

export function getRoutingRegistry() {
  return routing;
}

/**
 * Map endpoint path → market id for diagnostics.
 * @param {string} path e.g. /api/bonds
 */
export function marketIdForPath(path) {
  const normalized = path.split('?')[0].replace(/\/$/, '');
  for (const [id, cfg] of Object.entries(routing.markets)) {
    if (cfg.primary === normalized) return id;
  }
  const aliases = routing.aliases || {};
  const canonical = aliases[normalized];
  if (canonical) {
    for (const [id, cfg] of Object.entries(routing.markets)) {
      if (cfg.primary === canonical) return id;
    }
  }
  return null;
}

/**
 * Cross-market dependency market ids (edgar, treasuryTIC, …) derived from
 * tab markets' deps in api-routing.json. Used to order the DataProvider wave
 * so satellites land before panels that wait on them.
 * @returns {string[]}
 */
export function getPriorityDepMarketIds() {
  const ids = new Set();
  for (const tabId of TAB_MARKET_IDS) {
    for (const p of getMarketDependencyPaths(tabId)) {
      const mid = marketIdForPath(p);
      if (mid && MARKET_ENDPOINTS[mid]) ids.add(mid);
    }
  }
  // Stable-ish order: shorter ids first (not critical)
  return [...ids].sort((a, b) => a.localeCompare(b));
}

/**
 * Full wave order: **deps first**, then tab markets, then remainder.
 * Cross-market panels stop waiting forever when satellites are last.
 * @returns {string[]}
 */
export function buildWaveMarketIdsFromRouting() {
  const primary = TAB_MARKET_IDS.filter((id) => id !== 'alerts' && MARKET_ENDPOINTS[id]);
  const deps = getPriorityDepMarketIds();
  const primarySet = new Set(primary);
  const depSet = new Set(deps);
  return [
    ...deps,
    ...primary.filter((id) => !depSet.has(id)),
    ...ALL_FETCH_IDS.filter((id) => !primarySet.has(id) && !depSet.has(id)),
  ];
}
