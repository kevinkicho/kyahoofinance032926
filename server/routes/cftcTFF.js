import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';

const router = Router();

const CFTC_TFF_URL = 'https://publicreporting.cftc.gov/resource/6dca-aqww.json';

const FINANCIAL_FUTURES = {
  'VIX':     { code: '001602', name: 'VIX Futures' },
  'EUROD':   { code: '001604', name: 'Eurodollar' },
  '10Y':     { code: '001606', name: '10Y Treasury Note' },
  '5Y':      { code: '001607', name: '5Y Treasury Note' },
  '2Y':      { code: '001608', name: '2Y Treasury Note' },
  'SP500':   { code: '001609', name: 'S&P 500 E-mini' },
  'NASDAQ':  { code: '001610', name: 'Nasdaq 100 E-mini' },
  'DOW':     { code: '001611', name: 'Dow Jones' },
};

router.get('/', async (_req, res) => {
  const cached = readDailyCache('cftcTFF');
  if (cached) return res.json(cached);

  const today = todayStr();
  try {
    const results = {};
    for (const [key, def] of Object.entries(FINANCIAL_FUTURES)) {
      try {
        trackApiCall('CFTC');
        const url = `${CFTC_TFF_URL}?cftc_contract_market_code=${def.code}&$limit=52&$order=report_date_as_yyyy_mm_dd%20DESC`;
        const data = await fetchJSON(url);
        if (!Array.isArray(data) || data.length === 0) continue;
        const series = data.map(r => ({
          date: r.report_date_as_yyyy_mm_dd?.slice(0, 10),
          openInterest: parseInt(r.open_interest_all) || 0,
          nonCommLong: parseInt(r.noncomm_positions_long_all) || 0,
          nonCommShort: parseInt(r.noncomm_positions_short_all) || 0,
          commLong: parseInt(r.comm_positions_long_all) || 0,
          commShort: parseInt(r.comm_positions_short_all) || 0,
          nonCommSpread: parseInt(r.noncomm_positions_spread) || 0,
        })).filter(r => r.date);
        results[key] = { name: def.name, series };
      } catch (e) {
        console.warn(`[CFTC TFF] ${key}: ${e.message}`);
      }
    }

    const _sources = {};
    for (const k of Object.keys(FINANCIAL_FUTURES)) _sources[`cftcTFF_${k}`] = !!results[k];
    const isLive = Object.values(_sources).some(Boolean);
    const result = { contracts: results, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
    if (isLive) writeDailyCache('cftcTFF', result);
    else {
      const fb = readLatestCache('cftcTFF');
      if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    }
    res.json(result);
  } catch (e) {
    console.warn('[CFTC TFF]', e.message);
    return sendCachedOrDegradedSync(res, 'cftcTFF', { error: e });
  }
});

export default router;
