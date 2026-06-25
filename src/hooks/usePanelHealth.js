import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

function scanDom() {
  if (typeof document === 'undefined') return {};
  const els = document.querySelectorAll('[data-panel-key]');
  const map = {};
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    if (/stale/i.test(footerText)) {
      map[key] = 'stale';
    } else if (/unavailable|no data/i.test(text)) {
      map[key] = 'null';
    } else {
      map[key] = 'ok';
    }
  });
  return map;
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const [domMap, setDomMap] = useState(() => scanDom());
  const cacheRef = useRef({});

  // Populate cache from market data at initialization
  // (gives immediate status for all markets without needing DOM)
  useEffect(() => {
    if (!allMarkets) return;
    for (const [mktId, panels] of Object.entries(MARKET_PANELS)) {
      const m = allMarkets[mktId];
      if (!m) continue;
      cacheRef.current[mktId] = cacheRef.current[mktId] || {};
      for (const p of panels) {
        // Don't overwrite existing DOM-based cache entries
        if (cacheRef.current[mktId][p.id]) continue;
        if (m.isLoading) {
          cacheRef.current[mktId][p.id] = 'unknown';
        } else if (m.data) {
          cacheRef.current[mktId][p.id] = 'ok';
        } else {
          cacheRef.current[mktId][p.id] = 'null';
        }
      }
    }
  }, [allMarkets]);

  // Update cache from DOM scans (more accurate than market data)
  const refreshCache = () => {
    const snap = scanDom();
    setDomMap(snap);
    for (const [mktId, panels] of Object.entries(MARKET_PANELS)) {
      for (const p of panels) {
        if (snap[p.id]) {
          cacheRef.current[mktId] = cacheRef.current[mktId] || {};
          cacheRef.current[mktId][p.id] = snap[p.id];
        }
      }
    }
  };

  useEffect(() => {
    refreshCache();
    const obs = new MutationObserver(refreshCache);
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};
    const cached = cacheRef.current[marketId] || {};

    for (const p of panels) {
      const domStatus = domMap[p.id];
      if (domStatus) {
        // Live DOM — most accurate
        health[p.id] = domStatus;
      } else if (cached[p.id]) {
        // Cached from previous visit or initialization
        health[p.id] = cached[p.id];
      } else {
        health[p.id] = 'unknown';
      }
    }
    return health;
  }, [marketId, domMap]);
}
