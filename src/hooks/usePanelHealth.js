import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

// Scan DOM for [data-panel-key] elements and return { panelKey: status }.
// Only finds panels that are CURRENTLY RENDERED (active market tab).
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
    } else if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 200) {
      map[key] = 'null';
    } else {
      map[key] = 'ok';
    }
  });
  return map;
}

// All known market IDs — used to identify which market the DOM panels belong to.
const ALL_MARKET_IDS = Object.keys(MARKET_PANELS);

// Find the market ID for a panel key by checking which market defines it.
function findMarketForPanel(panelKey) {
  for (const [mktId, panels] of Object.entries(MARKET_PANELS)) {
    if (panels.some(p => p.id === panelKey)) return mktId;
  }
  return null;
}

export function usePanelHealth(marketId, activeMarketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  // Cache: { [marketId]: { [panelId]: status } }
  // Populated by DOM scans. Persists across tab switches.
  const cacheRef = useRef({});
  const [domVersion, setDomVersion] = useState(0);

  // Scan DOM on every mutation and update cache for the ACTIVE market.
  // This runs continuously so the cache is always fresh.
  useEffect(() => {
    const scan = () => {
      const domMap = scanDom();
      if (Object.keys(domMap).length === 0) return;

      // Identify which market these panels belong to
      const panelKeys = Object.keys(domMap);
      const marketForPanels = new Map();
      for (const pk of panelKeys) {
        const mkt = findMarketForPanel(pk);
        if (mkt) marketForPanels.set(pk, mkt);
      }

      // Group by market and update cache
      for (const [pk, status] of Object.entries(domMap)) {
        const mkt = marketForPanels.get(pk);
        if (mkt) {
          cacheRef.current[mkt] = cacheRef.current[mkt] || {};
          cacheRef.current[mkt][pk] = status;
        }
      }
      setDomVersion(v => v + 1);
    };

    // Initial scan
    scan();

    // Observe mutations
    const obs = new MutationObserver(scan);
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    if (marketId === activeMarketId) {
      // ── Active market: scan DOM directly ──
      const domMap = scanDom();
      for (const p of panels) {
        if (domMap[p.id]) {
          health[p.id] = domMap[p.id];
        } else {
          const cached = cacheRef.current[marketId]?.[p.id];
          health[p.id] = cached || 'unknown';
        }
      }
    } else {
      // ── Non-active market: use cached DOM scan from last visit ──
      const cached = cacheRef.current[marketId] || {};
      const marketCtx = allMarkets?.[marketId];

      for (const p of panels) {
        if (cached[p.id]) {
          health[p.id] = cached[p.id];
        } else if (!marketCtx) {
          health[p.id] = 'unknown';
        } else if (marketCtx.isLoading) {
          health[p.id] = 'loading';
        } else if (marketCtx.error) {
          health[p.id] = 'null';
        } else {
          health[p.id] = 'unknown';
        }
      }
    }

    return health;
  }, [marketId, activeMarketId, allMarkets, domVersion]);
}
