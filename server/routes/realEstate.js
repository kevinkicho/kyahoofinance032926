import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const REIT_TICKERS = ['PLD', 'AMT', 'EQIX', 'SPG', 'WELL', 'AVB', 'BXP', 'PSA', 'O', 'VICI'];
const REIT_META = {
  PLD:  { name: 'Prologis',          sector: 'Industrial',   pFFO: 18.4 },
  AMT:  { name: 'American Tower',    sector: 'Cell Towers',  pFFO: 22.1 },
  EQIX: { name: 'Equinix',           sector: 'Data Centers', pFFO: 28.5 },
  SPG:  { name: 'Simon Property',    sector: 'Retail',       pFFO: 12.8 },
  WELL: { name: 'Welltower',         sector: 'Healthcare',   pFFO: 24.2 },
  AVB:  { name: 'AvalonBay',         sector: 'Residential',  pFFO: 19.6 },
  BXP:  { name: 'Boston Properties', sector: 'Office',       pFFO:  9.4 },
  PSA:  { name: 'Public Storage',    sector: 'Self-Storage', pFFO: 16.2 },
  O:    { name: 'Realty Income',     sector: 'Net Lease',    pFFO: 13.5 },
  VICI: { name: 'VICI Properties',   sector: 'Gaming',       pFFO: 14.0 },
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

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'realestate_data';
  const today = todayStr();

  const daily = readDailyCache('realEstate');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    let reitData = null;
    try {
      trackApiCall('Yahoo Finance');
      const quotes = await yf.quote(REIT_TICKERS);
      const arr = Array.isArray(quotes) ? quotes : [quotes];
      reitData = arr
        .filter(q => q?.regularMarketPrice)
        .map(q => {
          const meta = REIT_META[q.symbol] || {};
          const ytdReturn = q.ytdReturn != null
            ? Math.round(q.ytdReturn * 1000) / 10
            : (q.regularMarketChangePercent ? Math.round(q.regularMarketChangePercent * 10) / 10 : 0);
          return {
            ticker:        q.symbol,
            name:          meta.name  || q.shortName || q.symbol,
            sector:        meta.sector || 'REIT',
            dividendYield: q.dividendYield != null ? Math.round(q.dividendYield * 1000) / 10 : null,
            pFFO:          meta.pFFO,
            ytdReturn,
            marketCap:     q.marketCap ? Math.round(q.marketCap / 1e9) : null,
            price:         Math.round(q.regularMarketPrice * 100) / 100,
            changePct:     Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
          };
        });
      if (!reitData.length) reitData = null;
    } catch (e) { console.warn('[RealEstate]', e.message || e); }

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

        if (Object.keys(collected).length >= 2) {
          priceIndexData = {};
          for (const [cc, pts] of Object.entries(collected)) {
            priceIndexData[cc] = {
              dates:  pts.map(p => p.label),
              values: pts.map(p => p.value),
            };
          }
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
    }

    let mortgageRates = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [rate30, rate15] = await Promise.all([
          fetchFredHistory('MORTGAGE30US', FRED_API_KEY, 2),
          fetchFredHistory('MORTGAGE15US', FRED_API_KEY, 2),
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
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
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
        if (mspusHist.length >= 2) {
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
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
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
      if (sectors.length >= 3) capRateData = sectors;
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
          if (r.status === 'fulfilled' && r.value[1].length >= 2) {
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
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
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
        if (startsHist.length >= 6 || permitsHist.length >= 6) {
          supplyData = {
            housingStarts: { dates: startsHist.map(p => p.date.slice(0, 7)), values: startsHist.map(p => Math.round(p.value)) },
            permits:       { dates: permitsHist.map(p => p.date.slice(0, 7)), values: permitsHist.map(p => Math.round(p.value)) },
            monthsSupply:  monthsSupplyVal != null ? Math.round(monthsSupplyVal * 10) / 10 : null,
            activeListings: listingsVal != null ? Math.round(listingsVal) : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
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
        if (rentHist.length >= 6) {
          rentCpi = {
            dates: rentHist.map(p => p.date.slice(0, 7)),
            values: rentHist.map(p => Math.round(p.value * 10) / 10),
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
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
          if (quotes.length >= 20) {
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
    } catch (e) { console.warn('[RealEstate]', e.message || e); }

    let treasury10y = null;
    if (FRED_API_KEY) {
      try { trackApiCall('FRED'); treasury10y = await fetchFredLatest('DGS10', FRED_API_KEY); } catch (e) { console.warn('[RealEstate]', e.message || e); }
    }

    let existingHomeSales = null;
    let rentalVacancy = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [exhoHist, rrvResult] = await Promise.allSettled([
          fetchFredHistory('EXHOSLUSM495S', FRED_API_KEY, 24),
          fetchFredLatest('RRVRUSQ156N', FRED_API_KEY),
        ]);
        if (exhoHist.status === 'fulfilled' && exhoHist.value.length >= 2) {
          existingHomeSales = {
            dates:  exhoHist.value.map(p => p.date.slice(0, 7)),
            values: exhoHist.value.map(p => Math.round(p.value * 100) / 100),
          };
        }
        if (rrvResult.status === 'fulfilled' && rrvResult.value != null) {
          rentalVacancy = Math.round(rrvResult.value * 100) / 100;
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
    }

    const housingStarts = supplyData
      ? {
          dates:   supplyData.housingStarts.dates,
          starts:  supplyData.housingStarts.values,
          permits: supplyData.permits.values,
        }
      : null;

    const medianHomePrice = (affordabilityData?.history?.length >= 2)
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
          fetchFredHistory('LXXACBS0FRBR', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
          fetchFredHistory('DRSFRWBS', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
        ]);
        if (foreclosures.length >= 6 || delinquencies.length >= 6) {
          foreclosureData = {
            foreclosures: foreclosures.length >= 6 ? {
              dates: foreclosures.map(p => p.date.slice(0, 7)),
              values: foreclosures.map(p => Math.round(p.value * 100) / 100),
            } : null,
            delinquencies: delinquencies.length >= 6 ? {
              dates: delinquencies.map(p => p.date.slice(0, 7)),
              values: delinquencies.map(p => Math.round(p.value * 100) / 100),
            } : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
    }

    // MBA Applications data
    let mbaApplications = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [purchaseApps, refiApps] = await Promise.all([
          fetchFredHistory('MABMM301FRS', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
          fetchFredHistory('MABMM302FRS', FRED_API_KEY, 52).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
        ]);
        if (purchaseApps.length >= 6) {
          mbaApplications = {
            purchase: {
              dates: purchaseApps.map(p => p.date.slice(0, 7)),
              values: purchaseApps.map(p => Math.round(p.value)),
            },
            refi: refiApps.length >= 6 ? {
              dates: refiApps.map(p => p.date.slice(0, 7)),
              values: refiApps.map(p => Math.round(p.value)),
            } : null,
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
    }

    // CRE Delinquencies
    let creDelinquencies = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const creHist = await fetchFredHistory('BOGZ1FL404090060Q', FRED_API_KEY, 24).catch(e => { console.warn('[RealEstate]', e.message || e); return []; });
        if (creHist.length >= 4) {
          creDelinquencies = {
            dates: creHist.map(p => p.date.slice(0, 7)),
            values: creHist.map(p => Math.round(p.value * 100) / 100),
          };
        }
      } catch (e) { console.warn('[RealEstate]', e.message || e); }
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
    };

    const result = { reitData, priceIndexData, mortgageRates, affordabilityData, capRateData, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, existingHomeSales, rentalVacancy, housingStarts, medianHomePrice, foreclosureData, mbaApplications, creDelinquencies, _sources, lastUpdated: today };
    writeDailyCache('realEstate', result);
    cache.set(cacheKey, result, 900);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Real Estate API error:', error);
    const fallback = readLatestCache('realEstate');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
