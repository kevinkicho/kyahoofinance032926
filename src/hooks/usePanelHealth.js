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

  const cacheRef = useRef({});
  const [, forceUpdate] = useState(0);

  // DOM observer — triggers re-render when panels change
  useEffect(() => {
    const obs = new MutationObserver(() => forceUpdate(n => n + 1));
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    // ── Live DOM scan (synchronous, always fresh) ──
    const domMap = scanDom();

    // ── Populate cache from market data + update from DOM ──
    if (allMarkets) {
      for (const [mktId, panels] of Object.entries(MARKET_PANELS)) {
        const m = allMarkets[mktId];
        if (!m) continue;
        cacheRef.current[mktId] = cacheRef.current[mktId] || {};

        // First: DOM scan overwrites with accurate per-panel status
        for (const p of panels) {
          if (domMap[p.id]) {
            cacheRef.current[mktId][p.id] = domMap[p.id];
          }
        }

        // Second: market data fills in panels not found in DOM
        for (const p of panels) {
          if (!cacheRef.current[mktId][p.id]) {
            if (m.isLoading) {
              cacheRef.current[mktId][p.id] = 'unknown';
            } else {
              // Market fetched — panel will likely render when navigated to
              cacheRef.current[mktId][p.id] = 'ok';
            }
          }
        }
      }
    }

    // ── Build health from cache + live DOM ──
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};
    const cached = cacheRef.current[marketId] || {};

    for (const p of panels) {
      const domStatus = domMap[p.id];
      if (domStatus) {
        health[p.id] = domStatus;
      } else if (cached[p.id]) {
        health[p.id] = cached[p.id];
      } else {
        health[p.id] = 'unknown';
      }
    }
    return health;
  }, [marketId, allMarkets]);
}
