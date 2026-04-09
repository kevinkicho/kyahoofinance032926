import { Router } from 'express';
import https from 'https';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 kyahoofinance' } }, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
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

router.get('/', async (_req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = _req.app.locals.cache;
  const today = todayStr();
  const daily = readDailyCache('sentiment');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  const cacheKey = 'sentiment_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

    const RETURN_TICKERS = ['SPY','QQQ','EEM','TLT','GLD','UUP','USO','BTC-USD'];
    const RETURN_LABELS  = ['S&P 500','Nasdaq 100','EM Equities','Long Bonds','Gold','US Dollar','Crude Oil','Bitcoin'];
    const RETURN_CATS    = ['US Equity','US Equity','Global','Fixed Income','Real Assets','Real Assets','Real Assets','Crypto'];

    const CFTC_MARKETS = {
      currencies:  [
        { code: 'EUR', name: 'Euro',          needle: 'EURO FX' },
        { code: 'JPY', name: 'Yen',           needle: 'JAPANESE YEN' },
        { code: 'GBP', name: 'Sterling',      needle: 'BRITISH POUND' },
        { code: 'CAD', name: 'Canadian $',    needle: 'CANADIAN DOLLAR' },
        { code: 'CHF', name: 'Swiss Franc',   needle: 'SWISS FRANC' },
        { code: 'AUD', name: 'Aussie $',      needle: 'AUSTRALIAN DOLLAR' },
      ],
      equities: [
        { code: 'ES',  name: 'E-Mini S&P 500', needle: 'E-MINI S&P 500' },
        { code: 'NQ',  name: 'E-Mini Nasdaq',  needle: 'E-MINI NASDAQ-100' },
      ],
      rates: [
        { code: 'ZN',  name: '10-Yr T-Notes',  needle: '10-YEAR U.S. TREASURY NOTES' },
      ],
      commodities: [
        { code: 'GC',  name: 'Gold',           needle: 'GOLD - COMMODITY EXCHANGE' },
        { code: 'CL',  name: 'Crude Oil',      needle: 'CRUDE OIL, LIGHT SWEET' },
      ],
    };

    const cftcUrl = 'https://publicreporting.cftc.gov/resource/jun7-fc8e.json' +
      '?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,' +
      'noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all' +
      '&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=50';

    const period1 = daysAgo(95);

    trackApiCall('Alternative.me');
    if (FRED_API_KEY) trackApiCall('FRED');
    trackApiCall('CFTC Socrata');
    trackApiCall('Yahoo Finance');
    const [
      altmeResult,
      vixHistResult,
      hyHistResult,
      igLatestResult,
      ycLatestResult,
      cftcResult,
      marginDebtResult,
      mutualFundFlowsResult,
      consumerCreditResult,
      vvixHistResult,
      fsiResult,
      ...yahooResults
    ] = await Promise.allSettled([
      fetchJson('https://api.alternative.me/fng/?limit=252'),
      FRED_API_KEY ? fetchFredHistory('VIXCLS', FRED_API_KEY, 270)        : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('BAMLH0A0HYM2', FRED_API_KEY, 270)  : Promise.resolve([]),
      FRED_API_KEY ? fetchFredLatest('BAMLC0A0CM', FRED_API_KEY)          : Promise.resolve(null),
      FRED_API_KEY ? fetchFredLatest('T10Y2Y', FRED_API_KEY)              : Promise.resolve(null),
      fetchJson(cftcUrl),
      FRED_API_KEY ? fetchFredHistory('BOGZ1FL663067003Q', FRED_API_KEY, 24) : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('WDDNS', FRED_API_KEY, 12)             : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('TOTALSL', FRED_API_KEY, 24)           : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('VXVCLS', FRED_API_KEY, 6)             : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('STLFSI4', FRED_API_KEY, 36)          : Promise.resolve([]),
      ...RETURN_TICKERS.map(t => yf.historical(t, { period1, period2: today, interval: '1d' })),
    ]);

    const altme    = altmeResult.status    === 'fulfilled' ? altmeResult.value    : null;
    const vixHist  = vixHistResult.status  === 'fulfilled' ? vixHistResult.value  : [];
    const hyHist   = hyHistResult.status   === 'fulfilled' ? hyHistResult.value   : [];
    const igLatest = igLatestResult.status === 'fulfilled' ? igLatestResult.value : null;
    const ycLatest = ycLatestResult.status === 'fulfilled' ? ycLatestResult.value : null;

    const altmeScore  = altme?.data?.[0]?.value != null ? Number(altme.data[0].value) : 50;
    const altmeHistory = (altme?.data || []).map(d => ({
      date:  d.timestamp ? new Date(Number(d.timestamp) * 1000).toISOString().split('T')[0] : d.date,
      value: Number(d.value),
    })).reverse();

    const vixCloses   = vixHist.slice(-252).map(p => p.value).filter(Boolean);
    const hyCloses    = hyHist.slice(-252).map(p => p.value).filter(Boolean);
    const currentVix  = vixCloses.at(-1) ?? null;
    const currentHy   = hyCloses.at(-1)  ?? null;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const vixPercentile  = currentVix != null && vixCloses.length > 20
      ? Math.round(vixCloses.filter(v => v <= currentVix).length / vixCloses.length * 100)
      : 50;
    const hyPercentile   = currentHy != null && hyCloses.length > 20
      ? Math.round(hyCloses.filter(v => v <= currentHy).length / hyCloses.length * 100)
      : 50;

    const spyHist    = yahooResults[0].status === 'fulfilled' ? yahooResults[0].value : [];
    const spyCloses  = spyHist.map(d => d.close).filter(Boolean);
    const spy1mReturn = spyCloses.length >= 2
      ? Math.round(((spyCloses.at(-1) / spyCloses[0]) - 1) * 1000) / 10
      : 0;

    const vixSignal      = 100 - vixPercentile;
    const hySignal       = 100 - hyPercentile;
    const ycVal          = ycLatest ?? 0;
    const ycSignal       = clamp(Math.round((ycVal + 1) / 2 * 100), 0, 100);
    const momentumSignal = clamp(Math.round((spy1mReturn + 10) / 20 * 100), 0, 100);

    const composite = Math.round(
      altmeScore * 0.30 + vixSignal * 0.25 + hySignal * 0.20 + momentumSignal * 0.15 + ycSignal * 0.10
    );

    function scoreLabel(s) {
      if (s <= 25) return 'Extreme Fear';
      if (s <= 45) return 'Fear';
      if (s <= 55) return 'Neutral';
      if (s <= 75) return 'Greed';
      return 'Extreme Greed';
    }
    function indSignal(s) {
      return s >= 60 ? 'greed' : s <= 40 ? 'fear' : 'neutral';
    }

    const fearGreedData = {
      score:      composite,
      label:      scoreLabel(composite),
      altmeScore,
      history:    altmeHistory.slice(-252),
      indicators: [
        { name: 'Alt.me F&G',   value: altmeScore,    signal: indSignal(altmeScore),    percentile: null },
        { name: 'VIX Level',    value: currentVix != null ? Math.round(currentVix * 10) / 10 : null, signal: indSignal(vixSignal),  percentile: vixPercentile },
        { name: 'HY Spread',    value: currentHy  != null ? Math.round(currentHy)  : null,           signal: indSignal(hySignal),   percentile: hyPercentile },
        { name: 'Yield Curve',  value: ycLatest  != null ? Math.round(ycLatest * 100) / 100 : null,  signal: indSignal(ycSignal)   },
        { name: 'SPY Momentum', value: spy1mReturn,   signal: indSignal(momentumSignal) },
      ],
    };

    const cftcRows = cftcResult.status === 'fulfilled' ? cftcResult.value : [];
    function parseCftcGroup(defs) {
      const asOf = cftcRows[0]?.report_date_as_yyyy_mm_dd ?? null;
      return {
        asOf,
        items: defs.map(def => {
          const row = cftcRows.find(r => r.market_and_exchange_names?.includes(def.needle));
          if (!row) return { ...def, netPct: 0, longK: 0, shortK: 0, oiK: 0 };
          const long  = parseFloat(row.noncomm_positions_long_all)  || 0;
          const short = parseFloat(row.noncomm_positions_short_all) || 0;
          const oi    = parseFloat(row.open_interest_all)            || 1;
          return {
            code:   def.code,
            name:   def.name,
            netPct: Math.round((long - short) / oi * 100 * 10) / 10,
            longK:  Math.round(long  / 1000),
            shortK: Math.round(short / 1000),
            oiK:    Math.round(oi    / 1000),
          };
        }),
      };
    }

    const currParsed = parseCftcGroup(CFTC_MARKETS.currencies);
    const cftcData = {
      asOf:        currParsed.asOf,
      currencies:  currParsed.items,
      equities:    parseCftcGroup(CFTC_MARKETS.equities).items,
      rates:       parseCftcGroup(CFTC_MARKETS.rates).items,
      commodities: parseCftcGroup(CFTC_MARKETS.commodities).items,
    };

    function get1mReturn(idx) {
      const hist = yahooResults[idx].status === 'fulfilled' ? yahooResults[idx].value : [];
      const closes = hist.map(d => d.close).filter(Boolean);
      if (closes.length < 2) return null;
      return Math.round(((closes.at(-1) / closes[0]) - 1) * 1000) / 10;
    }

    const gldRet  = get1mReturn(4);
    const uupRet  = get1mReturn(5);
    const eemRet  = get1mReturn(2);
    const spyRet  = spy1mReturn;

    const goldVsUsd   = gldRet != null && uupRet != null ? Math.round((gldRet - uupRet) * 10) / 10 : null;
    const emVsUs      = eemRet != null ? Math.round((eemRet - spyRet) * 10) / 10 : null;
    const igSpread    = igLatest ?? null;
    const hySpread    = currentHy ?? null;
    const vixValue    = currentVix ?? null;
    const yieldCurve  = ycLatest ?? null;

    function riskSignal(name, value) {
      if (name === 'Yield Curve')      return value == null ? 'neutral' : value > 0.5 ? 'risk-on' : value < -0.5 ? 'risk-off' : 'neutral';
      if (name === 'HY Credit Spread') return value == null ? 'neutral' : value < 350 ? 'risk-on' : value > 500 ? 'risk-off' : 'neutral';
      if (name === 'IG Credit Spread') return value == null ? 'neutral' : value < 100 ? 'risk-on' : value > 150 ? 'risk-off' : 'neutral';
      if (name === 'VIX')             return value == null ? 'neutral' : value < 15 ? 'risk-on' : value > 25 ? 'risk-off' : 'neutral';
      if (name === 'Gold vs USD')     return value == null ? 'neutral' : value > 2 ? 'risk-off' : value < -2 ? 'risk-on' : 'neutral';
      if (name === 'EM vs US Equities') return value == null ? 'neutral' : value > 2 ? 'risk-on' : value < -2 ? 'risk-off' : 'neutral';
      if (name === 'Financial Stress') return value == null ? 'neutral' : value < 0 ? 'risk-on' : value > 1 ? 'risk-off' : 'neutral';
      return 'neutral';
    }
    function riskDesc(name, value, signal) {
      if (name === 'Yield Curve')      return signal === 'risk-on' ? 'Normal — growth expected' : signal === 'risk-off' ? 'Inverted — recession signal' : 'Flat — uncertain';
      if (name === 'HY Credit Spread') return signal === 'risk-on' ? 'Compressed — risk-on' : signal === 'risk-off' ? 'Wide — stress signal' : 'Elevated — caution';
      if (name === 'IG Credit Spread') return signal === 'risk-on' ? 'Tight — confidence' : signal === 'risk-off' ? 'Wide — risk-off' : 'Moderate';
      if (name === 'VIX')             return signal === 'risk-on' ? 'Low vol — complacency' : signal === 'risk-off' ? 'Elevated fear' : 'Moderate uncertainty';
      if (name === 'Gold vs USD')     return signal === 'risk-off' ? 'Gold bid — safe haven' : signal === 'risk-on' ? 'Dollar bid — risk appetite' : 'Mixed signals';
      if (name === 'EM vs US Equities') return signal === 'risk-on' ? 'EM outperforming — global risk-on' : signal === 'risk-off' ? 'EM lagging — flight to quality' : 'Mixed';
      if (name === 'Financial Stress') return signal === 'risk-on' ? 'Below average — calm' : signal === 'risk-off' ? 'Elevated — stress detected' : 'Near normal';
      return '';
    }
    function riskFmt(name, value) {
      if (value == null) return '—';
      if (name === 'HY Credit Spread' || name === 'IG Credit Spread') return `${Math.round(value)}bps`;
      if (name === 'Yield Curve') return `${value.toFixed(2)}%`;
      if (name === 'VIX') return value.toFixed(1);
      if (name === 'Financial Stress') return value.toFixed(2);
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    }

    const fsiHist = fsiResult.status === 'fulfilled' ? fsiResult.value : [];
    const fsiValue = fsiHist.length > 0 ? fsiHist[fsiHist.length - 1].value : null;

    const rawSignals = [
      { name: 'Yield Curve',       value: yieldCurve },
      { name: 'HY Credit Spread',  value: hySpread },
      { name: 'IG Credit Spread',   value: igSpread },
      { name: 'VIX',               value: vixValue },
      { name: 'Gold vs USD',       value: goldVsUsd },
      { name: 'EM vs US Equities', value: emVsUs },
      { name: 'Financial Stress',  value: fsiValue },
    ];

    const signals = rawSignals.map(s => {
      const sig = riskSignal(s.name, s.value);
      return { name: s.name, value: s.value, signal: sig, description: riskDesc(s.name, s.value, sig), fmt: riskFmt(s.name, s.value) };
    });

    const scoreMap = { 'risk-on': 100, neutral: 50, 'risk-off': 0 };
    const overallScore = Math.round(signals.reduce((sum, s) => sum + scoreMap[s.signal], 0) / signals.length);
    const overallLabel = overallScore >= 65 ? 'Risk-On' : overallScore <= 35 ? 'Risk-Off' : 'Neutral';

    const riskData = { overallScore, overallLabel, signals };

    const assets = RETURN_TICKERS.map((ticker, idx) => {
      const hist   = yahooResults[idx].status === 'fulfilled' ? yahooResults[idx].value : [];
      const closes = hist.map(d => d.close).filter(Boolean);
      const pct = (a, b) => a != null && b != null && b !== 0 ? Math.round((a / b - 1) * 10000) / 100 : null;
      // Daily returns for correlation matrix (% change day-over-day)
      const dailyReturns = closes.length >= 2
        ? closes.slice(1).map((c, i) => Math.round((c / closes[i] - 1) * 10000) / 100)
        : [];
      return {
        ticker,
        label:    RETURN_LABELS[idx],
        category: RETURN_CATS[idx],
        ret1d:  closes.length >= 2  ? pct(closes.at(-1), closes.at(-2))  : null,
        ret1w:  closes.length >= 6  ? pct(closes.at(-1), closes.at(-6))  : null,
        ret1m:  closes.length >= 22 ? pct(closes.at(-1), closes.at(-22)) : null,
        ret3m:  closes.length >= 2  ? pct(closes.at(-1), closes[0])      : null,
        dailyReturns,
      };
    });

    const returnsData = { asOf: today, assets };

    function fredHistToSeries(settlResult) {
      try {
        const rows = settlResult.status === 'fulfilled' ? settlResult.value : [];
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return {
          dates:  rows.map(r => r.date),
          values: rows.map(r => r.value),
        };
      } catch (_) { return null; }
    }

    const marginDebt      = fredHistToSeries(marginDebtResult);
    const mutualFundFlows = fredHistToSeries(mutualFundFlowsResult);
    const consumerCredit  = fredHistToSeries(consumerCreditResult);
    const vvixHistory      = fredHistToSeries(vvixHistResult);
    const fsiHistory       = fredHistToSeries(fsiResult);

    const result = {
      fearGreedData, cftcData, riskData, returnsData,
      marginDebt, mutualFundFlows, consumerCredit, vvixHistory, fsiHistory,
      lastUpdated: today,
    };

    writeDailyCache('sentiment', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Sentiment API error:', error);
    const fallback = readLatestCache('sentiment');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
