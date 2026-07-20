import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory } from '../lib/fred.js';

const router = Router();

const VIX_TICKERS = ['^VIX9D', '^VIX', '^VIX3M', '^VIX6M'];
const VIX_LABELS  = ['9D', '1M', '3M', '6M'];

async function buildVolAndGamma(spyPrice) {
  const targetDays  = [7, 14, 30, 60, 90, 180, 365, 730];
  const expLabels   = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y', '2Y'];
  const strikePcts  = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];
  const strikes     = [80, 85, 90, 95, 100, 105, 110, 115, 120];

  let expirations;
  try {
    trackApiCall('Yahoo Finance');
    const idx = await yf.options('SPY');
    expirations = idx.expirationDates || [];
  } catch (e) { console.warn('[Derivatives] buildVolAndGamma failed:', e?.message); return { _error: `buildVolAndGamma: ${e?.message}` }; }

  const now = Math.floor(Date.now() / 1000);
  const volGrid = [];
  const gexMap = {};

  for (const days of targetDays) {
    const target = now + days * 86400;
    const nearest = expirations.reduce((best, d) =>
      Math.abs(d - target) < Math.abs(best - target) ? d : best, expirations[0]);
    try {
      trackApiCall('Yahoo Finance');
      const opts = await yf.options('SPY', { date: nearest });
      const calls = opts.options[0]?.calls || [];
      const puts = opts.options[0]?.puts || [];

      // Vol Surface Row
      const row = strikePcts.map(pct => {
        const ts = Math.round(spyPrice * pct);
        const c  = calls.reduce((b, x) => Math.abs(x.strike - ts) < Math.abs((b?.strike ?? Infinity) - ts) ? x : b, null);
        return c?.impliedVolatility ? Math.round(c.impliedVolatility * 1000) / 10 : null;
      });
      volGrid.push(row);

      // GEX Calculation (using first available expiry for surface-consistent layout if needed, 
      // but usually GEX is summed across all near-term)
      // The requirement says "for each SPY option chain", we group by strike.
      [...calls, ...puts].forEach(opt => {
        if (opt.gamma && opt.openInterest) {
          const strike = opt.strike;
          const contractSize = 100;
          const gex = (opt.type === 'call' ? -1 : 1) * opt.delta * opt.gamma * opt.openInterest * contractSize * spyPrice * 0.01;
          gexMap[strike] = (gexMap[strike] || 0) + gex;
        }
      });
    } catch (err) {
      volGrid.push(new Array(9).fill(null));
    }
  }

  const total = volGrid.flat().filter(v => v != null).length;
  if (total < 20) return { _error: `Insufficient vol surface data (${total}/20 points)` };

  const gammaExposure = Object.entries(gexMap)
    .map(([strike, value]) => ({ strike: parseFloat(strike), value: Math.round(value / 1e6) }))
    .sort((a, b) => a.strike - b.strike);

  return {
    volSurfaceData: { strikes, expiries: expLabels, grid: volGrid },
    gammaExposure
  };
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'derivatives_data';
  const today = todayStr();

  const daily = readDailyCache('derivatives');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  const _errors = {};

  try {
    trackApiCall('Yahoo Finance');
    const vixQuotes = await yf.quote(VIX_TICKERS).catch(e => { console.warn('[Derivatives]', e.message || e); _errors.vixTermStructure = e.message; return []; });
    const vixArr = Array.isArray(vixQuotes) ? vixQuotes : [vixQuotes];
    const vixTermStructure = VIX_LABELS.length === vixArr.length && vixArr.every(q => q?.regularMarketPrice) ? {
      dates:      VIX_LABELS,
      values:     vixArr.map(q => Math.round(q.regularMarketPrice * 10) / 10),
      prevValues: vixArr.map(q => Math.round((q.regularMarketPreviousClose ?? q.regularMarketPrice) * 10) / 10),
    } : null;

    let vixEnrichment = null;
    try {
      trackApiCall('Yahoo Finance');
      const [vvixQuote, vixHistory] = await Promise.all([
        yf.quote('^VVIX').catch(e => { console.warn('[Derivatives]', e.message || e); return null; }),
        yf.historical('^VIX', {
          period1: (() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toISOString().split('T')[0]; })(),
          period2: new Date().toISOString().split('T')[0],
          interval: '1d',
        }).catch(e => { console.warn('[Derivatives]', e.message || e); return []; }),
      ]);

      const vvix = vvixQuote?.regularMarketPrice ?? null;
      const vixCloses = (vixHistory || []).map(d => d.close).filter(Boolean);
      const currentVix = vixArr.find(q => q?.symbol === '^VIX')?.regularMarketPrice ?? null;

      let vixPercentile = null;
      if (currentVix != null && vixCloses.length >= 20) {
        const below = vixCloses.filter(v => v <= currentVix).length;
        vixPercentile = Math.round((below / vixCloses.length) * 100);
      }

      if (vvix != null || vixPercentile != null) {
        vixEnrichment = { vvix, vixPercentile };
      }
    } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.vixEnrichment = e.message; }

    let optionsFlow = null;
    try {
      trackApiCall('Yahoo Finance');
      const [spyOpts, qqqOpts] = await Promise.all([yf.options('SPY'), yf.options('QQQ')]);

      const rows = [];
      for (const [sym, opts] of [['SPY', spyOpts], ['QQQ', qqqOpts]]) {
        const exp = opts.options[0];
        if (!exp) continue;
        const expLabel = new Date(opts.expirationDates[0] * 1000)
          .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
        for (const [type, arr] of [['C', exp.calls], ['P', exp.puts]]) {
          (arr || [])
            .filter(o => o.volume > 0 && o.openInterest > 0)
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 3)
            .forEach(o => rows.push({
              ticker: sym, strike: o.strike, expiry: expLabel, type,
              volume: o.volume, openInterest: o.openInterest,
              premium: Math.round((o.lastPrice ?? o.ask ?? 0) * 100) / 100,
              sentiment: type === 'C' ? 'bullish' : 'bearish',
            }));
        }
      }
      if (rows.length >= 4) {
        optionsFlow = rows.sort((a, b) => b.volume - a.volume).slice(0, 12);
      }
    } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.optionsFlow = e.message; }

    let volSurfaceData = null;
    let gammaExposure = null;
    try {
      trackApiCall('Yahoo Finance');
      const spyQuote = await yf.quote('SPY');
      if (!spyQuote?.regularMarketPrice) throw new Error('SPY price unavailable');
      const result = await buildVolAndGamma(spyQuote.regularMarketPrice);
      if (result && !result._error) {
        volSurfaceData = result.volSurfaceData;
        gammaExposure = result.gammaExposure;
      } else if (result?._error) {
        _errors.volSurfaceData = result._error;
      }
    } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.volSurfaceData = e.message; }

    let volPremium = null;
    try {
      const atm1mIV = volSurfaceData?.grid?.[2]?.[4] ?? null;
      if (atm1mIV != null) trackApiCall('Yahoo Finance');
      const spyHistVol = atm1mIV != null ? await yf.historical('^GSPC', {
        period1: (() => { const d = new Date(); d.setDate(d.getDate() - 45); return d.toISOString().split('T')[0]; })(),
        period2: new Date().toISOString().split('T')[0],
        interval: '1d',
      }).catch(e => { console.warn('[Derivatives]', e.message || e); return []; }) : [];
      const spyClosesCache = spyHistVol.map(d => d.close).filter(Boolean);
      if (atm1mIV != null && spyClosesCache.length >= 31) {
        const recentCloses = spyClosesCache.slice(-31);
        const logReturns = recentCloses.slice(1).map((c, i) => Math.log(c / recentCloses[i]));
        const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
        const variance = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (logReturns.length - 1);
        const realizedVol30d = Math.round(Math.sqrt(variance * 252) * 100 * 10) / 10;
        const premium = Math.round((atm1mIV - realizedVol30d) * 10) / 10;
        volPremium = { atm1mIV, realizedVol30d, premium };
      }
    } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.volPremium = e.message; }

    let fredVixHistory = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const vixHist = await fetchFredHistory('VIXCLS', FRED_API_KEY, 252);
        if (vixHist.length >= 20) {
          fredVixHistory = {
            dates: vixHist.map(p => p.date),
            values: vixHist.map(p => Math.round(p.value * 10) / 10),
          };
        }
      } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.putCallRatio = e.message; }
    }

    let putCallRatio = null;
    try {
      trackApiCall('Yahoo Finance');
      const pcceQuote = await yf.quote('^PCCE').catch(e => { console.warn('[Derivatives]', e.message || e); return null; });
      if (pcceQuote?.regularMarketPrice != null) {
        putCallRatio = Math.round(pcceQuote.regularMarketPrice * 1000) / 1000;
      } else {
        trackApiCall('Yahoo Finance');
        const spyOptsFallback = await yf.options('SPY').catch(e => { console.warn('[Derivatives]', e.message || e); return null; });
        if (spyOptsFallback?.options?.[0]) {
          const exp = spyOptsFallback.options[0];
          const putVol  = (exp.puts  || []).reduce((s, o) => s + (o.volume || 0), 0);
          const callVol = (exp.calls || []).reduce((s, o) => s + (o.volume || 0), 0);
          if (callVol > 0) putCallRatio = Math.round((putVol / callVol) * 1000) / 1000;
        }
      }
    } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.optionsFlow = e.message; }

    let skewIndex = null;
    try {
      trackApiCall('Yahoo Finance');
      const skewQuote = await yf.quote('^SKEW').catch(e => { console.warn('[Derivatives]', e.message || e); return null; });
      if (skewQuote?.regularMarketPrice != null) {
        const val = Math.round(skewQuote.regularMarketPrice * 10) / 10;
        const interpretation = val < 120 ? 'Low tail risk' : val <= 140 ? 'Moderate' : 'Elevated tail risk';
        skewIndex = { value: val, interpretation };
      }
    } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.skewIndex = e.message; }

    // SKEW history from FRED
    let skewHistory = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const skewHist = await fetchFredHistory('SKEW', FRED_API_KEY, 252);
        if (skewHist.length >= 20) {
          skewHistory = {
            dates: skewHist.map(p => p.date),
            values: skewHist.map(p => Math.round(p.value * 10) / 10),
          };
        }
      } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.skewHistory = e.message; }
    }

    const vixPercentile = vixEnrichment?.vixPercentile ?? null;

    let termSpread = null;
    if (vixTermStructure?.values?.length >= 3) {
      const vix1m = vixTermStructure.values[1];
      const vix3m = vixTermStructure.values[2];
      if (vix1m != null && vix3m != null) {
        const spreadVal = Math.round((vix3m - vix1m) * 100) / 100;
        termSpread = { value: spreadVal, state: spreadVal >= 0 ? 'contango' : 'backwardation' };
      }
    }

    const _sources = {
      vixTermStructure: !!(vixTermStructure && vixTermStructure.values?.length),
      vixEnrichment: !!vixEnrichment,
      optionsFlow: !!(optionsFlow && optionsFlow.length),
      volSurfaceData: !!(volSurfaceData && volSurfaceData.grid?.length),
      gammaExposure: !!(gammaExposure && gammaExposure.length),
      volPremium: !!volPremium,
      fredVixHistory: !!(fredVixHistory && fredVixHistory.values?.length),
      putCallRatio: putCallRatio != null,
      skewIndex: !!skewIndex,
      skewHistory: !!(skewHistory && skewHistory.values?.length),
      vixPercentile: vixPercentile != null,
      termSpread: !!termSpread,
    };


    const result = {
      vixTermStructure,
      optionsFlow,
      volSurfaceData,
      gammaExposure,
      vixEnrichment,
      volPremium,
      fredVixHistory,
      putCallRatio,
      skewIndex,
      skewHistory,
      vixPercentile,
      termSpread,
      _sources,
      lastUpdated: today,
    };

    writeDailyCache('derivatives', result);
    cache.set(cacheKey, result, 900);
    res.json({ ...result, fetchedOn: today, isCurrent: true, _errors });
  } catch (error) {
    console.error('Derivatives API error:', error);
    const fallback = readLatestCache('derivatives');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
