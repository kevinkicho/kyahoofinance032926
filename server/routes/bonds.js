import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

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

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: '5' });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: String(limit) });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
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

function buildSourcesFromData(d) {
  return {
    'US Treasury Yields': d.yieldCurveData && d.yieldCurveData.US && Object.keys(d.yieldCurveData.US).length > 0,
    'International 10Y Yields': d.yieldCurveData && Object.keys(d.yieldCurveData).length > 1,
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
  };
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'bonds_data';
  const today = todayStr();

  const daily = readDailyCache('bonds');
  if (daily) {
    const sources = buildSourcesFromData(daily);
    return res.json({ ...daily, fetchedOn: today, isCurrent: true, _sources: sources });
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    const sources = buildSourcesFromData(cached);
    return res.json({ ...cached, fetchedOn: today, isCurrent: true, _sources: sources });
  }

  if (!FRED_API_KEY) return res.status(503).json({ error: 'FRED_API_KEY not configured' });

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // US TREASURY YIELD CURVE (Full Tenors)
    // ═══════════════════════════════════════════════════════════════════════
    trackApiCall('FRED');
    console.log('[Bonds] Fetching US Treasury yields...');
    const usEntries = await Promise.allSettled(
      Object.entries(TENOR_SERIES).map(async ([tenor, sid]) => {
        try { const v = await fetchFredLatest(sid, FRED_API_KEY); return [tenor, v]; }
        catch (e) { console.warn('[Bonds] FRED', sid, 'failed:', e.message); return [tenor, null]; }
      })
    );
    const usYields = {};
    usEntries.forEach(r => { if (r.status === 'fulfilled' && r.value[1] != null) usYields[r.value[0]] = r.value[1]; });

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
      fetchFredHistory('DFII5', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
      fetchFredHistory('DFII10', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
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

    const igArr  = (spreadRaw.IG  || []).slice(-12);
    const hyArr  = (spreadRaw.HY  || []).slice(-12);
    const emArr  = (spreadRaw.EM  || []).slice(-12);
    const bbbArr = (spreadRaw.BBB || []).slice(-12);
    const anchorArr = igArr.length === 12 ? igArr : (hyArr.length === 12 ? hyArr : []);
    const spreadData = anchorArr.length === 12 ? {
      dates: anchorArr.map(p => dateToMonthLabel(p.date)),
      IG:    igArr.length  === 12 ? igArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      HY:    hyArr.length  === 12 ? hyArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      EM:    emArr.length  === 12 ? emArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      BBB:   bbbArr.length === 12 ? bbbArr.map(p => Math.round(p.value))  : anchorArr.map(() => null),
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
    const FED_FUTURES_SERIES = { m1: 'FF1', m2: 'FF2', m3: 'FF3', m4: 'FF4', m5: 'FF5', m6: 'FF6' };

    trackApiCall('FRED');
    const [indicatorEntries, fedFuturesEntries, mortgage30yRaw] = await Promise.all([
      Promise.allSettled(
        Object.entries(SPREAD_INDICATOR_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid, FRED_API_KEY)])
      ),
      Promise.allSettled(
        Object.entries(FED_FUTURES_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid, FRED_API_KEY)])
      ),
      fetchFredLatest('MORTGAGE30US', FRED_API_KEY).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
    ]);

    const spreadIndicators = {};
    indicatorEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) spreadIndicators[r.value[0]] = r.value[1];
    });

    const fedFundsFuturesRaw = {};
    fedFuturesEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) fedFundsFuturesRaw[r.value[0]] = r.value[1];
    });
    const fedFundsFutures = Object.keys(fedFundsFuturesRaw).length > 0 ? fedFundsFuturesRaw : null;

    const mortgageSpread = (mortgage30yRaw != null && usYields['10y'] != null)
      ? Math.round((mortgage30yRaw - usYields['10y']) * 100) / 100
      : null;

    // ═══════════════════════════════════════════════════════════════════════
    // YIELD CURVE SPREAD HISTORY (for charting)
    // ═══════════════════════════════════════════════════════════════════════
    let spreadHistory = null;
    try {
      trackApiCall('FRED');
      const [t10y2yHist, t10y3mHist, t5y30yHist] = await Promise.all([
        fetchFredHistory('T10Y2Y', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('T10Y3M', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
        fetchFredHistory('T5Y30', FRED_API_KEY, 252).catch(e => { console.warn('[Bonds]', e.message || e); return null; }),
      ]);

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

    // Fed Balance Sheet History (for charting)
    trackApiCall('FRED');
    const fedBalanceHistory = await fetchFredHistory('WALCL', FRED_API_KEY, 52).catch(e => { console.warn('[Bonds]', e.message || e); return null; });
    let fedBalanceSheetHistory = null;
    if (fedBalanceHistory?.length > 0) {
      fedBalanceSheetHistory = {
        dates: fedBalanceHistory.map(p => dateToMonthLabel(p.date)),
        values: fedBalanceHistory.map(p => p.value / 1000), // Convert to trillions
      };
    }

    // M2 History (for charting)
    trackApiCall('FRED');
    const m2History = await fetchFredHistory('M2SL', FRED_API_KEY, 52).catch(e => { console.warn('[Bonds]', e.message || e); return null; });
    let m2HistoryData = null;
    if (m2History?.length > 0) {
      m2HistoryData = {
        dates: m2History.map(p => dateToMonthLabel(p.date)),
        values: m2History.map(p => p.value / 1000), // Convert to trillions
      };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TREASURY AUCTION RESULTS
    // ═══════════════════════════════════════════════════════════════════════
    let auctionData = null;
    try {
      const auctionUrl = 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/auctions' +
        '?filter=security_type:eq:Bill' +
        '&fields=record_date,security_term,security_type,high_investment_rate,high_discount_rate,bid_to_cover_ratio' +
        '&sort=-record_date&page%5Bsize%5D=10';
      trackApiCall('Treasury Fiscal Data');
      const auctionResp = await fetchJSON(auctionUrl);
      const records = auctionResp?.data || [];
      if (records.length > 0) {
        auctionData = records.slice(0, 6).map(r => ({
          date: r.record_date,
          term: r.security_term,
          type: r.security_type,
          yield: r.high_investment_rate ? parseFloat(r.high_investment_rate) : (r.high_discount_rate ? parseFloat(r.high_discount_rate) : null),
          bidToCover: r.bid_to_cover_ratio ? parseFloat(r.bid_to_cover_ratio) : null,
        }));
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

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
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // TREASURY RATES (from FRED — average interest rates)
    // ═══════════════════════════════════════════════════════════════════════
    let treasuryRates = null;
    try {
      trackApiCall('FRED');
      const tbills = await fetchFredLatest('TB3MS', FRED_API_KEY);
      const tnotes = await fetchFredLatest('GS10', FRED_API_KEY);
      const tbonds = await fetchFredLatest('GS30', FRED_API_KEY);
      if (tbills != null || tnotes != null || tbonds != null) {
        treasuryRates = {
          fedFunds: usYields && usYields['3m'] ? usYields['3m'] : null,
          bills: tbills,
          notes: tnotes,
          bonds: tbonds,
        };
      }
    } catch (e) { console.warn('[Bonds]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // ECB YIELD CURVE (Euro area sovereign yields)
    // ═══════════════════════════════════════════════════════════════════════
    let ecbYieldCurve = null;
    try {
      trackApiCall('ECB');
      ecbYieldCurve = await fetchECBYieldCurve();
    } catch (e) { console.warn('[Bonds]', e.message || e); }

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

      // Metadata
      lastUpdated: today,
      countryCount: Object.keys(yieldCurveData).length,
    };

    writeDailyCache('bonds', result);
    cache.set(cacheKey, result, 900);

    const sources = {
      'US Treasury Yields': usYields && Object.keys(usYields).length > 0,
      'International 10Y Yields': Object.keys(yieldCurveData).length > 1,
      'TIPS Real Yields': tipsYields && Object.keys(tipsYields).length > 0,
      'Credit Spreads (IG/HY/EM/BBB)': spreadData && spreadData.dates && spreadData.dates.length > 0,
      'Spread Indicators': spreadIndicators && Object.keys(spreadIndicators).length > 0,
      'Fed Funds Futures': fedFundsFutures && Object.keys(fedFundsFutures).length > 0,
      'Yield Curve History': yieldHistory && yieldHistory.dates && yieldHistory.dates.length > 0,
      'Breakevens': breakevensData && breakevensData.history && breakevensData.history.dates && breakevensData.history.dates.length > 0,
      'Macro Indicators (Fed BS, M2, Debt, Unemp, GDP)': macroData && Object.keys(macroData).length > 0,
      'Fed Balance Sheet History': fedBalanceSheetHistory && fedBalanceSheetHistory.dates && fedBalanceSheetHistory.dates.length > 0,
      'M2 Money Supply History': m2HistoryData && m2HistoryData.dates && m2HistoryData.dates.length > 0,
      'CPI Components': cpiComponents && cpiComponents.dates && cpiComponents.dates.length > 0,
      'Debt-to-GDP History': debtToGdpHistory && debtToGdpHistory.dates && debtToGdpHistory.dates.length > 0,
      'Curve Spread History': spreadHistory && spreadHistory.dates && spreadHistory.dates.length > 0,
      'Treasury Auctions': auctionData && auctionData.length > 0,
      'National Debt': nationalDebt != null,
      'Treasury Rates': treasuryRates != null,
      'Mortgage Spread': mortgageSpread != null,
      'Credit Indices (AAA/BAA)': creditIndices && Object.keys(creditIndices).length > 0,
      'ECB Yield Curve': ecbYieldCurve != null && Object.keys(ecbYieldCurve).length > 0,
    };

    res.json({ ...result, fetchedOn: today, isLive: true, _sources: sources });
  } catch (error) {
    console.error('Bonds API error:', error);
    const fallback = readLatestCache('bonds');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isLive: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

