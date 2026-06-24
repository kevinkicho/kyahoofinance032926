import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates';

router.get('/', async (_req, res) => {
  const cached = readDailyCache('treasuryCost');
  if (cached) return res.json(cached);

  const today = todayStr();
  try {
    trackApiCall('Treasury Fiscal Data');
    const url = `${BASE}?page[size]=120&sort=-record_date&fields=record_date,security_desc,security_type,avg_interest_rate_amt`;
    const data = await fetchJSON(url);
    const rows = (data?.data || []).filter(r => r.avg_interest_rate_amt != null);
    const byType = {};
    for (const r of rows) {
      const type = r.security_type || 'Other';
      if (!byType[type]) byType[type] = [];
      byType[type].push({ date: r.record_date, rate: parseFloat(r.avg_interest_rate_amt), desc: r.security_desc });
    }
    const latest = {};
    for (const [type, vals] of Object.entries(byType)) {
      vals.sort((a, b) => b.date.localeCompare(a.date));
      latest[type] = vals[0];
    }
    const _sources = { treasuryCost: !!Object.keys(latest).length };
    const isLive = _sources.treasuryCost;
    const result = { byType, latest, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
    if (isLive) writeDailyCache('treasuryCost', result);
    else {
      const fb = readLatestCache('treasuryCost');
      if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    }
    res.json(result);
  } catch (e) {
    console.warn('[treasuryCost]', e.message);
    const fb = readLatestCache('treasuryCost');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    res.status(502).json({ error: 'Treasury cost API unavailable' });
  }
});

export default router;
