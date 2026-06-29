import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

// ─────────────────────────────────────────────────────────────────────────────
// Panel health cache — populated by SplashScreen DOM scan during init.
// Every market renders behind the splash backdrop; scanAllPanels() finds
// [data-panel-key] elements and records 'ok' / 'null' / 'stale' per panel.
// The cache is set once via setPanelCache() when splash dismisses.
// ─────────────────────────────────────────────────────────────────────────────
let _panelCache = {};
let _cacheVersion = 0;
const _listeners = new Set();

export function setPanelCache(cache) {
  _panelCache = cache || {};
  _cacheVersion++;
  _listeners.forEach(fn => fn());
}

// Live DOM scan for a single panel. Used as fallback when the splash cache
// is stale (e.g. panel rendered after splash dismissed, or user navigated
// to a different tab and back).
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
  // mutationTick is incremented on every DOM mutation and on every cache
  // update. It is included in useMemo deps so that scanPanelInDOM() re-runs
  // when the DOM changes (e.g. a panel renders after data arrives, or the
  // user hovers a different tab). Without it, useMemo returns stale results
  // because [marketId, allMarkets, _cacheVersion] don't change on DOM mutation.
  // DO NOT REMOVE from deps — the dropdown dots will stop updating.
  const [mutationTick, setMutationTick] = useState(0);
  const observerRef = useRef(null);

  useEffect(() => {
    const listener = () => setMutationTick(n => n + 1);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!marketId) return;
    observerRef.current?.disconnect();
    const obs = new MutationObserver(() => setMutationTick(n => n + 1));
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
      // 1. Live DOM check — most accurate, works even after splash dismissed
      const live = scanPanelInDOM(p.id);
      if (live) {
        health[p.id] = live;
      // 2. Fall back to splash cache if panel not currently in DOM
      //    (e.g. user is hovering a different tab than the active one)
      } else if (cached[p.id]) {
        health[p.id] = cached[p.id];
      // 3. Infer from market context if no cache entry exists
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
  }, [marketId, allMarkets, _cacheVersion, mutationTick]);
}
