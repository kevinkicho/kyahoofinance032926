import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr, mergeWithPreviousCache } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory } from '../lib/fred.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';
import { sanitizeMarketPayload, computeIsLive } from '../lib/dataHygiene.js';

const router = Router();

const VIX_TICKERS = ['^VIX9D', '^VIX', '^VIX3M', '^VIX6M'];
const VIX_LABELS  = ['9D', '1M', '3M', '6M'];

/** yahoo-finance2 returns expirationDates as Date objects (not unix seconds). */
function toUnixSec(d) {
  if (d == null) return null;
  if (typeof d === 'number') return d > 1e12 ? Math.floor(d / 1000) : d;
  const ms = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

async function buildVolAndGamma(spyPrice) {
  const targetDays  = [7, 14, 30, 60, 90, 180, 365, 730];
  const expLabels   = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y', '2Y'];
  const strikePcts  = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];
  const strikes     = [80, 85, 90, 95, 100, 105, 110, 115, 120];

  let expirations;
  try {
    trackApiCall('Yahoo Finance');
    const idx = await yf.options('SPY');
    expirations = (idx.expirationDates || [])
      .map(toUnixSec)
      .filter((n) => Number.isFinite(n));
  } catch (e) { console.warn('[Derivatives] buildVolAndGamma failed:', e?.message); return null; }
  if (!expirations.length) return null;

  const now = Math.floor(Date.now() / 1000);
  const volGrid = [];
  const gexMap = {};

  for (const days of targetDays) {
    const target = now + days * 86400;
    const nearestUnix = expirations.reduce((best, d) =>
      Math.abs(d - target) < Math.abs(best - target) ? d : best, expirations[0]);
    try {
      trackApiCall('Yahoo Finance');
      // Pass Date or unix — library accepts both; prefer Date for consistency.
      const opts = await yf.options('SPY', { date: new Date(nearestUnix * 1000) });
      const calls = opts.options[0]?.calls || [];
      const puts = opts.options[0]?.puts || [];

      // Vol Surface Row — ignore near-zero junk IVs from Yahoo
      const row = strikePcts.map(pct => {
        const ts = Math.round(spyPrice * pct);
        const c  = calls.reduce((b, x) => Math.abs(x.strike - ts) < Math.abs((b?.strike ?? Infinity) - ts) ? x : b, null);
        const iv = c?.impliedVolatility;
        return iv != null && iv > 0.01 ? Math.round(iv * 1000) / 10 : null;
      });
      volGrid.push(row);

      // GEX by strike. Yahoo often omits greeks and openInterest (esp. off-hours).
      // Fall back: volume as liquidity proxy when OI is 0/missing.
      const addGex = (opt, side) => {
        if (!opt?.strike) return;
        const size = (opt.openInterest > 0 ? opt.openInterest : 0) || (opt.volume > 0 ? opt.volume : 0);
        if (!size) return;
        const iv = (opt.impliedVolatility && opt.impliedVolatility > 0.01) ? opt.impliedVolatility : 0.2;
        const m = Math.log((spyPrice || opt.strike) / opt.strike);
        const estGamma =
          typeof opt.gamma === 'number' && opt.gamma > 0
            ? opt.gamma
            : Math.exp(-40 * m * m) / (Math.max(spyPrice, 1) * Math.max(iv, 0.05) * Math.sqrt(2 * Math.PI * 0.08));
        const gex =
          -side *
          estGamma *
          size *
          100 *
          spyPrice *
          spyPrice *
          0.01;
        gexMap[opt.strike] = (gexMap[opt.strike] || 0) + gex;
      };
      calls.forEach((o) => addGex(o, 1));
      puts.forEach((o) => addGex(o, -1));
    } catch (err) {
      volGrid.push(new Array(9).fill(null));
    }
  }

  const total = volGrid.flat().filter(v => v != null).length;
  if (total < 8) return null;

  const gammaExposure = Object.entries(gexMap)
    .map(([strike, value]) => ({ strike: parseFloat(strike), value: Math.round((value / 1e6) * 100) / 100 }))
    .filter((g) => Number.isFinite(g.value) && g.value !== 0)
    .sort((a, b) => a.strike - b.strike);

  return {
    volSurfaceData: { strikes, expiries: expLabels, grid: volGrid },
    gammaExposure: gammaExposure.length ? gammaExposure : null,
  };
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'derivatives_data';
  const today = todayStr();

  const forceRefresh = req.query?.refresh === 'true' || req.query?.refresh === '1';
  const DERIV_LIVE = [
    'vixTermStructure', 'volSurfaceData', 'skewIndex', 'fredVixHistory',
    'vixEnrichment', 'optionsFlow', 'gammaExposure', 'putCallRatio',
  ];
  if (!forceRefresh) {
    const daily = readDailyCache('derivatives');
    if (daily) {
      const clean = sanitizeMarketPayload(daily);
      clean.isLive = computeIsLive(clean, DERIV_LIVE);
      return res.json({ ...clean, fetchedOn: today, isCurrent: true, _cacheSource: 'daily_file' });
    }

    const cached = cache.get(cacheKey);
    if (cached) {
      const clean = sanitizeMarketPayload(cached);
      clean.isLive = computeIsLive(clean, DERIV_LIVE);
      return res.json({ ...clean, fetchedOn: today, isCurrent: true, _cacheSource: 'memory' });
    }
  } else if (cache) {
    cache.del(cacheKey);
  }

  const _errors = {};

  try {
    trackApiCall('Yahoo Finance');
    const vixQuotes = await yf.quote(VIX_TICKERS).catch(e => { console.warn('[Derivatives]', e.message || e); _errors.vixTermStructure = e.message; return []; });
    const vixArr = Array.isArray(vixQuotes) ? vixQuotes : [vixQuotes];
    // Map by symbol — yahoo-finance2 does not guarantee input order.
    const bySym = Object.fromEntries(
      vixArr.filter((q) => q?.symbol).map((q) => [q.symbol, q])
    );
    const ordered = VIX_TICKERS.map((t) => bySym[t]).filter((q) => q?.regularMarketPrice != null);
    const vixTermStructure = ordered.length >= 3 ? {
      dates:      VIX_TICKERS.map((t, i) => (bySym[t]?.regularMarketPrice != null ? VIX_LABELS[i] : null)).filter(Boolean),
      values:     VIX_TICKERS.map((t) => bySym[t]?.regularMarketPrice).filter((p) => p != null).map((p) => Math.round(p * 10) / 10),
      prevValues: VIX_TICKERS.map((t) => bySym[t]).filter((q) => q?.regularMarketPrice != null)
        .map((q) => Math.round((q.regularMarketPreviousClose ?? q.regularMarketPrice) * 10) / 10),
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
        const expUnix = toUnixSec(opts.expirationDates?.[0]);
        const expLabel = expUnix
          ? new Date(expUnix * 1000).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' })
          : 'n/a';
        for (const [type, arr] of [['C', exp.calls], ['P', exp.puts]]) {
          (arr || [])
            // Yahoo often returns openInterest=0 even when volume is active.
            .filter(o => (o.volume > 0) || (o.openInterest > 0))
            .sort((a, b) => (b.volume || 0) - (a.volume || 0))
            .slice(0, 4)
            .forEach(o => rows.push({
              ticker: sym, strike: o.strike, expiry: expLabel, type,
              volume: o.volume || 0, openInterest: o.openInterest || 0,
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
      if (result) {
        volSurfaceData = result.volSurfaceData;
        gammaExposure = result.gammaExposure;
      }
    } catch (e) { console.warn('[Derivatives]', e.message || e); _errors.volSurfaceData = e.message; }

    let volPremium = null;
    try {
      // Prefer ATM 1M IV from vol surface (row index 2 ≈ 1M, col 4 = 100% strike).
      // Yahoo often returns junk/near-zero IVs — walk nearby cells, then fall
      // back to spot VIX as an implied-vol proxy so the panel never stays empty.
      const grid = volSurfaceData?.grid;
      let atm1mIV = null;
      if (Array.isArray(grid)) {
        const candidates = [];
        for (const ri of [2, 1, 3, 0, 4]) {
          const row = grid[ri];
          if (!Array.isArray(row)) continue;
          for (const ci of [4, 3, 5, 2, 6]) {
            const v = row[ci];
            if (typeof v === 'number' && v > 5 && v < 120) candidates.push(v);
          }
        }
        if (candidates.length) atm1mIV = candidates[0];
      }
      if (atm1mIV == null) {
        const vixSpot = bySym['^VIX']?.regularMarketPrice
          ?? vixTermStructure?.values?.[1]
          ?? vixTermStructure?.values?.[0]
          ?? null;
        if (vixSpot != null && vixSpot > 5) atm1mIV = Math.round(vixSpot * 10) / 10;
      }

      trackApiCall('Yahoo Finance');
      const spyHistVol = await yf.historical('^GSPC', {
        period1: (() => { const d = new Date(); d.setDate(d.getDate() - 50); return d.toISOString().split('T')[0]; })(),
        period2: new Date().toISOString().split('T')[0],
        interval: '1d',
      }).catch(e => { console.warn('[Derivatives]', e.message || e); return []; });
      const spyClosesCache = (spyHistVol || []).map(d => d.close).filter(Boolean);
      if (atm1mIV != null && spyClosesCache.length >= 20) {
        const recentCloses = spyClosesCache.slice(-31);
        const logReturns = recentCloses.slice(1).map((c, i) => Math.log(c / recentCloses[i]));
        if (logReturns.length >= 10) {
          const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
          const variance = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, logReturns.length - 1);
          const realizedVol30d = Math.round(Math.sqrt(variance * 252) * 100 * 10) / 10;
          const premium = Math.round((atm1mIV - realizedVol30d) * 10) / 10;
          const surfaceHit = Array.isArray(grid)
            && grid.flat().some((v) => typeof v === 'number' && Math.abs(v - atm1mIV) < 0.05);
          volPremium = {
            atm1mIV,
            realizedVol30d,
            premium,
            _source: surfaceHit ? 'vol_surface' : 'vix_proxy',
          };
        }
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
    let skewHistory = null;
    try {
      trackApiCall('Yahoo Finance');
      // FRED series SKEW was retired / returns 400 — use CBOE via Yahoo ^SKEW
      // for both spot and ~1y daily history.
      const skewPeriod1 = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 400);
        return d.toISOString().split('T')[0];
      })();
      const skewPeriod2 = new Date().toISOString().split('T')[0];
      const [skewQuote, skewHistRaw] = await Promise.all([
        yf.quote('^SKEW').catch((e) => {
          console.warn('[Derivatives] ^SKEW quote:', e.message || e);
          return null;
        }),
        yf.historical('^SKEW', {
          period1: skewPeriod1,
          period2: skewPeriod2,
          interval: '1d',
        }).catch((e) => {
          console.warn('[Derivatives] ^SKEW history:', e.message || e);
          return [];
        }),
      ]);

      if (skewQuote?.regularMarketPrice != null) {
        const val = Math.round(skewQuote.regularMarketPrice * 10) / 10;
        const interpretation =
          val < 120 ? 'Low tail risk' : val <= 140 ? 'Moderate' : 'Elevated tail risk';
        let asOf = todayStr();
        const rmt = skewQuote.regularMarketTime;
        if (rmt instanceof Date && !Number.isNaN(rmt.getTime())) {
          asOf = rmt.toISOString().slice(0, 10);
        } else if (typeof rmt === 'number' && Number.isFinite(rmt)) {
          const ms = rmt > 1e12 ? rmt : rmt * 1000;
          asOf = new Date(ms).toISOString().slice(0, 10);
        } else if (typeof rmt === 'string' && rmt.length >= 10) {
          asOf = rmt.slice(0, 10);
        }
        skewIndex = { value: val, interpretation, asOf };
      }

      const histRows = (Array.isArray(skewHistRaw) ? skewHistRaw : [])
        .map((row) => {
          const close = row?.close ?? row?.adjClose;
          if (close == null || !Number.isFinite(Number(close))) return null;
          let dateStr = null;
          if (row.date instanceof Date) dateStr = row.date.toISOString().slice(0, 10);
          else if (typeof row.date === 'string') dateStr = row.date.slice(0, 10);
          else if (typeof row.date === 'number') dateStr = new Date(row.date).toISOString().slice(0, 10);
          if (!dateStr) return null;
          return { date: dateStr, value: Math.round(Number(close) * 10) / 10 };
        })
        .filter(Boolean)
        .sort((a, b) => (a.date < b.date ? -1 : 1));

      if (histRows.length >= 5) {
        skewHistory = {
          dates: histRows.map((p) => p.date),
          values: histRows.map((p) => p.value),
          _source: 'yahoo_^SKEW',
        };
        // Ensure live spot is the last point when fresher than history
        if (skewIndex?.value != null) {
          const lastDate = skewHistory.dates[skewHistory.dates.length - 1];
          const spotDate = skewIndex.asOf || todayStr();
          if (spotDate > lastDate) {
            skewHistory.dates.push(spotDate);
            skewHistory.values.push(skewIndex.value);
          } else if (spotDate === lastDate) {
            skewHistory.values[skewHistory.values.length - 1] = skewIndex.value;
          }
        }
      }
    } catch (e) {
      console.warn('[Derivatives] skew:', e.message || e);
      _errors.skewIndex = e.message;
    }

    // Optional FRED attempt (series often unavailable) — only if Yahoo history thin
    if ((!skewHistory?.values?.length || skewHistory.values.length < 20) && FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const skewHist = await fetchFredHistory('SKEW', FRED_API_KEY, 252);
        if (skewHist.length >= 20) {
          skewHistory = {
            dates: skewHist.map((p) => p.date),
            values: skewHist.map((p) => Math.round(p.value * 10) / 10),
            _source: 'fred_SKEW',
          };
        }
      } catch (e) {
        console.warn('[Derivatives] FRED SKEW:', e.message || e);
        _errors.skewHistory = e.message;
      }
    }

    // Walk back prior cache if still empty
    if (!skewHistory?.values?.length) {
      try {
        const prev = readLatestCache('derivatives');
        if (prev?.data?.skewHistory?.values?.length >= 5) {
          skewHistory = prev.data.skewHistory;
        }
      } catch { /* ignore */ }
    }
    // Last resort: single-point series so the panel still has a level
    if (!skewHistory?.values?.length && skewIndex?.value != null) {
      skewHistory = {
        dates: [skewIndex.asOf || todayStr()],
        values: [skewIndex.value],
        _proxy: 'spot_only',
        _source: 'yahoo_^SKEW_spot',
      };
    }
    // Recover spot from history if quote failed
    if (!skewIndex && skewHistory?.values?.length) {
      const val = skewHistory.values[skewHistory.values.length - 1];
      skewIndex = {
        value: val,
        interpretation:
          val < 120 ? 'Low tail risk' : val <= 140 ? 'Moderate' : 'Elevated tail risk',
        asOf: skewHistory.dates[skewHistory.dates.length - 1],
      };
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


    const result = sanitizeMarketPayload({
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
    });
    result.isLive = computeIsLive(result, DERIV_LIVE);

    const merged = sanitizeMarketPayload(mergeWithPreviousCache('derivatives', result));
    merged.isLive = computeIsLive(merged, DERIV_LIVE);
    writeDailyCache('derivatives', merged);
    cache.set(cacheKey, merged, 900);
    res.json({ ...merged, fetchedOn: today, isCurrent: true, isLive: merged.isLive, _errors });
  } catch (error) {
    console.error('Derivatives API error:', error);
    return sendCachedOrDegradedSync(res, 'derivatives', {
      error,
      memoryCache: req.app.locals.cache,
      cacheKey: 'derivatives_data',
    });
  }
});

export default router;
