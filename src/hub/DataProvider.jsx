import React, { useState, useCallback, useRef, useEffect } from 'react';
import DataContext from './DataContext';
import { useInterval } from '../hooks/useInterval';
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

// Cache-first by default: serve today's server disk cache (fetchedOn=today)
// so panels paint with 7/23 data immediately. Live upstream refresh is used
// for user refresh, auto-refresh, and optional VITE_FORCE_LIVE=true.
// Forcing live on every load stampedes FRED and leaves panels on stale snaps.
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

async function fetchMarket(marketId, forceLive = false) {
  let path = MARKET_ENDPOINTS[marketId];
  if (!path) {
    console.warn(`[DataProvider] ⚠ No endpoint for "${marketId}"`);
    return { marketId, data: null, ok: false, status: 0, duration: 0, error: `No endpoint for ${marketId}` };
  }
  const live = forceLive || ALWAYS_FORCE_LIVE;
  if (live) {
    path = `${path}${path.includes('?') ? '&' : '?'}refresh=true`;
  }
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
    const data = await r.json();
    const dur = Math.round(performance.now() - t0);
    const requestId = r.headers?.get?.('X-Request-Id') || r.headers?.get?.('x-request-id') || null;
    dlog(`[DataProvider] ✓ ${marketId} ${r.status} ${dur}ms — ${summarizeData(data)}`, data._sources || '');
    logDataFetch(marketId, path, r.status, dur);
    logDataReceived(marketId, Object.keys(data).filter(k => !k.startsWith('_')));
    return { marketId, data, ok: true, status: r.status, duration: dur, requestId };
  } catch (err) {
    const dur = Math.round(performance.now() - t0);
    const msg = `[DataProvider] ✗ ${marketId} failed (${dur}ms): ${err?.message || err}`;
    if (['realEstate', 'insurance', 'globalMacro'].includes(marketId)) {
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

export function DataProvider({ children, autoRefresh = false, refreshKey = 0 }) {
  const [markets, setMarkets] = useState(createInitialMarketState);
  const [globalLoading, setGlobalLoading] = useState(false);
  // True only while a user-facing force-live wave is running (top-bar ▶).
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [historicalDate, setHistoricalDate] = useState(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  /** @type {React.MutableRefObject<Promise<void> | null>} */
  const fetchPromiseRef = useRef(null);
  /** coalesce concurrent callers onto one forceLive flag */
  const pendingForceLiveRef = useRef(false);
  const fetchGenerationRef = useRef(0);
  const marketsRef = useRef(markets);
  const historicalDateRef = useRef(historicalDate);

  useEffect(() => { marketsRef.current = markets; }, [markets]);
  useEffect(() => { historicalDateRef.current = historicalDate; }, [historicalDate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAllMarkets = useCallback(async (forceLive = true) => {
    // Coalesce force-live requests so a click during a cache-first wave still
    // schedules an upstream refresh, and awaiters wait for real completion.
    if (forceLive) pendingForceLiveRef.current = true;

    if (fetchingRef.current && fetchPromiseRef.current) {
      dlog('[DataProvider] Fetch in progress — waiting (forceLive=', !!forceLive, ')');
      await fetchPromiseRef.current;
      // Runner drains pendingForceLive; if another click arrived after it
      // finished but before we resumed, start a new chain below.
      if (!pendingForceLiveRef.current) return;
    }

    if (fetchingRef.current && fetchPromiseRef.current) {
      await fetchPromiseRef.current;
      return;
    }

    fetchingRef.current = true;
    let resolveFetch = () => {};
    fetchPromiseRef.current = new Promise((r) => { resolveFetch = r; });

    const runWave = async (waveForceLive) => {
    // Tab markets first, then priority cross-deps (TIC/ECB/CFTC…), then the rest.
    const primarySet = new Set(PRIMARY_MARKET_IDS);
    const depSet = new Set(PRIORITY_DEP_IDS);
    const ids = [
      ...PRIMARY_MARKET_IDS,
      ...PRIORITY_DEP_IDS.filter((id) => !primarySet.has(id)),
      ...ALL_FETCH_IDS.filter((id) => !primarySet.has(id) && !depSet.has(id)),
    ];
    const effectiveDate = historicalDateRef.current;
    const fetchGeneration = fetchGenerationRef.current;
    // Cache-first waves are cheap — fetch more in parallel so panels fill fast.
    const concurrency = waveForceLive ? FETCH_SETTINGS.batchConcurrency : Math.max(FETCH_SETTINGS.batchConcurrency, 12);
    const batchDelay = waveForceLive ? FETCH_SETTINGS.batchDelayMs : 50;
    const forceLive = waveForceLive;

    setGlobalLoading(true);
    if (forceLive) setIsRefreshing(true);

    try {

    // Optional RTDB seed (disabled in local-first mode). Historical dates still soft-try RTDB.
    let seededIds = new Set();
    if ((USE_RTDB_SEED || effectiveDate) && !forceLive) {
      const rtdbSeeds = await Promise.all(
        ids.map(async (id) => {
          const seed = await loadFromRTDB(id, effectiveDate);
          return seed ? { id, seed } : null;
        })
      );

      if (fetchGeneration !== fetchGenerationRef.current || effectiveDate !== historicalDateRef.current) {
        dlog('[DataProvider] Discarding stale fetch wave before applying RTDB seeds.');
        return; // finally: completeFetch
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
        dlog(`[DataProvider] Historical mode for ${effectiveDate} — RTDB snapshots only.`);
        setMarkets(prev => {
          const next = { ...prev };
          for (const id of ids) {
            if (!next[id]) continue;
            const hasSeed = seededIds.has(id);
            next[id] = {
              ...next[id],
              data: hasSeed ? next[id].data : null,
              isLoading: false,
              isHistorical: true,
              asOfDate: effectiveDate,
              error: hasSeed ? null : `No historical snapshot for ${effectiveDate}`,
            };
          }
          return maybeComputeFederated(prev, next);
        });
        return; // finally: completeFetch
      }
    }

    // Live local API wave
    const liveIds = forceLive || !USE_RTDB_SEED
      ? ids
      : ids.filter(id => !seededIds.has(id));

    // Empty markets: show skeleton. Force-live (▶ refresh): soft-refresh flag
    // so footers can show "refreshing" without blanking existing panel data.
    setMarkets(prev => {
      const next = { ...prev };
      for (const id of liveIds) {
        if (!MARKET_ENDPOINTS[id]) continue;
        if (!next[id]?.data) {
          next[id] = { ...next[id], isLoading: true, isRefreshing: !!forceLive, error: null };
        } else if (forceLive) {
          next[id] = { ...next[id], isRefreshing: true, error: null };
        }
      }
      return next;
    });

    dlog(`[DataProvider] Fetching ${liveIds.length} markets (forceLive=${!!forceLive}) concurrency=${concurrency}…`);

    // Track which ids still lack usable data after the first wave (for retry).
    const stillEmpty = new Set(liveIds);

    for (let i = 0; i < liveIds.length; i += concurrency) {
      const batch = liveIds.slice(i, i + concurrency);
      if (i > 0) await new Promise(r => setTimeout(r, batchDelay));

      dlog(`[DataProvider] Batch ${Math.floor(i / concurrency) + 1}: [${batch.join(', ')}]`);
      const results = await Promise.allSettled(batch.map(id => fetchMarket(id, forceLive)));

      if (!mountedRef.current) return;
      if (fetchGeneration !== fetchGenerationRef.current || effectiveDate !== historicalDateRef.current) {
        dlog('[DataProvider] Discarding stale live fetch wave.');
        return;
      }

      try {
        setMarkets(prev => {
          let next = { ...prev };
          for (const settled of results) {
            if (settled.status === 'fulfilled') {
              next = applyResult(next, settled.value);
            } else {
              const mid = settled.reason?.marketId;
              if (mid && next[mid]) {
                next[mid] = {
                  ...next[mid],
                  isLoading: false,
                  isRefreshing: false,
                  error: next[mid].data ? null : (settled.reason?.message || 'Fetch failed'),
                };
              }
            }
          }
          // Clear loading/refreshing for this batch
          for (const id of batch) {
            if (next[id] && (next[id].isLoading || next[id].isRefreshing)) {
              next[id] = { ...next[id], isLoading: false, isRefreshing: false };
            }
          }
          return maybeComputeFederated(prev, next);
        });
      } catch (err) {
        console.error('[DataProvider] setMarkets error:', err);
      }

      for (const settled of results) {
        if (settled.status === 'fulfilled') {
          persistToIDB(settled.value);
          const mid = settled.value.marketId;
          if (settled.value.ok && hasNonNullData(settled.value.data, mid)) stillEmpty.delete(mid);
          // Also clear when we got HTTP 200 with any object — panels need the attempt recorded
          else if (settled.value.ok && settled.value.data && typeof settled.value.data === 'object') {
            // applyResult may have preserved prior; stillEmpty only for no prior either
          }
        }
      }
    }

    // Second pass: re-fetch primary tab markets that still have no data.
    // Concurrent first-wave bursts often hit FRED/Yahoo timeouts; a short
    // staggered retry recovers most of them without blanking the splash.
    if (!effectiveDate) {
      const failedPrimary = PRIMARY_MARKET_IDS.filter(id => stillEmpty.has(id) && MARKET_ENDPOINTS[id]);
      if (failedPrimary.length) {
        dlog(`[DataProvider] Retrying ${failedPrimary.length} primary markets without data: [${failedPrimary.join(', ')}]`);
        for (const id of failedPrimary) {
          if (!mountedRef.current) break;
          if (fetchGeneration !== fetchGenerationRef.current) break;
          await new Promise(r => setTimeout(r, 400));
          try {
            // Retry without force first (today's cache), then force live once.
            let res = await fetchMarket(id, false);
            if (!res.ok || !hasNonNullData(res.data, id)) {
              res = await fetchMarket(id, true);
            }
            if (!mountedRef.current) break;
            setMarkets(prev => maybeComputeFederated(prev, applyResult(prev, res)));
            if (res.ok && hasNonNullData(res.data, id)) stillEmpty.delete(id);
            if (res.ok) persistToIDB(res);
          } catch (e) {
            console.warn(`[DataProvider] retry ${id} failed:`, e?.message || e);
          }
        }
      }
    }

    dlog('[DataProvider] ✅ All live fetches complete');

    // Stale-while-revalidate: after a cache-first wave, quietly refresh
    // primary tab markets one-by-one so we don't stampede FRED (120/min).
    if (!forceLive && !effectiveDate && mountedRef.current) {
      const gen = fetchGeneration;
      setTimeout(async () => {
        if (!mountedRef.current || gen !== fetchGenerationRef.current) return;
        dlog(`[DataProvider] Background revalidate: ${PRIMARY_MARKET_IDS.length} primary markets`);
        for (const id of PRIMARY_MARKET_IDS) {
          if (!mountedRef.current || gen !== fetchGenerationRef.current) break;
          if (!MARKET_ENDPOINTS[id]) continue;
          try {
            const res = await fetchMarket(id, true);
            if (!mountedRef.current || gen !== fetchGenerationRef.current) break;
            // applyResult preserves prior data if the live body is empty
            if (res.ok) {
              setMarkets(prev => maybeComputeFederated(prev, applyResult(prev, res)));
              if (hasNonNullData(res.data, id)) persistToIDB(res);
            }
          } catch (e) {
            console.warn(`[DataProvider] bg revalidate ${id}:`, e?.message || e);
          }
          await new Promise(r => setTimeout(r, 2000));
        }
      }, 1500);
    }

    } catch (err) {
      console.error('[DataProvider] fetchAllMarkets failed:', err);
    } finally {
      setGlobalLoading(false);
      if (forceLive) setIsRefreshing(false);
      // Clear any leftover soft-refresh flags if a wave was aborted mid-batch
      setMarkets(prev => {
        let changed = false;
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          if (next[id]?.isRefreshing) {
            next[id] = { ...next[id], isRefreshing: false, isLoading: false };
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
    }; // end runWave

    try {
      // Drain coalesced force-live clicks. First pass uses pending flag
      // (set above when forceLive=true) or runs a cache-first wave when idle.
      do {
        const live = pendingForceLiveRef.current;
        pendingForceLiveRef.current = false;
        // If nothing pending and this is the first call with forceLive=false
        // (initial load), live is false → cache-first. If user clicked refresh,
        // pending was true → live true.
        await runWave(live);
      } while (pendingForceLiveRef.current && mountedRef.current);
    } finally {
      fetchingRef.current = false;
      const done = resolveFetch;
      fetchPromiseRef.current = null;
      setGlobalLoading(false);
      setIsRefreshing(false);
      done();
    }
  }, []);

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

  const refetchSingle = useCallback(async (marketId, params = null) => {
    if (FEDERATED_MARKETS[marketId]) {
      if (marketId === 'alerts') {
        const alertResult = computeAlerts(marketsRef.current, getDisabledRuleIds());
        setMarkets(prev => ({
          ...prev,
          [marketId]: {
            ...prev[marketId],
            data: alertResult,
            isLoading: false,
            isLive: true,
            lastUpdated: tsNow(),
            fetchLog: [{ time: tsNow(), url: 'federated:alerts', status: 200, duration: 0 }, ...(prev[marketId]?.fetchLog || [])].slice(0, 20),
          },
        }));
      }
      return;
    }

    if (historicalDateRef.current) {
      const seed = await loadFromRTDB(marketId, historicalDateRef.current);
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
          [marketId]: { ...prev[marketId], isLoading: false, error: 'No RTDB snapshot available' },
        };
      });
      return;
    }

    setMarkets(prev => ({
      ...prev,
      [marketId]: { ...prev[marketId], isLoading: true, error: null },
    }));

    let path = MARKET_ENDPOINTS[marketId];
    if (!path) {
      setMarkets(prev => ({
        ...prev,
        [marketId]: { ...prev[marketId], isLoading: false, error: `No endpoint for ${marketId}` },
      }));
      return;
    }
    if (params) {
      const query = new URLSearchParams(params).toString();
      path = `${path}?${query}`;
    } else {
      path = `${path}${path.includes('?') ? '&' : '?'}refresh=true`;
    }

    const t0 = performance.now();
    try {
      const r = await fetchWithRetry(apiUrl(path), {
        retries: FETCH_SETTINGS.retries,
        timeout: FETCH_SETTINGS.timeout,
        totalTimeout: FETCH_SETTINGS.totalTimeout,
      });
      const data = await r.json();
      const result = {
        marketId,
        data,
        ok: true,
        status: r.status,
        duration: Math.round(performance.now() - t0),
        requestId: r.headers?.get?.('X-Request-Id') || null,
      };
      setMarkets(prev => maybeComputeFederated(prev, applyResult(prev, result)));
      persistToIDB(result);
    } catch (err) {
      setMarkets(prev => applyResult(prev, {
        marketId,
        data: null,
        ok: false,
        status: 0,
        duration: Math.round(performance.now() - t0),
        error: err?.message || 'Fetch failed',
      }));
    }
  }, []);

  const didInitialFetchRef = useRef(false);
  const didObserveHistoricalDateRef = useRef(false);

  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    // Cache-first: hit /api without ?refresh so today's daily_file is served
    // immediately (fetchedOn = today). Background revalidate upgrades to live.
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
      fetchAllMarkets(true);
    }
  }, [historicalDate, fetchAllMarkets, applySnapshotMode]);

  useEffect(() => {
    if (refreshKey > 0) fetchAllMarkets(true);
  }, [refreshKey, fetchAllMarkets]);

  // Auto-refresh every 2 minutes when enabled (was 5 min) so "latest" stays fresher.
  useInterval(refetchAll, autoRefresh ? 120000 : null);

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
