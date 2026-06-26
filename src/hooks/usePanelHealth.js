import { useMemo } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const marketCtx = allMarkets?.[marketId];
    const health = {};

    for (const p of panels) {
      if (!marketCtx) {
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
  }, [marketId, allMarkets]);
}
