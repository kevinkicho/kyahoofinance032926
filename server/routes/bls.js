import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BLS_API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

const BLS_SERIES = {
  unemployment:     { id: 'LNS14000000',  label: 'Unemployment Rate',        unit: '%' },
  laborParticipation: { id: 'LNS11300000',  label: 'Labor Force Participation',  unit: '%' },
  employmentPop:    { id: 'LNS12300000',  label: 'Employment-Population Ratio', unit: '%' },
  nonfarmPayrolls:  { id: 'CES0000000001', label: 'Nonfarm Payrolls (thousands)', unit: 'K' },
  avgHourlyEarnings: { id: 'CES0500000008', label: 'Avg Hourly Earnings',        unit: '$' },
  cpi:              { id: 'CUUR0000SA0',   label: 'CPI (All Urban)',            unit: 'index' },
  ppi:              { id: 'WPSFD4111',    label: 'PPI (Final Demand)',          unit: 'index' },
  jobOpenings:      { id: 'LNS17200000',  label: 'Job Openings (thousands)',     unit: 'K' },
  unemployedPersons: { id: 'LNS13000000',  label: 'Unemployed Persons (thousands)', unit: 'K' },
  avgWeeklyHours:   { id: 'CES0500000002', label: 'Avg Weekly Hours',            unit: 'hrs' },
};

async function fetchBLSSeries(seriesIds, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    trackApiCall('BLS');
    const res = await fetch(BLS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid: seriesIds,
        startyear: String(new Date().getFullYear() - 3),
        endyear: String(new Date().getFullYear()),
        registrationkey: apiKey,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[BLS] upstream ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    if (data.status !== 'REQUEST_SUCCEEDED') {
      console.warn(`[BLS] API status: ${data.status}`, data.message);
      return null;
    }
    return data.Results?.series || [];
  } catch (err) {
    clearTimeout(timeout);
    console.error('[BLS] fetch error:', err.message);
    return null;
  }
}

function parseSeries(rawSeries) {
  const result = {};
  for (const [key, def] of Object.entries(BLS_SERIES)) {
    const matched = rawSeries.find(s => s.seriesID === def.id);
    if (!matched?.data?.length) {
      result[key] = { label: def.label, unit: def.unit, seriesId: def.id, latest: null, previous: null, history: [], _source: false };
      continue;
    }
    const sorted = matched.data
      .filter(d => d.value !== '-' && d.value != null)
      .sort((a, b) => {
        const da = parseInt(a.year) * 100 + parseInt(a.period.replace('M', ''));
        const db = parseInt(b.year) * 100 + parseInt(b.period.replace('M', ''));
        return db - da;
      });
    const dates = [];
    const values = [];
    for (const d of sorted) {
      const dateStr = `${d.year}-${d.period.replace('M', '').padStart(2, '0')}`;
      dates.push(dateStr);
      values.push(parseFloat(d.value));
    }
    result[key] = {
      label: def.label,
      unit: def.unit,
      seriesId: def.id,
      latest: sorted[0] ? { period: sorted[0].periodName, year: sorted[0].year, value: parseFloat(sorted[0].value) } : null,
      previous: sorted[1] ? { period: sorted[1].periodName, year: sorted[1].year, value: parseFloat(sorted[1].value) } : null,
      history: { dates, values },
      _source: true,
    };
  }
  return result;
}

router.get('/', async (req, res) => {
  const apiKey = process.env.BLS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'BLS_API_KEY not configured' });
  }

  const cacheKey = 'bls_data';
  const today = todayStr();

  const daily = readDailyCache('bls');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = req.app.locals.cache?.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const seriesIds = Object.values(BLS_SERIES).map(s => s.id);
    const rawSeries = await fetchBLSSeries(seriesIds, apiKey);

    if (!rawSeries) {
      const fallback = readLatestCache('bls');
      if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
      return res.status(502).json({ error: 'BLS API unavailable' });
    }

    const seriesData = parseSeries(rawSeries);
    const _sources = {};
    for (const [key, val] of Object.entries(seriesData)) {
      _sources[`bls_${key}`] = val._source;
    }
    delete _sources.bls__source;

    const result = {
      series: seriesData,
      _sources,
      lastUpdated: today,
    };

    const anyLive = Object.values(_sources).some(v => v === true);
    if (anyLive) writeDailyCache('bls', result);
    req.app.locals.cache?.set(cacheKey, result, 3600);
    res.json({ ...result, fetchedOn: today, isCurrent: anyLive });
  } catch (err) {
    console.error('[BLS] route error:', err);
    const fallback = readLatestCache('bls');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;