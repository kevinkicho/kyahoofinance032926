import React, { useState, useCallback, useRef, useEffect } from 'react';
import DataContext from './DataContext';
import { useInterval } from '../hooks/useInterval';
import { fetchWithRetry } from '../utils/fetchWithRetry';

const SERVER = '';

const FETCH_TIMEOUT = 30000;
const FETCH_RETRIES = 1;
const BATCH_CONCURRENCY = 4;
const BATCH_DELAY_MS = 300;

function tsNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const MARKET_ENDPOINTS = {
  bonds:             '/api/bonds',
  fx:                '/api/fx',
  derivatives:       '/api/derivatives',
  realEstate:        '/api/realEstate',
  insurance:         '/api/insurance',
  commodities:       '/api/commodities/v2',
  globalMacro:       '/api/globalMacro',
  equitiesDeepDive:  '/api/equityDeepDive',
  institutional:     '/api/institutional',
  crypto:            '/api/crypto',
  credit:            '/api/credit',
  sentiment:         '/api/sentiment',
  calendar:          '/api/calendar',
  imf:               '/api/imf',
  worldbank:         '/api/worldbank',
  bls:               '/api/bls',
};

const ALL_FETCH_IDS = Object.keys(MARKET_ENDPOINTS);

const FEDERATED_MARKETS = {
  alerts: { endpoints: ['sentiment', 'bonds', 'credit', 'crypto', 'commodities', 'fx'] },
};

function createInitialMarketState() {
  const state = {};
  const allIds = [...ALL_FETCH_IDS, ...Object.keys(FEDERATED_MARKETS), 'equities', 'watchlist', 'analytics'];
  for (const id of allIds) {
    state[id] = { data: null, isLoading: false, isLive: false, lastUpdated: null, fetchedOn: null, isCurrent: false, error: null, fetchLog: [], refetch: null, provenance: {} };
  }
  return state;
}

function summarizeData(d) {
  if (!d) return 'null';
  const keys = Object.keys(d).filter(k => !k.startsWith('_'));
  const nonNull = keys.filter(k => {
    const v = d[k];
    if (v == null || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v).some(x => x != null && x !== false);
    return true;
  });
  return `${nonNull.length}/${keys.length} keys live`;
}

async function fetchMarket(marketId) {
  const url = MARKET_ENDPOINTS[marketId];
  if (!url) {
    console.warn(`[DataProvider] ⚠ No endpoint for "${marketId}"`);
    return { marketId, data: null, ok: false, status: 0, duration: 0, error: `No endpoint for ${marketId}` };
  }
  const t0 = performance.now();
  try {
    console.log(`[DataProvider] → ${marketId}`);
    const r = await fetchWithRetry(`${SERVER}${url}`, { retries: FETCH_RETRIES, timeout: FETCH_TIMEOUT });
    const data = await r.json();
    const dur = Math.round(performance.now() - t0);
    const summary = summarizeData(data);
    console.log(`[DataProvider] ✓ ${marketId} ${r.status} ${dur}ms — ${summary}`, data._sources || '');
    return { marketId, data, ok: true, status: r.status, duration: dur };
  } catch (err) {
    const dur = Math.round(performance.now() - t0);
    console.error(`[DataProvider] ✗ ${marketId} failed (${dur}ms):`, err?.message || err);
    return { marketId, data: null, ok: false, status: 0, duration: dur, error: err?.message || 'Fetch failed' };
  }
}

function hasNonNullData(d) {
  if (!d || typeof d !== 'object') return false;
  let nonNull = 0;
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('_') || k === 'lastUpdated' || k === 'fetchedOn' || k === 'isCurrent' || k === 'isLive' || k === 'countryCount') continue;
    if (v != null && v !== false) {
      if (typeof v === 'object') {
        if (Array.isArray(v)) {
          if (v.length > 0) nonNull++;
        } else {
          const childValues = Object.values(v);
          if (childValues.length > 0 && childValues.some(x => x != null && x !== false)) {
            let hadSource = false;
            for (const cv of childValues) {
              if (cv != null && cv !== false && typeof cv === 'object' && !Array.isArray(cv) && cv._source === true) {
                nonNull++;
                hadSource = true;
              }
            }
            if (!hadSource) nonNull++;
          }
        }
      } else {
        nonNull++;
      }
    }
  }
  return nonNull >= 2;
}

const STRUCTURAL_GUARDS = {
  bonds:          d => { const yd = d.yieldCurveData; if (!yd || typeof yd !== 'object') return false; return Object.values(yd).filter(v => v && typeof v === 'object' && Object.values(v).some(x => x != null)).length >= 3; },
  commodities:    d => Array.isArray(d.cotData) ? d.cotData.length >= 2 : true,
  sentiment:      d => Array.isArray(d.currencies) ? d.currencies.length >= 4 : true,
  globalMacro:    d => Array.isArray(d.scorecardData) ? d.scorecardData.length >= 8 : true,
  credit:         d => d.spreadData?.history?.dates?.length >= 6,
  crypto:         d => Array.isArray(d.coins) ? d.coins.length >= 10 : true,
  equitiesDeepDive: d => Array.isArray(d.sectors) ? d.sectors.length >= 8 : true,
  calendar:       d => Array.isArray(d.economicEvents) ? d.economicEvents.length >= 5 : true,
  derivatives:    d => d.vixTermStructure?.values?.length >= 2,
  insurance:      d => Array.isArray(d.combinedRatioData) ? d.combinedRatioData.length >= 2 : true,
  realEstate:     d => Array.isArray(d.reitData) ? d.reitData.length >= 2 : true,
  fx:             d => Array.isArray(d.fredFxRates) ? d.fredFxRates.length >= 2 : true,
  imf:            d => Array.isArray(d.countries) ? d.countries.length >= 5 : true,
  worldbank:      d => Array.isArray(d.countries) ? d.countries.length >= 5 : true,
  bls:            d => d.series && Object.values(d.series).some(s => s._source),
};

function passesStructuralGuard(id, d) {
  const guard = STRUCTURAL_GUARDS[id];
  if (!guard) return true;
  try {
    return guard(d);
  } catch {
    return false;
  }
}

function applyResult(prev, result) {
  const id = result.marketId;
  if (result.ok) {
    const d = result.data;
    const hasRealData = hasNonNullData(d);
    const structuralOk = hasRealData && passesStructuralGuard(id, d);
    const ts = d?.lastUpdated || tsNow();
    const isCurrent = structuralOk ? (d?.isCurrent != null ? !!d.isCurrent : !!d?.isLive) : false;
    if (!hasRealData) {
      console.warn(`[DataProvider] ⚠ ${id} returned data but hasNonNullData=false — treating as empty`);
    } else if (!structuralOk) {
      console.warn(`[DataProvider] ⚠ ${id} passed hasNonNullData but failed structural guard — treating as empty`);
    }
    console.log(`[DataProvider] ✓ ${id} isLive=${structuralOk} isCurrent=${isCurrent} fetchedOn=${d?.fetchedOn || 'n/a'}`);
    return {
      ...prev,
      [id]: {
        data: structuralOk ? d : null,
        isLoading: false,
        isLive: structuralOk,
        lastUpdated: structuralOk ? ts : null,
        fetchedOn: structuralOk ? (d?.fetchedOn || null) : null,
        isCurrent,
        error: structuralOk ? null : (hasRealData ? 'API returned insufficient data' : 'API returned empty data'),
        fetchLog: [{ time: tsNow(), url: MARKET_ENDPOINTS[id], status: result.status, duration: result.duration, ...(structuralOk ? {} : { warning: hasRealData ? 'failed structural guard' : 'empty response' }) }, ...(prev[id]?.fetchLog || [])].slice(0, 20),
        provenance: structuralOk && d?._sources ? { sources: d._sources } : prev[id]?.provenance || {},
      },
    };
  }
  console.error(`[DataProvider] ✗ ${id} fetch error: ${result.error}`);
  return {
    ...prev,
    [id]: {
      ...prev[id],
      isLoading: false,
      error: result.error,
      fetchLog: [{ time: tsNow(), url: MARKET_ENDPOINTS[id], status: 0, duration: result.duration, error: result.error }, ...(prev[id]?.fetchLog || [])].slice(0, 20),
    },
  };
}

function computeAlerts(baseMarkets) {
  const ALERT_RULES = [
    { id: 'vix-spike', label: 'VIX Spike', severity: 'high', market: 'derivatives',
      check: (d) => { const vixSignal = d.sentiment?.riskData?.signals?.find(s => s.name === 'VIX'); const vix = vixSignal?.value; return vix != null && vix > 25 ? { triggered: true, value: vix, message: `VIX at ${vix.toFixed(1)} — elevated volatility` } : { triggered: false }; } },
    { id: 'curve-inversion', label: 'Yield Curve Inversion', severity: 'high', market: 'bonds',
      check: (d) => { const ycd = d.bonds?.yieldCurveData; if (!ycd) return { triggered: false }; const us = ycd.US || ycd.us; if (!us) return { triggered: false }; const t10 = us['10y'] ?? us['10Y']; const t2 = us['2y'] ?? us['2Y']; return (t10 != null && t2 != null && t10 < t2) ? { triggered: true, value: (t10 - t2).toFixed(2), message: `10Y-2Y spread at ${(t10 - t2).toFixed(2)}% — inverted` } : { triggered: false }; } },
    { id: 'hy-spread-wide', label: 'HY Spread Widening', severity: 'medium', market: 'credit',
      check: (d) => { const hy = d.credit?.spreadData?.current?.hySpread; return hy != null && hy > 400 ? { triggered: true, value: Math.round(hy), message: `HY OAS at ${Math.round(hy)}bps — stress level` } : { triggered: false }; } },
    { id: 'fear-extreme', label: 'Extreme Fear', severity: 'high', market: 'sentiment',
      check: (d) => { const fg = d.sentiment?.fearGreedData?.score ?? d.sentiment?.fearGreedData?.value; return (fg != null && fg < 25) ? { triggered: true, value: fg, message: `Fear & Greed at ${fg} — extreme fear` } : { triggered: false }; } },
    { id: 'greed-extreme', label: 'Extreme Greed', severity: 'medium', market: 'sentiment',
      check: (d) => { const fg = d.sentiment?.fearGreedData?.score ?? d.sentiment?.fearGreedData?.value; return (fg != null && fg > 75) ? { triggered: true, value: fg, message: `Fear & Greed at ${fg} — extreme greed` } : { triggered: false }; } },
    { id: 'btc-crash', label: 'BTC Large Move', severity: 'medium', market: 'crypto',
      check: (d) => { const coins = d.crypto?.coinMarketData?.coins || d.crypto?.coins; const btc = coins?.find(c => c.symbol === 'btc' || c.id === 'bitcoin'); const chg = btc?.change24h ?? btc?.price_change_percentage_24h; return (chg != null && Math.abs(chg) > 5) ? { triggered: true, value: chg.toFixed(1), message: `BTC ${chg > 0 ? '+' : ''}${chg.toFixed(1)}% in 24h` } : { triggered: false }; } },
    { id: 'gold-rally', label: 'Gold Significant Move', severity: 'low', market: 'commodities',
      check: (d) => {
        const v2 = d.commodities?.yahoo;
        if (v2) {
          const goldQuote = v2.futures?.['GC=F'];
          if (goldQuote?.change != null && Math.abs(goldQuote.change) > 2) return { triggered: true, value: goldQuote.change.toFixed(1), message: `Gold ${goldQuote.change > 0 ? '+' : ''}${goldQuote.change.toFixed(1)}% — significant move` };
        }
        const legacy = d.commodities?.priceDashboardData;
        if (legacy) {
          for (const sector of legacy) {
            const gold = sector.commodities?.find(c => c.ticker === 'GC=F');
            if (gold?.change1d != null && Math.abs(gold.change1d) > 2) return { triggered: true, value: gold.change1d.toFixed(1), message: `Gold ${gold.change1d > 0 ? '+' : ''}${gold.change1d.toFixed(1)}% — significant move` };
          }
        }
        return { triggered: false };
      } },
    { id: 'dxy-move', label: 'Dollar Strength Shift', severity: 'low', market: 'fx',
      check: (d) => {
        const dxyH = d.fx?.dxyHistory;
        if (dxyH?.values?.length >= 2) {
          const vals = dxyH.values;
          const pctChange = ((vals[vals.length - 1] - vals[vals.length - 2]) / vals[vals.length - 2]) * 100;
          if (Math.abs(pctChange) > 0.5) return { triggered: true, value: pctChange.toFixed(2), message: `DXY ${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}% — dollar ${pctChange > 0 ? 'strengthening' : 'weakening'}` };
        }
        return { triggered: false };
      } },
  ];
  const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
  const combined = {};
  for (const [key, marketState] of Object.entries(baseMarkets)) {
    if (marketState.data) combined[key] = marketState.data;
  }
  const triggered = [];
  for (const rule of ALERT_RULES) {
    try {
      const result = rule.check(combined);
      if (result.triggered) triggered.push({ id: rule.id, label: rule.label, severity: rule.severity, market: rule.market, value: result.value, message: result.message });
    } catch {}
  }
  triggered.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  return { alerts: triggered, rules: ALERT_RULES };
}

function maybeComputeFederated(prev, next) {
  for (const [fedId, config] of Object.entries(FEDERATED_MARKETS)) {
    const allReady = config.endpoints.every(ep => next[ep]?.data);
    if (allReady) {
      const alertResult = computeAlerts(next);
      const triggered = alertResult.alerts.length;
      console.log(`[DataProvider] ✓ Federated "${fedId}" computed — ${triggered} alert(s) triggered`);
      next[fedId] = {
        ...prev[fedId],
        data: alertResult,
        isLoading: false,
        isLive: true,
        lastUpdated: tsNow(),
        fetchLog: [{ time: tsNow(), url: 'federated:alerts', status: 200, duration: 0 }, ...(prev[fedId]?.fetchLog || [])].slice(0, 20),
      };
    } else {
      const missing = config.endpoints.filter(ep => !next[ep]?.data);
      console.log(`[DataProvider] ⏳ Federated "${fedId}" waiting for: [${missing.join(', ')}]`);
    }
  }
  return next;
}

export function DataProvider({ children, autoRefresh = false, refreshKey = 0 }) {
  const [markets, setMarkets] = useState(createInitialMarketState);
  const [globalLoading, setGlobalLoading] = useState(false);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const marketsRef = useRef(markets);

  useEffect(() => { marketsRef.current = markets; }, [markets]);

  const fetchSingleMarket = useCallback(async (marketId) => {
    const result = await fetchMarket(marketId);
    if (!mountedRef.current) return;
    setMarkets(prev => {
      const next = applyResult(prev, result);
      return maybeComputeFederated(prev, next);
    });
  }, []);

  const fetchAllMarkets = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('[DataProvider] Fetch already in progress — skipping duplicate');
      return;
    }
    fetchingRef.current = true;

    const ids = ALL_FETCH_IDS;
    setMarkets(prev => {
      const next = { ...prev };
      for (const id of ids) {
        if (MARKET_ENDPOINTS[id]) next[id] = { ...next[id], isLoading: true };
      }
      return next;
    });
    setGlobalLoading(true);

    console.log(`[DataProvider] Fetching ${ids.length} markets in batches of ${BATCH_CONCURRENCY}…`);

    for (let i = 0; i < ids.length; i += BATCH_CONCURRENCY) {
      const batch = ids.slice(i, i + BATCH_CONCURRENCY);
      if (i > 0) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));

      console.log(`[DataProvider] Batch ${Math.floor(i / BATCH_CONCURRENCY) + 1}: [${batch.join(', ')}]`);
      const results = await Promise.allSettled(batch.map(id => fetchMarket(id)));

      if (!mountedRef.current) { fetchingRef.current = false; return; }

      try {
        setMarkets(prev => {
          let next = { ...prev };
          for (const settled of results) {
            if (settled.status === 'fulfilled') {
              next = applyResult(next, settled.value);
            } else {
              const mid = settled.reason?.marketId;
              if (mid && next[mid]) next[mid] = { ...next[mid], isLoading: false, error: settled.reason?.message || 'Fetch failed' };
            }
          }
          next = maybeComputeFederated(prev, next);
          return next;
        });
      } catch (err) {
        console.error('[DataProvider] setMarkets error:', err);
      }
    }

    console.log(`[DataProvider] ✅ All fetches complete`);
    fetchingRef.current = false;
    setGlobalLoading(false);
    const liveCount = Object.keys(MARKET_ENDPOINTS).length + Object.keys(FEDERATED_MARKETS).length;
    console.log(`[DataProvider] ✅ All fetches complete`);
  }, []);

  const fetchFederatedMarket = useCallback((fedId) => {
    const config = FEDERATED_MARKETS[fedId];
    if (!config) return;
    const combined = {};
    let latestFetchedOn = null;
    for (const ep of config.endpoints) {
      const mkt = marketsRef.current[ep];
      if (mkt?.data) {
        combined[ep] = mkt.data;
        if (mkt.fetchedOn && (!latestFetchedOn || mkt.fetchedOn > latestFetchedOn)) latestFetchedOn = mkt.fetchedOn;
      }
    }
    if (Object.keys(combined).length === 0) return;
    if (fedId === 'alerts') {
      const alertResult = computeAlerts(marketsRef.current);
      setMarkets(prev => ({
        ...prev,
        [fedId]: { ...prev[fedId], data: alertResult, isLoading: false, isLive: true, lastUpdated: tsNow(), fetchedOn: latestFetchedOn, fetchLog: [{ time: tsNow(), url: 'federated:alerts', status: 200, duration: 0 }, ...(prev[fedId]?.fetchLog || [])].slice(0, 20) },
      }));
    }
  }, []);

  const refetchAll = useCallback(() => { fetchAllMarkets(); }, [fetchAllMarkets]);

  const refreshSingle = useCallback((marketId) => {
    if (FEDERATED_MARKETS[marketId]) { fetchFederatedMarket(marketId); }
    else if (MARKET_ENDPOINTS[marketId]) { fetchSingleMarket(marketId); }
  }, [fetchSingleMarket, fetchFederatedMarket]);

  useEffect(() => { fetchAllMarkets(); }, [refreshKey, fetchAllMarkets]);
  useInterval(refetchAll, autoRefresh ? 300000 : null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const getMarket = useCallback((marketId) => {
    const m = markets[marketId];
    if (!m) return { data: null, isLoading: false, isLive: false, lastUpdated: null, fetchedOn: null, isCurrent: false, error: null, fetchLog: [], refetch: () => {}, provenance: {} };
    return { ...m, refetch: () => refreshSingle(marketId) };
  }, [markets, refreshSingle]);

  const value = React.useMemo(() => ({ markets, globalLoading, getMarket, refetchAll, refreshSingle }), [markets, globalLoading, getMarket, refetchAll, refreshSingle]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}