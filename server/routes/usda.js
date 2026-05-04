// USDA NASS Quick Stats — agricultural commodity prices.
//
// Source: quickstats.nass.usda.gov/api/api_GET. Free key required (instant
// signup at quickstats.nass.usda.gov/api). When USDA_NASS_API_KEY is unset
// the route returns a graceful "key required" payload instead of 401-ing.
//
// We pull prices-received for the four headline ag commodities — corn,
// soybeans, wheat, and cattle — at national level, monthly cadence,
// last ~36 months. The combination of these is enough to drive a "US Ag
// Commodity Prices" panel without flooding NASS with thousands of rows.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BASE = 'https://quickstats.nass.usda.gov/api/api_GET';

const COMMODITIES = [
  { key: 'corn',     desc: 'CORN',     unit: '$/bu',  color: '#f59e0b' },
  { key: 'soybeans', desc: 'SOYBEANS', unit: '$/bu',  color: '#10b981' },
  { key: 'wheat',    desc: 'WHEAT',    unit: '$/bu',  color: '#fbbf24' },
  { key: 'cattle',   desc: 'CATTLE',   unit: '$/cwt', color: '#ef4444' },
];

async function fetchCommodityPrices(commodityDesc, key, fromYear) {
  // PRICE RECEIVED for the commodity, marketing-year national-level monthly
  // values. NASS labels these `statisticcat_desc=PRICE RECEIVED`.
  trackApiCall('USDA NASS');
  const params = new URLSearchParams({
    key,
    commodity_desc:     commodityDesc,
    statisticcat_desc:  'PRICE RECEIVED',
    agg_level_desc:     'NATIONAL',
    freq_desc:          'MONTHLY',
    year__GE:           String(fromYear),
    format:             'JSON',
  });
  const url = `${BASE}/?${params.toString()}`;
  const data = await fetchJSON(url);
  const rows = Array.isArray(data?.data) ? data.data : [];
  // NASS rows can include CWT and BU pricing for the same commodity (e.g.
  // CORN, GRAIN vs CORN, SILAGE) — restrict to the one whose unit_desc
  // contains the canonical unit.
  const out = rows
    .filter(r => r.Value && r.Value !== '(D)' && r.Value !== '(NA)')
    .map(r => ({
      year:       Number(r.year),
      period:     r.reference_period_desc,
      monthEnd:   r.end_code,
      value:      Number(String(r.Value).replace(/,/g, '')),
      unit:       r.unit_desc,
      shortDesc:  r.short_desc,
    }))
    .filter(r => Number.isFinite(r.value));
  // Pick the cleanest monthly series — usually `short_desc` includes the
  // commodity word + "PRICE RECEIVED, MEASURED IN $ / BU" or similar.
  // Group by short_desc, pick whichever has the most recent observations.
  const groups = {};
  for (const r of out) {
    if (!groups[r.shortDesc]) groups[r.shortDesc] = [];
    groups[r.shortDesc].push(r);
  }
  let best = null;
  for (const desc of Object.keys(groups)) {
    const series = groups[desc];
    const lastYear = Math.max(...series.map(s => s.year));
    if (!best || lastYear > best.lastYear) best = { desc, series, lastYear };
  }
  if (!best) return null;
  // Sort chronologically and pick the last 36 monthly observations.
  const monthCode = m => {
    const map = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
    const k = (m || '').slice(0, 3).toUpperCase();
    return map[k] || 0;
  };
  best.series.sort((a, b) => (a.year - b.year) || (monthCode(a.period) - monthCode(b.period)));
  return best.series.slice(-36);
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('usda');
  if (cached) return res.json(cached);

  const today = todayStr();
  const apiKey = process.env.USDA_NASS_API_KEY;
  if (!apiKey) {
    return res.json({
      commodities: null,
      summary:     null,
      _sources:    { usda: false },
      isLive:      false,
      isCurrent:   false,
      error:       'USDA_NASS_API_KEY not configured (free key at quickstats.nass.usda.gov/api)',
      fetchedOn:   today,
      lastUpdated: today,
    });
  }

  const fromYear = new Date().getFullYear() - 4;
  const out = {};
  let any = false;
  for (const c of COMMODITIES) {
    try {
      out[c.key] = await fetchCommodityPrices(c.desc, apiKey, fromYear);
      if (out[c.key]?.length) any = true;
    } catch (e) {
      console.warn(`[USDA NASS] ${c.key}:`, e.message);
      out[c.key] = null;
    }
  }

  // Latest-price summary across the 4 commodities.
  const summary = any ? COMMODITIES.map(c => {
    const series = out[c.key];
    if (!series?.length) return { key: c.key, latest: null };
    const latest = series[series.length - 1];
    const earlier = series.find(p => p.year === latest.year - 1 && p.period === latest.period);
    const yoyPct = earlier ? ((latest.value - earlier.value) / earlier.value) * 100 : null;
    return {
      key:       c.key,
      desc:      c.desc,
      unit:      c.unit,
      color:     c.color,
      latest:    { year: latest.year, period: latest.period, value: latest.value, unit: latest.unit },
      yoyPct:    yoyPct != null ? Math.round(yoyPct * 10) / 10 : null,
    };
  }) : null;

  const _sources = { usda: any };
  const isLive = any;
  const result = {
    commodities: out,
    summary,
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };

  if (isLive) writeDailyCache('usda', result);
  else {
    const fb = readLatestCache('usda');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
