import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readLatestCacheWithFieldAsync, readLatestCache } from '../lib/cache.js';
import { makeCachedRouteHandler } from '../lib/routeFactory.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { SOVEREIGN_RATINGS } from '../dataSources/sovereignRatings.js';
import { fetchFredHistory, fetchFredLatest } from '../lib/fred.js';
import { yf } from '../lib/yahoo.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// FRED SERIES DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const TENOR_SERIES = {
  '1m': 'DGS1MO', '3m': 'DGS3MO', '6m': 'DGS6MO',
  '1y': 'DGS1', '2y': 'DGS2', '3y': 'DGS3', '5y': 'DGS5',
  '7y': 'DGS7', '10y': 'DGS10', '20y': 'DGS20', '30y': 'DGS30',
};

// Real Yields (TIPS)
const TIPS_SERIES = {
  '5y': 'DFII5', '10y': 'DFII10', '30y': 'DFII30',
};

// International 10Y Yields - Extended
const INTL_10Y = {
  DE: 'IRLTLT01DEM156N', JP: 'IRLTLT01JPM156N', GB: 'IRLTLT01GBM156N',
  IT: 'IRLTLT01ITM156N', FR: 'IRLTLT01FRM156N', AU: 'IRLTLT01AUM156N',
  CA: 'IRLTLT01CAM156N', CH: 'IRLTLT01CHM156N', SE: 'IRLTLT01SEM156N',
  ES: 'IRLTLT01ESM156N', NL: 'IRLTLT01NLM156N', BE: 'IRLTLT01BEM156N',
  AT: 'IRLTLT01ATM156N', FI: 'IRLTLT01FIM156N', PT: 'IRLTLT01PTM156N',
  GR: 'IRLTLT01GRM156N', IE: 'IRLTLT01IEM156N', DK: 'IRLTLT01DKM156N',
  NO: 'IRLTLT01NOM156N', NZ: 'IRLTLT01NZM156N',
};

// Credit Spread Series
const SPREAD_SERIES = {
  IG:  'BAMLC0A0CM',
  HY:  'BAMLH0A0HYM2',
  EM:  'BAMLEMCBPIOAS',
  BBB: 'BAMLC0A4CBBB',
};

// Additional Credit Indices
const CREDIT_INDICES = {
  aaa10y: 'AAA10Y',
  baa10y: 'BAA10Y',
};

// Spread History Series (for charting)
const SPREAD_HISTORY_SERIES = {
  t10y2y: 'T10Y2Y',   // 10Y-2Y spread
  t10y3m: 'T10Y3M',   // 10Y-3M spread
  t5y30y: 'T5Y30',    // 5Y-30Y spread (5s30s)
};

// Debt-to-GDP (quarterly, for charting)
const DEBT_GDP_SERIES = 'GFDEGDQ188S';

// CPI Components (for inflation breakout)
const CPI_SERIES = {
  all: 'CPIAUCSL',      // CPI All Items
  core: 'CPILFESL',     // Core CPI (ex food/energy)
  food: 'CPIFABSL',    // Food
  energy: 'CPIENGSL',   // Energy
};

// Macro Indicators
const MACRO_SERIES = {
  fedBalanceSheet: 'WALCL',
  m2: 'M2SL',
  federalDebt: 'GFDEBTN',
  surplusDeficit: 'FYFSD',
  unemployment: 'UNRATE',
  laborParticipation: 'CIVPART',
  gdp: 'GDP',
  pce: 'PCEPI',
  tb3ms: 'TB3MS',
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function dateToMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');
}

// ─────────────────────────────────────────────────────────────────────────────
// ECB YIELD CURVE — Euro area sovereign yields by tenor
// ─────────────────────────────────────────────────────────────────────────────
async function fetchECBYieldCurve() {
  try {
    const url = 'https://data-api.ecb.europa.eu/service/data/IRS/YC.EU.M.EUR4F.E.SR_3M+SR_6M+SR_1Y+SR_2Y+SR_5Y+SR_10Y+SR_30Y?detail=code&format=jsondata';
    const data = await fetchJSON(url);
    const series = data?.dataSets?.[0]?.series;
    if (!series) return null;
    const result = {};
    for (const [seriesKey, seriesData] of Object.entries(series)) {
      const obs = seriesData?.observations;
      if (!obs) continue;
      const latestObs = Object.entries(obs).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))[0];
      if (!latestObs) continue;
      const value = parseFloat(latestObs[1]?.[0] ?? latestObs[1]);
      if (isNaN(value)) continue;
      const indices = seriesKey.split(':').map(Number);
      const seriesDim = data?.structure?.dimensions?.series;
      if (!seriesDim) continue;
      let tenorLabel = null;
      for (let i = 0; i < seriesDim.length; i++) {
        const dim = seriesDim[i];
        const idx = indices[i];
        const val = dim?.values?.[idx];
        if (val?.id?.startsWith('SR_')) {
          tenorLabel = val.id.replace('SR_', '').replace('Y', 'y').replace('M', 'm');
          break;
        }
      }
      if (!tenorLabel) continue;
      result[tenorLabel] = Math.round(value * 100) / 100;
    }
    return Object.keys(result).length >= 3 ? result : null;
  } catch (e) {
    console.warn('[Bonds] ECB yield curve fetch failed:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTE
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Build _sources from cached data (so cached responses also show what was received)
// ─────────────────────────────────────────────────────────────────────────────

function hasNonNull(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return Object.values(obj).some((v) => v != null && typeof v === 'number' && Number.isFinite(v));
}

function buildSourcesFromData(d) {
  return {
    // Keys alone are not enough — null-filled US curves used to report true.
    'US Treasury Yields': hasNonNull(d.yieldCurveData?.US) || hasNonNull({
      a: d.treasuryRates?.US10Y, b: d.treasuryRates?.US2Y, c: d.treasuryRates?.US3M,
    }),
    'International 10Y Yields': d.yieldCurveData && Object.keys(d.yieldCurveData).filter((k) => k !== 'US' && hasNonNull(d.yieldCurveData[k])).length > 0,
    'TIPS Real Yields': d.tipsYields && Object.keys(d.tipsYields).length > 0,
    'Credit Spreads (IG/HY/EM/BBB)': d.spreadData && d.spreadData.dates && d.spreadData.dates.length > 0,
    'Spread Indicators': d.spreadIndicators && Object.keys(d.spreadIndicators).length > 0,
    'Fed Funds Futures': d.fedFundsFutures && Object.keys(d.fedFundsFutures).length > 0,
    'Yield Curve History': d.yieldHistory && d.yieldHistory.dates && d.yieldHistory.dates.length > 0,
    'Breakevens': d.breakevensData && d.breakevensData.history && d.breakevensData.history.dates && d.breakevensData.history.dates.length > 0,
    'Macro Indicators (Fed BS, M2, Debt, Unemp, GDP)': d.macroData && Object.keys(d.macroData).length > 0,
    'Fed Balance Sheet History': d.fedBalanceSheetHistory && d.fedBalanceSheetHistory.dates && d.fedBalanceSheetHistory.dates.length > 0,
    'M2 Money Supply History': d.m2HistoryData && d.m2HistoryData.dates && d.m2HistoryData.dates.length > 0,
    'CPI Components': d.cpiComponents && d.cpiComponents.dates && d.cpiComponents.dates.length > 0,
    'Debt-to-GDP History': d.debtToGdpHistory && d.debtToGdpHistory.dates && d.debtToGdpHistory.dates.length > 0,
    'Curve Spread History': d.spreadHistory && d.spreadHistory.dates && d.spreadHistory.dates.length > 0,
    'Treasury Auctions': d.auctionData && d.auctionData.length > 0,
    'National Debt': d.nationalDebt != null,
    'Treasury Rates': d.treasuryRates != null,
    'Mortgage Spread': d.mortgageSpread != null,
    'Credit Indices (AAA/BAA)': d.creditIndices && Object.keys(d.creditIndices).length > 0,
    'ECB Yield Curve': d.ecbYieldCurve != null && Object.keys(d.ecbYieldCurve).length > 0,
    'Sovereign Credit Ratings': true,
    'Duration Ladder': d.durationLadder != null,
  };
}

router.get('/', makeCachedRouteHandler({
  marketName: 'bonds',
  cacheKey: 'bonds_data',
  buildSourcesFn: buildSourcesFromData,
  fetchDataFn: async (req, _errors) => {
    const FRED_API_KEY = process.env.FRED_API_KEY || '';
    if (!FRED_API_KEY) {
      const err = new Error('FRED_API_KEY not configured');
      err.statusCode = 503;
      throw err;
    }
    // ═══════════════════════════════════════════════════════════════════════
    // US TREASURY YIELD CURVE (Full Tenors)
    // ═══════════════════════════════════════════════════════════════════════
    trackApiCall('FRED');
    if (process.env.LOG_VERBOSE) console.log('[Bonds] Fetching US Treasury yields...');
    const usYields = {};
    // Sequential with one retry — parallel DGS bursts were frequently leaving
    // the whole US curve null while monthly GS* series still succeeded.
    for (const [tenor, sid] of Object.entries(TENOR_SERIES)) {
      let v = null;
      for (let attempt = 0; attempt < 2 && v == null; attempt++) {
        try {
          trackApiCall('FRED');
          v = await fetchFredLatest(sid, FRED_API_KEY);
        } catch (e) {
          console.warn('[Bonds] FRED', sid, attempt ? 'retry failed:' : 'failed:', e.message);
          _errors.yieldCurveData = e.message;
          if (attempt === 0) await new Promise((r) => setTimeout(r, 200));
        }
      }
      if (v != null && Number.isFinite(v)) usYields[tenor] = v;
    }
    // Monthly average fallbacks if daily constant-maturity series are empty
    if (usYields['3m'] == null || usYields['10y'] == null || usYields['30y'] == null) {
      try {
        const [tb3, gs2, gs5, gs10, gs30] = await Promise.all([
          usYields['3m'] == null ? fetchFredLatest('TB3MS', FRED_API_KEY).catch(() => null) : null,
          usYields['2y'] == null ? fetchFredLatest('GS2', FRED_API_KEY).catch(() => null) : null,
          usYields['5y'] == null ? fetchFredLatest('GS5', FRED_API_KEY).catch(() => null) : null,
          usYields['10y'] == null ? fetchFredLatest('GS10', FRED_API_KEY).catch(() => null) : null,
          usYields['30y'] == null ? fetchFredLatest('GS30', FRED_API_KEY).catch(() => null) : null,
        ]);
        if (usYields['3m'] == null && tb3 != null) usYields['3m'] = tb3;
        if (usYields['2y'] == null && gs2 != null) usYields['2y'] = gs2;
        if (usYields['5y'] == null && gs5 != null) usYields['5y'] = gs5;
        if (usYields['10y'] == null && gs10 != null) usYields['10y'] = gs10;
        if (usYields['30y'] == null && gs30 != null) usYields['30y'] = gs30;
      } catch (e) {
        console.warn('[Bonds] monthly yield fallback failed:', e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REAL YIELDS (TIPS)
    // ═══════════════════════════════════════════════════════════════════════
    trackApiCall('FRED');
    const tipsEntries = await Promise.allSettled(
      Object.entries(TIPS_SERIES).map(async ([tenor, sid]) => [tenor, await fetchFredLatest(sid, FRED_API_KEY)])
    );
    const tipsYields = {};
    tipsEntries.forEach(r => { if (r.status === 'fulfilled' && r.value[1] != null) tipsYields[r.value[0]] = r.value[1]; });

    // Get TIPS history for charting
    trackApiCall('FRED');
    const tipsHistory = await Promise.all([
      fetchFredHistory('DFII5', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); _errors.realYieldHistory = e.message; return null; }),
      fetchFredHistory('DFII10', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); _errors.realYieldHistory = e.message; return null; }),
    ]);
    let realYieldHistory = null;
    if (tipsHistory[1]?.length > 0) {
      const dates = tipsHistory[1].map(p => p.date);
      const map5y = {};
      (tipsHistory[0] || []).forEach(p => { map5y[p.date] = p.value; });
      realYieldHistory = {
        dates,
        d5y: dates.map(d => map5y[d] ?? null),
        d10y: tipsHistory[1].map(p => p.value),
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INTERNATIONAL YIELD CURVE (Extended to 20 countries)
    // ═══════════════════════════════════════════════════════════════════════
    const yieldCurveData = {
      US: {
        '3m': usYields['3m'] ?? null, '6m': usYields['6m'] ?? null,
        '1y': usYields['1y'] ?? null, '2y': usYields['2y'] ?? null,
        '5y': usYields['5y'] ?? null, '10y': usYields['10y'] ?? null,
        '30y': usYields['30y'] ?? null,
      },
    };

    trackApiCall('FRED');
    const intlEntries = await Promise.allSettled(
      Object.entries(INTL_10Y).map(async ([cc, sid]) => [cc, await fetchFredLatest(sid, FRED_API_KEY)])
    );
    intlEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) {
        yieldCurveData[r.value[0]] = { '10y': r.value[1] };
      }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // CREDIT SPREADS
    // ═══════════════════════════════════════════════════════════════════════
    trackApiCall('FRED');
    const spreadEntries = await Promise.allSettled(
      Object.entries(SPREAD_SERIES).map(async ([key, sid]) => [key, await fetchFredHistory(sid, FRED_API_KEY, 13)])
    );
    const spreadRaw = {};
    spreadEntries.forEach(r => { if (r.status === 'fulfilled') spreadRaw[r.value[0]] = r.value[1]; });

    // FRED BAML OAS series are reported in percentage points (e.g. 0.78 = 78 bps).
    // Convert to whole basis points for the dashboard KPI / chart scale.
    const toBps = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) : null);
    // Align series on the union of recent dates (do not require exactly 12 rows —
    // partial FRED windows used to leave Credit Spreads empty).
    const packSeries = (arr) => {
      const map = new Map();
      for (const p of arr || []) {
        if (!p?.date || p.value == null || !Number.isFinite(Number(p.value))) continue;
        map.set(String(p.date).slice(0, 10), toBps(Number(p.value)));
      }
      return map;
    };
    const igMap = packSeries(spreadRaw.IG);
    const hyMap = packSeries(spreadRaw.HY);
    const emMap = packSeries(spreadRaw.EM);
    const bbbMap = packSeries(spreadRaw.BBB);
    const dateSet = new Set([...igMap.keys(), ...hyMap.keys(), ...emMap.keys(), ...bbbMap.keys()]);
    const datesSorted = [...dateSet].sort();
    const windowDates = datesSorted.slice(-24);
    const lastBps = (map) => {
      for (let i = windowDates.length - 1; i >= 0; i--) {
        const v = map.get(windowDates[i]);
        if (v != null) return v;
      }
      return null;
    };
    const spreadData = windowDates.length >= 2 ? {
      dates: windowDates.map((d) => dateToMonthLabel(d)),
      IG: windowDates.map((d) => igMap.get(d) ?? null),
      HY: windowDates.map((d) => hyMap.get(d) ?? null),
      EM: windowDates.map((d) => emMap.get(d) ?? null),
      BBB: windowDates.map((d) => bbbMap.get(d) ?? null),
      current: {
        igSpread: lastBps(igMap),
        hySpread: lastBps(hyMap),
        emSpread: lastBps(emMap),
        bbbSpread: lastBps(bbbMap),
      },
    } : null;

    // Additional Credit Indices (AAA-10Y spread, BAA-AAA spread)
    trackApiCall('FRED');
    const creditIndexEntries = await Promise.allSettled(
      Object.entries(CREDIT_INDICES).map(async ([key, sid]) => [key, await fetchFredLatest(sid, FRED_API_KEY)])
    );
    const creditIndices = {};
    creditIndexEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) creditIndices[r.value[0]] = r.value[1];
    });

    // ═══════════════════════════════════════════════════════════════════════
    // SPREAD INDICATORS & FED FUTURES
    // ═══════════════════════════════════════════════════════════════════════
    const SPREAD_INDICATOR_SERIES = {
      t10y2y: 'T10Y2Y',
      t10y3m: 'T10Y3M',
      t5yie:  'T5YIE',
      t10yie: 'T10YIE',
      dfii10: 'DFII10',
    };
    trackApiCall('FRED');
    const [indicatorEntries, mortgage30yRaw, dffSpot] = await Promise.all([
      Promise.allSettled(
        Object.entries(SPREAD_INDICATOR_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid, FRED_API_KEY)])
      ),
      fetchFredLatest('MORTGAGE30US', FRED_API_KEY).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
      fetchFredLatest('DFF', FRED_API_KEY).catch(e => { console.warn('[Bonds] DFF:', e.message || e); return null; }),
    ]);

    const spreadIndicators = {};
    indicatorEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) spreadIndicators[r.value[0]] = r.value[1];
    });

    // CME 30-day Fed Funds futures (ZQ) via Yahoo — FRED FF1–FF6 is routinely
    // 400/403. Price is 100 − implied rate. Build m1…m6 from the next 6
    // contract months (real quotes only; never invent a flat path).
    let fedFundsFutures = null;
    try {
      trackApiCall('Yahoo Finance');
      const CME_MONTHS = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];
      const now = new Date();
      const symbols = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
        const code = `ZQ${CME_MONTHS[d.getUTCMonth()]}${String(d.getUTCFullYear()).slice(-2)}.CBT`;
        symbols.push(code);
      }
      const quotes = await yf.quote(symbols).catch(() => null);
      const arr = Array.isArray(quotes) ? quotes : quotes ? [quotes] : [];
      const bySym = Object.fromEntries(arr.filter(Boolean).map((q) => [q.symbol, q]));
      const path = {};
      symbols.forEach((sym, i) => {
        const px = bySym[sym]?.regularMarketPrice ?? bySym[sym]?.price;
        if (px != null && Number.isFinite(Number(px))) {
          // ZQ quote ≈ 100 − implied EFFR
          path[`m${i + 1}`] = Math.round((100 - Number(px)) * 1000) / 1000;
        }
      });
      if (Object.keys(path).length > 0) {
        // If front month missing, seed m1 from effective federal funds (DFF)
        if (path.m1 == null && dffSpot != null) path.m1 = dffSpot;
        fedFundsFutures = path;
      } else if (dffSpot != null) {
        fedFundsFutures = { m1: dffSpot };
      }
    } catch (e) {
      console.warn('[Bonds] ZQ futures path failed:', e.message || e);
      if (dffSpot != null) fedFundsFutures = { m1: dffSpot };
    }

    const mortgageSpread = (mortgage30yRaw != null && usYields['10y'] != null)
      ? Math.round((mortgage30yRaw - usYields['10y']) * 100) / 100
      : null;

    // ═══════════════════════════════════════════════════════════════════════
    // YIELD CURVE SPREAD HISTORY (for charting)
    // ═══════════════════════════════════════════════════════════════════════
    let spreadHistory = null;
    try {
      trackApiCall('FRED');
      // FRED has no `T5Y30` series for the 5y-30y spread — compute it
      // from DGS5 and DGS30 instead. The old code 400'd ("series does
      // not exist") on every request.
      const [t10y2yHist, t10y3mHist, dgs5Hist, dgs30Hist] = await Promise.all([
        fetchFredHistory('T10Y2Y', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('T10Y3M', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('DGS5',   FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('DGS30',  FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
      ]);

      const t5y30yHist = (dgs5Hist && dgs30Hist) ? (() => {
        const map5 = new Map(dgs5Hist.map(p => [p.date, p.value]));
        const out = [];
        for (const p of dgs30Hist) {
          const v5 = map5.get(p.date);
          if (typeof v5 === 'number' && typeof p.value === 'number') {
            out.push({ date: p.date, value: Math.round((p.value - v5) * 100) / 100 });
          }
        }
        return out;
      })() : null;

      if (t10y2yHist?.length > 0) {
        const dates = t10y2yHist.map(p => p.date);
        const t10y3mMap = {};
        (t10y3mHist || []).forEach(p => { t10y3mMap[p.date] = p.value; });
        const t5y30yMap = {};
        (t5y30yHist || []).forEach(p => { t5y30yMap[p.date] = p.value; });
        spreadHistory = {
          dates: dates.map(d => dateToMonthLabel(d)),
          t10y2y: t10y2yHist.map(p => p.value),
          t10y3m: dates.map(d => t10y3mMap[d] ?? null),
          t5y30y: dates.map(d => t5y30yMap[d] ?? null),
          latest: {
            t10y2y: t10y2yHist[t10y2yHist.length - 1]?.value ?? null,
            t10y3m: t10y3mHist?.[t10y3mHist.length - 1]?.value ?? null,
            t5y30y: t5y30yHist?.[t5y30yHist.length - 1]?.value ?? null,
          },
        };
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // DEBT-TO-GDP RATIO HISTORY
    // ═══════════════════════════════════════════════════════════════════════
    let debtToGdpHistory = null;
    try {
      trackApiCall('FRED');
      const debtGdpHist = await fetchFredHistory('GFDEGDQ188S', FRED_API_KEY, 80).catch(e => { console.warn('[Bonds]', e.message || e); return null; }); // ~20 years quarterly
      if (debtGdpHist?.length > 0) {
        debtToGdpHistory = {
          dates: debtGdpHist.map(p => p.date.slice(0, 7)), // YYYY-MM format
          values: debtGdpHist.map(p => p.value),
          latest: debtGdpHist[debtGdpHist.length - 1]?.value ?? null,
        };
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // CPI COMPONENTS (for inflation breakout)
    // ═══════════════════════════════════════════════════════════════════════
    let cpiComponents = null;
    try {
      trackApiCall('FRED');
      const [cpiAllHist, cpiCoreHist, cpiFoodHist, cpiEnergyHist] = await Promise.all([
        fetchFredHistory('CPIAUCSL', FRED_API_KEY, 60).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('CPILFESL', FRED_API_KEY, 60).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('CPIFABSL', FRED_API_KEY, 60).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('CPIENGSL', FRED_API_KEY, 60).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
      ]);

      if (cpiAllHist?.length > 0) {
        const dates = cpiAllHist.map(p => p.date);
        const cpiCoreMap = {};
        (cpiCoreHist || []).forEach(p => { cpiCoreMap[p.date] = p.value; });
        const cpiFoodMap = {};
        (cpiFoodHist || []).forEach(p => { cpiFoodMap[p.date] = p.value; });
        const cpiEnergyMap = {};
        (cpiEnergyHist || []).forEach(p => { cpiEnergyMap[p.date] = p.value; });

        // Calculate YoY changes
        const calcYoy = (vals) => {
          const yoy = [];
          for (let i = 12; i < vals.length; i++) {
            yoy.push(vals[i] != null && vals[i - 12] != null ? ((vals[i] - vals[i - 12]) / vals[i - 12]) * 100 : null);
          }
          return yoy;
        };

        const allVals = cpiAllHist.map(p => p.value);
        const coreVals = dates.map(d => cpiCoreMap[d] ?? null);
        const foodVals = dates.map(d => cpiFoodMap[d] ?? null);
        const energyVals = dates.map(d => cpiEnergyMap[d] ?? null);

        cpiComponents = {
          dates: dates.slice(12).map(d => dateToMonthLabel(d)),
          all: calcYoy(allVals),
          core: calcYoy(coreVals),
          food: calcYoy(foodVals),
          energy: calcYoy(energyVals),
          latest: {
            all: allVals[allVals.length - 1],
            core: coreVals.filter(v => v != null).pop(),
            food: foodVals.filter(v => v != null).pop(),
            energy: energyVals.filter(v => v != null).pop(),
            allYoy: allVals[allVals.length - 1] != null && allVals[allVals.length - 13] != null
              ? ((allVals[allVals.length - 1] - allVals[allVals.length - 13]) / allVals[allVals.length - 13]) * 100
              : null,
          },
        };
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // BREAKEVENS & REAL YIELDS
    // ═══════════════════════════════════════════════════════════════════════
    let breakevensData = null;
    try {
      trackApiCall('FRED');
      const [be5yHist, be10yHist, fwd5y5yHist, real5y, real10y] = await Promise.all([
        fetchFredHistory('T5YIE', FRED_API_KEY, 130),
        fetchFredHistory('T10YIE', FRED_API_KEY, 130),
        fetchFredHistory('T5YIFR', FRED_API_KEY, 130),
        fetchFredLatest('DFII5', FRED_API_KEY),
        fetchFredLatest('DFII10', FRED_API_KEY),
      ]);

      if (be5yHist?.length > 0) {
        const dates = be5yHist.map(p => p.date);
        const be5yVals = be5yHist.map(p => p.value);
        const be10yMap = {};
        (be10yHist || []).forEach(p => { be10yMap[p.date] = p.value; });
        const fwdMap = {};
        (fwd5y5yHist || []).forEach(p => { fwdMap[p.date] = p.value; });
        const be10yVals = dates.map(d => be10yMap[d] ?? null);
        const fwd5y5yVals = dates.map(d => fwdMap[d] ?? null);
        breakevensData = {
          current: {
            be5y:       be5yVals[be5yVals.length - 1],
            be10y:      be10yVals[be10yVals.length - 1],
            forward5y5y: fwd5y5yVals[fwd5y5yVals.length - 1],
            real5y,
            real10y,
          },
          history: {
            dates:       dates.map(d => dateToMonthLabel(d)),
            be5y:        be5yVals,
            be10y:       be10yVals,
            forward5y5y: fwd5y5yVals,
          },
        };
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // YIELD HISTORY (252-day)
    // ═══════════════════════════════════════════════════════════════════════
    let fredYieldHistory = null;
    let yieldHistory = null;
    try {
      trackApiCall('FRED');
      const [hist2y, hist10y, hist30y] = await Promise.all([
        fetchFredHistory('DGS2',  FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('DGS10', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('DGS30', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
      ]);

      if (hist10y?.length > 0) {
        fredYieldHistory = {
          dates:  hist10y.map(p => p.date),
          values: hist10y.map(p => p.value),
        };
      }

      if (hist10y?.length > 0) {
        const anchorDates = hist10y.map(p => p.date);
        const map2y  = {};
        (hist2y  || []).forEach(p => { map2y[p.date]  = p.value; });
        const map30y = {};
        (hist30y || []).forEach(p => { map30y[p.date] = p.value; });
        yieldHistory = {
          dates: anchorDates,
          dgs2:  anchorDates.map(d => map2y[d]  ?? null),
          dgs10: hist10y.map(p => p.value),
          dgs30: anchorDates.map(d => map30y[d] ?? null),
        };
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // MACRO INDICATORS (Fed Balance Sheet, M2, Debt, Unemployment, GDP)
    // ═══════════════════════════════════════════════════════════════════════
    trackApiCall('FRED');
    const macroEntries = await Promise.allSettled(
      Object.entries(MACRO_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid, FRED_API_KEY)])
    );
    const macroData = {};
    macroEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) macroData[r.value[0]] = r.value[1];
    });

    // Global policy / overnight rates — live FRED only (no mock).
    // BOERUKM is discontinued ~2017; UK uses SONIA (IUDSOIA).
    // OECD IRSTCI01* = immediate rates / call money; INTDSR* = discount/policy where available.
    const CB_RATE_SERIES = [
      { code: 'US', label: 'Fed EFFR', series: 'DFF', fallback: 'FEDFUNDS' },
      { code: 'EU', label: 'ECB main refi', series: 'ECBMRRFR', fallback: 'ECBDFR' },
      { code: 'UK', label: 'SONIA', series: 'IUDSOIA', fallback: 'IR3TIB01GBM156N' },
      { code: 'JP', label: 'BOJ call money', series: 'IRSTCI01JPM156N', fallback: 'IR3TIB01JPM156N' },
      { code: 'CA', label: 'BoC overnight', series: 'IRSTCI01CAM156N' },
      { code: 'AU', label: 'RBA cash', series: 'IRSTCI01AUM156N' },
      { code: 'CN', label: 'PBOC / call', series: 'IRSTCI01CNM156N', fallback: 'INTDSRCNM193N' },
      { code: 'IN', label: 'RBI / call', series: 'IRSTCI01INM156N', fallback: 'INTDSRINM193N' },
      { code: 'BR', label: 'BCB / call', series: 'IRSTCI01BRM156N', fallback: 'INTDSRBRM193N' },
      { code: 'KR', label: 'BoK / call', series: 'IRSTCI01KRM156N', fallback: 'INTDSRKRM193N' },
      { code: 'MX', label: 'Banxico / call', series: 'IRSTCI01MXM156N', fallback: 'INTDSRMXM193N' },
      { code: 'RU', label: 'CBR / call', series: 'IRSTCI01RUM156N', fallback: 'INTDSRRUM193N' },
      { code: 'TR', label: 'CBRT / call', series: 'IRSTCI01TRM156N', fallback: 'INTDSRTRM193N' },
      { code: 'ZA', label: 'SARB / call', series: 'IRSTCI01ZAM156N', fallback: 'INTDSRZAM193N' },
      { code: 'ID', label: 'BI / call', series: 'IRSTCI01IDM156N', fallback: 'INTDSRIDM193N' },
      { code: 'CH', label: 'SNB / call', series: 'IRSTCI01CHM156N' },
      { code: 'SE', label: 'Riksbank / call', series: 'IRSTCI01SEM156N' },
      { code: 'NO', label: 'Norges Bank / call', series: 'IRSTCI01NOM156N' },
      { code: 'NZ', label: 'RBNZ / call', series: 'IRSTCI01NZM156N' },
      { code: 'PL', label: 'NBP / call', series: 'IRSTCI01PLM156N' },
      { code: 'CL', label: 'BCCh / call', series: 'IRSTCI01CLM156N' },
      { code: 'IL', label: 'BoI / call', series: 'IRSTCI01ILM156N' },
      { code: 'CZ', label: 'CNB / call', series: 'IRSTCI01CZM156N' },
      { code: 'HU', label: 'MNB / call', series: 'IRSTCI01HUM156N' },
      // Euro-area national overnight (OECD) — same EUR money market for DE/ES/FR/IT
      { code: 'DE', label: 'EUR overnight (DE)', series: 'IRSTCI01DEM156N', fallback: 'ECBMRRFR' },
      { code: 'ES', label: 'EUR overnight (ES)', series: 'IRSTCI01ESM156N', fallback: 'ECBMRRFR' },
      { code: 'FR', label: 'EUR overnight (FR)', series: 'IRSTCI01FRM156N', fallback: 'ECBMRRFR' },
      { code: 'IT', label: 'EUR overnight (IT)', series: 'IRSTCI01ITM156N', fallback: 'ECBMRRFR' },
      // No live FRED OECD call-money / discount series for AR, PK, TW, SG, HK, TH, MY, PH, CO
    ];

    macroData.centralBankRates = {};
    macroData.centralBankMeta = {};
    // Prefer ZQ front month for US when present
    if (fedFundsFutures?.m1 != null) {
      macroData.centralBankRates.US = fedFundsFutures.m1;
      macroData.centralBankMeta.US = { label: 'Fed EFFR / ZQ', series: 'ZQ+DFF' };
    }

    if (FRED_API_KEY) {
      try {
        // Sequential with light delay — parallel bursts of 25+ FRED calls
        // were getting 403/timeout and leaving EU/UK/JP empty.
        for (const row of CB_RATE_SERIES) {
          if (macroData.centralBankRates[row.code] != null) continue;
          let v = null;
          let used = row.series;
          try {
            trackApiCall('FRED');
            v = await fetchFredLatest(row.series, FRED_API_KEY);
          } catch (e) {
            /* try fallback */
          }
          if (v == null && row.fallback) {
            try {
              trackApiCall('FRED');
              v = await fetchFredLatest(row.fallback, FRED_API_KEY);
              used = row.fallback;
            } catch (e) {
              /* leave null */
            }
          }
          if (v != null && Number.isFinite(Number(v))) {
            macroData.centralBankRates[row.code] = Math.round(Number(v) * 10000) / 10000;
            macroData.centralBankMeta[row.code] = { label: row.label, series: used };
          }
          // Pace FRED so long sequential batches don't 429 mid-loop
          await new Promise((r) => setTimeout(r, 80));
        }
      } catch (e) { console.warn('[Bonds] central bank rates:', e.message || e); }
    }

    // Fed Balance Sheet History (for charting). WALCL and M2SL are the two
    // FRED series Akamai's WAF blocks most often from this network — if the
    // live fetch fails, walk back through historical caches and pick the
    // most recent one that actually has the field. Without the per-field
    // walkback, today's failed cache shadows yesterday's good cache.
    trackApiCall('FRED');
    const fedBalanceHistory = await fetchFredHistory('WALCL', FRED_API_KEY, 52).catch(e => { console.warn('[Bonds] WALCL:', e.message || e); _errors.fedBalanceSheetHistory = e.message; return null; });
    let fedBalanceSheetHistory = null;
    if (fedBalanceHistory?.length > 0) {
      fedBalanceSheetHistory = {
        dates: fedBalanceHistory.map(p => dateToMonthLabel(p.date)),
        values: fedBalanceHistory.map(p => p.value / 1000), // Convert to trillions
      };
    } else {
      const fb = await readLatestCacheWithFieldAsync('bonds', 'fedBalanceSheetHistory.dates');
      if (fb?.data?.fedBalanceSheetHistory?.dates?.length) {
        fedBalanceSheetHistory = fb.data.fedBalanceSheetHistory;
        console.warn(`[Bonds] WALCL fallback to cache fetched ${fb.fetchedOn}`);
      }
    }

    // M2 History (for charting)
    trackApiCall('FRED');
    const m2History = await fetchFredHistory('M2SL', FRED_API_KEY, 52).catch(e => { console.warn('[Bonds] M2SL:', e.message || e); _errors.m2HistoryData = e.message; return null; });
    let m2HistoryData = null;
    if (m2History?.length > 0) {
      m2HistoryData = {
        dates: m2History.map(p => dateToMonthLabel(p.date)),
        values: m2History.map(p => p.value / 1000), // Convert to trillions
      };
    } else {
      const fb = await readLatestCacheWithFieldAsync('bonds', 'm2HistoryData.dates');
      if (fb?.data?.m2HistoryData?.dates?.length) {
        m2HistoryData = fb.data.m2HistoryData;
        console.warn(`[Bonds] M2SL fallback to cache fetched ${fb.fetchedOn}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TREASURY AUCTION RESULTS
    // ═══════════════════════════════════════════════════════════════════════
    let auctionData = null;
    try {
      // Treasury Fiscal Data renamed `accounting/od/auctions` →
      // `auctions_query` and moved everything under `/fiscal_service/v1/`
      // — the old path now 404s. Use the new endpoint.
      // Treasury Fiscal Data renamed `high_discount_rate` → `high_discnt_rate`
      // (without the 'ou'). Sending the old name now triggers a 400.
      const auctionUrl = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query' +
        '?filter=security_type:eq:Bill' +
        '&fields=record_date,security_term,security_type,high_investment_rate,high_discnt_rate,bid_to_cover_ratio' +
        '&sort=-record_date&page%5Bsize%5D=10';
      trackApiCall('Treasury Fiscal Data');
      const auctionResp = await fetchJSON(auctionUrl);
      const records = auctionResp?.data || [];
      if (records.length > 0) {
        auctionData = records.slice(0, 6).map(r => ({
          date: r.record_date,
          term: r.security_term,
          type: r.security_type,
          yield: r.high_investment_rate ? parseFloat(r.high_investment_rate) : (r.high_discnt_rate ? parseFloat(r.high_discnt_rate) : null),
          bidToCover: r.bid_to_cover_ratio ? parseFloat(r.bid_to_cover_ratio) : null,
        }));
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // DURATION LADDER — US Treasury outstanding debt by maturity bucket
    // ═══════════════════════════════════════════════════════════════════════
    let durationLadder = null;
    try {
      const mspdSummary = await fetchJSON('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/debt/mspd/mspd_table_1?sort=-record_date&page[size]=20&fields=record_date,security_class_desc,debt_held_public_mil_amt').catch(() => null);
      trackApiCall('Treasury Fiscal Data');

      const summaryDate = mspdSummary?.data?.[0]?.record_date;
      if (!summaryDate) throw new Error('No MSPD summary date');

      const [mspdDetail, avgRates] = await Promise.all([
        fetchJSON(`https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/debt/mspd/mspd_table_5?filter=record_date:eq:${summaryDate}&page[size]=500&fields=record_date,security_class1_desc,maturity_date,outstanding_amt`).catch(() => null),
        fetchJSON(`https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?filter=record_date:eq:${summaryDate}&page[size]=50&fields=record_date,security_desc,avg_interest_rate_amt`).catch(() => null),
      ]);

      const now = new Date();
      const cutoff2y = new Date(now); cutoff2y.setFullYear(cutoff2y.getFullYear() + 2);
      const cutoff5y = new Date(now); cutoff5y.setFullYear(cutoff5y.getFullYear() + 5);
      const cutoff10y = new Date(now); cutoff10y.setFullYear(cutoff10y.getFullYear() + 10);

      let billsAmt = 0, frnAmt = 0, tipsAmt = 0, bondsAmt = 0;
      let notes_0_2 = 0, notes_2_5 = 0, notes_5_10 = 0, notes_10plus = 0;

      if (mspdSummary?.data) {
        for (const row of mspdSummary.data) {
          if (row.record_date !== summaryDate) continue;
          const amt = parseFloat(row.debt_held_public_mil_amt) || 0;
          const cls = row.security_class_desc || '';
          if (cls === 'Bills') billsAmt = amt;
          else if (cls === 'FRNs') frnAmt = amt;
          else if (cls === 'TIPS') tipsAmt = amt;
          else if (cls === 'Bonds') bondsAmt = amt;
        }
      }

      let detailDate = summaryDate;
      if (mspdDetail?.data) {
        detailDate = mspdDetail.data[0]?.record_date || detailDate;
        for (const row of mspdDetail.data) {
          if (row.record_date !== detailDate) continue;
          const amt = (parseFloat(row.outstanding_amt) || 0) / 1e3;
          const matStr = row.maturity_date;
          if (!matStr || matStr === 'null') continue;
          const matDate = new Date(matStr + 'T00:00:00Z');
          const cls = row.security_class1_desc || '';
          if (cls === 'Treasury Notes') {
            if (matDate <= cutoff2y) notes_0_2 += amt;
            else if (matDate <= cutoff5y) notes_2_5 += amt;
            else if (matDate <= cutoff10y) notes_5_10 += amt;
            else notes_10plus += amt;
          }
        }
      }

      const b0 = Math.round(billsAmt + frnAmt + notes_0_2);
      const b1 = Math.round(notes_2_5);
      const b2 = Math.round(notes_5_10);
      const b3 = Math.round(bondsAmt + notes_10plus);
      const total = b0 + b1 + b2 + b3;

      let rateMap = {};
      if (avgRates?.data) {
        const rateDate = avgRates.data[0]?.record_date;
        for (const row of avgRates.data) {
          if (row.record_date !== rateDate) continue;
          rateMap[row.security_desc] = parseFloat(row.avg_interest_rate_amt) || 0;
        }
      }

      if (total > 0) {
        durationLadder = {
          asOf: detailDate || summaryDate,
          buckets: [
            { bucket: '0\u20132y', amount: b0, pct: Math.round(b0 / total * 1000) / 10, rate: rateMap['Treasury Bills'] || rateMap['Treasury Floating Rate Notes (FRN)'] || null },
            { bucket: '2\u20135y', amount: b1, pct: Math.round(b1 / total * 1000) / 10, rate: rateMap['Treasury Notes'] || null },
            { bucket: '5\u201310y', amount: b2, pct: Math.round(b2 / total * 1000) / 10, rate: rateMap['Treasury Notes'] || null },
            { bucket: '10y+',  amount: b3, pct: Math.round(b3 / total * 1000) / 10, rate: rateMap['Treasury Bonds'] || null },
          ],
          total,
          avgRate: rateMap['Total Marketable'] || null,
        };
      }
    } catch (e) { console.warn('[Bonds] Duration ladder:', e.message || e); _errors.durationLadder = e.message; }

    // ═══════════════════════════════════════════════════════════════════════
    // NATIONAL DEBT (from FRED GFDEBTN)
    // ═══════════════════════════════════════════════════════════════════════
    let nationalDebt = null;
    try {
      trackApiCall('FRED');
      const debtData = await fetchFredLatest('GFDEBTN', FRED_API_KEY);
      if (debtData != null) {
        nationalDebt = debtData / 1e6; // GFDEBTN is in millions, convert to trillions
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); _errors.nationalDebt = e.message; }

    // ═══════════════════════════════════════════════════════════════════════
    // TREASURY RATES (from FRED — average interest rates)
    // ═══════════════════════════════════════════════════════════════════════
    let treasuryRates = null;
    try {
      trackApiCall('FRED');
      // Spot Treasury yields keyed by tenor — the Bonds dashboard's KPI
      // strip reads `treasuryRates.US3M / US2Y / US10Y / US30Y`. Pull from
      // usYields (already fetched from FRED's daily series DGS3MO/DGS2/
      // DGS10/DGS30) instead of the monthly TB3MS/GS10/GS30 average series
      // which were a different semantic and stored under bills/notes/bonds.
      const tbills = await fetchFredLatest('TB3MS', FRED_API_KEY);
      const tnotes = await fetchFredLatest('GS10', FRED_API_KEY);
      const tbonds = await fetchFredLatest('GS30', FRED_API_KEY);
      const us = usYields || {};
      // Always publish US* keys the KPI cards read — fall back to monthly
      // GS*/TB* averages when daily DGS* is missing (never leave US10Y null
      // while notes/GS10 has a real value).
      const us3m = us['3m'] ?? tbills ?? null;
      const us2y = us['2y'] ?? null;
      const us5y = us['5y'] ?? null;
      const us10y = us['10y'] ?? tnotes ?? null;
      const us30y = us['30y'] ?? tbonds ?? null;
      if (us3m != null || us2y != null || us5y != null || us10y != null || us30y != null
          || tbills != null || tnotes != null || tbonds != null) {
        treasuryRates = {
          US3M:  us3m,
          US2Y:  us2y,
          US5Y:  us5y,
          US10Y: us10y,
          US30Y: us30y,
          '0–2y':  us2y  ?? tbills ?? null,
          '2–5y':  us5y  ?? null,
          '5–10y': us10y ?? tnotes ?? null,
          '10y+':  us30y ?? tbonds ?? null,
          fedFunds: us3m ?? null,
          bills: tbills,
          notes: tnotes,
          bonds: tbonds,
        };
        // Keep yieldCurveData.US in sync for the sidebar Key Metrics card
        if (yieldCurveData?.US) {
          if (yieldCurveData.US['3m'] == null && us3m != null) yieldCurveData.US['3m'] = us3m;
          if (yieldCurveData.US['2y'] == null && us2y != null) yieldCurveData.US['2y'] = us2y;
          if (yieldCurveData.US['5y'] == null && us5y != null) yieldCurveData.US['5y'] = us5y;
          if (yieldCurveData.US['10y'] == null && us10y != null) yieldCurveData.US['10y'] = us10y;
          if (yieldCurveData.US['30y'] == null && us30y != null) yieldCurveData.US['30y'] = us30y;
        }
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); _errors.treasuryRates = e.message; }

    // ═══════════════════════════════════════════════════════════════════════
    // ECB YIELD CURVE (Euro area sovereign yields)
    // ═══════════════════════════════════════════════════════════════════════
    let ecbYieldCurve = null;
    try {
      trackApiCall('ECB');
      ecbYieldCurve = await fetchECBYieldCurve();
    } catch (e) { console.warn('[Bonds]', e.message || e); _errors.ecbYieldCurve = e.message; }
    // Fallbacks when ECB SDMX is down: DE sovereign curve already fetched,
    // then a couple of FRED euro-area / Germany series.
    if (!ecbYieldCurve || Object.keys(ecbYieldCurve).length < 3) {
      const deCurve = yieldCurveData?.DE;
      if (deCurve && typeof deCurve === 'object' && Object.keys(deCurve).length >= 2) {
        ecbYieldCurve = { ...deCurve, _proxy: 'DE_sovereign_curve' };
      }
    }
    if (!ecbYieldCurve || Object.keys(ecbYieldCurve).filter(k => !k.startsWith('_')).length < 2) {
      try {
        if (FRED_API_KEY) {
          const euroTenors = {
            '3m': 'IR3TIB01EZM156N',
            '10y': 'IRLTLT01DEM156N',
          };
          const out = { ...(ecbYieldCurve || {}) };
          for (const [tenor, sid] of Object.entries(euroTenors)) {
            if (out[tenor] != null) continue;
            try {
              trackApiCall('FRED');
              const v = await fetchFredLatest(sid, FRED_API_KEY);
              if (v != null) out[tenor] = v;
            } catch { /* skip */ }
          }
          if (Object.keys(out).filter(k => !k.startsWith('_')).length >= 2) {
            out._proxy = out._proxy || 'FRED_euro_rates';
            ecbYieldCurve = out;
          }
        }
      } catch (e) {
        console.warn('[Bonds] ECB yield FRED fallback failed:', e.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD RESULT
    // ═══════════════════════════════════════════════════════════════════════
    const result = {
      // Core yield data
      yieldCurveData,
      tipsYields,
      realYieldHistory,
      spreadData,
      spreadIndicators: Object.keys(spreadIndicators).length > 0 ? spreadIndicators : null,
      spreadHistory,
      creditIndices,
      breakevensData,
      fredYieldHistory,
      yieldHistory,
      fedFundsFutures,
      mortgageSpread,
      treasuryRates,

      // New: CPI components
      cpiComponents,
      debtToGdpHistory,

      // Macro indicators
      macroData,
      fedBalanceSheetHistory,
      m2HistoryData,

      // Treasury data
      auctionData,
      nationalDebt,

      // ECB yield curve
      ecbYieldCurve,

      // Sovereign credit ratings
      creditRatings: SOVEREIGN_RATINGS,

      // Duration ladder
      durationLadder,
      countryCount: Object.keys(yieldCurveData).length,
    };
    return result;
  }
}));

export default router;

