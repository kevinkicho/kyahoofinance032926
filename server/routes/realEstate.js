import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { makeCachedRouteHandler } from '../lib/routeFactory.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory, fetchFredLatest } from '../lib/fred.js';

const router = Router();

const REIT_TICKERS = ['PLD', 'AMT', 'EQIX', 'SPG', 'WELL', 'AVB', 'BXP', 'PSA', 'O', 'VICI'];
const REIT_META = {
  PLD:  { name: 'Prologis',          sector: 'Industrial',   pFFO: null },
  AMT:  { name: 'American Tower',    sector: 'Cell Towers',  pFFO: null },
  EQIX: { name: 'Equinix',           sector: 'Data Centers', pFFO: null },
  SPG:  { name: 'Simon Property',    sector: 'Retail',       pFFO: null },
  WELL: { name: 'Welltower',         sector: 'Healthcare',   pFFO: null },
  AVB:  { name: 'AvalonBay',         sector: 'Residential',  pFFO: null },
  BXP:  { name: 'Boston Properties', sector: 'Office',       pFFO: null },
  PSA:  { name: 'Public Storage',    sector: 'Self-Storage', pFFO: null },
  O:    { name: 'Realty Income',     sector: 'Net Lease',    pFFO: null },
  VICI: { name: 'VICI Properties',   sector: 'Gaming',       pFFO: null },
};

const BIS_SERIES = {
  US: 'QUSR628BIS', UK: 'QGBR628BIS', DE: 'QDEU628BIS',
  AU: 'QAUS628BIS', CA: 'QCAN628BIS', JP: 'QJPN628BIS',
};

function bisQuarterLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const q = Math.ceil((d.getUTCMonth() + 1) / 3);
  return `Q${q} ${String(d.getUTCFullYear()).slice(2)}`;
}

const HUD_METROS = [
  { city: 'New York', hud_code: 'METRO35620MM5600', cbsa_code: '35620', lat: 40.7128, lng: -74.0060 },
  { city: 'Los Angeles', hud_code: 'METRO31080MM4480', cbsa_code: '31080', lat: 34.0522, lng: -118.2437 },
  { city: 'Chicago', hud_code: 'METRO16980M16980', cbsa_code: '16980', lat: 41.8781, lng: -87.6298 },
  { city: 'Dallas', hud_code: 'METRO19100M19100', cbsa_code: '19100', lat: 32.7767, lng: -96.7970 },
  { city: 'Houston', hud_code: 'METRO26420M26420', cbsa_code: '26420', lat: 29.7604, lng: -95.3698 },
  { city: 'Miami', hud_code: 'METRO33100MM5000', cbsa_code: '33100', lat: 25.7617, lng: -80.1918 },
  { city: 'Atlanta', hud_code: 'METRO12060M12060', cbsa_code: '12060', lat: 33.7490, lng: -84.3880 },
  { city: 'Philadelphia', hud_code: 'METRO37980M37980', cbsa_code: '37980', lat: 39.9526, lng: -75.1652 },
  { city: 'Washington', hud_code: 'METRO47900M47900', cbsa_code: '47900', lat: 38.9072, lng: -77.0369 },
  { city: 'Phoenix', hud_code: 'METRO38060M38060', cbsa_code: '38060', lat: 33.4484, lng: -112.0740 },
  { city: 'Boston', hud_code: 'METRO14460MM1120', cbsa_code: '14460', lat: 42.3601, lng: -71.0589 },
  { city: 'Riverside', hud_code: 'METRO40140M40140', cbsa_code: '40140', lat: 33.9806, lng: -117.3755 },
  { city: 'San Francisco', hud_code: 'METRO41860MM7360', cbsa_code: '41860', lat: 37.7749, lng: -122.4194 },
  { city: 'Detroit', hud_code: 'METRO19820M19820', cbsa_code: '19820', lat: 42.3314, lng: -83.0458 },
  { city: 'Seattle', hud_code: 'METRO42660MM7600', cbsa_code: '42660', lat: 47.6062, lng: -122.3321 },
  { city: 'Minneapolis', hud_code: 'METRO33460M33460', cbsa_code: '33460', lat: 44.9778, lng: -93.2650 },
  { city: 'Tampa', hud_code: 'METRO45300M45300', cbsa_code: '45300', lat: 27.9506, lng: -82.4572 },
  { city: 'San Diego', hud_code: 'METRO41740M41740', cbsa_code: '41740', lat: 32.7157, lng: -117.1611 },
  { city: 'Denver', hud_code: 'METRO19740M19740', cbsa_code: '19740', lat: 39.7392, lng: -104.9903 },
  { city: 'Orlando', hud_code: 'METRO36740M36740', cbsa_code: '36740', lat: 28.5383, lng: -81.3792 },
  { city: 'Austin', hud_code: 'METRO12420M12420', cbsa_code: '12420', lat: 30.2672, lng: -97.7431 },
  { city: 'St. Louis', hud_code: 'METRO41180M41180', cbsa_code: '41180', lat: 38.6270, lng: -90.1994 },
  { city: 'Charlotte', hud_code: 'METRO16740M16740', cbsa_code: '16740', lat: 35.2271, lng: -80.8431 },
  { city: 'San Antonio', hud_code: 'METRO41700M41700', cbsa_code: '41700', lat: 29.4241, lng: -98.4936 },
  { city: 'Portland', hud_code: 'METRO38900M38900', cbsa_code: '38900', lat: 45.5152, lng: -122.6784 },
  { city: 'Sacramento', hud_code: 'METRO40900M40900', cbsa_code: '40900', lat: 38.5816, lng: -121.4944 },
  { city: 'Pittsburgh', hud_code: 'METRO38300M38300', cbsa_code: '38300', lat: 40.4406, lng: -79.9959 },
  { city: 'Las Vegas', hud_code: 'METRO29820M29820', cbsa_code: '29820', lat: 36.1716, lng: -115.1398 },
  { city: 'Cincinnati', hud_code: 'METRO17140M17140', cbsa_code: '17140', lat: 39.1031, lng: -84.5120 },
  { city: 'Kansas City', hud_code: 'METRO28140M28140', cbsa_code: '28140', lat: 39.0997, lng: -94.5786 },
  { city: 'Columbus', hud_code: 'METRO18140M18140', cbsa_code: '18140', lat: 39.9612, lng: -82.9988 },
  { city: 'Indianapolis', hud_code: 'METRO26900M26900', cbsa_code: '26900', lat: 39.7684, lng: -86.1581 },
  { city: 'Cleveland', hud_code: 'METRO17460M17460', cbsa_code: '17460', lat: 41.4993, lng: -81.6944 },
  { city: 'San Jose', hud_code: 'METRO41940M41940', cbsa_code: '41940', lat: 37.3382, lng: -121.8863 },
  { city: 'Nashville', hud_code: 'METRO34980M34980', cbsa_code: '34980', lat: 36.1627, lng: -86.7816 },
  { city: 'Virginia Beach', hud_code: 'METRO47260M47260', cbsa_code: '47260', lat: 36.8529, lng: -75.9780 },
  { city: 'Jacksonville', hud_code: 'METRO27260M27260', cbsa_code: '27260', lat: 30.3322, lng: -81.6557 },
  { city: 'Providence', hud_code: 'METRO39300M39300', cbsa_code: '39300', lat: 41.8240, lng: -71.4128 },
  { city: 'Milwaukee', hud_code: 'METRO33340M33340', cbsa_code: '33340', lat: 43.0389, lng: -87.9065 },
  { city: 'Raleigh', hud_code: 'METRO39580M39580', cbsa_code: '39580', lat: 35.7796, lng: -78.6382 },
  { city: 'Oklahoma City', hud_code: 'METRO36420M36420', cbsa_code: '36420', lat: 35.4676, lng: -97.5164 },
  { city: 'Memphis', hud_code: 'METRO32820M32820', cbsa_code: '32820', lat: 35.1495, lng: -90.0490 },
  { city: 'Louisville', hud_code: 'METRO31140M31140', cbsa_code: '31140', lat: 38.2527, lng: -85.7585 },
  { city: 'Richmond', hud_code: 'METRO40060M40060', cbsa_code: '40060', lat: 37.5407, lng: -77.4360 },
  { city: 'New Orleans', hud_code: 'METRO35380M35380', cbsa_code: '35380', lat: 29.9511, lng: -90.0715 },
  { city: 'Salt Lake City', hud_code: 'METRO41620M41620', cbsa_code: '41620', lat: 40.7608, lng: -111.8910 },
  { city: 'Hartford', hud_code: 'METRO25540M25540', cbsa_code: '25540', lat: 41.7637, lng: -72.6851 },
  { city: 'Buffalo', hud_code: 'METRO15380M15380', cbsa_code: '15380', lat: 42.8864, lng: -78.8784 },
  { city: 'Birmingham', hud_code: 'METRO13820M13820', cbsa_code: '13820', lat: 33.5186, lng: -86.8104 },
  { city: 'Rochester', hud_code: 'METRO40380M40380', cbsa_code: '40380', lat: 43.1566, lng: -77.6088 }
];

async function fetchHudAffordabilityData(hudApiKey, censusApiKey) {
  if (!hudApiKey) {
    console.warn('[RealEstate] HUD_API_KEY is missing');
    return null;
  }

  // 1. Fetch Census data in a single query
  let censusMap = new Map();
  if (censusApiKey) {
    try {
      const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B25077_001E,B25064_001E,B25003_002E,B25003_003E&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*&key=${censusApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const rawData = await res.json();
        // Skip header row: ["NAME", "B25077_001E", "B25064_001E", "B25003_002E", "B25003_003E", "metropolitan statistical area/micropolitan statistical area"]
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const homeValue = parseInt(row[1]) || null;
          const grossRent = parseInt(row[2]) || null;
          const ownerOcc = parseInt(row[3]) || 0;
          const renterOcc = parseInt(row[4]) || 0;
          const cbsa = row[5];
          censusMap.set(cbsa, {
            homeValue,
            grossRent,
            homeownership: (ownerOcc + renterOcc) > 0 ? Math.round((ownerOcc / (ownerOcc + renterOcc)) * 100 * 10) / 10 : null
          });
        }
      } else {
        console.warn('[RealEstate] Census API returned error status:', res.status);
      }
    } catch (e) {
      console.warn('[RealEstate] Census API fetch failed:', e.message || e);
    }
  }

  // 2. Fetch HUD FMR and Income Limits in parallel chunks
  const hudData = [];
  const limit = 10;
  
  for (let i = 0; i < HUD_METROS.length; i += limit) {
    const chunk = HUD_METROS.slice(i, i + limit);
    const chunkPromises = chunk.map(async (metro) => {
      try {
        const fmrUrl = `https://www.huduser.gov/hudapi/public/fmr/data/${metro.hud_code}`;
        const ilUrl = `https://www.huduser.gov/hudapi/public/il/data/${metro.hud_code}`;
        
        const [fmrRes, ilRes] = await Promise.all([
          fetch(fmrUrl, { headers: { 'Authorization': `Bearer ${hudApiKey}` } }),
          fetch(ilUrl, { headers: { 'Authorization': `Bearer ${hudApiKey}` } })
        ]);
        
        let rent = null;
        let income = null;
        
        if (fmrRes.ok) {
          const fmrJson = await fmrRes.json();
          rent = fmrJson?.data?.basicdata?.['Two-Bedroom'] || null;
        }
        
        if (ilRes.ok) {
          const ilJson = await ilRes.json();
          income = ilJson?.data?.median_income || null;
        }
        
        let ratio = null;
        if (rent && income) {
          ratio = Math.round(((rent * 12) / income) * 100 * 10) / 10;
        }
        
        const censusInfo = censusMap.get(metro.cbsa_code) || null;
        
        return {
          city: metro.city,
          hud_code: metro.hud_code,
          cbsa_code: metro.cbsa_code,
          lat: metro.lat,
          lng: metro.lng,
          rent,
          income,
          ratio,
          homeValue: censusInfo?.homeValue || null,
          grossRent: censusInfo?.grossRent || null,
          homeownership: censusInfo?.homeownership || null
        };
      } catch (e) {
        console.warn(`[RealEstate] Error fetching HUD data for ${metro.city}:`, e.message || e);
        return {
          city: metro.city,
          hud_code: metro.hud_code,
          cbsa_code: metro.cbsa_code,
          lat: metro.lat,
          lng: metro.lng,
          rent: null,
          income: null,
          ratio: null,
          homeValue: null,
          grossRent: null,
          homeownership: null
        };
      }
    });
    
    const chunkResults = await Promise.all(chunkPromises);
    hudData.push(...chunkResults);
  }
  
  return hudData;
}

router.get('/', makeCachedRouteHandler({
  marketName: 'realEstate',
  cacheKey: 'realestate_data',
  cacheTtl: 900,
  timeoutMs: 25000,
  fetchDataFn: async (req, _errors) => {
    const HUD_API_KEY = process.env.HUD_API_KEY || '';
    const CENSUS_API_KEY = process.env.CENSUS_API_KEY || '';
    const FRED_API_KEY = process.env.FRED_API_KEY || '';
    let reitData = null;
    try {
      trackApiCall('Yahoo Finance');
      const quotes = await yf.quote(REIT_TICKERS);
      // yahoo-finance2's quoteSummary now rejects arrays — must call per
      // ticker. Run them in parallel and tolerate individual failures.
      const sumArr = (await Promise.allSettled(
        REIT_TICKERS.map(t => yf.quoteSummary(t, { modules: ['summaryDetail'] }))
      )).map((r, i) => {
        if (r.status !== 'fulfilled' || !r.value) return null;
        return { symbol: REIT_TICKERS[i], ...r.value };
      }).filter(Boolean);
      const arr = Array.isArray(quotes) ? quotes : [quotes];

      reitData = arr
        .filter(q => q?.regularMarketPrice)
        .map((q, idx) => {
          const meta = REIT_META[q.symbol] || {};
          const summary = sumArr.find(s => s?.symbol === q.symbol);
          const ytdReturn = q.ytdReturn != null
            ? Math.round(q.ytdReturn * 1000) / 10
            : (q.regularMarketChangePercent ? Math.round(q.regularMarketChangePercent * 10) / 10 : 0);
          return {
            ticker:        q.symbol,
            name:          meta.name  || q.shortName || q.symbol,
            sector:        meta.sector || 'REIT',
            dividendYield: q.dividendYield != null ? Math.round(q.dividendYield * 1000) / 10 : null,
            pFFO:          summary?.summaryDetail?.fundsFromOperations || meta.pFFO || null,
            ytdReturn,
            marketCap:     q.marketCap ? Math.round(q.marketCap / 1e9) : null,
            price:         Math.round(q.regularMarketPrice * 100) / 100,
            changePct:     Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
          };
        });
      if (!reitData.length) reitData = null;
    } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.reitData = e.message; }

    let priceIndexData = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const bisEntries = await Promise.allSettled(
          Object.entries(BIS_SERIES).map(async ([cc, sid]) => {
            const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${sid}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2020-01-01`;
            const data = await fetchJSON(url);
            const obs = (data?.observations || []).filter(o => o.value !== '.');
            if (!obs.length) return [cc, null];
            const base = parseFloat(obs[0].value);
            if (!base || isNaN(base)) return [cc, null];
            const dated = obs.map(o => ({
              label: bisQuarterLabel(o.date),
              value: Math.round((parseFloat(o.value) / base) * 100 * 10) / 10,
            }));
            return [cc, dated];
          })
        );

        const collected = {};
        bisEntries.forEach(r => {
          if (r.status === 'fulfilled' && r.value[1]) collected[r.value[0]] = r.value[1];
        });

        if (Object.keys(collected).length > 0) {
          priceIndexData = {};
          for (const [cc, pts] of Object.entries(collected)) {
            priceIndexData[cc] = {
              dates:  pts.map(p => p.label),
              values: pts.map(p => p.value),
            };
          }
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.priceIndexData = e.message; }
    }

    let mortgageRates = null;
    let mortgageRatesHistory = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [rate30, rate15, rate30hist, rate15hist] = await Promise.all([
          fetchFredHistory('MORTGAGE30US', FRED_API_KEY, 2),
          fetchFredHistory('MORTGAGE15US', FRED_API_KEY, 2),
          fetchFredHistory('MORTGAGE30US', FRED_API_KEY, 252),
          fetchFredHistory('MORTGAGE15US', FRED_API_KEY, 252),
        ]);
        const latest30 = rate30[rate30.length - 1];
        const latest15 = rate15[rate15.length - 1];
        if (latest30 && latest15) {
          mortgageRates = {
            rate30y: Math.round(latest30.value * 100) / 100,
            rate15y: Math.round(latest15.value * 100) / 100,
            asOf: latest30.date,
          };
        }
        if (rate30hist.length > 0) {
          mortgageRatesHistory = {
            dates: rate30hist.map(p => p.date.slice(0, 7)),
            rate30y: rate30hist.map(p => Math.round(p.value * 100) / 100),
            rate15y: rate15hist.length > 0 ? rate15hist.map(p => Math.round(p.value * 100) / 100) : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.mortgageRates = e.message; }
    }

    let affordabilityData = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [mspusHist, incomeResult] = await Promise.all([
          fetchFredHistory('MSPUS', FRED_API_KEY, 20),
          fetchFredLatest('MEHOINUSA672N', FRED_API_KEY),
        ]);
        const medianIncome = incomeResult ?? 75000;
        if (mspusHist.length > 0) {
          const latest = mspusHist.at(-1);
          const medianPrice = latest.value;
          const priceToIncome = Math.round(medianPrice / medianIncome * 10) / 10;

          const rate30 = mortgageRates?.rate30y ?? 7.0;
          const monthlyRate = rate30 / 100 / 12;
          const principal = medianPrice * 0.8;
          const monthlyPayment = monthlyRate > 0
            ? principal * (monthlyRate * Math.pow(1 + monthlyRate, 360)) / (Math.pow(1 + monthlyRate, 360) - 1)
            : principal / 360;
          const mortgageToIncome = Math.round(monthlyPayment * 12 / medianIncome * 1000) / 10;

          const prevYear = mspusHist.find(p => {
            const d1 = new Date(p.date);
            const d2 = new Date(latest.date);
            return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24) - 365) < 60;
          });
          const yoyChange = prevYear ? Math.round((medianPrice / prevYear.value - 1) * 1000) / 10 : null;

          const history = mspusHist.map(p => ({
            date: p.date,
            medianPrice: Math.round(p.value),
            priceToIncome: Math.round(p.value / medianIncome * 10) / 10,
          }));

          affordabilityData = {
            current: { medianPrice: Math.round(medianPrice), medianIncome: Math.round(medianIncome), priceToIncome, mortgageToIncome, rate30y: rate30, yoyChange },
            history,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.housingAffordability = e.message; _errors.affordabilityData = e.message; }
    }

    let capRateData = null;
    if (reitData?.length) {
      const sectorYields = {};
      reitData.forEach(r => {
        if (r.dividendYield != null && r.sector) {
          if (!sectorYields[r.sector]) sectorYields[r.sector] = [];
          sectorYields[r.sector].push(r.dividendYield);
        }
      });
      const sectors = Object.entries(sectorYields).map(([sector, yields]) => ({
        sector,
        impliedYield: Math.round(yields.reduce((a, b) => a + b, 0) / yields.length * 10) / 10,
      })).sort((a, b) => b.impliedYield - a.impliedYield);
      if (sectors.length > 0) capRateData = sectors;
    }

    let caseShillerData = null;
    if (FRED_API_KEY) {
      try {
        const csMetros = {
          national:       'CSUSHPISA',
          'San Francisco':'SFXRSA',
          'New York':     'NYXRSA',
          'Los Angeles':  'LXXRSA',
          'Miami':        'MIXRSA',
          'Chicago':      'CHXRSA',
        };
        trackApiCall('FRED');
        const csResults = await Promise.allSettled(
          Object.entries(csMetros).map(async ([name, sid]) => {
            const hist = await fetchFredHistory(sid, FRED_API_KEY, 60);
            return [name, hist];
          })
        );
        const natHist = csResults[0]?.status === 'fulfilled' ? csResults[0].value[1] : [];
        const metros = {};
        csResults.slice(1).forEach(r => {
          if (r.status === 'fulfilled' && r.value[1].length > 0) {
            const pts = r.value[1];
            const latest = pts[pts.length - 1].value;
            const yr = pts.length >= 13 ? pts[pts.length - 13].value : pts[0].value;
            metros[r.value[0]] = {
              latest: Math.round(latest * 10) / 10,
              yoy: Math.round((latest / yr - 1) * 1000) / 10,
            };
          }
        });
        if (natHist.length >= 12) {
          caseShillerData = {
            national: {
              dates: natHist.map(p => p.date.slice(0, 7)),
              values: natHist.map(p => Math.round(p.value * 10) / 10),
            },
            metros,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.caseShiller = e.message; _errors.caseShillerData = e.message; }
    }

    let supplyData = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [startsHist, permitsHist, monthsSupplyVal, listingsVal] = await Promise.all([
          fetchFredHistory('HOUST', FRED_API_KEY, 36).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
          fetchFredHistory('PERMIT', FRED_API_KEY, 36).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
          fetchFredLatest('MSACSR', FRED_API_KEY).catch(e => { console.warn('[RealEstate]', e.message || e); return null; }),
          fetchFredLatest('ACTLISCOUUS', FRED_API_KEY).catch(e => { console.warn('[RealEstate]', e.message || e); return null; }),
        ]);
        if (startsHist.length > 0 || permitsHist.length > 0) {
          supplyData = {
            housingStarts: { dates: startsHist.map(p => p.date.slice(0, 7)), values: startsHist.map(p => Math.round(p.value)) },
            permits:       { dates: permitsHist.map(p => p.date.slice(0, 7)), values: permitsHist.map(p => Math.round(p.value)) },
            monthsSupply:  monthsSupplyVal != null ? Math.round(monthsSupplyVal * 10) / 10 : null,
            activeListings: listingsVal != null ? Math.round(listingsVal) : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.supplyData = e.message; }
    }

    let homeownershipRate = null;
    let rentCpi = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [hoRate, rentHist] = await Promise.all([
          fetchFredLatest('RHORUSQ156N', FRED_API_KEY).catch(e => { console.warn('[RealEstate]', e.message || e); return null; }),
          fetchFredHistory('CUSR0000SEHA', FRED_API_KEY, 36).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
        ]);
        homeownershipRate = hoRate != null ? Math.round(hoRate * 10) / 10 : null;
        if (rentHist.length > 0) {
          rentCpi = {
            dates: rentHist.map(p => p.date.slice(0, 7)),
            values: rentHist.map(p => Math.round(p.value * 10) / 10),
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.homeownershipRate = e.message; _errors.rentCpi = e.message; }
    }

    let reitEtf = null;
    try {
      trackApiCall('Yahoo Finance');
      const vnqQuote = await yf.quote(['VNQ']);
      const vnqArr = Array.isArray(vnqQuote) ? vnqQuote : [vnqQuote];
      const vq = vnqArr.find(q => q?.symbol === 'VNQ');
      if (vq?.regularMarketPrice) {
        const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
        const histEnd = new Date().toISOString().split('T')[0];
        let vnqHistory = null;
        try {
          trackApiCall('Yahoo Finance');
          const chart = await yf.chart('VNQ', { period1: histStart, period2: histEnd, interval: '1d' });
          const quotes = (chart.quotes || []).filter(q => q.close != null);
          if (quotes.length > 0) {
            vnqHistory = {
              dates: quotes.map(q => q.date.toISOString().split('T')[0]),
              closes: quotes.map(q => Math.round(q.close * 100) / 100),
            };
          }
        } catch (e) { console.warn('[RealEstate]', e.message || e); }
        reitEtf = {
          price: Math.round(vq.regularMarketPrice * 100) / 100,
          changePct: Math.round((vq.regularMarketChangePercent ?? 0) * 100) / 100,
          ytd: vq.ytdReturn != null ? Math.round(vq.ytdReturn * 1000) / 10 : null,
          history: vnqHistory,
        };
      }
    } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.reitEtf = e.message; }

    let treasury10y = null;
    if (FRED_API_KEY) {
      try { trackApiCall('FRED'); treasury10y = await fetchFredLatest('DGS10', FRED_API_KEY); } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.treasury10y = e.message; }
    }

    let existingHomeSales = null;
    let rentalVacancy = null;
    let fhfaHpi = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [exhoHist, rrvResult, fhfaResult] = await Promise.all([
          fetchFredHistory('EXHOSLUSM495S', FRED_API_KEY, 24).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
          fetchFredLatest('RRVRUSQ156N', FRED_API_KEY).catch(e => { console.warn('[RealEstate]', e.message || e); return null; }),
          fetchFredHistory('USSTHPI', FRED_API_KEY, 20).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
        ]);
        if (exhoHist?.length > 0) {
          existingHomeSales = {
            dates:  exhoHist.map(p => p.date.slice(0, 7)),
            values: exhoHist.map(p => Math.round(p.value * 100) / 100),
          };
        }
        if (rrvResult != null) {
          rentalVacancy = Math.round(rrvResult * 100) / 100;
        }
        if (fhfaResult?.length > 0) {
          const base = parseFloat(fhfaResult[0].value);
          fhfaHpi = {
            dates:  fhfaResult.map(p => p.date.slice(0, 7)),
            values: fhfaResult.map(p => base ? Math.round((parseFloat(p.value) / base) * 1000) / 10 : 0),
            latest: fhfaResult.length ? { value: parseFloat(fhfaResult[fhfaResult.length - 1].value), date: fhfaResult[fhfaResult.length - 1].date.slice(0, 7) } : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.existingHomeSales = e.message; _errors.rentalVacancy = e.message; _errors.fhfaHpi = e.message; }
    }

    const housingStarts = supplyData
      ? {
          dates:   supplyData.housingStarts.dates,
          starts:  supplyData.housingStarts.values,
          permits: supplyData.permits.values,
        }
      : null;

    const medianHomePrice = (affordabilityData?.history?.length > 0)
      ? {
          dates:  affordabilityData.history.map(p => p.date.slice(0, 7)),
          values: affordabilityData.history.map(p => p.medianPrice),
        }
      : null;

    // Foreclosure & Delinquency data
    let foreclosureData = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [foreclosures, delinquencies] = await Promise.all([
          // LXXACBS0FRBR no longer exists; DRSREACBS (Delinquency Rate on
          // Single-Family Residential Mortgages, Booked in Domestic Offices,
          // All Commercial Banks) is a close replacement that's still live.
          fetchFredHistory('DRSREACBS', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
          fetchFredHistory('DRSFRWBS', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
        ]);
        if (foreclosures.length > 0 || delinquencies.length > 0) {
          foreclosureData = {
            foreclosures: foreclosures.length > 0 ? {
              dates: foreclosures.map(p => p.date.slice(0, 7)),
              values: foreclosures.map(p => Math.round(p.value * 100) / 100),
            } : null,
            delinquencies: delinquencies.length > 0 ? {
              dates: delinquencies.map(p => p.date.slice(0, 7)),
              values: delinquencies.map(p => Math.round(p.value * 100) / 100),
            } : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.foreclosureData = e.message; }
    }

    // MBA Applications data — MBA's mortgage application indices aren't
    // mirrored on FRED. Fall back to mortgage rate history (purchase
    // proxy) + refinance differential. Real MBA data needs a paid feed.
    let mbaApplications = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [purchaseApps, refiApps] = await Promise.all([
          fetchFredHistory('MORTGAGE30US', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
          fetchFredHistory('MORTGAGE15US', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
        ]);
        if (purchaseApps.length > 0) {
          mbaApplications = {
            purchase: {
              dates: purchaseApps.map(p => p.date.slice(0, 7)),
              values: purchaseApps.map(p => Math.round(p.value)),
            },
            refi: refiApps.length > 0 ? {
              dates: refiApps.map(p => p.date.slice(0, 7)),
              values: refiApps.map(p => Math.round(p.value)),
            } : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.mbaApplications = e.message; }
    }

    // CRE Delinquencies — DRCLACBS = Delinquency Rate on Commercial Real
    // Estate Loans, All Commercial Banks. The old BOGZ1FL404090060Q ID
    // 400'd ("series does not exist") on every fetch.
    let creDelinquencies = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const creHist = await fetchFredHistory('DRCLACBS', FRED_API_KEY, 24).catch(e => { console.warn('[RealEstate]', e.message || e); return []; });
        if (creHist.length > 0) {
          creDelinquencies = {
            dates: creHist.map(p => p.date.slice(0, 7)),
            values: creHist.map(p => Math.round(p.value * 100) / 100),
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); _errors.creDelinquencies = e.message; }
    }

    let hudData = null;
    try {
      hudData = await fetchHudAffordabilityData(HUD_API_KEY, CENSUS_API_KEY);
    } catch (e) {
      console.warn('[RealEstate] HUD/Census fetch failed:', e.message || e);
      _errors.hudData = e.message;
    }

    const _sources = {
      reitData:           reitData != null && reitData.length > 0,
      caseShiller:        caseShillerData != null,
      mortgageRates:      mortgageRates != null,
      housingAffordability: affordabilityData != null,
      homePriceIndex:     priceIndexData != null,
      supplyData:         supplyData != null,
      homeownershipRate:  homeownershipRate != null,
      rentCpi:            rentCpi != null,
      fhfaHpi:            fhfaHpi != null,
      reitEtf:            reitEtf != null,
      treasury10y:        treasury10y != null,
      existingHomeSales:  existingHomeSales != null,
      rentalVacancy:      rentalVacancy != null,
      housingStarts:      housingStarts != null,
      medianHomePrice:    medianHomePrice != null,
      capRateData:        capRateData != null,
      foreclosureData:    foreclosureData != null,
      mbaApplications:    mbaApplications != null,
      creDelinquencies:   creDelinquencies != null,
      hudData:            hudData != null && hudData.length > 0,
    };

    return { reitData, priceIndexData, mortgageRates, affordabilityData, capRateData, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, existingHomeSales, rentalVacancy, housingStarts, medianHomePrice, foreclosureData, mbaApplications, creDelinquencies, hudData, _sources };
  }
}));

export default router;
