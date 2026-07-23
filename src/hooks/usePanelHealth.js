import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';
import {
  evaluateMarketPanels,
  evaluatePanelHealth,
  statusMapFromReports,
} from '../hub/lib/panelHealthEval';

// ─────────────────────────────────────────────────────────────────────────────
// Panel health cache — populated by SplashScreen during init with FULL reports
// (fetch + display + confirm). Green only when all three gates pass.
// ─────────────────────────────────────────────────────────────────────────────
let _panelCache = {}; // marketId -> { panelId -> PanelHealthReport | legacy string }
let _cacheVersion = 0;
const _listeners = new Set();

export function setPanelCache(cache) {
  _panelCache = cache || {};
  _cacheVersion++;
  _listeners.forEach(fn => fn());
}

export function getPanelCache() {
  return _panelCache;
}

export function getPanelReport(marketId, panelId) {
  const entry = _panelCache?.[marketId]?.[panelId];
  if (!entry) return null;
  if (typeof entry === 'string') return { status: entry, panelId, marketId };
  return entry;
}

function normalizeReport(entry, fallbackStatus = 'null') {
  if (!entry) return { status: fallbackStatus };
  if (typeof entry === 'string') return { status: entry };
  return entry;
}

/**
 * Live health map for a market's panels.
 * Returns Record<panelId, PanelHealthReport> with strict green criteria.
 */
export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;
  const [mutationTick, setMutationTick] = useState(0);
  const observerRef = useRef(null);

  useEffect(() => {
    const listener = () => setMutationTick(n => n + 1);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!marketId) return;
    observerRef.current?.disconnect();
    // Debounce DOM mutations — full subtree observe is noisy.
    let t = null;
    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => setMutationTick(n => n + 1), 120);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    observerRef.current = obs;
    return () => {
      clearTimeout(t);
      obs.disconnect();
    };
  }, [marketId]);

  return useMemo(() => {
    if (!marketId) return {};
    const marketCtx = allMarkets?.[marketId];
    // Prefer live evaluation so post-splash updates stay accurate.
    const live = evaluateMarketPanels(marketId, marketCtx, allMarkets);
    const cached = _panelCache[marketId] || {};
    // Merge: live wins when element is present; otherwise keep cache detail.
    const out = {};
    const panels = MARKET_PANELS[marketId] || [];
    for (const p of panels) {
      const liveR = live[p.id];
      const cacheR = normalizeReport(cached[p.id]);
      if (liveR?.elPresent) {
        out[p.id] = liveR;
      } else if (cacheR?.status && cacheR.status !== 'loading') {
        // Keep splash snapshot if panel not currently mounted (inactive tab)
        out[p.id] = { ...cacheR, title: cacheR.title || p.title, panelId: p.id, marketId };
      } else {
        out[p.id] = liveR || {
          status: 'null',
          marketId,
          panelId: p.id,
          title: p.title,
          fetchOk: false,
          displayOk: false,
          confirmOk: false,
          fetchDetail: 'not evaluated',
          displayDetail: 'panel not mounted',
          confirmDetail: 'n/a',
        };
      }
    }
    return out;
  }, [marketId, allMarkets, _cacheVersion, mutationTick]);
}

/** Status-string map for simple consumers. */
export function usePanelHealthStatuses(marketId) {
  const reports = usePanelHealth(marketId);
  return useMemo(() => statusMapFromReports(reports), [reports]);
}

/** Evaluate a single panel on demand (detail modal). */
export function evaluateSinglePanel(marketId, panelId, allMarkets) {
  const marketCtx = allMarkets?.[marketId];
  const title = (MARKET_PANELS[marketId] || []).find(p => p.id === panelId)?.title;
  return evaluatePanelHealth({
    marketId,
    panelId,
    panelTitle: title,
    marketCtx,
    allMarkets,
  });
}
