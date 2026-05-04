// US Treasury — Daily Treasury Statement (DTS).
//
// Source: api.fiscaldata.treasury.gov DTS operating-cash-balance dataset.
// No key required. We surface the headline TGA (Treasury General Account)
// closing balance plus daily net flow (deposits - withdrawals) for the last
// ~120 trading days, which is the macro signal the panel cares about:
// rising TGA usually means Treasury is over-funding (drains liquidity);
// falling TGA means cash is flowing back into private hands.
//
// Reference:
//   https://fiscaldata.treasury.gov/datasets/daily-treasury-statement/operating-cash-balance
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/operating_cash_balance';
const PAGE_SIZE = 600;   // 4 line items per day × ~150 days = ~600 rows

function num(v) {
  if (v == null || v === 'null' || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('treasuryDTS');
  if (cached) return res.json(cached);

  const today = todayStr();
  let series = null;
  let latest = null;

  try {
    trackApiCall('Treasury Fiscal Data');
    const fields = ['record_date', 'account_type', 'open_today_bal'].join(',');
    const url = `${BASE}?sort=-record_date&page%5Bsize%5D=${PAGE_SIZE}&fields=${fields}`;
    const data = await fetchJSON(url);
    const rows = Array.isArray(data?.data) ? data.data : [];
    // Group by record_date and pick the four headline line items.
    const byDate = new Map();
    for (const r of rows) {
      const d = r.record_date;
      const v = num(r.open_today_bal);
      if (!d || v == null) continue;
      if (!byDate.has(d)) byDate.set(d, {});
      const slot = byDate.get(d);
      const t = r.account_type || '';
      // Different reporting periods in the dataset use slightly different
      // labels (TGA pre-2022 vs Federal Reserve Account post-2022). Match
      // on substring rather than exact equality.
      if (/Closing Balance/i.test(t)) slot.close = v;
      else if (/Opening Balance/i.test(t)) slot.open = v;
      else if (/Total .*Deposits/i.test(t)) slot.deposits = v;
      else if (/Total .*Withdrawals/i.test(t)) slot.withdrawals = v;
    }
    const dates = [...byDate.keys()].sort(); // oldest → newest for charting
    series = dates.map(d => {
      const s = byDate.get(d);
      // open_today_bal is in millions; render in $B for readability.
      const closeB = s.close != null ? s.close / 1000 : null;
      const openB  = s.open  != null ? s.open  / 1000 : null;
      const depB   = s.deposits != null ? s.deposits / 1000 : null;
      const wdB    = s.withdrawals != null ? s.withdrawals / 1000 : null;
      const netB   = (depB != null && wdB != null) ? depB - wdB : null;
      return { date: d, closeB, openB, depositsB: depB, withdrawalsB: wdB, netB };
    });
    if (series.length) latest = series[series.length - 1];
  } catch (e) {
    console.warn('[TreasuryDTS]', e.message || e);
  }

  const _sources = { treasuryDTS: !!(series && series.length) };
  const isLive = _sources.treasuryDTS;

  const result = {
    series,
    latest,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('treasuryDTS', result);
  else {
    const fallback = readLatestCache('treasuryDTS');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
