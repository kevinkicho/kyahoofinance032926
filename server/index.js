const express = require('express');
const cors = require('cors');
const yahooFinance = require('yahoo-finance2').default;
const NodeCache = require('node-cache');
const https = require('https');

const app = express();
const port = 3001;
const cache = new NodeCache({ stdTTL: 900 }); // 15 minute cache

app.use(cors());
app.use(express.json());

// --- Helper: fetch a URL as JSON (promisified) ---
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// --- Yahoo Finance Stock Proxy ---
app.post('/api/stocks', async (req, res) => {
  const { tickers } = req.body;
  if (!tickers || !Array.isArray(tickers)) return res.status(400).json({ error: 'Tickers array required' });

  try {
    const cachedData = {};
    const missingTickers = [];
    tickers.forEach(t => {
      const val = cache.get(t);
      if (val) cachedData[t] = val;
      else missingTickers.push(t);
    });

    if (missingTickers.length > 0) {
      const chunks = chunkArray(missingTickers, 100);
      for (const chunk of chunks) {
        try {
          const results = await yahooFinance.quote(chunk);
          const arr = Array.isArray(results) ? results : [results];
          arr.forEach(quote => {
            if (!quote) return;
            const normalized = {
              ticker: quote.symbol,
              price: quote.regularMarketPrice,
              change: quote.regularMarketChange,
              changePct: quote.regularMarketChangePercent,
              marketCap: quote.marketCap,
              currency: quote.currency,
              volume: quote.regularMarketVolume,
              name: quote.longName || quote.shortName
            };
            cache.set(quote.symbol, normalized);
            cachedData[quote.symbol] = normalized;
          });
        } catch (chunkError) {
          console.error(`Error fetching chunk:`, chunkError.message);
        }
      }
    }
    res.json(cachedData);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- FRED Macro Indicators Proxy ---
// Fetches from FRED without an API key using the public observation endpoint
const FRED_SERIES = {
  M1: 'M1SL',          // M1 Money Supply (Billions USD)
  M2: 'M2SL',          // M2 Money Supply (Billions USD)
  CPI: 'CPIAUCSL',     // Consumer Price Index
  FFR: 'FEDFUNDS',     // Fed Funds Rate
  UNEMP: 'UNRATE',     // Unemployment Rate
  GDP: 'GDP',          // Nominal GDP
};

app.get('/api/macro', async (req, res) => {
  const cacheKey = 'fred_macro';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const baseUrl = 'https://fred.stlouisfed.org/graph/fredgraph.json?id=';
    const results = {};

    await Promise.allSettled(
      Object.entries(FRED_SERIES).map(async ([key, seriesId]) => {
        try {
          const data = await fetchJSON(`${baseUrl}${seriesId}`);
          if (data && Array.isArray(data)) {
            // FRED returns [{date, value}], take last 2 entries for trend
            const recent = data.filter(d => d.value !== '.').slice(-2);
            results[key] = {
              seriesId,
              latest: parseFloat(recent[recent.length - 1]?.value),
              prev: parseFloat(recent[recent.length - 2]?.value),
              date: recent[recent.length - 1]?.date
            };
          }
        } catch (e) {
          console.warn(`FRED fetch failed for ${seriesId}:`, e.message);
        }
      })
    );

    cache.set(cacheKey, results, 3600); // cache 1 hour
    res.json(results);
  } catch (error) {
    console.error('FRED API Error:', error);
    res.status(500).json({ error: 'Failed to fetch macro data' });
  }
});

app.listen(port, () => {
  console.log(`Global Macro Backend running at http://localhost:${port}`);
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro`);
});
