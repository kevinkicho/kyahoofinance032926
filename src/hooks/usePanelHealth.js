import { useMemo, useState, useEffect } from 'react';
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

function checkApiHealth(marketId, panelId, marketData, allMarkets) {
  const data = marketData?.data;
  const isLoading = marketData?.isLoading;

  if (!data && isLoading === false) {
    const registry = PANEL_REGISTRY[marketId];
    const entry = registry?.find(p => p.id === panelId);
    if (entry?.crossMarket) {
      const sourceMarket = allMarkets?.[entry.crossMarket];
      const sourceData = sourceMarket?.data;
      if (!sourceData) return 'null';
      const sourceVal = getFieldByPath(sourceData, entry.fieldPath);
      if (sourceVal === null || sourceVal === undefined) return 'null';
      if (Array.isArray(sourceVal) && sourceVal.length === 0) return 'empty';
      if (typeof sourceVal === 'object' && !Array.isArray(sourceVal) && Object.keys(sourceVal).length === 0) return 'empty';
      return 'ok';
    }
    return 'null';
  }
  if (!data) return 'loading';

  const registry = PANEL_REGISTRY[marketId];
  const entry = registry?.find(p => p.id === panelId);
  if (!entry) {
    const nonMetaKeys = Object.keys(data).filter(k => !k.startsWith('_') && k !== 'lastUpdated' && k !== 'fetchedOn' && k !== 'isCurrent' && k !== 'isLive');
    return nonMetaKeys.length > 0 ? 'ok' : 'null';
  }

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

function scanDomPanels() {
  if (typeof document === 'undefined') return {};
  const els = document.querySelectorAll('[data-panel-key]');
  const states = {};
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    const isUnavailable = /unavailable|no data/i.test(text);
    const isStale = /stale/i.test(footerText);
    states[key] = { rendered: true, hasData: !isUnavailable, isStale };
  });
  return states;
}

export function usePanelHealth(marketId, isActive) {
  const ctx = useDataContext();
  const marketData = ctx?.markets?.[marketId];
  const allMarkets = ctx?.markets;

  const [domPanels, setDomPanels] = useState({});

  useEffect(() => {
    const update = () => setDomPanels(scanDomPanels());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-panel-key'],
      characterData: true,
    });
    return () => observer.disconnect();
  }, [marketId]);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    for (const p of panels) {
      if (isActive) {
        const dom = domPanels[p.id];
        if (!dom) {
          health[p.id] = 'not-rendered';
        } else if (dom.isStale) {
          health[p.id] = 'stale';
        } else if (!dom.hasData) {
          health[p.id] = 'null';
        } else {
          health[p.id] = 'ok';
        }
      } else {
        health[p.id] = checkApiHealth(marketId, p.id, marketData, allMarkets);
      }
    }
    return health;
  }, [marketId, marketData, allMarkets, domPanels, isActive]);
}
