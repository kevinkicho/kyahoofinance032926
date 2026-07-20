import { lazy } from 'react';

// Consolidated lazy-loaded market components to avoid duplication
// between App.jsx (for popouts) and HubLayout.jsx (for main tabs).
// This central file makes it easier to manage code-splitting and add
// future improvements like retries or preloading.

/**
 * Wraps a dynamic import with retry logic for failed chunk loads.
 * This helps with transient network issues or stale cache on static hosts
 * like GitHub Pages (common cause of "Failed to fetch dynamically imported module").
 * On first failure it waits 1s and retries once; on second failure it rethrows
 * (the ErrorBoundary will catch and show retry UI + copy-stack button).
 */
function lazyWithRetry(importFunc) {
  return lazy(() =>
    importFunc().catch((error) => {
      console.warn('[lazyWithRetry] initial chunk load failed, retrying in 1s...', error);
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          importFunc().then(resolve).catch((err2) => {
            console.error('[lazyWithRetry] retry also failed', err2);
            reject(err2);
          });
        }, 1000);
      });
    })
  );
}

export const MARKET_COMPONENTS = {
  equities:          lazyWithRetry(() => import('../markets/equities/EquitiesMarket')),
  bonds:             lazyWithRetry(() => import('../markets/bonds/BondsMarket')),
  fx:                lazyWithRetry(() => import('../markets/fx/FXMarket')),
  derivatives:       lazyWithRetry(() => import('../markets/derivatives/DerivativesMarket')),
  realEstate:        lazyWithRetry(() => import('../markets/realEstate/RealEstateMarket')),
  insurance:         lazyWithRetry(() => import('../markets/insurance/InsuranceMarket')),
  commodities:       lazyWithRetry(() => import('../markets/commodities/CommoditiesMarket')),
  globalMacro:       lazyWithRetry(() => import('../markets/globalMacro/GlobalMacroMarket')),
  // imf/worldbank/census merged into globalMacro and realEstate. Data still
  // flows via DataProvider's MARKET_ENDPOINTS for cross-market reads.
  equitiesDeepDive:  lazyWithRetry(() => import('../markets/equitiesDeepDive/EquitiesDeepDiveMarket')),
  crypto:            lazyWithRetry(() => import('../markets/crypto/CryptoMarket')),
  credit:            lazyWithRetry(() => import('../markets/credit/CreditMarket')),
  sentiment:         lazyWithRetry(() => import('../markets/sentiment/SentimentMarket')),
  calendar:          lazyWithRetry(() => import('../markets/calendar/CalendarMarket')),
  bls:               lazyWithRetry(() => import('../markets/bls/BlsMarket')),
  eia:               lazyWithRetry(() => import('../markets/eia/EiaMarket')),
  alerts:            lazyWithRetry(() => import('../markets/alerts/AlertsMarket')),
  watchlist:         lazyWithRetry(() => import('../markets/watchlist/WatchlistMarket')),
  analytics:         lazyWithRetry(() => import('../markets/analytics/AnalyticsMarket')),
  census:            lazyWithRetry(() => import('../markets/census/CensusMarket')),
  imf:               lazyWithRetry(() => import('../markets/imf/ImfMarket')),
  worldbank:         lazyWithRetry(() => import('../markets/worldbank/WorldbankMarket')),
};

// Prefetch heavy / frequently used tabs on idle to reduce perceived load time
// for the first click (equities is the default/primary view).
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  const prefetch = () => {
    // Prefetch key heavy ones; others will lazy on demand with retry guard.
    import('../markets/equities/EquitiesMarket');
    import('../markets/globalMacro/GlobalMacroMarket');
    import('../markets/bonds/BondsMarket');
  };
  window.requestIdleCallback(prefetch, { timeout: 2000 });
} else if (typeof window !== 'undefined') {
  // Fallback
  setTimeout(() => {
    import('../markets/equities/EquitiesMarket').catch(() => {});
  }, 3000);
}
