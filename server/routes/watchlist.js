import express from 'express';
import { todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { yf } from '../lib/yahoo.js';

const router = express.Router();

// Leading `^` is valid for Yahoo index tickers (^GSPC, ^IXIC, ^DJI, ^RUT, ^VIX, ...).
const TICKER_RE = /^[A-Z0-9^][A-Z0-9.\-^=]{0,15}$/;
const MAX_TICKERS = 100;

// DataProvider GETs every market endpoint. Default basket so watchlist
// panels have a real quote stream on first paint (not empty []).
const DEFAULT_TICKERS = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'AGG', 'GLD', 'TLT', 'XLK', 'XLF'];

function normalizeQuotes(results) {
  const arr = Array.isArray(results) ? results : results ? [results] : [];
  return arr
    .filter(Boolean)
    .map(q => ({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      name: q.shortName || q.longName,
      marketCap: q.marketCap,
      weekHigh52: q.fiftyTwoWeekHigh,
      weekLow52: q.fiftyTwoWeekLow,
    }))
    .filter(q => q.symbol && q.price != null);
}

async function fetchQuotes(tickers) {
  trackApiCall('Yahoo Finance', tickers.length);
  // yahoo-finance2 v3: instance method is quote() (not quotes)
  const results = await yf.quote(tickers);
  return normalizeQuotes(results);
}

router.get('/', async (_req, res) => {
  try {
    const quotes = await fetchQuotes(DEFAULT_TICKERS);
    res.json({
      quotes,
      _sources: { yahooFinance: quotes.length > 0 },
      lastUpdated: new Date().toISOString(),
      fetchedOn: todayStr(),
      isLive: quotes.length > 0,
      isCurrent: quotes.length > 0,
    });
  } catch (err) {
    console.error('[Watchlist API] GET default fetch error:', err.message);
    res.json({
      quotes: [],
      _sources: { yahooFinance: false },
      lastUpdated: new Date().toISOString(),
      fetchedOn: todayStr(),
      isLive: false,
      isCurrent: false,
      error: err.message,
    });
  }
});

router.post('/', async (req, res) => {
  const { tickers } = req.body;
  if (!tickers || !Array.isArray(tickers)) {
    return res.status(400).json({ error: 'Invalid request: tickers array required' });
  }
  if (tickers.length === 0) {
    return res.status(400).json({ error: 'tickers array is empty' });
  }
  if (tickers.length > MAX_TICKERS) {
    return res.status(400).json({ error: `Too many tickers (max ${MAX_TICKERS})` });
  }
  if (!tickers.every(t => typeof t === 'string' && TICKER_RE.test(t))) {
    return res.status(400).json({ error: 'Invalid ticker in array' });
  }

  try {
    const quotes = await fetchQuotes(tickers);
    res.json({
      quotes,
      _sources: { yahooFinance: quotes.length > 0 },
      lastUpdated: new Date().toISOString(),
      fetchedOn: todayStr(),
      isLive: quotes.length > 0,
      isCurrent: quotes.length > 0,
    });
  } catch (err) {
    console.error('[Watchlist API] Batch fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch batch quotes' });
  }
});

export default router;
