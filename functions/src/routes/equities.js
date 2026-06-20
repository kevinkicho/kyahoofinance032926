import { Router } from 'express';
import { yf, chunkArray } from '../lib/yahoo.js';
import { getYahooTicker, mapToYahooTicker } from '../lib/stocks.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { stockUniverseData } from '../data/stockUniverse.js';

const router = Router();

const INDEX_TICKERS_US = ['^GSPC', '^IXIC', '^DJI', '^RUT'];
const INDEX_TICKERS_INTL = ['^STOXX50E', '^GDAXI', '^FTSE', '^FCHI', '^N225', '^NSEI', '^AXJO'];
const INDEX_TICKERS_CN = ['^HSI', '000300.SS', '000001.SS', '399001.SZ', 'KSTR', 'ASHR', 'FXI'];
const INDEX_TICKERS_RISK = ['^VIX', '^TNX', 'DX=F', 'GC=F'];
const INDEX_TICKERS_SECTORS = ['XLK', 'XLF', 'XLE', 'XLV'];
const INDEX_TICKERS = [
  ...INDEX_TICKERS_US,
  ...INDEX_TICKERS_INTL,
  ...INDEX_TICKERS_CN,
  ...INDEX_TICKERS_RISK,
  ...INDEX_TICKERS_SECTORS,
];

const DEFAULT_PER_MARKET_LIMIT = 50;
const MAX_PER_MARKET_LIMIT = 50;
const MAX_TOTAL_LIMIT = 1000;

function normalizeQuote(quote, originalTicker) {
  return {
    ticker: originalTicker,
    yahooSymbol: quote.symbol,
    name: quote.longName || quote.shortName || originalTicker,
    currency: quote.currency || null,
    price: quote.regularMarketPrice ?? null,
    change: quote.regularMarketChange ?? null,
    changePct: quote.regularMarketChangePercent ?? null,
    open: quote.regularMarketOpen ?? null,
    prevClose: quote.regularMarketPreviousClose ?? null,
    dayHigh: quote.regularMarketDayHigh ?? null,
    dayLow: quote.regularMarketDayLow ?? null,
    bid: quote.bid ?? null,
    bidSize: quote.bidSize ?? null,
    ask: quote.ask ?? null,
    askSize: quote.askSize ?? null,
    volume: quote.regularMarketVolume ?? null,
    avgVolume: quote.averageDailyVolume3Month ?? null,
    marketCap: quote.marketCap ?? null,
    weekHigh52: quote.fiftyTwoWeekHigh ?? null,
    weekLow52: quote.fiftyTwoWeekLow ?? null,
    pe: quote.trailingPE ?? null,
    eps: quote.epsTrailingTwelveMonths ?? null,
    forwardPE: quote.forwardPE ?? null,
    beta: quote.beta ?? null,
    dividendYield: quote.dividendYield ?? null,
  };
}

function getCanonicalUniverse(perMarketLimit, totalLimit = MAX_TOTAL_LIMIT) {
  const seen = new Set();
  const rows = [];
  for (const region of stockUniverseData) {
    const ranked = [...(region.children || [])]
      .filter(stock => stock?.name && stock.sector !== 'Crypto')
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, perMarketLimit);

    for (const stock of ranked) {
      if (!stock?.name || stock.sector === 'Crypto') continue;
      if (seen.has(stock.name)) continue;
      seen.add(stock.name);
      rows.push({
        ticker: stock.name,
        fullName: stock.fullName || stock.name,
        region: region.name,
        sector: stock.sector || 'Other',
        staticMarketCapB: stock.marketCap ?? null,
      });
    }
  }
  return rows
    .sort((a, b) => (b.staticMarketCapB || 0) - (a.staticMarketCapB || 0))
    .slice(0, totalLimit);
}

async function fetchQuoteMap(items) {
  const out = {};
  const tickers = items.map(item => (typeof item === 'string' ? item : item.ticker));
  const missing = new Set(tickers);
  const yahooToOriginal = {};
  const yahooTickers = items.map(item => {
    const ticker = typeof item === 'string' ? item : item.ticker;
    const region = typeof item === 'string' ? null : item.region;
    const y = region ? getYahooTicker(ticker, region) : mapToYahooTicker(ticker);
    yahooToOriginal[y] = ticker;
    return y;
  });

  for (const chunk of chunkArray(yahooTickers, 80)) {
    try {
      trackApiCall('Yahoo Finance');
      const result = await yf.quote(chunk);
      const arr = Array.isArray(result) ? result : [result];
      for (const quote of arr) {
        if (!quote?.symbol) continue;
        const original = yahooToOriginal[quote.symbol] || quote.symbol;
        out[original] = normalizeQuote(quote, original);
        missing.delete(original);
      }
    } catch (e) {
      console.warn('[equities] quote chunk failed:', e?.message || e);
    }
  }

  return { quotes: out, missing: [...missing] };
}

router.get('/', async (req, res) => {
  const rawPerMarketLimit = Number(req.query.perMarketLimit ?? req.query.limit);
  const perMarketLimit = Number.isFinite(rawPerMarketLimit)
    ? Math.max(1, Math.min(MAX_PER_MARKET_LIMIT, Math.floor(rawPerMarketLimit)))
    : DEFAULT_PER_MARKET_LIMIT;

  const rawTotalLimit = Number(req.query.totalLimit);
  const totalLimit = Number.isFinite(rawTotalLimit)
    ? Math.max(1, Math.min(MAX_TOTAL_LIMIT, Math.floor(rawTotalLimit)))
    : MAX_TOTAL_LIMIT;

  try {
    const universe = getCanonicalUniverse(perMarketLimit, totalLimit);
    const equityTickers = universe.map(s => s.ticker);
    const [{ quotes, missing }, { quotes: indices, missing: missingIndices }] = await Promise.all([
      fetchQuoteMap(universe),
      fetchQuoteMap(INDEX_TICKERS),
    ]);

    const now = new Date().toISOString();
    const received = Object.keys(quotes).length;
    const required = equityTickers.length;
    const indexReceived = Object.keys(indices).length;
    const status = received >= Math.ceil(required * 0.85) && indexReceived >= Math.ceil(INDEX_TICKERS.length * 0.75)
      ? (missing.length || missingIndices.length ? 'partial' : 'ok')
      : 'failed';

    res.json({
      marketId: 'equities',
      status,
      fetchedAt: now,
      fetchedOn: now.slice(0, 10),
      lastUpdated: now.slice(0, 10),
      universe: {
        version: 'stockUniverseData',
        requested: required,
        received,
        perMarketLimit,
        totalLimit,
        regions: stockUniverseData.length,
        tickers: equityTickers,
        metadata: universe,
      },
      indices,
      quotes,
      coverage: {
        required,
        received,
        missing,
        byRegion: universe.reduce((acc, item) => {
          if (quotes[item.ticker]) acc[item.region] = (acc[item.region] || 0) + 1;
          return acc;
        }, {}),
        indicesRequired: INDEX_TICKERS.length,
        indicesReceived: indexReceived,
        missingIndices,
      },
      _sources: {
        yahooQuotes: { _source: true, count: received },
        yahooIndexQuotes: { _source: true, count: indexReceived },
        stockUniverse: { _source: true, version: 'src/data/stockUniverse.js' },
      },
    });
  } catch (e) {
    console.error('[equities]', e?.message || e);
    res.status(500).json({
      marketId: 'equities',
      status: 'failed',
      error: e?.message || 'Failed to fetch equities snapshot',
      fetchedAt: new Date().toISOString(),
      _sources: { yahooQuotes: false },
    });
  }
});

export default router;
