import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';
import {
  evaluateMarketPanels,
  evaluatePanelHealth,
  statusMapFromReports,
} from '../hub/lib/panelHealthEval';

// ─────────────────────────────────────────────────────────────────────────────
// Panel health cache — splash snapshot only. NEVER used alone for green:
// status `ok` requires a live DOM eval on a mounted market tab.
// ─────────────────────────────────────────────────────────────────────────────
let _panelCache = {}; // marketId -> { panelId -> PanelHealthReport }
let _cacheVersion = 0;
const _listeners = new Set();

export function setPanelCache(cache) {
  // Normalize: never store bare string statuses as ok free-passes
  const next = {};
  for (const [mid, panels] of Object.entries(cache || {})) {
    next[mid] = {};
    for (const [pid, rep] of Object.entries(panels || {})) {
      if (typeof rep === 'string') {
        next[mid][pid] = {
          status: rep === 'ok' ? 'pending' : rep,
          fetchOk: false,
          displayOk: false,
          confirmOk: false,
          fetchDetail: 'legacy string status demoted',
          displayDetail: 're-open tab to verify',
          confirmDetail: 'n/a',
          panelId: pid,
          marketId: mid,
        };
      } else if (rep && rep.status === 'ok' && !(rep.fetchOk && rep.displayOk && rep.confirmOk && rep.elPresent)) {
        // Splash sometimes greened without full gates — demote
        next[mid][pid] = {
          ...rep,
          status: rep.fetchOk ? 'pending' : (rep.status === 'ok' ? 'null' : rep.status),
          displayOk: !!rep.displayOk && !!rep.elPresent,
          confirmOk: !!rep.confirmOk && !!rep.elPresent,
        };
      } else {
        next[mid][pid] = rep;
      }
    }
  }
  _panelCache = next;
  _cacheVersion++;
  _listeners.forEach(fn => fn());
}

/** Merge live reports for one market into the shared cache (keeps other markets). */
export function mergePanelMarketCache(marketId, reports) {
  if (!marketId || !reports) return;
  _panelCache = {
    ..._panelCache,
    [marketId]: { ...(_panelCache[marketId] || {}), ...reports },
  };
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
  if (typeof entry === 'string') {
    return {
      status: entry === 'ok' ? 'pending' : entry,
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
    };
  }
  return entry;
}

function isMarketRootMounted(marketId) {
  if (typeof document === 'undefined' || !marketId) return false;
  // Prefer the live hub root — ignore leftover splash nodes if both exist
  if (document.querySelector(`[data-market-id="${marketId}"]`)) return true;
  // Splash still up
  return !!document.querySelector(`[data-splash-market="${marketId}"]`);
}

/**
 * Demote any report to non-green when the panel DOM is not present.
 * This is the core sync rule: green only when we can see the panel now.
 */
export function syncReportToDom(report, { mounted }) {
  if (!report) {
    return {
      status: 'unknown',
      fetchOk: false,
      displayOk: false,
      confirmOk: false,
      fetchDetail: 'no report',
      displayDetail: 'n/a',
      confirmDetail: 'n/a',
      elPresent: false,
    };
  }
  const r = { ...report };
  // Never green from a string legacy status
  if (typeof report === 'string') {
    return normalizeReport(report);
  }

  if (!mounted) {
    // Tab not painted: fetch may be ready, but display/confirm cannot pass.
    r.displayOk = false;
    r.confirmOk = false;
    r.elPresent = false;
    if (r.status === 'ok') {
      r.status = r.fetchOk ? 'pending' : 'null';
    }
    r.displayDetail = r.displayDetail || 'market tab not mounted';
    r.confirmDetail = 'skipped — tab not mounted';
    return r;
  }

  // Mounted: if eval says ok but element missing, demote
  if (r.status === 'ok' && !r.elPresent) {
    r.status = 'missing';
    r.displayOk = false;
    r.confirmOk = false;
    r.displayDetail = 'status was ok without DOM — demoted';
  }
  // All three gates required for ok
  if (r.status === 'ok' && !(r.fetchOk && r.displayOk && r.confirmOk)) {
    r.status = 'null';
  }
  return r;
}

/**
 * Live health map for a market's panels.
 * Green (`ok`) ONLY when the market tab is mounted AND fetch+display+confirm pass.
 */
export function usePanelHealth(marketId) {
  const ctx = useDataContext();
  const allMarkets = ctx?.markets;
  const [mutationTick, setMutationTick] = useState(0);
  const observerRef = useRef(null);
  const lastMergeRef = useRef('');

  useEffect(() => {
    const listener = () => setMutationTick(n => n + 1);
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!marketId) return;
    observerRef.current?.disconnect();
    let t = null;
    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => setMutationTick(n => n + 1), 150);
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-series-samples', 'data-metric-value', 'data-metric-display', 'data-panel-disabled', 'class'],
    });
    observerRef.current = obs;
    // Charts often paint without text mutations — poll while this tab is active
    const poll = setInterval(() => setMutationTick(n => n + 1), 2000);
    return () => {
      clearTimeout(t);
      clearInterval(poll);
      obs.disconnect();
    };
  }, [marketId]);

  const reports = useMemo(() => {
    if (!marketId) return {};
    const marketCtx = allMarkets?.[marketId];
    const live = evaluateMarketPanels(marketId, marketCtx, allMarkets);
    const marketMounted = isMarketRootMounted(marketId);
    const out = {};
    const panels = MARKET_PANELS[marketId] || [];

    for (const p of panels) {
      const liveR = live[p.id] || {
        status: 'missing',
        marketId,
        panelId: p.id,
        title: p.title,
        fetchOk: false,
        displayOk: false,
        confirmOk: false,
        fetchDetail: 'not evaluated',
        displayDetail: 'panel not in DOM',
        confirmDetail: 'n/a',
        elPresent: false,
      };

      if (marketMounted) {
        // Always prefer live DOM eval for the open tab
        out[p.id] = syncReportToDom(
          { ...liveR, title: liveR.title || p.title, panelId: p.id, marketId },
          { mounted: true },
        );
      } else {
        // Inactive tab: may use splash fetch hints, but NEVER green without DOM
        const cacheR = normalizeReport(_panelCache[marketId]?.[p.id]);
        const base = liveR.fetchOk || cacheR.fetchOk
          ? {
              ...liveR,
              fetchOk: !!(liveR.fetchOk || cacheR.fetchOk),
              fetchDetail: liveR.fetchOk ? liveR.fetchDetail : (cacheR.fetchDetail || liveR.fetchDetail),
            }
          : liveR;
        out[p.id] = syncReportToDom(
          { ...base, title: p.title, panelId: p.id, marketId },
          { mounted: false },
        );
      }
    }
    return out;
  }, [marketId, allMarkets, _cacheVersion, mutationTick]);

  // Keep cache aligned with live active-tab truth so other UI does not show stale green
  useEffect(() => {
    if (!marketId || !isMarketRootMounted(marketId)) return;
    const sig = JSON.stringify(
      Object.fromEntries(Object.entries(reports).map(([id, r]) => [id, r?.status + (r?.fetchOk ? '1' : '0') + (r?.displayOk ? '1' : '0') + (r?.confirmOk ? '1' : '0')])),
    );
    if (sig === lastMergeRef.current) return;
    lastMergeRef.current = sig;
    mergePanelMarketCache(marketId, reports);
  }, [marketId, reports]);

  return reports;
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
  const report = evaluatePanelHealth({
    marketId,
    panelId,
    panelTitle: title,
    marketCtx,
    allMarkets,
  });
  return syncReportToDom(report, { mounted: isMarketRootMounted(marketId) });
}
