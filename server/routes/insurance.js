import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr, mergeWithPreviousCache } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory, fetchFredLatest, fetchFredLatestWithDate } from '../lib/fred.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';
import { sanitizeMarketPayload, computeIsLive } from '../lib/dataHygiene.js';

const router = Router();

const INSURER_TICKERS = ['PGR', 'ALL', 'TRV', 'HIG', 'AIG', 'CB', 'MET', 'PRU', 'AFL', 'CINF'];
const INSURER_NAMES = {
  PGR: 'Progressive',
  ALL: 'Allstate',
  TRV: 'Travelers',
  HIG: 'Hartford',
  AIG: 'AIG',
  CB: 'Chubb',
  MET: 'MetLife',
  PRU: 'Prudential',
  AFL: 'Aflac',
  CINF: 'Cincinnati Financial',
};

/** Latest quarterly balance-sheet row via fundamentalsTimeSeries (quoteSummary BS is empty). */
async function fetchInsurerBalanceSheet(ticker) {
  const rows = await yf.fundamentalsTimeSeries(ticker, {
    period1: '2022-01-01',
    type: 'quarterly',
    module: 'balance-sheet',
  });
  if (!Array.isArray(rows) || !rows.length) return null;
  // Prefer most recent row with total assets
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r?.totalAssets != null || r?.totalLiabilitiesNetMinorityInterest != null) {
      return r;
    }
  }
  return rows[rows.length - 1] || null;
}

function num(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'insurance_data';
  const today = todayStr();

  const forceRefresh = req.query?.refresh === 'true' || req.query?.refresh === '1';
  const INS_LIVE = [
    'combinedRatioData', 'reserveAdequacyData', 'catBondSpreads', 'sectorETF',
    'reinsurancePricing', 'hyOAS', 'igOAS', 'catLosses',
  ];
  if (!forceRefresh) {
    const daily = readDailyCache('insurance');
    if (daily) {
      const clean = sanitizeMarketPayload(daily);
      clean.isLive = computeIsLive(clean, INS_LIVE);
      return res.json({ ...clean, fetchedOn: today, isCurrent: true, _cacheSource: 'daily_file' });
    }

    const cached = cache.get(cacheKey);
    if (cached) {
      const clean = sanitizeMarketPayload(cached);
      clean.isLive = computeIsLive(clean, INS_LIVE);
      return res.json({ ...clean, fetchedOn: today, isCurrent: true, _cacheSource: 'memory' });
    }
  } else if (cache) {
    cache.del(cacheKey);
  }

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
    return sendCachedOrDegradedSync(res, 'insurance', {
      error: new Error('Failed to fetch insurer financial data'),
      memoryCache: cache,
      cacheKey,
      extra: { _errors },
    });
  }

  const allQuarterSets = {};
  const reserveLines = [];
  const reserveReserves = [];
  const reserveRequired = [];
  const reserveAdequacy = [];
  const reserveDetails = []; // richer per-insurer rows for UI

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
  }

  // Reserve adequacy from fundamentalsTimeSeries (quoteSummary BS fields empty since 2024)
  trackApiCall('Yahoo Finance');
  const bsResults = await Promise.allSettled(
    INSURER_TICKERS.map(async (ticker) => {
      const row = await fetchInsurerBalanceSheet(ticker);
      return { ticker, row };
    }),
  );

  for (const r of bsResults) {
    if (r.status !== 'fulfilled' || !r.value?.row) continue;
    const { ticker, row } = r.value;
    const name = INSURER_NAMES[ticker] || ticker;
    const assets = num(row.totalAssets);
    const liab = num(row.totalLiabilitiesNetMinorityInterest) ?? num(row.otherLiabilities);
    const equity = num(row.stockholdersEquity)
      ?? num(row.commonStockEquity)
      ?? num(row.totalEquityGrossMinorityInterest);
    const investments = num(row.investmentsAndAdvances);
    const debt = num(row.totalDebt) ?? num(row.longTermDebt);

    if (assets == null && liab == null && equity == null) continue;

    // Coverage = assets / liabilities (how many $ of assets back each $ of liabilities)
    const coverage = liab > 0 && assets != null
      ? Math.round((assets / liab) * 1000) / 1000
      : null;
    // Surplus leverage = equity / liabilities
    const surplusRatio = liab > 0 && equity != null
      ? Math.round((equity / liab) * 1000) / 1000
      : null;
    // Investment cover of liabilities
    const invCover = liab > 0 && investments != null
      ? Math.round((investments / liab) * 1000) / 1000
      : null;

    const liabM = liab != null ? Math.round(liab / 1e6) : 0;
    const equityM = equity != null ? Math.round(equity / 1e6) : 0;
    const assetsM = assets != null ? Math.round(assets / 1e6) : 0;

    // Legacy parallel arrays (adequacy as coverage * 100 for % charts that expect %)
    reserveLines.push(name);
    reserveReserves.push(liabM);
    reserveRequired.push(equityM);
    reserveAdequacy.push(coverage != null ? Math.round(coverage * 1000) / 10 : 0);

    let asOf = null;
    if (row.date instanceof Date) asOf = row.date.toISOString().slice(0, 10);
    else if (typeof row.date === 'string') asOf = row.date.slice(0, 10);
    else if (typeof row.date === 'number') asOf = new Date(row.date).toISOString().slice(0, 10);

    reserveDetails.push({
      ticker,
      insurer: name,
      assetsM,
      liabilitiesM: liabM,
      equityM,
      investmentsM: investments != null ? Math.round(investments / 1e6) : null,
      debtM: debt != null ? Math.round(debt / 1e6) : null,
      // Primary UI ratio: asset coverage of liabilities (e.g. 1.36x)
      ratio: coverage,
      surplusRatio,
      invCover,
      asOf,
      _source: 'yahoo_fundamentalsTimeSeries_balance-sheet',
    });
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

  let combinedRatioData = {
    quarters: masterQuarters,
    lines: combinedLines,
    ratioMethod,
  };

  // Yahoo quarterly often returns empty for insurers. Fall back to EDGAR XBRL
  // combined ratios (real 10-K/10-Q derived) so CR panels are not all-null.
  const yahooHasAnyRatio = Object.values(combinedLines).some(arr =>
    Array.isArray(arr) && arr.some(v => v != null)
  );
  if (!yahooHasAnyRatio) {
    try {
      // Cache file uses snake_case market name from the edgar route
      const edgarFb = readLatestCache('edgar_insurer_ratios') || readLatestCache('edgarInsurerRatios');
      const issuers = edgarFb?.data?.issuers;
      if (issuers && typeof issuers === 'object') {
        const tickerToName = { PGR: 'Progressive', ALL: 'Allstate', TRV: 'Travelers', HIG: 'Hartford' };
        const years = new Set();
        for (const series of Object.values(issuers)) {
          for (const row of series?.series || []) {
            if (row?.end) years.add(String(row.end).slice(0, 4));
          }
        }
        const yearList = [...years].sort();
        if (yearList.length) {
          const lines = {};
          for (const [ticker, pack] of Object.entries(issuers)) {
            const name = tickerToName[ticker] || ticker;
            const byYear = {};
            for (const row of pack?.series || []) {
              const y = String(row.end || '').slice(0, 4);
              if (y && row.combinedPct != null) byYear[y] = row.combinedPct;
            }
            lines[name] = yearList.map(y => byYear[y] ?? null);
          }
          if (Object.keys(lines).length) {
            combinedRatioData = {
              quarters: yearList,
              lines,
              ratioMethod: 'edgarCombinedPct',
              _source: 'edgar_insurer_ratios',
            };
          }
        }
      }
    } catch (e) {
      console.warn('[Insurance] EDGAR combined-ratio fallback failed:', e.message);
    }
  }

  const reserveAdequacyData = {
    lines: reserveLines,
    // liabilities ($M) — legacy field name "reserves"
    reserves: reserveReserves,
    // equity ($M) — legacy field name "required"
    required: reserveRequired,
    // coverage % (e.g. 135.5 for 1.355x) — legacy charts
    adequacy: reserveAdequacy,
    // Preferred: structured rows with real coverage multiples
    rows: reserveDetails,
    _note: 'Coverage = total assets / total liabilities (Yahoo fundamentalsTimeSeries). Not statutory RBC.',
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

  // ── Sector / industry pulse — FRED only (Fed/BLS/BEA), not Yahoo ETFs ──
  // Maps to insurance-relevant real-economy + equity-market official series.
  const FRED_SECTOR_SERIES = [
    // Broad equity (Fed-disseminated indices)
    { id: 'SP500', name: 'S&P 500', group: 'Equity', unit: 'idx', lookback: 5 },
    { id: 'NASDAQCOM', name: 'NASDAQ Composite', group: 'Equity', unit: 'idx', lookback: 5 },
    { id: 'NASDAQ100', name: 'NASDAQ-100', group: 'Equity', unit: 'idx', lookback: 5 },
    { id: 'DJIA', name: 'Dow Jones Industrial', group: 'Equity', unit: 'idx', lookback: 5 },
    { id: 'NASDAQBANK', name: 'NASDAQ Bank', group: 'Financials', unit: 'idx', lookback: 5 },
    { id: 'VIXCLS', name: 'CBOE VIX', group: 'Risk', unit: 'idx', lookback: 5 },
    // Fed financial conditions
    { id: 'NFCI', name: 'Chicago Fed NFCI', group: 'Financials', unit: 'idx', lookback: 5 },
    { id: 'STLFSI4', name: 'St. Louis Fin. Stress', group: 'Financials', unit: 'idx', lookback: 5 },
    // Industrial production by sector (Fed G.17)
    { id: 'IPMAN', name: 'IP Manufacturing', group: 'Industrials', unit: 'idx', lookback: 3 },
    { id: 'IPBUSEQ', name: 'IP Business Equipment', group: 'Technology', unit: 'idx', lookback: 3 },
    { id: 'IPG334S', name: 'IP Computers & Electronics', group: 'Technology', unit: 'idx', lookback: 3 },
    { id: 'IPG3344S', name: 'IP Semiconductors', group: 'Technology', unit: 'idx', lookback: 3 },
    { id: 'IPG3361T3S', name: 'IP Motor Vehicles & Parts', group: 'Consumer', unit: 'idx', lookback: 3 },
    { id: 'IPG325S', name: 'IP Chemicals', group: 'Materials', unit: 'idx', lookback: 3 },
    { id: 'IPMAT', name: 'IP Materials', group: 'Materials', unit: 'idx', lookback: 3 },
    { id: 'IPMINE', name: 'IP Mining', group: 'Energy', unit: 'idx', lookback: 3 },
    { id: 'IPUTIL', name: 'IP Utilities', group: 'Utilities', unit: 'idx', lookback: 3 },
    { id: 'IPCONGD', name: 'IP Consumer Goods', group: 'Consumer', unit: 'idx', lookback: 3 },
    // Housing / construction (Census via FRED)
    { id: 'HOUST', name: 'Housing Starts', group: 'Real Estate', unit: 'k', lookback: 3 },
    { id: 'PERMIT', name: 'Building Permits', group: 'Real Estate', unit: 'k', lookback: 3 },
    // Retail (Census)
    { id: 'RSAFS', name: 'Retail Sales (ex food svc adj)', group: 'Consumer', unit: '$M', lookback: 3 },
    // Insurance industry (Fed Z.1 Financial Accounts)
    { id: 'BOGZ1FL544090005Q', name: 'Life Insurers: Fin. Assets', group: 'Insurance', unit: '$M', lookback: 5 },
    { id: 'BOGZ1FL513176005Q', name: 'P&C Insurers: Fin. Assets', group: 'Insurance', unit: '$M', lookback: 5 },
    // P&C premium PPI (BLS)
    { id: 'PCU924126924126', name: 'PPI P&C Insurance Premiums', group: 'Insurance', unit: 'idx', lookback: 3 },
    { id: 'PCU9241269241261', name: 'PPI Personal Auto Premiums', group: 'Insurance', unit: 'idx', lookback: 3 },
    { id: 'PCU9241269241262', name: 'PPI Homeowners Premiums', group: 'Insurance', unit: 'idx', lookback: 3 },
  ];

  let sectorETF = null;
  if (FRED_API_KEY) {
    try {
      const rows = [];
      for (const s of FRED_SECTOR_SERIES) {
        try {
          trackApiCall('FRED');
          // Fetch enough history for MoM/YoY style change
          const hist = await fetchFredHistory(s.id, FRED_API_KEY, Math.max(s.lookback || 3, 14));
          if (!hist?.length) continue;
          const latest = hist[hist.length - 1];
          const prev = hist.length >= 2 ? hist[hist.length - 2] : null;
          // Prefer ~12-step back for monthly YoY when series is monthly
          const yoyIdx = hist.length > 13 ? hist.length - 13 : 0;
          const yoyBase = hist[yoyIdx];
          let changePct = null;
          if (prev?.value && Number(prev.value) !== 0) {
            changePct = Math.round(((Number(latest.value) - Number(prev.value)) / Math.abs(Number(prev.value))) * 10000) / 100;
          }
          let yoyPct = null;
          if (yoyBase?.value && Number(yoyBase.value) !== 0 && hist.length > 6) {
            yoyPct = Math.round(((Number(latest.value) - Number(yoyBase.value)) / Math.abs(Number(yoyBase.value))) * 10000) / 100;
          }
          rows.push({
            symbol: s.id,
            name: s.name,
            group: s.group,
            unit: s.unit,
            price: Math.round(Number(latest.value) * 10000) / 10000,
            changePct,
            yoyPct,
            period: latest.date,
            source: 'FRED',
            seriesId: s.id,
          });
        } catch {
          /* skip missing series */
        }
        await new Promise((r) => setTimeout(r, 55));
      }
      if (rows.length) {
        rows.sort((a, b) => Math.abs(b.changePct || 0) - Math.abs(a.changePct || 0));
        // Legacy top-level fields for CombinedRatioMonitor / ReinsurancePricing
        // (they expected an ETF price). Use S&P 500 as official equity anchor.
        const anchor = rows.find((r) => r.symbol === 'SP500') || rows[0];
        sectorETF = Object.assign(rows, {
          symbol: anchor.symbol,
          name: anchor.name,
          price: anchor.price,
          changePct: anchor.changePct,
          high52w: null,
          low52w: null,
          sma50: null,
          _source: 'FRED',
          _note: 'Official Fed/BLS/BEA series via FRED — not Yahoo ETFs',
        });
      }
    } catch (e) {
      console.warn('[Insurance] FRED sector pulse:', e.message || e);
      _errors.sectorETF = e.message;
    }
  }

  // Cat-bond proxy: official credit risk anchor (HY OAS) — no Yahoo ILS funds
  let catBondProxy = null;
  if (typeof hyOAS === 'number' && Number.isFinite(hyOAS)) {
    catBondProxy = {
      ticker: 'BAMLH0A0HYM2',
      name: 'US HY OAS (FRED)',
      price: Math.round(hyOAS * 100) / 100, // percent
      changePct: null,
      _source: 'FRED',
    };
  }
  const ilsProxies = []; // no Yahoo ILS — governmental credit stack only

  let industryAvgCombinedRatio = null;
  try {
    const latestRatios = Object.values(combinedRatioData.lines || {})
      .map(arr => {
        if (!Array.isArray(arr)) return null;
        for (let i = arr.length - 1; i >= 0; i--) {
          if (arr[i] != null && Number.isFinite(arr[i])) return arr[i];
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

  // Natural Catastrophe Losses (FRED NPORCT when available)
  let catLosses = null;
  if (FRED_API_KEY) {
    try {
      trackApiCall('FRED');
      const catHist = await fetchFredHistory('NPORCT', FRED_API_KEY, 60);
      if (catHist.length >= 4) {
        catLosses = {
          dates: catHist.map(p => p.date.slice(0, 7)),
          values: catHist.map(p => Math.round(p.value * 10) / 10),
          seriesId: 'NPORCT',
        };
      }
    } catch (e) {
      console.warn('[Insurance] cat series NPORCT', e.message || e);
      _errors.catLosses = e.message;
    }
  }
  // Soft proxy when FRED cat series unavailable: FEMA declaration counts by year from cache
  if (!catLosses) {
    try {
      const femaFb = readLatestCache('fema');
      const decls = femaFb?.data?.declarations || femaFb?.data?.byType;
      if (Array.isArray(decls) && decls.length) {
        // Aggregate by year if objects have date fields
        const byYear = {};
        for (const d of decls) {
          const y = String(d.declarationDate || d.date || d.year || '').slice(0, 4);
          if (/^\d{4}$/.test(y)) byYear[y] = (byYear[y] || 0) + 1;
        }
        const years = Object.keys(byYear).sort();
        if (years.length >= 2) {
          catLosses = {
            dates: years,
            values: years.map(y => byYear[y]),
            seriesId: 'FEMA_DECL_COUNT',
            _note: 'Proxy: FEMA declaration counts by year (not $ losses)',
          };
        }
      }
    } catch { /* ignore */ }
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

  // Reinsurance pricing — no free public treaty-rate feed; bind panel from
  // listed reinsurer equity quotes (price + 1d change) as market proxies.
  let reinsurancePricing = [];
  if (reinsurers.length) {
    reinsurancePricing = reinsurers
      .filter(r => r?.price != null)
      .map(r => ({
        ticker: r.ticker,
        name: r.name || r.ticker,
        price: r.price,
        changePct: r.changePct ?? null,
        _note: 'Equity proxy for reinsurance pricing conditions',
      }));
  }

  // Cat bond / risk-spread panel — pure governmental/intergovernmental via FRED.
  // True cat-bond OTC deal sheets are not free public data; ICE BofA OAS,
  // Treasury curve, and Fed stress indices are the official risk-spread stack.
  // FRED BAML OAS series are in percent (e.g. 2.68 → 268 bps).
  const CAT_SPREAD_FRED = [
    { id: 'BAMLH0A0HYM2', name: 'US High Yield OAS', group: 'Credit', toBps: true },
    { id: 'BAMLC0A0CM', name: 'US IG Corp OAS', group: 'Credit', toBps: true },
    { id: 'BAMLC0A1CAAA', name: 'US AAA Corp OAS', group: 'Credit', toBps: true },
    { id: 'BAMLC0A2CAA', name: 'US AA Corp OAS', group: 'Credit', toBps: true },
    { id: 'BAMLC0A3CA', name: 'US A Corp OAS', group: 'Credit', toBps: true },
    { id: 'BAMLC0A4CBBB', name: 'US BBB Corp OAS', group: 'Credit', toBps: true },
    { id: 'BAMLH0A1HYBB', name: 'US BB HY OAS', group: 'Credit', toBps: true },
    { id: 'BAMLH0A2HYB', name: 'US B HY OAS', group: 'Credit', toBps: true },
    { id: 'BAMLH0A3HYC', name: 'US CCC HY OAS', group: 'Credit', toBps: true },
    { id: 'BAMLEMFSFCRPIOAS', name: 'EM Corp OAS', group: 'Credit', toBps: true },
    { id: 'BAMLHE00EHYIOAS', name: 'Euro HY OAS', group: 'Credit', toBps: true },
    { id: 'BAA10Y', name: 'BAA − 10Y Treasury', group: 'Credit', toBps: true },
    { id: 'AAA10Y', name: 'AAA − 10Y Treasury', group: 'Credit', toBps: true },
    { id: 'T10Y2Y', name: '10Y−2Y Treasury', group: 'Rates', toBps: true },
    { id: 'T10Y3M', name: '10Y−3M Treasury', group: 'Rates', toBps: true },
    { id: 'T5YIFR', name: '5Y Forward Inflation', group: 'Rates', toBps: true },
    { id: 'DFII10', name: '10Y TIPS Real Yield', group: 'Rates', toBps: false },
    { id: 'DGS10', name: '10Y Treasury Yield', group: 'Rates', toBps: false },
    { id: 'DGS2', name: '2Y Treasury Yield', group: 'Rates', toBps: false },
    { id: 'BAMLH0A0HYM2EY', name: 'US HY Effective Yield', group: 'Yield', toBps: false },
    { id: 'BAMLC0A0CMEY', name: 'US IG Effective Yield', group: 'Yield', toBps: false },
    { id: 'BAMLC0A4CBBBEY', name: 'US BBB Effective Yield', group: 'Yield', toBps: false },
    { id: 'BAMLHE00EHYIEY', name: 'Euro HY Effective Yield', group: 'Yield', toBps: false },
    { id: 'VIXCLS', name: 'VIX (equity risk)', group: 'Risk', toBps: false },
    { id: 'NFCI', name: 'Chicago Fed NFCI', group: 'Risk', toBps: false },
    { id: 'STLFSI4', name: 'St. Louis Fin. Stress', group: 'Risk', toBps: false },
  ];

  let catBondSpreads = [];
  if (FRED_API_KEY) {
    for (const row of CAT_SPREAD_FRED) {
      try {
        trackApiCall('FRED');
        const pack = await fetchFredLatestWithDate(row.id, FRED_API_KEY);
        if (!pack || pack.value == null || !Number.isFinite(Number(pack.value))) continue;
        const raw = Number(pack.value);
        const spreadBps = row.toBps ? Math.round(raw * 1000) / 10 : null;
        const levelPct = !row.toBps ? Math.round(raw * 10000) / 10000 : null;
        catBondSpreads.push({
          name: row.name,
          seriesId: row.id,
          group: row.group,
          spread: spreadBps != null ? spreadBps : levelPct,
          unit: spreadBps != null ? 'bps' : 'pct',
          spreadBps,
          yieldPct: levelPct,
          asOf: pack.date || null,
          source: 'FRED',
          _note: `FRED ${row.id} · ICE BofA / Treasury / Fed`,
        });
      } catch {
        /* skip missing series */
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  } else {
    if (typeof hyOAS === 'number') {
      catBondSpreads.push({
        name: 'US High Yield OAS',
        group: 'Credit',
        spread: Math.round(hyOAS * 1000) / 10,
        unit: 'bps',
        spreadBps: Math.round(hyOAS * 1000) / 10,
        source: 'FRED',
      });
    }
    if (typeof igOAS === 'number') {
      catBondSpreads.push({
        name: 'US IG Corp OAS',
        group: 'Credit',
        spread: Math.round(igOAS * 1000) / 10,
        unit: 'bps',
        spreadBps: Math.round(igOAS * 1000) / 10,
        source: 'FRED',
      });
    }
  }

  const groupOrder = { Credit: 0, Rates: 1, Yield: 2, Risk: 3 };
  catBondSpreads.sort((a, b) => {
    const ga = groupOrder[a.group] ?? 9;
    const gb = groupOrder[b.group] ?? 9;
    if (ga !== gb) return ga - gb;
    return (b.spreadBps ?? Math.abs(b.spread ?? 0)) - (a.spreadBps ?? Math.abs(a.spread ?? 0));
  });

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
    fredHyOasHistory: hasData(fredHyOasHistory),
    sectorETF: hasData(sectorETF),
    catBondProxy: hasData(catBondProxy),
    industryAvgCombinedRatio: hasData(industryAvgCombinedRatio),
    treasury10y: hasData(treasury10y),
    catLosses: hasData(catLosses),
    combinedRatioHistory: hasData(combinedRatioHistory),
  };

  const result = sanitizeMarketPayload({
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
  });
  result.isLive = computeIsLive(result, INS_LIVE);

  const merged = sanitizeMarketPayload(mergeWithPreviousCache('insurance', result));
  merged.isLive = computeIsLive(merged, INS_LIVE);
  writeDailyCache('insurance', merged);
  cache.set(cacheKey, merged, 900);
  res.json({ ...merged, fetchedOn: today, isLive: merged.isLive, _errors });
});

export default router;
