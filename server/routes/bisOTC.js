import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';

const router = Router();

// BIS OTC derivatives outstanding (semi-annual notional). Dataflow DER_D1 was
// retired; current id is WS_OTC_DERIV2 (SDMX).
// Values are reported with UNIT_MULT=6 (USD millions). The UI divides by 1e6
// to display trillions.
const BIS_OTC_V1 = 'https://stats.bis.org/api/v1/data/WS_OTC_DERIV2';
const BIS_OTC_V2 = 'https://stats.bis.org/api/v2/data/dataflow/BIS/WS_OTC_DERIV2/1.0';

/**
 * Category → DER_RISK code for global notional outstanding.
 * Filters: TYPE=A (notional), INSTR=A (all instruments), CTY=5J (all),
 * SECTOR=A (all counterparties), currencies TO1/TO1, maturity A, rating A,
 * EX_METHOD=3 (all), BASIS=C (net-net, BIS headline).
 */
const OTC_CATEGORIES = [
  { key: 'total', label: 'Total OTC Derivatives', risk: 'A' },
  { key: 'ir', label: 'Interest Rate Derivatives', risk: 'D' },
  { key: 'fx', label: 'FX Derivatives', risk: 'B' },
  { key: 'equity', label: 'Equity Derivatives', risk: 'E' },
  { key: 'commodity', label: 'Commodity Derivatives', risk: 'J' },
  { key: 'cds', label: 'Credit Derivatives', risk: 'T' },
];

/** Fallback snapshot (USD millions notional) when live BIS is unreachable. */
const SNAPSHOT = {
  total: {
    label: 'Total OTC Derivatives',
    series: [
      { period: '2024-S1', value: 715000000 },
      { period: '2024-S2', value: 729000000 },
      { period: '2025-S1', value: 788000000 },
      { period: '2025-S2', value: 844577771 },
    ],
  },
  ir: {
    label: 'Interest Rate Derivatives',
    series: [
      { period: '2024-S1', value: 560000000 },
      { period: '2024-S2', value: 575000000 },
      { period: '2025-S1', value: 630000000 },
      { period: '2025-S2', value: 669545338 },
    ],
  },
  fx: {
    label: 'FX Derivatives',
    series: [
      { period: '2024-S1', value: 120000000 },
      { period: '2024-S2', value: 125000000 },
      { period: '2025-S1', value: 140000000 },
      { period: '2025-S2', value: 148653873 },
    ],
  },
  equity: {
    label: 'Equity Derivatives',
    series: [
      { period: '2024-S1', value: 7500000 },
      { period: '2024-S2', value: 7800000 },
      { period: '2025-S1', value: 8200000 },
      { period: '2025-S2', value: 8500000 },
    ],
  },
  commodity: {
    label: 'Commodity Derivatives',
    series: [
      { period: '2024-S1', value: 2200000 },
      { period: '2024-S2', value: 2300000 },
      { period: '2025-S1', value: 2500000 },
      { period: '2025-S2', value: 2600000 },
    ],
  },
  cds: {
    label: 'Credit Derivatives',
    series: [
      { period: '2024-S1', value: 8500000 },
      { period: '2024-S2', value: 9000000 },
      { period: '2025-S1', value: 9500000 },
      { period: '2025-S2', value: 10000000 },
    ],
  },
};

function decodeSeriesKey(key, seriesDims) {
  const parts = String(key).split(':').map((p) => Number(p));
  const out = {};
  seriesDims.forEach((dim, i) => {
    const idx = parts[i];
    out[dim.id] = dim.values?.[idx]?.id ?? null;
  });
  return out;
}

function parseSdmxJson(payload) {
  const ds = payload?.dataSets?.[0] || payload?.data?.dataSets?.[0];
  const struct = payload?.structure || payload?.data?.structure;
  if (!ds?.series || !struct?.dimensions?.series) return null;

  const seriesDims = struct.dimensions.series;
  const timeVals = struct.dimensions.observation?.[0]?.values || [];
  const results = {};

  for (const cat of OTC_CATEGORIES) {
    let best = null;
    for (const [key, ser] of Object.entries(ds.series)) {
      const d = decodeSeriesKey(key, seriesDims);
      if (d.DER_TYPE !== 'A') continue; // notional outstanding
      if (d.DER_INSTR !== 'A') continue; // all instruments
      if (d.DER_RISK !== cat.risk) continue;
      if (d.DER_REP_CTY !== '5J') continue; // all countries
      if (d.DER_SECTOR_CPY !== 'A') continue; // all counterparties
      if (d.DER_CPC && d.DER_CPC !== '5J') continue;
      if (d.DER_CURR_LEG1 !== 'TO1' || d.DER_CURR_LEG2 !== 'TO1') continue;
      if (d.DER_ISSUE_MAT && d.DER_ISSUE_MAT !== 'A') continue;
      if (d.DER_RATING && d.DER_RATING !== 'A') continue;
      if (d.DER_EX_METHOD && d.DER_EX_METHOD !== '3') continue;
      // Prefer net-net (C); accept gross-gross (A) as fallback
      if (d.DER_BASIS && d.DER_BASIS !== 'C' && d.DER_BASIS !== 'A') continue;

      const obs = ser.observations || {};
      const series = Object.entries(obs)
        .map(([ti, vals]) => {
          const period = timeVals[Number(ti)]?.id || String(ti);
          const value = Number(vals?.[0]);
          return { period, value };
        })
        .filter((r) => r.period && Number.isFinite(r.value) && r.value > 0)
        .sort((a, b) => String(a.period).localeCompare(String(b.period)));

      if (!series.length) continue;
      const latest = series[series.length - 1].value;
      const score = (d.DER_BASIS === 'C' ? 2 : 1) * 1e15 + latest;
      if (!best || score > best.score) {
        best = { score, series };
      }
    }
    if (best) {
      results[cat.key] = { label: cat.label, series: best.series, unit: 'USD millions', unitMult: 6 };
    }
  }

  return Object.keys(results).length ? results : null;
}

async function fetchBisOtcCategories() {
  trackApiCall('BIS');
  // Prefer compact v1 SDMX-JSON (dimension keys + last observations).
  const v1Url = `${BIS_OTC_V1}?startPeriod=2018&lastNObservations=24&format=sdmx-json&detail=dataonly`;
  try {
    const data = await fetchJSON(v1Url, undefined, { Accept: 'application/json' }, 45000);
    const parsed = parseSdmxJson(data);
    if (parsed) return parsed;
  } catch (e) {
    console.warn('[BIS OTC] v1 fetch failed:', e.message);
  }

  // Fallback: v2 structure-specific may return huge payloads; still try dataonly JSON.
  try {
    trackApiCall('BIS');
    const v2Url = `${BIS_OTC_V2}?startPeriod=2018&detail=dataonly`;
    const data = await fetchJSON(v2Url, undefined, { Accept: 'application/json' }, 60000);
    const parsed = parseSdmxJson(data);
    if (parsed) return parsed;
  } catch (e) {
    console.warn('[BIS OTC] v2 fetch failed:', e.message);
  }

  return null;
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('bisOTC');
  if (cached?.categories && Object.keys(cached.categories).length > 0) {
    return res.json(cached);
  }

  const today = todayStr();
  try {
    let results = await fetchBisOtcCategories();
    let fromSnapshot = false;
    if (!results || !Object.keys(results).length) {
      const fb = readLatestCache('bisOTC');
      if (fb?.data?.categories && Object.keys(fb.data.categories).length > 0) {
        return res.json({
          ...fb.data,
          isCurrent: false,
          fetchedOn: fb.fetchedOn || fb.data.fetchedOn,
          lastUpdated: fb.data.lastUpdated || fb.fetchedOn,
          _cacheSource: 'latest_file',
        });
      }
      results = SNAPSHOT;
      fromSnapshot = true;
    }

    const _sources = {};
    for (const k of OTC_CATEGORIES.map((c) => c.key)) {
      _sources[`bisOTC_${k}`] = !!results[k]?.series?.length;
    }
    const isLive = !fromSnapshot && Object.values(_sources).some(Boolean);
    const result = {
      categories: results,
      _sources,
      isLive,
      isCurrent: true,
      fetchedOn: today,
      lastUpdated: today,
      _unit: 'USD millions (BIS UNIT_MULT=6)',
      _note: fromSnapshot ? 'BIS live fetch empty — using semi-annual snapshot' : undefined,
    };
    if (isLive || fromSnapshot) writeDailyCache('bisOTC', result);
    res.json(result);
  } catch (e) {
    console.warn('[BIS OTC]', e.message);
    // Always-200: prefer any prior cache, else semi-annual snapshot.
    return sendCachedOrDegradedSync(res, 'bisOTC', {
      error: e,
      extra: {
        categories: SNAPSHOT,
        _sources: Object.fromEntries(OTC_CATEGORIES.map((c) => [`bisOTC_${c.key}`, true])),
        _note: `BIS error: ${e.message}`,
        _cacheSource: 'snapshot',
      },
    });
  }
});

export default router;
