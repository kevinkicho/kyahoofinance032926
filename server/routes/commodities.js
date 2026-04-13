import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const COMMODITY_META = {
  'CL=F': { name: 'WTI Crude',   sector: 'Energy',      unit: '$/bbl'   },
  'BZ=F': { name: 'Brent Crude', sector: 'Energy',      unit: '$/bbl'   },
  'NG=F': { name: 'Natural Gas', sector: 'Energy',      unit: '$/MMBtu' },
  'RB=F': { name: 'Gasoline',    sector: 'Energy',      unit: '$/gal'   },
  'HO=F': { name: 'Heating Oil', sector: 'Energy',      unit: '$/gal'   },
  'GC=F': { name: 'Gold',        sector: 'Metals',      unit: '$/oz'    },
  'SI=F': { name: 'Silver',      sector: 'Metals',      unit: '$/oz'    },
  'HG=F': { name: 'Copper',      sector: 'Metals',      unit: '$/lb'    },
  'PL=F': { name: 'Platinum',    sector: 'Metals',      unit: '$/oz'    },
  'PA=F': { name: 'Palladium',   sector: 'Metals',      unit: '$/oz'    },
  'ZW=F': { name: 'Wheat',       sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZC=F': { name: 'Corn',        sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZS=F': { name: 'Soybeans',    sector: 'Agriculture', unit: '\u00a2/bu' },
  'KC=F': { name: 'Coffee',      sector: 'Agriculture', unit: '\u00a2/lb' },
  'CT=F': { name: 'Cotton',      sector: 'Agriculture', unit: '\u00a2/lb' },
  'SB=F': { name: 'Sugar',       sector: 'Agriculture', unit: '\u00a2/lb' },
  'LE=F': { name: 'Live Cattle', sector: 'Livestock',   unit: '\u00a2/lb' },
  'LBS=F':{ name: 'Lumber',      sector: 'Livestock',   unit: '$/MBF'   },
};
const COMMODITY_TICKERS = Object.keys(COMMODITY_META);
const COMM_SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture', 'Livestock'];

const FUTURES_MONTH_CODES = ['F','G','H','J','K','M','N','Q','U','V','X','Z'];
const FUTURES_MONTH_NAMES = { F:'Jan',G:'Feb',H:'Mar',J:'Apr',K:'May',M:'Jun',N:'Jul',Q:'Aug',U:'Sep',V:'Oct',X:'Nov',Z:'Dec' };

function getWTIFuturesTickers(numMonths = 8) {
  const tickers = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 2;
  if (month > 12) { month -= 12; year++; }
  for (let i = 0; i < numMonths; i++) {
    const code = FUTURES_MONTH_CODES[month - 1];
    const yr = String(year).slice(-2);
    tickers.push(`CL${code}${yr}.NYM`);
    month++;
    if (month > 12) { month -= 12; year++; }
  }
  return tickers;
}

function futuresTickerToLabel(ticker) {
  const code = ticker[2];
  const yr = ticker.slice(3, 5);
  return `${FUTURES_MONTH_NAMES[code] || '?'} '${yr}`;
}

function getGoldFuturesTickers(numMonths = 8) {
  const tickers = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  const validMonths = [2,4,6,8,10,12];
  let startMonth = validMonths.find(m => m > month);
  if (!startMonth) { startMonth = validMonths[0]; year++; }
  let mIdx = validMonths.indexOf(startMonth);
  for (let i = 0; i < numMonths; i++) {
    const m = validMonths[mIdx];
    const code = FUTURES_MONTH_CODES[m - 1];
    const yr = String(year).slice(-2);
    tickers.push(`GC${code}${yr}.CMX`);
    mIdx++;
    if (mIdx >= validMonths.length) { mIdx = 0; year++; }
  }
  return tickers;
}

function goldFuturesTickerToLabel(ticker) {
  const code = ticker[2];
  const yr = ticker.slice(3, 5);
  return `${FUTURES_MONTH_NAMES[code] || '?'} '${yr}`;
}

function buildEIASeries(rows, withAvg) {
  if (!rows || rows.length === 0) return null;
  const last52  = rows.slice(-52);
  const periods = last52.map(r => r.period);
  const values  = last52.map(r => Math.round(r.value * 10) / 10);
  const avg5yr  = withAvg && rows.length >= 10
    ? Math.round(rows.map(r => r.value).reduce((s, v) => s + v, 0) / rows.length * 10) / 10
    : null;
  return { periods, values, avg5yr };
}

async function fetchEIASeries(route, facets, length, EIA_API_KEY) {
  if (!EIA_API_KEY) return null;
  const params = new URLSearchParams({
    api_key: EIA_API_KEY,
    frequency: 'weekly',
    'data[0]': 'value',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'asc',
    length: String(length),
  });
  for (const [k, v] of Object.entries(facets)) {
    params.append(`facets[${k}][]`, v);
  }
  const url = `https://api.eia.gov/v2/${route}/data/?${params.toString()}`;
  const json = await fetchJSON(url);
  const rows = json?.response?.data || [];
  return rows.map(r => ({ period: r.period, value: parseFloat(r.value) })).filter(r => !isNaN(r.value));
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const EIA_API_KEY = process.env.EIA_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'commodities_data';
  const today = todayStr();

  const daily = readDailyCache('commodities');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    let quotesMap = {};
    try {
      trackApiCall('Yahoo Finance');
      const raw = await yf.quote(COMMODITY_TICKERS);
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.filter(q => q).forEach(q => { quotesMap[q.symbol] = q; });
    } catch (e) {
      console.warn('Commodity quotes failed:', e.message);
    }

    const histStart = (() => { const d = new Date(); d.setDate(d.getDate() - 35); return d.toISOString().split('T')[0]; })();
    const histEnd   = new Date().toISOString().split('T')[0];
    trackApiCall('Yahoo Finance');
    const histResults = await Promise.allSettled(
      COMMODITY_TICKERS.map(ticker =>
        yf.chart(ticker, { period1: histStart, period2: histEnd, interval: '1d' })
          .then(data => ({ ticker, closes: (data.quotes || []).map(q => q.close).filter(v => v != null) }))
      )
    );
    const chartMap = {};
    histResults.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.closes.length >= 2) {
        chartMap[r.value.ticker] = r.value.closes;
      } else if (r.status === 'rejected') {
        console.warn(`Commodity chart fetch failed for ${COMMODITY_TICKERS[i]}:`, r.reason?.message);
      }
    });

    const sectorGroups = { Energy: [], Metals: [], Agriculture: [], Livestock: [] };
    const heatmapRows  = [];

    for (const ticker of COMMODITY_TICKERS) {
      const meta   = COMMODITY_META[ticker];
      const q      = quotesMap[ticker];
      const closes = chartMap[ticker] || [];

      const price    = q?.regularMarketPrice ?? null;
      const change1d = q?.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 100) / 100 : null;
      const len      = closes.length;
      const change1w = len >= 6  ? Math.round((closes[len-1] - closes[len-6]) / closes[len-6] * 1000) / 10 : null;
      const change1m = len >= 2  ? Math.round((closes[len-1] - closes[0]) / closes[0] * 1000) / 10 : null;

      const sparklSrc = closes.length > 20
        ? (() => { const step = (closes.length - 1) / 19; return Array.from({ length: 20 }, (_, i) => closes[Math.round(i * step)]); })()
        : closes;
      const sparkline = sparklSrc.map(v => Math.round(v * 100) / 100);

      const row = { ticker, name: meta.name, unit: meta.unit, price, change1d, change1w, change1m, sparkline };
      sectorGroups[meta.sector].push(row);
      heatmapRows.push({ ticker, name: meta.name, sector: meta.sector, d1: change1d, w1: change1w, m1: change1m });
    }

    const priceDashboardData = COMM_SECTORS_ORDER.map(sector => ({ sector, commodities: sectorGroups[sector] }));
    const sectorHeatmapData  = { commodities: heatmapRows, columns: ['1d%', '1w%', '1m%'] };

    let futuresCurveData = null;
    try {
      const futureTickers = getWTIFuturesTickers(8);
      trackApiCall('Yahoo Finance');
      const futureQuotes  = await yf.quote(futureTickers);
      const futureArr     = Array.isArray(futureQuotes) ? futureQuotes : [futureQuotes];
      const futureMap     = {};
      futureArr.filter(q => q).forEach(q => { futureMap[q.symbol] = q; });
      const validFutures  = futureTickers
        .map(t => ({ ticker: t, label: futuresTickerToLabel(t), price: futureMap[t]?.regularMarketPrice ?? null }))
        .filter(f => f.price != null);
      if (validFutures.length >= 4) {
        futuresCurveData = {
          labels:    validFutures.map(f => f.label),
          prices:    validFutures.map(f => Math.round(f.price * 100) / 100),
          commodity: 'WTI Crude Oil',
          unit:      '$/bbl',
          spotPrice: quotesMap['CL=F']?.regularMarketPrice ?? validFutures[0]?.price ?? null,
        };
      }
    } catch (e) {
      console.warn('Futures curve fetch failed:', e.message);
    }

    let supplyDemandData = null;
    try {
      trackApiCall('EIA');
      const [crudeRows, natGasRows, prodRows] = await Promise.all([
        fetchEIASeries('petroleum/stoc/wstk',  { duoarea: 'NUS', product: 'EPC0' }, 260, EIA_API_KEY).catch(e => { console.warn('[Commodities]', e.message || e); return null; }),
        fetchEIASeries('natural-gas/stor/wkly', { duoarea: 'NUS' },                  260, EIA_API_KEY).catch(e => { console.warn('[Commodities]', e.message || e); return null; }),
        fetchEIASeries('petroleum/sum/sndw',    { duoarea: 'NUS', product: 'EPC0' }, 52, EIA_API_KEY).catch(e => { console.warn('[Commodities]', e.message || e); return null; }),
      ]);

      const crude    = buildEIASeries(crudeRows,  true);
      const natGas   = buildEIASeries(natGasRows, true);
      const prod     = buildEIASeries(prodRows,   false);

      if (crude || natGas || prod) {
        supplyDemandData = {
          crudeStocks:     crude    || { periods: [], values: [], avg5yr: null },
          natGasStorage:   natGas   || { periods: [], values: [], avg5yr: null },
          crudeProduction: prod     || { periods: [], values: [] },
        };
      }
    } catch (e) {
      console.warn('EIA fetch failed:', e.message);
    }

    let cotData = null;
    try {
      const cotUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$where=market_and_exchange_names like 'CRUDE OIL%25' OR market_and_exchange_names like 'GOLD%25'&$order=report_date_as_yyyy_mm_dd DESC&$limit=24`;
      trackApiCall('CFTC Socrata');
      const cotRaw = await fetchJSON(cotUrl);
      if (Array.isArray(cotRaw) && cotRaw.length > 0) {
        const grouped = {};
        for (const row of cotRaw) {
          const isCrude = /CRUDE OIL/i.test(row.market_and_exchange_names);
          const isGold  = /GOLD/i.test(row.market_and_exchange_names);
          const key = isCrude ? 'WTI Crude Oil' : isGold ? 'Gold' : null;
          if (!key) continue;
          if (!grouped[key]) grouped[key] = [];
          const noncommLong  = parseInt(row.noncomm_positions_long_all || '0');
          const noncommShort = parseInt(row.noncomm_positions_short_all || '0');
          const commLong     = parseInt(row.comm_positions_long_all || '0');
          const commShort    = parseInt(row.comm_positions_short_all || '0');
          const totalOI      = parseInt(row.open_interest_all || '0');
          grouped[key].push({
            date:       row.report_date_as_yyyy_mm_dd,
            noncommNet: noncommLong - noncommShort,
            commNet:    commLong - commShort,
            totalOI,
          });
        }

        const commodities = [];
        for (const name of ['WTI Crude Oil', 'Gold']) {
          const rows = (grouped[name] || []).slice(0, 12);
          if (rows.length === 0) continue;
          const latest = rows[0];
          const prev = rows.length >= 2 ? rows[1] : null;
          commodities.push({
            name,
            latest: {
              noncommNet: latest.noncommNet,
              commNet:    latest.commNet,
              totalOI:    latest.totalOI,
              netChange:  prev ? latest.noncommNet - prev.noncommNet : 0,
            },
            history: rows.map(r => ({ date: r.date, noncommNet: r.noncommNet })),
          });
        }

        if (commodities.length >= 2) {
          cotData = { commodities };
        }
      }
    } catch (e) {
      console.warn('CFTC COT fetch failed:', e.message);
    }

    let fredCommodities = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [wtiHist, goldHist, brentHist, natGasHist, ppiHist, dollarHist, gasRetailVal] = await Promise.all([
          fetchFredHistory('DCOILWTICO', FRED_API_KEY, 252).catch(e => { console.warn('[Commodities]', e.message || e); return []; }),
          fetchFredHistory('GOLDAMGBD228NLBM', FRED_API_KEY, 252).catch(e => { console.warn('[Commodities]', e.message || e); return []; }),
          fetchFredHistory('DCOILBRENTEU', FRED_API_KEY, 252).catch(e => { console.warn('[Commodities]', e.message || e); return []; }),
          fetchFredHistory('DHHNGSP', FRED_API_KEY, 252).catch(e => { console.warn('[Commodities]', e.message || e); return []; }),
          fetchFredHistory('WPUFD49207', FRED_API_KEY, 36).catch(e => { console.warn('[Commodities]', e.message || e); return []; }),
          fetchFredHistory('DTWEXBGS', FRED_API_KEY, 252).catch(e => { console.warn('[Commodities]', e.message || e); return []; }),
          fetchFredLatest('GASREGW', FRED_API_KEY).catch(e => { console.warn('[Commodities]', e.message || e); return null; }),
        ]);
        const toSeries = (hist) => hist.length >= 10 ? {
          dates: hist.map(p => p.date),
          values: hist.map(p => Math.round(p.value * 100) / 100),
        } : null;
        fredCommodities = {
          wtiHistory:    toSeries(wtiHist),
          goldHistory:   toSeries(goldHist),
          brentHistory:  toSeries(brentHist),
          natGasHistory: toSeries(natGasHist),
          ppiCommodity:  ppiHist.length >= 6 ? {
            dates: ppiHist.map(p => p.date.slice(0, 7)),
            values: ppiHist.map(p => Math.round(p.value * 10) / 10),
          } : null,
          dollarIndex:   toSeries(dollarHist),
          gasRetail:     gasRetailVal != null ? Math.round(gasRetailVal * 1000) / 1000 : null,
        };
      } catch (e) { console.warn('[Commodities]', e.message || e); }
    }

    let goldFuturesCurve = null;
    try {
      const goldTickers = getGoldFuturesTickers(8);
      trackApiCall('Yahoo Finance');
      const goldQuotes = await yf.quote(goldTickers);
      const goldArr = Array.isArray(goldQuotes) ? goldQuotes : [goldQuotes];
      const goldMap = {};
      goldArr.filter(q => q).forEach(q => { goldMap[q.symbol] = q; });
      const validGold = goldTickers
        .map(t => ({ ticker: t, label: goldFuturesTickerToLabel(t), price: goldMap[t]?.regularMarketPrice ?? null }))
        .filter(f => f.price != null);
      if (validGold.length >= 3) {
        goldFuturesCurve = {
          labels:    validGold.map(f => f.label),
          prices:    validGold.map(f => Math.round(f.price * 100) / 100),
          commodity: 'Gold',
          unit:      '$/oz',
          spotPrice: quotesMap['GC=F']?.regularMarketPrice ?? validGold[0]?.price ?? null,
        };
      }
    } catch (e) {
      console.warn('Gold futures curve failed:', e.message);
    }

    let dbcEtf = null;
    try {
      trackApiCall('Yahoo Finance');
      const dbcQuote = await yf.quote(['DBC']);
      const dbcArr = Array.isArray(dbcQuote) ? dbcQuote : [dbcQuote];
      const dq = dbcArr.find(q => q?.symbol === 'DBC');
      if (dq?.regularMarketPrice) {
        const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
        const histEnd = new Date().toISOString().split('T')[0];
        let dbcHistory = null;
        try {
          trackApiCall('Yahoo Finance');
          const chart = await yf.chart('DBC', { period1: histStart, period2: histEnd, interval: '1d' });
          const quotes = (chart.quotes || []).filter(q => q.close != null);
          if (quotes.length >= 20) {
            dbcHistory = {
              dates: quotes.map(q => q.date.toISOString().split('T')[0]),
              closes: quotes.map(q => Math.round(q.close * 100) / 100),
            };
          }
        } catch (e) { console.warn('[Commodities]', e.message || e); }
        dbcEtf = {
          price: Math.round(dq.regularMarketPrice * 100) / 100,
          changePct: Math.round((dq.regularMarketChangePercent ?? 0) * 100) / 100,
          ytd: dq.ytdReturn != null ? Math.round(dq.ytdReturn * 1000) / 10 : null,
          history: dbcHistory,
        };
      }
    } catch (e) { console.warn('[Commodities]', e.message || e); }

    let goldOilRatio = null;
    try {
      const goldPrice = quotesMap['GC=F']?.regularMarketPrice ?? null;
      const oilPrice  = quotesMap['CL=F']?.regularMarketPrice ?? null;
      if (goldPrice != null && oilPrice != null && oilPrice > 0) {
        goldOilRatio = Math.round(goldPrice / oilPrice * 100) / 100;
      }
    } catch (e) {
      console.warn('Gold/Oil ratio failed:', e.message);
    }

    let contangoIndicator = null;
    try {
      if (futuresCurveData && futuresCurveData.prices && futuresCurveData.prices.length >= 2) {
        const prices     = futuresCurveData.prices;
        const frontPrice = prices[0];
        const backPrice  = prices[prices.length - 1];
        const spread     = Math.round((frontPrice - backPrice) * 100) / 100;
        contangoIndicator = {
          frontMonth: futuresCurveData.labels[0],
          backMonth:  futuresCurveData.labels[prices.length - 1],
          frontPrice: Math.round(frontPrice * 100) / 100,
          backPrice:  Math.round(backPrice  * 100) / 100,
          spread,
          structure:  spread > 0 ? 'backwardation' : spread < 0 ? 'contango' : 'flat',
        };
      }
    } catch (e) {
      console.warn('Contango indicator failed:', e.message);
    }

    let commodityCurrencies = null;
    try {
      trackApiCall('Yahoo Finance');
      const ccRaw = await yf.quote(['CAD=X', 'AUDUSD=X', 'NOKUSD=X']);
      const ccArr = Array.isArray(ccRaw) ? ccRaw : [ccRaw];
      const ccMap = {};
      ccArr.filter(q => q).forEach(q => { ccMap[q.symbol] = q; });
      const cadRaw = ccMap['CAD=X']?.regularMarketPrice ?? null;
      const audRaw = ccMap['AUDUSD=X']?.regularMarketPrice ?? null;
      const nokRaw = ccMap['NOKUSD=X']?.regularMarketPrice ?? null;
      if (cadRaw != null || audRaw != null || nokRaw != null) {
        commodityCurrencies = {
          CAD: cadRaw != null ? Math.round((1 / cadRaw) * 10000) / 10000 : null,
          AUD: audRaw != null ? Math.round(audRaw * 10000) / 10000 : null,
          NOK: nokRaw != null ? Math.round(nokRaw * 10000) / 10000 : null,
        };
      }
    } catch (e) {
      console.warn('Commodity currencies fetch failed:', e.message);
    }

    let seasonalPatterns = null;
    try {
      const fiveYearsAgo = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 5); return d.toISOString().split('T')[0]; })();
      const nowStr = new Date().toISOString().split('T')[0];
      const seasonalTickers = ['CL=F', 'GC=F', 'ZC=F'];
      trackApiCall('Yahoo Finance');
      const seasonalResults = await Promise.allSettled(
        seasonalTickers.map(ticker =>
          yf.chart(ticker, { period1: fiveYearsAgo, period2: nowStr, interval: '1mo' })
            .then(data => ({
              ticker,
              quotes: (data.quotes || []).filter(q => q.close != null && q.open != null && q.open > 0),
            }))
        )
      );

      const seasonalMap = {};
      for (const res of seasonalResults) {
        if (res.status !== 'fulfilled') continue;
        const { ticker, quotes } = res.value;
        const monthBuckets = Array.from({ length: 12 }, () => []);
        for (const q of quotes) {
          const d  = q.date instanceof Date ? q.date : new Date(q.date ?? q.timestamp * 1000);
          const mo = d.getUTCMonth();
          const ret = (q.close - q.open) / q.open * 100;
          monthBuckets[mo].push(ret);
        }
        const avgReturns = monthBuckets.map(arr =>
          arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length * 100) / 100 : null
        );
        const key = ticker.replace('=F', '');
        seasonalMap[key] = avgReturns;
      }

      if (Object.keys(seasonalMap).length > 0) {
        seasonalPatterns = seasonalMap;
      }
    } catch (e) {
      console.warn('Seasonal patterns fetch failed:', e.message);
    }

    const _sources = {
      priceDashboardData: !!(priceDashboardData && priceDashboardData.some(s => s.commodities?.length)),
      futuresCurveData: !!(futuresCurveData && futuresCurveData.prices?.length),
      sectorHeatmapData: !!(sectorHeatmapData && sectorHeatmapData.commodities?.length),
      supplyDemandData: !!supplyDemandData,
      cotData: !!(cotData && cotData.commodities?.length),
      fredCommodities: !!fredCommodities,
      goldFuturesCurve: !!(goldFuturesCurve && goldFuturesCurve.prices?.length),
      dbcEtf: !!dbcEtf,
    };

    const result = {
      priceDashboardData,
      sectorHeatmapData,
      futuresCurveData:    futuresCurveData    ?? null,
      supplyDemandData:    supplyDemandData    ?? null,
      cotData:             cotData             ?? null,
      fredCommodities:     fredCommodities     ?? null,
      goldFuturesCurve:    goldFuturesCurve    ?? null,
      dbcEtf:              dbcEtf              ?? null,
      goldOilRatio:        goldOilRatio        ?? null,
      contangoIndicator:   contangoIndicator   ?? null,
      commodityCurrencies: commodityCurrencies ?? null,
      seasonalPatterns:    seasonalPatterns    ?? null,
      _sources,
      lastUpdated: today,
    };

    writeDailyCache('commodities', result);
    cache.set(cacheKey, result, 900);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Commodities API error:', error);
    const fallback = readLatestCache('commodities');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
