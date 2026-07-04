import React, { useState, useCallback, useRef, useEffect } from 'react';
import DataContext from './DataContext';
import { useInterval } from '../hooks/useInterval';
import { isRenderableMarketSnapshot } from '../data/marketNormalizers';
import { logDataFetch, logDataReceived } from '../lib/logger';

// RTDB public REST endpoint for time-series snapshots.
// Structure (growing daily):
//   marketSnapshots/{id}/latest.json          → current (fast path)
//   marketSnapshots/{id}/history/{yyyy-mm-dd}.json → historical
// The scheduled refresher populates both. Frontend reads exclusively from RTDB.
const RTDB_BASE = 'https://kfinance032926-default-rtdb.firebaseio.com/marketSnapshots';

const dlog = import.meta.env.DEV ? console.log.bind(console) : () => {};

export const MARKET_ENDPOINTS = {
  analytics:         '/api/rate-limits',
  equities:          '/api/equities',
  bonds:             '/api/bonds',
  fx:                '/api/fx',
  derivatives:       '/api/derivatives',
  realEstate:        '/api/realEstate',
  insurance:         '/api/insurance',
  commodities:       '/api/commoditiesEnhanced',
  globalMacro:       '/api/globalMacro',
  watchlist:            '/api/watchlist',
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
  bea:               '/api/bea',
  eurostat:          '/api/eurostat',
  oecd:              '/api/oecd',
  edgar:             '/api/edgar',
  universeUpdates:   '/api/universeUpdates',
  nyfed:             '/api/nyfed',
  fdic:              '/api/fdic',
  ecb:               '/api/ecb',
  treasuryTIC:       '/api/treasuryTIC',
  treasuryAuctions:  '/api/treasuryAuctions',
  treasuryDTS:       '/api/treasuryDTS',
  treasuryCost:      '/api/treasuryCost',
  fedSEP:              '/api/fed/sep',
  fedGDPNow:           '/api/fed/gdpnow',
  fedInflationNowcast: '/api/fed/inflation-nowcast',
  fedNewsSentiment:    '/api/fed/news-sentiment',
  msrb:                '/api/msrb',
  fema:                '/api/fema',
  usgs:                '/api/usgs',
  edgarInsurerRatios:  '/api/edgar/insurer-ratios',
  edgarFilingActivity: '/api/edgar/filing-activity',
  usda:                '/api/usda',
  censusTrade:         '/api/censusTrade',
  eiaPetroleum:        '/api/eiaPetroleum',
  cftcTFF:             '/api/cftcTFF',
  bisOTC:              '/api/bisOTC',
  fao:                 '/api/fao',
};

const ALL_FETCH_IDS = Object.keys(MARKET_ENDPOINTS);

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

/**
 * Load a market snapshot from the public RTDB REST endpoint.
 * - marketId: e.g. "bonds", "analytics", "censusTrade"
 * - date: optional "YYYY-MM-DD". If omitted, loads /latest (fast current view).
 * Returns {data, fetchedAt, source: 'rtdb', ...} or null.
 */
async function loadFromRTDB(marketId, date = null) {
  try {
    const suffix = date ? `history/${date}` : 'latest';
    const url = `${RTDB_BASE}/${marketId}/${suffix}.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload && payload.data) {
      return {
        data: payload.data,
        fetchedAt: payload.fetchedAt || null,
        source: 'rtdb',
        isLive: !date,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * List available historical dates for a market from RTDB.
 * Returns sorted array of "YYYY-MM-DD" strings (most recent first).
 */
async function listSnapshotDates(marketId) {
  try {
    const url = `${RTDB_BASE}/${marketId}/history.json?shallow=true`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const keys = await res.json();
    if (!keys || typeof keys !== 'object') return [];
    return Object.keys(keys).sort().reverse();
  } catch {
    return [];
  }
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
    const initialFetchLog = [];
    if (snap?.lastUpdated || snap?.fetchedOn) {
      initialFetchLog.push({
        time: snap.lastUpdated || snap.fetchedOn,
        url: MARKET_ENDPOINTS[id] ? `${MARKET_ENDPOINTS[id]} (Cached)` : 'Local Cache',
        status: 200,
        duration: 0,
        requestId: 'Cache',
        sources: snap.provenance?.sources || snap.data?._sources || null
      });
    }
    state[id] = {
      data: snap?.data || null,
      isLoading: false,
      isLive: snap?.isLive || false,
      lastUpdated: snap?.lastUpdated || null,
      fetchedOn: snap?.fetchedOn || null,
      isCurrent: snap?.isCurrent != null ? !!snap.isCurrent : !!snap?.isLive,
      error: null,
      fetchLog: initialFetchLog,
      refetch: null,
      provenance: snap?.provenance || {},
    };
  }
  return state;
}

function tsNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function hasNonNullData(d, id) {
  if (!d || typeof d !== 'object') return false;
  const renderable = isRenderableMarketSnapshot(id, d);
  if (renderable != null) return renderable;
  const isSystemLike = id === 'analytics' || id === 'watchlist' || id === 'censusTrade' || id === 'eiaPetroleum' ||
                       id === 'cftcTFF' || id === 'bisOTC' || id === 'fao' ||
                       (id && (id.includes('Trade') || id.includes('Petroleum') || id.startsWith('treasury')));
  if (isSystemLike) {
    return Object.keys(d).some(k => !k.startsWith('_') && d[k] != null);
  }
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

export function passesStructuralGuard(id, d) {
  if (id === 'analytics') return true;
  const renderable = isRenderableMarketSnapshot(id, d);
  if (renderable != null) return renderable;
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
  commodities:    d => (d.priceDashboardData?.length > 0) || (d.sectorHeatmapData?.commodities?.length > 0) || (d.yahoo?.futures && Object.keys(d.yahoo.futures).length > 0) || (d.cotData === null || d.cotData === undefined || !Array.isArray(d.cotData) || d.cotData.length >= 2),
  sentiment:      d => (d.fearGreedData != null && Object.keys(d.fearGreedData).length > 0) || (d.riskData != null && Object.keys(d.riskData).length > 0) || (Array.isArray(d.cftcData) && d.cftcData.length > 0),
  globalMacro:    d => (Array.isArray(d.scorecardData) && d.scorecardData.length >= 8) || (Array.isArray(d.growthInflationData) && d.growthInflationData.length > 0) || (d.centralBankData?.length > 0),
  credit:         d => {
    const fredSpreadBranch = d.spreadData?.history?.dates?.length >= 6 && d.commercialPaper?.rate != null;
    const emBondBranch = Array.isArray(d.emBondData?.countries) && d.emBondData.countries.length >= 5;
    const loanBranch = Array.isArray(d.loanData?.indices) && d.loanData.indices.length >= 1;
    const defaultBranch = Array.isArray(d.defaultData?.rates) && d.defaultData.rates.length >= 1;
    return fredSpreadBranch || emBondBranch || loanBranch || defaultBranch;
  },
  crypto:         d => (d.coinMarketData?.coins?.length >= 2) || (d.coins?.length >= 2) || (d.fearGreedData != null),
  equities:      d => (d.quotes && Object.keys(d.quotes).length >= 50) || (Array.isArray(d.stocks) && d.stocks.length >= 1),
  equitiesDeepDive: d => (Array.isArray(d.sectorData?.sectors) && d.sectorData.sectors.length >= 5) || (Array.isArray(d.sectors) && d.sectors.length >= 5),
  calendar:       d => {
    const events = Array.isArray(d.economicEvents) && d.economicEvents.length >= 1;
    const earnings = Array.isArray(d.earningsSeason) && d.earningsSeason.length >= 1;
    const banks = Array.isArray(d.centralBanks) && d.centralBanks.length >= 1;
    return events || earnings || banks;
  },
  derivatives:    d => d.vixTermStructure?.values?.length >= 2,
  insurance:      d => (Array.isArray(d.combinedRatioData) && d.combinedRatioData.length >= 1) || d.hyOAS != null || d.igOAS != null || d.catLosses != null,
  realEstate:     d => (Array.isArray(d.reitData) && d.reitData.length >= 2) || (d.caseShillerData?.dates?.length > 0) || (d.mortgageRates?.rate30y != null),
  fx:             d => d.spotRates != null && Object.keys(d.spotRates).length >= 3,
  imf:            d => (Array.isArray(d.countries) && d.countries.length >= 5) || d.reserves != null,
  worldbank:      d => (Array.isArray(d.countries) && d.countries.length >= 5) || d.indicators?.length > 0,
  bls:            d => d.series && Object.keys(d.series).length > 0,
  eia:            d => d.electricity?.residential != null || d.co2Emissions?.total != null,
  census:         d => d.series && Object.keys(d.series).length > 0,
};

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
      fetchLog: [{ time: tsNow(), url: `federated:${fedId}`, status: 200, duration: 0, partial: !allReady, missing }, ...(prev[fedId]?.fetchLog || [])].slice(0, 20),
    };
  }
  return next;
}

export function DataProvider({ children, autoRefresh = false, refreshKey = 0 }) {
  const [markets, setMarkets] = useState(createInitialMarketState);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [historicalDate, setHistoricalDate] = useState(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const pendingFetchRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const marketsRef = useRef(markets);
  const historicalDateRef = useRef(historicalDate);

  useEffect(() => { marketsRef.current = markets; }, [markets]);
  useEffect(() => { historicalDateRef.current = historicalDate; }, [historicalDate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAllMarkets = useCallback(async () => {
    if (fetchingRef.current) {
      pendingFetchRef.current = true;
      dlog('[DataProvider] Fetch already in progress — queueing follow-up');
      return;
    }
    fetchingRef.current = true;

    const completeFetch = () => {
      fetchingRef.current = false;
      const pending = pendingFetchRef.current;
      pendingFetchRef.current = null;
      if (pending) {
        setTimeout(() => fetchAllMarkets(), 0);
      }
    };

    const ids = ALL_FETCH_IDS;
    const effectiveDate = historicalDateRef.current;
    const fetchGeneration = fetchGenerationRef.current;

    setGlobalLoading(true);

    const rtdbSeeds = await Promise.all(
      ids.map(async (id) => {
        const seed = await loadFromRTDB(id, effectiveDate);
        return seed ? { id, seed } : null;
      })
    );

    if (fetchGeneration !== fetchGenerationRef.current || effectiveDate !== historicalDateRef.current) {
      dlog('[DataProvider] Discarding stale fetch wave before applying RTDB seeds.');
      completeFetch();
      setGlobalLoading(false);
      return;
    }

    const seededIds = new Set(
      rtdbSeeds.filter(Boolean).filter(s => {
        if (!hasNonNullData(s.seed.data, s.id)) return false;
        return passesStructuralGuard(s.id, s.seed.data);
      }).map(s => s.id)
    );

    setMarkets(prev => {
      const next = { ...prev };
      for (const item of rtdbSeeds) {
        if (item && MARKET_ENDPOINTS[item.id] && seededIds.has(item.id)) {
          const { seed } = item;
          const seedLog = {
            time: seed.fetchedAt || tsNow(),
            url: MARKET_ENDPOINTS[item.id] ? `${MARKET_ENDPOINTS[item.id]} (RTDB Snapshot)` : 'RTDB Snapshot',
            status: 200,
            duration: 0,
            requestId: 'RTDB',
            sources: seed.data?._sources || null
          };
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
            fetchLog: [seedLog, ...(next[item.id]?.fetchLog || [])].slice(0, 20),
          };
        }
      }
      for (const id of ids) {
        if (MARKET_ENDPOINTS[id] && !seededIds.has(id)) {
          next[id] = {
            ...next[id],
            data: null,
            isLoading: false,
            error: next[id]?.error || 'No RTDB snapshot available',
          };
        }
      }
      return maybeComputeFederated(prev, next);
    });

    dlog(`[DataProvider] ✅ RTDB seed complete — ${seededIds.size}/${ids.length} markets loaded`);
    completeFetch();
    setGlobalLoading(false);
  }, []);

  const applySnapshotMode = useCallback(async (date = null) => {
    const ids = ALL_FETCH_IDS;
    const modeGeneration = fetchGenerationRef.current;
    setGlobalLoading(true);

    const rtdbSeeds = await Promise.all(
      ids.map(async (id) => {
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
      for (const id of ids) {
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
            isLive: !date,
            isCurrent: !date,
            isHistorical: !!date,
            asOfDate: date || null,
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
        } else if (date) {
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
        } else {
          next[id] = { ...next[id], isLoading: false, isHistorical: false, asOfDate: null };
        }
      }
      return next;
    });

    setGlobalLoading(false);
  }, []);

  const refetchAll = useCallback(() => { fetchAllMarkets(); }, [fetchAllMarkets]);
  const refetchLatestSnapshots = useCallback(() => { fetchAllMarkets(); }, [fetchAllMarkets]);

  const refetchSingle = useCallback(async (marketId) => {
    if (FEDERATED_MARKETS[marketId]) {
      const config = FEDERATED_MARKETS[marketId];
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
      if (marketId === 'alerts') {
        const alertResult = computeAlerts(marketsRef.current, getDisabledRuleIds());
        setMarkets(prev => ({
          ...prev,
          [marketId]: { ...prev[marketId], data: alertResult, isLoading: false, isLive: true, lastUpdated: tsNow(), fetchedOn: latestFetchedOn, fetchLog: [{ time: tsNow(), url: 'federated:alerts', status: 200, duration: 0 }, ...(prev[marketId]?.fetchLog || [])].slice(0, 20) },
        }));
      }
      return;
    }

    setMarkets(prev => {
      const next = { ...prev };
      next[marketId] = { ...next[marketId], isLoading: true };
      return next;
    });

    const seed = await loadFromRTDB(marketId, historicalDateRef.current);
    setMarkets(prev => {
      const next = { ...prev };
      if (seed && hasNonNullData(seed.data, marketId) && passesStructuralGuard(marketId, seed.data)) {
        const fetchedAt = seed.fetchedAt || tsNow();
        next[marketId] = {
          ...next[marketId],
          data: seed.data,
          isLoading: false,
          isLive: seed.isLive,
          isCurrent: !historicalDateRef.current,
          lastUpdated: fetchedAt,
          fetchedOn: fetchedAt,
          error: null,
          fetchLog: [{
            time: fetchedAt,
            url: `${MARKET_ENDPOINTS[marketId]} (RTDB Snapshot)`,
            status: 200,
            duration: 0,
            requestId: 'RTDB',
            sources: seed.data?._sources || null,
          }, ...(next[marketId]?.fetchLog || [])].slice(0, 20),
        };
      } else {
        next[marketId] = {
          ...next[marketId],
          isLoading: false,
          error: 'No RTDB snapshot available',
        };
      }
      return maybeComputeFederated(prev, next);
    });
  }, []);

  const didInitialFetchRef = useRef(false);
  const didObserveHistoricalDateRef = useRef(false);
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    fetchAllMarkets();
  }, [fetchAllMarkets]);

  useEffect(() => {
    if (!didObserveHistoricalDateRef.current) {
      didObserveHistoricalDateRef.current = true;
      return;
    }
    fetchGenerationRef.current += 1;
    pendingFetchRef.current = null;
    if (historicalDate) {
      applySnapshotMode(historicalDate);
    } else {
      applySnapshotMode(null);
      fetchAllMarkets();
    }
  }, [historicalDate, fetchAllMarkets, applySnapshotMode]);

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
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const getMarket = useCallback((marketId) => {
    const m = markets[marketId];
    const base = !m
      ? { data: null, isLoading: false, isLive: false, lastUpdated: null, fetchedOn: null, isCurrent: false, isHistorical: !!historicalDate, asOfDate: historicalDate, error: null, fetchLog: [], refetch: (params) => refetchSingle(marketId, params), provenance: {} }
      : { ...m, refetch: (params) => refetchSingle(marketId, params) };
    if (historicalDate) {
      base.isHistorical = base.isHistorical ?? true;
      base.asOfDate = base.asOfDate || historicalDate;
    } else {
      base.isHistorical = base.isHistorical ?? false;
      base.asOfDate = base.asOfDate || null;
    }
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
    asOfDate: historicalDate
  }), [markets, globalLoading, getMarket, refetchAll, refetchLatestSnapshots, refetchSingle, auditFreshness, loadHistorical, listSnapshotDates, historicalDate, setHistoricalDate]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
