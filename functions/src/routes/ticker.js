import { Router } from 'express';
import { yf } from '../lib/yahoo.js';
import { readBestFile, readLocalData, adaptCompact, periodCutoff, snapshotIndex, snapshotBuilding, buildSnapshotIndex, REGION_SUFFIX, getYahooTicker } from '../lib/stocks.js';

const router = Router();

// Yahoo tickers: allow market-local symbols used by the global heatmap
// before region suffix translation (e.g. M&M, BT/A, MRK_DE, ^GSPC).
const TICKER_RE = /^[A-Z0-9^][A-Z0-9._/&\-^=]{0,24}$/;
const isValidTicker = (t) => typeof t === 'string' && TICKER_RE.test(t);
const VALID_REGION_ALIASES = new Set(['USA (NYSE & NASDAQ)']);
const isValidRegion = (r) => (
  r === ''
  || VALID_REGION_ALIASES.has(r)
  || Object.prototype.hasOwnProperty.call(REGION_SUFFIX, r)
);

// GET /api/summary/:ticker
router.get('/summary/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const region = req.query.region || '';
  if (!isValidTicker(ticker)) return res.status(400).json({ error: 'Invalid ticker' });
  if (!isValidRegion(region)) return res.status(400).json({ error: 'Invalid region' });
  const cache = req.app.locals.cache;
  const cacheKey = `summary_${ticker}`;
  const memCached = cache.get(cacheKey);
  if (memCached) return res.json(memCached);

  const resolved = readBestFile(ticker, region);
  if (resolved?.data?.summary) {
    cache.set(cacheKey, resolved.data.summary, 1800);
    const sources = { yahooSummary: true, cached: false };
    res.set('X-Data-Sources', JSON.stringify(sources));
    return res.json({ ...resolved.data.summary, _sources: sources });
  }
  const local = readLocalData(ticker);
  if (local?.summary) {
    cache.set(cacheKey, local.summary, 1800);
    return res.json({ ...local.summary, _sources: { yahooSummary: true, cached: true } });
  }

  try {
    const yahooTicker = getYahooTicker(ticker, region);
    const data = await yf.quoteSummary(yahooTicker, {
      modules: ['financialData','defaultKeyStatistics','earningsTrend',
                'recommendationTrend','majorHoldersBreakdown',
                'incomeStatementHistory','cashflowStatementHistory','balanceSheetHistory']
    });
    cache.set(cacheKey, data, 1800);
    const sources = { yahooSummary: true, cached: false };
    res.set('X-Data-Sources', JSON.stringify(sources));
    res.json({ ...data, _sources: sources });
  } catch (error) {
    console.warn(`Summary unavailable for ${ticker}: ${error.message}`);
    res.status(404).json({ error: `No summary data for ${ticker}`, ticker });
  }
});

// GET /api/history/:ticker
router.get('/history/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const period = req.query.period || '1y';
  const region = req.query.region || '';
  if (!isValidTicker(ticker)) return res.status(400).json({ error: 'Invalid ticker' });
  if (!isValidRegion(region)) return res.status(400).json({ error: 'Invalid region' });
  if (!['3m', '1y', '3y', '5y'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period (allowed: 3m, 1y, 3y, 5y)' });
  }
  const cache = req.app.locals.cache;
  const cacheKey = `history_${ticker}_${period}_${region}`;
  const memCached = cache.get(cacheKey);
  if (memCached) return res.json(memCached);

  const cutoffStr = periodCutoff(period);
  const today = new Date().toISOString().split('T')[0];

  const resolved = readBestFile(ticker, region);
  if (resolved) {
    let rows;
    if (resolved.format === 'ohlcv' && resolved.data?.history?.length) {
      rows = resolved.data.history.filter(d => d.date >= cutoffStr);
    } else if (resolved.format === 'compact' && resolved.data?.t?.length) {
      rows = adaptCompact(resolved.data, cutoffStr);
    }
    if (rows?.length) {
      const lastDate = rows[rows.length - 1].date;
      const staleDays = Math.floor((Date.parse(today) - Date.parse(lastDate)) / 86400000);
      if (staleDays >= 2) {
        try {
          const deltaStart = new Date(Date.parse(lastDate) + 86400000).toISOString().split('T')[0];
          const yahooTicker = getYahooTicker(ticker, region);
          const delta = await yf.historical(yahooTicker, { period1: deltaStart, period2: today, interval: '1d' });
          const deltaRows = (delta || []).map(d => ({
            date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
            open: d.open, high: d.high, low: d.low, close: d.close, volume: d.volume,
          })).filter(r => r.date > lastDate);
          if (deltaRows.length) rows = [...rows, ...deltaRows];
        } catch (e) {
          console.warn(`History delta fetch failed for ${ticker}: ${e.message}`);
        }
      }
      cache.set(cacheKey, rows, 3600);
      return res.json(rows);
    }
  }

  try {
    const end = new Date();
    const start = new Date();
    if (period === '5y') start.setFullYear(start.getFullYear() - 5);
    else if (period === '3y') start.setFullYear(start.getFullYear() - 3);
    else if (period === '3m') start.setMonth(start.getMonth() - 3);
    else start.setFullYear(start.getFullYear() - 1);

    // yahoo-finance2's `historical()` is deprecated and routes internally
    // to `chart()`, but the auto-mapping returns just 1 row for some
    // foreign-listed tickers (e.g. 000688.SS / STAR 50). Calling chart()
    // directly with explicit period1/period2/interval returns the full
    // window consistently.
    const yahooTicker = getYahooTicker(ticker, region);
    const chartData = await yf.chart(yahooTicker, {
      period1: start.toISOString().split('T')[0],
      period2: end.toISOString().split('T')[0],
      interval: '1d',
    });
    const quotes = Array.isArray(chartData?.quotes) ? chartData.quotes : [];
    const result = quotes
      .filter(q => q.close != null)
      .map(q => ({
        date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date).slice(0, 10),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      }));

    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error) {
    console.warn(`History unavailable for ${ticker}: ${error.message}`);
    res.status(404).json({ error: `No history data for ${ticker}`, ticker });
  }
});

// GET /api/snapshot
router.get('/snapshot', async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
  }

  // Access the mutable exports via a dynamic check
  const { snapshotIndex: idx } = await import('../lib/stocks.js');

  if (!idx) {
    buildSnapshotIndex();
    return res.status(202).json({ building: true, message: 'Index building, retry in a few seconds' });
  }

  const result = {};
  for (const [ticker, series] of Object.entries(idx)) {
    if (!series?.length) continue;
    let lo = 0, hi = series.length - 1, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (series[mid].date <= date) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    result[ticker] = series[best].close;
  }
  res.json(result);
});

export default router;
