// FDIC public data — bank failures, aggregate banking sector stats.
// Docs: https://banks.data.fdic.gov/docs/
// No key required.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

// FDIC API moved from `banks.data.fdic.gov/api/` to `api.fdic.gov/banks/`
// in early 2026. Old paths return 301; we use the canonical new base.
const BASE = 'https://api.fdic.gov/banks';

// Recent bank failures (last 5 years).
async function fetchFailures() {
  trackApiCall('FDIC');
  const since = new Date();
  since.setFullYear(since.getFullYear() - 5);
  const isoSince = since.toISOString().split('T')[0];
  const url = `${BASE}/failures?filters=FAILDATE:[${isoSince} TO *]&fields=NAME,CITYST,FAILDATE,RESTYPE,QBFASSET,QBFDEP&sort_by=FAILDATE&sort_order=DESC&limit=50`;
  const data = await fetchJSON(url);
  return (data?.data || []).map(d => ({
    name: d.data?.NAME,
    city: d.data?.CITYST,
    date: d.data?.FAILDATE,
    type: d.data?.RESTYPE,
    assets: d.data?.QBFASSET,
    deposits: d.data?.QBFDEP,
  }));
}

// Aggregate sector stats: assets/deposits/net income summed across all
// states for the latest 5 years. The FDIC `/summary` endpoint reports
// state-level totals (PSTALP=AK, AL, …) — there's no built-in US total,
// so we sum here.
async function fetchAggregate() {
  trackApiCall('FDIC');
  const url = `${BASE}/summary?limit=10000&sort_by=YEAR&sort_order=DESC&fields=YEAR,PSTALP,ASSET,DEP,NETINC`;
  const data = await fetchJSON(url);
  const rows = data?.data || [];
  const byYear = {};
  for (const r of rows) {
    const d = r.data || {};
    const y = d.YEAR;
    if (!y) continue;
    if (!byYear[y]) byYear[y] = { year: y, assets: 0, deposits: 0, netIncome: 0, states: 0 };
    byYear[y].assets    += Number(d.ASSET   || 0);
    byYear[y].deposits  += Number(d.DEP     || 0);
    byYear[y].netIncome += Number(d.NETINC  || 0);
    byYear[y].states    += 1;
  }
  return Object.values(byYear)
    .sort((a, b) => b.year.localeCompare(a.year))
    .slice(0, 5)
    .map(y => ({
      year: y.year,
      assetsB: y.assets / 1e3,        // FDIC reports in $ thousands → billions
      depositsB: y.deposits / 1e3,
      netIncomeB: y.netIncome / 1e3,
      stateCount: y.states,
    }));
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('fdic');
  if (cached) return res.json(cached);

  const today = todayStr();
  let failures = null, aggregate = null;
  try { failures = await fetchFailures(); } catch (e) { console.warn('[FDIC] failures:', e.message); }
  try { aggregate = await fetchAggregate(); } catch (e) { console.warn('[FDIC] aggregate:', e.message); }

  const _sources = {
    fdicFailures: !!(failures && failures.length),
    fdicAggregate: !!(aggregate && aggregate.length),
  };
  const isLive = Object.values(_sources).some(Boolean);

  const result = {
    failures,
    aggregate,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('fdic', result);
  else {
    const fallback = readLatestCache('fdic');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
