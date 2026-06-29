import { useMemo, useState, useEffect, useRef } from 'react';
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

function scanPanelInDOM(panelId) {
  const el = document.querySelector(`[data-panel-key="${panelId}"]`);
  if (!el) return null;
  const text = el.textContent || '';
  const footer = el.querySelector('.bento-footer, [class*="footer"]');
  const footerText = footer?.textContent || '';
  if (/stale/i.test(footerText)) return 'stale';
  if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 200) return 'null';
  return 'ok';
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;
  const [, forceUpdate] = useState(0);
  const observerRef = useRef(null);

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!marketId) return;
    observerRef.current?.disconnect();
    const obs = new MutationObserver(() => forceUpdate(n => n + 1));
    obs.observe(document.body, { childList: true, subtree: true });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [marketId]);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const cached = _panelCache[marketId] || {};
    const marketCtx = allMarkets?.[marketId];
    const health = {};

    for (const p of panels) {
      const live = scanPanelInDOM(p.id);
      if (live) {
        health[p.id] = live;
      } else if (cached[p.id]) {
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
