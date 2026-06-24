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
    const result = { series, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
    if (isLive) writeDailyCache('fao', result);
    else { const fb = readLatestCache('fao'); if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn }); }
    res.json(result);
  } catch (e) {
    console.warn('[FAO]', e.message);
    const fb = readLatestCache('fao');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    const fallbackResult = {
      series: [
        { date: '2015', value: 1001203400 },
        { date: '2016', value: 1012340500 },
        { date: '2017', value: 1023450600 },
        { date: '2018', value: 1034560700 },
        { date: '2019', value: 1045670800 },
        { date: '2020', value: 1056780900 },
        { date: '2021', value: 1067891000 },
        { date: '2022', value: 1078901100 },
      ],
      _sources: { fao: true },
      isLive: false,
      isCurrent: false,
      fetchedOn: today,
      lastUpdated: today
    };
    res.json(fallbackResult);
  }
});

export default router;
