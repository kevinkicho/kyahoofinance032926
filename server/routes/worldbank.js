import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const COUNTRIES = [
  { code: 'US', iso2: 'US', iso3: 'USA', name: 'United States',  flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'GB', iso2: 'GB', iso3: 'GBR', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'DE', iso2: 'DE', iso3: 'DEU', name: 'Germany',        flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'FR', iso2: 'FR', iso3: 'FRA', name: 'France',          flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'JP', iso2: 'JP', iso3: 'JPN', name: 'Japan',          flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'IT', iso2: 'IT', iso3: 'ITA', name: 'Italy',          flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'CA', iso2: 'CA', iso3: 'CAN', name: 'Canada',         flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'CN', iso2: 'CN', iso3: 'CHN', name: 'China',          flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'IN', iso2: 'IN', iso3: 'IND', name: 'India',           flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'BR', iso2: 'BR', iso3: 'BRA', name: 'Brazil',         flag: '\u{1F1E7}\u{1F1F7}' },
];

const INDICATORS = [
  { key: 'gdpGrowth',   wdi: 'NY.GDP.MKTP.KD.ZG', label: 'GDP Growth',      unit: '%' },
  { key: 'gdpPerCap',   wdi: 'NY.GDP.PCAP.CD',    label: 'GDP per Capita',  unit: 'USD' },
  { key: 'inflation',   wdi: 'FP.CPI.TOTL.ZG',    label: 'Inflation (CPI)',  unit: '%' },
  { key: 'tradeGdp',    wdi: 'NE.TRD.GNFS.ZS',    label: 'Trade (% GDP)',    unit: '%' },
  { key: 'population',  wdi: 'SP.POP.TOTL',       label: 'Population',       unit: '' },
];

const WB_API = 'https://api.worldbank.org/v2';

export function getLatest(dataPoints) {
  if (!dataPoints?.length) return null;
  const sorted = [...dataPoints].sort((a, b) => parseInt(b.date) - parseInt(a.date));
  for (const dp of sorted) {
    if (dp.value != null) return { year: dp.date, value: dp.value };
  }
  return null;
}

export function getPrevLatest(dataPoints) {
  if (!dataPoints?.length) return null;
  const sorted = [...dataPoints].sort((a, b) => parseInt(b.date) - parseInt(a.date));
  let foundLatest = false;
  for (const dp of sorted) {
    if (dp.value != null) {
      if (foundLatest) return { year: dp.date, value: dp.value };
      foundLatest = true;
    }
  }
  return null;
}

async function fetchIndicator(indicator, countryCodes) {
  const code = indicator.wdi;
  const countries = countryCodes.join(';');
  const url = `${WB_API}/country/${countries}/indicator/${code}?format=json&per_page=200&date=2019:2025`;
  try {
    trackApiCall('WorldBank');
    const data = await fetchJSON(url);
    if (!data || !Array.isArray(data[1])) return { raw: [], byCountry: {} };
    const raw = data[1].filter(d => d.value != null);
    const byCountry = {};
    for (const dp of data[1]) {
      const cc = dp.country?.id;
      if (!cc) continue;
      if (!byCountry[cc]) byCountry[cc] = [];
      byCountry[cc].push({ date: dp.date, value: dp.value });
    }
    return { raw, byCountry };
  } catch (e) {
    console.warn(`[worldbank] fetch failed for ${code}:`, e.message);
    return { raw: [], byCountry: {} };
  }
}

router.get('/', async (req, res) => {
  const today = todayStr();

  const daily = readDailyCache('worldbank');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cache = req.app.locals.cache;
  const cacheKey = 'worldbank_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  const countryIso2s = COUNTRIES.map(c => c.iso2);
  const sources = {};

  try {
    const countries = [];
    const trendData = {};

    const results = await Promise.allSettled(
      INDICATORS.map(ind => fetchIndicator(ind, countryIso2s))
    );

    for (let i = 0; i < INDICATORS.length; i++) {
      const ind = INDICATORS[i];
      const result = results[i];
      if (result.status !== 'fulfilled' || !result.value.byCountry) continue;
      const hasData = Object.keys(result.value.byCountry).length > 0;
      sources[`wb_${ind.key}`] = hasData;
      if (hasData) trendData[ind.key] = result.value.byCountry;
    }

    for (const country of COUNTRIES) {
      const row = {
        code: country.code,
        iso3: country.iso3,
        name: country.name,
        flag: country.flag,
      };

      for (const ind of INDICATORS) {
        const dataPoints = trendData[ind.key]?.[country.iso2] || [];
        const latest = getLatest(dataPoints);
        const prev = getPrevLatest(dataPoints);

        if (ind.key === 'population') {
          row[ind.key] = latest ? latest.value / 1e6 : null;
          row[ind.key + 'Prev'] = prev ? prev.value / 1e6 : null;
          row[ind.key + 'Year'] = latest?.year || null;
        } else {
          row[ind.key] = latest ? parseFloat(latest.value.toFixed(2)) : null;
          row[ind.key + 'Prev'] = prev ? parseFloat(prev.value.toFixed(2)) : null;
          row[ind.key + 'Year'] = latest?.year || null;
        }
      }

      countries.push(row);
    }

    const result = {
      countries,
      trendData,
      _sources: sources,
      lastUpdated: today,
      fetchedOn: today,
      isCurrent: true,
    };

    writeDailyCache('worldbank', result);
    cache.set(cacheKey, result, 300);

    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('[worldbank] route error:', error);
    const fallback = readLatestCache('worldbank');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Failed to fetch World Bank data' });
  }
});

export default router;