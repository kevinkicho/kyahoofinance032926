import { Router } from 'express';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();

const SERIES_REGISTRY = {
  'US_YIELDS': ['DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS5', 'DGS7', 'DGS10', 'DGS20', 'DGS30'],
  'S_INDICATORS': ['T10Y2Y', 'T10Y3M', 'T5Y30'],
  'REAL_YIELDS': ['DFII5', 'DFII10', 'DFII30'],
  'CREDIT_S': ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAMLEMCBPIOAS'],
  'MACRO': ['UNRATE', 'GDP', 'PCEPI', 'WALCL', 'M2SL', 'GFDEBTN'],
  'CPI': ['CPIAUCSL', 'CPILFESL'],
  'FX_S': ['DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXSZUS', 'DEXALUS', 'DEXCAUS'],
  'VIX_S': ['VIXCLS'],
  'SKEW_S': ['SKEW'],
  'DXY_S': ['DTWEXBGS'],
  'CASE_S': ['CSUSHP la', 'MORTGAGE30US', 'HOUST', 'RSAHORUSQ156S', 'RRVRUSQ156N', 'EXHOSLUSM495S'],
};

router.get('/batch', async (req, res) => {
  const { group } = req.query;
  const seriesIds = SERIES_REGISTRY[group];
  if (!seriesIds) return res.status(400).json({ error: 'Invalid or missing group' });

  const FRED_API_KEY = process.env.FRED_API_KEY;
  if (!FRED_API_KEY) {
    return res.status(503).json({ error: 'FRED_API_KEY not configured on server' });
  }

  const results = await Promise.all(seriesIds.map(async id => {
    try {
      const params = new URLSearchParams({ series_id: id, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: '1' });
      const d = await fetchJSON(`https://api.stlouisfed.org/fred/series/observations?${params.toString()}`);
      return { id, data: d };
    } catch (e) {
      console.warn(`[FRED batch] ${id} failed:`, e.message);
      return { id, error: 'fetch_failed' };
    }
  }));

  trackApiCall('FRED');
  res.json({ results, _sources: { fredBatch: true, group } });
});

router.get('/observations', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY;
  if (!FRED_API_KEY) {
    return res.status(503).json({ error: 'FRED_API_KEY not configured on server' });
  }

  const { series_id, sort_order, limit, file_type, observation_start, observation_end } = req.query;

  if (!series_id || !/^[A-Z0-9]{2,20}$/.test(series_id)) {
    return res.status(400).json({ error: 'Invalid or missing series_id' });
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (observation_start && !DATE_RE.test(observation_start)) {
    return res.status(400).json({ error: 'Invalid observation_start (expected YYYY-MM-DD)' });
  }
  if (observation_end && !DATE_RE.test(observation_end)) {
    return res.status(400).json({ error: 'Invalid observation_end (expected YYYY-MM-DD)' });
  }
  if (limit !== undefined) {
    const n = Number(limit);
    if (!Number.isInteger(n) || n < 1 || n > 100000) {
      return res.status(400).json({ error: 'Invalid limit (1..100000)' });
    }
  }
  if (sort_order && !['asc', 'desc'].includes(sort_order)) {
    return res.status(400).json({ error: 'Invalid sort_order' });
  }
  if (file_type && file_type !== 'json') {
    return res.status(400).json({ error: 'Invalid file_type' });
  }

  const params = new URLSearchParams({
    series_id,
    api_key: FRED_API_KEY,
    file_type: 'json',
    sort_order: sort_order || 'desc',
  });

  if (limit) params.set('limit', String(limit));
  if (observation_start) params.set('observation_start', observation_start);
  if (observation_end) params.set('observation_end', observation_end);

  try {
    trackApiCall('FRED');
    const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
    const data = await fetchJSON(url);
    res.set('X-Data-Sources', JSON.stringify({ fredProxy: true, seriesId: series_id }));
    res.json({ ...data, _sources: { fredProxy: true, seriesId: series_id } });
  } catch (err) {
    console.error('[FRED proxy] fetch error:', err.message);
    res.status(502).json({ error: 'FRED proxy fetch failed' });
  }
});

export default router;