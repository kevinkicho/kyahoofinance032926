import { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

// Global DOM observer — starts once, runs forever, not tied to any marketId
let sharedState = {};
let listeners = new Set();
let started = false;

function scan() {
  if (typeof document === 'undefined') return;
  const els = document.querySelectorAll('[data-panel-key]');
  const next = {};
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    next[key] = {
      rendered: true,
      hasData: !/unavailable|no data/i.test(text),
      isStale: /stale/i.test(footerText),
    };
  });
  sharedState = next;
  listeners.forEach(fn => fn(next));
}

function ensureObserver() {
  if (started) return;
  started = true;
  if (typeof document === 'undefined') return;
  requestAnimationFrame(() => {
    scan();
    const obs = new MutationObserver(scan);
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
  });
}

export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const [domPanels, setDomPanels] = useState(() => sharedState);

  useEffect(() => {
    ensureObserver();
    const fn = (s) => setDomPanels({ ...s });
    listeners.add(fn);
    // Hydrate if observer already ran
    if (Object.keys(sharedState).length > 0) setDomPanels({ ...sharedState });
    return () => listeners.delete(fn);
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    for (const p of panels) {
      const dom = domPanels[p.id];
      if (dom) {
        // Panel is in the DOM — trust what we see
        if (dom.isStale) health[p.id] = 'stale';
        else if (!dom.hasData) health[p.id] = 'null';
        else health[p.id] = 'ok';
      } else {
        // Panel not in DOM — use market-level data
        const m = allMarkets?.[marketId];
        if (!m) {
          health[p.id] = 'unknown';
        } else if (m.isLoading) {
          health[p.id] = 'loading';
        } else if (m.data) {
          // Market loaded — panel will render when navigated to
          health[p.id] = 'ok';
        } else {
          health[p.id] = 'null';
        }
      }
    }
    return health;
  }, [marketId, allMarkets, domPanels]);
}
