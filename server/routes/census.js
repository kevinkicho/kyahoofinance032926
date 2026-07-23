import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';

const router = Router();

const FRED_API_BASE = 'https://api.stlouisfed.org/fred';

const CENSUS_SERIES = {
  housingStarts:    { id: 'HOUST',    label: 'Housing Starts',       unit: 'K',   source: 'Census Bureau' },
  buildingPermits:  { id: 'PERMIT',   label: 'Building Permits',     unit: 'K',   source: 'Census Bureau' },
  retailSales:      { id: 'RSAFS',    label: 'Retail Sales',          unit: 'M$',  source: 'Census Bureau' },
  tradeBalance:     { id: 'BOPGSTB',  label: 'Trade Balance',        unit: 'M$',  source: 'Census Bureau / BEA' },
  durableGoods:     { id: 'DGORDER',  label: 'Durable Goods Orders',  unit: 'M$',  source: 'Census Bureau' },
  newHomeSales:     { id: 'HSN1F',    label: 'New Home Sales',        unit: 'K',   source: 'Census Bureau' },
  constructionSpending: { id: 'TTLCONS', label: 'Construction Spending', unit: 'B$', source: 'Census Bureau' },
};

async function fetchFREDSeries(seriesId, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    trackApiCall('FRED (Census)');
    const url = `${FRED_API_BASE}/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=36`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[Census] FRED ${seriesId}: upstream ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.observations || [];
  } catch (err) {
    clearTimeout(timeout);
    console.warn(`[Census] FRED ${seriesId}: ${err.message}`);
    return null;
  }
}

function parseSeriesObservations(rawObs) {
  if (!rawObs?.length) return null;
  const vals = rawObs.filter(o => o.value !== '.' && o.value != null);
  if (vals.length === 0) return null;

  const dates = [];
  const values = [];
  for (const o of vals) {
    dates.push(o.date);
    values.push(parseFloat(o.value));
  }

  const latest = { date: dates[0], value: values[0] };
  const previous = dates.length > 1 ? { date: dates[1], value: values[1] } : null;

  dates.reverse();
  values.reverse();

  return { dates, values, latest, previous };
}

router.get('/', async (req, res) => {
  const apiKey = process.env.FRED_API_KEY;
  const today = todayStr();
  const cacheKey = 'census_data';

  if (!apiKey) {
    return sendCachedOrDegradedSync(res, 'census', {
      error: new Error('FRED_API_KEY not configured'),
      memoryCache: req.app.locals.cache,
      cacheKey,
    });
  }

  const daily = readDailyCache('census');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = req.app.locals.cache?.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const results = await Promise.allSettled(
      Object.entries(CENSUS_SERIES).map(async ([key, def]) => {
        const raw = await fetchFREDSeries(def.id, apiKey);
        return { key, raw, def };
      })
    );

    const series = {};
    const _sources = {};

    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { key, raw, def } = r.value;
      const parsed = parseSeriesObservations(raw);
      series[key] = {
        label: def.label,
        unit: def.unit,
        seriesId: def.id,
        source: def.source,
        latest: parsed?.latest || null,
        previous: parsed?.previous || null,
        history: parsed ? { dates: parsed.dates, values: parsed.values } : { dates: [], values: [] },
        _source: parsed != null,
      };
      _sources[`census_${key}`] = parsed != null;
    }

    const anySourceLive = Object.values(_sources).some(v => v === true);

    const result = {
      series,
      _sources,
      lastUpdated: today,
    };

    if (anySourceLive) writeDailyCache('census', result);
    req.app.locals.cache?.set(cacheKey, result, 3600);
    res.json({ ...result, fetchedOn: today, isCurrent: anySourceLive });
  } catch (err) {
    console.error('[Census] route error:', err);
    return sendCachedOrDegradedSync(res, 'census', {
      error: err,
      memoryCache: req.app.locals.cache,
      cacheKey,
    });
  }
});

export default router;