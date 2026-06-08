import React, { useState, useCallback, useRef, useEffect } from 'react';
import DataContext from './DataContext';
import { useInterval } from '../hooks/useInterval';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { putSnapshot, todayStr } from '../utils/snapshotDB';
import { getApiBaseUrl, getApiInfo } from '../lib/api';

const API_BASE = getApiBaseUrl();
const API_INFO = getApiInfo();

// One-time visibility into which backend the bundle is talking to.
// Extremely useful after a Pages deploy when debugging "why is nothing loading?"
if (!import.meta.env.DEV) {
  console.info('[DataProvider] API backend:', API_INFO);
} else {
  console.info('[DataProvider] dev mode – using Vite proxy for /api');
}

// Verbose fetch progress is helpful in dev but noisy in production.
// Gate behind import.meta.env.DEV so prod builds stay clean.
const dlog = import.meta.env.DEV ? console.log.bind(console) : () => {};

const FETCH_SETTINGS = {
  timeout: 30000,
  retries: 1,
  batchConcurrency: 4,
  batchDelayMs: 300,
};

function tsNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// `analytics` ends with /api/rate-limits because the Analytics tab consumes
// that endpoint for provenance. It used to be patched in from DataContext
// after import, which created a circular-init TDZ in dev-mode ESM and broke
// the app from mounting. Inline the entry here instead.
export const MARKET_ENDPOINTS = {
  analytics:         '/api/rate-limits',
  bonds:             '/api/bonds',
  fx:                '/api/fx',
  derivatives:       '/api/derivatives',
  realEstate:        '/api/realEstate',
  insurance:         '/api/insurance',
  commodities:       '/api/commoditiesEnhanced',
  globalMacro:       '/api/globalMacro',
  watchlist:            '/api/watchlist',
  // `/api/equities` doesn't exist on the backend — the Equities tab fetches
  // from `/api/stocks` directly. Removing this entry stops DataProvider
  // from crashing the wave on a JSON-parse error against the static fallback.
  equitiesDeepDive:    '/api/equityDeepDive',
  institutional:     '/api/institutional',
  crypto:            '/api/crypto',
  credit:            '/api/credit',
  sentiment:         '/api/sentiment',
  calendar:          '/api/calendar',
  imf:               '/api/imf',
  worldbank:         '/api/worldbank',
  bls:               '/api/bls',
  eia:               '/api/eia',
  census:             '/api/census',
  // Tier-1 additions: consumed by Bonds (Foreign Holders, Money Market),
  // Credit (Bank Sector), and Macro (Euro Area) panels.
  nyfed:             '/api/nyfed',
  fdic:              '/api/fdic',
  ecb:               '/api/ecb',
  treasuryTIC:       '/api/treasury/tic',
  // Tier-1 additions (Treasury Fiscal Data API): auctions + DTS feed
  // Bonds Recent Auctions and Macro TGA Cash Balance panels.
  treasuryAuctions:  '/api/treasury/auctions',
  treasuryDTS:       '/api/treasury/dts',
  // Federal Reserve System: FOMC SEP, Atlanta GDPNow, Cleveland inflation
  // nowcast, SF news sentiment. Consumed by Macro and Sentiment panels.
  fedSEP:              '/api/fed/sep',
  fedGDPNow:           '/api/fed/gdpnow',
  fedInflationNowcast: '/api/fed/inflation-nowcast',
  fedNewsSentiment:    '/api/fed/news-sentiment',
  // MSRB EMMA — US municipal trade & primary-market activity. Consumed by
  // the Credit tab's Municipal Credit panel.
  msrb:                '/api/msrb',
  // Insurance-tab additions: OpenFEMA disaster declarations, USGS quakes,
  // and SEC-EDGAR-derived US P&C insurer combined ratios.
  fema:                '/api/fema',
  usgs:                '/api/usgs',
  edgarInsurerRatios:  '/api/edgar/insurer-ratios',
  // Commodities-tab additions: USDA NASS ag prices, Census trade flows,
  // EIA petroleum & natural gas. USDA gracefully degrades without a key.
  usda:                '/api/usda',
  censusTrade:         '/api/census-trade',
  eiaPetroleum:        '/api/eia-petroleum',
};

const ALL_FETCH_IDS = Object.keys(MARKET_ENDPOINTS);
const PRIORITY_MARKETS = ['equities', 'bonds', 'fx', 'crypto', 'sentiment'];

const FEDERATED_MARKETS = {
  alerts: { endpoints: ['sentiment', 'bonds', 'credit', 'crypto', 'commodities', 'fx'] },
};

const SNAPSHOT_KEY = 'hub-markets-snapshot-v1';

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch { return null; }
}

function saveSnapshot(markets) {
  try {
    const slim = {};
    for (const [id, m] of Object.entries(markets)) {
      if (m?.data) {
        slim[id] = {
          data: m.data,
          lastUpdated: m.lastUpdated,
          fetchedOn: m.fetchedOn,
          isLive: m.isLive,
          isCurrent: m.isCurrent,
          provenance: m.provenance,
        };
      }
    }
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
  } catch (e) {
    console.warn('[DataProvider] snapshot save failed:', e?.message);
  }
}

function createInitialMarketState() {
  const state = {};
  const allIds = [...ALL_FETCH_IDS, ...Object.keys(FEDERATED_MARKETS), 'equities', 'watchlist', 'analytics'];
  const snapshot = loadSnapshot() || {};
  for (const id of allIds) {
    const snap = snapshot[id];
    state[id] = {
      data: snap?.data || null,
      isLoading: false,
      isLive: snap?.isLive || false,
      lastUpdated: snap?.lastUpdated || null,
      fetchedOn: snap?.fetchedOn || null,
      isCurrent: snap?.isCurrent || false,
      error: null,
      fetchLog: [],
      refetch: null,
      provenance: snap?.provenance || {},
    };
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

function persistToIDB(result) {
  if (!result?.ok || !result.data) return;
  const { marketId, data } = result;
  const d = data || {};
  putSnapshot({
    marketId,
    date: todayStr(),
    stamp: tsNow(),
    data,
    lastUpdated: d.lastUpdated || null,
    fetchedOn: d.fetchedOn || null,
    isLive: !!d.isLive,
    isCurrent: d.isCurrent != null ? !!d.isCurrent : !!d.isLive,
    provenance: d._sources ? { sources: d._sources } : {},
  });
}

async function fetchMarket(marketId) {
  const url = MARKET_ENDPOINTS[marketId];
  if (!url) {
    console.warn(`[DataProvider] ⚠ No endpoint for "${marketId}"`);
    return { marketId, data: null, ok: false, status: 0, duration: 0, error: `No endpoint for ${marketId}` };
  }
  const t0 = performance.now();
  try {
    dlog(`[DataProvider] → ${marketId}`);
    const r = await fetchWithRetry(`${API_BASE}${url}`, { retries: FETCH_SETTINGS.retries, timeout: FETCH_SETTINGS.timeout });
    const data = await r.json();
    const dur = Math.round(performance.now() - t0);
    const requestId = r.headers?.get?.('X-Request-Id') || r.headers?.get?.('x-request-id') || null;
    const summary = summarizeData(data);
    dlog(`[DataProvider] ✓ ${marketId} ${r.status} ${dur}ms — ${summary}`, data._sources || '');
    return { marketId, data, ok: true, status: r.status, duration: dur, requestId };
  } catch (err) {
    const dur = Math.round(performance.now() - t0);
    console.error(`[DataProvider] ✗ ${marketId} failed (${dur}ms):`, err?.message || err);
    return { marketId, data: null, ok: false, status: 0, duration: dur, error: err?.message || 'Fetch failed' };
  }
}

export function hasNonNullData(d) {
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

// Special-case analytics (rate-limits stub often returns {date, sources:[]}).
// We still want to consider it "received" even if the sources array is empty.
export function passesStructuralGuard(id, d) {
  if (id === 'analytics') return true; // rate-limits provenance stub is intentionally minimal
  const guard = STRUCTURAL_GUARDS[id];
  if (!guard) return true;
  try {
    return guard(d);
  } catch {
    return false;
  }
}

export const STRUCTURAL_GUARDS = {
  bonds:          d => { const yd = d.yieldCurveData; if (!yd || typeof yd !== 'object') return false; return Object.values(yd).filter(v => v && typeof v === 'object' && Object.values(v).some(x => x != null)).length >= 3; },
  commodities:    d => Array.isArray(d.cotData) ? d.cotData.length >= 2 : true,
  sentiment:      d => Array.isArray(d.currencies) ? d.currencies.length >= 4 : true,
  globalMacro:    d => Array.isArray(d.scorecardData) ? d.scorecardData.length >= 8 : true,
  credit:         d => d.spreadData?.history?.dates?.length >= 6,
  crypto:         d => Array.isArray(d.coins) ? d.coins.length >= 10 : true,
  equities:      d => Array.isArray(d.stocks) ? d.stocks.length >= 1 : true,
  equitiesDeepDive: d => Array.isArray(d.sectors) ? d.sectors.length >= 8 : true,
  calendar:       d => {
    const events = Array.isArray(d.economicEvents) && d.economicEvents.length >= 5;
    const earnings = Array.isArray(d.earningsSeason) && d.earningsSeason.length >= 2;
    const banks = Array.isArray(d.centralBanks) && d.centralBanks.length >= 2;
    return events || earnings || banks;
  },
  derivatives:    d => d.vixTermStructure?.values?.length >= 2,
  insurance:      d => Array.isArray(d.combinedRatioData) ? d.combinedRatioData.length >= 2 : true,
  realEstate:     d => Array.isArray(d.reitData) ? d.reitData.length >= 2 : true,
  fx:             d => Array.isArray(d.fredFxRates) ? d.fredFxRates.length >= 2 : true,
  imf:            d => Array.isArray(d.countries) ? d.countries.length >= 5 : true,
  worldbank:      d => Array.isArray(d.countries) ? d.countries.length >= 5 : true,
  bls:            d => d.series && Object.values(d.series).some(s => s._source),
  eia:            d => d.electricity?.residential != null || d.co2Emissions?.total != null,
  census:         d => d.series && Object.values(d.series).some(s => s._source),
};

export function applyResult(prev, result) {
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
    dlog(`[DataProvider] ✓ ${id} isLive=${structuralOk} isCurrent=${isCurrent} fetchedOn=${d?.fetchedOn || 'n/a'}`);
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
        fetchLog: [{ time: tsNow(), url: MARKET_ENDPOINTS[id], status: result.status, duration: result.duration, requestId: result.requestId || null, ...(structuralOk ? {} : { warning: hasRealData ? 'failed structural guard' : 'empty response' }) }, ...(prev[id]?.fetchLog || [])].slice(0, 20),
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
      fetchLog: [{ time: tsNow(), url: MARKET_ENDPOINTS[id], status: 0, duration: result.duration, error: result.error, requestId: result.requestId || null }, ...(prev[id]?.fetchLog || [])].slice(0, 20),
    },
  };
}

function getDisabledRuleIds() {
  try {
    const raw = localStorage.getItem('alert-rules-enabled');
    if (!raw) return [];
    const map = JSON.parse(raw);
    return Object.entries(map).filter(([, v]) => v === false).map(([k]) => k);
  } catch { return []; }
}

export function computeAlerts(baseMarkets, disabledRuleIds) {
  const disabledSet = new Set(disabledRuleIds || []);
  const ALERT_RULES = [
    { id: 'vix-spike', label: 'VIX Spike', severity: 'high', market: 'derivatives',
      check: (d) => { 
        const vixSignal = d.sentiment?.riskData?.signals?.find(s => s.name === 'VIX'); 
        const vixDeriv = d.derivatives?.vixData?.spot;
        const vix = vixSignal?.value ?? vixDeriv; 
        return vix != null && vix > 30 ? { triggered: true, value: vix, message: `VIX at ${vix.toFixed(1)} — elevated volatility` } : { triggered: false }; 
      } },
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
          if (goldQuote?.change != null && Math.abs(goldQuote.change) > 3) return { triggered: true, value: goldQuote.change.toFixed(1), message: `Gold ${goldQuote.change > 0 ? '+' : ''}${goldQuote.change.toFixed(1)}% — significant move` };
        }
        const legacy = d.commodities?.priceDashboardData;
        if (legacy) {
          for (const sector of legacy) {
            const gold = sector.commodities?.find(c => c.ticker === 'GC=F');
            if (gold?.change1d != null && Math.abs(gold.change1d) > 3) return { triggered: true, value: gold.change1d.toFixed(1), message: `Gold ${gold.change1d > 0 ? '+' : ''}${gold.change1d.toFixed(1)}% — significant move` };
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
          if (Math.abs(pctChange) > 2) return { triggered: true, value: pctChange.toFixed(2), message: `DXY ${pctChange > 0 ? '+' : ''}${pctChange.toFixed(2)}% — dollar ${pctChange > 0 ? 'strengthening' : 'weakening'}` };
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
    if (disabledSet.has(rule.id)) continue;
    try {
      const result = rule.check(combined);
      if (result.triggered) triggered.push({ id: rule.id, label: rule.label, severity: rule.severity, market: rule.market, value: result.value, message: result.message });
    } catch {}
  }
  triggered.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
  return { alerts: triggered, rules: ALERT_RULES };
}

// Buckets a wave fetch into freshness tiers based on minutes since
// `fetchedOn`. Pure helper so it's unit-testable; previous in-component
// version had a bitshift bug (`diff << 15` instead of `<`) that silently
// reported every market as 'fresh'.
export function computeFreshnessReport(marketsState, now = new Date()) {
  const report = {};
  for (const id of Object.keys(MARKET_ENDPOINTS)) {
    const m = marketsState?.[id];
    const fetchedAt = m?.fetchedOn ? new Date(m.fetchedOn) : null;
    const diff = fetchedAt ? (now - fetchedAt) / 1000 / 60 : Infinity;
    report[id] = {
      status: diff < 15 ? 'fresh' : diff < 60 ? 'stale' : 'outdated',
      ageMinutes: Number.isFinite(diff) ? Math.round(diff) : Infinity,
      timestamp: m?.fetchedOn || 'never',
    };
  }
  return report;
}

function maybeComputeFederated(prev, next) {
  for (const [fedId, config] of Object.entries(FEDERATED_MARKETS)) {
    const ready = config.endpoints.filter(ep => next[ep]?.data);
    const missing = config.endpoints.filter(ep => !next[ep]?.data);
    if (ready.length === 0) {
      dlog(`[DataProvider] ⏳ Federated "${fedId}" waiting for any of: [${missing.join(', ')}]`);
      continue;
    }
    // Render incrementally: re-compute every time a sister lands. Each
    // alert rule already returns {triggered:false} when its required market
    // is missing, so partial results are correct (just incomplete) — much
    // better UX than holding the panel on PENDING for the slowest endpoint.
    const alertResult = computeAlerts(next, getDisabledRuleIds());
    const triggered = alertResult.alerts.length;
    const allReady = missing.length === 0;
    if (allReady) dlog(`[DataProvider] ✓ Federated "${fedId}" complete — ${triggered} alert(s) triggered`);
    else dlog(`[DataProvider] ◐ Federated "${fedId}" partial (${ready.length}/${config.endpoints.length}) — ${triggered} alert(s); still waiting on: [${missing.join(', ')}]`);
    next[fedId] = {
      ...prev[fedId],
      data: { ...alertResult, _partial: !allReady, _missing: missing },
      isLoading: false,
      isLive: true,
      lastUpdated: tsNow(),
      fetchLog: [{ time: tsNow(), url: `federated:${fedId}`, status: 200, duration: 0, partial: !allReady, missing }, ...(prev[fedId]?.fetchLog || [])].slice(0, 20),
    };
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

  const fetchSingleMarket = useCallback(async (marketId, params = null) => {
    let url = MARKET_ENDPOINTS[marketId];
    if (params) {
      const query = new URLSearchParams(params).toString();
      url = `${url}?${query}`;
    }
    if (!url) {
      console.warn(`[DataProvider] ⚠ No endpoint for "${marketId}"`);
      return { marketId, data: null, ok: false, status: 0, duration: 0, error: `No endpoint for ${marketId}` };
    }
    const t0 = performance.now();
    try {
      dlog(`[DataProvider] → ${marketId}`);
      const r = await fetchWithRetry(`${API_BASE}${url}`, { retries: FETCH_SETTINGS.retries, timeout: FETCH_SETTINGS.timeout });
      const data = await r.json();
      const dur = Math.round(performance.now() - t0);
      const requestId = r.headers?.get?.('X-Request-Id') || r.headers?.get?.('x-request-id') || null;
      const summary = summarizeData(data);
      dlog(`[DataProvider] ✓ ${marketId} ${r.status} ${dur}ms — ${summary}`, data._sources || '');
      return { marketId, data, ok: true, status: r.status, duration: dur, requestId };
    } catch (err) {
      const dur = Math.round(performance.now() - t0);
      console.error(`[DataProvider] ✗ ${marketId} failed (${dur}ms):`, err?.message || err);
      return { marketId, data: null, ok: false, status: 0, duration: dur, error: err?.message || 'Fetch failed' };
    }
  }, []);

  const fetchAllMarkets = useCallback(async () => {
    if (fetchingRef.current) {
      dlog('[DataProvider] Fetch already in progress — skipping duplicate');
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

    dlog(`[DataProvider] Fetching ${ids.length} markets in batches of ${FETCH_SETTINGS.batchConcurrency}…`);

    for (let i = 0; i < ids.length; i += FETCH_SETTINGS.batchConcurrency) {
      const batch = ids.slice(i, i + FETCH_SETTINGS.batchConcurrency);
      if (i > 0) await new Promise(r => setTimeout(r, FETCH_SETTINGS.batchDelayMs));

      dlog(`[DataProvider] Batch ${Math.floor(i / FETCH_SETTINGS.batchConcurrency) + 1}: [${batch.join(', ')}]`);
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

      for (const settled of results) {
        if (settled.status === 'fulfilled') persistToIDB(settled.value);
      }
    }

    dlog(`[DataProvider] ✅ All fetches complete`);
    fetchingRef.current = false;
    setGlobalLoading(false);
    const liveCount = Object.keys(MARKET_ENDPOINTS).length + Object.keys(FEDERATED_MARKETS).length;
    dlog(`[DataProvider] ✅ All fetches complete`);
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
      const alertResult = computeAlerts(marketsRef.current, getDisabledRuleIds());
      setMarkets(prev => ({
        ...prev,
        [fedId]: { ...prev[fedId], data: alertResult, isLoading: false, isLive: true, lastUpdated: tsNow(), fetchedOn: latestFetchedOn, fetchLog: [{ time: tsNow(), url: 'federated:alerts', status: 200, duration: 0 }, ...(prev[fedId]?.fetchLog || [])].slice(0, 20) },
      }));
    }
  }, []);

  const refetchAll = useCallback(() => { fetchAllMarkets(); }, [fetchAllMarkets]);

  const refetchSingle = useCallback((marketId, params = null) => {
    if (FEDERATED_MARKETS[marketId]) { fetchFederatedMarket(marketId); }
    else if (MARKET_ENDPOINTS[marketId]) { fetchSingleMarket(marketId, params); }
  }, [fetchSingleMarket, fetchFederatedMarket]);

  // Initial fetch on mount — without this, every panel sits at PENDING
  // until the user clicks the manual refresh button. We track a separate
  // `didInitialFetch` ref so the snapshot-from-localStorage path still
  // hydrates first, but the fresh wave kicks off right after.
  const didInitialFetchRef = useRef(false);
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    fetchAllMarkets();
  }, [fetchAllMarkets]);

  // Manual-refresh button increments refreshKey from outside; this fires
  // a wave each time it changes (skipping the initial 0→0 no-op).
  useEffect(() => {
    if (refreshKey > 0) fetchAllMarkets();
  }, [refreshKey, fetchAllMarkets]);
  useInterval(refetchAll, autoRefresh ? 300000 : null);

  const saveTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveSnapshot(markets), 500);
    return () => clearTimeout(saveTimerRef.current);
  }, [markets]);

  useEffect(() => {
    const handleBeforeUnload = () => { saveSnapshot(marketsRef.current); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // WebSocket live-updates disabled — no WS server is deployed yet.
  // Re-enable by adding `ws` on the server and uncommenting this effect.

  // Returns the raw market state. Currency conversion is intentionally NOT
  // applied here — see history note below. Panels that need conversion call
  // `useCurrency().convert(value)` at render time, which is the only correct
  // place to do it (we can't tell at this layer which numeric fields are
  // USD-denominated currency vs yields, percentages, ratios, or indices).
  //
  // History: this used to deep-clone and recursively rewrite every numeric
  // field via `convert()`. That violated rules-of-hooks (useCurrency called
  // inside a useCallback body), produced O(N·payload) work per consumer per
  // render, and silently mis-converted non-currency numbers. Removed.
  const getMarket = useCallback((marketId) => {
    const m = markets[marketId];
    if (!m) return { data: null, isLoading: false, isLive: false, lastUpdated: null, fetchedOn: null, isCurrent: false, error: null, fetchLog: [], refetch: () => refetchSingle(marketId), provenance: {} };
    return { ...m, refetch: () => refetchSingle(marketId) };
  }, [markets, refetchSingle]);

  const auditFreshness = useCallback(() => computeFreshnessReport(markets, new Date()), [markets]);

  const value = React.useMemo(() => ({ markets, globalLoading, getMarket, refetchAll, refetchSingle, auditFreshness }), [markets, globalLoading, getMarket, refetchAll, refetchSingle, auditFreshness]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}