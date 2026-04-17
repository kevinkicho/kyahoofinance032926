import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const DXY_SYMBOLS = 'EUR,GBP,JPY,CAD,SEK,CHF';
const MOVER_SYMBOLS = 'EUR,GBP,JPY,CNY,CHF,AUD,CAD,SEK,NOK,NZD,HKD,SGD,INR,KRW,MXN,BRL,ZAR';
const HISTORY_DAYS = 30;

function getDateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

async function fetchFrankfurterData() {
  const today = getDateStr(0);
  const yesterday = getDateStr(1);
  const dxyStart = getDateStr(HISTORY_DAYS);
  const sevenAgo = getDateStr(7);
  try {
    const [latest, prev, dxyHist, weekHist, month30] = await Promise.all([
      fetchJSON(`https://api.frankfurter.dev/v1/latest?base=USD`),
      fetchJSON(`https://api.frankfurter.dev/v1/${yesterday}?base=USD`),
      fetchJSON(`https://api.frankfurter.dev/v1/${dxyStart}..${today}?base=USD&symbols=${DXY_SYMBOLS}`),
      fetchJSON(`https://api.frankfurter.dev/v1/${sevenAgo}..${today}?base=USD&symbols=${MOVER_SYMBOLS}`),
      fetchJSON(`https://api.frankfurter.dev/v1/${getDateStr(HISTORY_DAYS)}?base=USD&symbols=${MOVER_SYMBOLS}`),
    ]);
    const spotRates = latest?.rates ? { USD: 1, ...latest.rates } : null;
    const prevRates = prev?.rates ? { USD: 1, ...prev.rates } : null;
    const history = dxyHist?.rates || null;
    const spot = spotRates || { USD: 1 };
    const changes1w = {};
    const sparklines = {};
    if (weekHist?.rates) {
      const sortedDates = Object.keys(weekHist.rates).sort();
      if (sortedDates.length > 0) {
        const firstRates = weekHist.rates[sortedDates[0]];
        const lastRates = weekHist.rates[sortedDates[sortedDates.length - 1]];
        Object.keys(lastRates).forEach(code => {
          const base = firstRates[code];
          if (!base) return;
          changes1w[code] = -((lastRates[code] - base) / base * 100);
          sparklines[code] = sortedDates.map(d => {
            const rate = weekHist.rates[d]?.[code];
            return rate != null ? (-((rate - base) / base * 100) || 0) : null;
          }).filter(v => v != null);
        });
      }
    }
    const changes1m = {};
    if (month30?.rates) {
      Object.keys(spot).forEach(code => {
        if (code === 'USD') return;
        const prev30 = month30.rates[code] || spot[code];
        if (prev30) changes1m[code] = -((spot[code] - prev30) / prev30 * 100);
      });
    }
    return { spotRates, prevRates, history, changes1w, changes1m, sparklines };
  } catch (e) { console.warn('[FX-Frankfurter]', e.message || e); return null; }
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

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: '5' });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMF COFER — Currency composition of official foreign exchange reserves
// ─────────────────────────────────────────────────────────────────────────────
async function fetchIMFCOFER() {
  try {
    const url = 'https://dataservices.imf.org/REST/SDMX_JSON.svc/GetData/COFER/Q.US+XT+EU+JP+UK+CN+CH.SDR_XDC.XDR?startPeriod=2020-Q1';
    const data = await fetchJSON(url);
    const series = data?.CompactData?.DataSet?.Series;
    if (!series) return null;
    const entries = Array.isArray(series) ? series : [series];
    const result = {};
    for (const s of entries) {
      const refArea = s['@REF_AREA'];
      const obs = Array.isArray(s.Obs) ? s.Obs : [s.Obs];
      const latestVal = obs.filter(o => o['@OBS_VALUE'] != null).sort((a, b) => b['@TIME_PERIOD'].localeCompare(a['@TIME_PERIOD']))[0];
      if (latestVal) {
        const ccMap = { US: 'USD', XT: 'Total', EU: 'EUR', JP: 'JPY', UK: 'GBP', CN: 'CNY', CH: 'CHF' };
        const label = ccMap[refArea] || refArea;
        result[label] = Math.round(parseFloat(latestVal['@OBS_VALUE']) * 100) / 100;
      }
    }
    return Object.keys(result).length >= 3 ? { asOf: entries[0]?.Obs?.['@TIME_PERIOD'] || null, reserves: result } : null;
  } catch (e) {
    console.warn('[FX] IMF COFER fetch failed:', e.message);
    return null;
  }
}

// CFTC COT data mapping
const COT_NAME_MAP = {
  EUR: 'EURO FX',
  JPY: 'JAPANESE YEN',
  GBP: 'BRITISH POUND',
  CAD: 'CANADIAN DOLLAR',
  CHF: 'SWISS FRANC',
  AUD: 'AUSTRALIAN DOLLAR',
  NZD: 'NEW ZEALAND DOLLAR',
  MXN: 'MEXICAN PESO',
};

// Fetch COT history (last 52 weeks)
async function fetchCOTHistory() {
  const CFTC_URL = 'https://publicreporting.cftc.gov/resource/jun7-fc8e.json' +
    '?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,' +
    'noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all' +
    '&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=400';

  try {
    const rows = await fetchJSON(CFTC_URL);
    const history = {};

    // Group by currency and date
    rows.forEach(row => {
      const date = row.report_date_as_yyyy_mm_dd;
      if (!date) return;

      Object.entries(COT_NAME_MAP).forEach(([code, needle]) => {
        if (row.market_and_exchange_names?.includes(needle)) {
          if (!history[code]) history[code] = [];
          const long = parseFloat(row.noncomm_positions_long_all) || 0;
          const short = parseFloat(row.noncomm_positions_short_all) || 0;
          const oi = parseFloat(row.open_interest_all) || 1;
          history[code].push({
            date,
            net: Math.round((long - short) / oi * 100 * 10) / 10,
            long: Math.round(long / 1000),
            short: Math.round(short / 1000),
          });
        }
      });
    });

    // Sort and limit to last 52 weeks
    Object.keys(history).forEach(code => {
      history[code] = history[code]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-52);
    });

    return Object.keys(history).length >= 3 ? history : null;
  } catch (e) { console.warn('[FX]', e.message || e); return null; }
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'fx_data';
  const today = todayStr();

  const daily = readDailyCache('fx');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    let frankfurterData = null;
    try {
      trackApiCall('Frankfurter');
      frankfurterData = await fetchFrankfurterData();
    } catch (e) { console.warn('[FX-Frankfurter]', e.message || e); }

    let fredFxRates = null;
    if (FRED_API_KEY) {
      try {
        const FRED_FX_SERIES = {
          eurUsd:      'DEXUSEU',
          usdJpy:      'DEXJPUS',
          gbpUsd:      'DEXUSUK',
          usdChf:      'DEXSZUS',
          usdCad:      'DEXCAUS',
          audUsd:      'DEXUSAL',
          dollarIndex: 'DTWEXBGS',
        };
        const entries = Object.entries(FRED_FX_SERIES);
        trackApiCall('FRED');
        const results = await Promise.allSettled(
          entries.map(([key, sid]) => fetchFredHistory(sid, FRED_API_KEY, 252).then(hist => [key, hist]))
        );
        const rates = {};
        results.forEach(r => {
          if (r.status === 'fulfilled') {
            const [key, hist] = r.value;
            if (hist.length >= 10) {
              rates[key] = {
                dates: hist.map(p => p.date),
                values: hist.map(p => Math.round(p.value * 10000) / 10000),
              };
            }
          }
        });
        if (Object.keys(rates).length >= 3) fredFxRates = rates;
      } catch (e) { console.warn('[FX]', e.message || e); }
    }

    let reer = null;
    if (FRED_API_KEY) {
      try {
        const REER_SERIES = { US: 'RBUSBIS', EU: 'RBEUBIS', JP: 'RBJPBIS', GB: 'RBGBBIS', CN: 'RBCNBIS' };
        const reerEntries = Object.entries(REER_SERIES);
        trackApiCall('FRED');
        const reerResults = await Promise.allSettled(
          reerEntries.map(([key, sid]) => fetchFredHistory(sid, FRED_API_KEY, 24).then(hist => [key, hist]))
        );
        const reerData = {};
        let dateSet = null;
        reerResults.forEach(r => {
          if (r.status === 'fulfilled') {
            const [key, hist] = r.value;
            if (hist && hist.length >= 2) {
              reerData[key] = hist.map(p => Math.round(p.value * 100) / 100);
              if (!dateSet) dateSet = hist.map(p => p.date);
            }
          }
        });
        if (dateSet && Object.keys(reerData).length >= 3) {
          reer = { dates: dateSet, ...reerData };
        }
      } catch (e) { console.warn('[FX]', e.message || e); }
    }

    let rateDifferentials = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [fedResult, ecbResult, boeResult, bojResult] = await Promise.allSettled([
          fetchFredLatest('FEDFUNDS', FRED_API_KEY),
          fetchFredLatest('ECBMRRFR', FRED_API_KEY),
          fetchFredLatest('IRUKTLD', FRED_API_KEY),
          fetchFredLatest('INTDSRJPM193N', FRED_API_KEY),
        ]);
        const fed = fedResult.status === 'fulfilled' ? fedResult.value : null;
        const ecb = ecbResult.status === 'fulfilled' ? ecbResult.value : null;
        const boe = boeResult.status === 'fulfilled' ? boeResult.value : null;
        const boj = bojResult.status === 'fulfilled' ? bojResult.value : null;
        if (fed !== null) {
          rateDifferentials = {
            fed: Math.round(fed * 100) / 100,
            ecb: ecb !== null ? Math.round(ecb * 100) / 100 : null,
            boe: boe !== null ? Math.round(boe * 100) / 100 : null,
            boj: boj !== null ? Math.round(boj * 100) / 100 : null,
            usFed_ecb: ecb !== null ? Math.round((fed - ecb) * 100) / 100 : null,
            usFed_boe: boe !== null ? Math.round((fed - boe) * 100) / 100 : null,
            usFed_boj: boj !== null ? Math.round((fed - boj) * 100) / 100 : null,
          };
        }
      } catch (e) { console.warn('[FX]', e.message || e); }
    }

    let dxyHistory = null;
    if (fredFxRates && fredFxRates.dollarIndex) {
      dxyHistory = {
        dates:  fredFxRates.dollarIndex.dates,
        values: fredFxRates.dollarIndex.values,
      };
    } else if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const dxyHist = await fetchFredHistory('DTWEXBGS', FRED_API_KEY, 12);
        if (dxyHist && dxyHist.length >= 2) {
          dxyHistory = {
            dates:  dxyHist.map(p => p.date),
            values: dxyHist.map(p => Math.round(p.value * 10000) / 10000),
          };
        }
      } catch (e) { console.warn('[FX]', e.message || e); }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COT POSITIONING HISTORY
    // ═══════════════════════════════════════════════════════════════════════
    let cotHistory = null;
    try {
      trackApiCall('CFTC');
      cotHistory = await fetchCOTHistory();
    } catch (e) { console.warn('[FX]', e.message || e); }

    // ═══════════════════════════════════════════════════════════════════════
    // IMF COFER — Currency composition of official FX reserves
    // ═══════════════════════════════════════════════════════════════════════
    let imfReserves = null;
    try {
      trackApiCall('IMF COFER');
      imfReserves = await fetchIMFCOFER();
    } catch (e) { console.warn('[FX] IMF COFER:', e.message || e); }

    const _sources = {
      frankfurter:       !!(frankfurterData?.spotRates),
      fredFxRates:       !!(fredFxRates && Object.keys(fredFxRates).length),
      reer:              !!(reer && (reer.dates || Object.keys(reer).length)),
      rateDifferentials: !!(rateDifferentials && Object.keys(rateDifferentials).length),
      dxyHistory:        !!(dxyHistory && dxyHistory.dates?.length),
      cotHistory:        !!(cotHistory && Object.keys(cotHistory).length),
      imfReserves:       !!(imfReserves && Object.keys(imfReserves.reserves || {}).length),
    };

    const result = {
      spotRates:          frankfurterData?.spotRates || null,
      prevRates:          frankfurterData?.prevRates || null,
      history:            frankfurterData?.history || null,
      changes1w:          frankfurterData?.changes1w || null,
      changes1m:          frankfurterData?.changes1m || null,
      sparklines:         frankfurterData?.sparklines || null,
      fredFxRates:       fredFxRates ?? null,
      reer:              reer ?? null,
      rateDifferentials: rateDifferentials ?? null,
      dxyHistory:        dxyHistory ?? null,
      cotHistory:        cotHistory ?? null,
      cotData:           cotHistory ? Object.fromEntries(
        Object.entries(cotHistory).map(([code, arr]) => arr.length > 0 ? [code, arr[arr.length - 1].net] : [code, null])
      ) : {},
      imfReserves:       imfReserves ?? null,
      _sources,
      lastUpdated: today,
    };

    writeDailyCache('fx', result);
    cache.set(cacheKey, result, 900);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('FX API error:', error);
    const fallback = readLatestCache('fx');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
