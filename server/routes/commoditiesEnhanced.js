// Enhanced commodities route with EIA, World Bank, and timestamp support
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
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

  // Weekly Stocks/Inventories
  crude_stocks: { series: 'PET.WCRSTUS1.W', name: 'Crude Oil Stocks', unit: 'Million Barrels' },
  gasoline_stocks: { series: 'PET.WGSTUS1.W', name: 'Gasoline Stocks', unit: 'Million Barrels' },
  distillate_stocks: { series: 'PET.WDFTUUS1.W', name: 'Distillate Fuel Stocks', unit: 'Million Barrels' },
  natgas_storage: { series: 'NG.NW2_EPG0_SWO_R48_BCF.W', name: 'Natural Gas Storage', unit: 'Bcf' },

  // Weekly Production
  crude_production: { series: 'PET.WCRFPUS1.W', name: 'Field Production of Crude Oil', unit: 'Thousand Barrels/Day' },
  refinery_input: { series: 'PET.WCRRIUS2.W', name: 'Refinery Net Input', unit: 'Thousand Barrels/Day' },

  // Refinery Utilization
  refinery_utilization: { series: 'PET.WPULEUS3.W', name: 'Refinery Utilization', unit: 'Percent' },

  // Regional Prices
  gasoline_padd1: { series: 'PET.EER_EPMRU_PF4_Y35NY_DPG.D', name: 'Gasoline PADD 1 (NY)', unit: '$/gal' },
  gasoline_padd3: { series: 'PET.EER_EPMRU_PF4_Y35HO_DPG.D', name: 'Gasoline PADD 3 (Gulf)', unit: '$/gal' },
  gasoline_padd5: { series: 'PET.EER_EPMRU_PF4_Y35LA_DPG.D', name: 'Gasoline PADD 5 (CA)', unit: '$/gal' },
};

// FRED Commodity Series (expanded)
const FRED_COMMODITIES = {
  // Precious Metals
  gold_am: { series: 'GOLDAMGBD228NLBM', name: 'Gold London AM', unit: '$/oz' },
  gold_pm: { series: 'GOLDPMGBD228NLBM', name: 'Gold London PM', unit: '$/oz' },
  silver: { series: 'SILVERUSDQB', name: 'Silver', unit: '$/oz' },

  // Industrial Metals
  copper: { series: 'PCOPP', name: 'Copper', unit: 'Index 2010=100' },
  aluminum: { series: 'PALUM', name: 'Aluminum', unit: 'Index 2010=100' },

  // Oil
  wti: { series: 'DCOILWTICO', name: 'WTI Crude', unit: '$/bbl' },
  brent: { series: 'DCOILBRENTEU', name: 'Brent Crude', unit: '$/bbl' },
  natgas: { series: 'DHHNGSP', name: 'Henry Hub Natural Gas', unit: '$/MMBtu' },

  // Agriculture
  corn: { series: 'PMAIZMTUSDM', name: 'Corn', unit: '$/mt' },
  wheat: { series: 'PWHEAMTUSDM', name: 'Wheat', unit: '$/mt' },
  soybeans: { series: 'PSOYBUSDM', name: 'Soybeans', unit: '$/mt' },
  rice: { series: 'PRICENPQUSDM', name: 'Rice', unit: '$/mt' },

  // Livestock
  beef: { series: 'PBEEFUSDQ', name: 'Beef', unit: '$/kg' },
  poultry: { series: 'PPOULTUSDQ', name: 'Poultry', unit: '$/kg' },

  // Consumer prices
  gas_retail: { series: 'GASREGW', name: 'Regular Gasoline Retail', unit: '$/gal' },
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

  try {
    const url = `https://api.eia.gov/v2/seriesid/${series}?api_key=${apiKey}&frequency=daily&sort[0][column]=period&sort[0][direction]=desc&length=365`;
    trackApiCall('EIA');
    const data = await fetchJSON(url);

    if (!data?.response?.data?.length) return null;

    const rows = data.response.data.sort((a, b) => new Date(a.period) - new Date(b.period));
    const latest = rows[rows.length - 1];

    return {
      value: parseFloat(latest.value),
      date: latest.period,
      unit: data.response.data[0]?.unit || '',
      description: data.response.data[0]?.seriesDescription || '',
      history: rows.slice(-52).map(r => ({
        date: r.period,
        value: parseFloat(r.value),
      })),
      _source: 'EIA',
      _lastUpdated: new Date().toISOString(),
      _updateFrequency: 'Daily',
      _dataAge: calculateDataAge(latest.period),
    };
  } catch (e) {
    console.warn(`EIA fetch failed for ${series}:`, e.message);
    return null;
  }
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

  // Check cache
  const daily = readDailyCache('commodities_enhanced');
  if (daily) {
    return res.json({
      ...daily,
      fetchedOn: today,
      isCurrent: true,
      _meta: { source: 'daily_cache', timestamp: formatTimestamp(daily._timestamp) },
    });
  }

  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({
      ...cached,
      fetchedOn: today,
      isCurrent: true,
      _meta: { source: 'memory_cache', timestamp: formatTimestamp(cached._timestamp) },
    });
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
    const eiaData = {};
    const eiaPromises = Object.entries(EIA_SERIES).map(async ([key, config]) => {
      const data = await fetchEIAWithTimestamp(config.series, EIA_API_KEY);
      if (data) {
        eiaData[key] = {
          ...data,
          name: config.name,
          unit: config.unit,
        };
      }
    });
    await Promise.allSettled(eiaPromises);
    result.eia = eiaData;

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
      // Fetch DBC (commodity ETF) for broad exposure
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

      // Fetch major commodity futures - expanded coverage
      const futuresSymbols = [
        'CL=F',   // Crude Oil
        'BZ=F',   // Brent Crude
        'GC=F',   // Gold
        'SI=F',   // Silver
        'PL=F',   // Platinum
        'PA=F',   // Palladium
        'NG=F',   // Natural Gas
        'ZC=F',   // Corn
        'ZW=F',   // Wheat
        'ZO=F',   // Oats
        'ZS=F',   // Soybeans
        'ZL=F',   // Soybean Oil
        'ZM=F',   // Soybean Meal
        'KC=F',   // Coffee
        'CT=F',   // Cotton
        'SB=F',   // Sugar
        'LE=F',   // Live Cattle
        'GF=F',   // Feeder Cattle
        'HE=F',   // Lean Hogs
        'HG=F',   // Copper
        'HO=F',   // Heating Oil
      ];
      trackApiCall('Yahoo Finance');
      const futuresQuotes = await yf.quote(futuresSymbols);
      const futuresArr = Array.isArray(futuresQuotes) ? futuresQuotes : [futuresQuotes];

      yahooData.futures = {};
      futuresArr.forEach(q => {
        if (q?.symbol) {
          yahooData.futures[q.symbol] = {
            symbol: q.symbol,
            name: q.shortName || q.longName,
            price: q.regularMarketPrice,
            change: q.regularMarketChangePercent,
            _source: 'Yahoo Finance',
            _lastUpdated: new Date().toISOString(),
            _updateFrequency: 'Real-time (delayed)',
          };
        }
      });
    } catch (e) {
      console.warn('Yahoo Finance fetch failed:', e.message);
    }
    result.yahoo = yahooData;

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

    // Cache the result
    writeDailyCache('commodities_enhanced', result);
    cache.set(cacheKey, result, 1800); // 30 minutes

    res.json({
      ...result,
      fetchedOn: today,
      isCurrent: true,
    });

  } catch (error) {
    console.error('Commodities API error:', error);

    const fallback = readLatestCache('commodities_enhanced');
    if (fallback) {
      return res.json({
        ...fallback.data,
        fetchedOn: fallback.fetchedOn,
        isCurrent: false,
        _error: error.message,
        _meta: { source: 'fallback_cache', note: 'Using cached data due to error' },
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      _timestamp: new Date().toISOString(),
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
