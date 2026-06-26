import { useMemo } from 'react';
import { MARKET_PANELS } from '../data/marketPanels';

// Global cache populated by SplashScreen during initialization.
// Stores { [marketId]: { [panelId]: 'ok' | 'null' | 'stale' } }
let _panelCache = {};

export function setPanelCache(cache) {
  _panelCache = cache || {};
}

export function getPanelCache() {
  return _panelCache;
}

export function usePanelHealth(marketId) {
  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const cached = _panelCache[marketId] || {};
    const health = {};
    for (const p of panels) {
      health[p.id] = cached[p.id] || 'unknown';
    }
    return health;
  }, [marketId]);
}
