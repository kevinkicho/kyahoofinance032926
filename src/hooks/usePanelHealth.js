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

export function usePanelHealth(marketId, isActive) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;

  const [domMap, setDomMap] = useState({});

  useEffect(() => {
    const update = () => setDomMap(scanDom());
    update();
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
        // Panel is in the DOM — trust the DOM scan
        health[p.id] = domStatus;
      } else if (isActive) {
        // Active market but panel not in DOM — it's not rendered
        health[p.id] = 'not-rendered';
      } else {
        // Non-active market — use market-level data
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
  }, [marketId, allMarkets, domMap, isActive]);
}
