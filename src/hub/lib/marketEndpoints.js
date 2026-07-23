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
