import { useMemo } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const m = ctx?.markets?.[marketId];

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};
    for (const p of panels) {
      if (!m) {
        health[p.id] = 'unknown';
      } else if (m.isLoading) {
        health[p.id] = 'loading';
      } else if (m.data) {
        health[p.id] = 'ok';
      } else {
        health[p.id] = 'null';
      }
    }
    return health;
  }, [marketId, m]);
}
