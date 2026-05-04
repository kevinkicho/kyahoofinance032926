// BEA (Bureau of Economic Analysis) — NIPA detail beyond what FRED summarizes.
// Free key required: https://apps.bea.gov/API/signup/
// Docs:               https://apps.bea.gov/API/docs/
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BASE = 'https://apps.bea.gov/api/data';

// T10101 = real GDP percent change by component (quarterly)
// T20100 = personal income headline & disposition (annual ONLY — the
//          monthly equivalent is T20600, but T20100's annual cut is more
//          compact and headline-friendly)
// T20600 = personal income & outlays + saving rate (monthly)
async function fetchTable(key, tableName, frequency = 'Q') {
  trackApiCall('BEA');
  const url = `${BASE}?UserID=${encodeURIComponent(key)}&method=GetData&datasetname=NIPA&TableName=${tableName}&Frequency=${frequency}&Year=ALL&ResultFormat=JSON`;
  const data = await fetchJSON(url);
  const rows = data?.BEAAPI?.Results?.Data || [];
  // Return only the most recent ~12 quarters / 24 months for compact payload.
  const sorted = rows.sort((a, b) => (a.TimePeriod < b.TimePeriod ? 1 : -1));
  const limit = frequency === 'Q' ? 16 * 12 : 24 * 6; // ~12 quarters × 12 line items, OR 24 months × 6 line items
  return sorted.slice(0, limit).map(r => ({
    period: r.TimePeriod,
    line: r.LineNumber,
    desc: r.LineDescription,
    value: r.DataValue ? parseFloat(r.DataValue.replace(/,/g, '')) : null,
    unit: r.CL_UNIT,
  }));
}

router.get('/', async (_req, res) => {
  const key = process.env.BEA_API_KEY;
  if (!key) {
    const fallback = readLatestCache('bea');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
    return res.status(503).json({ error: 'BEA_API_KEY not configured', _sources: {} });
  }

  const cached = readDailyCache('bea');
  if (cached) return res.json(cached);

  const today = todayStr();
  let gdpComponents = null, personalIncome = null, savingRate = null;
  try { gdpComponents = await fetchTable(key, 'T10101', 'Q'); } catch (e) { console.warn('[BEA] T10101:', e.message); }
  try { personalIncome = await fetchTable(key, 'T20100', 'A'); } catch (e) { console.warn('[BEA] T20100:', e.message); }
  try { savingRate = await fetchTable(key, 'T20600', 'M'); } catch (e) { console.warn('[BEA] T20600:', e.message); }

  const _sources = {
    beaGdpComponents: !!(gdpComponents && gdpComponents.length),
    beaPersonalIncome: !!(personalIncome && personalIncome.length),
    beaSavingRate: !!(savingRate && savingRate.length),
  };
  const isLive = Object.values(_sources).some(Boolean);

  const result = {
    gdpComponents,
    personalIncome,
    savingRate,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('bea', result);
  else {
    const fallback = readLatestCache('bea');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
