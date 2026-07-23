// ECB Statistical Data Warehouse (SDW) — euro area policy rates, €STR,
// EURIBOR, M3, HICP. Docs: https://data.ecb.europa.eu/help/api/overview
// No key required. Responses are SDMX-JSON; flattened via server/lib/sdmx.js.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { parseSdmx } from '../lib/sdmx.js';

const router = Router();

const BASE = 'https://data-api.ecb.europa.eu/service/data';

async function fetchEcbSeries(flow, key, opts = {}) {
  trackApiCall('ECB SDW');
  const startPeriod = opts.startPeriod || `${new Date().getFullYear() - 5}`;
  const lastN = opts.lastNObservations != null ? `&lastNObservations=${opts.lastNObservations}` : '';
  const url = `${BASE}/${flow}/${key}?format=jsondata&startPeriod=${startPeriod}${lastN}`;
  const data = await fetchJSON(url);
  return parseSdmx(data);
}

function lastObs(seriesArr, matchFn = null) {
  const list = Array.isArray(seriesArr) ? seriesArr : [];
  const s = matchFn ? list.find(matchFn) : list[0];
  if (!s?.observations?.length) return null;
  // Prefer last observation with a finite value
  for (let i = s.observations.length - 1; i >= 0; i--) {
    const o = s.observations[i];
    if (o?.value != null && Number.isFinite(Number(o.value))) {
      return { period: o.period, value: Number(o.value) };
    }
  }
  return null;
}

function round4(v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  return Math.round(Number(v) * 10000) / 10000;
}

router.get('/', async (req, res) => {
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
  if (!forceRefresh) {
    const cached = readDailyCache('ecb');
    if (cached) return res.json(cached);
  }

  const today = todayStr();
  let policyRates = null;
  let moneyMarket = null;
  let m3Growth = null;
  let hicpDetail = null;

  // ── Key ECB interest rates (official policy corridor) ──────────────
  // FM/B.U2.EUR.4F.KR.* — levels + last change (bp move) for DFR/MRR/MLFR
  try {
    const allKr = await fetchEcbSeries('FM', 'B.U2.EUR.4F.KR..', {
      startPeriod: `${new Date().getFullYear() - 8}`,
    });
    const byId = (providerId, dataType) =>
      lastObs(allKr, (s) => s.dims?.PROVIDER_FM_ID === providerId && s.dims?.DATA_TYPE_FM === dataType);

    // History from dedicated level series (cleaner time series for charts)
    const mrrHist = await fetchEcbSeries('FM', 'B.U2.EUR.4F.KR.MRR_FR.LEV');
    const dfrHist = await fetchEcbSeries('FM', 'B.U2.EUR.4F.KR.DFR.LEV');
    const mlfrHist = await fetchEcbSeries('FM', 'B.U2.EUR.4F.KR.MLFR.LEV');

    const mainRefinancing = byId('MRR_FR', 'LEV') || lastObs(mrrHist);
    const depositFacility = byId('DFR', 'LEV') || lastObs(dfrHist);
    const marginalLending = byId('MLFR', 'LEV') || lastObs(mlfrHist);
    // MRR change series is coded PROVIDER_FM_ID=MRR (not MRR_FR)
    const mrrChange = byId('MRR', 'CHG');
    const dfrChange = byId('DFR', 'CHG');
    const mlfrChange = byId('MLFR', 'CHG');

    const mrrVal = mainRefinancing?.value;
    const dfrVal = depositFacility?.value;
    const mlfrVal = marginalLending?.value;
    const corridorWidth =
      mrrVal != null && dfrVal != null && mlfrVal != null
        ? round4(mlfrVal - dfrVal)
        : null;
    const standingFacilitySpread =
      mrrVal != null && dfrVal != null ? round4(mrrVal - dfrVal) : null;

    policyRates = {
      mainRefinancing,
      depositFacility,
      marginalLending,
      mainRefinancingChange: mrrChange,
      depositFacilityChange: dfrChange,
      marginalLendingChange: mlfrChange,
      corridorWidth: corridorWidth != null
        ? { value: corridorWidth, period: marginalLending?.period || depositFacility?.period }
        : null,
      standingFacilitySpread: standingFacilitySpread != null
        ? { value: standingFacilitySpread, period: mainRefinancing?.period || depositFacility?.period }
        : null,
      // min bid rate series is historical only (null since 2008 fixed-rate tenders)
      mainRefinancingMinBid: byId('MRR_MBR', 'LEV'),
      history: {
        mrr: mrrHist[0]?.observations || [],
        dfr: dfrHist[0]?.observations || [],
        mlfr: mlfrHist[0]?.observations || [],
      },
    };
  } catch (e) {
    console.warn('[ECB] policy rates:', e.message);
  }

  // ── €STR + EURIBOR money-market rates (levels + history) ───────────
  try {
    // EST dimension codes: WT (rate), R25, R75, TT (€m turnover), NT, …
    // Full multi-year history for charts; latest snapshot for KPI cards.
    const estrStart = `${new Date().getFullYear() - 3}`;
    const estr = await fetchEcbSeries('EST', 'B.EU000A2X2A25.', {
      startPeriod: estrStart,
    });
    const pickEstSeries = (code) =>
      estr.find((x) => {
        const vals = Object.values(x.dims || {});
        return vals.includes(code) || (Array.isArray(x.key) && x.key.includes(code));
      }) || null;
    const pickEst = (code) => {
      const s = pickEstSeries(code);
      return lastObs(s ? [s] : []);
    };
    const histOf = (series, maxPts = 260) => {
      const obs = (series?.observations || [])
        .filter((o) => o?.value != null && Number.isFinite(Number(o.value)))
        .map((o) => ({ period: o.period, value: Number(o.value) }));
      return obs.length > maxPts ? obs.slice(-maxPts) : obs;
    };

    // EURIBOR monthly averages — full history for table/chart
    const euri = await fetchEcbSeries('FM', 'M.U2.EUR.RT.MM..HSTA', {
      startPeriod: `${new Date().getFullYear() - 8}`,
    });
    const euriSeries = (id) => euri.find((s) => s.dims?.PROVIDER_FM_ID === id) || null;
    const pickEuri = (id) => lastObs(euriSeries(id) ? [euriSeries(id)] : []);

    // Monthly €STR average (UONSTR)
    const uonstr = await fetchEcbSeries('FM', 'M.U2.EUR.4F.MM.UONSTR.HSTA', {
      startPeriod: `${new Date().getFullYear() - 8}`,
    });

    const estrWtSeries = pickEstSeries('WT');
    moneyMarket = {
      estr: pickEst('WT'),
      estrP25: pickEst('R25'),
      estrP75: pickEst('R75'),
      estrVolume: pickEst('TT'),
      estrTransactions: pickEst('NT'),
      estrMonthlyAvg: lastObs(uonstr),
      euribor1m: pickEuri('EURIBOR1MD_'),
      euribor3m: pickEuri('EURIBOR3MD_'),
      euribor6m: pickEuri('EURIBOR6MD_'),
      euribor1y: pickEuri('EURIBOR1YD_'),
      // Time series (chronological) for charts / history table
      history: {
        estr: histOf(estrWtSeries, 180), // ~business-day density
        estrMonthly: histOf(uonstr[0], 96),
        euribor1m: histOf(euriSeries('EURIBOR1MD_'), 96),
        euribor3m: histOf(euriSeries('EURIBOR3MD_'), 96),
        euribor6m: histOf(euriSeries('EURIBOR6MD_'), 96),
        euribor1y: histOf(euriSeries('EURIBOR1YD_'), 96),
      },
    };
  } catch (e) {
    console.warn('[ECB] money market:', e.message);
  }

  try {
    // BSI — M3 monetary aggregate, annual rate of change (YoY %), monthly
    const m3 = await fetchEcbSeries('BSI', 'M.U2.N.V.M30.X.I.U2.2300.Z01.A', {
      startPeriod: `${new Date().getFullYear() - 10}`,
    });
    m3Growth = m3[0]?.observations?.slice(-120) || [];
  } catch (e) {
    console.warn('[ECB] M3:', e.message);
  }

  try {
    // ICP — HICP overall, annual rate, monthly
    const hicp = await fetchEcbSeries('ICP', 'M.U2.N.000000.4.ANR', {
      startPeriod: `${new Date().getFullYear() - 10}`,
    });
    hicpDetail = hicp[0]?.observations?.slice(-120) || [];
  } catch (e) {
    console.warn('[ECB] HICP:', e.message);
  }

  const _sources = {
    ecbPolicyRates: !!policyRates?.mainRefinancing || !!policyRates?.depositFacility,
    ecbMoneyMarket: !!(moneyMarket?.estr || moneyMarket?.euribor3m),
    ecbM3: !!(m3Growth && m3Growth.length),
    ecbHicp: !!(hicpDetail && hicpDetail.length),
  };
  const isLive = Object.values(_sources).some(Boolean);

  const result = {
    policyRates,
    moneyMarket,
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
