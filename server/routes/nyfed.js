// NY Fed Markets data — primary dealer positions, SOFR detail, reverse repo,
// Survey of Consumer Expectations. All endpoints are public, no key needed.
//
// Docs: https://markets.newyorkfed.org/static/docs/markets-api.html
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BASE = 'https://markets.newyorkfed.org/api';

// SOFR rates: latest, average, percentiles. We pull the last 30 days.
async function fetchSofr() {
  trackApiCall('NY Fed');
  const data = await fetchJSON(`${BASE}/rates/secured/sofr/last/30.json`);
  const rows = data?.refRates || [];
  return {
    series: rows.map(r => ({ date: r.effectiveDate, rate: r.percentRate, p1: r.percentPercentile1, p99: r.percentPercentile99, vol: r.volumeInBillions })),
    latest: rows[0] ? { date: rows[0].effectiveDate, rate: rows[0].percentRate } : null,
  };
}

// Reverse Repo (RRP) — ON RRP facility usage. The /rates/all/ endpoint
// only carries SOFR/EFFR-style daily rates; ON RRP operations live on the
// repo-operations endpoint instead.
async function fetchRRP() {
  trackApiCall('NY Fed');
  const data = await fetchJSON(`${BASE}/rp/reverserepo/all/results/lastTwoWeeks.json`);
  const ops = data?.repo?.operations || [];
  // Filter to ON RRP operations (Overnight, Reverse Repo).
  const onrrp = ops.filter(o => o.operationType === 'Reverse Repo' && o.term === 'Overnight');
  if (!onrrp.length) return null;
  return onrrp.slice(0, 14).map(o => ({
    date: o.operationDate,
    submittedB: o.totalAmtSubmitted ? o.totalAmtSubmitted / 1e9 : null,
    acceptedB: o.totalAmtAccepted ? o.totalAmtAccepted / 1e9 : null,
    counterparties: o.acceptedCpty,
  }));
}

// Primary dealer positions — net positions in MBS, ABS, corporate. The PD
// API uses keys like PDPOSMBS-TOT (mortgage-backed total). The path is
// /pd/get/<keyid>.json (the /timeseries suffix is rejected with 400).
const PD_KEYS = {
  mbs: 'PDPOSMBS-TOT',  // Mortgage-backed
  abs: 'PDPOSABS-TOT',  // Asset-backed
  corp: 'PDPOSCS-TOT',  // Corporate
};
async function fetchPrimaryDealerPositions() {
  trackApiCall('NY Fed');
  const out = {};
  for (const [label, keyid] of Object.entries(PD_KEYS)) {
    try {
      const data = await fetchJSON(`${BASE}/pd/get/${keyid}.json`);
      const rows = data?.pd?.timeseries || [];
      out[label] = rows.slice(-26).map(r => ({ date: r.asofdate, value: r.value ? Number(r.value) : null }));
    } catch (e) { console.warn(`[NY Fed] PD ${keyid}:`, e.message); }
  }
  return Object.keys(out).length ? out : null;
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('nyfed');
  if (cached) return res.json(cached);

  const today = todayStr();
  let sofr = null, rrp = null, dealers = null;
  try { sofr = await fetchSofr(); } catch (e) { console.warn('[NY Fed] SOFR:', e.message); }
  try { rrp = await fetchRRP(); } catch (e) { console.warn('[NY Fed] RRP:', e.message); }
  try { dealers = await fetchPrimaryDealerPositions(); } catch (e) { console.warn('[NY Fed] PD:', e.message); }

  const _sources = {
    nyfedSofr: !!sofr,
    nyfedRRP: !!rrp,
    nyfedPrimaryDealers: !!(dealers && dealers.length),
  };
  const isLive = Object.values(_sources).some(Boolean);

  const result = {
    sofr,
    rrp,
    primaryDealers: dealers,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('nyfed', result);
  else {
    const fallback = readLatestCache('nyfed');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
