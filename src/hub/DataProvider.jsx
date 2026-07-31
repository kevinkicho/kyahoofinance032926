import React, { useState, useCallback, useRef, useEffect } from 'react';
import DataContext from './DataContext';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { putSnapshot, todayStr } from '../utils/snapshotDB';
import { apiUrl } from '../lib/api';
import { logDataFetch, logDataReceived, logError } from '../lib/logger';
import { loadFromRTDB, listSnapshotDates } from './lib/rtdb';
import { passesStructuralGuard, hasNonNullData, needsLiveRepair, STRUCTURAL_GUARDS } from './lib/guards';
import { computeFreshnessReport } from './lib/freshness';
import { computeAlerts, getDisabledRuleIds } from './lib/alerts';
import { saveSnapshot, createInitialMarketState, FEDERATED_MARKETS, SNAPSHOT_KEY } from './lib/snapshot';
// Canonical routing — shared/api-routing.json via marketEndpoints.js
import {
  MARKET_ENDPOINTS,
  ALL_FETCH_IDS,
  TAB_MARKET_IDS,
  getMarketFetchPlan,
} from './lib/marketEndpoints';
import { publishMarketPayload } from './lib/panelHealthBus';

export { MARKET_ENDPOINTS, ALL_FETCH_IDS, TAB_MARKET_IDS, getMarketFetchPlan };

// Re-export extracted helpers for test suites / external callers
export { computeFreshnessReport } from './lib/freshness';
export { computeAlerts } from './lib/alerts';
export { passesStructuralGuard, STRUCTURAL_GUARDS, hasNonNullData, needsLiveRepair } from './lib/guards';

const dlog = import.meta.env.DEV ? console.log.bind(console) : () => {};

// Hosted cold starts: realEstate/insurance/bonds often need 30–90s before
// daily disk cache exists. Per-attempt budget must exceed those routes;
// totalTimeout must cover one retry without aborting mid-flight.
const FETCH_SETTINGS = {
  timeout: 120000,
  retries: 1,
  batchConcurrency: 4,
  batchDelayMs: 250,
  totalTimeout: 180000,
};

// Refresh policy (user-facing):
//   1) App load  → one wave, cache-first (no ?refresh) unless VITE_FORCE_LIVE
//   2) Topbar ▶  → same wave, force-live (?refresh=true) for all markets
//   3) Panel ▶   → force-live for that market only (refetchSingle)
// No auto-refresh timers and no background revalidate after the first wave.
const ALWAYS_FORCE_LIVE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_FORCE_LIVE === 'true';

// Tab markets the splash screen tracks — retry these first if the initial
// wave failed (slow FRED / Yahoo bursts often time out the first pass).
// Source: shared/api-routing.json → tabMarkets (alerts is federated, no HTTP).
const PRIMARY_MARKET_IDS = TAB_MARKET_IDS.filter(id => id !== 'alerts' && MARKET_ENDPOINTS[id]);

// Cross-market deps that power many "unavailable" panels when starved behind
// the primary wave. Fetch immediately after tab markets so TIC/ECB/CFTC/etc.
// land before the user opens those panels.
const PRIORITY_DEP_IDS = [
  'ecb', 'treasuryTIC', 'treasuryCost', 'treasuryAuctions', 'nyfed',
  'cftcTFF', 'bisOTC', 'fema', 'usgs', 'worldbank', 'imf', 'bea',
  'edgar', 'edgarInsurerRatios', 'edgarFilingActivity', 'institutional',
  'fdic', 'msrb', 'census', 'censusTrade', 'eiaPetroleum', 'usda', 'fao',
  'fedNewsSentiment', 'fedGDPNow', 'fedSEP', 'fedInflationNowcast',
  'eurostat', 'oecd', 'universeUpdates', 'treasuryDTS',
].filter((id) => MARKET_ENDPOINTS[id]);

// Live path is App Hosting Express + disk/GCS cache — do not seed RTDB on
// load (stale snapshots used to blank panels). Historical date picker can
// still soft-try RTDB when a past date is selected (see loadFromRTDB below).
// Set VITE_USE_RTDB_SEED=true only for offline demos.
const USE_RTDB_SEED =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_RTDB_SEED === 'true';

function tsNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function summarizeData(data) {
  if (!data || typeof data !== 'object') return 'empty';
  const keys = Object.keys(data).filter(k => !k.startsWith('_'));
  return `${keys.length} keys`;
}

/** Ordered market ids for a full wave: tab markets → priority deps → remainder. */
export function buildWaveMarketIds() {
  const primarySet = new Set(PRIMARY_MARKET_IDS);
  const depSet = new Set(PRIORITY_DEP_IDS);
  return [
    ...PRIMARY_MARKET_IDS,
    ...PRIORITY_DEP_IDS.filter((id) => !primarySet.has(id)),
    ...ALL_FETCH_IDS.filter((id) => !primarySet.has(id) && !depSet.has(id)),
  ];
}

/**
 * Build request path for a market. forceLive adds ?refresh=true (cache bypass).
 * Extra query params (e.g. watchlist tickers) merge in safely.
 */
export function buildMarketFetchPath(marketId, { forceLive = false, params = null } = {}) {
  let path = MARKET_ENDPOINTS[marketId];
  if (!path) return null;
  const q = new URLSearchParams();
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') q.set(k, String(v));
    }
  }
  if (forceLive || ALWAYS_FORCE_LIVE) q.set('refresh', 'true');
  const qs = q.toString();
  if (!qs) return path;
  return `${path}${path.includes('?') ? '&' : '?'}${qs}`;
}

/** True when client state already has usable panel data for this market. */
export function marketHasUsableData(marketEntry, marketId) {
  if (!marketEntry?.data) return false;
  return hasNonNullData(marketEntry.data, marketId);
}

async function fetchMarket(marketId, forceLive = false, params = null) {
  const path = buildMarketFetchPath(marketId, { forceLive, params });
  if (!path) {
    console.warn(`[DataProvider] ⚠ No endpoint for "${marketId}"`);
    return { marketId, data: null, ok: false, status: 0, duration: 0, error: `No endpoint for ${marketId}` };
  }
  const live = forceLive || ALWAYS_FORCE_LIVE;
  const url = apiUrl(path);
  const t0 = performance.now();
  try {
    dlog(`[DataProvider] → ${marketId} ${url}`);
    const r = await fetchWithRetry(url, {
      retries: FETCH_SETTINGS.retries,
      timeout: FETCH_SETTINGS.timeout,
      totalTimeout: FETCH_SETTINGS.totalTimeout,
      headers: live ? { 'X-Cache-Bypass': '1' } : undefined,
    });
    let data;
    try {
      data = await r.json();
    } catch (parseErr) {
      const dur = Math.round(performance.now() - t0);
      return {
        marketId,
        data: null,
        ok: false,
        status: r.status,
        duration: dur,
        error: `Invalid JSON: ${parseErr?.message || parseErr}`,
      };
    }
    const dur = Math.round(performance.now() - t0);
    const requestId = r.headers?.get?.('X-Request-Id') || r.headers?.get?.('x-request-id') || null;
    dlog(`[DataProvider] ✓ ${marketId} ${r.status} ${dur}ms — ${summarizeData(data)}`, data?._sources || '');
    logDataFetch(marketId, path, r.status, dur);
    if (data && typeof data === 'object') {
      logDataReceived(marketId, Object.keys(data).filter(k => !k.startsWith('_')));
    }
    return { marketId, data, ok: true, status: r.status, duration: dur, requestId };
  } catch (err) {
    const dur = Math.round(performance.now() - t0);
    const msg = `[DataProvider] ✗ ${marketId} failed (${dur}ms): ${err?.message || err}`;
    // Cold App Hosting waves often exceed totalTimeout for FRED-heavy tabs;
    // keep them as warn so the console is not filled with red noise when
    // later retries or disk/GCS cache succeed.
    if (['realEstate', 'insurance', 'globalMacro', 'bonds', 'credit', 'calendar'].includes(marketId)) {
      console.warn(msg);
    } else {
      console.error(msg);
    }
    logDataFetch(marketId, path, 0, dur);
    logError('fetchMarket', msg, err?.stack);
    return { marketId, data: null, ok: false, status: 0, duration: dur, error: err?.message || 'Fetch failed' };
  }
}

export function applyResult(prev, result) {
  const id = result.marketId;
  const prior = prev[id] || {};
  if (result.ok) {
    const d = result.data;
    const hasRealData = hasNonNullData(d, id);
    const structuralOk = hasRealData && passesStructuralGuard(id, d);
    // Keep any real payload so panels can render. Structural guard only
    // controls the "live/complete" badge — never blank the whole market.
    // CRITICAL: never replace a previously good payload with an empty one
    // (rate-limit degraded shells / sparse aux feeds used to wipe tabs).
    const keep = hasRealData;
    const preservePrior = !keep && prior.data != null;
    const ts = d?.lastUpdated || tsNow();
    const isCurrent = keep ? (d?.isCurrent != null ? !!d.isCurrent : !!d?.isLive) : !!prior.isCurrent;
    if (!hasRealData) {
      console.warn(
        preservePrior
          ? `[DataProvider] ⚠ ${id} empty response — keeping previous payload`
          : `[DataProvider] ⚠ ${id} returned data but hasNonNullData=false — treating as empty`
      );
    } else if (!structuralOk) {
      console.warn(`[DataProvider] ⚠ ${id} partial payload (structural guard soft-fail) — keeping data for panels`);
    }
    dlog(`[DataProvider] ✓ ${id} keep=${keep} preservePrior=${preservePrior} structuralOk=${structuralOk} fetchedOn=${d?.fetchedOn || 'n/a'}`);
    if (preservePrior) {
      // Keep publishing prior payload for panel-health bus
      try {
        const nextPrev = { ...prev, [id]: { ...prior, isLoading: false, isRefreshing: false } };
        publishMarketPayload(id, prior.data, nextPrev);
      } catch { /* ignore */ }
      return {
        ...prev,
        [id]: {
          ...prior,
          isLoading: false,
          isRefreshing: false,
          // Soft warning only — panels keep rendering prior data.
          error: null,
          fetchLog: [{
            time: tsNow(),
            url: MARKET_ENDPOINTS[id],
            status: result.status,
            duration: result.duration,
            requestId: result.requestId || null,
            warning: 'empty response — kept previous',
          }, ...(prior.fetchLog || [])].slice(0, 20),
        },
      };
    }
    const nextState = {
      ...prev,
      [id]: {
        data: keep ? d : null,
        isLoading: false,
        isRefreshing: false,
        isLive: structuralOk,
        // Prefer server lastUpdated, but always stamp client receive time so
        // a successful ▶ refresh visibly moves "as of" even when the day
        // bucket (fetchedOn) is unchanged.
        lastUpdated: keep ? (d?.lastUpdated || ts) : null,
        fetchedOn: keep ? (d?.fetchedOn || null) : null,
        receivedAt: keep ? tsNow() : prior.receivedAt || null,
        isCurrent,
        // Only hard-error when there is nothing usable for the UI.
        error: keep ? null : 'API returned empty data',
        fetchLog: [{
          time: tsNow(),
          url: MARKET_ENDPOINTS[id],
          status: result.status,
          duration: result.duration,
          requestId: result.requestId || null,
          sources: (keep && d?._sources) ? d._sources : null,
          ...(keep && !structuralOk ? { warning: 'partial structural coverage' } : {}),
          ...(!keep ? { warning: 'empty response' } : {}),
        }, ...(prior.fetchLog || [])].slice(0, 20),
        provenance: keep && d?._sources ? { sources: d._sources } : prior.provenance || {},
      },
    };
    if (keep && d) {
      try { publishMarketPayload(id, d, nextState); } catch { /* ignore */ }
    }
    return nextState;
  }

  const errMsg = `[DataProvider] ✗ ${id} fetch error: ${result.error}`;
  if (['realEstate', 'insurance', 'globalMacro'].includes(id)) {
    console.warn(errMsg);
  } else {
    console.error(errMsg);
  }
  // Preserve any previously good payload so a single failed refresh does not
  // blank the tab (splash would otherwise mark the market as failed).
  return {
    ...prev,
    [id]: {
      ...prior,
      isLoading: false,
      isRefreshing: false,
      error: prior.data ? null : result.error,
      fetchLog: [{
        time: tsNow(),
        url: MARKET_ENDPOINTS[id],
        status: 0,
        duration: result.duration,
        error: result.error,
        requestId: result.requestId || null,
      }, ...(prior.fetchLog || [])].slice(0, 20),
    },
  };
}

function maybeComputeFederated(prev, next) {
  for (const [fedId, config] of Object.entries(FEDERATED_MARKETS)) {
    const ready = config.endpoints.filter(ep => next[ep]?.data);
    const missing = config.endpoints.filter(ep => !next[ep]?.data);
    if (ready.length === 0) {
      dlog(`[DataProvider] ⏳ Federated "${fedId}" waiting for any of: [${missing.join(', ')}]`);
      continue;
    }
    const alertResult = computeAlerts(next, getDisabledRuleIds());
    const triggered = alertResult.alerts.length;
    const allReady = missing.length === 0;
    if (allReady) dlog(`[DataProvider] ✓ Federated "${fedId}" complete — ${triggered} alert(s) triggered`);
    else dlog(`[DataProvider] ◐ Federated "${fedId}" partial (${ready.length}/${config.endpoints.length}) — ${triggered} alert(s); still waiting on: [${missing.join(', ')}]`);
    let latestFetchedOn = null;
    for (const ep of config.endpoints) {
      const mkt = next[ep];
      if (mkt?.fetchedOn) {
        if (!latestFetchedOn || mkt.fetchedOn > latestFetchedOn) latestFetchedOn = mkt.fetchedOn;
      }
    }
    next[fedId] = {
      ...prev[fedId],
      data: { ...alertResult, _partial: !allReady, _missing: missing },
      isLoading: false,
      isLive: true,
      fetchedOn: latestFetchedOn,
      lastUpdated: tsNow(),
      fetchLog: [{
        time: tsNow(),
        url: `federated:${fedId}`,
        status: 200,
        duration: 0,
        partial: !allReady,
        missing,
      }, ...(prev[fedId]?.fetchLog || [])].slice(0, 20),
    };
    try {
      publishMarketPayload(fedId, next[fedId].data, next);
    } catch { /* ignore */ }
  }
  return next;
}

function persistToIDB(result) {
  if (!result?.ok || !result.data) return;
  putSnapshot({
    marketId: result.marketId,
    date: todayStr(),
    data: result.data,
    fetchedAt: result.data.lastUpdated || new Date().toISOString(),
  }).catch(() => {});
}

export function DataProvider({ children, refreshKey = 0 }) {
  const [markets, setMarkets] = useState(createInitialMarketState);
  const [globalLoading, setGlobalLoading] = useState(false);
  // True only while a user-facing force-live wave is running (top-bar ▶).
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [historicalDate, setHistoricalDate] = useState(null);
  const mountedRef = useRef(true);
  /** @type {React.MutableRefObject<Promise<void> | null>} */
  const fetchPromiseRef = useRef(null);
  /** coalesce concurrent topbar ▶ / wave callers onto force-live when any asked */
  const pendingForceLiveRef = useRef(false);
  const fetchGenerationRef = useRef(0);
  const marketsRef = useRef(markets);
  const historicalDateRef = useRef(historicalDate);
  /** @type {React.MutableRefObject<Map<string, Promise<void>>>} */
  const singleInFlightRef = useRef(new Map());
  /** @type {React.MutableRefObject<Map<string, number>>} */
  const singleGenRef = useRef(new Map());

  useEffect(() => { marketsRef.current = markets; }, [markets]);
  useEffect(() => { historicalDateRef.current = historicalDate; }, [historicalDate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const clearSoftRefreshFlags = useCallback(() => {
    setMarkets(prev => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id]?.isRefreshing || next[id]?.isLoading) {
          // Only clear soft-refresh on force-live waves; keep true loading
          // only if we never got data. Safer: clear isRefreshing always,
          // clear isLoading only when data already present.
          const m = next[id];
          if (m.isRefreshing || (m.isLoading && m.data)) {
            next[id] = { ...m, isRefreshing: false, isLoading: m.data ? false : m.isLoading };
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const runWave = useCallback(async (waveForceLive) => {
    const ids = buildWaveMarketIds();
    const effectiveDate = historicalDateRef.current;
    const fetchGeneration = fetchGenerationRef.current;
    // Cache-first: more parallelism (cheap disk hits). Force-live: throttle for FRED.
    const concurrency = waveForceLive
      ? FETCH_SETTINGS.batchConcurrency
      : Math.max(FETCH_SETTINGS.batchConcurrency, 12);
    const batchDelay = waveForceLive ? FETCH_SETTINGS.batchDelayMs : 50;
    const forceLive = !!waveForceLive;

    setGlobalLoading(true);
    if (forceLive) setIsRefreshing(true);

    const stale = () => (
      !mountedRef.current
      || fetchGeneration !== fetchGenerationRef.current
      || effectiveDate !== historicalDateRef.current
    );

    try {
      // Optional RTDB seed (historical date, or VITE_USE_RTDB_SEED demos).
      let seededIds = new Set();
      if ((USE_RTDB_SEED || effectiveDate) && !forceLive) {
        const rtdbSeeds = await Promise.all(
          ids.map(async (id) => {
            const seed = await loadFromRTDB(id, effectiveDate);
            return seed ? { id, seed } : null;
          })
        );

        if (stale()) {
          dlog('[DataProvider] Discarding stale wave (pre-RTDB apply).');
          return;
        }

        seededIds = new Set(
          rtdbSeeds.filter(Boolean).filter(s => {
            if (!hasNonNullData(s.seed.data, s.id)) return false;
            if (!passesStructuralGuard(s.id, s.seed.data)) return false;
            if (needsLiveRepair(s.id, s.seed.data)) return false;
            return true;
          }).map(s => s.id)
        );

        setMarkets(prev => {
          const next = { ...prev };
          for (const item of rtdbSeeds) {
            if (item && MARKET_ENDPOINTS[item.id] && seededIds.has(item.id)) {
              const { seed } = item;
              next[item.id] = {
                ...next[item.id],
                data: seed.data || next[item.id]?.data,
                lastUpdated: seed.fetchedAt || next[item.id]?.lastUpdated,
                fetchedOn: seed.fetchedAt || next[item.id]?.fetchedOn,
                isLive: seed.isLive ?? next[item.id]?.isLive,
                isCurrent: !effectiveDate,
                isHistorical: !!effectiveDate,
                asOfDate: effectiveDate || null,
                isLoading: false,
                isRefreshing: false,
                error: null,
                fetchLog: [{
                  time: seed.fetchedAt || tsNow(),
                  url: `${MARKET_ENDPOINTS[item.id]} (RTDB Snapshot)`,
                  status: 200,
                  duration: 0,
                  requestId: 'RTDB',
                  sources: seed.data?._sources || null,
                }, ...(next[item.id]?.fetchLog || [])].slice(0, 20),
              };
            }
          }
          return maybeComputeFederated(prev, next);
        });

        if (effectiveDate) {
          dlog(`[DataProvider] Historical mode for ${effectiveDate} — RTDB only.`);
          setMarkets(prev => {
            const next = { ...prev };
            for (const id of ids) {
              if (!next[id]) continue;
              const hasSeed = seededIds.has(id);
              next[id] = {
                ...next[id],
                data: hasSeed ? next[id].data : null,
                isLoading: false,
                isRefreshing: false,
                isHistorical: true,
                asOfDate: effectiveDate,
                error: hasSeed ? null : `No historical snapshot for ${effectiveDate}`,
              };
            }
            return maybeComputeFederated(prev, next);
          });
          return;
        }
      }

      const liveIds = (forceLive || !USE_RTDB_SEED)
        ? ids.filter(id => MARKET_ENDPOINTS[id])
        : ids.filter(id => MARKET_ENDPOINTS[id] && !seededIds.has(id));

      // Empty → skeleton. Force-live with prior data → soft isRefreshing (keep panels painted).
      setMarkets(prev => {
        const next = { ...prev };
        for (const id of liveIds) {
          if (!next[id]?.data) {
            next[id] = { ...next[id], isLoading: true, isRefreshing: !!forceLive, error: null };
          } else if (forceLive) {
            next[id] = { ...next[id], isRefreshing: true, error: null };
          }
        }
        return next;
      });

      dlog(`[DataProvider] Wave start: ${liveIds.length} markets forceLive=${forceLive} concurrency=${concurrency}`);

      for (let i = 0; i < liveIds.length; i += concurrency) {
        if (stale()) {
          dlog('[DataProvider] Discarding stale live wave mid-batch.');
          return;
        }
        const batch = liveIds.slice(i, i + concurrency);
        if (i > 0) await new Promise(r => setTimeout(r, batchDelay));

        dlog(`[DataProvider] Batch ${Math.floor(i / concurrency) + 1}: [${batch.join(', ')}]`);
        // fetchMarket never throws — always returns a result object.
        const results = await Promise.all(batch.map(id => fetchMarket(id, forceLive)));

        if (stale()) {
          dlog('[DataProvider] Discarding stale live wave post-batch.');
          return;
        }

        setMarkets(prev => {
          let next = { ...prev };
          for (const result of results) {
            next = applyResult(next, result);
          }
          for (const id of batch) {
            if (next[id]) {
              next[id] = { ...next[id], isLoading: false, isRefreshing: false };
            }
          }
          return maybeComputeFederated(prev, next);
        });

        for (const result of results) {
          if (result.ok && hasNonNullData(result.data, result.marketId)) {
            persistToIDB(result);
          }
        }
      }

      // One reliability pass: primary tabs that still have no usable client data.
      // Cache-first then force-live once. Never re-hit markets that already painted.
      if (!effectiveDate && !stale()) {
        const failedPrimary = PRIMARY_MARKET_IDS.filter(id => {
          if (!MARKET_ENDPOINTS[id]) return false;
          return !marketHasUsableData(marketsRef.current[id], id);
        });
        if (failedPrimary.length) {
          dlog(`[DataProvider] Empty-primary retry: [${failedPrimary.join(', ')}]`);
          for (const id of failedPrimary) {
            if (stale()) break;
            await new Promise(r => setTimeout(r, 400));
            let res = await fetchMarket(id, false);
            if (!res.ok || !hasNonNullData(res.data, id)) {
              res = await fetchMarket(id, true);
            }
            if (stale()) break;
            setMarkets(prev => maybeComputeFederated(prev, applyResult(prev, res)));
            if (res.ok && hasNonNullData(res.data, id)) persistToIDB(res);
          }
        }
      }

      dlog('[DataProvider] ✅ Wave complete');
    } catch (err) {
      console.error('[DataProvider] runWave failed:', err);
    } finally {
      setGlobalLoading(false);
      if (forceLive) setIsRefreshing(false);
      clearSoftRefreshFlags();
    }
  }, [clearSoftRefreshFlags]);

  /**
   * Full multi-market wave.
   * @param {boolean} forceLive — true for topbar ▶; false for app-load cache-first
   *
   * Mutex: one runner at a time. Concurrent callers wait. Any forceLive request
   * during a wave sets pendingForceLive; the runner drains it (may run a second
   * force-live wave). Waiters that only needed the drained force-live return.
   */
  const fetchAllMarkets = useCallback(async (forceLive = false) => {
    if (forceLive) pendingForceLiveRef.current = true;

    // Join any in-flight runner (it drains pendingForceLive).
    while (fetchPromiseRef.current) {
      dlog('[DataProvider] Wave in progress — waiting (forceLive=', !!forceLive, ')');
      await fetchPromiseRef.current;
      // Runner finished. If force-live was fully handled, stop.
      // If a new force-live arrived after the runner exited, loop or become runner.
      if (!pendingForceLiveRef.current) return;
    }

    // Become the sole runner.
    let resolveFetch = () => {};
    const myPromise = new Promise((r) => { resolveFetch = r; });
    fetchPromiseRef.current = myPromise;

    try {
      // First iteration: pending true if forceLive was requested (or coalesced).
      // Cache-first load with no pending → runWave(false).
      do {
        const live = pendingForceLiveRef.current;
        pendingForceLiveRef.current = false;
        await runWave(live);
      } while (pendingForceLiveRef.current && mountedRef.current);
    } finally {
      fetchPromiseRef.current = null;
      setGlobalLoading(false);
      setIsRefreshing(false);
      resolveFetch();
    }
  }, [runWave]);

  const applySnapshotMode = useCallback(async (date = null) => {
    if (!date) {
      setMarkets(prev => {
        const next = { ...prev };
        for (const id of ALL_FETCH_IDS) {
          if (next[id]) next[id] = { ...next[id], isHistorical: false, asOfDate: null };
        }
        return next;
      });
      return;
    }

    setGlobalLoading(true);
    const modeGeneration = fetchGenerationRef.current;
    const rtdbSeeds = await Promise.all(
      ALL_FETCH_IDS.map(async (id) => {
        const seed = await loadFromRTDB(id, date);
        return seed ? { id, seed } : null;
      })
    );

    if (modeGeneration !== fetchGenerationRef.current || date !== historicalDateRef.current) return;

    const seededIds = new Set(
      rtdbSeeds.filter(Boolean).filter(s => {
        if (!hasNonNullData(s.seed.data, s.id)) return false;
        return passesStructuralGuard(s.id, s.seed.data);
      }).map(s => s.id)
    );

    setMarkets(prev => {
      const next = { ...prev };
      for (const id of ALL_FETCH_IDS) {
        if (!next[id]) continue;
        const item = rtdbSeeds.find(s => s?.id === id);
        const hasSeed = item && seededIds.has(id);
        if (hasSeed) {
          const { seed } = item;
          const fetchedAt = seed.fetchedAt || seed.data?.fetchedOn || seed.data?.lastUpdated || tsNow();
          next[id] = {
            ...next[id],
            data: seed.data,
            isLoading: false,
            isLive: false,
            isCurrent: false,
            isHistorical: true,
            asOfDate: date,
            lastUpdated: fetchedAt,
            fetchedOn: fetchedAt,
            error: null,
            fetchLog: [{
              time: fetchedAt,
              url: `${MARKET_ENDPOINTS[id]} (RTDB Snapshot)`,
              status: 200,
              duration: 0,
              requestId: 'RTDB',
              sources: seed.data?._sources || null,
            }, ...(next[id]?.fetchLog || [])].slice(0, 20),
          };
        } else {
          next[id] = {
            ...next[id],
            data: null,
            isLoading: false,
            isLive: false,
            isCurrent: false,
            isHistorical: true,
            asOfDate: date,
            lastUpdated: null,
            fetchedOn: null,
            error: `No historical snapshot for ${date}`,
          };
        }
      }
      return next;
    });
    setGlobalLoading(false);
  }, []);

  const refetchAll = useCallback(() => fetchAllMarkets(true), [fetchAllMarkets]);
  const refetchLatestSnapshots = useCallback(() => fetchAllMarkets(true), [fetchAllMarkets]);

  /**
   * Panel ▶ / single market refresh. Always force-live in live mode.
   * Serializes concurrent calls per marketId (last request wins for apply).
   */
  const refetchSingle = useCallback(async (marketId, params = null) => {
    if (!marketId) return;

    if (FEDERATED_MARKETS[marketId]) {
      if (marketId === 'alerts') {
        const alertResult = computeAlerts(marketsRef.current, getDisabledRuleIds());
        setMarkets(prev => ({
          ...prev,
          [marketId]: {
            ...prev[marketId],
            data: alertResult,
            isLoading: false,
            isRefreshing: false,
            isLive: true,
            lastUpdated: tsNow(),
            fetchLog: [{ time: tsNow(), url: 'federated:alerts', status: 200, duration: 0 }, ...(prev[marketId]?.fetchLog || [])].slice(0, 20),
          },
        }));
      }
      return;
    }

    if (!MARKET_ENDPOINTS[marketId]) {
      setMarkets(prev => ({
        ...prev,
        [marketId]: {
          ...(prev[marketId] || {}),
          isLoading: false,
          isRefreshing: false,
          error: `No endpoint for ${marketId}`,
        },
      }));
      return;
    }

    // Coalesce: wait for in-flight same-market fetch, then run once more if needed.
    const existing = singleInFlightRef.current.get(marketId);
    if (existing) {
      await existing;
      // Another call may have completed; still honor this caller's intent with one more fetch.
    }

    const gen = (singleGenRef.current.get(marketId) || 0) + 1;
    singleGenRef.current.set(marketId, gen);

    let resolveSingle = () => {};
    const myPromise = new Promise((r) => { resolveSingle = r; });
    singleInFlightRef.current.set(marketId, myPromise);

    const isCurrentGen = () => singleGenRef.current.get(marketId) === gen;

    try {
      if (historicalDateRef.current) {
        const seed = await loadFromRTDB(marketId, historicalDateRef.current);
        if (!isCurrentGen() || !mountedRef.current) return;
        setMarkets(prev => {
          if (seed && hasNonNullData(seed.data, marketId) && passesStructuralGuard(marketId, seed.data)) {
            return applyResult(prev, {
              marketId,
              data: seed.data,
              ok: true,
              status: 200,
              duration: 0,
              requestId: 'RTDB',
            });
          }
          return {
            ...prev,
            [marketId]: {
              ...prev[marketId],
              isLoading: false,
              isRefreshing: false,
              error: 'No RTDB snapshot available',
            },
          };
        });
        return;
      }

      setMarkets(prev => ({
        ...prev,
        [marketId]: {
          ...prev[marketId],
          // Soft refresh: keep painted data when we already have some.
          isLoading: !prev[marketId]?.data,
          isRefreshing: true,
          error: null,
        },
      }));

      // Panel ▶ always force-live (bypass server day-cache).
      const result = await fetchMarket(marketId, true, params);
      if (!isCurrentGen() || !mountedRef.current) return;

      setMarkets(prev => maybeComputeFederated(prev, applyResult(prev, result)));
      if (result.ok && hasNonNullData(result.data, marketId)) {
        persistToIDB(result);
      }
    } catch (err) {
      if (!isCurrentGen() || !mountedRef.current) return;
      setMarkets(prev => applyResult(prev, {
        marketId,
        data: null,
        ok: false,
        status: 0,
        duration: 0,
        error: err?.message || 'Fetch failed',
      }));
    } finally {
      if (isCurrentGen()) {
        setMarkets(prev => ({
          ...prev,
          [marketId]: prev[marketId]
            ? { ...prev[marketId], isLoading: false, isRefreshing: false }
            : prev[marketId],
        }));
      }
      if (singleInFlightRef.current.get(marketId) === myPromise) {
        singleInFlightRef.current.delete(marketId);
      }
      resolveSingle();
    }
  }, []);

  const didInitialFetchRef = useRef(false);
  const didObserveHistoricalDateRef = useRef(false);

  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    // One load wave only. Cache-first by default (server disk/GCS for today).
    // User mass-refresh = topbar ▶ → fetchAllMarkets(true).
    fetchAllMarkets(ALWAYS_FORCE_LIVE);
  }, [fetchAllMarkets]);

  useEffect(() => {
    if (!didObserveHistoricalDateRef.current) {
      didObserveHistoricalDateRef.current = true;
      return;
    }
    fetchGenerationRef.current += 1;
    pendingForceLiveRef.current = false;
    if (historicalDate) {
      applySnapshotMode(historicalDate);
    } else {
      applySnapshotMode(null);
      // Leaving history mode: re-run the same one-shot load pipeline (cache-first).
      fetchAllMarkets(ALWAYS_FORCE_LIVE);
    }
  }, [historicalDate, fetchAllMarkets, applySnapshotMode]);

  useEffect(() => {
    if (refreshKey > 0) fetchAllMarkets(true);
  }, [refreshKey, fetchAllMarkets]);

  const saveTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSnapshot(markets), 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [markets]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const slim = {};
        let entryCount = 0;
        for (const [id, m] of Object.entries(marketsRef.current)) {
          if (m?.data && entryCount < 50) {
            slim[id] = {
              data: m.data,
              lastUpdated: m.lastUpdated,
              fetchedOn: m.fetchedOn,
              isLive: m.isLive,
              isCurrent: m.isCurrent,
              provenance: m.provenance,
            };
            entryCount++;
          }
        }
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
      } catch { /* ignore quota */ }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const marketWrappersRef = useRef({});
  const getMarket = useCallback((marketId) => {
    const m = markets[marketId];
    const prevWrapper = marketWrappersRef.current[marketId];
    if (
      prevWrapper &&
      prevWrapper._rawMarket === m &&
      prevWrapper._historicalDate === historicalDate
    ) {
      return prevWrapper;
    }

    const base = !m
      ? {
          data: null,
          isLoading: false,
          isLive: false,
          lastUpdated: null,
          fetchedOn: null,
          isCurrent: false,
          isHistorical: !!historicalDate,
          asOfDate: historicalDate,
          error: null,
          fetchLog: [],
          refetch: (params) => refetchSingle(marketId, params),
          provenance: {},
        }
      : { ...m, refetch: (params) => refetchSingle(marketId, params) };

    if (historicalDate) {
      base.isHistorical = base.isHistorical ?? true;
      base.asOfDate = base.asOfDate || historicalDate;
    } else {
      base.isHistorical = base.isHistorical ?? false;
      base.asOfDate = base.asOfDate || null;
    }

    base._rawMarket = m;
    base._historicalDate = historicalDate;
    marketWrappersRef.current[marketId] = base;
    return base;
  }, [markets, refetchSingle, historicalDate]);

  const loadHistorical = useCallback(async (date) => {
    if (!date) return null;
    const histSeeds = await Promise.all(
      ALL_FETCH_IDS.map(async (id) => {
        const seed = await loadFromRTDB(id, date);
        return seed ? { id, seed } : null;
      })
    );
    const hist = {};
    for (const item of histSeeds) {
      if (item) hist[item.id] = item.seed;
    }
    return hist;
  }, []);

  const auditFreshness = useCallback(() => computeFreshnessReport(markets, new Date()), [markets]);

  const value = React.useMemo(() => ({
    markets,
    globalLoading,
    isRefreshing,
    getMarket,
    refetchAll,
    refetchLatestSnapshots,
    refetchSingle,
    auditFreshness,
    loadHistorical,
    listSnapshotDates,
    historicalDate,
    setHistoricalDate,
    isHistorical: !!historicalDate,
    asOfDate: historicalDate,
  }), [
    markets,
    globalLoading,
    isRefreshing,
    getMarket,
    refetchAll,
    refetchLatestSnapshots,
    refetchSingle,
    auditFreshness,
    loadHistorical,
    historicalDate,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
