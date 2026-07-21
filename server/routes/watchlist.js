import express from 'express';
import yahooFinance from 'yahoo-finance2';
import { todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = express.Router();

// Leading `^` is valid for Yahoo index tickers (^GSPC, ^IXIC, ^DJI, ^RUT, ^VIX, ...).
const TICKER_RE = /^[A-Z0-9^][A-Z0-9.\-^=]{0,15}$/;
const MAX_TICKERS = 100;

// DataProvider does an initial GET on every market endpoint (see
// fetchAllMarkets in src/hub/DataProvider.jsx). Without a GET handler
// here the request fell through to the static fallback which returns
// dist/index.html → DataProvider's JSON.parse blew up → the whole
// initial-fetch wave threw "Unexpected token '<'" and dropped sibling
// markets too. Empty-but-valid JSON keeps the wave alive; the actual
// quotes still flow through the POST handler when WatchlistMarket
// pushes its localStorage tickers.
const DEFAULT_TICKERS = ['SPY','QQQ','IWM','EFA','EEM','AGG','GLD','TLT','XLK','XLF'];

router.get('/', async (_req, res) => {
  try {
    trackApiCall('Yahoo Finance', DEFAULT_TICKERS.length);
    const results = await yahooFinance.quotes(DEFAULT_TICKERS);

    const quotes = results.map(q => ({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      name: q.shortName || q.longName,
      marketCap: q.marketCap,
      weekHigh52: q.fiftyTwoWeekHigh,
      weekLow52: q.fiftyTwoWeekLow,
    }));

    res.json({
      quotes,
      _sources: { yahooFinance: true },
      lastUpdated: new Date().toISOString(),
      fetchedOn: todayStr(),
      isLive: true,
      isCurrent: true,
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
    trackApiCall('Yahoo Finance', tickers.length);
    const results = await yahooFinance.quotes(tickers);

    const quotes = results.map(q => ({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent,
      name: q.shortName || q.longName,
      marketCap: q.marketCap,
      weekHigh52: q.fiftyTwoWeekHigh,
      weekLow52: q.fiftyTwoWeekLow,
    }));

    res.json({
      quotes,
      _sources: { yahooFinance: true },
      lastUpdated: new Date().toISOString(),
      fetchedOn: todayStr(),
      isLive: true,
      isCurrent: true,
    });
  } catch (err) {
    console.error('[Watchlist API] Batch fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch batch quotes' });
  }
});

export default router;
