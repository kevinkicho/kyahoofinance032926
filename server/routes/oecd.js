// OECD — Composite Leading Indicators (CLI) across countries.
// Docs: https://data.oecd.org/api/sdmx-json-documentation/
//       https://sdmx.oecd.org/public/rest/
// No key required.
//
// Note: your existing globalMacro tab gets OECD CLI via FRED mirrors.
// This route hits OECD directly — useful when FRED's OECD series lags
// or are missing for non-G7 countries.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { parseSdmx } from '../lib/sdmx.js';

const router = Router();

const BASE = 'https://sdmx.oecd.org/public/rest/data';

// Countries in the CLI dataset most relevant to a markets dashboard.
const COUNTRIES = ['USA', 'GBR', 'DEU', 'FRA', 'ITA', 'JPN', 'CAN', 'AUS', 'KOR', 'CHN', 'IND', 'BRA'];

async function fetchOecdCli() {
  trackApiCall('OECD');
  const startPeriod = `${new Date().getFullYear() - 3}-01`;
  const url = `${BASE}/OECD.SDD.STES,DSD_STES@DF_CLI,4.0/${COUNTRIES.join('+')}.M.LI.IX..AA...?startPeriod=${startPeriod}&format=jsondata`;
  const data = await fetchJSON(url);
  const parsed = parseSdmx(data);
  // Each series corresponds to one country. Return a country→history map.
  const out = {};
  for (const s of parsed) {
    const country = s.dims?.REF_AREA || s.key?.[0];
    if (!country) continue;
    out[country] = s.observations.slice(-12); // last 12 months
  }
  return out;
}

// ── OECD Insurance Statistics ──────────────────────────────────────────────
// Fetches gross premiums, insurance penetration (%GDP), and density
// (premiums per capita) for life and non-life insurance across countries.
// Uses OECD SDMX API — no key required.
// Docs: https://data.oecd.org/insurance/insurance-spending.htm
const INS_COUNTRIES = ['USA', 'GBR', 'DEU', 'FRA', 'ITA', 'JPN', 'CAN', 'AUS', 'KOR', 'NLD', 'CHE', 'ESP'];
const INS_INDICATORS = [
  { key: 'grossPremiumsLife',   sdmx: 'DPN_LIFE',   label: 'Gross premiums written — life',   unit: 'USD' },
  { key: 'grossPremiumsNonLife', sdmx: 'DPN_NLIFE',  label: 'Gross premiums written — non-life', unit: 'USD' },
  { key: 'penetrationLife',     sdmx: 'PEN_LIFE',   label: 'Insurance penetration — life',     unit: '%GDP' },
  { key: 'penetrationNonLife',  sdmx: 'PEN_NLIFE',  label: 'Insurance penetration — non-life',  unit: '%GDP' },
  { key: 'densityLife',         sdmx: 'DEN_LIFE',   label: 'Insurance density — life',          unit: 'USD/cap' },
  { key: 'densityNonLife',      sdmx: 'DEN_NLIFE',  label: 'Insurance density — non-life',      unit: 'USD/cap' },
];

async function fetchOecdInsurance() {
  trackApiCall('OECD');
  const out = {};
  for (const ind of INS_INDICATORS) {
    try {
      const url = `${BASE}/OECD.INS,DSD_INSURANCE@DF_INSURANCE,1.0/${INS_COUNTRIES.join('+')}.A.${ind.sdmx}...?format=jsondata&lastNObservations=5`;
      const data = await fetchJSON(url);
      const parsed = parseSdmx(data);
      const byCountry = {};
      for (const s of parsed) {
        const country = s.dims?.REF_AREA || s.key?.[0];
        if (!country) continue;
        byCountry[country] = s.observations.slice(-3);
      }
      out[ind.key] = { byCountry, label: ind.label, unit: ind.unit };
    } catch (e) {
      console.warn(`[OECD Insurance] ${ind.key}: ${e.message}`);
    }
  }
  return out;
}

router.get('/insurance', async (_req, res) => {
  const cached = readDailyCache('oecd_insurance');
  if (cached) return res.json(cached);

  const today = todayStr();
  let insurance = null;
  try { insurance = await fetchOecdInsurance(); } catch (e) { console.warn('[OECD] Insurance:', e.message); }

  const _sources = { oecdInsurance: !!(insurance && Object.keys(insurance).length) };
  const isLive = _sources.oecdInsurance;

  const result = { insurance, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
  if (isLive) writeDailyCache('oecd_insurance', result);
  else {
    const fallback = readLatestCache('oecd_insurance');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

router.get('/', async (_req, res) => {
  const cached = readDailyCache('oecd');
  if (cached) return res.json(cached);

  const today = todayStr();
  let cli = null;
  try { cli = await fetchOecdCli(); } catch (e) { console.warn('[OECD] CLI:', e.message); }

  const _sources = { oecdCli: !!(cli && Object.keys(cli).length) };
  const isLive = _sources.oecdCli;

  const result = {
    cli,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('oecd', result);
  else {
    const fallback = readLatestCache('oecd');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
