// server/lib/fred.js
// Shared FRED API utilities to eliminate code duplication across routes

const FRED_API_KEY = process.env.FRED_API_KEY || 'fred';
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

/**
 * Fetch historical observations for a FRED series
 * @param {string} seriesId - FRED series ID (e.g., 'DGS10', 'VIXCLS')
 * @param {object} options - Optional parameters
 * @param {number} options.years - Number of years of history (default: 5)
 * @param {string} options.frequency - Data frequency (e.g., 'd', 'w', 'm')
 * @returns {Promise<{dates: string[], values: number[]}>}
 */
async function fetchFredHistory(seriesId, options = {}) {
  const { years = 5, frequency } = options;
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - years * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: 'json',
    observation_start: startDate,
    observation_end: endDate,
  });

  if (frequency) params.append('frequency', frequency);

  const response = await fetch(`${FRED_BASE_URL}?${params}`);
  const data = await response.json();

  if (!data.observations) {
    return { dates: [], values: [] };
  }

  const dates = [];
  const values = [];

  for (const obs of data.observations) {
    if (obs.value !== '.' && obs.value !== null) {
      dates.push(obs.date);
      values.push(parseFloat(obs.value));
    }
  }

  return { dates, values };
}

/**
 * Fetch the latest value for a FRED series
 * @param {string} seriesId - FRED series ID
 * @returns {Promise<number|null>}
 */
async function fetchFredLatest(seriesId) {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: 'json',
    sort_order: 'desc',
    limit: '1',
  });

  const response = await fetch(`${FRED_BASE_URL}?${params}`);
  const data = await response.json();

  if (!data.observations || data.observations.length === 0) {
    return null;
  }

  const value = data.observations[0].value;
  return value === '.' ? null : parseFloat(value);
}

/**
 * Fetch multiple FRED series in parallel
 * @param {string[]} seriesIds - Array of FRED series IDs
 * @param {object} options - Options passed to fetchFredHistory
 * @returns {Promise<Object<string, {dates: string[], values: number[]}>>}
 */
async function fetchFredMultiple(seriesIds, options = {}) {
  const results = await Promise.all(
    seriesIds.map(async (id) => {
      const data = await fetchFredHistory(id, options);
      return [id, data];
    })
  );

  return Object.fromEntries(results);
}

/**
 * Fetch latest values for multiple FRED series
 * @param {string[]} seriesIds - Array of FRED series IDs
 * @returns {Promise<Object<string, number|null>>}
 */
async function fetchFredLatestMultiple(seriesIds) {
  const results = await Promise.all(
    seriesIds.map(async (id) => {
      const value = await fetchFredLatest(id);
      return [id, value];
    })
  );

  return Object.fromEntries(results);
}

/**
 * Shared series constants - fetched across multiple markets
 * Centralize here to prevent duplicate API calls
 */
const SHARED_SERIES = {
  // Volatility (fetched by bonds, derivatives, sentiment, globalMacro)
  VIXCLS: 'VIXCLS',

  // Credit Spreads (fetched by credit, insurance, sentiment)
  HY_OAS: 'BAMLH0A0HYM2',
  IG_OAS: 'BAMLC0A0CM',

  // Treasury Yields (fetched by bonds, realEstate, insurance, derivatives)
  DGS2: 'DGS2',
  DGS10: 'DGS10',
  DGS30: 'DGS30',
  DGS3MO: 'DGS3MO',

  // Yield Curve Spreads
  T10Y2Y: 'T10Y2Y',
  T10Y3M: 'T10Y3M',
  T5Y30Y: 'T5Y30Y',

  // Dollar Index
  DTWEXBGS: 'DTWEXBGS',

  // Money Supply
  M2SL: 'M2SL',
  WALCL: 'WALCL', // Fed Balance Sheet

  // Inflation
  CPIAUCSL: 'CPIAUCSL',
  PCEPI: 'PCEPI',
};

// Cache for shared data (in-memory, with TTL)
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Get cached data or fetch if expired
 * @param {string} key - Cache key
 * @param {Function} fetcher - Function to fetch data if not cached
 * @returns {Promise<any>}
 */
async function getCached(key, fetcher) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Pre-fetch common series and cache them
 * Call this at server startup for optimal performance
 */
async function warmCache() {
  console.log('Warming FRED cache for shared series...');
  const commonSeries = [
    SHARED_SERIES.VIXCLS,
    SHARED_SERIES.DGS10,
    SHARED_SERIES.DGS2,
    SHARED_SERIES.HY_OAS,
    SHARED_SERIES.IG_OAS,
    SHARED_SERIES.T10Y2Y,
  ];

  await Promise.all(
    commonSeries.map(seriesId =>
      getCached(`fred:${seriesId}:history`, () => fetchFredHistory(seriesId))
        .catch(() => null)
    )
  );

  console.log('FRED cache warmed.');
}

module.exports = {
  fetchFredHistory,
  fetchFredLatest,
  fetchFredMultiple,
  fetchFredLatestMultiple,
  getCached,
  warmCache,
  SHARED_SERIES,
};