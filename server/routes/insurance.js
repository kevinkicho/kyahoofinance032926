import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const INSURER_TICKERS = ['PGR', 'ALL', 'TRV', 'HIG'];
const INSURER_NAMES = { PGR: 'Progressive', ALL: 'Allstate', TRV: 'Travelers', HIG: 'Hartford' };

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'insurance_data';
  const today = todayStr();

  const daily = readDailyCache('insurance');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  function formatQuarter(unixTs) {
    const d = new Date(unixTs * 1000);
    const month = d.getUTCMonth() + 1;
    const q = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';
    const yr = String(d.getUTCFullYear()).slice(-2);
    return `${q} ${yr}`;
  }

  trackApiCall('Yahoo Finance');
  const summaryResults = await Promise.allSettled(
    INSURER_TICKERS.map(ticker =>
      yf.quoteSummary(ticker, {
        modules: ['incomeStatementHistoryQuarterly', 'balanceSheetHistoryQuarterly']
      }).then(data => ({ ticker, data })).catch(e => { throw e; })
    )
  );

  const successfulSummaries = summaryResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  if (successfulSummaries.length === 0) {
    return res.status(500).json({ error: 'Failed to fetch insurer financial data' });
  }

  const allQuarterSets = {};
  const reserveLines = [];
  const reserveReserves = [];
  const reserveRequired = [];
  const reserveAdequacy = [];

  for (const { ticker, data } of successfulSummaries) {
    const name = INSURER_NAMES[ticker] || ticker;

    const stmts = data?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
    const valid = stmts
      .filter(e => e.totalRevenue?.raw && e.totalRevenue.raw !== 0)
      .map(e => ({
        ts: e.endDate?.raw,
        label: formatQuarter(e.endDate?.raw),
        ratio: Math.round(((e.totalRevenue.raw - (e.operatingIncome?.raw || 0)) / e.totalRevenue.raw) * 1000) / 10
      }))
      .sort((a, b) => a.ts - b.ts);

    const last8 = valid.slice(-8);
    allQuarterSets[name] = last8;

    const bsStmts = data?.balanceSheetHistoryQuarterly?.balanceSheetStatements || [];
    if (bsStmts.length > 0) {
      const latest = bsStmts[0];
      const reserves = Math.round((latest.totalLiab?.raw || 0) / 1e6);
      const required = Math.round(reserves * 0.90);
      const adequacy = required > 0 ? Math.round((reserves / required) * 1000) / 10 : 0;
      reserveLines.push(name);
      reserveReserves.push(reserves);
      reserveRequired.push(required);
      reserveAdequacy.push(adequacy);
    }
  }

  let masterQuarters = [];
  for (const entries of Object.values(allQuarterSets)) {
    if (entries.length > masterQuarters.length) {
      masterQuarters = entries.map(e => e.label);
    }
  }

  const combinedLines = {};
  for (const [name, entries] of Object.entries(allQuarterSets)) {
    const labelMap = {};
    entries.forEach(e => { labelMap[e.label] = e.ratio; });
    combinedLines[name] = masterQuarters.map(q => labelMap[q] !== undefined ? labelMap[q] : null);
    while (combinedLines[name].length < 8) combinedLines[name].unshift(null);
  }
  while (masterQuarters.length < 8) masterQuarters.unshift('');

  const combinedRatioData = {
    quarters: masterQuarters,
    lines: combinedLines,
  };

  const reserveAdequacyData = {
    lines: reserveLines,
    reserves: reserveReserves,
    required: reserveRequired,
    adequacy: reserveAdequacy,
  };

  let reinsurers = [];
  try {
    trackApiCall('Yahoo Finance');
    const reinsurerQuotes = await yf.quote(['RNR', 'ACGL', 'AXS']);
    const arr = Array.isArray(reinsurerQuotes) ? reinsurerQuotes : [reinsurerQuotes];
    reinsurers = arr
      .filter(q => q)
      .map(q => ({
        ticker: q.symbol,
        price: q.regularMarketPrice,
        changePct: q.regularMarketChangePercent,
        name: q.shortName,
      }));
  } catch (e) {
    console.warn('Reinsurer quote fetch failed:', e.message);
  }

  let hyOAS = null;
  let igOAS = null;
  if (FRED_API_KEY) {
    const fredBase = `https://api.stlouisfed.org/fred/series/observations?api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc&series_id=`;
    try {
      trackApiCall('FRED');
      const hyData = await fetchJSON(`${fredBase}BAMLH0A0HYM2`);
      const hyVal = parseFloat(hyData?.observations?.[0]?.value);
      hyOAS = isNaN(hyVal) ? null : hyVal;
    } catch (e) {
      console.warn('FRED HY OAS fetch failed:', e.message);
    }
    try {
      trackApiCall('FRED');
      const igData = await fetchJSON(`${fredBase}BAMLC0A0CM`);
      const igVal = parseFloat(igData?.observations?.[0]?.value);
      igOAS = isNaN(igVal) ? null : igVal;
    } catch (e) {
      console.warn('FRED IG OAS fetch failed:', e.message);
    }
  }

  let fredHyOasHistory = null;
  if (FRED_API_KEY) {
    try {
      trackApiCall('FRED');
      const hyHist = await fetchFredHistory('BAMLH0A0HYM2', FRED_API_KEY, 252);
      if (hyHist.length >= 20) {
        fredHyOasHistory = {
          dates: hyHist.map(p => p.date),
          values: hyHist.map(p => Math.round(p.value * 100) / 100),
        };
      }
    } catch { /* use null */ }
  }

  let sectorETF = null;
  try {
    trackApiCall('Yahoo Finance');
    const kieQuote = await yf.quote(['KIE']);
    const kieArr = Array.isArray(kieQuote) ? kieQuote : [kieQuote];
    const kq = kieArr.find(q => q?.symbol === 'KIE');
    if (kq?.regularMarketPrice) {
      sectorETF = {
        price:     Math.round(kq.regularMarketPrice * 100) / 100,
        changePct: Math.round((kq.regularMarketChangePercent ?? 0) * 10000) / 100,
        high52w:   kq.fiftyTwoWeekHigh  != null ? Math.round(kq.fiftyTwoWeekHigh  * 100) / 100 : null,
        low52w:    kq.fiftyTwoWeekLow   != null ? Math.round(kq.fiftyTwoWeekLow   * 100) / 100 : null,
        sma50:     kq.fiftyDayAverage   != null ? Math.round(kq.fiftyDayAverage   * 100) / 100 : null,
      };
    }
  } catch { /* use null */ }

  let catBondProxy = null;
  try {
    trackApiCall('Yahoo Finance');
    const shrxQuote = await yf.quote(['SHRX']);
    const shrxArr = Array.isArray(shrxQuote) ? shrxQuote : [shrxQuote];
    const sq = shrxArr.find(q => q?.symbol === 'SHRX');
    if (sq?.regularMarketPrice) {
      catBondProxy = {
        ticker:    'SHRX',
        price:     Math.round(sq.regularMarketPrice * 100) / 100,
        changePct: Math.round((sq.regularMarketChangePercent ?? 0) * 10000) / 100,
      };
    }
  } catch { /* try ILS */ }

  if (!catBondProxy) {
    try {
      trackApiCall('Yahoo Finance');
      const ilsQuote = await yf.quote(['ILS']);
      const ilsArr = Array.isArray(ilsQuote) ? ilsQuote : [ilsQuote];
      const iq = ilsArr.find(q => q?.symbol === 'ILS');
      if (iq?.regularMarketPrice) {
        catBondProxy = {
          ticker:    'ILS',
          price:     Math.round(iq.regularMarketPrice * 100) / 100,
          changePct: Math.round((iq.regularMarketChangePercent ?? 0) * 10000) / 100,
        };
      }
    } catch { /* use null */ }
  }

  let industryAvgCombinedRatio = null;
  try {
    const latestRatios = Object.values(combinedRatioData.lines)
      .map(arr => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] != null) return arr[i];
        }
        return null;
      })
      .filter(v => v != null);
    if (latestRatios.length > 0) {
      const avg = latestRatios.reduce((s, v) => s + v, 0) / latestRatios.length;
      industryAvgCombinedRatio = Math.round(avg * 10) / 10;
    }
  } catch { /* use null */ }

  let treasury10y = null;
  if (FRED_API_KEY) {
    try { trackApiCall('FRED'); treasury10y = await fetchFredLatest('DGS10', FRED_API_KEY); } catch { /* use null */ }
  }

  // Natural Catastrophe Losses (FRED NPORCT)
  let catLosses = null;
  if (FRED_API_KEY) {
    try {
      trackApiCall('FRED');
      const catHist = await fetchFredHistory('NPORCT', FRED_API_KEY, 60);
      if (catHist.length >= 12) {
        catLosses = {
          dates: catHist.map(p => p.date.slice(0, 7)),
          values: catHist.map(p => Math.round(p.value * 10) / 10),
        };
      }
    } catch { /* use null */ }
  }

  // Combined Ratio History (calculated from existing data)
  const combinedRatioHistory = combinedRatioData?.quarters?.length && combinedRatioData?.lines
    ? {
        quarters: combinedRatioData.quarters,
        values: combinedRatioData.quarters.map((_, qIdx) => {
          const ratios = Object.values(combinedRatioData.lines)
            .map(arr => arr[qIdx])
            .filter(v => v != null);
          return ratios.length ? Math.round(ratios.reduce((s, v) => s + v, 0) / ratios.length * 10) / 10 : null;
        }),
      }
    : null;

  const result = {
    combinedRatioData,
    reserveAdequacyData,
    reinsurers,
    hyOAS,
    igOAS,
    fredHyOasHistory,
    sectorETF,
    catBondProxy,
    industryAvgCombinedRatio,
    treasury10y,
    catLosses,
    combinedRatioHistory,
    lastUpdated: today,
  };

  writeDailyCache('insurance', result);
  cache.set(cacheKey, result, 900);
  res.json({ ...result, fetchedOn: today, isCurrent: true });
});

export default router;
