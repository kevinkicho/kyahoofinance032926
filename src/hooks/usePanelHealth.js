import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

// Scan DOM for [data-panel-key] elements and return { panelKey: status }.
// This only finds panels that are CURRENTLY RENDERED in the DOM — i.e.
// the active market tab's panels.
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
    } else if (/\bno data\b/i.test(text) && text.length < 80) {
      map[key] = 'null';
    } else {
      map[key] = 'ok';
    }
  });
  return map;
}

// Determine per-panel health from market data context (no DOM needed).
// Returns 'ok' | 'null' | 'loading' | 'unknown' for each panel.
function healthFromMarketData(marketCtx) {
  if (!marketCtx) return 'unknown';
  if (marketCtx.isLoading) return 'loading';
  if (marketCtx.error) return 'null';
  if (marketCtx.data) return 'ok';
  return 'unknown';
}

export function usePanelHealth(marketId, activeMarketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const cacheRef = useRef({});
  const [, forceUpdate] = useState(0);

  // DOM observer — triggers re-render when panels change in the DOM
  useEffect(() => {
    const obs = new MutationObserver(() => forceUpdate(n => n + 1));
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    // Is the hovered market the same as the active (rendered) one?
    const isDomScanValid = marketId === activeMarketId;

    if (isDomScanValid) {
      // ── Active market: scan DOM for per-panel status ──
      const domMap = scanDom();
      for (const p of panels) {
        if (domMap[p.id]) {
          health[p.id] = domMap[p.id];
          // Also cache for when user moves away
          cacheRef.current[marketId] = cacheRef.current[marketId] || {};
          cacheRef.current[marketId][p.id] = domMap[p.id];
        } else {
          // Panel not in DOM — might be conditionally hidden
          const cached = cacheRef.current[marketId]?.[p.id];
          health[p.id] = cached || 'unknown';
        }
      }
    } else {
      // ── Non-active market: derive health from DataContext ──
      const marketCtx = allMarkets?.[marketId];
      const overallStatus = healthFromMarketData(marketCtx);

      if (overallStatus === 'loading') {
        for (const p of panels) health[p.id] = 'loading';
      } else if (overallStatus === 'null') {
        for (const p of panels) health[p.id] = 'null';
      } else if (overallStatus === 'ok') {
        // Market data exists — panels are likely ok, but we can't verify
        // per-panel without rendering. Use cached DOM status if available,
        // otherwise mark as 'ok' (data was fetched successfully).
        for (const p of panels) {
          const cached = cacheRef.current[marketId]?.[p.id];
          health[p.id] = cached || 'ok';
        }
      } else {
        for (const p of panels) health[p.id] = 'unknown';
      }
    }

    return health;
  }, [marketId, activeMarketId, allMarkets]);
}
