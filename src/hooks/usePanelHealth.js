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
  // Per-market cache of last-known panel status
  const cacheRef = useRef({});

  // Update cache from current DOM state
  const refreshCache = () => {
    const snap = scanDom();
    setDomMap(snap);
    // Find which market owns each rendered panel by checking which market's
    // panels are in the DOM
    for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
      for (const p of panels) {
        if (snap[p.id]) {
          cacheRef.current[marketId] = cacheRef.current[marketId] || {};
          cacheRef.current[marketId][p.id] = snap[p.id];
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
      // 1. Check live DOM first (most accurate for active market)
      const domStatus = domMap[p.id];
      if (domStatus) {
        health[p.id] = domStatus;
        continue;
      }
      // 2. Check cache (from when this market was last active)
      if (cached[p.id]) {
        health[p.id] = cached[p.id];
        continue;
      }
      // 3. Never visited — unknown
      health[p.id] = 'unknown';
    }
    return health;
  }, [marketId, domMap]);
}
