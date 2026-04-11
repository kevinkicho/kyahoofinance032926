// Unified data fetcher with tiered fallback system and timestamp tracking
import { commodityDataSources, DATA_SOURCE_TIERS, UPDATE_FREQUENCIES } from './commoditySources.js';
import { fetchJSON } from '../lib/fetch.js';
import { yf } from '../lib/yahoo.js';

// Data freshness manager
class DataFreshnessManager {
  constructor() {
    this.timestamps = new Map();
  }

  getTimestamp(commodityKey, source) {
    const key = `${commodityKey}:${source}`;
    return this.timestamps.get(key) || null;
  }

  setTimestamp(commodityKey, source) {
    const key = `${commodityKey}:${source}`;
    this.timestamps.set(key, new Date());
  }

  getAgeMinutes(commodityKey, source) {
    const timestamp = this.getTimestamp(commodityKey, source);
    if (!timestamp) return Infinity;
    return (Date.now() - timestamp.getTime()) / (1000 * 60);
  }

  isFresh(commodityKey, source, frequency) {
    const age = this.getAgeMinutes(commodityKey, source);
    const maxAge = frequency?.maxAgeMinutes || UPDATE_FREQUENCIES.DAILY.maxAgeMinutes;
    return age < maxAge;
  }
}

const freshnessManager = new DataFreshnessManager();

// Source-specific fetch functions
const sourceFetchers = {
  // EIA API
  async EIA(series, apiKey) {
    if (!apiKey) throw new Error('EIA_API_KEY not configured');

    const url = `https://api.eia.gov/v2/seriesid/${series}?api_key=${apiKey}&frequency=daily`;
    const data = await fetchJSON(url);

    if (!data?.response?.data?.length) {
      throw new Error('No data returned from EIA');
    }

    const rows = data.response.data;
    const sorted = rows.sort((a, b) => new Date(a.period) - new Date(b.period));
    const latest = sorted[sorted.length - 1];

    return {
      value: parseFloat(latest.value),
      date: latest.period,
      history: sorted.slice(-52).map(r => ({
        date: r.period,
        value: parseFloat(r.value),
      })),
      metadata: {
        unit: data.response.data[0]?.unit || '',
        seriesDescription: data.response.data[0]?.seriesDescription || '',
      },
    };
  },

  // FRED API
  async FRED(series, apiKey) {
    if (!apiKey) throw new Error('FRED_API_KEY not configured');

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=252`;
    const data = await fetchJSON(url);

    if (!data?.observations?.length) {
      throw new Error('No data returned from FRED');
    }

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
      metadata: {
        seriesId: series,
      },
    };
  },

  // World Bank API
  async WorldBank(code) {
    // World Bank commodity API
    const url = `https://www.worldbank.org/content/dam/commodities/2024/aug/CMO-Historical-Data-${code}.xlsx`;
    // Note: World Bank doesn't have a simple REST API for commodities
    // They provide Excel downloads. For now, we'll use a workaround
    // or fall back to cached data

    // Alternative: Use their price data JSON endpoint if available
    const pricesUrl = 'https://www.worldbank.org/en/research/commodity-markets';

    // For now, return cached/calculated data
    // In production, you'd parse their published data files
    throw new Error('World Bank requires data file parsing - using fallback');
  },

  // Yahoo Finance (until May 1st)
  async Yahoo(symbol) {
    try {
      const quote = await yf.quote(symbol);
      const q = Array.isArray(quote) ? quote[0] : quote;

      if (!q?.regularMarketPrice) {
        throw new Error('No price data from Yahoo');
      }

      // Get historical data for chart
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let history = [];
      try {
        const chart = await yf.chart(symbol, { period1: start, period2: end, interval: '1d' });
        history = (chart.quotes || [])
          .filter(q => q.close != null)
          .map(q => ({
            date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : q.date,
            value: q.close,
          }));
      } catch {
        // History not critical
      }

      return {
        value: q.regularMarketPrice,
        date: new Date().toISOString().split('T')[0],
        change: q.regularMarketChangePercent,
        history: history.slice(-52),
        metadata: {
          symbol,
          name: q.shortName || q.longName,
          currency: q.currency,
        },
      };
    } catch (error) {
      throw new Error(`Yahoo fetch failed: ${error.message}`);
    }
  },
};

// Main unified fetch function with fallback chain
export async function fetchCommodityData(commodityKey, config = {}) {
  const {
    eiaApiKey,
    fredApiKey,
    preferRealtime = false,
    maxRetries = 3,
  } = config;

  const commodity = commodityDataSources[commodityKey];
  if (!commodity) {
    return {
      success: false,
      error: `Unknown commodity: ${commodityKey}`,
      timestamp: new Date().toISOString(),
    };
  }

  const result = {
    commodity: commodityKey,
    name: commodity.name,
    category: commodity.category,
    unit: commodity.unit,
    timestamp: new Date().toISOString(),
    data: null,
    source: null,
    freshness: null,
    fallbackUsed: false,
    errors: [],
  };

  // Sort sources by priority
  const sources = [...commodity.sources].sort((a, b) => {
    if (preferRealtime) {
      // Prioritize real-time sources
      const aRealtime = a.frequency === UPDATE_FREQUENCIES.REALTIME;
      const bRealtime = b.frequency === UPDATE_FREQUENCIES.REALTIME;
      if (aRealtime !== bRealtime) return bRealtime - aRealtime;
    }
    // Then by fallback status
    return (a.fallback ? 1 : 0) - (b.fallback ? 1 : 0);
  });

  // Try each source in order
  for (const sourceConfig of sources) {
    const { source, series, symbol, frequency, description } = sourceConfig;

    try {
      // Check if we have fresh cached data
      if (freshnessManager.isFresh(commodityKey, source, frequency)) {
        console.log(`Using cached data for ${commodityKey} from ${source}`);
        // In a real implementation, you'd return cached data here
      }

      // Fetch from source
      console.log(`Fetching ${commodityKey} from ${source}...`);
      let data;

      switch (source) {
        case 'EIA':
          data = await sourceFetchers.EIA(series, eiaApiKey);
          break;
        case 'FRED':
          data = await sourceFetchers.FRED(series, fredApiKey);
          break;
        case 'WorldBank':
          data = await sourceFetchers.WorldBank(series);
          break;
        case 'Yahoo':
          data = await sourceFetchers.Yahoo(symbol);
          break;
        default:
          throw new Error(`Unknown source: ${source}`);
      }

      // Success! Update timestamp and return
      freshnessManager.setTimestamp(commodityKey, source);

      result.data = data;
      result.source = {
        name: source,
        tier: sourceConfig.tier,
        frequency: frequency?.label || 'Unknown',
        description,
        isFallback: sourceConfig.fallback || false,
      };
      result.freshness = {
        asOf: data.date,
        updateFrequency: frequency?.label || 'Unknown',
        dataAge: data.date
          ? Math.round((Date.now() - new Date(data.date).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
          : 'Unknown',
      };
      result.success = true;

      return result;

    } catch (error) {
      console.warn(`Failed to fetch ${commodityKey} from ${source}: ${error.message}`);
      result.errors.push({
        source,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // Mark that we're using fallback
      if (sourceConfig.fallback) {
        result.fallbackUsed = true;
      }
    }
  }

  // All sources failed
  result.success = false;
  result.error = 'All data sources failed';
  return result;
}

// Batch fetch multiple commodities
export async function fetchCommodityBatch(commodityKeys, config = {}) {
  const results = await Promise.allSettled(
    commodityKeys.map(key => fetchCommodityData(key, config))
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      commodity: commodityKeys[i],
      success: false,
      error: result.reason?.message || 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  });
}

// Get data coverage summary
export function getDataCoverageSummary() {
  const summary = {
    total: Object.keys(commodityDataSources).length,
    byCategory: {},
    bySource: {},
    byTier: {},
  };

  for (const [key, data] of Object.entries(commodityDataSources)) {
    // By category
    summary.byCategory[data.category] = (summary.byCategory[data.category] || 0) + 1;

    // By source and tier
    for (const source of data.sources) {
      summary.bySource[source.source] = (summary.bySource[source.source] || 0) + 1;
      summary.byTier[source.tier] = (summary.byTier[source.tier] || 0) + 1;
    }
  }

  return summary;
}

// Export freshness manager for external use
export { freshnessManager };
