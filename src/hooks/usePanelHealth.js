import { useMemo } from 'react';
import { useDataContext } from '../hub/DataContext';
import { PANEL_REGISTRY } from '../data/panelRegistry';
import { MARKET_PANELS } from '../data/marketPanels';

function getFieldByPath(obj, path) {
  if (!path || !obj) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function checkPanelHealth(marketId, panelId, marketData) {
  const registry = PANEL_REGISTRY[marketId];
  if (!registry) return 'unknown';
  const entry = registry.find(p => p.id === panelId);
  if (!entry) return 'unknown';

  const data = marketData?.data;
  if (!data) return 'loading';

  // Cross-market panels check their source market
  if (entry.crossMarket) {
    return 'cross-market';
  }

  const val = getFieldByPath(data, entry.fieldPath);
  if (val === null || val === undefined) return 'null';
  if (Array.isArray(val) && val.length === 0) return 'empty';
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return 'empty';
  return 'ok';
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const marketData = ctx?.markets?.[marketId];

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};
    for (const p of panels) {
      health[p.id] = checkPanelHealth(marketId, p.id, marketData);
    }
    return health;
  }, [marketId, marketData]);
}
