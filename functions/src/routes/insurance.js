import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory, fetchFredLatest } from '../lib/fred.js';

const router = Router();

const INSURER_TICKERS = ['PGR', 'ALL', 'TRV', 'HIG'];
const INSURER_NAMES = { PGR: 'Progressive', ALL: 'Allstate', TRV: 'Travelers', HIG: 'Hartford' };

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'insurance_data';
  const today = todayStr();

  const daily = readDailyCache('insurance');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  const _errors = {};

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

  summaryResults.forEach(r => {
    if (r.status === 'rejected') {
      _errors.combinedRatioData = r.reason?.message || 'Insurer financial fetch failed';
      _errors.reserveAdequacyData = r.reason?.message || 'Insurer financial fetch failed';
    }
  });

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
      .map(e => {
        const premiums = e.totalRevenue.raw;
        const costOfRevenue = e.costOfRevenue?.raw;
        const operatingExpense = e.operatingExpense?.raw;
        let ratio;
        let method;
        if (costOfRevenue != null && operatingExpense != null) {
          ratio = ((costOfRevenue + operatingExpense) / premiums) * 100;
          method = 'combinedRatio';
        } else if (costOfRevenue != null) {
          ratio = (costOfRevenue / premiums) * 100;
          method = 'lossRatioOnly';
        } else {
          ratio = ((premiums - (e.operatingIncome?.raw || 0)) / premiums) * 100;
          method = 'lossRatioEstimate';
        }
        return {
          ts: e.endDate?.raw,
          label: formatQuarter(e.endDate?.raw),
          ratio: Math.round(ratio * 10) / 10,
          method,
        };
      })
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
  const lineMethods = {};
  for (const [name, entries] of Object.entries(allQuarterSets)) {
    const labelMap = {};
    const methodMap = {};
    entries.forEach(e => { labelMap[e.label] = e.ratio; methodMap[e.label] = e.method; });
    combinedLines[name] = masterQuarters.map(q => labelMap[q] !== undefined ? labelMap[q] : null);
    lineMethods[name] = masterQuarters.map(q => methodMap[q] || null);
    while (combinedLines[name].length < 8) { combinedLines[name].unshift(null); lineMethods[name].unshift(null); }
  }
  while (masterQuarters.length < 8) masterQuarters.unshift('');

  const allMethods = Object.values(lineMethods).flat().filter(m => m != null);
  const ratioMethod = allMethods.includes('combinedRatio') ? 'combinedRatio' : allMethods.includes('lossRatioOnly') ? 'lossRatioOnly' : 'lossRatioEstimate';

  const combinedRatioData = {
    quarters: masterQuarters,
    lines: combinedLines,
    ratioMethod,
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
    _errors.reinsurers = e.message;
  }

  let hyOAS = null;
  let igOAS = null;
  if (FRED_API_KEY) {
    try {
      trackApiCall('FRED');
      hyOAS = await fetchFredLatest('BAMLH0A0HYM2', FRED_API_KEY);
    } catch (e) {
      console.warn('FRED HY OAS fetch failed:', e.message);
      _errors.hyOAS = e.message;
    }
    try {
      trackApiCall('FRED');
      igOAS = await fetchFredLatest('BAMLC0A0CM', FRED_API_KEY);
    } catch (e) {
      console.warn('FRED IG OAS fetch failed:', e.message);
      _errors.igOAS = e.message;
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
    } catch (e) { console.warn('[Insurance]', e.message || e); _errors.fredHyOasHistory = e.message; }
  }

  let sectorETF = null;
  try {
    trackApiCall('Yahoo Finance');
    const kieQuote = await yf.quote(['KIE']);
    const kieArr = Array.isArray(kieQuote) ? kieQuote : [kieQuote];
    const kq = kieArr.find(q => q?.symbol === 'KIE');
    if (kq?.regularMarketPrice) {
      // yahoo-finance2's regularMarketChangePercent is already in percent
      // (e.g. -0.94 for -0.94%), not a fraction. Earlier code multiplied by
      // 10000 — meant to be `× 100` for 2-decimal rounding — and rendered
      // KIE as -94.19% per day. Use × 100 / 100 to round to 2 decimals.
      sectorETF = {
        price:     Math.round(kq.regularMarketPrice * 100) / 100,
        changePct: Math.round((kq.regularMarketChangePercent ?? 0) * 100) / 100,
        high52w:   kq.fiftyTwoWeekHigh  != null ? Math.round(kq.fiftyTwoWeekHigh  * 100) / 100 : null,
        low52w:    kq.fiftyTwoWeekLow   != null ? Math.round(kq.fiftyTwoWeekLow   * 100) / 100 : null,
        sma50:     kq.fiftyDayAverage   != null ? Math.round(kq.fiftyDayAverage   * 100) / 100 : null,
      };
    }
  } catch (e) { console.warn('[Insurance]', e.message || e); _errors.sectorETF = e.message; }

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
        changePct: Math.round((sq.regularMarketChangePercent ?? 0) * 100) / 100,
      };
    }
  } catch (e) { console.warn('[Insurance]', e.message || e); _errors.catBondProxy = e.message; }

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
          changePct: Math.round((iq.regularMarketChangePercent ?? 0) * 100) / 100,
        };
      }
    } catch (e) { console.warn('[Insurance]', e.message || e); _errors.catBondProxy = e.message; }
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
  } catch (e) { console.warn('[Insurance]', e.message || e); _errors.industryAvgCombinedRatio = e.message; }

  let treasury10y = null;
  if (FRED_API_KEY) {
    try { trackApiCall('FRED'); treasury10y = await fetchFredLatest('DGS10', FRED_API_KEY); } catch (e) { console.warn('[Insurance]', e.message || e); _errors.treasury10y = e.message; }
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
    } catch (e) { console.warn('[Insurance]', e.message || e); _errors.catLosses = e.message; }
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

  // Reinsurance pricing
  let reinsurancePricing = [];

  // Cat bond / ILS spread proxy panel. The pure cat bond market is OTC
  // and there's no free public spread feed. We surface the closest public
  // proxies — the SHRX/ILS ETFs (cat bond / insurance-linked securities)
  // and HY/IG OAS as risk-spread benchmarks — so the panel binds rather
  // than rendering empty.
  let catBondSpreads = [];
  if (catBondProxy?.ticker && typeof catBondProxy.changePct === 'number') {
    catBondSpreads.push({
      name: `${catBondProxy.ticker} ETF (1d)`,
      spread: catBondProxy.changePct,
      _note: 'Cat-bond / ILS ETF daily change as proxy for spread movement',
    });
  }
  if (typeof hyOAS === 'number') {
    catBondSpreads.push({ name: 'HY OAS', spread: hyOAS, _note: 'High-yield credit spread (bps)' });
  }
  if (typeof igOAS === 'number') {
    catBondSpreads.push({ name: 'IG OAS', spread: igOAS, _note: 'Investment-grade credit spread (bps)' });
  }

  const hasData = v => v != null && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

  const _sources = {
    combinedRatioData: hasData(combinedRatioData),
    yahooQuarterly: hasData(combinedRatioData),
    reserveAdequacyData: hasData(reserveAdequacyData),
    reinsurancePricing: hasData(reinsurancePricing),
    reinsurers: hasData(reinsurers),
    hyOAS: hasData(hyOAS),
    igOAS: hasData(igOAS),
    catBondSpreads: hasData(catBondSpreads),
    catBondSpreads_synthetic: true,
    fredHyOasHistory: hasData(fredHyOasHistory),
    sectorETF: hasData(sectorETF),
    catBondProxy: hasData(catBondProxy),
    industryAvgCombinedRatio: hasData(industryAvgCombinedRatio),
    treasury10y: hasData(treasury10y),
    catLosses: hasData(catLosses),
    combinedRatioHistory: hasData(combinedRatioHistory),
  };

  const result = {
    combinedRatioData,
    reserveAdequacyData,
    reinsurancePricing,
    reinsurers,
    hyOAS,
    igOAS,
    catBondSpreads,
    fredHyOasHistory,
    sectorETF,
    catBondProxy,
    industryAvgCombinedRatio,
    treasury10y,
    catLosses,
    combinedRatioHistory,
    _sources,
    lastUpdated: today,
  };

  writeDailyCache('insurance', result);
  cache.set(cacheKey, result, 900);
  res.json({ ...result, fetchedOn: today, isLive: true, _errors });
});

export default router;
