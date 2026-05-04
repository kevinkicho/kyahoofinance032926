// EIA petroleum & natural gas — companion to /api/eia for the Commodities tab.
//
// Three series:
//   - Regular gasoline retail prices (weekly, US, $/gal)             EMM_EPMR_PTE_NUS_DPG
//   - Henry Hub natural gas spot prices (daily, $/MMBtu)             RNGWHHD
//   - US crude oil ending stocks (weekly, thousand barrels)          WCRSTUS1
//
// Same EIA_API_KEY as /api/eia. Each series capped to ~2 years to keep
// the payload light. Graceful degradation when key is unset.
import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const EIA_API_BASE = 'https://api.eia.gov/v2';

const SERIES = {
  gasoline: {
    path:    '/petroleum/pri/gnd/data/',
    facets:  { product: ['EPMR'], duoarea: ['NUS'] },
    label:   'Regular Gasoline Retail',
    unit:    '$/gal',
    color:   '#f59e0b',
    weekly:  true,
    length:  104,                              // ~2 years of weekly observations
  },
  naturalGas: {
    path:    '/natural-gas/pri/fut/data/',
    facets:  { series: ['RNGWHHD'] },
    label:   'Henry Hub Spot',
    unit:    '$/MMBtu',
    color:   '#3b82f6',
    weekly:  false,                            // daily
    length:  500,                              // ~2 years of trading days
  },
  crudeStocks: {
    path:    '/petroleum/stoc/wstk/data/',
    facets:  { series: ['WCRSTUS1'] },
    label:   'US Crude Oil Stocks',
    unit:    'MBBL',
    color:   '#ef4444',
    weekly:  true,
    length:  104,
  },
};

function buildUrl(series, apiKey) {
  const sp = new URLSearchParams();
  sp.set('api_key', apiKey);
  sp.set('frequency', series.weekly ? 'weekly' : 'daily');
  sp.append('data[0]', 'value');
  for (const [facet, vals] of Object.entries(series.facets)) {
    for (const v of vals) sp.append(`facets[${facet}][]`, v);
  }
  sp.set('sort[0][column]', 'period');
  sp.set('sort[0][direction]', 'desc');
  sp.set('length', String(series.length));
  return `${EIA_API_BASE}${series.path}?${sp.toString()}`;
}

async function fetchSeries(spec, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    trackApiCall('EIA');
    const res = await fetch(buildUrl(spec, apiKey), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rows = Array.isArray(data?.response?.data) ? data.response.data : [];
    // Sort chronologically (API returns newest-first).
    const points = rows
      .map(r => ({ date: r.period, value: r.value != null ? Number(r.value) : null }))
      .filter(p => p.date && Number.isFinite(p.value))
      .sort((a, b) => a.date.localeCompare(b.date));
    return points;
  } catch (e) {
    clearTimeout(timeout);
    console.warn(`[EIA petroleum] ${spec.label}:`, e.message);
    return null;
  }
}

router.get('/', async (_req, res) => {
  const apiKey = process.env.EIA_API_KEY;
  const today = todayStr();
  if (!apiKey) {
    return res.json({
      gasoline: null, naturalGas: null, crudeStocks: null,
      _sources: { eiaPetroleum: false },
      isLive: false, isCurrent: false,
      error: 'EIA_API_KEY not configured',
      fetchedOn: today, lastUpdated: today,
    });
  }

  const cached = readDailyCache('eiaPetroleum');
  if (cached) return res.json(cached);

  const out = {};
  for (const [key, spec] of Object.entries(SERIES)) {
    const series = await fetchSeries(spec, apiKey);
    if (series?.length) {
      const last = series[series.length - 1];
      const yearAgoIdx = series.findIndex(p => p.date >= last.date.slice(0, 4) - 1 + last.date.slice(4));
      const yearAgo = yearAgoIdx > -1 ? series[yearAgoIdx] : series[0];
      out[key] = {
        label:   spec.label,
        unit:    spec.unit,
        color:   spec.color,
        series,
        latest:  last,
        yoyPct:  yearAgo && yearAgo.value !== 0 ? Math.round(((last.value - yearAgo.value) / yearAgo.value) * 1000) / 10 : null,
      };
    } else {
      out[key] = null;
    }
  }

  const _sources = {
    eiaGasoline:    !!out.gasoline,
    eiaNaturalGas:  !!out.naturalGas,
    eiaCrudeStocks: !!out.crudeStocks,
  };
  const isLive = Object.values(_sources).some(Boolean);
  const result = {
    gasoline:    out.gasoline,
    naturalGas:  out.naturalGas,
    crudeStocks: out.crudeStocks,
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };

  if (isLive) writeDailyCache('eiaPetroleum', result);
  else {
    const fb = readLatestCache('eiaPetroleum');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
