import { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';

function scanDomPanels() {
  if (typeof document === 'undefined') return {};
  const els = document.querySelectorAll('[data-panel-key]');
  const states = {};
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    const isUnavailable = /unavailable|no data/i.test(text);
    const isStale = /stale/i.test(footerText);
    states[key] = { rendered: true, hasData: !isUnavailable, isStale };
  });
  return states;
}

export function usePanelHealth(marketId, isActive) {
  const ctx = useDataContext();
  const marketData = ctx?.markets?.[marketId];

  const [domPanels, setDomPanels] = useState({});

  useEffect(() => {
    const update = () => setDomPanels(scanDomPanels());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-panel-key'],
      characterData: true,
    });
    return () => observer.disconnect();
  }, [marketId]);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    for (const p of panels) {
      if (isActive) {
        // Active market: read actual DOM state
        const dom = domPanels[p.id];
        if (!dom) {
          health[p.id] = 'not-rendered';
        } else if (dom.isStale) {
          health[p.id] = 'stale';
        } else if (!dom.hasData) {
          health[p.id] = 'null';
        } else {
          health[p.id] = 'ok';
        }
      } else {
        // Hovered market (not visible): report based on whether the
        // market data loaded. If data is null, panels are unavailable.
        health[p.id] = marketData?.data ? 'ok' : 'null';
      }
    }
    return health;
  }, [marketId, marketData, domPanels, isActive]);
}
