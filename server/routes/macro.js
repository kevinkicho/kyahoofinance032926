import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const FRED_SERIES = {
  M1:    'M1SL',
  M2:    'M2SL',
  CPI:   'CPIAUCSL',
  FFR:   'FEDFUNDS',
  UNEMP: 'UNRATE',
  GDP:   'GDP',
  IG_OAS:     'BAMLC0A0CM',
  HY_OAS:     'BAMLH0A0HYM2',
  BAA_SPREAD: 'BAA10Y',
};

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'fred_macro';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY not set — macro endpoint returning empty');
    return res.json({});
  }

  try {
    const results = {};

    trackApiCall('FRED');
    await Promise.allSettled(
      Object.entries(FRED_SERIES).map(async ([key, seriesId]) => {
        try {
          const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=12`;
          const data = await fetchJSON(url);
          if (data?.observations) {
            const valid = data.observations.filter(d => d.value !== '.');
            results[key] = {
              seriesId,
              latest: parseFloat(valid[0]?.value),
              prev:   parseFloat(valid[1]?.value),
              date:   valid[0]?.date,
            };
          }
        } catch (e) {
          console.warn(`FRED fetch failed for ${seriesId}:`, e.message);
        }
      })
    );

    cache.set(cacheKey, results, 3600);
    res.json(results);
  } catch (error) {
    console.error('FRED API Error:', error);
    res.status(500).json({ error: 'Failed to fetch macro data' });
  }
});

export default router;
