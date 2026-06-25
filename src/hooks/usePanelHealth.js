import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

// Per-market cache of DOM panel status. Persists across market switches.
const marketCache = {};

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

// Update cache for ALL markets whose panels are currently in the DOM
function updateCache() {
  const snap = scanDom();
  for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
    const marketHealth = {};
    let found = false;
    for (const p of panels) {
      if (snap[p.id]) {
        found = true;
        marketHealth[p.id] = snap[p.id];
      }
    }
    if (found) {
      // Merge with existing cache (keep old data for panels not currently rendered)
      marketCache[marketId] = { ...marketCache[marketId], ...marketHealth };
    }
  }
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const [cache, setCache] = useState({});

  useEffect(() => {
    updateCache();
    setCache({ ...marketCache });

    const obs = new MutationObserver(() => {
      updateCache();
      setCache({ ...marketCache });
    });
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};
    const cached = cache[marketId] || {};

    for (const p of panels) {
      if (cached[p.id]) {
        // Use cached DOM status (from when this market was last active)
        health[p.id] = cached[p.id];
      } else {
        // No cached status — use market-level data
        const m = allMarkets?.[marketId];
        if (!m || m.isLoading) {
          health[p.id] = 'unknown';
        } else if (m.data) {
          health[p.id] = 'ok';
        } else {
          health[p.id] = 'null';
        }
      }
    }
    return health;
  }, [marketId, allMarkets, cache]);
}
