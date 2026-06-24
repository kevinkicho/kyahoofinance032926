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
    const data = await fetchJSON(`${FAO_BASE}/en/QAQ?area=5000&item=23011&element=5111`);
    const indices = data?.data?.slice(-60) || [];
    const series = indices.map(d => ({ date: d?.Date || d?.year, value: parseFloat(d?.Value) })).filter(d => d.date && !isNaN(d.value));
    const _sources = { fao: series.length > 0 };
    const isLive = _sources.fao;
    const result = { series, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
    if (isLive) writeDailyCache('fao', result);
    else { const fb = readLatestCache('fao'); if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn }); }
    res.json(result);
  } catch (e) {
    console.warn('[FAO]', e.message);
    const fb = readLatestCache('fao');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    res.status(502).json({ error: 'FAO API unavailable' });
  }
});

export default router;
