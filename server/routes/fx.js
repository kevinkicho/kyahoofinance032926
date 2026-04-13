import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

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

    const _sources = {
      fredFxRates:       !!(fredFxRates && Object.keys(fredFxRates).length),
      reer:              !!(reer && (reer.dates || Object.keys(reer).length)),
      rateDifferentials: !!(rateDifferentials && Object.keys(rateDifferentials).length),
      dxyHistory:        !!(dxyHistory && dxyHistory.dates?.length),
      cotHistory:        !!(cotHistory && Object.keys(cotHistory).length),
    };

    const result = {
      fredFxRates:       fredFxRates ?? null,
      reer:              reer ?? null,
      rateDifferentials: rateDifferentials ?? null,
      dxyHistory:        dxyHistory ?? null,
      cotHistory:        cotHistory ?? null,
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
