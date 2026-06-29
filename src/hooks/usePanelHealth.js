import { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

let _panelCache = {};
let _cacheVersion = 0;
const _listeners = new Set();

export function setPanelCache(cache) {
  _panelCache = cache || {};
  _cacheVersion++;
  _listeners.forEach(fn => fn());
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const cached = _panelCache[marketId] || {};
    const marketCtx = allMarkets?.[marketId];
    const health = {};

    for (const p of panels) {
      if (cached[p.id]) {
        health[p.id] = cached[p.id];
      } else if (!marketCtx) {
        health[p.id] = 'unknown';
      } else if (marketCtx.isLoading) {
        health[p.id] = 'loading';
      } else if (marketCtx.error && !marketCtx.data) {
        health[p.id] = 'null';
      } else if (marketCtx.data) {
        health[p.id] = 'ok';
      } else {
        health[p.id] = 'unknown';
      }
    }
    return health;
  }, [marketId, allMarkets, _cacheVersion]);
}
