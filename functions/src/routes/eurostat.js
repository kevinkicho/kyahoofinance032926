// Eurostat — EU-27 monthly HICP, unemployment, government finance.
// Docs: https://wikis.ec.europa.eu/display/EUROSTATHELP/Web+Services
// No key required. SDMX-JSON via the dissemination API.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { parseJsonStat, latestPerSeries } from '../lib/sdmx.js';

const router = Router();

const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';

const COUNTRIES = ['EU27_2020', 'EA20', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE'];

// Eurostat expects repeated query params for multi-value filters
// (e.g. geo=DE&geo=FR&geo=IT) — comma-joined values are NOT accepted.
function buildEurostatUrl(dataset, params) {
  const qs = new URLSearchParams();
  qs.set('format', 'JSON');
  qs.set('lang', 'EN');
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach(x => qs.append(k, x));
    else qs.set(k, v);
  }
  return `${BASE}/${dataset}?${qs.toString()}`;
}

async function fetchEurostat(dataset, params = {}) {
  trackApiCall('Eurostat');
  const url = buildEurostatUrl(dataset, params);
  const data = await fetchJSON(url);
  // Eurostat returns JSON-stat 2.0 (not SDMX-JSON). The `time` dimension
  // is the natural observation axis; let the parser default to it.
  return parseJsonStat(data, 'time');
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('eurostat');
  if (cached) return res.json(cached);

  const today = todayStr();
  let hicp = null, unemployment = null, govtDeficit = null;

  try {
    // prc_hicp_manr — HICP monthly annual rate. coicop=CP00 = "All items".
    const series = await fetchEurostat('prc_hicp_manr', {
      coicop: 'CP00',
      geo: COUNTRIES,
    });
    hicp = latestPerSeries(series).filter(r => r.value != null);
  } catch (e) { console.warn('[Eurostat] HICP:', e.message); }

  try {
    // une_rt_m — Monthly unemployment rate, total, age 15-74, sa.
    const series = await fetchEurostat('une_rt_m', {
      sex: 'T',
      age: 'TOTAL',
      unit: 'PC_ACT',
      s_adj: 'SA',
      geo: COUNTRIES,
    });
    unemployment = latestPerSeries(series).filter(r => r.value != null);
  } catch (e) { console.warn('[Eurostat] unemployment:', e.message); }

  try {
    // gov_10dd_edpt1 — Government deficit/surplus, % of GDP (annual).
    const series = await fetchEurostat('gov_10dd_edpt1', {
      sector: 'S13',
      na_item: 'B9',
      unit: 'PC_GDP',
      geo: COUNTRIES,
    });
    govtDeficit = latestPerSeries(series).filter(r => r.value != null);
  } catch (e) { console.warn('[Eurostat] govt deficit:', e.message); }

  const _sources = {
    eurostatHicp: !!(hicp && hicp.length),
    eurostatUnemployment: !!(unemployment && unemployment.length),
    eurostatGovtDeficit: !!(govtDeficit && govtDeficit.length),
  };
  const isLive = Object.values(_sources).some(Boolean);

  const result = {
    hicp,
    unemployment,
    govtDeficit,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('eurostat', result);
  else {
    const fallback = readLatestCache('eurostat');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
