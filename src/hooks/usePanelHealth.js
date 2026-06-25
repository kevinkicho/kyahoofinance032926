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

function checkPanelHealth(marketId, panelId, marketData, allMarkets) {
  const data = marketData?.data;
  if (!data) return 'loading';

  const registry = PANEL_REGISTRY[marketId];
  const entry = registry?.find(p => p.id === panelId);

  // If panel has no registry entry, check if the market has any data at all
  if (!entry) {
    const nonMetaKeys = Object.keys(data).filter(k => !k.startsWith('_') && k !== 'lastUpdated' && k !== 'fetchedOn' && k !== 'isCurrent' && k !== 'isLive');
    return nonMetaKeys.length > 0 ? 'ok' : 'null';
  }

  // Cross-market panels: verify the source market actually has data
  if (entry.crossMarket) {
    const sourceMarket = allMarkets?.[entry.crossMarket];
    const sourceData = sourceMarket?.data;
    if (!sourceData) return 'null';
    const sourceVal = getFieldByPath(sourceData, entry.fieldPath);
    if (sourceVal === null || sourceVal === undefined) return 'null';
    if (Array.isArray(sourceVal) && sourceVal.length === 0) return 'empty';
    if (typeof sourceVal === 'object' && !Array.isArray(sourceVal) && Object.keys(sourceVal).length === 0) return 'empty';
    return 'ok';
  }

  const val = getFieldByPath(data, entry.fieldPath);
  if (val === null || val === undefined) {
    const sources = data._sources;
    if (sources && typeof sources === 'object') {
      const anyTrue = Object.values(sources).some(v => v === true);
      if (anyTrue) return 'ok';
    }
    return 'null';
  }
  if (Array.isArray(val) && val.length === 0) return 'empty';
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return 'empty';
  return 'ok';
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const marketData = ctx?.markets?.[marketId];
  const allMarkets = ctx?.markets;

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};
    for (const p of panels) {
      health[p.id] = checkPanelHealth(marketId, p.id, marketData, allMarkets);
    }
    return health;
  }, [marketId, marketData, allMarkets]);
}
