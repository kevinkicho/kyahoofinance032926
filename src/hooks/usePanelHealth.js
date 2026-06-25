import { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

// Per-market panel health cache — persists across market switches
let marketHealthCache = {};
let listeners = new Set();
let started = false;

function scan() {
  if (typeof document === 'undefined') return {};
  const els = document.querySelectorAll('[data-panel-key]');
  const snapshot = {};
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    snapshot[key] = {
      rendered: true,
      hasData: !/unavailable|no data/i.test(text),
      isStale: /stale/i.test(footerText),
    };
  });
  return snapshot;
}

function rebuildCache(snapshot) {
  const next = {};
  for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
    const marketHealth = {};
    let hasAny = false;
    for (const p of panels) {
      const dom = snapshot[p.id];
      if (dom) {
        hasAny = true;
        if (dom.isStale) marketHealth[p.id] = 'stale';
        else if (!dom.hasData) marketHealth[p.id] = 'null';
        else marketHealth[p.id] = 'ok';
      }
    }
    if (hasAny) next[marketId] = marketHealth;
  }
  return next;
}

function ensureObserver() {
  if (started) return;
  started = true;
  if (typeof document === 'undefined') return;
  // Scan immediately — no requestAnimationFrame delay
  const snapshot = scan();
  marketHealthCache = rebuildCache(snapshot);
  listeners.forEach(fn => fn({ ...marketHealthCache }));
  // Then observe for changes
  const obs = new MutationObserver(() => {
    const s = scan();
    marketHealthCache = rebuildCache(s);
    listeners.forEach(fn => fn({ ...marketHealthCache }));
  });
  obs.observe(document.body || document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['data-panel-key'], characterData: true,
  });
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const [cache, setCache] = useState(() => ({ ...marketHealthCache }));

  useEffect(() => {
    ensureObserver();
    const fn = (c) => setCache(c);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    // First try cached DOM snapshot (from when this market was last active)
    const cached = cache[marketId];
    if (cached) {
      for (const p of panels) {
        health[p.id] = cached[p.id] || 'unknown';
      }
      return health;
    }

    // No cached snapshot — use market-level data
    for (const p of panels) {
      const m = allMarkets?.[marketId];
      if (!m) {
        health[p.id] = 'unknown';
      } else if (m.isLoading) {
        health[p.id] = 'loading';
      } else if (m.data) {
        health[p.id] = 'ok';
      } else {
        health[p.id] = 'null';
      }
    }
    return health;
  }, [marketId, allMarkets, cache]);
}
