// Enhanced commodities route mounted at /api/commodities/v2. This is the
// canonical endpoint the frontend DataProvider uses for the Commodities
// dashboard (EIA/World Bank/timestamp-aware). The legacy /api/commodities
// route (commodities.js) is kept only because MetricValue/sourceInfo links
// reference it for provenance "verify" buttons.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr, mergeWithPreviousCache } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';
import {
  commodityDataSources,
  getCommoditiesByCategory,
  getCommoditiesBySource,
  DATA_SOURCE_TIERS,
} from '../dataSources/commoditySources.js';

const router = Router();

// EIA Series Configuration (expanded)
const EIA_SERIES = {
  // Prices
  wti_price: { series: 'PET.RWTC.D', name: 'WTI Spot Price Cushing', unit: '$/bbl' },
  brent_price: { series: 'PET.RBRTE.D', name: 'Brent Europe', unit: '$/bbl' },
  henry_hub: { series: 'NG.RNGWHHD.D', name: 'Henry Hub Natural Gas', unit: '$/MMBtu' },

  // Refined Products
  gasoline_regular: { series: 'PET.EER_EPMRU_PF4_RGC_DPG.D', name: 'Regular Gasoline', unit: '$/gal' },
  diesel_uls: { series: 'PET.EER_EPD2DXL0_PFU_NUS_DPG.D', name: 'Ultra-Low Sulfur Diesel', unit: '$/gal' },
  heating_oil: { series: 'PET.EER_EPD2F_PF4_Y44NY_DPG.D', name: 'Heating Oil NY', unit: '$/gal' },
  jet_fuel: { series: 'PET.EER_EPK2_VFP_NUS_DPG.D', name: 'Kerosene Jet Fuel', unit: '$/gal' },
  propane: { series: 'PET.EER_EPLLPA_PF4_Y44RL_DPG.D', name: 'Propane Mont Belvieu', unit: '$/gal' },

  // Weekly Stocks/Inventories (series IDs verified against EIA v2 seriesid endpoint).
  // EIA returns these as thousand barrels (MBBL); we convert to million for UI.
  crude_stocks: { series: 'PET.WCESTUS1.W', name: 'Crude Oil Stocks excl SPR', unit: 'Million Barrels', scale: 0.001 },
  gasoline_stocks: { series: 'PET.WGTSTUS1.W', name: 'Total Gasoline Stocks', unit: 'Million Barrels', scale: 0.001 },
  distillate_stocks: { series: 'PET.WDISTUS1.W', name: 'Distillate Fuel Oil Stocks', unit: 'Million Barrels', scale: 0.001 },
  natgas_storage: { series: 'NG.NW2_EPG0_SWO_R48_BCF.W', name: 'Natural Gas Storage', unit: 'Bcf' },

  // Weekly Production (WCRFPUS1 retired → WCRFPUS2). EIA: thousand bbl/day → million.
  crude_production: { series: 'PET.WCRFPUS2.W', name: 'Field Production of Crude Oil', unit: 'Million Barrels/Day', scale: 0.001 },
  refinery_input: { series: 'PET.WCRRIUS2.W', name: 'Refinery Net Input', unit: 'Million Barrels/Day', scale: 0.001 },

  // Refinery Utilization
  refinery_utilization: { series: 'PET.WPULEUS3.W', name: 'Refinery Utilization', unit: 'Percent' },

  // Regional Prices
  gasoline_padd1: { series: 'PET.EER_EPMRU_PF4_Y35NY_DPG.D', name: 'Gasoline PADD 1 (NY)', unit: '$/gal' },
  gasoline_padd3: { series: 'PET.EER_EPMRU_PF4_Y35HO_DPG.D', name: 'Gasoline PADD 3 (Gulf)', unit: '$/gal' },
  gasoline_padd5: { series: 'PET.EER_EPMRU_PF4_Y35LA_DPG.D', name: 'Gasoline PADD 5 (CA)', unit: '$/gal' },
};

// FRED Commodity Series (expanded).
// Note: GOLDAMGBD228NLBM / GOLDPMGBD228NLBM were retired by FRED — gold is
// sourced from Yahoo GC=F futures on the dashboard instead.
// SLVPRUSD (London silver fix) was also discontinued; silver is Yahoo SI=F.
const FRED_COMMODITIES = {
  // Industrial Metals (World Bank Pink Sheet via FRED)
  copper: { series: 'PCOPPUSDM', name: 'Copper', unit: '$/mt' },
  aluminum: { series: 'PALUMUSDM', name: 'Aluminum', unit: '$/mt' },

  // Oil
  wti: { series: 'DCOILWTICO', name: 'WTI Crude', unit: '$/bbl' },
  brent: { series: 'DCOILBRENTEU', name: 'Brent Crude', unit: '$/bbl' },
  natgas: { series: 'DHHNGSP', name: 'Henry Hub Natural Gas', unit: '$/MMBtu' },

  // Agriculture
  corn: { series: 'PMAIZMTUSDM', name: 'Corn', unit: '$/mt' },
  wheat: { series: 'PWHEAMTUSDM', name: 'Wheat', unit: '$/mt' },
  soybeans: { series: 'PSOYBUSDM', name: 'Soybeans', unit: '$/mt' },
  rice: { series: 'PRICENPQUSDM', name: 'Rice', unit: '$/mt' },

  // Consumer prices
  gas_retail: { series: 'GASREGW', name: 'Regular Gasoline Retail', unit: '$/gal' },
  ppi_commodity: { series: 'PPIACO', name: 'PPI All Commodities', unit: 'Index' },
  dollarIndex: { series: 'DTWEXBGS', name: 'Trade Weighted USD', unit: 'Index' },
};

// World Bank Commodity Codes
const WORLD_BANK_COMMODITIES = [
  { code: 'WTI', name: 'Crude Oil (WTI)', category: 'Energy', unit: '$/bbl' },
  { code: 'BRENT', name: 'Crude Oil (Brent)', category: 'Energy', unit: '$/bbl' },
  { code: 'COAL_AUS', name: 'Coal (Australian)', category: 'Energy', unit: '$/mt' },
  { code: 'COAL_SA', name: 'Coal (South African)', category: 'Energy', unit: '$/mt' },
  { code: 'NATGAS_EU', name: 'Natural Gas (Europe)', category: 'Energy', unit: '$/mmbtu' },
  { code: 'NATGAS_US', name: 'Natural Gas (US)', category: 'Energy', unit: '$/mmbtu' },
  { code: 'LNG_JP', name: 'LNG (Japan)', category: 'Energy', unit: '$/mmbtu' },
  { code: 'GOLD', name: 'Gold', category: 'Metals', unit: '$/oz' },
  { code: 'SILVER', name: 'Silver', category: 'Metals', unit: '$/oz' },
  { code: 'PLATINUM', name: 'Platinum', category: 'Metals', unit: '$/oz' },
  { code: 'COPPER', name: 'Copper', category: 'Metals', unit: '$/mt' },
  { code: 'ALUMINUM', name: 'Aluminum', category: 'Metals', unit: '$/mt' },
  { code: 'IRON_ORE', name: 'Iron Ore', category: 'Metals', unit: '$/dry mt' },
  { code: 'LEAD', name: 'Lead', category: 'Metals', unit: '$/mt' },
  { code: 'NICKEL', name: 'Nickel', category: 'Metals', unit: '$/mt' },
  { code: 'TIN', name: 'Tin', category: 'Metals', unit: '$/mt' },
  { code: 'ZINC', name: 'Zinc', category: 'Metals', unit: '$/mt' },
  { code: 'WHEAT_US_SRW', name: 'Wheat (US SRW)', category: 'Agriculture', unit: '$/mt' },
  { code: 'WHEAT_US_HRW', name: 'Wheat (US HRW)', category: 'Agriculture', unit: '$/mt' },
  { code: 'MAIZE', name: 'Maize (Corn)', category: 'Agriculture', unit: '$/mt' },
  { code: 'SOYBEANS', name: 'Soybeans', category: 'Agriculture', unit: '$/mt' },
  { code: 'SOYBEAN_MEAL', name: 'Soybean Meal', category: 'Agriculture', unit: '$/mt' },
  { code: 'SOYBEAN_OIL', name: 'Soybean Oil', category: 'Agriculture', unit: '$/mt' },
  { code: 'RICE', name: 'Rice', category: 'Agriculture', unit: '$/mt' },
  { code: 'BARLEY', name: 'Barley', category: 'Agriculture', unit: '$/mt' },
  { code: 'SORGHUM', name: 'Sorghum', category: 'Agriculture', unit: '$/mt' },
  { code: 'COFFEE_ARABIC', name: 'Coffee (Arabica)', category: 'Agriculture', unit: '$/kg' },
  { code: 'COFFEE_ROBUSTA', name: 'Coffee (Robusta)', category: 'Agriculture', unit: '$/kg' },
  { code: 'COCOA', name: 'Cocoa', category: 'Agriculture', unit: '$/mt' },
  { code: 'TEA_AVG', name: 'Tea (Average)', category: 'Agriculture', unit: '$/kg' },
  { code: 'TEA_COLOMBO', name: 'Tea (Colombo)', category: 'Agriculture', unit: '$/kg' },
  { code: 'TEA_KOLKATA', name: 'Tea (Kolkata)', category: 'Agriculture', unit: '$/kg' },
  { code: 'TEA_MOMBASA', name: 'Tea (Mombasa)', category: 'Agriculture', unit: '$/kg' },
  { code: 'SUGAR_WLD', name: 'Sugar (World)', category: 'Agriculture', unit: '$/kg' },
  { code: 'SUGAR_EU', name: 'Sugar (EU)', category: 'Agriculture', unit: '$/kg' },
  { code: 'SUGAR_US', name: 'Sugar (US)', category: 'Agriculture', unit: '$/kg' },
  { code: 'COTTON_A_INDX', name: 'Cotton', category: 'Agriculture', unit: '$/kg' },
  { code: 'PALM_OIL', name: 'Palm Oil', category: 'Agriculture', unit: '$/mt' },
  { code: 'COCONUT_OIL', name: 'Coconut Oil', category: 'Agriculture', unit: '$/mt' },
  { code: 'GROUNDNUT_OIL', name: 'Groundnut Oil', category: 'Agriculture', unit: '$/mt' },
  { code: 'FISH_MEAL', name: 'Fish Meal', category: 'Agriculture', unit: '$/mt' },
  { code: 'BANANA_EU', name: 'Bananas (Europe)', category: 'Agriculture', unit: '$/kg' },
  { code: 'BANANA_US', name: 'Bananas (US)', category: 'Agriculture', unit: '$/kg' },
  { code: 'ORANGES', name: 'Oranges', category: 'Agriculture', unit: '$/mt' },
  { code: 'BEEF', name: 'Beef', category: 'Livestock', unit: '$/kg' },
  { code: 'CHICKEN', name: 'Chicken', category: 'Livestock', unit: '$/kg' },
  { code: 'LAMB', name: 'Lamb', category: 'Livestock', unit: '$/kg' },
  { code: 'SHRIMP', name: 'Shrimp', category: 'Livestock', unit: '$/kg' },
  { code: 'RUBBER_TSR20', name: 'Rubber (TSR20)', category: 'Agriculture', unit: '$/kg' },
  { code: 'RUBBER_RSS3', name: 'Rubber (RSS3)', category: 'Agriculture', unit: '$/kg' },
  { code: 'LOGS_CAMEROON', name: 'Logs (Cameroon)', category: 'Agriculture', unit: '$/cm' },
  { code: 'LOGS_MALAYSIA', name: 'Logs (Malaysia)', category: 'Agriculture', unit: '$/cm' },
  { code: 'SAWN_WOOD_MALAYSIA', name: 'Sawn Wood (Malaysia)', category: 'Agriculture', unit: '$/cm' },
  { code: 'PLYWOOD', name: 'Plywood', category: 'Agriculture', unit: '$/sheet' },
  { code: 'TOBACCO_US', name: 'Tobacco (US)', category: 'Agriculture', unit: '$/mt' },
];

// Fetch EIA data with timestamps
async function fetchEIAWithTimestamp(series, apiKey) {
  if (!apiKey) return null;

  // Infer frequency from series id suffix (.D / .W / .M). Forcing
  // frequency=daily on weekly inventory series often returns empty rows.
  const freq = series.endsWith('.W') ? 'weekly' : series.endsWith('.M') ? 'monthly' : 'daily';

  try {
    const url = `https://api.eia.gov/v2/seriesid/${series}?api_key=${apiKey}&frequency=${freq}&sort[0][column]=period&sort[0][direction]=desc&length=120`;
    trackApiCall('EIA');
    const data = await fetchJSON(url, undefined, {}, 15000);

    if (!data?.response?.data?.length) {
      // Retry without frequency filter (EIA is picky about some series)
      const url2 = `https://api.eia.gov/v2/seriesid/${series}?api_key=${apiKey}&length=120`;
      const data2 = await fetchJSON(url2, undefined, {}, 15000);
      if (!data2?.response?.data?.length) return null;
      return parseEiaRows(data2, freq);
    }

    return parseEiaRows(data, freq);
  } catch (e) {
    console.warn(`EIA fetch failed for ${series}:`, e.message);
    return null;
  }
}

function parseEiaRows(data, freq) {
  const rows = data.response.data
    .filter(r => r.value != null && r.value !== '')
    .map(r => ({ period: r.period, value: parseFloat(r.value) }))
    .filter(r => Number.isFinite(r.value))
    .sort((a, b) => new Date(a.period) - new Date(b.period));
  if (!rows.length) return null;
  const latest = rows[rows.length - 1];
  return {
    value: latest.value,
    date: latest.period,
    unit: data.response.data[0]?.units || data.response.data[0]?.unit || '',
    description: data.response.data[0]?.['series-description'] || data.response.data[0]?.seriesDescription || '',
    history: rows.slice(-52).map(r => ({ date: r.period, value: r.value })),
    _source: 'EIA',
    _lastUpdated: new Date().toISOString(),
    _updateFrequency: freq === 'weekly' ? 'Weekly' : freq === 'monthly' ? 'Monthly' : 'Daily',
    _dataAge: calculateDataAge(latest.period),
  };
}

// Fetch FRED data with timestamps
async function fetchFREDWithTimestamp(series, apiKey) {
  if (!apiKey) return null;

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=365`;
    trackApiCall('FRED');
    const data = await fetchJSON(url);

    if (!data?.observations?.length) return null;

    const valid = data.observations.filter(o => o.value !== '.');
    const sorted = valid.sort((a, b) => new Date(a.date) - new Date(b.date));
    const latest = sorted[sorted.length - 1];

    return {
      value: parseFloat(latest.value),
      date: latest.date,
      history: sorted.slice(-52).map(o => ({
        date: o.date,
        value: parseFloat(o.value),
      })),
      _source: 'FRED',
      _lastUpdated: new Date().toISOString(),
      _updateFrequency: 'Daily',
      _dataAge: calculateDataAge(latest.date),
    };
  } catch (e) {
    console.warn(`FRED fetch failed for ${series}:`, e.message);
    return null;
  }
}

// Fetch World Bank data (monthly prices)
async function fetchWorldBankData() {
  try {
    // World Bank provides a CSV/Excel download, not a REST API
    // We'll return metadata for now, actual data would need file parsing
    // Or use their generic commodity price API if available

    // Alternative: Use their documented API endpoint if available
    const url = 'https://www.worldbank.org/content/dam/commodities/2024/aug/CMO-Historical-Data-Monthly.xlsx';
    // In production, you'd download and parse this file

    // For now, return the commodity list with metadata
    return {
      commodities: WORLD_BANK_COMMODITIES,
      _source: 'World Bank',
      _updateFrequency: 'Monthly',
      _lastUpdated: new Date().toISOString(),
      _note: 'World Bank provides monthly data via downloadable files. REST API access limited.',
    };
  } catch (e) {
    console.warn('World Bank fetch failed:', e.message);
    return null;
  }
}

// Calculate how old the data is
function calculateDataAge(dateString) {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Format timestamp for display
function formatTimestamp(isoString) {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// Main commodities endpoint
router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const EIA_API_KEY = process.env.EIA_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'commodities_enhanced';
  const today = todayStr();

  const forceRefresh = req.query?.refresh === 'true' || req.query?.refresh === '1';
  // Check cache (skip when client requests a live refresh)
  if (!forceRefresh) {
    const daily = readDailyCache('commodities_enhanced');
    if (daily) {
      return res.json({
        ...daily,
        lastUpdated: today,
        fetchedOn: today,
        isCurrent: true,
        _meta: { source: 'daily_cache', timestamp: formatTimestamp(daily._timestamp) },
      });
    }

    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        ...cached,
        lastUpdated: today,
        fetchedOn: today,
        isCurrent: true,
        _meta: { source: 'memory_cache', timestamp: formatTimestamp(cached._timestamp) },
      });
    }
  } else if (cache) {
    cache.del(cacheKey);
  }

  try {
    const fetchStartTime = Date.now();
    const result = {
      _timestamp: new Date().toISOString(),
      _fetchDuration: null,
      _dataSources: ['EIA', 'FRED', 'World Bank', 'Yahoo Finance'],
      _dataTiers: {
        official: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        aggregator: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        calculated: DATA_SOURCE_TIERS.TIER_CALCULATED,
      },
    };

    // 1. EIA Energy Data (expanded)
    // Inventory/production series arrive as thousand barrels (EIA MBBL);
    // apply config.scale (0.001) so UI gets million barrels / M bbl/day.
    const eiaData = {};
    const eiaPromises = Object.entries(EIA_SERIES).map(async ([key, config]) => {
      const data = await fetchEIAWithTimestamp(config.series, EIA_API_KEY);
      if (data) {
        const scale = config.scale && Number.isFinite(config.scale) ? config.scale : 1;
        // Skip re-scale if cache/merge already applied million-barrel units
        // (crude stocks ~400 M, production ~13 M bbl/d).
        const alreadyScaled = scale !== 1 && Number.isFinite(data.value) && (
          (key.includes('production') || key.includes('input')) ? data.value < 100 : data.value < 2000
        );
        const s = alreadyScaled ? 1 : scale;
        const scaleV = (v) => (Number.isFinite(v) ? Math.round(v * s * 1000) / 1000 : v);
        const history = (data.history || []).map((h) => ({ ...h, value: scaleV(h.value) }));
        const avg = history.length
          ? history.reduce((a, b) => a + b.value, 0) / history.length
          : null;
        eiaData[key] = {
          ...data,
          value: scaleV(data.value),
          history,
          avg: avg != null ? Math.round(avg * 10) / 10 : null,
          name: config.name,
          unit: config.unit,
        };
      }
    });
    await Promise.allSettled(eiaPromises);
    result.eia = eiaData;

    // Compute Supply/Demand indicators (surplus/deficit)
    const supplyDemand = {
      crudeStocks: null,
      natGasStorage: null,
      crudeProduction: null,
      gasolineStocks: null,
      distillateStocks: null,
    };

    const computeAvg = (history) => {
      if (!history || history.length === 0) return null;
      const sum = history.reduce((a, b) => a + b.value, 0);
      return Math.round((sum / history.length) * 10) / 10;
    };

    if (eiaData.crude_stocks) {
      const val = eiaData.crude_stocks.value;
      const avg = eiaData.crude_stocks.avg ?? computeAvg(eiaData.crude_stocks.history);
      supplyDemand.crudeStocks = {
        periods: eiaData.crude_stocks.history.map(h => h.date),
        values: eiaData.crude_stocks.history.map(h => h.value),
        avg5yr: avg,
        latest: val,
      };
    }
    if (eiaData.natgas_storage) {
      const val = eiaData.natgas_storage.value;
      const avg = eiaData.natgas_storage.avg ?? computeAvg(eiaData.natgas_storage.history);
      supplyDemand.natGasStorage = {
        periods: eiaData.natgas_storage.history.map(h => h.date),
        values: eiaData.natgas_storage.history.map(h => h.value),
        avg5yr: avg,
        latest: val,
      };
    }
    if (eiaData.crude_production) {
      supplyDemand.crudeProduction = {
        periods: eiaData.crude_production.history.map(h => h.date),
        values: eiaData.crude_production.history.map(h => h.value),
        latest: eiaData.crude_production.value,
        avg5yr: eiaData.crude_production.avg ?? computeAvg(eiaData.crude_production.history),
      };
    }
    if (eiaData.gasoline_stocks) {
      const val = eiaData.gasoline_stocks.value;
      const avg = eiaData.gasoline_stocks.avg ?? computeAvg(eiaData.gasoline_stocks.history);
      supplyDemand.gasolineStocks = {
        periods: eiaData.gasoline_stocks.history.map(h => h.date),
        values: eiaData.gasoline_stocks.history.map(h => h.value),
        avg5yr: avg,
        latest: val,
      };
    }
    if (eiaData.distillate_stocks) {
      const val = eiaData.distillate_stocks.value;
      const avg = eiaData.distillate_stocks.avg ?? computeAvg(eiaData.distillate_stocks.history);
      supplyDemand.distillateStocks = {
        periods: eiaData.distillate_stocks.history.map(h => h.date),
        values: eiaData.distillate_stocks.history.map(h => h.value),
        avg5yr: avg,
        latest: val,
      };
    }
    result.supplyDemand = supplyDemand;

    // 2. FRED Commodity Data (expanded)
    const fredData = {};
    const fredPromises = Object.entries(FRED_COMMODITIES).map(async ([key, config]) => {
      const data = await fetchFREDWithTimestamp(config.series, FRED_API_KEY);
      if (data) {
        fredData[key] = {
          ...data,
          name: config.name,
          unit: config.unit,
        };
      }
    });
    await Promise.allSettled(fredPromises);
    result.fred = fredData;

    // 3. World Bank Commodity Coverage
    result.worldBank = await fetchWorldBankData();

    // 4. Yahoo Finance Data (futures + ETFs)
    const yahooData = {};
    try {
      trackApiCall('Yahoo Finance');
      const dbcQuote = await yf.quote(['DBC']);
      const dbc = Array.isArray(dbcQuote) ? dbcQuote[0] : dbcQuote;
      if (dbc?.regularMarketPrice) {
        yahooData.dbc = {
          symbol: 'DBC',
          name: 'Invesco DB Commodity Index Tracking Fund',
          price: dbc.regularMarketPrice,
          change: dbc.regularMarketChangePercent,
          changeValue: dbc.regularMarketChange,
          _source: 'Yahoo Finance',
          _lastUpdated: new Date().toISOString(),
          _updateFrequency: 'Real-time (delayed)',
          _dataAge: 'Live',
        };
      }
    } catch (e) {
      console.warn('Yahoo DBC fetch failed:', e.message);
    }

    // Fetch major commodity futures. Yahoo's batch quote() often returns empty
    // or null prices for continuous contracts (=F); fall back to per-symbol
    // chart closes so Sector Performance / Precious Metals / Regime still fill.
    const FUTURES_META = {
      'CL=F': { name: 'WTI Crude Oil', sector: 'Energy', unit: '$/bbl' },
      'BZ=F': { name: 'Brent Crude', sector: 'Energy', unit: '$/bbl' },
      'NG=F': { name: 'Natural Gas', sector: 'Energy', unit: '$/MMBtu' },
      'HO=F': { name: 'Heating Oil', sector: 'Energy', unit: '$/gal' },
      'GC=F': { name: 'Gold', sector: 'Precious Metals', unit: '$/oz' },
      'SI=F': { name: 'Silver', sector: 'Precious Metals', unit: '$/oz' },
      'PL=F': { name: 'Platinum', sector: 'Precious Metals', unit: '$/oz' },
      'PA=F': { name: 'Palladium', sector: 'Precious Metals', unit: '$/oz' },
      'HG=F': { name: 'Copper', sector: 'Industrial Metals', unit: '$/lb' },
      'ZC=F': { name: 'Corn', sector: 'Grains', unit: '¢/bu' },
      'ZW=F': { name: 'Wheat', sector: 'Grains', unit: '¢/bu' },
      'ZO=F': { name: 'Oats', sector: 'Grains', unit: '¢/bu' },
      'ZS=F': { name: 'Soybeans', sector: 'Grains', unit: '¢/bu' },
      'ZL=F': { name: 'Soybean Oil', sector: 'Grains', unit: '¢/lb' },
      'ZM=F': { name: 'Soybean Meal', sector: 'Grains', unit: '$/st' },
      'KC=F': { name: 'Coffee', sector: 'Softs', unit: '¢/lb' },
      'CT=F': { name: 'Cotton', sector: 'Softs', unit: '¢/lb' },
      'SB=F': { name: 'Sugar', sector: 'Softs', unit: '¢/lb' },
      'LE=F': { name: 'Live Cattle', sector: 'Livestock', unit: '¢/lb' },
      'GF=F': { name: 'Feeder Cattle', sector: 'Livestock', unit: '¢/lb' },
      'HE=F': { name: 'Lean Hogs', sector: 'Livestock', unit: '¢/lb' },
    };
    const futuresSymbols = Object.keys(FUTURES_META);
    const HEATMAP_SECTOR = {
      Energy: 'Energy',
      'Precious Metals': 'Metals',
      'Industrial Metals': 'Metals',
      Grains: 'Agriculture',
      Softs: 'Agriculture',
      Livestock: 'Livestock',
    };
    yahooData.futures = {};
    try {
      trackApiCall('Yahoo Finance');
      // Chunk quotes — large batches sometimes fail entirely on Yahoo.
      const chunkSize = 8;
      for (let i = 0; i < futuresSymbols.length; i += chunkSize) {
        const chunk = futuresSymbols.slice(i, i + chunkSize);
        try {
          const futuresQuotes = await yf.quote(chunk);
          const futuresArr = Array.isArray(futuresQuotes) ? futuresQuotes : [futuresQuotes];
          futuresArr.forEach(q => {
            if (!q?.symbol) return;
            yahooData.futures[q.symbol] = {
              symbol: q.symbol,
              name: FUTURES_META[q.symbol]?.name || q.shortName || q.longName || q.symbol,
              price: q.regularMarketPrice ?? null,
              change: q.regularMarketChangePercent ?? null,
              change1w: null,
              change1m: null,
              _source: 'Yahoo Finance',
              _lastUpdated: new Date().toISOString(),
              _updateFrequency: 'Real-time (delayed)',
            };
          });
        } catch (chunkErr) {
          console.warn('Yahoo futures quote chunk failed:', chunkErr.message);
        }
      }
    } catch (e) {
      console.warn('Yahoo futures fetch failed:', e.message);
    }

    // Chart fallback for missing prices / multi-day moves (same approach as legacy route).
    const needChart = futuresSymbols.filter(t => {
      const f = yahooData.futures[t];
      return !f || f.price == null || f.change == null;
    });
    if (needChart.length > 0) {
      const histStart = (() => { const d = new Date(); d.setDate(d.getDate() - 35); return d.toISOString().split('T')[0]; })();
      const histEnd = new Date().toISOString().split('T')[0];
      trackApiCall('Yahoo Finance');
      const chartResults = await Promise.allSettled(
        needChart.map(ticker =>
          yf.chart(ticker, { period1: histStart, period2: histEnd, interval: '1d' })
            .then(data => {
              const closes = (data.quotes || []).map(q => q.close).filter(v => v != null && Number.isFinite(v));
              return { ticker, closes };
            })
        )
      );
      for (const r of chartResults) {
        if (r.status !== 'fulfilled' || !r.value.closes?.length) continue;
        const { ticker, closes } = r.value;
        const len = closes.length;
        const last = closes[len - 1];
        const prev = len >= 2 ? closes[len - 2] : null;
        const change1d = prev != null && prev !== 0
          ? Math.round(((last - prev) / prev) * 10000) / 100
          : null;
        const change1w = len >= 6 && closes[len - 6]
          ? Math.round(((last - closes[len - 6]) / closes[len - 6]) * 1000) / 10
          : null;
        const change1m = len >= 2 && closes[0]
          ? Math.round(((last - closes[0]) / closes[0]) * 1000) / 10
          : null;
        const existing = yahooData.futures[ticker] || {};
        yahooData.futures[ticker] = {
          symbol: ticker,
          name: existing.name || FUTURES_META[ticker]?.name || ticker,
          price: existing.price ?? last,
          change: existing.change ?? change1d,
          change1w: existing.change1w ?? change1w,
          change1m: existing.change1m ?? change1m,
          _source: existing.price != null ? (existing._source || 'Yahoo Finance') : 'Yahoo Finance (chart)',
          _lastUpdated: new Date().toISOString(),
          _updateFrequency: 'Daily (chart fallback)',
        };
      }
    }

    // EIA/FRED fill for energy/ag when Yahoo still blank (spot series, not futures).
    const crossFill = [
      { ticker: 'CL=F', eia: 'wti_price', fred: 'wti' },
      { ticker: 'BZ=F', eia: 'brent_price', fred: 'brent' },
      { ticker: 'NG=F', eia: 'henry_hub', fred: 'natgas' },
      { ticker: 'HG=F', fred: 'copper' },
      { ticker: 'ZW=F', fred: 'wheat' },
      { ticker: 'ZC=F', fred: 'corn' },
      { ticker: 'ZS=F', fred: 'soybeans' },
    ];
    for (const row of crossFill) {
      const cur = yahooData.futures[row.ticker];
      if (cur?.price != null) continue;
      const eia = row.eia ? eiaData[row.eia] : null;
      const fred = row.fred ? fredData[row.fred] : null;
      const src = eia?.value != null ? eia : (fred?.value != null ? fred : null);
      if (!src) continue;
      yahooData.futures[row.ticker] = {
        symbol: row.ticker,
        name: FUTURES_META[row.ticker]?.name || row.ticker,
        price: src.value,
        change: null,
        change1w: null,
        change1m: null,
        _source: src._source || (eia ? 'EIA' : 'FRED'),
        _lastUpdated: src._lastUpdated || new Date().toISOString(),
        _updateFrequency: src._updateFrequency || 'Daily',
      };
    }

    result.yahoo = yahooData;

    // Pre-build UI dashboard shapes so clients don't depend solely on mapping
    // yahoo.futures (legacy panels + health placeholders read these fields).
    {
      const sectorOrder = ['Energy', 'Precious Metals', 'Industrial Metals', 'Grains', 'Softs', 'Livestock'];
      const sectorGroups = Object.fromEntries(sectorOrder.map(s => [s, []]));
      const heatmapRows = [];
      for (const [ticker, meta] of Object.entries(FUTURES_META)) {
        const q = yahooData.futures[ticker];
        if (!q || q.price == null) continue;
        const row = {
          ticker,
          name: meta.name,
          unit: meta.unit,
          price: q.price,
          change1d: q.change ?? null,
          change1w: q.change1w ?? null,
          change1m: q.change1m ?? null,
          _source: q._source,
          _lastUpdated: q._lastUpdated,
        };
        if (sectorGroups[meta.sector]) sectorGroups[meta.sector].push(row);
        heatmapRows.push({
          ticker,
          name: meta.name,
          sector: HEATMAP_SECTOR[meta.sector] || meta.sector,
          d1: q.change ?? null,
          w1: q.change1w ?? null,
          m1: q.change1m ?? null,
        });
      }
      result.priceDashboardData = sectorOrder
        .map(sector => ({ sector, commodities: sectorGroups[sector] }))
        .filter(s => s.commodities.length > 0);
      if (heatmapRows.length > 0) {
        result.sectorHeatmapData = { commodities: heatmapRows, columns: ['d1', 'w1', 'm1'] };
      }
    }

    // 4b. Futures-curve fetch — Yahoo lists each CME contract under its
    // own ticker (e.g. CLN26.NYM = WTI July 2026). Pull the next 6 months
    // of WTI and Gold so the Futures Curve panel has actual term-structure
    // data. Best-effort: any individual missing ticker just gets dropped.
    try {
      const monthCode = ['F','G','H','J','K','M','N','Q','U','V','X','Z']; // J F M A M J J A S O N D
      const buildContracts = (root, exch) => {
        const out = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
          out.push({ symbol: `${root}${monthCode[d.getMonth()]}${String(d.getFullYear()).slice(-2)}.${exch}`, label: d.toLocaleString('en-US',{month:'short'}) + " '" + String(d.getFullYear()).slice(-2) });
        }
        return out;
      };
      const wtiContracts = buildContracts('CL', 'NYM');
      const gcContracts  = buildContracts('GC', 'CMX');
      trackApiCall('Yahoo Finance');
      const allSymbols = [...wtiContracts, ...gcContracts].map(c => c.symbol);
      const curveQuotes = await yf.quote(allSymbols).catch(() => null);
      const curveArr = Array.isArray(curveQuotes) ? curveQuotes : (curveQuotes ? [curveQuotes] : []);
      const findPrice = (sym) => {
        const p = curveArr.find(q => q?.symbol === sym)?.regularMarketPrice;
        return typeof p === 'number' && Number.isFinite(p) ? p : null;
      };
      // Drop months Yahoo doesn't quote (expired / not listed) so the UI
      // never gets a leading null that breaks contango / spot KPIs.
      const packCurve = (contracts, unit, spotPrice) => {
        const pairs = contracts
          .map(c => ({ label: c.label, price: findPrice(c.symbol) }))
          .filter(p => p.price != null);
        if (!pairs.length) return null;
        const prices = pairs.map(p => p.price);
        const spot = typeof spotPrice === 'number' && Number.isFinite(spotPrice)
          ? spotPrice
          : prices[0];
        // Full-curve slope (back vs front), same basis as FuturesCurve spreadPct.
        let contangoPct = null;
        if (prices.length >= 2 && prices[0]) {
          contangoPct = Math.round(((prices[prices.length - 1] / prices[0]) - 1) * 1000) / 10;
        }
        return {
          labels: pairs.map(p => p.label),
          prices,
          unit,
          spotPrice: spot,
          contangoPct,
          structure: contangoPct == null ? null
            : contangoPct > 0.35 ? 'Contango'
            : contangoPct < -0.35 ? 'Backwardation'
            : 'Flat',
        };
      };
      const clSpot = yahooData.futures?.['CL=F']?.price ?? null;
      const gcSpot = yahooData.futures?.['GC=F']?.price ?? null;
      const wtiCurve = packCurve(wtiContracts, '$/bbl', clSpot);
      const goldCurve = packCurve(gcContracts, '$/oz', gcSpot);
      if (wtiCurve) {
        result.futuresCurveData = wtiCurve;
        if (wtiCurve.contangoPct != null) {
          result.contangoIndicator = {
            contangoPct: wtiCurve.contangoPct,
            structure: wtiCurve.structure,
          };
        }
      }
      if (goldCurve) result.goldFuturesCurve = goldCurve;
    } catch (e) { console.warn('[Commodities] futures curve fetch failed:', e.message); }

    // 5. Data Source Registry
    result.dataSourceRegistry = {
      totalCommodities: Object.keys(commodityDataSources).length,
      byCategory: {},
      bySource: {
        EIA: Object.keys(EIA_SERIES).length,
        FRED: Object.keys(FRED_COMMODITIES).length,
        WorldBank: WORLD_BANK_COMMODITIES.length,
        Yahoo: 'Variable (futures)',
      },
    };

    // Count by category
    for (const [key, data] of Object.entries(commodityDataSources)) {
      result.dataSourceRegistry.byCategory[data.category] = (result.dataSourceRegistry.byCategory[data.category] || 0) + 1;
    }

    // Calculate fetch duration
    result._fetchDuration = `${(Date.now() - fetchStartTime) / 1000}s`;

    const hasData = v => v != null && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
    result._sources = {
      eia:       hasData(eiaData),
      fred:      hasData(fredData),
      yahoo:     hasData(yahooData),
      worldBank: hasData(result.worldBank),
    };

    // Metadata for timestamps
    result._meta = {
      fetchedAt: formatTimestamp(result._timestamp),
      dataFreshness: {
        eia: 'Daily (lag 1 day)',
        fred: 'Daily (variable lag)',
        worldBank: 'Monthly (2-3 month lag)',
        yahoo: 'Real-time (15 min delay)',
      },
      apiKeysConfigured: {
        eia: !!EIA_API_KEY,
        fred: !!FRED_API_KEY,
      },
    };

    // Preserve previously-good FRED/EIA fields if this pass hit rate limits.
    const merged = mergeWithPreviousCache('commodities_enhanced', result);
    writeDailyCache('commodities_enhanced', merged);
    cache.set(cacheKey, merged, 1800); // 30 minutes

    res.json({
      ...merged,
      lastUpdated: today,
      fetchedOn: today,
      isCurrent: true,
    });

  } catch (error) {
    console.error('Commodities API error:', error);
    return sendCachedOrDegradedSync(res, 'commodities_enhanced', {
      error,
      memoryCache: req.app.locals.cache,
      cacheKey: 'commodities_enhanced',
      extra: {
        _error: 'fetch_failed',
        _meta: { source: 'fallback_cache', note: 'Using cached data due to error' },
        _timestamp: new Date().toISOString(),
      },
    });
  }
});

// Get specific commodity with source information
router.get('/commodity/:key', async (req, res) => {
  const { key } = req.params;
  const commodity = commodityDataSources[key];

  if (!commodity) {
    return res.status(404).json({
      error: 'Commodity not found',
      available: Object.keys(commodityDataSources),
      _timestamp: new Date().toISOString(),
    });
  }

  res.json({
    key,
    ...commodity,
    _timestamp: new Date().toISOString(),
    _meta: {
      message: 'This endpoint returns metadata. Use /api/commodities for live data.',
      sourcesAvailable: commodity.sources.length,
      primarySource: commodity.sources.find(s => !s.fallback)?.source || 'None',
    },
  });
});

// Get data source coverage summary
router.get('/coverage', (req, res) => {
  const coverage = {
    _timestamp: new Date().toISOString(),
    summary: {
      totalCommodities: Object.keys(commodityDataSources).length,
      byCategory: {},
      byDataSource: {},
      byUpdateFrequency: {},
    },
    details: {},
  };

  // Calculate coverage
  for (const [key, data] of Object.entries(commodityDataSources)) {
    // By category
    coverage.summary.byCategory[data.category] = coverage.summary.byCategory[data.category] || { count: 0, commodities: [] };
    coverage.summary.byCategory[data.category].count++;
    coverage.summary.byCategory[data.category].commodities.push(key);

    // By source
    for (const source of data.sources) {
      coverage.summary.byDataSource[source.source] = coverage.summary.byDataSource[source.source] || { count: 0, tier: source.tier };
      coverage.summary.byDataSource[source.source].count++;

      // By frequency
      const freq = source.frequency?.label || 'Unknown';
      coverage.summary.byUpdateFrequency[freq] = coverage.summary.byUpdateFrequency[freq] || 0;
      coverage.summary.byUpdateFrequency[freq]++;
    }

    // Add to details
    coverage.details[key] = {
      name: data.name,
      category: data.category,
      unit: data.unit,
      sources: data.sources.map(s => ({
        source: s.source,
        tier: s.tier,
        frequency: s.frequency?.label,
        fallback: s.fallback || false,
      })),
    };
  }

  res.json(coverage);
});

export default router;
