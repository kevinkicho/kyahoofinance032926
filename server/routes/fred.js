import { Router } from 'express';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

router.get('/observations', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY;
  if (!FRED_API_KEY) {
    return res.status(503).json({ error: 'FRED_API_KEY not configured on server' });
  }

  const { series_id, sort_order, limit, file_type, observation_start, observation_end } = req.query;

  if (!series_id || !/^[A-Z0-9]{2,20}$/.test(series_id)) {
    return res.status(400).json({ error: 'Invalid or missing series_id' });
  }

  const params = new URLSearchParams({
    series_id,
    api_key: FRED_API_KEY,
    file_type: file_type || 'json',
    sort_order: sort_order || 'desc',
  });

  if (limit) params.set('limit', limit);
  if (observation_start) params.set('observation_start', observation_start);
  if (observation_end) params.set('observation_end', observation_end);

  try {
    trackApiCall('FRED');
    const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const fredRes = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!fredRes.ok) {
      const text = await fredRes.text();
      console.warn(`[FRED proxy] upstream ${fredRes.status}: ${text.slice(0, 200)}`);
      return res.status(fredRes.status).json({ error: 'FRED upstream error', status: fredRes.status });
    }
    const data = await fredRes.json();
    res.json(data);
  } catch (err) {
    console.error('[FRED proxy] fetch error:', err.message);
    res.status(502).json({ error: 'FRED proxy fetch failed', detail: err.message });
  }
});

export default router;