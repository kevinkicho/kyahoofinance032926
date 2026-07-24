import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const FAO_BASE = 'https://fenixservices.fao.org/faostat/api/v1';

router.get('/', async (_req, res) => {
  const cached = readDailyCache('fao');
  if (cached) return res.json(cached);

  const today = todayStr();
  try {
    trackApiCall('FAO');
    const data = await fetchJSON(`${FAO_BASE}/en/QAQ?area=5000&item=23011&element=5111`, undefined, {}, 2000);
    const indices = data?.data?.slice(-60) || [];
    const series = indices.map(d => ({ date: d?.Date || d?.year, value: parseFloat(d?.Value) })).filter(d => d.date && !isNaN(d.value));
    const _sources = { fao: series.length > 0 };
    const isLive = _sources.fao;
    // Panels expect foodPriceIndex { dates, values } — also keep series for legacy.
    const foodPriceIndex = series.length
      ? {
          dates: series.map((p) => String(p.date)),
          values: series.map((p) => p.value),
          latest: series[series.length - 1]?.value ?? null,
        }
      : null;
    const result = {
      series,
      foodPriceIndex,
      summary: foodPriceIndex
        ? { latest: foodPriceIndex.latest, asOf: foodPriceIndex.dates.at(-1) }
        : null,
      _sources,
      isLive,
      isCurrent: true,
      fetchedOn: today,
      lastUpdated: today,
    };
    if (isLive) writeDailyCache('fao', result);
    else {
      const fb = readLatestCache('fao');
      if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    }
    res.json(result);
  } catch (e) {
    console.warn('[FAO]', e.message);
    // FRED proxy for global food CPI when FAOSTAT is down
    try {
      const FRED_API_KEY = process.env.FRED_API_KEY || '';
      if (FRED_API_KEY) {
        trackApiCall('FRED');
        const fred = await fetchJSON(
          `https://api.stlouisfed.org/fred/series/observations?series_id=CPIFABSL&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2015-01-01`
        );
        const obs = (fred?.observations || []).filter((o) => o.value !== '.');
        if (obs.length >= 6) {
          const foodPriceIndex = {
            dates: obs.map((o) => o.date.slice(0, 7)),
            values: obs.map((o) => Math.round(parseFloat(o.value) * 10) / 10),
            latest: Math.round(parseFloat(obs[obs.length - 1].value) * 10) / 10,
            _proxy: 'FRED_CPIFABSL',
          };
          const result = {
            series: obs.map((o) => ({ date: o.date, value: parseFloat(o.value) })),
            foodPriceIndex,
            summary: { latest: foodPriceIndex.latest, asOf: foodPriceIndex.dates.at(-1), proxy: 'FRED CPIFABSL' },
            _sources: { fao: false, fredFoodCpi: true },
            isLive: true,
            isCurrent: true,
            fetchedOn: today,
            lastUpdated: today,
          };
          writeDailyCache('fao', result);
          return res.json(result);
        }
      }
    } catch (e2) {
      console.warn('[FAO] FRED proxy failed:', e2.message || e2);
    }
    const fb = readLatestCache('fao');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    const fallbackResult = {
      foodPriceIndex: null,
      summary: null,
      series: [],
      _sources: { fao: false },
      isLive: false,
      isCurrent: false,
      fetchedOn: today,
      lastUpdated: today,
    };
    res.json(fallbackResult);
  }
});

export default router;
