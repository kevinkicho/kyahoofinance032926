// BEA (Bureau of Economic Analysis) — NIPA detail beyond what FRED summarizes.
// Free key required: https://apps.bea.gov/API/signup/
// Docs:               https://apps.bea.gov/API/docs/
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';

const router = Router();

const BASE = 'https://apps.bea.gov/api/data';

// T10101 = real GDP percent change by component (quarterly)
// T20100 = personal income headline & disposition (annual)
// T20600 = personal income & outlays + saving rate (monthly)
// T11200 = national income / corporate profits (quarterly)
async function fetchTable(key, tableName, frequency = 'Q', { years = 'ALL', maxRows = null } = {}) {
  trackApiCall('BEA');
  const url = `${BASE}?UserID=${encodeURIComponent(key)}&method=GetData&datasetname=NIPA&TableName=${tableName}&Frequency=${frequency}&Year=${encodeURIComponent(years)}&ResultFormat=JSON`;
  const data = await fetchJSON(url, undefined, {}, 45000);
  const rows = data?.BEAAPI?.Results?.Data || [];
  const sorted = rows.sort((a, b) => (a.TimePeriod < b.TimePeriod ? 1 : -1));
  const limit = maxRows ?? (frequency === 'Q' ? 16 * 12 : 24 * 6);
  return sorted.slice(0, limit).map((r) => ({
    period: r.TimePeriod,
    line: r.LineNumber,
    desc: r.LineDescription,
    value: r.DataValue ? parseFloat(String(r.DataValue).replace(/,/g, '')) : null,
    unit: r.CL_UNIT || r.UNIT_MULT || null,
  }));
}

/** Keep only selected line numbers and chronological history for charts. */
function filterLines(rows, lineIds, maxPeriods = 40) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const want = new Set(lineIds.map(String));
  const filtered = rows.filter((r) => want.has(String(r.line)) && r.value != null);
  // Group by line, keep newest maxPeriods periods each
  const byLine = new Map();
  for (const r of filtered) {
    if (!byLine.has(r.line)) byLine.set(r.line, []);
    byLine.get(r.line).push(r);
  }
  const out = [];
  for (const [, list] of byLine) {
    list.sort((a, b) => String(b.period).localeCompare(String(a.period)));
    out.push(...list.slice(0, maxPeriods));
  }
  return out;
}

router.get('/', async (_req, res) => {
  const key = process.env.BEA_API_KEY;
  if (!key) {
    return sendCachedOrDegradedSync(res, 'bea', {
      error: new Error('BEA_API_KEY not configured'),
      extra: { _sources: {} },
    });
  }

  const cached = readDailyCache('bea');
  if (cached) return res.json(cached);

  const today = todayStr();
  let gdpComponents = null;
  let personalIncome = null;
  let savingRate = null;
  let corporateProfits = null;

  try {
    gdpComponents = await fetchTable(key, 'T10101', 'Q');
  } catch (e) {
    console.warn('[BEA] T10101:', e.message);
  }
  try {
    personalIncome = await fetchTable(key, 'T20100', 'A');
  } catch (e) {
    console.warn('[BEA] T20100:', e.message);
  }
  try {
    savingRate = await fetchTable(key, 'T20600', 'M');
  } catch (e) {
    console.warn('[BEA] T20600:', e.message);
  }
  try {
    // National income table — line 13 is Corporate profits with IVA and CCAdj ($ millions)
    const raw = await fetchTable(key, 'T11200', 'Q', { years: 'ALL', maxRows: 8000 });
    corporateProfits = filterLines(raw, ['13', '41', '42', '14', '15'], 48);
    // Normalize to $ billions for UI readability
    corporateProfits = corporateProfits.map((r) => ({
      ...r,
      valueBn: r.value != null ? Math.round((r.value / 1000) * 10) / 10 : null,
      unit: 'Billions of dollars',
    }));
  } catch (e) {
    console.warn('[BEA] T11200 corporate profits:', e.message);
  }

  const _sources = {
    beaGdpComponents: !!(gdpComponents && gdpComponents.length),
    beaPersonalIncome: !!(personalIncome && personalIncome.length),
    beaSavingRate: !!(savingRate && savingRate.length),
    beaCorporateProfits: !!(corporateProfits && corporateProfits.length),
  };
  const isLive = Object.values(_sources).some(Boolean);

  const result = {
    gdpComponents,
    personalIncome,
    savingRate,
    corporateProfits,
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
