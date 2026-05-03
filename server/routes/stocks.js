import { Router } from 'express';
import { yf, cryptoYahoo, cryptoStrip, chunkArray } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

// Leading `^` is valid for Yahoo index tickers (^GSPC, ^IXIC, ^DJI, ^RUT, ^VIX, ...).
const TICKER_RE = /^[A-Z0-9^][A-Z0-9.\-^=]{0,15}$/;
const MAX_TICKERS = 500;

router.post('/', async (req, res) => {
  const { tickers } = req.body;
  if (!tickers || !Array.isArray(tickers)) return res.status(400).json({ error: 'Tickers array required' });
  if (tickers.length === 0) return res.status(400).json({ error: 'Empty tickers array' });
  if (tickers.length > MAX_TICKERS) return res.status(400).json({ error: `Too many tickers (max ${MAX_TICKERS})` });
  if (!tickers.every(t => typeof t === 'string' && TICKER_RE.test(t))) {
    return res.status(400).json({ error: 'Invalid ticker in array' });
  }

  const cache = req.app.locals.cache;

  try {
    const cachedData = {};
    const missingTickers = [];
    tickers.forEach(t => {
      const val = cache.get(t);
      if (val) cachedData[t] = val;
      else missingTickers.push(t);
    });

    if (missingTickers.length > 0) {
      const yahooTickers = missingTickers.map(cryptoYahoo);
      const chunks = chunkArray(yahooTickers, 100);
      for (const chunk of chunks) {
        try {
          trackApiCall('Yahoo Finance');
          const results = await yf.quote(chunk);
          const arr = Array.isArray(results) ? results : [results];
          arr.forEach(quote => {
            if (!quote) return;
            const originalTicker = cryptoStrip(quote.symbol);
            const normalized = {
              ticker: originalTicker,
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
            cache.set(originalTicker, normalized);
            cachedData[originalTicker] = normalized;
          });
        } catch (chunkError) {
          console.error(`Error fetching chunk:`, chunkError.message);
        }
      }
    }
    const yahooCount = Object.keys(cachedData).length;
    const sources = { yahooQuotes: true, count: yahooCount };
    res.set('X-Data-Sources', JSON.stringify(sources));
    res.json({ ...cachedData, _sources: sources });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// /factors previously returned Math.random()-generated values, which silently
// violated the no-mock-data policy. No free factor-data API is wired up yet,
// so the endpoint now returns an empty list with _sources.factorsLive=false
// and the UI renders "—" via its standard empty-state path.
router.get('/factors', async (_req, res) => {
  res.json({ factors: [], _sources: { factorsLive: false } });
});

router.get('/stats', async (req, res) => {
  try {
    const cache = req.app.locals.cache;
    const allData = Array.from(cache.values?.() || []).filter(v => v && v.ticker && v.changePct != null);

    const advancers = allData.filter(v => v.changePct > 0).length;
    const decliners = allData.filter(v => v.changePct < 0).length;
    const unchanged = allData.filter(v => v.changePct === 0).length;
    const newHighs = allData.filter(v => v.price != null && v.weekHigh52 != null && Math.abs(v.price - v.weekHigh52) / v.weekHigh52 < 0.02).length;
    const newLows  = allData.filter(v => v.price != null && v.weekLow52  != null && Math.abs(v.price - v.weekLow52)  / v.weekLow52  < 0.02).length;

    res.json({ advancers, decliners, unchanged, newHighs, newLows, _sources: { stocksStats: true } });
  } catch (e) {
    console.error('[stocks/stats]', e.message);
    res.status(500).json({ error: 'Failed to compute stats' });
  }
});

export default router;
