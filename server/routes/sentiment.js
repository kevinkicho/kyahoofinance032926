import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory, fetchFredLatest } from '../lib/fred.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';
import { omitNullFields, computeIsLive, sanitizeMarketPayload } from '../lib/dataHygiene.js';

const router = Router();

router.get('/', async (_req, res) => {
  const FRED_API_KEY = (process.env.FRED_API_KEY || '').trim();
  const refresh = _req.query.refresh === 'true';
  const cache = _req.app.locals.cache;
  const today = todayStr();

  function hasFredCoverage(data) {
    const s = data?._sources || {};
    return !!(
      s.vixData ||
      s.hySpreadData ||
      s.igSpreadData ||
      s.yieldCurveData ||
      s.marginDebt ||
      s.consumerCredit ||
      s.vvixData ||
      s.financialStressIndex
    );
  }

  const SENT_LIVE = [
    'fearGreedData', 'riskData', 'returnsData', 'cftcData', 'fsiHistory', 'vvixHistory',
  ];
  const dailyRaw = refresh ? null : readDailyCache('sentiment');
  if (dailyRaw && (!FRED_API_KEY || hasFredCoverage(dailyRaw))) {
    const daily = sanitizeMarketPayload(dailyRaw);
    daily.isLive = computeIsLive(daily, SENT_LIVE);
    return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  }
  const cacheKey = 'sentiment_data';
  const cachedRaw = refresh ? null : cache.get(cacheKey);
  if (cachedRaw && (!FRED_API_KEY || hasFredCoverage(cachedRaw))) {
    const cached = sanitizeMarketPayload(cachedRaw);
    cached.isLive = computeIsLive(cached, SENT_LIVE);
    return res.json({ ...cached, fetchedOn: today, isCurrent: true });
  }

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

    const G10_TICKERS = ['EURUSD=X', 'USDJPY=X', 'GBPUSD=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X', 'USDSEK=X', 'USDNOK=X', 'USDDKK=X'];
    const G10_LABELS  = ['EUR', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD', 'SEK', 'NOK', 'DKK'];

    // CFTC Socrata query. Limit=50 only returned the first 50 rows of the
    // most-recent report (alphabetically), missing Gold/Crude/etc. Bump
    // to 800 so the full slice for the latest week is captured (~600
    // markets per report).
    const cftcUrl = 'https://publicreporting.cftc.gov/resource/jun7-fc8e.json' +
      '?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,' +
      'noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all' +
      '&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=800';

    const period1 = daysAgo(95);
    const g10Period1 = daysAgo(60); // Fetch slightly more for a clean 30-day window


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
      fetchJSON('https://api.alternative.me/fng/?limit=252'),
      FRED_API_KEY ? fetchFredHistory('VIXCLS', FRED_API_KEY, 270)        : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('BAMLH0A0HYM2', FRED_API_KEY, 270)  : Promise.resolve([]),
      FRED_API_KEY ? fetchFredLatest('BAMLC0A0CM', FRED_API_KEY)          : Promise.resolve(null),
      FRED_API_KEY ? fetchFredLatest('T10Y2Y', FRED_API_KEY)              : Promise.resolve(null),
      fetchJSON(cftcUrl),
      FRED_API_KEY ? fetchFredHistory('BOGZ1FL663067003Q', FRED_API_KEY, 24) : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('WDDNS', FRED_API_KEY, 12)             : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('TOTALSL', FRED_API_KEY, 24)           : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('VXVCLS', FRED_API_KEY, 6)             : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('STLFSI4', FRED_API_KEY, 270)         : Promise.resolve([]),
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

    // Indicators filled in fully after IG/HY bps + Yahoo vol gauges are ready
    // (see enrichFearGreedIndicators below).
    const fearGreedData = {
      score:      composite,
      label:      scoreLabel(composite),
      altmeScore,
      history:    altmeHistory.slice(-252),
      indicators: [],
      weights: {
        altme: 0.30,
        vix: 0.25,
        hy: 0.20,
        momentum: 0.15,
        yc: 0.10,
      },
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
    // FRED BAML OAS prints are in *percent* (2.68 = 268 bps). Convert once.
    const toBps = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100));
    const igSpread    = toBps(igLatest);
    const hySpread    = toBps(currentHy);
    const vixValue    = currentVix != null ? Math.round(currentVix * 10) / 10 : null;
    const yieldCurve  = ycLatest ?? null;

    // Extra vol / rate-vol gauges from Yahoo (not on free FRED).
    let vvixSpot = null, moveSpot = null, skewSpot = null, vix3mSpot = null;
    try {
      trackApiCall('Yahoo Finance');
      const riskQuotes = await yf.quote(['^VVIX', '^MOVE', '^SKEW', '^VIX3M']);
      const arr = Array.isArray(riskQuotes) ? riskQuotes : [riskQuotes];
      const bySym = Object.fromEntries(arr.filter(q => q?.symbol).map(q => [q.symbol, q.regularMarketPrice]));
      vvixSpot  = bySym['^VVIX']  != null ? Math.round(bySym['^VVIX'] * 10) / 10 : null;
      moveSpot  = bySym['^MOVE']  != null ? Math.round(bySym['^MOVE'] * 10) / 10 : null;
      skewSpot  = bySym['^SKEW']  != null ? Math.round(bySym['^SKEW'] * 10) / 10 : null;
      vix3mSpot = bySym['^VIX3M'] != null ? Math.round(bySym['^VIX3M'] * 10) / 10 : null;
    } catch (e) {
      console.warn('[Sentiment] risk indices quote failed:', e.message);
    }

    function riskSignal(name, value) {
      if (name === 'Yield Curve')      return value == null ? 'neutral' : value > 0.5 ? 'risk-on' : value < -0.5 ? 'risk-off' : 'neutral';
      if (name === 'HY Credit Spread') return value == null ? 'neutral' : value < 350 ? 'risk-on' : value > 500 ? 'risk-off' : 'neutral';
      if (name === 'IG Credit Spread') return value == null ? 'neutral' : value < 100 ? 'risk-on' : value > 150 ? 'risk-off' : 'neutral';
      if (name === 'VIX')             return value == null ? 'neutral' : value < 15 ? 'risk-on' : value > 25 ? 'risk-off' : 'neutral';
      if (name === 'VVIX')            return value == null ? 'neutral' : value < 90 ? 'risk-on' : value > 120 ? 'risk-off' : 'neutral';
      if (name === 'MOVE')            return value == null ? 'neutral' : value < 80 ? 'risk-on' : value > 120 ? 'risk-off' : 'neutral';
      if (name === 'SKEW')            return value == null ? 'neutral' : value < 120 ? 'risk-on' : value > 140 ? 'risk-off' : 'neutral';
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
      if (name === 'VVIX')            return signal === 'risk-on' ? 'Calm vol-of-vol' : signal === 'risk-off' ? 'Vol-of-vol elevated' : 'Moderate VVIX';
      if (name === 'MOVE')            return signal === 'risk-on' ? 'Rates vol calm' : signal === 'risk-off' ? 'Rates vol stressed' : 'Moderate bond vol';
      if (name === 'SKEW')            return signal === 'risk-on' ? 'Tail hedge cheap' : signal === 'risk-off' ? 'Tail risk bid' : 'Moderate skew';
      if (name === 'Gold vs USD')     return signal === 'risk-off' ? 'Gold bid — safe haven' : signal === 'risk-on' ? 'Dollar bid — risk appetite' : 'Mixed signals';
      if (name === 'EM vs US Equities') return signal === 'risk-on' ? 'EM outperforming — global risk-on' : signal === 'risk-off' ? 'EM lagging — flight to quality' : 'Mixed';
      if (name === 'Financial Stress') return signal === 'risk-on' ? 'Below average — calm' : signal === 'risk-off' ? 'Elevated — stress detected' : 'Near normal';
      return '';
    }
    function riskFmt(name, value) {
      if (value == null) return '—';
      if (name === 'HY Credit Spread' || name === 'IG Credit Spread') return `${Math.round(value)} bps`;
      if (name === 'Yield Curve') return `${value.toFixed(2)}%`;
      if (name === 'VIX' || name === 'VVIX' || name === 'MOVE' || name === 'SKEW' || name === 'VIX3M') return Number(value).toFixed(1);
      if (name === 'Financial Stress') return value.toFixed(2);
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    }

    const fsiHist = fsiResult.status === 'fulfilled' ? fsiResult.value : [];
    const fsiValue = fsiHist.length > 0
      ? Math.round(Number(fsiHist[fsiHist.length - 1].value) * 1000) / 1000
      : null;

    const rawSignals = [
      { name: 'Yield Curve',       value: yieldCurve },
      { name: 'HY Credit Spread',  value: hySpread },
      { name: 'IG Credit Spread',  value: igSpread },
      { name: 'VIX',               value: vixValue },
      { name: 'VVIX',              value: vvixSpot },
      { name: 'MOVE',              value: moveSpot },
      { name: 'SKEW',              value: skewSpot },
      { name: 'Gold vs USD',       value: goldVsUsd },
      { name: 'EM vs US Equities', value: emVsUs },
      { name: 'Financial Stress',  value: fsiValue },
    ].filter(s => s.value != null && Number.isFinite(Number(s.value)));

    const signals = rawSignals.map(s => {
      const sig = riskSignal(s.name, s.value);
      return { name: s.name, value: s.value, signal: sig, description: riskDesc(s.name, s.value, sig), fmt: riskFmt(s.name, s.value) };
    }).filter(s => s.value != null);

    const scoreMap = { 'risk-on': 100, neutral: 50, 'risk-off': 0 };
    const overallScore = signals.length
      ? Math.round(signals.reduce((sum, s) => sum + scoreMap[s.signal], 0) / signals.length)
      : 50;
    const overallLabel = overallScore >= 65 ? 'Risk-On' : overallScore <= 35 ? 'Risk-Off' : 'Neutral';

    // Flattened metrics for Market Snapshot sidebar (don't rely on signal name matching alone).
    // Drop null flat fields so panels never bind empty placeholders.
    const riskData = omitNullFields({
      overallScore,
      overallLabel,
      signals,
      vix: vixValue,
      vix3m: vix3mSpot,
      vvix: vvixSpot,
      move: moveSpot,
      skew: skewSpot,
      hyOas: hySpread,
      igOas: igSpread,
      yieldCurve,
      fsi: fsiValue,
      goldVsUsd,
      emVsUs,
      vixPercentile,
      hyPercentile,
    });

    // ── Fear & Greed component table (dense, unit-aware) ──
    // CNN-style coverage using free sources: Alt.me, VIX complex, credit OAS,
    // curve, equity/EM momentum, rates vol, stress index.
    const fmtInd = (name, value, unit) => {
      if (value == null || !Number.isFinite(Number(value))) return '—';
      const v = Number(value);
      if (unit === 'bps') return `${Math.round(v)} bps`;
      if (unit === 'pct') return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
      if (unit === 'pp') return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
      if (unit === 'score') return `${Math.round(v)}`;
      if (unit === 'idx') return v.toFixed(2);
      return v.toFixed(1);
    };
    const moveSignal = moveSpot == null ? 'neutral' : moveSpot < 80 ? 'greed' : moveSpot > 120 ? 'fear' : 'neutral';
    const vvixSignal = vvixSpot == null ? 'neutral' : vvixSpot < 90 ? 'greed' : vvixSpot > 120 ? 'fear' : 'neutral';
    const skewSignal = skewSpot == null ? 'neutral' : skewSpot < 120 ? 'greed' : skewSpot > 140 ? 'fear' : 'neutral';
    const fsiSignal  = fsiValue == null ? 'neutral' : fsiValue < 0 ? 'greed' : fsiValue > 1 ? 'fear' : 'neutral';
    const goldSignal = goldVsUsd == null ? 'neutral' : goldVsUsd > 2 ? 'fear' : goldVsUsd < -2 ? 'greed' : 'neutral';
    const emSignal   = emVsUs == null ? 'neutral' : emVsUs > 2 ? 'greed' : emVsUs < -2 ? 'fear' : 'neutral';
    const igSignal   = igSpread == null ? 'neutral' : igSpread < 100 ? 'greed' : igSpread > 150 ? 'fear' : 'neutral';
    const termSpread = (vixValue != null && vix3mSpot != null)
      ? Math.round((vix3mSpot - vixValue) * 10) / 10
      : null;
    const termSignal = termSpread == null ? 'neutral' : termSpread < 0 ? 'fear' : termSpread > 1 ? 'greed' : 'neutral';

    fearGreedData.indicators = [
      {
        name: 'Alt.me F&G',
        value: altmeScore,
        display: fmtInd('Alt.me', altmeScore, 'score'),
        unit: 'score',
        signal: indSignal(altmeScore),
        percentile: null,
        weight: 0.30,
        description: 'Crypto / retail sentiment survey',
      },
      {
        name: 'VIX Level',
        value: vixValue,
        display: fmtInd('VIX', vixValue, 'level'),
        unit: 'level',
        signal: indSignal(vixSignal),
        percentile: vixPercentile,
        weight: 0.25,
        description: 'Equity implied vol',
      },
      {
        name: 'VIX 3M',
        value: vix3mSpot,
        display: fmtInd('VIX3M', vix3mSpot, 'level'),
        unit: 'level',
        signal: termSignal,
        percentile: null,
        weight: null,
        description: '3-month equity vol',
      },
      {
        name: 'Vol Term (3M−1M)',
        value: termSpread,
        display: termSpread == null ? '—' : `${termSpread >= 0 ? '+' : ''}${termSpread.toFixed(1)}`,
        unit: 'level',
        signal: termSignal,
        percentile: null,
        weight: null,
        description: termSpread != null && termSpread < 0 ? 'Backwardation — stress' : 'Contango — calm',
      },
      {
        name: 'VVIX',
        value: vvixSpot,
        display: fmtInd('VVIX', vvixSpot, 'level'),
        unit: 'level',
        signal: vvixSignal,
        percentile: null,
        weight: null,
        description: 'Vol-of-vol',
      },
      {
        name: 'MOVE',
        value: moveSpot,
        display: fmtInd('MOVE', moveSpot, 'level'),
        unit: 'level',
        signal: moveSignal,
        percentile: null,
        weight: null,
        description: 'Treasury bond vol',
      },
      {
        name: 'SKEW',
        value: skewSpot,
        display: fmtInd('SKEW', skewSpot, 'level'),
        unit: 'level',
        signal: skewSignal,
        percentile: null,
        weight: null,
        description: 'Tail-risk premium',
      },
      {
        name: 'HY OAS',
        value: hySpread,
        display: fmtInd('HY', hySpread, 'bps'),
        unit: 'bps',
        signal: indSignal(hySignal),
        percentile: hyPercentile,
        weight: 0.20,
        description: 'High-yield credit stress',
      },
      {
        name: 'IG OAS',
        value: igSpread,
        display: fmtInd('IG', igSpread, 'bps'),
        unit: 'bps',
        signal: igSignal,
        percentile: null,
        weight: null,
        description: 'Investment-grade credit',
      },
      {
        name: 'Yield Curve 10Y−2Y',
        value: yieldCurve,
        display: fmtInd('YC', yieldCurve, 'pp'),
        unit: 'pp',
        signal: indSignal(ycSignal),
        percentile: null,
        weight: 0.10,
        description: 'Growth / recession signal',
      },
      {
        name: 'SPY Momentum 1M',
        value: spy1mReturn,
        display: fmtInd('SPY', spy1mReturn, 'pct'),
        unit: 'pct',
        signal: indSignal(momentumSignal),
        percentile: null,
        weight: 0.15,
        description: 'Equity trend',
      },
      {
        name: 'Gold vs USD 1M',
        value: goldVsUsd,
        display: fmtInd('Gold', goldVsUsd, 'pct'),
        unit: 'pct',
        signal: goldSignal,
        percentile: null,
        weight: null,
        description: 'Safe-haven demand',
      },
      {
        name: 'EM vs US 1M',
        value: emVsUs,
        display: fmtInd('EM', emVsUs, 'pct'),
        unit: 'pct',
        signal: emSignal,
        percentile: null,
        weight: null,
        description: 'Global risk appetite',
      },
      {
        name: 'STLFSI',
        value: fsiValue,
        display: fmtInd('FSI', fsiValue, 'idx'),
        unit: 'idx',
        signal: fsiSignal,
        percentile: null,
        weight: null,
        description: 'St. Louis financial stress',
      },
    ]
      .filter(ind => ind.value != null && Number.isFinite(Number(ind.value)))
      .map((ind) => omitNullFields(ind));

    const assets = RETURN_TICKERS.map((ticker, idx) => {
      const hist   = yahooResults[idx].status === 'fulfilled' ? yahooResults[idx].value : [];
      const closes = hist.map(d => d.close).filter(Boolean);
      const pct = (a, b) => a != null && b != null && b !== 0 ? Math.round((a / b - 1) * 10000) / 100 : null;
      // Daily returns for correlation matrix (% change day-over-day)
      const dailyReturns = closes.length >= 2
        ? closes.slice(1).map((c, i) => Math.round((c / closes[i] - 1) * 10000) / 100)
        : [];
      return omitNullFields({
        ticker,
        label:    RETURN_LABELS[idx],
        category: RETURN_CATS[idx],
        ret1d:  closes.length >= 2  ? pct(closes.at(-1), closes.at(-2))  : null,
        ret1w:  closes.length >= 6  ? pct(closes.at(-1), closes.at(-6))  : null,
        ret1m:  closes.length >= 22 ? pct(closes.at(-1), closes.at(-22)) : null,
        ret3m:  closes.length >= 2  ? pct(closes.at(-1), closes[0])      : null,
        dailyReturns: dailyReturns.length ? dailyReturns : null,
      });
    }).filter((a) => a.ret1d != null || a.ret1w != null || a.ret1m != null || a.ret3m != null);

    const returnsData = { asOf: today, assets };

    function fredHistToSeries(settlResult) {
      try {
        const rows = settlResult.status === 'fulfilled' ? settlResult.value : [];
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return {
          dates:  rows.map(r => r.date),
          values: rows.map(r => r.value),
        };
      } catch (e) { console.warn('[Sentiment]', e.message || e); return null; }
    }

    const marginDebt      = fredHistToSeries(marginDebtResult);
    const mutualFundFlows = fredHistToSeries(mutualFundFlowsResult);
    const consumerCredit  = fredHistToSeries(consumerCreditResult);
    const vvixHistory      = fredHistToSeries(vvixHistResult);
    const fsiHistory       = fredHistToSeries(fsiResult);

    const _sources = {
      fearGreedData: !!(fearGreedData && fearGreedData.indicators?.length),
      vixData: !!(vixHist.length),
      hySpreadData: !!(hyHist.length),
      igSpreadData: igLatest != null,
      yieldCurveData: ycLatest != null,
      cftcCot: !!(cftcData && cftcData.currencies?.length),
      marginDebt: !!marginDebt,
      mutualFundFlows: !!mutualFundFlows,
      consumerCredit: !!consumerCredit,
      vvixData: !!vvixHistory,
      financialStressIndex: !!fsiHistory,
    };

    const result = sanitizeMarketPayload({
      fearGreedData, cftcData, riskData, returnsData,
      marginDebt, mutualFundFlows, consumerCredit, vvixHistory, fsiHistory,
      _sources,
      lastUpdated: today,
    });
    result.isLive = computeIsLive(result, SENT_LIVE);

    if (!FRED_API_KEY || hasFredCoverage(result)) {
      writeDailyCache('sentiment', result);
      cache.set(cacheKey, result, 300);
    }
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Sentiment API error:', error);
    return sendCachedOrDegradedSync(res, 'sentiment', {
      error,
      memoryCache: _req.app.locals.cache,
      cacheKey: 'sentiment_data',
    });
  }
});

export default router;
