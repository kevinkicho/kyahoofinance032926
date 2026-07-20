import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory } from '../lib/fred.js';

const router = Router();

const BLS_API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

// Each entry maps the panel's logical key to (BLS series id) plus a FRED
// equivalent — FRED mirrors most BLS series, so we can fall back when the
// user has FRED_API_KEY but not BLS_API_KEY.
const BLS_SERIES = {
  unemployment:      { id: 'LNS14000000',   fred: 'UNRATE',    label: 'Unemployment Rate',          unit: '%' },
  laborParticipation:{ id: 'LNS11300000',   fred: 'CIVPART',   label: 'Labor Force Participation',  unit: '%' },
  employmentPop:     { id: 'LNS12300000',   fred: 'EMRATIO',   label: 'Employment-Population Ratio', unit: '%' },
  nonfarmPayrolls:   { id: 'CES0000000001', fred: 'PAYEMS',    label: 'Nonfarm Payrolls (thousands)', unit: 'K' },
  cpi:               { id: 'CUUR0000SA0',   fred: 'CPIAUCSL',  label: 'CPI (All Urban)',            unit: 'index' },
  ppi:               { id: 'WPSFD4111',     fred: 'PPIFIS',    label: 'PPI (Final Demand)',          unit: 'index' },
  jobOpenings:       { id: 'LNS17200000',   fred: 'JTSJOL',    label: 'Job Openings (thousands)',    unit: 'K' },
  unemployedPersons: { id: 'LNS13000000',   fred: 'UNEMPLOY',  label: 'Unemployed Persons (thousands)', unit: 'K' },
  // JOLTS detail
  joltsQuits:        { id: 'JTS000000000000000QUR', fred: 'JTSQUR', label: 'Quits Rate',              unit: '%' },
  joltsHires:        { id: 'JTS000000000000000HIL', fred: 'JTSHIL', label: 'Hires (thousands)',       unit: 'K' },
  joltsLayoffs:      { id: 'JTS000000000000000LDL', fred: 'JTSLDL', label: 'Layoffs & Discharges',    unit: 'K' },
  // Productivity
  outputPerHour:     { id: 'PRS85006092',   fred: 'OPHNFB',    label: 'Output per Hour (Nonfarm)',   unit: '%' },
  unitLaborCosts:    { id: 'PRS85006112',   fred: 'ULCNFB',    label: 'Unit Labor Costs (Nonfarm)',  unit: '%' },
  // CPI components
  cpiFood:           { id: 'CUUR0000SAF1',  fred: 'CPIUFDNS',  label: 'CPI · Food',                 unit: 'index' },
  cpiEnergy:         { id: 'CUUR0000SAE1',  fred: 'CPIENGSL',  label: 'CPI · Energy',               unit: 'index' },
  cpiShelter:        { id: 'CUUR0000SAH1',  fred: 'CPIHOSNS',  label: 'CPI · Shelter',              unit: 'index' },
  // PPI by industry
  ppiIntermediate:   { id: 'WPUFD4121',     fred: 'PPIIDC',    label: 'PPI · Intermediate Demand',  unit: 'index' },
  ppiServices:       { id: 'WPUFD4131',     fred: 'PPITSS',    label: 'PPI · Services',             unit: 'index' },
  // ECI
  eciWages:          { id: 'CIS2020000000000I', fred: 'ECIWAG', label: 'ECI · Wages & Salaries',    unit: '%' },
  eciBenefits:       { id: 'CIS2030000000000I', fred: 'ECIBEN', label: 'ECI · Benefits',            unit: '%' },
  eciTotal:          { id: 'CIS2010000000000I', fred: 'ECICOM', label: 'ECI · Total Compensation',  unit: '%' },
  // Unemployment duration
  unempLess5Weeks:   { id: 'LNS13008396',   fred: 'UEMPLT5',   label: 'Unemployed < 5 Weeks',        unit: 'K' },
  unemp5To14Weeks:   { id: 'LNS13008397',   fred: 'UEMP5TO14', label: 'Unemployed 5-14 Weeks',       unit: 'K' },
  unemp15To26Weeks:  { id: 'LNS13008398',   fred: 'UEMP15T26', label: 'Unemployed 15-26 Weeks',      unit: 'K' },
  unemp27PlusWeeks:  { id: 'LNS13008585',   fred: 'UEMP27OV',  label: 'Unemployed 27+ Weeks',        unit: 'K' },
};

async function fetchFromFred(FRED_API_KEY) {
  // Fall back to FRED for each series. We model the same shape parseSeries
  // produces so the route's downstream code doesn't care which source won.
  const result = {};
  const entries = Object.entries(BLS_SERIES);
  const fetched = await Promise.all(
    entries.map(async ([key, def]) => {
      try {
        trackApiCall('FRED');
        const hist = await fetchFredHistory(def.fred, FRED_API_KEY, 36);
        if (!Array.isArray(hist) || hist.length === 0) return [key, null];
        const dates = hist.map(p => p.date.slice(0, 7));
        const values = hist.map(p => p.value);
        const latest = hist[hist.length - 1];
        const prev = hist[hist.length - 2];
        return [key, {
          label: def.label,
          unit: def.unit,
          seriesId: def.id,
          latest: latest ? { period: null, year: latest.date.slice(0, 4), value: latest.value } : null,
          previous: prev ? { period: null, year: prev.date.slice(0, 4), value: prev.value } : null,
          history: { dates, values },
          _source: true,
        }];
      } catch (e) { _errors[`bls_${key}`] = e.message; return [key, { _error: e.message }]; }
    })
  );
  for (const [key, def] of entries) {
    const v = fetched.find(([k]) => k === key)?.[1];
    result[key] = v ?? { label: def.label, unit: def.unit, seriesId: def.id, latest: null, previous: null, history: { dates: [], values: [] }, _source: false };
  }
  return result;
}

export async function fetchBLSSeries(seriesIds, apiKey) {
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
      return { _error: `BLS upstream returned ${res.status}` };
    }
    const data = await res.json();
    if (data.status !== 'REQUEST_SUCCEEDED') {
      console.warn(`[BLS] API status: ${data.status}`, data.message);
      return { _error: `BLS API status: ${data.status}` };
    }
    return data.Results?.series || [];
  } catch (err) {
    clearTimeout(timeout);
    console.error('[BLS] fetch error:', err.message);
    return { _error: `BLS fetch error: ${err.message}` };
  }
}

export function parseSeries(rawSeries) {
  const result = {};
  for (const [key, def] of Object.entries(BLS_SERIES)) {
    const matched = rawSeries.find(s => s.seriesID === def.id);
    if (!matched?.data?.length) {
      result[key] = { label: def.label, unit: def.unit, seriesId: def.id, latest: null, previous: null, history: { dates: [], values: [] }, _source: false };
      continue;
    }
    const sorted = matched.data
      .filter(d => d.value !== '-' && d.value != null)
      .sort((a, b) => {
        const aPeriod = a.period ?? '';
        const bPeriod = b.period ?? '';
        const da = parseInt(a.year ?? 0) * 100 + parseInt(aPeriod.replace('M', ''));
        const db = parseInt(b.year ?? 0) * 100 + parseInt(bPeriod.replace('M', ''));
        return db - da;
      });
    const dates = [];
    const values = [];
    for (const d of sorted) {
      const dateStr = `${d.year ?? ''}-${(d.period ?? '').replace('M', '').padStart(2, '0')}`;
      dates.push(dateStr);
      values.push(parseFloat(d.value));
    }
    const latestVal = sorted[0];
    const prevVal = sorted[1];
    result[key] = {
      label: def.label,
      unit: def.unit,
      seriesId: def.id,
      latest: latestVal ? { period: latestVal.periodName ?? null, year: latestVal.year ?? null, value: parseFloat(latestVal.value) } : null,
      previous: prevVal ? { period: prevVal.periodName ?? null, year: prevVal.year ?? null, value: parseFloat(prevVal.value) } : null,
      history: { dates: [...dates].reverse(), values: [...values].reverse() },
      _source: true,
    };
  }
  return result;
}

router.get('/', async (req, res) => {
  const apiKey = (process.env.BLS_API_KEY || '').trim();
  const FRED_API_KEY = (process.env.FRED_API_KEY || '').trim();
  if (!apiKey) {
    // Without a BLS key, try FRED — every series in BLS_SERIES has a
    // FRED mirror. Only fall through to the empty payload if both keys
    // are missing.
    if (FRED_API_KEY) {
      const seriesData = await fetchFromFred(FRED_API_KEY);
      const _sources = {};
      for (const [key, val] of Object.entries(seriesData)) _sources[`bls_${key}`] = val._source;
      const result = { series: seriesData, _sources, lastUpdated: todayStr(), source: 'FRED (BLS mirror)' };
      writeDailyCache('bls', result);
      return res.json({ ...result, fetchedOn: todayStr(), isCurrent: Object.values(_sources).some(v => v === true) });
    }
    const seriesData = parseSeries([]);
    const _sources = {};
    for (const [key, val] of Object.entries(seriesData)) {
      _sources[`bls_${key}`] = val._source;
    }
    delete _sources.bls__source;
    return res.json({
      series: seriesData,
      _sources,
      lastUpdated: todayStr(),
      fetchedOn: todayStr(),
      isCurrent: false
    });
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

    if (!rawSeries || rawSeries._error) {
      const fallback = readLatestCache('bls');
      if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false, _error: rawSeries?._error || 'BLS API unavailable' });
      return res.status(502).json({ error: rawSeries?._error || 'BLS API unavailable' });
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
