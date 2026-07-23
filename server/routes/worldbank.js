import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';

const router = Router();

// Major listed-equity markets with World Bank WDI CM.MKT.* coverage.
// Values always come from live/cached WDI — no mock or synthetic rows.
const COUNTRIES = [
  { code: 'US', iso2: 'US', iso3: 'USA', name: 'United States',  flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'CN', iso2: 'CN', iso3: 'CHN', name: 'China',          flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'IN', iso2: 'IN', iso3: 'IND', name: 'India',          flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'JP', iso2: 'JP', iso3: 'JPN', name: 'Japan',          flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'HK', iso2: 'HK', iso3: 'HKG', name: 'Hong Kong SAR',  flag: '\u{1F1ED}\u{1F1F0}' },
  { code: 'CA', iso2: 'CA', iso3: 'CAN', name: 'Canada',         flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'GB', iso2: 'GB', iso3: 'GBR', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'DE', iso2: 'DE', iso3: 'DEU', name: 'Germany',        flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'KR', iso2: 'KR', iso3: 'KOR', name: 'South Korea',    flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'CH', iso2: 'CH', iso3: 'CHE', name: 'Switzerland',    flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'FR', iso2: 'FR', iso3: 'FRA', name: 'France',         flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'SA', iso2: 'SA', iso3: 'SAU', name: 'Saudi Arabia',   flag: '\u{1F1F8}\u{1F1E6}' },
  { code: 'AU', iso2: 'AU', iso3: 'AUS', name: 'Australia',      flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'ZA', iso2: 'ZA', iso3: 'ZAF', name: 'South Africa',   flag: '\u{1F1FF}\u{1F1E6}' },
  { code: 'ES', iso2: 'ES', iso3: 'ESP', name: 'Spain',          flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'AE', iso2: 'AE', iso3: 'ARE', name: 'UAE',            flag: '\u{1F1E6}\u{1F1EA}' },
  { code: 'ID', iso2: 'ID', iso3: 'IDN', name: 'Indonesia',      flag: '\u{1F1EE}\u{1F1E9}' },
  { code: 'BR', iso2: 'BR', iso3: 'BRA', name: 'Brazil',         flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'SG', iso2: 'SG', iso3: 'SGP', name: 'Singapore',      flag: '\u{1F1F8}\u{1F1EC}' },
  { code: 'IT', iso2: 'IT', iso3: 'ITA', name: 'Italy',          flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'MX', iso2: 'MX', iso3: 'MEX', name: 'Mexico',         flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'TH', iso2: 'TH', iso3: 'THA', name: 'Thailand',       flag: '\u{1F1F9}\u{1F1ED}' },
  { code: 'MY', iso2: 'MY', iso3: 'MYS', name: 'Malaysia',       flag: '\u{1F1F2}\u{1F1FE}' },
  { code: 'CL', iso2: 'CL', iso3: 'CHL', name: 'Chile',          flag: '\u{1F1E8}\u{1F1F1}' },
  { code: 'TR', iso2: 'TR', iso3: 'TUR', name: 'Türkiye',        flag: '\u{1F1F9}\u{1F1F7}' },
  { code: 'IL', iso2: 'IL', iso3: 'ISR', name: 'Israel',         flag: '\u{1F1EE}\u{1F1F1}' },
  { code: 'PL', iso2: 'PL', iso3: 'POL', name: 'Poland',         flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'VN', iso2: 'VN', iso3: 'VNM', name: 'Vietnam',        flag: '\u{1F1FB}\u{1F1F3}' },
  { code: 'NO', iso2: 'NO', iso3: 'NOR', name: 'Norway',         flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'PH', iso2: 'PH', iso3: 'PHL', name: 'Philippines',    flag: '\u{1F1F5}\u{1F1ED}' },
  { code: 'AT', iso2: 'AT', iso3: 'AUT', name: 'Austria',        flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'QA', iso2: 'QA', iso3: 'QAT', name: 'Qatar',          flag: '\u{1F1F6}\u{1F1E6}' },
  { code: 'KW', iso2: 'KW', iso3: 'KWT', name: 'Kuwait',         flag: '\u{1F1F0}\u{1F1FC}' },
  { code: 'SE', iso2: 'SE', iso3: 'SWE', name: 'Sweden',         flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'NL', iso2: 'NL', iso3: 'NLD', name: 'Netherlands',    flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'BE', iso2: 'BE', iso3: 'BEL', name: 'Belgium',        flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'IE', iso2: 'IE', iso3: 'IRL', name: 'Ireland',        flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'NZ', iso2: 'NZ', iso3: 'NZL', name: 'New Zealand',    flag: '\u{1F1F3}\u{1F1FF}' },
  { code: 'CO', iso2: 'CO', iso3: 'COL', name: 'Colombia',       flag: '\u{1F1E8}\u{1F1F4}' },
  { code: 'PE', iso2: 'PE', iso3: 'PER', name: 'Peru',           flag: '\u{1F1F5}\u{1F1EA}' },
];

const INDICATORS = [
  { key: 'gdpGrowth',   wdi: 'NY.GDP.MKTP.KD.ZG', label: 'GDP Growth',      unit: '%' },
  { key: 'gdpPerCap',   wdi: 'NY.GDP.PCAP.CD',    label: 'GDP per Capita',  unit: 'USD' },
  { key: 'inflation',   wdi: 'FP.CPI.TOTL.ZG',    label: 'Inflation (CPI)',  unit: '%' },
  { key: 'tradeGdp',    wdi: 'NE.TRD.GNFS.ZS',    label: 'Trade (% GDP)',    unit: '%' },
  { key: 'population',  wdi: 'SP.POP.TOTL',       label: 'Population',       unit: '' },
  // Equity market size (World Bank GFDD / WDI market capitalization series)
  { key: 'mktCapUsd',     wdi: 'CM.MKT.LCAP.CD',    label: 'Market cap (USD)',      unit: 'USD' },
  { key: 'mktCapGdp',     wdi: 'CM.MKT.LCAP.GD.ZS', label: 'Market cap (% GDP)',    unit: '%' },
  { key: 'mktTurnover',   wdi: 'CM.MKT.TRAD.GD.ZS', label: 'Stocks traded (% GDP)', unit: '%' },
  // Insurance penetration (GFDD has a ~2-year lag — these stop at 2020 for
  // most G7 countries — but they're the only free cross-country measure of
  // life vs non-life premium share of GDP). Used by the Insurance tab.
  { key: 'lifeInsPctGdp',     wdi: 'GFDD.DI.09', label: 'Life insurance premium / GDP',     unit: '%' },
  { key: 'nonLifeInsPctGdp',  wdi: 'GFDD.DI.10', label: 'Non-life insurance premium / GDP', unit: '%' },
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

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchIndicator(indicator, countryCodes) {
  const code = indicator.wdi;
  // GFDD / some CM.MKT series lag several years — look back far enough to
  // surface the latest published observation (never invent values).
  const dateRange = code.startsWith('GFDD.') || code.startsWith('CM.MKT.')
    ? '2015:2025'
    : '2018:2025';

  // Batch countries so each request stays under WB timeouts (parallel fan-out
  // of 40-country URLs was regularly hitting the 10s default fetch cap).
  const batches = chunkArray(countryCodes, 12);
  const byCountry = {};
  const raw = [];

  for (const batch of batches) {
    const countries = batch.join(';');
    const url = `${WB_API}/country/${countries}/indicator/${code}?format=json&per_page=500&date=${dateRange}`;
    try {
      trackApiCall('WorldBank');
      // 45s — multi-country WDI pages can be slow
      const data = await fetchJSON(url, undefined, {}, 45000);
      if (!data || !Array.isArray(data[1])) continue;
      for (const dp of data[1]) {
        if (dp.value != null) raw.push(dp);
        const id2 = dp.country?.id;
        const key = id2 && String(id2).length === 2 ? id2 : (dp.countryiso3code || id2);
        if (!key) continue;
        if (!byCountry[key]) byCountry[key] = [];
        byCountry[key].push({ date: dp.date, value: dp.value });
      }
    } catch (e) {
      console.warn(`[worldbank] fetch failed for ${code} batch [${batch.join(',')}]:`, e.message);
    }
  }
  return { raw, byCountry };
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

    // Sequential indicator fetches — parallel multi-batch WDI calls overwhelm
    // the free API and leave every series empty after timeouts.
    for (const ind of INDICATORS) {
      try {
        const value = await fetchIndicator(ind, countryIso2s);
        const hasData = Object.keys(value.byCountry || {}).length > 0;
        sources[`wb_${ind.key}`] = hasData;
        if (hasData) trendData[ind.key] = value.byCountry;
      } catch (e) {
        sources[`wb_${ind.key}`] = false;
        console.warn(`[worldbank] indicator ${ind.key} failed:`, e.message);
      }
    }

    for (const country of COUNTRIES) {
      const row = {
        code: country.code,
        iso3: country.iso3,
        name: country.name,
        flag: country.flag,
      };

      for (const ind of INDICATORS) {
        // Match by ISO2 (preferred) or ISO3 if API only keyed one of them
        const dataPoints =
          trendData[ind.key]?.[country.iso2]
          || trendData[ind.key]?.[country.iso3]
          || [];
        const latest = getLatest(dataPoints);
        const prev = getPrevLatest(dataPoints);

        if (ind.key === 'population') {
          row[ind.key] = latest ? latest.value / 1e6 : null; // millions
          row[ind.key + 'Prev'] = prev ? prev.value / 1e6 : null;
          row[ind.key + 'Year'] = latest?.year || null;
        } else if (ind.key === 'mktCapUsd') {
          // Store as $ trillions for compact UI (raw USD kept on mktCapRaw)
          row[ind.key] = latest ? parseFloat((latest.value / 1e12).toFixed(2)) : null;
          row[ind.key + 'Prev'] = prev ? parseFloat((prev.value / 1e12).toFixed(2)) : null;
          row[ind.key + 'Year'] = latest?.year || null;
          row.mktCapRaw = latest ? latest.value : null;
        } else {
          row[ind.key] = latest ? parseFloat(Number(latest.value).toFixed(2)) : null;
          row[ind.key + 'Prev'] = prev ? parseFloat(Number(prev.value).toFixed(2)) : null;
          row[ind.key + 'Year'] = latest?.year || null;
        }
      }

      // Only include countries that have at least one real WDI observation
      const hasAny = INDICATORS.some((ind) => row[ind.key] != null);
      if (hasAny) countries.push(row);
    }

    const withCap = countries.filter((c) => c.mktCapUsd != null).length;
    const isLive = Object.values(sources).some(Boolean);

    const result = {
      countries,
      trendData,
      countryCount: countries.length,
      withMarketCap: withCap,
      _sources: { ...sources, worldBankWdi: isLive },
      lastUpdated: today,
      fetchedOn: today,
      isCurrent: true,
      isLive,
    };

    if (isLive) writeDailyCache('worldbank', result);
    cache.set(cacheKey, result, 300);

    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('[worldbank] route error:', error);
    return sendCachedOrDegradedSync(res, 'worldbank', {
      error,
      memoryCache: req.app.locals.cache,
      cacheKey: 'worldbank_data',
    });
  }
});

export default router;