import { useMemo, useState, useEffect } from 'react';
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

  useEffect(() => {
    const update = () => setDomMap(scanDom());
    const obs = new MutationObserver(update);
    obs.observe(document.body || document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-panel-key'], characterData: true,
    });
    return () => obs.disconnect();
  }, []);

  return useMemo(() => {
    const panels = MARKET_PANELS[marketId] || [];
    const health = {};

    for (const p of panels) {
      const domStatus = domMap[p.id];
      if (domStatus) {
        // Panel is in the DOM — use accurate DOM status
        health[p.id] = domStatus;
      } else {
        // Panel NOT in DOM — we can't determine its actual status
        const m = allMarkets?.[marketId];
        if (!m || m.isLoading) {
          health[p.id] = 'unknown';
        } else {
          // Market loaded but panel not rendered — unknown status
          health[p.id] = 'unknown';
        }
      }
    }
    return health;
  }, [marketId, allMarkets, domMap]);
}
