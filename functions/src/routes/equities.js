import { Router } from 'express';
import { yf, chunkArray } from '../lib/yahoo.js';
import { getYahooTicker, mapToYahooTicker } from '../lib/stocks.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchJSON } from '../lib/fetch.js';
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

async function fetchUsdRates() {
  try {
    trackApiCall('Frankfurter');
    const data = await fetchJSON('https://api.frankfurter.dev/v1/latest?base=USD');
    return data?.rates ? { USD: 1, ...data.rates } : { USD: 1 };
  } catch (e) {
    console.warn('[equities] FX rates unavailable:', e?.message || e);
    return { USD: 1 };
  }
}

function normalizeQuote(quote, originalTicker, meta, usdRates) {
  const quoteCurrency = quote.currency || meta?.currency || null;
  const fxRate = quoteCurrency === 'USD' ? 1 : usdRates?.[quoteCurrency];
  const marketCapNative = quote.marketCap ?? null;
  const marketCapUsdB = marketCapNative != null && fxRate
    ? marketCapNative / fxRate / 1e9
    : null;

  return {
    ticker: originalTicker,
    yahooSymbol: quote.symbol,
    name: quote.longName || quote.shortName || originalTicker,
    currency: quoteCurrency,
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
    marketCap: marketCapNative,
    marketCapUsdB,
    marketCapFxRate: fxRate || null,
    marketCapSource: marketCapUsdB != null ? 'Yahoo Finance + Frankfurter FX' : 'Yahoo Finance native',
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
        currency: region.currency || null,
        staticMarketCapB: stock.marketCap ?? null,
      });
    }
  }
  return rows
    .sort((a, b) => (b.staticMarketCapB || 0) - (a.staticMarketCapB || 0))
    .slice(0, totalLimit);
}

async function fetchQuoteMap(items, usdRates = { USD: 1 }) {
  const out = {};
  const tickers = items.map(item => (typeof item === 'string' ? item : item.ticker));
  const missing = new Set(tickers);
  const yahooToOriginal = {};
  const originalToMeta = {};
  const yahooTickers = items.map(item => {
    const ticker = typeof item === 'string' ? item : item.ticker;
    const region = typeof item === 'string' ? null : item.region;
    const y = region ? getYahooTicker(ticker, region) : mapToYahooTicker(ticker);
    yahooToOriginal[y] = ticker;
    originalToMeta[ticker] = typeof item === 'string' ? null : item;
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
        out[original] = normalizeQuote(quote, original, originalToMeta[original], usdRates);
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
    const usdRates = await fetchUsdRates();
    const [{ quotes, missing }, { quotes: indices, missing: missingIndices }] = await Promise.all([
      fetchQuoteMap(universe, usdRates),
      fetchQuoteMap(INDEX_TICKERS),
    ]);

    const now = new Date().toISOString();
    const received = Object.keys(quotes).length;
    const required = equityTickers.length;
    const indexReceived = Object.keys(indices).length;
    const quoteCoverage = required ? received / required : 0;
    const indexCoverageOk = indexReceived >= Math.ceil(INDEX_TICKERS.length * 0.75);
    const status = quoteCoverage >= 0.85 && indexCoverageOk
      ? (missing.length || missingIndices.length ? 'partial' : 'ok')
      : quoteCoverage >= 0.5 && indexCoverageOk
        ? 'partial'
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
        fxBase: 'USD',
        fxSource: 'Frankfurter',
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
