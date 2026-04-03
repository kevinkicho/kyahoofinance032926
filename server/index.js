import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import YahooFinance from 'yahoo-finance2';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'stocks');

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

const app = express();
const port = 3001;
const cache = new NodeCache({ stdTTL: 900 }); // 15 min default

app.use(cors());
app.use(express.json());

// --- Helper: read local cached JSON for a ticker ---
function readLocalData(ticker) {
  try {
    const file = path.join(DATA_DIR, `${ticker}.json`);
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  return null;
}

// --- Helper: fetch a URL as JSON ---
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
  res.json({ status: 'ok', timestamp: new Date(), dataDir: DATA_DIR });
});

// --- Yahoo Finance Stock Proxy (live quotes for price/change) ---
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
          const results = await yf.quote(chunk);
          const arr = Array.isArray(results) ? results : [results];
          arr.forEach(quote => {
            if (!quote) return;
            const normalized = {
              ticker: quote.symbol,
              name: quote.longName || quote.shortName,
              currency: quote.currency,
              price: quote.regularMarketPrice,
              change: quote.regularMarketChange,
              changePct: quote.regularMarketChangePercent,
              open: quote.regularMarketOpen,
              prevClose: quote.regularMarketPreviousClose,
              dayHigh: quote.regularMarketDayHigh,
              dayLow: quote.regularMarketDayLow,
              bid: quote.bid,
              bidSize: quote.bidSize,
              ask: quote.ask,
              askSize: quote.askSize,
              volume: quote.regularMarketVolume,
              avgVolume: quote.averageDailyVolume3Month,
              marketCap: quote.marketCap,
              weekHigh52: quote.fiftyTwoWeekHigh,
              weekLow52: quote.fiftyTwoWeekLow,
              pe: quote.trailingPE,
              eps: quote.epsTrailingTwelveMonths,
              forwardPE: quote.forwardPE,
              beta: quote.beta,
              dividendYield: quote.dividendYield,
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

// --- FRED Macro Indicators ---
const FRED_SERIES = {
  M1: 'M1SL',
  M2: 'M2SL',
  CPI: 'CPIAUCSL',
  FFR: 'FEDFUNDS',
  UNEMP: 'UNRATE',
  GDP: 'GDP',
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

    cache.set(cacheKey, results, 3600);
    res.json(results);
  } catch (error) {
    console.error('FRED API Error:', error);
    res.status(500).json({ error: 'Failed to fetch macro data' });
  }
});

// --- Quote Summary: local cache first, then live Yahoo ---
app.get('/api/summary/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const cacheKey = `summary_${ticker}`;
  const memCached = cache.get(cacheKey);
  if (memCached) return res.json(memCached);

  // Try local data first
  const local = readLocalData(ticker);
  if (local?.summary) {
    cache.set(cacheKey, local.summary, 1800);
    return res.json(local.summary);
  }

  // Fall back to live Yahoo
  try {
    const data = await yf.quoteSummary(ticker, {
      modules: [
        'financialData',
        'defaultKeyStatistics',
        'earningsTrend',
        'recommendationTrend',
        'majorHoldersBreakdown',
        'incomeStatementHistory',
        'cashflowStatementHistory',
        'balanceSheetHistory',
      ]
    });
    cache.set(cacheKey, data, 1800);
    res.json(data);
  } catch (error) {
    console.error(`Summary error for ${ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Historical Prices: local cache first, then live Yahoo ---
app.get('/api/history/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const period = req.query.period || '1y';
  const cacheKey = `history_${ticker}_${period}`;
  const memCached = cache.get(cacheKey);
  if (memCached) return res.json(memCached);

  // Try local data first
  const local = readLocalData(ticker);
  if (local?.history?.length) {
    // Filter to requested period
    const cutoff = new Date();
    if (period === '5y') cutoff.setFullYear(cutoff.getFullYear() - 5);
    else if (period === '3y') cutoff.setFullYear(cutoff.getFullYear() - 3);
    else if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
    else cutoff.setFullYear(cutoff.getFullYear() - 1); // 1y default
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filtered = local.history.filter(d => d.date >= cutoffStr);
    cache.set(cacheKey, filtered, 3600);
    return res.json(filtered);
  }

  // Fall back to live Yahoo
  try {
    const end = new Date();
    const start = new Date();
    if (period === '5y') start.setFullYear(start.getFullYear() - 5);
    else if (period === '3y') start.setFullYear(start.getFullYear() - 3);
    else if (period === '3m') start.setMonth(start.getMonth() - 3);
    else start.setFullYear(start.getFullYear() - 1);

    const data = await yf.historical(ticker, {
      period1: start.toISOString().split('T')[0],
      period2: end.toISOString().split('T')[0],
      interval: '1d',
    });

    const result = data.map(d => ({
      date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error) {
    console.error(`History error for ${ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  const files = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).length : 0;
  console.log(`Global Macro Backend running at http://localhost:${port}`);
  console.log(`  Local data cache: ${files} tickers in ${DATA_DIR}`);
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro  /api/summary/:t  /api/history/:t`);
});
