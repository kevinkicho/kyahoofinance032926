import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BIS_OTC_URL = 'https://stats.bis.org/api/v2/data/dataflow/BIS/DER_D1/1.0';

const OTC_CATEGORIES = [
  { key: 'total', label: 'Total OTC Derivatives', series: 'D1' },
  { key: 'fx', label: 'FX Derivatives', series: 'D11' },
  { key: 'ir', label: 'Interest Rate Derivatives', series: 'D12' },
  { key: 'equity', label: 'Equity Derivatives', series: 'D13' },
  { key: 'commodity', label: 'Commodity Derivatives', series: 'D14' },
  { key: 'cds', label: 'Credit Default Swaps', series: 'D15' },
];

router.get('/', async (_req, res) => {
  const cached = readDailyCache('bisOTC');
  if (cached) return res.json(cached);

  const today = todayStr();
  try {
    const results = {};
    for (const cat of OTC_CATEGORIES) {
      try {
        trackApiCall('BIS');
        const url = `${BIS_OTC_URL}/Q.N.${cat.series}..LE.US+GB+JP+DE+FR+IT+CA+CH+AU+SE+NL+ES._T.N?startPeriod=2020&format=json`;
        const data = await fetchJSON(url);
        const obs = data?.dataSets?.[0]?.observations;
        if (!obs) continue;
        const series = Object.entries(obs).map(([key, val]) => {
          const parts = key.split(':');
          return { period: parts[0] || '', value: val?.[0] };
        }).filter(r => r.period && r.value != null).sort((a, b) => a.period.localeCompare(b.period));
        if (series.length > 0) results[cat.key] = { label: cat.label, series };
      } catch (e) {
        console.warn(`[BIS OTC] ${cat.key}: ${e.message}`);
      }
    }

    const _sources = {};
    for (const k of OTC_CATEGORIES.map(c => c.key)) _sources[`bisOTC_${k}`] = !!results[k];
    const isLive = Object.values(_sources).some(Boolean);
    const result = { categories: results, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
    if (isLive) writeDailyCache('bisOTC', result);
    else {
      const fb = readLatestCache('bisOTC');
      if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    }
    res.json(result);
  } catch (e) {
    console.warn('[BIS OTC]', e.message);
    const fb = readLatestCache('bisOTC');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    res.status(502).json({ error: 'BIS OTC API unavailable' });
  }
});

export default router;
