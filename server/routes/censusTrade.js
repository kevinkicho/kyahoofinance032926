// US Census Bureau — International Trade.
//
// Source: api.census.gov/data/timeseries/intltrade/{exports,imports}/enduse.
// No key required. We pull monthly exports and imports across major trade
// blocs (USMCA, EU, Pacific Rim, OECD, NATO) for the last ~24 months. The
// derived metric is the bilateral trade balance per bloc plus the total
// US trade balance series.
//
// Reference docs: census.gov/foreign-trade/data/index.html
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const EXPORTS_URL = 'https://api.census.gov/data/timeseries/intltrade/exports/enduse';
const IMPORTS_URL = 'https://api.census.gov/data/timeseries/intltrade/imports/enduse';

// CTY_CODE → friendly label. Census's `enduse` endpoint reports values by
// trade-bloc grouping — most useful for at-a-glance comparison.
const BLOCS = [
  { code: '-',    label: 'World',       flag: '\u{1F30E}' },
  { code: '0020', label: 'USMCA',       flag: '\u{1F1FA}\u{1F1F8}' },
  { code: '0003', label: 'EU',          flag: '\u{1F1EA}\u{1F1FA}' },
  { code: '0014', label: 'Pacific Rim', flag: '\u{1F30A}' },
  { code: '0022', label: 'OECD',        flag: '\u{1F30D}' },
  { code: '0023', label: 'NATO',        flag: '\u{1F6E1}' },
];

function timesForLastNMonths(n) {
  // Census trade lags by ~2 months (Feb data drops in mid-April), so start
  // 3 months back to ensure we hit a published month.
  const out = [];
  const now = new Date();
  now.setUTCDate(1);
  now.setUTCMonth(now.getUTCMonth() - 2);
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

const DEFAULT_UA = 'kyahoofinance-researcher (Educational Sandbox)';

/** Log at most one Census failure per process minute (48 month-calls used to spam). */
let _censusWarnAt = 0;
let _censusWarnN = 0;
function warnCensusOnce(msg) {
  _censusWarnN += 1;
  const now = Date.now();
  if (now - _censusWarnAt < 60_000) return;
  const n = _censusWarnN;
  _censusWarnAt = now;
  _censusWarnN = 0;
  const extra = n > 1 ? ` (+${n - 1} similar)` : '';
  console.warn(`[Census trade]${extra}`, msg);
}

function censusApiKey() {
  return String(
    process.env.CENSUS_API_KEY
    || process.env['CENSUS-API-KEY']
    || process.env.CENSUS_KEY
    || '',
  ).trim();
}

async function fetchTradeForMonth(url, valueField, month) {
  const params = new URLSearchParams({
    get:       `CTY_CODE,CTY_NAME,${valueField}`,
    time:      month,
    CTY_CODE:  '*',
  });
  // Some Census endpoints return HTML "Missing Key" without a key in 2025+.
  const key = censusApiKey();
  if (key) params.set('key', key);
  trackApiCall('Census Bureau');
  try {
    const data = await fetchJSON(`${url}?${params.toString()}`, DEFAULT_UA, {}, 12_000);
    if (!Array.isArray(data) || data.length < 2) return null;
    // First row is the header. Return rows keyed by CTY_CODE.
    const out = {};
    for (let i = 1; i < data.length; i++) {
      const [code, name, val] = data[i];
      const v = Number(val);
      if (Number.isFinite(v)) out[code] = { name, value: v };
    }
    return out;
  } catch (e) {
    warnCensusOnce(e.message);
    return { _error: e.message, _source: 'Census Bureau', _fetchedAt: new Date().toISOString() };
  }
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('censusTrade');
  if (cached) return res.json(cached);

  const today = todayStr();
  const months = timesForLastNMonths(24);

  // Fan out — one fetch per (direction, month). Prefer cache on total failure.
  // Cap concurrency slightly by awaiting settled (allSettled already isolates).
  let results;
  try {
    results = await Promise.allSettled(months.flatMap(m => [
      fetchTradeForMonth(EXPORTS_URL, 'ALL_VAL_MO', m).then(d => ({ direction: 'exports', month: m, data: d })),
      fetchTradeForMonth(IMPORTS_URL, 'GEN_VAL_MO', m).then(d => ({ direction: 'imports', month: m, data: d })),
    ]));
  } catch (e) {
    // Should not throw (allSettled), but never take down the process.
    console.warn('[Census trade] batch failed:', e?.message || e);
    const fb = readLatestCache('censusTrade');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    return res.json({
      blocs: BLOCS.map(b => ({ ...b, series: [] })),
      latest: null,
      summary: null,
      _sources: { censusTrade: false },
      isLive: false,
      isCurrent: false,
      fetchedOn: today,
      lastUpdated: today,
      error: e?.message || 'Census trade batch failed',
    });
  }

  // Re-shape: per-bloc time series of exports / imports / balance.
  const blocs = BLOCS.map(b => ({ ...b, series: [] }));
  // Iterate months oldest → newest so plotted series are chronological.
  const sortedMonths = [...months].sort();
  for (const m of sortedMonths) {
    const exp = results.find(r => r.status === 'fulfilled' && r.value.direction === 'exports' && r.value.month === m)?.value?.data;
    const imp = results.find(r => r.status === 'fulfilled' && r.value.direction === 'imports' && r.value.month === m)?.value?.data;
    if (!exp && !imp) continue;
    for (const bloc of blocs) {
      const expVal = exp?.[bloc.code]?.value ?? null;
      const impVal = imp?.[bloc.code]?.value ?? null;
      if (expVal == null && impVal == null) continue;
      bloc.series.push({
        month:        m,
        exportsB:     expVal != null ? Math.round(expVal / 1e7) / 100 : null,    // $B with 2 decimals
        importsB:     impVal != null ? Math.round(impVal / 1e7) / 100 : null,
        balanceB:     (expVal != null && impVal != null) ? Math.round((expVal - impVal) / 1e7) / 100 : null,
      });
    }
  }

  const world = blocs.find(b => b.code === '-');
  const latest = world?.series?.length ? world.series[world.series.length - 1] : null;

  const _sources = { censusTrade: !!(world?.series?.length) };
  const isLive = _sources.censusTrade;
  const result = {
    blocs,
    latest,
    summary: latest ? {
      latestMonth:   latest.month,
      worldExportsB: latest.exportsB,
      worldImportsB: latest.importsB,
      worldBalanceB: latest.balanceB,
    } : null,
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };

  if (isLive) writeDailyCache('censusTrade', result);
  else {
    const fb = readLatestCache('censusTrade');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
