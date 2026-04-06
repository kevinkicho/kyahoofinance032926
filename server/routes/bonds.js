import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const TENOR_SERIES = {
  '3m': 'DGS3MO', '6m': 'DGS6MO', '1y': 'DGS1', '2y': 'DGS2',
  '5y': 'DGS5',  '7y': 'DGS7',  '10y': 'DGS10', '20y': 'DGS20', '30y': 'DGS30',
};
const INTL_10Y = {
  DE: 'IRLTLT01DEM156N', JP: 'IRLTLT01JPM156N', GB: 'IRLTLT01GBM156N',
  IT: 'IRLTLT01ITM156N', FR: 'IRLTLT01FRM156N', AU: 'IRLTLT01AUM156N',
};
const SPREAD_SERIES = {
  IG:  'BAMLC0A0CM',
  HY:  'BAMLH0A0HYM2',
  EM:  'BAMLEMCBPIOAS',
  BBB: 'BAMLC0A4CBBB',
};

function dateToMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');
}

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'bonds_data';
  const today = todayStr();

  const daily = readDailyCache('bonds');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  if (!FRED_API_KEY) return res.status(503).json({ error: 'FRED_API_KEY not configured' });

  try {
    trackApiCall('FRED');
    const usEntries = await Promise.allSettled(
      Object.entries(TENOR_SERIES).map(async ([tenor, sid]) => [tenor, await fetchFredLatest(sid, FRED_API_KEY)])
    );
    const usYields = {};
    usEntries.forEach(r => { if (r.status === 'fulfilled' && r.value[1] != null) usYields[r.value[0]] = r.value[1]; });

    const yieldCurveData = {
      US: {
        '3m': usYields['3m'] ?? null, '6m': usYields['6m'] ?? null,
        '1y': usYields['1y'] ?? null, '2y': usYields['2y'] ?? null,
        '5y': usYields['5y'] ?? null, '10y': usYields['10y'] ?? null,
        '30y': usYields['30y'] ?? null,
      },
    };

    trackApiCall('FRED');
    const intlEntries = await Promise.allSettled(
      Object.entries(INTL_10Y).map(async ([cc, sid]) => [cc, await fetchFredLatest(sid, FRED_API_KEY)])
    );
    intlEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) {
        yieldCurveData[r.value[0]] = { '10y': r.value[1] };
      }
    });

    trackApiCall('FRED');
    const spreadEntries = await Promise.allSettled(
      Object.entries(SPREAD_SERIES).map(async ([key, sid]) => [key, await fetchFredHistory(sid, FRED_API_KEY, 13)])
    );
    const spreadRaw = {};
    spreadEntries.forEach(r => { if (r.status === 'fulfilled') spreadRaw[r.value[0]] = r.value[1]; });

    const igArr  = (spreadRaw.IG  || []).slice(-12);
    const hyArr  = (spreadRaw.HY  || []).slice(-12);
    const emArr  = (spreadRaw.EM  || []).slice(-12);
    const bbbArr = (spreadRaw.BBB || []).slice(-12);
    const anchorArr = igArr.length === 12 ? igArr : (hyArr.length === 12 ? hyArr : []);
    const spreadData = anchorArr.length === 12 ? {
      dates: anchorArr.map(p => dateToMonthLabel(p.date)),
      IG:    igArr.length  === 12 ? igArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      HY:    hyArr.length  === 12 ? hyArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      EM:    emArr.length  === 12 ? emArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      BBB:   bbbArr.length === 12 ? bbbArr.map(p => Math.round(p.value))  : anchorArr.map(() => null),
    } : null;

    const SPREAD_INDICATOR_SERIES = {
      t10y2y: 'T10Y2Y',
      t10y3m: 'T10Y3M',
      t5yie:  'T5YIE',
      t10yie: 'T10YIE',
      dfii10: 'DFII10',
    };
    const FED_FUTURES_SERIES = { m1: 'FF1', m2: 'FF2', m3: 'FF3', m4: 'FF4', m5: 'FF5', m6: 'FF6' };

    trackApiCall('FRED');
    const [indicatorEntries, fedFuturesEntries, mortgage30yRaw] = await Promise.all([
      Promise.allSettled(
        Object.entries(SPREAD_INDICATOR_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid, FRED_API_KEY)])
      ),
      Promise.allSettled(
        Object.entries(FED_FUTURES_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid, FRED_API_KEY)])
      ),
      fetchFredLatest('MORTGAGE30US', FRED_API_KEY).catch(() => null),
    ]);

    const spreadIndicators = {};
    indicatorEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) spreadIndicators[r.value[0]] = r.value[1];
    });

    const fedFundsFuturesRaw = {};
    fedFuturesEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) fedFundsFuturesRaw[r.value[0]] = r.value[1];
    });
    const fedFundsFutures = Object.keys(fedFundsFuturesRaw).length >= 3 ? fedFundsFuturesRaw : null;

    const mortgageSpread = (mortgage30yRaw != null && usYields['10y'] != null)
      ? Math.round((mortgage30yRaw - usYields['10y']) * 100) / 100
      : null;

    let breakevensData = null;
    try {
      trackApiCall('FRED');
      const [be5yHist, be10yHist, fwd5y5yHist, real5y, real10y] = await Promise.all([
        fetchFredHistory('T5YIE', FRED_API_KEY, 130),
        fetchFredHistory('T10YIE', FRED_API_KEY, 130),
        fetchFredHistory('T5YIFR', FRED_API_KEY, 130),
        fetchFredLatest('DFII5', FRED_API_KEY),
        fetchFredLatest('DFII10', FRED_API_KEY),
      ]);

      if (be5yHist?.length >= 20) {
        const dates = be5yHist.map(p => p.date);
        const be5yVals = be5yHist.map(p => p.value);
        const be10yMap = {};
        (be10yHist || []).forEach(p => { be10yMap[p.date] = p.value; });
        const fwdMap = {};
        (fwd5y5yHist || []).forEach(p => { fwdMap[p.date] = p.value; });
        const be10yVals = dates.map(d => be10yMap[d] ?? null);
        const fwd5y5yVals = dates.map(d => fwdMap[d] ?? null);
        breakevensData = {
          current: {
            be5y:       be5yVals[be5yVals.length - 1],
            be10y:      be10yVals[be10yVals.length - 1],
            forward5y5y: fwd5y5yVals[fwd5y5yVals.length - 1],
            real5y,
            real10y,
          },
          history: {
            dates:       dates.map(d => dateToMonthLabel(d)),
            be5y:        be5yVals,
            be10y:       be10yVals,
            forward5y5y: fwd5y5yVals,
          },
        };
      }
    } catch { /* use null */ }

    let fredYieldHistory = null;
    let yieldHistory = null;
    try {
      trackApiCall('FRED');
      const [hist2y, hist10y, hist30y] = await Promise.all([
        fetchFredHistory('DGS2',  FRED_API_KEY, 252).catch(() => null),
        fetchFredHistory('DGS10', FRED_API_KEY, 252).catch(() => null),
        fetchFredHistory('DGS30', FRED_API_KEY, 252).catch(() => null),
      ]);

      if (hist10y?.length >= 20) {
        fredYieldHistory = {
          dates:  hist10y.map(p => p.date),
          values: hist10y.map(p => p.value),
        };
      }

      if (hist10y?.length >= 20) {
        const anchorDates = hist10y.map(p => p.date);
        const map2y  = {};
        (hist2y  || []).forEach(p => { map2y[p.date]  = p.value; });
        const map30y = {};
        (hist30y || []).forEach(p => { map30y[p.date] = p.value; });
        yieldHistory = {
          dates: anchorDates,
          dgs2:  anchorDates.map(d => map2y[d]  ?? null),
          dgs10: hist10y.map(p => p.value),
          dgs30: anchorDates.map(d => map30y[d] ?? null),
        };
      }
    } catch { /* use null */ }

    let treasuryRates = null;
    try {
      const tUrl = 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates' +
        '?filter=security_type_desc:eq:Marketable' +
        '&fields=record_date,security_desc,avg_interest_rate_amt' +
        '&sort=-record_date&page%5Bsize%5D=20';
      trackApiCall('Treasury Fiscal Data');
      const tData = await fetchJSON(tUrl);
      const records = tData?.data || [];
      if (records.length > 0) {
        const latestDate = records[0].record_date;
        const latest = records.filter(r => r.record_date === latestDate);
        const bills = latest.find(r => r.security_desc === 'Treasury Bills');
        const notes = latest.find(r => r.security_desc === 'Treasury Notes');
        const bonds = latest.find(r => r.security_desc === 'Treasury Bonds');
        if (bills || notes || bonds) {
          treasuryRates = {
            '0\u20132y':  bills ? parseFloat(bills.avg_interest_rate_amt) : null,
            '2\u20135y':  notes ? parseFloat(notes.avg_interest_rate_amt) : null,
            '5\u201310y': notes ? parseFloat(notes.avg_interest_rate_amt) : null,
            '10y+':       bonds ? parseFloat(bonds.avg_interest_rate_amt) : null,
          };
        }
      }
    } catch { /* use null */ }

    const result = {
      yieldCurveData,
      spreadData,
      spreadIndicators: Object.keys(spreadIndicators).length >= 3 ? spreadIndicators : null,
      treasuryRates,
      breakevensData,
      fredYieldHistory,
      fedFundsFutures,
      yieldHistory,
      mortgageSpread,
      lastUpdated: today,
    };

    writeDailyCache('bonds', result);
    cache.set(cacheKey, result, 900);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Bonds API error:', error);
    const fallback = readLatestCache('bonds');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
