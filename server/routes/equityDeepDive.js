import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const SECTOR_ETF_META = [
  { code: 'XLK',  name: 'Technology'        },
  { code: 'XLF',  name: 'Financials'        },
  { code: 'XLV',  name: 'Health Care'       },
  { code: 'XLE',  name: 'Energy'            },
  { code: 'XLI',  name: 'Industrials'       },
  { code: 'XLC',  name: 'Communication'     },
  { code: 'XLY',  name: 'Consumer Disc.'    },
  { code: 'XLP',  name: 'Consumer Staples'  },
  { code: 'XLRE', name: 'Real Estate'       },
  { code: 'XLB',  name: 'Materials'         },
  { code: 'XLU',  name: 'Utilities'         },
  { code: 'SPY',  name: 'S&P 500'           },
];
const SECTOR_ETF_TICKERS = SECTOR_ETF_META.map(s => s.code);

const EQ_FACTOR_TICKERS = [
  'NVDA','MSFT','AAPL','AVGO','META','GOOGL','JPM','V','LLY','UNH',
  'WMT','PG','AMZN','HD','CAT','HON','XOM','CVX','TSLA','INTC',
];
const EQ_FACTOR_META = {
  NVDA:  { name: 'NVIDIA',        sector: 'Technology'       },
  MSFT:  { name: 'Microsoft',     sector: 'Technology'       },
  AAPL:  { name: 'Apple',         sector: 'Technology'       },
  AVGO:  { name: 'Broadcom',      sector: 'Technology'       },
  META:  { name: 'Meta',          sector: 'Communication'    },
  GOOGL: { name: 'Alphabet',      sector: 'Communication'    },
  JPM:   { name: 'JPMorgan',      sector: 'Financials'       },
  V:     { name: 'Visa',          sector: 'Financials'       },
  LLY:   { name: 'Eli Lilly',     sector: 'Health Care'      },
  UNH:   { name: 'UnitedHealth',  sector: 'Health Care'      },
  WMT:   { name: 'Walmart',       sector: 'Consumer Staples' },
  PG:    { name: 'P&G',           sector: 'Consumer Staples' },
  AMZN:  { name: 'Amazon',        sector: 'Consumer Disc.'   },
  HD:    { name: 'Home Depot',    sector: 'Consumer Disc.'   },
  CAT:   { name: 'Caterpillar',   sector: 'Industrials'      },
  HON:   { name: 'Honeywell',     sector: 'Industrials'      },
  XOM:   { name: 'ExxonMobil',    sector: 'Energy'           },
  CVX:   { name: 'Chevron',       sector: 'Energy'           },
  TSLA:  { name: 'Tesla',         sector: 'Consumer Disc.'   },
  INTC:  { name: 'Intel',         sector: 'Technology'       },
};

const EQ_SHORT_TICKERS = [
  'CVNA','GME','CHWY','RIVN','PLUG','LCID','BYND','CLSK','UPST','MARA',
  'NKLA','OPEN','SPCE','SAVA','LAZR','IONQ','ARRY','XPEV','WOLF',
];
const EQ_SHORT_META = {
  CVNA: { name: 'Carvana',           sector: 'Consumer Disc.'   },
  GME:  { name: 'GameStop',          sector: 'Consumer Disc.'   },
  CHWY: { name: 'Chewy',            sector: 'Consumer Disc.'   },
  RIVN: { name: 'Rivian',           sector: 'Consumer Disc.'   },
  PLUG: { name: 'Plug Power',       sector: 'Industrials'      },
  LCID: { name: 'Lucid Group',      sector: 'Consumer Disc.'   },
  BYND: { name: 'Beyond Meat',      sector: 'Consumer Staples' },
  CLSK: { name: 'CleanSpark',       sector: 'Technology'       },
  UPST: { name: 'Upstart',          sector: 'Financials'       },
  MARA: { name: 'Marathon Digital',  sector: 'Technology'       },
  NKLA: { name: 'Nikola',           sector: 'Industrials'      },
  OPEN: { name: 'Opendoor',         sector: 'Real Estate'      },
  SPCE: { name: 'Virgin Galactic',  sector: 'Industrials'      },
  SAVA: { name: 'Cassava Sciences', sector: 'Health Care'      },
  LAZR: { name: 'Luminar',          sector: 'Technology'       },
  IONQ: { name: 'IonQ',            sector: 'Technology'       },
  ARRY: { name: 'Array Technologies',sector: 'Industrials'     },
  XPEV: { name: 'XPeng',           sector: 'Consumer Disc.'   },
  WOLF: { name: 'Wolfspeed',       sector: 'Technology'       },
};

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'equityDeepDive_data';
  const today = todayStr();

  const daily = readDailyCache('equityDeepDive');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    let quotesMap = {};
    try {
      trackApiCall('Yahoo Finance');
      const raw = await yf.quote(SECTOR_ETF_TICKERS);
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.filter(q => q).forEach(q => { quotesMap[q.symbol] = q; });
    } catch (e) {
      console.warn('Equity ETF quotes failed:', e.message);
    }

    const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
    const histEnd   = new Date().toISOString().split('T')[0];
    trackApiCall('Yahoo Finance');
    const histResults = await Promise.allSettled(
      SECTOR_ETF_TICKERS.map(ticker =>
        yf.chart(ticker, { period1: histStart, period2: histEnd, interval: '1d' })
          .then(data => ({ ticker, closes: (data.quotes || []).map(q => q.close).filter(v => v != null) }))
      )
    );
    const chartMap = {};
    histResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value.closes.length >= 2) {
        chartMap[r.value.ticker] = r.value.closes;
      }
    });

    const perf = (closes, n) => {
      const len = closes.length;
      if (len < n + 1) return null;
      const prev = closes[Math.max(0, len - 1 - n)];
      const curr = closes[len - 1];
      return prev > 0 ? Math.round((curr - prev) / prev * 1000) / 10 : null;
    };

    const sectors = SECTOR_ETF_META.map(s => {
      const q      = quotesMap[s.code];
      const closes = chartMap[s.code] || [];
      return {
        code:   s.code,
        name:   s.name,
        perf1d: q?.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 100) / 100 : null,
        perf1w: perf(closes, 5),
        perf1m: perf(closes, 21),
        perf3m: perf(closes, 63),
        perf1y: closes.length >= 2 ? perf(closes, closes.length - 1) : null,
      };
    });

    const factor90dAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 95); return d.toISOString().split('T')[0]; })();
    const factorEnd = new Date().toISOString().split('T')[0];

    trackApiCall('Yahoo Finance');
    const [factorSummaries, ...factorCharts] = await Promise.allSettled([
      Promise.allSettled(EQ_FACTOR_TICKERS.map(t =>
        yf.quoteSummary(t, { modules: ['defaultKeyStatistics', 'financialData', 'calendarEvents', 'earningsTrend'] })
          .then(d => ({ ticker: t, ...d }))
      )).then(results => results.map((r, i) => r.status === 'fulfilled' ? r.value : { ticker: EQ_FACTOR_TICKERS[i] })),
      ...EQ_FACTOR_TICKERS.map(t =>
        yf.chart(t, { period1: factor90dAgo, period2: factorEnd, interval: '1d' })
          .then(data => ({ ticker: t, closes: (data.quotes || []).map(q => q.close).filter(v => v != null) }))
      ),
    ]);

    const summaries = factorSummaries.status === 'fulfilled' ? factorSummaries.value : [];
    const factorChartMap = {};
    factorCharts.forEach(r => {
      if (r.status === 'fulfilled' && r.value.closes?.length >= 2) factorChartMap[r.value.ticker] = r.value.closes;
    });

    const rawMetrics = EQ_FACTOR_TICKERS.map(ticker => {
      const s = summaries.find(x => x.ticker === ticker) || {};
      const ks = s.defaultKeyStatistics || {};
      const fd = s.financialData || {};
      const closes = factorChartMap[ticker] || [];

      const forwardPE = ks.forwardPE ?? fd.forwardPE ?? null;
      const valueFwd = forwardPE > 0 ? 1 / forwardPE : 0;
      const roe = fd.returnOnEquity != null ? fd.returnOnEquity * 100 : 0;
      const momentum3m = closes.length >= 2 ? (closes.at(-1) / closes[0] - 1) * 100 : 0;

      const recent60 = closes.slice(-61);
      let realizedVol = 50;
      if (recent60.length >= 20) {
        const logRets = [];
        for (let i = 1; i < recent60.length; i++) {
          if (recent60[i] > 0 && recent60[i-1] > 0) logRets.push(Math.log(recent60[i] / recent60[i-1]));
        }
        if (logRets.length > 1) {
          const mean = logRets.reduce((a, b) => a + b, 0) / logRets.length;
          const variance = logRets.reduce((a, b) => a + (b - mean) ** 2, 0) / (logRets.length - 1);
          realizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;
        }
      }

      return { ticker, valueFwd, momentum3m, roe, realizedVol };
    });

    function pctRank(arr, idx, key, invert = false) {
      const val = arr[idx][key];
      const sorted = arr.map(x => x[key]).sort((a, b) => invert ? b - a : a - b);
      const rank = sorted.indexOf(val);
      return Math.round(rank / Math.max(arr.length - 1, 1) * 100);
    }

    const factorStocks = rawMetrics.map((m, i) => {
      const meta = EQ_FACTOR_META[m.ticker] || {};
      const value    = pctRank(rawMetrics, i, 'valueFwd', false);
      const momentum = pctRank(rawMetrics, i, 'momentum3m', false);
      const quality  = pctRank(rawMetrics, i, 'roe', false);
      const lowVol   = pctRank(rawMetrics, i, 'realizedVol', true);
      const composite = Math.round((value + momentum + quality + lowVol) / 4);
      return { ticker: m.ticker, name: meta.name || m.ticker, sector: meta.sector || '', value, momentum, quality, lowVol, composite };
    });

    const avgValue    = Math.round((factorStocks.reduce((s, x) => s + x.value, 0) / factorStocks.length - 50) * 10) / 10;
    const avgMomentum = Math.round((factorStocks.reduce((s, x) => s + x.momentum, 0) / factorStocks.length - 50) * 10) / 10;
    const avgQuality  = Math.round((factorStocks.reduce((s, x) => s + x.quality, 0) / factorStocks.length - 50) * 10) / 10;
    const avgLowVol   = Math.round((factorStocks.reduce((s, x) => s + x.lowVol, 0) / factorStocks.length - 50) * 10) / 10;

    const factorData = {
      inFavor: { value: avgValue, momentum: avgMomentum, quality: avgQuality, lowVol: avgLowVol },
      stocks: factorStocks,
    };

    const now = new Date();
    const in45d = new Date(now); in45d.setDate(in45d.getDate() + 45);
    const upcoming = [];

    summaries.forEach(s => {
      const ticker = s.ticker;
      const meta = EQ_FACTOR_META[ticker] || {};
      const ce = s.calendarEvents?.earnings;
      const earningsDate = ce?.earningsDate?.[0] ?? null;
      if (!earningsDate) return;
      const ed = new Date(earningsDate);
      if (ed < now || ed > in45d) return;

      const et = s.earningsTrend?.trend?.find(t => t.period === '0q');
      const epsEst = et?.earningsEstimate?.avg ?? null;
      const epsPrev = s.defaultKeyStatistics?.trailingEps ?? null;
      const marketCapB = s.defaultKeyStatistics?.marketCap
        ? Math.round(s.defaultKeyStatistics.marketCap / 1e9)
        : null;

      upcoming.push({
        ticker,
        name: meta.name || ticker,
        sector: meta.sector || '',
        date: typeof earningsDate === 'string' ? earningsDate.split('T')[0] : ed.toISOString().split('T')[0],
        epsEst: epsEst != null ? Math.round(epsEst * 100) / 100 : null,
        epsPrev: epsPrev != null ? Math.round(epsPrev * 100) / 100 : null,
        marketCapB,
      });
    });
    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    const earningsData = { upcoming, beatRates: null };

    trackApiCall('Yahoo Finance');
    const shortSummaryResults = await Promise.allSettled(
      EQ_SHORT_TICKERS.map(t =>
        yf.quoteSummary(t, { modules: ['defaultKeyStatistics'] })
          .then(d => ({ ticker: t, ...d }))
      )
    );
    let shortQuotes = {};
    try {
      trackApiCall('Yahoo Finance');
      const sq = await yf.quote(EQ_SHORT_TICKERS);
      const sqArr = Array.isArray(sq) ? sq : [sq];
      sqArr.filter(q => q).forEach(q => { shortQuotes[q.symbol] = q; });
    } catch { /* proceed with empty quotes */ }

    const mostShorted = [];
    shortSummaryResults.forEach(r => {
      if (r.status !== 'fulfilled') return;
      const s = r.value;
      const ks = s.defaultKeyStatistics || {};
      const q = shortQuotes[s.ticker] || {};
      const meta = EQ_SHORT_META[s.ticker] || {};

      let shortFloat = ks.shortPercentOfFloat;
      if (shortFloat == null) return;
      if (shortFloat < 1) shortFloat = Math.round(shortFloat * 1000) / 10;
      else shortFloat = Math.round(shortFloat * 10) / 10;

      const sharesShort = ks.sharesShort || 0;
      const avgVol = q.averageDailyVolume10Day || ks.averageVolume10days || 1;
      const daysToCover = avgVol > 0 ? Math.round(sharesShort / avgVol * 10) / 10 : null;
      const marketCapB = (ks.marketCap || q.marketCap || 0) / 1e9;
      const perf1w = q.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 10) / 10 : null;

      mostShorted.push({
        ticker: s.ticker,
        name: meta.name || q.shortName || s.ticker,
        sector: meta.sector || '',
        shortFloat,
        daysToCover,
        marketCapB: Math.round(marketCapB),
        perf1w,
      });
    });
    mostShorted.sort((a, b) => (b.shortFloat || 0) - (a.shortFloat || 0));

    const shortData = { mostShorted };

    let equityRiskPremium = null;
    try {
      trackApiCall('Yahoo Finance');
      trackApiCall('FRED');
      const [spySummary, dgs10] = await Promise.all([
        yf.quoteSummary('SPY', { modules: ['defaultKeyStatistics'] }),
        fetchFredLatest('DGS10', FRED_API_KEY),
      ]);
      const trailingPE = spySummary?.defaultKeyStatistics?.trailingPE ?? null;
      if (trailingPE != null && trailingPE > 0 && dgs10 != null) {
        const earningsYield = Math.round((100 / trailingPE) * 100) / 100;
        const treasury10y   = Math.round(dgs10 * 100) / 100;
        const erp           = Math.round((earningsYield - treasury10y) * 100) / 100;
        equityRiskPremium = { earningsYield, treasury10y, erp };
      }
    } catch (e) {
      console.warn('ERP fetch failed:', e.message);
    }

    let spPE = null;
    try {
      trackApiCall('Yahoo Finance');
      const spySumm = await yf.quoteSummary('SPY', { modules: ['defaultKeyStatistics'] });
      const pe = spySumm?.defaultKeyStatistics?.trailingPE ?? null;
      if (pe != null) spPE = Math.round(pe * 10) / 10;
    } catch (e) {
      console.warn('S&P PE fetch failed:', e.message);
    }

    let breadthDivergence = null;
    try {
      const breadthStart = (() => { const d = new Date(); d.setDate(d.getDate() - 35); return d.toISOString().split('T')[0]; })();
      const breadthEnd   = new Date().toISOString().split('T')[0];
      trackApiCall('Yahoo Finance');
      const [spyCloses, rspCloses] = await Promise.all([
        yf.chart('SPY', { period1: breadthStart, period2: breadthEnd, interval: '1d' })
          .then(d => (d.quotes || []).map(q => q.close).filter(v => v != null)),
        yf.chart('RSP', { period1: breadthStart, period2: breadthEnd, interval: '1d' })
          .then(d => (d.quotes || []).map(q => q.close).filter(v => v != null)),
      ]);
      const calcPerf = (closes, days) => {
        if (closes.length < days + 1) return null;
        const prev = closes[Math.max(0, closes.length - 1 - days)];
        const curr = closes[closes.length - 1];
        return prev > 0 ? Math.round((curr - prev) / prev * 1000) / 10 : null;
      };
      const spy1m = calcPerf(spyCloses, 21);
      const rsp1m = calcPerf(rspCloses, 21);
      if (spy1m != null && rsp1m != null) {
        breadthDivergence = {
          spy1m,
          rsp1m,
          divergence: Math.round((spy1m - rsp1m) * 10) / 10,
        };
      }
    } catch (e) {
      console.warn('Breadth divergence fetch failed:', e.message);
    }

    let buffettIndicator = null;
    try {
      trackApiCall('FRED');
      const [wilshire, gdp] = await Promise.all([
        fetchFredLatest('WILL5000IND', FRED_API_KEY),
        fetchFredLatest('GDP', FRED_API_KEY),
      ]);
      if (wilshire != null && gdp != null && gdp > 0) {
        buffettIndicator = {
          wilshire: Math.round(wilshire * 10) / 10,
          gdp:      Math.round(gdp * 10) / 10,
          ratio:    Math.round(wilshire / gdp * 100 * 10) / 10,
        };
      }
    } catch (e) {
      console.warn('Buffett Indicator fetch failed:', e.message);
    }

    const result = {
      sectorData:   { sectors },
      factorData,
      earningsData,
      shortData,
      equityRiskPremium,
      spPE,
      breadthDivergence,
      buffettIndicator,
      lastUpdated:  today,
    };

    writeDailyCache('equityDeepDive', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('EquityDeepDive API error:', error);
    const fallback = readLatestCache('equityDeepDive');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
