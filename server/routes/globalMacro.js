import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const MACRO_COUNTRIES = [
  { code: 'US', wbCode: 'US', weoCode: 'USA', name: 'United States',  flag: '🇺🇸', region: 'G7'       },
  { code: 'EA', wbCode: 'XC', weoCode: 'EA19', name: 'Euro Area',      flag: '🇪🇺', region: 'Advanced' },
  { code: 'GB', wbCode: 'GB', weoCode: 'GBR', name: 'United Kingdom', flag: '🇬🇧', region: 'G7'       },
  { code: 'JP', wbCode: 'JP', weoCode: 'JPN', name: 'Japan',          flag: '🇯🇵', region: 'G7'       },
  { code: 'CA', wbCode: 'CA', weoCode: 'CAN', name: 'Canada',         flag: '🇨🇦', region: 'G7'       },
  { code: 'CN', wbCode: 'CN', weoCode: 'CHN', name: 'China',          flag: '🇨🇳', region: 'EM'       },
  { code: 'IN', wbCode: 'IN', weoCode: 'IND', name: 'India',           flag: '🇮🇳', region: 'EM'       },
  { code: 'BR', wbCode: 'BR', weoCode: 'BRA', name: 'Brazil',         flag: '🇧🇷', region: 'EM'       },
  { code: 'KR', wbCode: 'KR', weoCode: 'KOR', name: 'South Korea',   flag: '🇰🇷', region: 'EM'       },
  { code: 'AU', wbCode: 'AU', weoCode: 'AUS', name: 'Australia',      flag: '🇦🇺', region: 'Advanced' },
  { code: 'MX', wbCode: 'MX', weoCode: 'MEX', name: 'Mexico',         flag: '🇲🇽', region: 'EM'       },
  { code: 'SE', wbCode: 'SE', weoCode: 'SWE', name: 'Sweden',         flag: '🇸🇪', region: 'Advanced' },
];
const MACRO_WB_CODES = MACRO_COUNTRIES.map(c => c.wbCode).join(';');

const MACRO_FRED_RATES = {
  US: { id: 'FEDFUNDS',        name: 'United States',  flag: '🇺🇸', bank: 'Fed'      },
  EA: { id: 'ECBDFR',          name: 'Euro Area',      flag: '🇪🇺', bank: 'ECB'      },
  GB: { id: 'IRSTCB01GBM156N', name: 'United Kingdom', flag: '🇬🇧', bank: 'BoE'      },
  JP: { id: 'IRSTCB01JPM156N', name: 'Japan',          flag: '🇯🇵', bank: 'BoJ'      },
  CA: { id: 'IRSTCB01CAM156N', name: 'Canada',         flag: '🇨🇦', bank: 'BoC'      },
  AU: { id: 'IRSTCB01AUM156N', name: 'Australia',      flag: '🇦🇺', bank: 'RBA'      },
  SE: { id: 'IRSTCB01SEM156N', name: 'Sweden',         flag: '🇸🇪', bank: 'Riksbank' },
  CN: { id: 'INTDSRCNM193N',  name: 'China',          flag: '🇨🇳', bank: 'PBoC'    },
  IN: { id: 'IRSTCI01INM156N', name: 'India',          flag: '🇮🇳', bank: 'RBI'     },
  BR: { id: 'INTDSRBRM193N',  name: 'Brazil',         flag: '🇧🇷', bank: 'BCB'     },
  KR: { id: 'IRSTCI01KRM156N', name: 'South Korea',   flag: '🇰🇷', bank: 'BoK'     },
  MX: { id: 'IRSTCI01MXM156N', name: 'Mexico',        flag: '🇲🇽', bank: 'Banxico'  },
};

const BIS_BANK_NAMES = {
  US: 'Fed', XM: 'ECB', GB: 'BoE', JP: 'BoJ', CA: 'BoC',
  CN: 'PBoC', IN: 'RBI', BR: 'BCB', KR: 'BoK', AU: 'RBA', MX: 'Banxico', SE: 'Riksbank',
};

const MACRO_TO_BIS = { US: 'US', EA: 'XM', GB: 'GB', JP: 'JP', CA: 'CA', CN: 'CN', IN: 'IN', BR: 'BR', KR: 'KR', AU: 'AU', MX: 'MX', SE: 'SE' };

// OECD CLI country codes mapping
const OECD_CLI_CODES = {
  US: 'USA', EA: 'EA19', GB: 'GBR', JP: 'JPN', CA: 'CAN',
  CN: 'CHN', IN: 'IND', BR: 'BRA', KR: 'KOR', AU: 'AUS', MX: 'MEX', SE: 'SWE',
};

// BLS CPI series for breakdown analysis
const BLS_CPI_SERIES = {
  all:      { id: 'CUSR0000SA0',    name: 'All Items',       weight: 1.0 },
  core:     { id: 'CUSR0000SA0L1E1', name: 'Core (ex Food/Energy)', weight: 0.784 },
  food:     { id: 'CUSR0000SAF1',    name: 'Food',            weight: 0.138 },
  energy:   { id: 'CUSR0000SA0E1',   name: 'Energy',          weight: 0.069 },
  shelter:  { id: 'CUSR0000SAS2',    name: 'Shelter',         weight: 0.362 },
  medical:  { id: 'CUSR0000SAM2',    name: 'Medical Care',    weight: 0.085 },
  usedCars: { id: 'CUSR0000SETA02',  name: 'Used Cars/Trucks', weight: 0.024 },
};

async function fetchBlsCpiBreakdown(BLS_API_KEY) {
  if (!BLS_API_KEY) return null;

  const endYear = new Date().getFullYear();
  const startYear = endYear - 2; // Last 3 years

  const seriesIds = Object.values(BLS_CPI_SERIES).map(s => s.id);
  const url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seriesid: seriesIds,
        startyear: startYear,
        endyear: endYear,
        registrationkey: BLS_API_KEY,
      }),
    });

    const data = await response.json();
    if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series) return null;

    const result = { components: [], latest: {}, history: {} };

    // Process each series
    for (const series of data.Results.series) {
      const seriesId = series.seriesID;
      const key = Object.keys(BLS_CPI_SERIES).find(k => BLS_CPI_SERIES[k].id === seriesId);
      if (!key) continue;

      const meta = BLS_CPI_SERIES[key];
      const observations = (series.data || []).filter(d => d.value !== '-' && d.periodName);

      if (observations.length === 0) continue;

      // Latest value and YoY change
      const latest = observations[0];
      const yearAgo = observations.find(d =>
        d.period === latest.period &&
        d.year === String(parseInt(latest.year) - 1)
      );

      const latestValue = parseFloat(latest.value);
      const yoyValue = yearAgo ? ((latestValue - parseFloat(yearAgo.value)) / parseFloat(yearAgo.value) * 100) : null;

      result.components.push({
        key,
        name: meta.name,
        value: Math.round(latestValue * 10) / 10,
        yoy: yoyValue != null ? Math.round(yoyValue * 10) / 10 : null,
        weight: meta.weight,
        period: `${latest.periodName?.slice(0, 3)} ${latest.year}`,
      });

      result.latest[key] = { value: latestValue, yoy: yoyValue };
      result.history[key] = observations.slice(0, 24).reverse().map(d => ({
        date: `${d.year}-${d.period.slice(1).padStart(2, '0')}`,
        value: parseFloat(d.value),
      }));
    }

    // Sort components by weight
    result.components.sort((a, b) => b.weight - a.weight);
    result.asOf = result.components[0]?.period || null;

    return result;
  } catch (e) {
    console.warn('BLS CPI fetch failed:', e.message);
    return null;
  }
}

async function fetchOECDCli() {
  // OECD SDMX API for CLI (Leading Indicators)
  // MEI_CLI_LOLITO_AGG = CLI Amplitude adjusted (LOLITO)
  const codes = Object.values(OECD_CLI_CODES).join('+');
  const url = `https://stats.oecd.org/sdmx-json/data/MEI_CLI/LOLITO_AGG.M.${codes}?contentType=csv`;
  try {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split('\n');
    if (lines.length < 2) return null;

    // Parse CSV - find header and data
    const headerIdx = lines.findIndex(l => l.includes('LOCATION') || l.includes('TIME'));
    if (headerIdx < 0) return null;

    const result = {};
    // Get the latest value for each country
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',');
      if (cols.length < 3) continue;

      // OECD CSV format: LOCATION, SUBJECT, MEASURE, FREQUENCY, TIME, Value, ...
      const location = cols[0]?.replace(/"/g, '');
      const time = cols[4]?.replace(/"/g, '');
      const value = parseFloat(cols[5]?.replace(/"/g, ''));

      if (!location || isNaN(value)) continue;

      // Map back to our country codes
      const countryCode = Object.keys(OECD_CLI_CODES).find(k => OECD_CLI_CODES[k] === location);
      if (!countryCode) continue;

      // Keep the most recent value
      if (!result[countryCode] || time > result[countryCode].date) {
        result[countryCode] = { value: Math.round(value * 10) / 10, date: time };
      }
    }
    return result;
  } catch (e) {
    console.warn('OECD CLI fetch failed:', e.message);
    return null;
  }
}

async function fetchWBIndicator(indicator) {
  const url = `https://api.worldbank.org/v2/country/${MACRO_WB_CODES}/indicator/${indicator}?format=json&mrv=8&per_page=200`;
  const json = await fetchJSON(url);
  const rows = Array.isArray(json) && json[1] ? json[1] : [];
  const result = { values: {}, year: null };
  for (const row of rows) {
    const cc = row.country?.id;
    if (!cc || row.value == null) continue;
    if (!result.values[cc]) {
      result.values[cc] = Math.round(row.value * 10) / 10;
      if (!result.year) result.year = parseInt(row.date, 10);
    }
  }
  return result;
}

async function fetchFredLatestRate(seriesId, FRED_API_KEY) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: '1' });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  const obs = (data?.observations || []).find(o => o.value !== '.');
  return obs ? Math.round(parseFloat(obs.value) * 100) / 100 : null;
}

async function fetchFredRateHistory5yr(seriesId, FRED_API_KEY) {
  const start = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 5); return d.toISOString().split('T')[0]; })();
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'asc', observation_start: start, frequency: 'm' });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date.slice(0, 7), value: Math.round(parseFloat(o.value) * 100) / 100 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// IMF WORLD ECONOMIC OUTLOOK (WEO) — GDP, inflation, unemployment forecasts
// ─────────────────────────────────────────────────────────────────────────────
const WEO_INDICATORS = {
  gdpReal:     { weoSubject: 'NGDP_RPCH', label: 'GDP growth (real)', unit: '%' },
  inflation:   { weoSubject: 'PCPIPCH',    label: 'Inflation (CPI)',   unit: '%' },
  unemployment: { weoSubject: 'LUR',      label: 'Unemployment',       unit: '%' },
  gdpPerCapita: { weoSubject: 'NGDPDPC',  label: 'GDP per capita',    unit: 'USD' },
  currentAccount: { weoSubject: 'BCA_GDP', label: 'Current account (% GDP)', unit: '%' },
  govDebt:     { weoSubject: 'GGXWDG_NGDP', label: 'Gov debt (% GDP)', unit: '%' },
};

async function fetchIMFWEO() {
  const WEO_YEAR = new Date().getFullYear();
  const weoCodes = MACRO_COUNTRIES.map(c => c.weoCode).join(',');
  const indicators = Object.keys(WEO_INDICATORS);
  const results = {};

  for (const [key, meta] of Object.entries(WEO_INDICATORS)) {
    try {
      const url = `https://www.imf.org/api/data/WEOREPORTS/CSHQP?weoSubject=${meta.weoSubject}&weoCountry=${weoCodes}&weoYear=${WEO_YEAR}`;
      const resp = await fetchJSON(url);
      if (!Array.isArray(resp)) continue;
      for (const row of resp) {
        const countryCode = row.WEO_COUNTRY_CODE || row.ISO;
        const country = MACRO_COUNTRIES.find(c => c.weoCode === countryCode);
        if (!country) continue;
        const val = parseFloat(row[`${WEO_YEAR}`] || row.VALUE);
        if (isNaN(val)) continue;
        if (!results[country.code]) results[country.code] = { name: country.name, flag: country.flag };
        results[country.code][key] = val;
      }
    } catch (e) {
      console.warn('[GlobalMacro] IMF WEO fetch failed for', key, e.message);
    }
  }
  return Object.keys(results).length > 0 ? results : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ECB YIELD CURVE — Euro area yield curve by tenor
// ─────────────────────────────────────────────────────────────────────────────
const ECB_YIELD_TENORS = [
  { key: '3m', ecbKey: 'SR_3M' },
  { key: '6m', ecbKey: 'SR_6M' },
  { key: '1y', ecbKey: 'SR_1Y' },
  { key: '2y', ecbKey: 'SR_2Y' },
  { key: '5y', ecbKey: 'SR_5Y' },
  { key: '10y', ecbKey: 'SR_10Y' },
  { key: '30y', ecbKey: 'SR_30Y' },
];

async function fetchECBYieldCurve() {
  try {
    const url = 'https://data-api.ecb.europa.eu/service/data/YC/B.EURO_AREA.EUR.OBS.B.E+M+Y?detail=code&format=jsondata';
    const data = await fetchJSON(url);
    const series = data?.dataSets?.[0]?.series;
    if (!series) return null;
    const result = {};
    const structure = data?.structure?.dimensions?.series || [];
    const tenorDim = structure.find(d => d.id === 'TENOR');
    const tenorValues = tenorDim?.values || [];

    for (const [seriesKey, seriesData] of Object.entries(series || {})) {
      const obs = seriesData?.observations;
      if (!obs) continue;
      const latestObs = Object.entries(obs).sort((a, b) => parseInt(b[0]) - parseInt(a[0]))[0];
      if (!latestObs) continue;
      const value = parseFloat(latestObs[1]?.[0]);
      if (isNaN(value)) continue;

      const idx = seriesKey.split(':').map(Number);
      const tenorIdx = tenorDim?.position ? idx[tenorDim.position] : -1;
      const tenorLabel = tenorValues[tenorIdx]?.id;
      if (!tenorLabel) continue;

      const months = parseInt(tenorLabel);
      if (isNaN(months)) continue;
      if (months < 3) continue;

      const label = months < 12 ? `${months}m` : months === 12 ? '1y' : `${months / 12}y`;
      result[label] = Math.round(value * 100) / 100;
    }

    return Object.keys(result).length >= 3 ? result : null;
  } catch (e) {
    console.warn('[Bonds] ECB yield curve fetch failed:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BIS CREDIT-TO-GDP GAPS — financial stability indicator
// ─────────────────────────────────────────────────────────────────────────────
const BIS_CREDIT_COUNTRIES = {
  US: '3A.US', EA: '4C.EA19', GB: '3A.GB', JP: '3A.JP', CA: '3A.CA',
  CN: '3A.CN', KR: '3A.KR', AU: '3A.AU', SE: '3A.SE', CH: '3A.CH',
};

async function fetchBISCreditToGDP() {
  try {
    const countryFilter = Object.values(BIS_CREDIT_COUNTRIES).join(',');
    const url = `https://stats.bis.org/api/v2/data/dataflow/BIS/WS_CBP/1.0/M.Credit_to_GDP..C.GAP?startPeriod=2020-01-01&format=json`;
    const data = await fetchJSON(url);
    const observations = data?.dataSets?.[0]?.observations;
    if (!observations) return null;

    const structure = data?.structure?.dimensions?.observation || [];
    const countryDim = data?.structure?.dimensions?.series?.find(d => d.id === 'REF_AREA');
    const countryValues = countryDim?.values || [];

    const result = {};
    const codeMap = Object.fromEntries(Object.entries(BIS_CREDIT_COUNTRIES).map(([k, v]) => [v.split('.')[1], k]));

    for (const [obsKey, obsVal] of Object.entries(observations)) {
      const val = parseFloat(obsVal?.[0] ?? obsVal);
      if (isNaN(val)) continue;
      const parts = obsKey.split(':');
      const areaIdx = parseInt(parts[0] || '0');
      const areaCode = countryValues[areaIdx]?.id;
      const cc = codeMap[areaCode];
      if (!cc) continue;
      result[cc] = Math.round(val * 10) / 10;
    }

    return Object.keys(result).length >= 3 ? result : null;
  } catch (e) {
    console.warn('[GlobalMacro] BIS credit-to-GDP fetch failed:', e.message);
    return null;
  }
}

async function fetchBISPolicyRates() {
  try {
    const endPeriod = new Date().toISOString().slice(0, 10);
    const startPeriod = `${new Date().getFullYear() - 5}-01-01`;
    const url = `https://stats.bis.org/api/v1/data/WS_CBPOL?C_FREQUENCY=M&startPeriod=${startPeriod}&endPeriod=${endPeriod}&format=sdmx-json`;
    const data = await fetchJSON(url);
    const dataSets = data?.data?.dataSets?.[0];
    const structure = data?.data?.structure;
    if (!dataSets || !structure) return null;

    const areaDim = structure.dimensions.series.find(d => d.id === 'REF_AREA');
    const freqDim = structure.dimensions.series.find(d => d.id === 'FREQ');
    const timeDim = structure.dimensions.observation?.[0]?.values;
    if (!areaDim || !freqDim || !timeDim) return null;

    const areaValues = areaDim.values;
    const freqValues = freqDim.values;
    const monthlyIdx = freqValues.findIndex(v => v.id === 'M');
    if (monthlyIdx < 0) return null;

    const timePeriods = timeDim.map(t => typeof t === 'object' ? (t.id || t.name) : t);

    const bisToMacro = Object.fromEntries(Object.entries(MACRO_TO_BIS).map(([macro, bis]) => [bis, macro]));

    const currentRates = {};
    const historyByCountry = {};

    for (const [key, seriesData] of Object.entries(dataSets.series || {})) {
      const parts = key.split(':').map(Number);
      const freqIndex = parts[0] ?? -1;
      const areaIndex = parts[1] ?? -1;
      if (freqIndex !== monthlyIdx || areaIndex < 0) continue;

      const bisId = areaValues[areaIndex]?.id;
      if (!bisId) continue;

      const macroCode = bisToMacro[bisId] || bisId;

      const observations = seriesData?.observations;
      if (!observations) continue;

      const entries = Object.entries(observations)
        .map(([obsKey, obsVal]) => {
          const timeIdx = parseInt(obsKey);
          const val = parseFloat(Array.isArray(obsVal) ? obsVal[0] : obsVal);
          const dateStr = String(timePeriods[timeIdx] || '');
          if (isNaN(val) || !dateStr) return null;
          return { date: dateStr.length > 7 ? dateStr.slice(0, 7) : dateStr, value: val };
        })
        .filter(Boolean)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (entries.length === 0) continue;

      currentRates[macroCode] = entries[entries.length - 1].value;
      historyByCountry[macroCode] = entries;
    }

    return Object.keys(currentRates).length >= 5 ? { currentRates, historyByCountry } : null;
  } catch (e) {
    console.warn('[GlobalMacro] BIS policy rates fetch failed:', e.message);
    return null;
  }
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: String(limit) });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const BLS_API_KEY = process.env.BLS_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'globalMacro_data';
  const today = todayStr();

  const daily = readDailyCache('globalMacro');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    trackApiCall('World Bank');
    const [gdpRes, cpiRes, unempRes, debtRes, caRes] = await Promise.all([
      fetchWBIndicator('NY.GDP.MKTP.KD.ZG').catch(() => ({ values: {}, year: null })),
      fetchWBIndicator('FP.CPI.TOTL.ZG').catch(()    => ({ values: {}, year: null })),
      fetchWBIndicator('SL.UEM.TOTL.ZS').catch(()    => ({ values: {}, year: null })),
      fetchWBIndicator('GC.DOD.TOTL.GD.ZS').catch(() => ({ values: {}, year: null })),
      fetchWBIndicator('BN.CAB.XOKA.GD.ZS').catch(() => ({ values: {}, year: null })),
    ]);
    const wbYear = gdpRes.year || cpiRes.year || new Date().getFullYear() - 2;

    const fredCurrentMap = {};
    if (FRED_API_KEY) {
      trackApiCall('FRED');
      const fredResults = await Promise.allSettled(
        Object.entries(MACRO_FRED_RATES).map(async ([code, meta]) => ({
          code, rate: await fetchFredLatestRate(meta.id, FRED_API_KEY).catch(e => { console.warn('[GlobalMacro]', e.message || e); return null; }),
        }))
      );
      fredResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value.rate != null) fredCurrentMap[r.value.code] = r.value.rate;
      });
    }

    const fredHistoryMap = {};
    if (FRED_API_KEY) {
      trackApiCall('FRED');
      const histResults = await Promise.allSettled(
        Object.entries(MACRO_FRED_RATES).map(async ([code, meta]) => ({
          code, meta,
          obs: await fetchFredRateHistory5yr(meta.id, FRED_API_KEY).catch(() => []),
        }))
      );
      histResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value.obs.length >= 2) fredHistoryMap[r.value.code] = r.value;
      });
    }

    let m2Growth          = null;
    let tradeBalance      = null;
    let industrialProd    = null;
    let consumerSentiment = null;
    let yieldSpread       = null;
    let cfnai             = null;

    if (FRED_API_KEY) {
      trackApiCall('FRED');
      const [m2Res, tbRes, ipRes, csRes, ysRes, cfnaiRes] = await Promise.allSettled([
        fetchFredHistory('M2SL',    FRED_API_KEY, 36).catch(e => { console.warn('[GlobalMacro]', e.message || e); return null; }),
        fetchFredHistory('BOPGSTB', FRED_API_KEY, 24).catch(e => { console.warn('[GlobalMacro]', e.message || e); return null; }),
        fetchFredHistory('INDPRO',  FRED_API_KEY, 24).catch(e => { console.warn('[GlobalMacro]', e.message || e); return null; }),
        fetchFredHistory('UMCSENT', FRED_API_KEY, 24).catch(e => { console.warn('[GlobalMacro]', e.message || e); return null; }),
        fetchFredHistory('T10Y2Y',  FRED_API_KEY, 36).catch(e => { console.warn('[GlobalMacro]', e.message || e); return null; }),
        fetchFredHistory('CFNAIMA', FRED_API_KEY, 36).catch(e => { console.warn('[GlobalMacro]', e.message || e); return null; }),
      ]);

      function computeYoY(obs) {
        return obs.map((o, i) => {
          if (i < 12 || obs[i - 12].value == null || obs[i - 12].value === 0) return null;
          return Math.round(((o.value - obs[i - 12].value) / Math.abs(obs[i - 12].value)) * 10000) / 100;
        });
      }

      try {
        const obs = m2Res.status === 'fulfilled' && m2Res.value;
        if (obs && obs.length >= 2) {
          m2Growth = {
            dates:  obs.map(o => o.date.slice(0, 7)),
            values: obs.map(o => Math.round(o.value * 10) / 10),
            yoyPct: computeYoY(obs),
          };
        }
      } catch (e) { console.warn('[GlobalMacro]', e.message || e); }

      try {
        const obs = tbRes.status === 'fulfilled' && tbRes.value;
        if (obs && obs.length >= 1) {
          tradeBalance = {
            dates:  obs.map(o => o.date.slice(0, 7)),
            values: obs.map(o => Math.round(o.value * 10) / 10),
          };
        }
      } catch (e) { console.warn('[GlobalMacro]', e.message || e); }

      try {
        const obs = ipRes.status === 'fulfilled' && ipRes.value;
        if (obs && obs.length >= 2) {
          industrialProd = {
            dates:  obs.map(o => o.date.slice(0, 7)),
            values: obs.map(o => Math.round(o.value * 100) / 100),
            yoyPct: computeYoY(obs),
          };
        }
      } catch (e) { console.warn('[GlobalMacro]', e.message || e); }

      try {
        const obs = csRes.status === 'fulfilled' && csRes.value;
        if (obs && obs.length >= 1) {
          consumerSentiment = {
            dates:  obs.map(o => o.date.slice(0, 7)),
            values: obs.map(o => Math.round(o.value * 10) / 10),
          };
        }
      } catch (e) { console.warn('[GlobalMacro]', e.message || e); }

      try {
        const obs = ysRes.status === 'fulfilled' && ysRes.value;
        if (obs && obs.length >= 1) {
          yieldSpread = {
            dates:  obs.map(o => o.date.slice(0, 7)),
            values: obs.map(o => Math.round(o.value * 100) / 100),
          };
        }
      } catch (e) { console.warn('[GlobalMacro]', e.message || e); }

      try {
        const obs = cfnaiRes.status === 'fulfilled' && cfnaiRes.value;
        if (obs && obs.length >= 1) {
          cfnai = {
            dates:  obs.map(o => o.date.slice(0, 7)),
            values: obs.map(o => Math.round(o.value * 1000) / 1000),
            latest: obs.length > 0 ? Math.round(obs[obs.length - 1].value * 1000) / 1000 : null,
          };
        }
      } catch (e) { console.warn('[GlobalMacro]', e.message || e); }
    }

    // Fetch OECD Composite Leading Indicators
    let oecdCli = null;
    try {
      trackApiCall('OECD');
      oecdCli = await fetchOECDCli();
    } catch (e) {
      console.warn('OECD CLI fetch failed:', e.message);
    }

    // Fetch IMF World Economic Outlook forecasts
    let imfWEO = null;
    try {
      trackApiCall('IMF WEO');
      imfWEO = await fetchIMFWEO();
    } catch (e) {
      console.warn('IMF WEO fetch failed:', e.message);
    }

    // Fetch BIS credit-to-GDP gaps
    let bisCreditToGDP = null;
    try {
      trackApiCall('BIS Credit');
      bisCreditToGDP = await fetchBISCreditToGDP();
    } catch (e) {
      console.warn('BIS credit-to-GDP fetch failed:', e.message);
    }

    // Fetch BIS policy rates for all countries
    let bisPolicyRates = null;
    try {
      trackApiCall('BIS Policy Rates');
      bisPolicyRates = await fetchBISPolicyRates();
    } catch (e) {
      console.warn('BIS policy rates fetch failed:', e.message);
    }

    // Fetch BLS CPI breakdown
    let cpiBreakdown = null;
    if (BLS_API_KEY) {
      try {
        trackApiCall('BLS');
        cpiBreakdown = await fetchBlsCpiBreakdown(BLS_API_KEY);
      } catch (e) {
        console.warn('BLS CPI fetch failed:', e.message);
      }
    }

    const bisCurrentMap = bisPolicyRates?.currentRates ?? {};
    const bisHistoryMap = bisPolicyRates?.historyByCountry ?? {};

    const scorecardData = MACRO_COUNTRIES.map(c => ({
      code:   c.code,
      name:   c.name,
      flag:   c.flag,
      region: c.region,
      gdp:    gdpRes.values[c.wbCode]   ?? null,
      cpi:    cpiRes.values[c.wbCode]   ?? null,
      rate:   bisCurrentMap[c.code] ?? fredCurrentMap[c.code] ?? null,
      unemp:  unempRes.values[c.wbCode] ?? null,
      debt:   debtRes.values[c.wbCode]  ?? null,
    }));

    const growthInflationData = {
      year: wbYear,
      countries: MACRO_COUNTRIES.map(c => ({
        code: c.code, name: c.name, flag: c.flag,
        gdp: gdpRes.values[c.wbCode] ?? null,
        cpi: cpiRes.values[c.wbCode] ?? null,
      })),
    };

    const allCurrentRates = MACRO_COUNTRIES.map(c => {
      const bisRate = bisCurrentMap[c.code];
      const fredMeta = MACRO_FRED_RATES[c.code];
      const rate = bisRate ?? fredCurrentMap[c.code] ?? null;
      const isLive = bisRate != null || (fredMeta ? (fredCurrentMap[c.code] != null) : false);
      const bank = BIS_BANK_NAMES[c.code] ?? fredMeta?.bank ?? '';
      const source = bisRate != null ? 'BIS' : (fredCurrentMap[c.code] != null ? 'FRED' : '');
      return { code: c.code, name: c.name, flag: c.flag, rate, bank, isLive, source };
    });

    const allDates = new Set();
    Object.values(bisHistoryMap).forEach(entries => entries.forEach(e => allDates.add(e.date)));
    Object.values(fredHistoryMap).forEach(({ obs }) => obs.forEach(o => allDates.add(o.date)));
    const sortedDates = [...allDates].sort();
    const histSeries = MACRO_COUNTRIES.map(c => {
      const fredSeries = fredHistoryMap[c.code];
      const bisSeries = bisHistoryMap[c.code];
      const bisMap = bisSeries ? Object.fromEntries(bisSeries.map(e => [e.date, e.value])) : {};
      const fredMap = fredSeries ? Object.fromEntries(fredSeries.obs.map(o => [o.date, o.value])) : {};
      const values = sortedDates.map(d => {
        if (d in bisMap) return bisMap[d];
        if (d in fredMap) return fredMap[d];
        return null;
      });
      const bank = BIS_BANK_NAMES[c.code] ?? fredSeries?.meta?.bank ?? '';
      return { code: c.code, name: c.name, flag: c.flag, bank, values };
    });

    const centralBankData = {
      current: allCurrentRates,
      history: { dates: sortedDates, series: histSeries },
    };

    const debtData = {
      year: wbYear,
      countries: MACRO_COUNTRIES.map(c => ({
        code:           c.code,
        name:           c.name,
        flag:           c.flag,
        debt:           debtRes.values[c.wbCode] ?? null,
        currentAccount: caRes.values[c.wbCode]   ?? null,
      })),
    };

    const result = {
      scorecardData,
      growthInflationData,
      centralBankData,
      debtData,
      m2Growth,
      tradeBalance,
      industrialProd,
      consumerSentiment,
      yieldSpread,
      cfnai,
      oecdCli,
      cpiBreakdown,
      imfWEO,
      bisCreditToGDP,
      _sources: {
        worldBankIndicators: Object.keys(gdpRes.values).length > 0 || Object.keys(cpiRes.values).length > 0,
        fredRates: Object.keys(fredCurrentMap).length > 0,
        fredRateHistory: Object.keys(fredHistoryMap).length > 0,
        bisPolicyRates: bisCurrentMap != null && Object.keys(bisCurrentMap).length > 0,
        fredMacroHistory: m2Growth != null || tradeBalance != null || industrialProd != null || consumerSentiment != null || yieldSpread != null || cfnai != null,
        oecdCli: oecdCli != null && Object.keys(oecdCli).length > 0,
        blsCpi: cpiBreakdown != null && cpiBreakdown.components?.length > 0,
        imfWEO: imfWEO != null && Object.keys(imfWEO).length > 0,
        bisCreditToGDP: bisCreditToGDP != null && Object.keys(bisCreditToGDP).length > 0,
      },
      lastUpdated: today,
    };

    writeDailyCache('globalMacro', result);
    cache.set(cacheKey, result, 3600);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('GlobalMacro API error:', error);
    const fallback = readLatestCache('globalMacro');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
