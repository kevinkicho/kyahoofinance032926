// ECB Statistical Data Warehouse (SDW) — euro area policy rates, M3, HICP.
// Docs: https://data.ecb.europa.eu/help/api/overview
// No key required. Responses are SDMX-JSON; we use server/lib/sdmx.js to
// flatten them.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { parseSdmx, latestPerSeries } from '../lib/sdmx.js';

const router = Router();

const BASE = 'https://data-api.ecb.europa.eu/service/data';

async function fetchEcbSeries(flow, key, opts = {}) {
  trackApiCall('ECB SDW');
  const startPeriod = opts.startPeriod || `${new Date().getFullYear() - 5}`;
  const url = `${BASE}/${flow}/${key}?format=jsondata&startPeriod=${startPeriod}`;
  const data = await fetchJSON(url);
  return parseSdmx(data);
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('ecb');
  if (cached) return res.json(cached);

  const today = todayStr();
  let policyRates = null, m3Growth = null, hicpDetail = null;

  try {
    // FM/B.U2.EUR.4F.KR.MRR_FR.LEV  — Main refinancing rate
    // FM/B.U2.EUR.4F.KR.DFR.LEV     — Deposit facility rate
    // FM/B.U2.EUR.4F.KR.MLFR.LEV    — Marginal lending facility
    const mrr = await fetchEcbSeries('FM', 'B.U2.EUR.4F.KR.MRR_FR.LEV');
    const dfr = await fetchEcbSeries('FM', 'B.U2.EUR.4F.KR.DFR.LEV');
    const mlfr = await fetchEcbSeries('FM', 'B.U2.EUR.4F.KR.MLFR.LEV');
    policyRates = {
      mainRefinancing: mrr[0]?.observations?.slice(-1)[0],
      depositFacility: dfr[0]?.observations?.slice(-1)[0],
      marginalLending: mlfr[0]?.observations?.slice(-1)[0],
      history: { mrr: mrr[0]?.observations || [], dfr: dfr[0]?.observations || [], mlfr: mlfr[0]?.observations || [] },
    };
  } catch (e) { console.warn('[ECB] policy rates:', e.message); }

  try {
    // BSI/M.U2.N.V.M30.X.I.U2.2300.Z01.A — M3 monetary aggregate, annual
    // rate of change (YoY %), monthly. Series-key trick: the trailing
    // `.A` is the "annual growth" measure code; the original `.A` after
    // `.1` (frequency-of-stock) returned no observations.
    const m3 = await fetchEcbSeries('BSI', 'M.U2.N.V.M30.X.I.U2.2300.Z01.A');
    m3Growth = m3[0]?.observations?.slice(-24) || [];
  } catch (e) { console.warn('[ECB] M3:', e.message); }

  try {
    // ICP/M.U2.N.000000.4.ANR — HICP overall, annual rate, monthly
    const hicp = await fetchEcbSeries('ICP', 'M.U2.N.000000.4.ANR');
    hicpDetail = hicp[0]?.observations?.slice(-24) || [];
  } catch (e) { console.warn('[ECB] HICP:', e.message); }

  const _sources = {
    ecbPolicyRates: !!policyRates,
    ecbM3: !!(m3Growth && m3Growth.length),
    ecbHicp: !!(hicpDetail && hicpDetail.length),
  };
  const isLive = Object.values(_sources).some(Boolean);

  const result = {
    policyRates,
    m3Growth,
    hicpDetail,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('ecb', result);
  else {
    const fallback = readLatestCache('ecb');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
