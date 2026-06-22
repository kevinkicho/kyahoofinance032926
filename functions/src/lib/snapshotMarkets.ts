export type SnapshotMarket = {
  id: string;
  path: string;
  diagnostics?: boolean;
};

// Keep this list aligned with src/hub/DataProvider.jsx MARKET_ENDPOINTS plus
// backend-only analytics/system snapshots. It drives scheduled RTDB history and
// admin refreshes, so new frontend endpoints should be added here deliberately.
export const SNAPSHOT_MARKETS: SnapshotMarket[] = [
  { id: "analytics", path: "/api/analytics" },
  { id: "rateLimits", path: "/api/rate-limits", diagnostics: false },
  { id: "cacheStatus", path: "/api/cache/status", diagnostics: false },
  { id: "universeUpdates", path: "/api/universeUpdates", diagnostics: false },

  { id: "equities", path: "/api/equities" },
  { id: "bonds", path: "/api/bonds" },
  { id: "fx", path: "/api/fx" },
  { id: "derivatives", path: "/api/derivatives" },
  { id: "realEstate", path: "/api/realEstate" },
  { id: "insurance", path: "/api/insurance" },
  { id: "commodities", path: "/api/commoditiesEnhanced" },
  { id: "globalMacro", path: "/api/globalMacro" },
  { id: "watchlist", path: "/api/watchlist" },
  { id: "equitiesDeepDive", path: "/api/equityDeepDive" },
  { id: "institutional", path: "/api/institutional" },
  { id: "crypto", path: "/api/crypto" },
  { id: "credit", path: "/api/credit" },
  { id: "sentiment", path: "/api/sentiment" },
  { id: "calendar", path: "/api/calendar" },
  { id: "imf", path: "/api/imf" },
  { id: "worldbank", path: "/api/worldbank" },
  { id: "bls", path: "/api/bls" },
  { id: "eia", path: "/api/eia" },
  { id: "census", path: "/api/census" },
  { id: "bea", path: "/api/bea" },
  { id: "eurostat", path: "/api/eurostat" },
  { id: "oecd", path: "/api/oecd" },
  { id: "edgar", path: "/api/edgar" },
  { id: "nyfed", path: "/api/nyfed" },
  { id: "fdic", path: "/api/fdic" },
  { id: "ecb", path: "/api/ecb" },
  { id: "treasuryTIC", path: "/api/treasuryTIC" },
  { id: "treasuryAuctions", path: "/api/treasuryAuctions" },
  { id: "treasuryDTS", path: "/api/treasuryDTS" },
  { id: "fedSEP", path: "/api/fed/sep" },
  { id: "fedGDPNow", path: "/api/fed/gdpnow" },
  { id: "fedInflationNowcast", path: "/api/fed/inflation-nowcast" },
  { id: "fedNewsSentiment", path: "/api/fed/news-sentiment" },
  { id: "msrb", path: "/api/msrb" },
  { id: "fema", path: "/api/fema" },
  { id: "usgs", path: "/api/usgs" },
  { id: "edgarInsurerRatios", path: "/api/edgar/insurer-ratios" },
  { id: "usda", path: "/api/usda" },
  { id: "censusTrade", path: "/api/censusTrade" },
  { id: "eiaPetroleum", path: "/api/eiaPetroleum" },
];

export const DIAGNOSTIC_MARKETS: SnapshotMarket[] = SNAPSHOT_MARKETS.filter(
  market => market.diagnostics !== false
);
