import React, { useState, useCallback, useRef, useEffect } from 'react';
import DataContext from './DataContext';
import { useInterval } from '../hooks/useInterval';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { putSnapshot, todayStr } from '../utils/snapshotDB';
import { getApiBaseUrl, getApiInfo } from '../lib/api';
import { isRenderableMarketSnapshot } from '../data/marketNormalizers';

const API_BASE = getApiBaseUrl();
const API_INFO = getApiInfo();

// RTDB public REST endpoint for time-series snapshots.
// Structure (growing daily):
//   marketSnapshots/{id}/latest.json          → current (fast path)
//   marketSnapshots/{id}/history/{yyyy-mm-dd}.json → historical
// The scheduled refresher populates both. Frontend prefers RTDB; live API is fallback.
const RTDB_BASE = 'https://kfinance032926-default-rtdb.firebaseio.com/marketSnapshots';

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
  timeout: 45000,   // client timeout for live fetches. Note: on normal loads we now skip live for slow markets (realEstate etc.) when a daily RTDB snapshot is present. Explicit refresh still hits them.
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
  // Tier-1 additions: consumed by Bonds (Foreign Holders, Money Market),
  // Credit (Bank Sector), and Macro (Euro Area) panels.
  nyfed:             '/api/nyfed',
  fdic:              '/api/fdic',
  ecb:               '/api/ecb',
  treasuryTIC:       '/api/treasuryTIC',
  // Tier-1 additions (Treasury Fiscal Data API): auctions + DTS feed
  // Bonds Recent Auctions and Macro TGA Cash Balance panels.
  treasuryAuctions:  '/api/treasuryAuctions',
  treasuryDTS:       '/api/treasuryDTS',
  treasuryCost:      '/api/treasuryCost',
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
  edgarFilingActivity: '/api/edgar/filing-activity',
  // Commodities-tab additions: USDA NASS ag prices, Census trade flows,
  // EIA petroleum & natural gas. USDA gracefully degrades without a key.
  usda:                '/api/usda',
  censusTrade:         '/api/censusTrade',
  eiaPetroleum:        '/api/eiaPetroleum',
  cftcTFF:             '/api/cftcTFF',
  bisOTC:              '/api/bisOTC',
  fao:                 '/api/fao',
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

/**
 * Load a market snapshot from the public RTDB REST endpoint.
 * - marketId: e.g. "bonds", "analytics", "censusTrade"
 * - date: optional "YYYY-MM-DD". If omitted, loads /latest (fast current view).
 * Returns {data, fetchedAt, source: 'rtdb', ...} or null.
 *
 * This is the primary mechanism for cheap historical + current data.
 * The DB now grows daily under /history/{date} while /latest is kept for convenience.
 *
 * Note on old root data: pre-history snapshots may have lived directly under marketSnapshots/{id}
 * (without /latest or /history). The current loaders only read the structured paths written by the
 * scheduled refresher. If you have legacy flat data, a one-off migration script or fallback read
 * of the old shape can be added here; new daily growth uses the dated structure exclusively.
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
        isLive: !date, // dated RTDB snapshots are historical, /latest is current
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
 * Useful for time-travel UI, audit date picker, etc.
 */
async function listSnapshotDates(marketId) {
  try {
    const url = `${RTDB_BASE}/${marketId}/history.json?shallow=true`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const keys = await res.json();
    if (!keys || typeof keys !== 'object') return [];
    return Object.keys(keys).sort().reverse(); // newest first
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
      isCurrent: snap?.isCurrent || false,
      error: null,
      fetchLog: initialFetchLog,
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

function needsLiveRepair(id, data) {
  if (!data || typeof data !== 'object') return false;

  // Markets with critical field lists — if any field is null in the RTDB
  // snapshot, force a live fetch to fill the gaps. This catches stale
  // snapshots where upstream APIs (FRED/Akamai, IMF, BIS, etc.) failed
  // on the snapshot day but the structural guard still passed.
  const CRITICAL_FIELDS = {
    bonds: [
      'spreadHistory', 'fedBalanceSheetHistory', 'm2HistoryData',
      'cpiComponents', 'debtToGdpHistory', 'breakevensData',
      'durationLadder', 'macroData',
    ],
    realEstate: [
      'foreclosureData', 'mbaApplications', 'creDelinquencies',
      'existingHomeSales', 'rentalVacancy', 'treasury10y',
    ],
    fx: ['fredFxRates', 'dxyHistory', 'rateDifferentials'],
    derivatives: ['volPremium', 'skewHistory', 'vixPercentile'],
    insurance: ['industryAvgCombinedRatio', 'catLosses', 'reinsurancePricing'],
    globalMacro: ['imfWEO', 'bisCreditToGDP'],
    commodities: ['sectorHeatmapData', 'commodityCurrencies'],
    crypto: ['ethGas', 'fundingData', 'onChainData'],
    credit: ['delinquencyRates', 'commercialPaper'],
    sentiment: ['riskData', 'returnsData', 'cftcData'],
  };

  if (CRITICAL_FIELDS[id]) {
    return CRITICAL_FIELDS[id].some(f => data[f] == null);
  }

  // Markets with custom repair logic (more nuanced than field-presence check)

  if (id === 'equitiesDeepDive') {
    const factors = data.factorData?.inFavor || {};
    const hasFactorSignal = Object.values(factors).some(v => typeof v === 'number' && Number.isFinite(v) && v !== 0);
    const primaryFail = !data.sectorData?.sectors?.length || (!hasFactorSignal && !data.factorData?.stocks?.length);
    // Also check critical fields that were previously in a dead-code branch
    // due to a casing mismatch ('equityDeepDive' vs 'equitiesDeepDive').
    const criticalFields = ['equityRiskPremium', 'spPE', 'buffettIndicator'];
    return primaryFail || criticalFields.some(f => data[f] == null);
  }

  if (id === 'globalMacro') {
    // The critical-fields check above handles imfWEO/bisCreditToGDP.
    // Also keep the original oecdCli/cfnai checks.
    return !data.cfnai?.values?.length || !data.oecdCli || Object.keys(data.oecdCli || {}).length === 0;
  }

  if (id === 'sentiment') {
    // The critical-fields check above handles riskData/returnsData/cftcData.
    // Also keep the original fearGreedData check.
    return data.fearGreedData?.score == null && data.fearGreedData?.value == null;
  }

  if (id === 'calendar') {
    return !data.centralBanks?.length && !data.economicEvents?.length && !data.keyReleases?.length;
  }

  // Markets with no critical fields to check — always accept the snapshot.
  // These are either system endpoints (analytics, watchlist) or markets
  // where the structural guard is already strict enough (eia, bls, census,
  // imf, worldbank, equities).
  return false;
}

async function fetchMarket(marketId, forceLive = false) {
  let url = MARKET_ENDPOINTS[marketId];
  if (!url) {
    console.warn(`[DataProvider] ⚠ No endpoint for "${marketId}"`);
    return { marketId, data: null, ok: false, status: 0, duration: 0, error: `No endpoint for ${marketId}` };
  }
  if (forceLive) {
    url = `${url}?refresh=true`;
  }
  const t0 = performance.now();
  try {
    dlog(`[DataProvider] → ${marketId}`);
    const r = await fetchWithRetry(`${API_BASE}${url}`, { retries: FETCH_SETTINGS.retries, timeout: FETCH_SETTINGS.timeout, totalTimeout: 60000 });
    const data = await r.json();
    const dur = Math.round(performance.now() - t0);
    const requestId = r.headers?.get?.('X-Request-Id') || r.headers?.get?.('x-request-id') || null;
    const summary = summarizeData(data);
    dlog(`[DataProvider] ✓ ${marketId} ${r.status} ${dur}ms — ${summary}`, data._sources || '');
    return { marketId, data, ok: true, status: r.status, duration: dur, requestId };
  } catch (err) {
    const dur = Math.round(performance.now() - t0);
    // Downgrade to warn when this is a known-slow endpoint that likely has a recent RTDB snapshot.
    // The live call is now skipped in most cases; a failure here is usually just "snapshot is what we have".
    const msg = `[DataProvider] ✗ ${marketId} failed (${dur}ms): ${err?.message || err}`;
    if (['realEstate', 'insurance', 'globalMacro'].includes(marketId)) {
      console.warn(msg);
    } else {
      console.error(msg);
    }
    return { marketId, data: null, ok: false, status: 0, duration: dur, error: err?.message || 'Fetch failed' };
  }
}

export function hasNonNullData(d, id) {
  if (!d || typeof d !== 'object') return false;
  const renderable = isRenderableMarketSnapshot(id, d);
  if (renderable != null) return renderable;
  // Relax for system/analytics endpoints and any *-Trade / *Petroleum endpoints
  // which frequently return metadata-heavy or sparse-but-valid responses.
  // We still want to treat them as "received" so they don't spam warnings or get dropped.
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

// Special-case analytics (rate-limits stub often returns {date, sources:[]}).
// We still want to consider it "received" even if the sources array is empty.
export function passesStructuralGuard(id, d) {
  if (id === 'analytics') return true; // rate-limits provenance stub is intentionally minimal
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

export function applyResult(prev, result) {
  console.log('DEBUG applyResult marketId:', result.marketId, 'ok:', result.ok);
  const id = result.marketId;
  if (result.ok) {
    const d = result.data;
    const hasRealData = hasNonNullData(d, id);
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
        fetchLog: [{ time: tsNow(), url: MARKET_ENDPOINTS[id], status: result.status, duration: result.duration, requestId: result.requestId || null, sources: (structuralOk && d?._sources) ? d._sources : null, ...(structuralOk ? {} : { warning: hasRealData ? 'failed structural guard' : 'empty response' }) }, ...(prev[id]?.fetchLog || [])].slice(0, 20),
        provenance: structuralOk && d?._sources ? { sources: d._sources } : prev[id]?.provenance || {},
      },
    };
  }
  // Softer logging for slow markets that usually have a good daily RTDB snapshot.
  // We now keep any previously seeded data on failure (see spread of prev[id]).
  const errMsg = `[DataProvider] ✗ ${id} fetch error: ${result.error}`;
  if (['realEstate', 'insurance', 'globalMacro'].includes(id)) {
    console.warn(errMsg);
  } else {
    console.error(errMsg);
  }
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
  const [historicalDate, setHistoricalDate] = useState(null); // e.g. '2026-06-09' to view past snapshot
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const pendingFetchRef = useRef(null);
  const fetchGenerationRef = useRef(0);
  const marketsRef = useRef(markets);
  const historicalDateRef = useRef(historicalDate);

  useEffect(() => { marketsRef.current = markets; }, [markets]);
  useEffect(() => { historicalDateRef.current = historicalDate; }, [historicalDate]);

  // Cleanup on unmount so in-flight fetch waves don't call setState on an
  // unmounted component (React 18 tolerates this but it's still a warning).
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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
      const r = await fetchWithRetry(`${API_BASE}${url}`, { retries: FETCH_SETTINGS.retries, timeout: FETCH_SETTINGS.timeout, totalTimeout: 60000 });
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

  const fetchAllMarkets = useCallback(async (forceLive = false) => {
    if (fetchingRef.current) {
      pendingFetchRef.current = { forceLive: pendingFetchRef.current?.forceLive || forceLive };
      dlog('[DataProvider] Fetch already in progress — queueing follow-up fetch');
      return;
    }
    fetchingRef.current = true;

    const completeFetch = () => {
      fetchingRef.current = false;
      const pending = pendingFetchRef.current;
      pendingFetchRef.current = null;
      if (pending) {
        setTimeout(() => fetchAllMarkets(pending.forceLive), 0);
      }
    };

    const ids = ALL_FETCH_IDS;

    // Seed from RTDB snapshots first (fast, cheap, no function invocation).
    // The scheduled refresher now writes daily under /history/{date} + /latest.
    // This makes the DB grow over time while still giving fast "current" data.
    // On normal loads we prefer the snapshot for slow/expensive endpoints (realEstate etc.)
    // to avoid 504s and unnecessary Cloud Run invocations from the browser.
    const effectiveDate = historicalDateRef.current; // if set, load that day's snapshot instead of latest
    const fetchGeneration = fetchGenerationRef.current;
    const rtdbSeeds = await Promise.all(
      ids.map(async (id) => {
        const seed = await loadFromRTDB(id, effectiveDate);
        return seed ? { id, seed } : null;
      })
    );

    if (fetchGeneration !== fetchGenerationRef.current || effectiveDate !== historicalDateRef.current) {
      dlog('[DataProvider] Discarding stale fetch wave before applying RTDB seeds.');
      completeFetch();
      return;
    }

    // Track which markets got usable snapshot data this time.
    // Apply the structural guard so stale snapshots (e.g. credit data
    // missing commercialPaper.rate) force a live re-fetch.
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
        if (MARKET_ENDPOINTS[id] && !seededIds.has(id)) next[id] = { ...next[id], isLoading: true };
      }
      return maybeComputeFederated(prev, next);
    });

    if (effectiveDate && !forceLive) {
      // Historical mode: use the seeded snapshots, skip live network wave to avoid unnecessary calls.
      dlog(`[DataProvider] Historical mode for ${effectiveDate} — using RTDB snapshots only.`);
      setMarkets(prev => {
        const next = { ...prev };
        for (const id of ids) {
          if (next[id]) {
            const hasHistoricalSeed = seededIds.has(id);
            next[id] = {
              ...next[id],
              data: hasHistoricalSeed ? next[id].data : null,
              isLoading: false,
              isHistorical: true,
              asOfDate: effectiveDate,
              error: hasHistoricalSeed ? null : `No historical snapshot for ${effectiveDate}`,
            };
          }
        }
        return maybeComputeFederated(prev, next);
      });
      setGlobalLoading(false);
      completeFetch();
      return;
    }

    // Decide which markets still need a live fetch.
    // By default we skip live for markets that successfully seeded from the daily RTDB snapshot.
    // This avoids hammering slow endpoints (realEstate, insurance, etc.) from the static frontend.
    // Explicit refresh (forceLive) or lack of a seed will still trigger the live call.
    let liveIds = ids;
    if (!forceLive) {
      const seedById = Object.fromEntries(rtdbSeeds.filter(Boolean).map(item => [item.id, item.seed]));
      liveIds = ids.filter(id => !seededIds.has(id) || needsLiveRepair(id, seedById[id]?.data));
      if (liveIds.length < ids.length) {
        dlog(`[DataProvider] Skipping live fetch for ${ids.length - liveIds.length} markets that had good RTDB snapshots (realEstate etc. prefer daily snapshot).`);
      }
    }

    if (liveIds.length === 0) {
      setGlobalLoading(false);
      completeFetch();
      dlog('[DataProvider] All markets satisfied by RTDB snapshots — no live wave needed.');
      return;
    }

    // The seeded (snapshot) markets are already populated; turn off their loading state
    // so they don't appear stuck while we do the (smaller) live wave for the others.
    setMarkets(prev => {
      const next = { ...prev };
      for (const id of ids) {
        if (!liveIds.includes(id) && next[id]) {
          next[id] = { ...next[id], isLoading: false };
        }
      }
      return next;
    });

    setGlobalLoading(true);

    dlog(`[DataProvider] Fetching ${liveIds.length} markets (live) in batches of ${FETCH_SETTINGS.batchConcurrency}…`);

    for (let i = 0; i < liveIds.length; i += FETCH_SETTINGS.batchConcurrency) {
      const batch = liveIds.slice(i, i + FETCH_SETTINGS.batchConcurrency);
      if (i > 0) await new Promise(r => setTimeout(r, FETCH_SETTINGS.batchDelayMs));

      dlog(`[DataProvider] Batch ${Math.floor(i / FETCH_SETTINGS.batchConcurrency) + 1}: [${batch.join(', ')}]`);
      const results = await Promise.allSettled(batch.map(id => fetchMarket(id, forceLive)));

        if (!mountedRef.current) { completeFetch(); return; }
        if (fetchGeneration !== fetchGenerationRef.current || effectiveDate !== historicalDateRef.current) {
          dlog('[DataProvider] Discarding stale live fetch wave after history/latest changed.');
          completeFetch();
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

  const refetchAll = useCallback(() => { fetchAllMarkets(true); }, [fetchAllMarkets]); // explicit refresh → force live
  const refetchLatestSnapshots = useCallback(() => { fetchAllMarkets(false); }, [fetchAllMarkets]); // prefer RTDB snapshots, live only for gaps

  const refetchSingle = useCallback(async (marketId, params = null) => {
    if (FEDERATED_MARKETS[marketId]) {
      fetchFederatedMarket(marketId);
    } else if (MARKET_ENDPOINTS[marketId]) {
      setMarkets(prev => {
        const next = { ...prev };
        next[marketId] = { ...next[marketId], isLoading: true };
        return next;
      });
      const actualParams = { ...params, refresh: 'true' };
      const res = await fetchSingleMarket(marketId, actualParams);
      setMarkets(prev => {
        let next = { ...prev };
        next = applyResult(next, res);
        next = maybeComputeFederated(prev, next);
        return next;
      });
      if (res.ok) {
        persistToIDB(res);
      }
    }
  }, [fetchSingleMarket, fetchFederatedMarket]);

  // Initial fetch on mount — without this, every panel sits at PENDING
  // until the user clicks the manual refresh button. We track a separate
  // `didInitialFetch` ref so the snapshot-from-localStorage path still
  // hydrates first, but the fresh wave kicks off right after.
  // Normal initial load prefers RTDB snapshots for slow markets.
  const didInitialFetchRef = useRef(false);
  const didObserveHistoricalDateRef = useRef(false);
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;
    fetchAllMarkets(false); // snapshot-preferring
  }, [fetchAllMarkets]);

  // When historicalDate changes, re-seed from that day's RTDB snapshots.
  // Clearing it loads the latest snapshots again.
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
      fetchAllMarkets(false);
    }
  }, [historicalDate, fetchAllMarkets, applySnapshotMode]);

  // Manual-refresh button increments refreshKey from outside; this fires
  // a wave each time it changes (skipping the initial 0→0 no-op).
  // Explicit user refresh forces a full live pass (bypasses snapshot preference)
  // so they can get up-to-the-second data when they want it.
  useEffect(() => {
    if (refreshKey > 0) fetchAllMarkets(true); // force live on manual refresh
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
      // Use sendBeacon-style fire-and-forget to avoid blocking tab close.
      // The debounced save (above) already persists on every state change,
      // so this is just a final safety net. We keep the payload slim and
      // catch quota errors silently.
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
      } catch {
        // Quota exceeded or tab closing — silently drop; the IndexedDB
        // archive (persistToIDB) already has full-fidelity data.
      }
    };
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
    const base = !m
      ? { data: null, isLoading: false, isLive: false, lastUpdated: null, fetchedOn: null, isCurrent: false, isHistorical: !!historicalDate, asOfDate: historicalDate, error: null, fetchLog: [], refetch: (params) => refetchSingle(marketId, params), provenance: {} }
      : { ...m, refetch: (params) => refetchSingle(marketId, params) };
    // Always surface the app-wide historical mode so cards/footers can render "📜 as-of date" state even if this market wasn't (re)seeded this time.
    if (historicalDate) {
      base.isHistorical = base.isHistorical ?? true;
      base.asOfDate = base.asOfDate || historicalDate;
    } else {
      base.isHistorical = base.isHistorical ?? false;
      base.asOfDate = base.asOfDate || null;
    }
    return base;
  }, [markets, refetchSingle, historicalDate]);

  // New: load a specific historical snapshot for one or more markets.
  // Useful for time-travel UIs, historical audits, trend computation, etc.
  // Example: loadHistorical('2026-06-09') then use the returned data to override state.
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
