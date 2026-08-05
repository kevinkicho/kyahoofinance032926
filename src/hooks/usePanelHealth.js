import { useMemo, useState, useEffect, useRef } from 'react';
import { useDataContext } from '../hub/DataContext';
import { MARKET_PANELS } from '../data/marketPanels';
import {
  evaluateMarketPanels,
  evaluatePanelHealth,
  statusMapFromReports,
} from '../hub/lib/panelHealthEval';
import {
  derivePanelSignal,
  isMarketTabVisible,
} from '../hub/lib/panelHealthSignal';
import { attachHealthLayers, factsFromReport } from '../hub/lib/health/types.js';
import { readOperatorMode } from '../hub/lib/operatorMode.js';

// ─────────────────────────────────────────────────────────────────────────────
// Panel health cache — splash / last-seen fetch hints only.
// Green is NEVER taken from cache alone; derivePanelSignal enforces visibility.
// ─────────────────────────────────────────────────────────────────────────────
let _panelCache = {}; // marketId -> { panelId -> PanelHealthReport }
let _cacheVersion = 0;
const _listeners = new Set();

export function setPanelCache(cache) {
  // Splash seed: keep fetch hints only. Splash DOM dies on Enter.
  const next = {};
  for (const [mid, panels] of Object.entries(cache || {})) {
    next[mid] = {};
    for (const [pid, rep] of Object.entries(panels || {})) {
      if (typeof rep === 'string') {
        next[mid][pid] = {
          status: rep === 'ok' || rep === 'pending' || rep === 'loading' ? 'pending' : rep,
          fetchOk: rep === 'ok',
          displayOk: false,
          confirmOk: false,
          fetchDetail: 'splash string status demoted',
          displayDetail: 'open tab to verify display',
          confirmDetail: 'n/a until tab open',
          panelId: pid,
          marketId: mid,
          elPresent: false,
        };
      } else if (rep && typeof rep === 'object') {
        const fetchOk = !!rep.fetchOk;
        next[mid][pid] = {
          ...rep,
          displayOk: false,
          confirmOk: false,
          elPresent: false,
          status: fetchOk
            ? 'pending'
            : (rep.status === 'loading' ? 'loading' : (rep.status === 'ok' ? 'null' : (rep.status || 'null'))),
          displayDetail: 'splash seed — open tab to verify display',
          confirmDetail: 'skipped — tab not open yet',
          panelId: pid,
          marketId: mid,
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
  // Only persist durable facts: never cache a transient "painting" red.
  const durable = {};
  for (const [pid, rep] of Object.entries(reports)) {
    if (!rep || typeof rep !== 'object') continue;
    // Prefer storing fetch outcome; strip accidental green when writing from
    // non-visible contexts (caller should already gate, belt-and-suspenders).
    durable[pid] = {
      ...rep,
      // Cache is a hint store — downstream always re-derives display for visible tabs.
    };
  }
  _panelCache = {
    ..._panelCache,
    [marketId]: { ...(_panelCache[marketId] || {}), ...durable },
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

export { isMarketTabVisible };

/** @deprecated use isMarketTabVisible */
export function isMarketRootMounted(marketId) {
  return isMarketTabVisible(marketId);
}

/**
 * Align raw eval with visibility (legacy helper used by tests).
 * Prefer derivePanelSignal for UI colors.
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
  if (typeof report === 'string') {
    return normalizeReport(report);
  }
  const signal = derivePanelSignal(report, {
    tabVisible: !!mounted,
    marketLoading: report.status === 'loading',
    marketHasPayload: report.fetchOk || !!report.fetchedOn || !!report.fetchDetail,
  });
  return {
    ...report,
    status: signal.status,
    displayOk: signal.displayOk,
    confirmOk: signal.confirmOk,
    elPresent: mounted ? !!report.elPresent : false,
    displayDetail: mounted
      ? report.displayDetail
      : (signal.tooltip || report.displayDetail),
  };
}

/**
 * Live health map for a market's panels (used by topbar hover dropdown).
 *
 * Color policy: derivePanelSignal — fetch vs display are separate.
 * Green only on the *visible* active tab with all three gates.
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

  // Track visibility so opening the hovered tab rebinds DOM observers.
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document !== 'undefined' && marketId ? isMarketTabVisible(marketId) : false,
  );
  useEffect(() => {
    if (!marketId) {
      setTabVisible(false);
      return undefined;
    }
    const syncVis = () => setTabVisible(isMarketTabVisible(marketId));
    syncVis();
    const id = setInterval(syncVis, 500);
    return () => clearInterval(id);
  }, [marketId]);

  useEffect(() => {
    if (!marketId) return undefined;
    observerRef.current?.disconnect();
    let t = null;

    // Closed tab: light poll only (fetch-side). No body MutationObserver thrash.
    if (!tabVisible) {
      const poll = setInterval(() => setMutationTick(n => n + 1), 3000);
      return () => clearInterval(poll);
    }

    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => setMutationTick(n => n + 1), 150);
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'data-series-samples',
        'data-metric-value',
        'data-metric-display',
        'data-panel-disabled',
        'data-panel-bound',
        'class',
        'style',
      ],
    });
    observerRef.current = obs;
    const poll = setInterval(() => setMutationTick(n => n + 1), 1500);
    return () => {
      clearTimeout(t);
      clearInterval(poll);
      obs.disconnect();
    };
  }, [marketId, tabVisible]);

  const reports = useMemo(() => {
    if (!marketId) return {};
    const marketCtx = allMarkets?.[marketId];
    // Consumer: no health-shell invents for unmounted panels.
    // Operator/verify: allow bridge shells for F/D/C diagnostics.
    const live = evaluateMarketPanels(marketId, marketCtx, allMarkets, {
      createShell: readOperatorMode(),
    });
    const tabVisible = isMarketTabVisible(marketId);
    const marketLoading = !!marketCtx?.isLoading;
    const marketHasPayload = !!(marketCtx?.data || marketCtx?.error);
    const out = {};
    const panels = MARKET_PANELS[marketId] || [];

    for (const p of panels) {
      const liveR = live[p.id] || {
        status: marketLoading ? 'loading' : 'pending',
        marketId,
        panelId: p.id,
        title: p.title,
        fetchOk: false,
        displayOk: false,
        confirmOk: false,
        fetchDetail: marketLoading ? 'market still loading' : 'not evaluated',
        displayDetail: 'panel not in DOM',
        confirmDetail: 'n/a',
        elPresent: false,
      };

      const cacheR = normalizeReport(_panelCache[marketId]?.[p.id]);
      // Use splash/cache fetchOk ONLY before a live payload exists.
      // Once the market has data (or a hard error), trust live eval — otherwise
      // a splash true sticks forever and greys "ready" after a real hollow fail.
      const liveHasVerdict = !!(marketCtx?.data || marketCtx?.error) && !marketLoading;
      const fetchOk = liveHasVerdict
        ? !!liveR.fetchOk
        : !!(liveR.fetchOk || cacheR.fetchOk);
      const merged = {
        ...liveR,
        fetchOk,
        fetchDetail: liveR.fetchOk
          ? liveR.fetchDetail
          : (!liveHasVerdict && cacheR.fetchOk
            ? (cacheR.fetchDetail || liveR.fetchDetail)
            : liveR.fetchDetail),
        title: liveR.title || p.title,
        panelId: p.id,
        marketId,
      };

      // Closed tab: ignore any display/confirm from hidden DOM (visited display:none)
      // Also drop true-UI / bridge claims so splash/open-tab greens never stick.
      if (!tabVisible) {
        merged.displayOk = false;
        merged.confirmOk = false;
        merged.elPresent = false;
        merged.uiOk = false;
        merged.bridgeOnly = false;
        if (merged.healthQuality === 'ui' || merged.healthQuality === 'bridge') {
          merged.healthQuality = null;
        }
      }

      // Refresh L1/L2 fact layers after visibility strip (single health model).
      const layered = attachHealthLayers(merged);

      const signal = derivePanelSignal(layered, {
        tabVisible,
        marketLoading,
        marketHasPayload: marketHasPayload || fetchOk,
      });

      out[p.id] = {
        ...layered,
        status: signal.status,
        displayOk: signal.displayOk,
        confirmOk: signal.confirmOk,
        uiOk: signal.uiOk === true,
        bridgeOnly: signal.bridgeOnly === true,
        // Re-sync health facts with signal outcome for open-tab presentation
        health: signal.health || layered.health || factsFromReport(layered),
        dataState: layered.dataState,
        paintState: tabVisible ? layered.paintState : 'n/a',
        paintVia: tabVisible ? layered.paintVia : 'none',
        // UI helpers for the dropdown
        _signal: signal.kind,
        _color: signal.color,
        _tooltip: signal.tooltip,
      };
    }
    return out;
  }, [marketId, allMarkets, _cacheVersion, mutationTick]);

  // Cache only when this tab is visible (durable green / fail after paint)
  useEffect(() => {
    if (!marketId || !isMarketTabVisible(marketId)) return;
    const sig = JSON.stringify(
      Object.fromEntries(
        Object.entries(reports).map(([id, r]) => [
          id,
          `${r?.status}:${r?.fetchOk ? 1 : 0}${r?.displayOk ? 1 : 0}${r?.confirmOk ? 1 : 0}`,
        ]),
      ),
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
  const tabVisible = isMarketTabVisible(marketId);
  const signal = derivePanelSignal(report, {
    tabVisible,
    marketLoading: !!marketCtx?.isLoading,
    marketHasPayload: !!(marketCtx?.data || marketCtx?.error),
  });
  return {
    ...report,
    status: signal.status,
    displayOk: signal.displayOk,
    confirmOk: signal.confirmOk,
    _signal: signal.kind,
    _color: signal.color,
    _tooltip: signal.tooltip,
  };
}
