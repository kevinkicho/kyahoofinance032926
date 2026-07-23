import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { WEO_SNAPSHOT } from '../dataSources/weoSnapshot.js';
import { IFS_SNAPSHOT, COFER_SNAPSHOT } from '../dataSources/ifsCofeSnapshot.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';

const router = Router();

const WEO_COUNTRIES = [
  { code: 'US', weoCode: 'USA', name: 'United States',  flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'EA', weoCode: 'EA19', name: 'Euro Area',      flag: '\u{1F1EA}\u{1F1FA}' },
  { code: 'GB', weoCode: 'GBR', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'JP', weoCode: 'JPN', name: 'Japan',          flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'CA', weoCode: 'CAN', name: 'Canada',         flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'CN', weoCode: 'CHN', name: 'China',          flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'IN', weoCode: 'IND', name: 'India',           flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'BR', weoCode: 'BRA', name: 'Brazil',         flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'KR', weoCode: 'KOR', name: 'South Korea',   flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'AU', weoCode: 'AUS', name: 'Australia',      flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'MX', weoCode: 'MEX', name: 'Mexico',         flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'SE', weoCode: 'SWE', name: 'Sweden',         flag: '\u{1F1F8}\u{1F1EA}' },
];

const WEO_SUBJECTS = [
  { key: 'gdpReal',       subject: 'NGDP_RPCH',    label: 'GDP growth (real)', unit: '%' },
  { key: 'inflation',     subject: 'PCPIPCH',     label: 'Inflation (CPI)',   unit: '%' },
  { key: 'unemployment',  subject: 'LUR',          label: 'Unemployment',       unit: '%' },
  { key: 'gdpPerCapita',  subject: 'NGDPDPC',      label: 'GDP per capita',    unit: 'USD' },
  { key: 'currentAccount', subject: 'BCA_GDP',     label: 'Current account (% GDP)', unit: '%' },
  { key: 'govDebt',       subject: 'GGXWDG_NGDP',  label: 'Gov debt (% GDP)', unit: '%' },
  { key: 'govRevenue',    subject: 'GGR_NGDP',     label: 'Gov revenue (% GDP)', unit: '%' },
  { key: 'investment',    subject: 'NID_NGDP',      label: 'Investment (% GDP)', unit: '%' },
  { key: 'pop',           subject: 'LP',            label: 'Population',        unit: 'M' },
];

const IMF_API_BASE = 'https://dataservices.imf.org/REST/SDMX_JSON.svc';

async function fetchWEOIndicator(subject, weoCodes) {
  try {
    const key = weoCodes.join('+');
    const url = `${IMF_API_BASE}/GetData/WEO/${key}.${subject}.A?startPeriod=2022&endPeriod=2030`;
    const data = await fetchJSON(url);
    const series = data?.CompactData?.DataSet?.Series;
    if (!series) return {};

    const entries = Array.isArray(series) ? series : [series];
    const result = {};

    for (const s of entries) {
      const cc = s['@REF_AREA'] || s['@WEO_COUNTRY_CODE'] || s['@FREQ'];
      const obs = Array.isArray(s.Obs) ? s.Obs : s.Obs ? [s.Obs] : [];
      const byYear = {};
      for (const o of obs) {
        const yr = parseInt(o['@TIME_PERIOD']);
        const val = parseFloat(o['@OBS_VALUE']);
        if (!isNaN(yr) && !isNaN(val)) byYear[yr] = val;
      }
      const country = WEO_COUNTRIES.find(c => c.weoCode === cc || c.code === cc);
      if (country && Object.keys(byYear).length > 0) {
        result[country.code] = byYear;
      }
    }
    return result;
  } catch (e) { console.warn('[IMF] fetchWEOIndicator:', e?.message); return {}; }
}

async function fetchIFSData(indicator, countries) {
  try {
    const codes = countries.join('+');
    const url = `${IMF_API_BASE}/GetData/IFS/${codes}.A.${indicator}?startPeriod=2020`;
    const data = await fetchJSON(url);
    const series = data?.CompactData?.DataSet?.Series;
    if (!series) return {};

    const entries = Array.isArray(series) ? series : [series];
    const result = {};

    for (const s of entries) {
      const cc = s['@REF_AREA'];
      const obs = Array.isArray(s.Obs) ? s.Obs : s.Obs ? [s.Obs] : [];
      const byYear = {};
      for (const o of obs) {
        const yr = parseInt(o['@TIME_PERIOD']);
        const val = parseFloat(o['@OBS_VALUE']);
        if (!isNaN(yr) && !isNaN(val)) byYear[yr] = val;
      }
      const country = WEO_COUNTRIES.find(c => c.weoCode === cc || c.code === cc);
      if (country && Object.keys(byYear).length > 0) {
        result[country.code] = byYear;
      }
    }
    return result;
  } catch (e) { console.warn('[IMF] fetchIFSData:', e?.message); return {}; }
}

async function fetchCOFER() {
  try {
    const url = `${IMF_API_BASE}/GetData/COFER/Q.USD+XDR+EUR+JPY+GBP+CNY+CHF+Other.XDC_USD.XDR?startPeriod=2022-Q1`;
    const data = await fetchJSON(url);
    const series = data?.CompactData?.DataSet?.Series;
    if (!series) return null;

    const entries = Array.isArray(series) ? series : [series];
    const result = {};

    for (const s of entries) {
      const currency = s['@CURRENCY'];
      const obs = Array.isArray(s.Obs) ? s.Obs : s.Obs ? [s.Obs] : [];
      if (obs.length === 0) continue;

      const sorted = obs
        .filter(o => o['@OBS_VALUE'] != null)
        .sort((a, b) => b['@TIME_PERIOD'].localeCompare(a['@TIME_PERIOD']));

      if (sorted.length === 0) continue;

      const codeMap = {
        USD: 'USD', XDR: 'SDR', EUR: 'EUR', JPY: 'JPY',
        GBP: 'GBP', CNY: 'CNY', CHF: 'CHF',
      };
      const label = codeMap[currency] || currency;
      result[label] = {
        asOf: sorted[0]['@TIME_PERIOD'],
        value: Math.round(parseFloat(sorted[0]['@OBS_VALUE']) * 100) / 100,
      };
    }

    return Object.keys(result).length >= 3 ? result : null;
  } catch (e) { console.warn('[IMF] fetchCOFER:', e?.message); return null; }
}

router.get('/', async (req, res) => {
  const cache = req.app.locals.cache;
  const cacheKey = 'imf_data';
  const today = todayStr();

  const daily = readDailyCache('imf');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  let routeTimer;
  try {
    const ROUTE_TIMEOUT = 15000;
    routeTimer = setTimeout(() => {
      if (!res.headersSent) {
        console.warn('[IMF] Route timeout — responding with fallback (200)');
        sendCachedOrDegradedSync(res, 'imf', {
          error: new Error('IMF upstream timeout'),
          memoryCache: cache,
          cacheKey,
          extra: { _timeout: true },
        });
      }
    }, ROUTE_TIMEOUT);

    const weoCodes = WEO_COUNTRIES.map(c => c.weoCode);
    const weoForecasts = {};
    const weoResults = await Promise.allSettled(
      WEO_SUBJECTS.map(async ({ key, subject }) => {
        trackApiCall('IMF WEO');
        const data = await fetchWEOIndicator(subject, weoCodes);
        return { key, data };
      })
    );
    for (const r of weoResults) {
      if (r.status === 'fulfilled' && r.value.data && Object.keys(r.value.data).length > 0) {
        weoForecasts[r.value.key] = r.value.data;
      } else if (r.status === 'rejected') {
        console.warn('[IMF] WEO fetch failed:', r.reason?.message || r.reason);
      }
    }

    const weoHasData = Object.keys(weoForecasts).length > 0;

    let ifsReserves = null;
    let cofer = null;
    if (weoHasData) {
      try {
        trackApiCall('IMF IFS');
        const reserveCodes = WEO_COUNTRIES.map(c => c.weoCode);
        ifsReserves = await fetchIFSData('RAXFSFX', reserveCodes);
      } catch (e) {
        console.warn('[IMF] IFS reserves fetch failed:', e.message);
      }

      try {
        trackApiCall('IMF COFER');
        cofer = await fetchCOFER();
      } catch (e) {
        console.warn('[IMF] COFER fetch failed:', e.message);
      }
    } else {
      console.warn('[IMF] All WEO fetches failed — using static WEO snapshot');
    }

    let ifsReservesFinal = ifsReserves;
    let coferFinal = cofer;
    let ifsSnapshotUsed = false;
    let coferSnapshotUsed = false;

    if (!ifsReserves || Object.keys(ifsReserves).length === 0) {
      ifsReservesFinal = {};
      for (const [code, val] of Object.entries(IFS_SNAPSHOT.reserves)) {
        ifsReservesFinal[code] = { [new Date().getFullYear()]: val };
      }
      ifsSnapshotUsed = true;
    }

    if (!cofer || (cofer && Object.keys(cofer).length < 3)) {
      coferFinal = COFER_SNAPSHOT.shares;
      coferSnapshotUsed = true;
    }

    let isStaticFallback = false;
    let countries;
    if (weoHasData) {
      countries = WEO_COUNTRIES.map(c => {
        const entry = { code: c.code, name: c.name, flag: c.flag };
        for (const [key] of Object.entries(WEO_SUBJECTS)) {
          const yearlyData = weoForecasts[key]?.[c.code];
          if (yearlyData) {
            const latestYear = Object.keys(yearlyData).sort().pop();
            const prevYear = String(parseInt(latestYear) - 1);
            entry[key] = yearlyData[latestYear] != null ? Math.round(yearlyData[latestYear] * 10) / 10 : null;
            entry[key + 'Prev'] = yearlyData[prevYear] != null ? Math.round(yearlyData[prevYear] * 10) / 10 : null;
          }
        }
        if (ifsReservesFinal?.[c.code]) {
          const yrs = Object.keys(ifsReservesFinal[c.code]).sort();
          const lastVal = ifsReservesFinal[c.code][yrs[yrs.length - 1]];
          entry.intlReserves = lastVal != null
            ? (typeof lastVal === 'number' ? Math.round(lastVal * 10) / 10 : lastVal) : null;
        }
        return entry;
      });
    } else {
      isStaticFallback = true;
      countries = WEO_SNAPSHOT.countries.map(c => {
        const entry = { code: c.code, name: c.name, flag: c.flag };
        for (const key of WEO_SNAPSHOT.indicators) {
          entry[key] = c[key] ?? null;
          entry[key + 'Prev'] = c[key + 'Prev'] ?? null;
        }
        return entry;
      });
    }

    const _sources = {};
    for (const [key] of Object.entries(WEO_SUBJECTS)) {
      _sources[`imfWEO_${key}`] = weoForecasts[key] != null && Object.keys(weoForecasts[key]).length > 0;
    }
    _sources.imfIFS_Reserves = ifsReservesFinal != null && Object.keys(ifsReservesFinal).length > 0;
    _sources.imfCOFER = coferFinal != null && Object.keys(coferFinal).length >= 3;
    if (ifsSnapshotUsed) _sources.imfIFS_snapshot = true;
    if (coferSnapshotUsed) _sources.imfCOFER_snapshot = true;
    if (isStaticFallback) {
      for (const key of WEO_SNAPSHOT.indicators) {
        _sources[`imfWEO_${key}`] = true;
      }
      _sources.imfWEO_snapshot = true;
    }

    const anySourceLive = Object.values(_sources).some(v => v === true);
    const result = {
      countries,
      weoForecasts,
      ifsReserves: ifsReservesFinal,
      cofer: coferFinal,
      snapshot: isStaticFallback ? { vintage: WEO_SNAPSHOT.vintage, asOf: WEO_SNAPSHOT.asOf } : null,
      _sources,
      lastUpdated: today,
    };

    clearTimeout(routeTimer);
    if (res.headersSent) return;
    if (!isStaticFallback && anySourceLive) writeDailyCache('imf', result);
    cache.set(cacheKey, result, 3600);
    res.json({ ...result, fetchedOn: today, isCurrent: !isStaticFallback && anySourceLive });
  } catch (error) {
    clearTimeout(routeTimer);
    if (res.headersSent) return;
    console.error('IMF API error:', error);
    return sendCachedOrDegradedSync(res, 'imf', {
      error,
      memoryCache: cache,
      cacheKey,
    });
  }
});

export default router;