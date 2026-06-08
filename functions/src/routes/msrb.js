// MSRB EMMA — US Municipal Securities trade & primary market activity.
//
// Source: emma.msrb.org/MarketActivity/ViewStatistics.aspx (HTML scrape).
// MSRB doesn't expose a public REST API; the few public ASPX pages render
// summary stats inline as HTML tables, which is what we parse here.
//
// Two summary blocks are surfaced:
//   1. Trade Type — number of trades and par amount ($M) for the most
//      recent reporting day, broken out by Customer Bought / Customer Sold
//      / Inter-Dealer / All. Useful as a daily liquidity gauge.
//   2. Primary Market YTD — monthly issuance count, par ($M), and average
//      issue size for the current calendar year. Useful for tracking the
//      muni new-issue calendar.
import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchHtml } from '../lib/fetchBinary.js';

const router = Router();

const VS_URL = 'https://emma.msrb.org/MarketActivity/ViewStatistics.aspx';

// Strip HTML and pull a clean array of cells from a single table row.
function rowCells(rowHtml) {
  return [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
}

function asNum(s) {
  if (s == null) return null;
  const cleaned = String(s).replace(/[$,]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseTradeTypes(html) {
  // Find the trade-summary grid by its id; trailing rows are: Customer
  // Bought / Customer Sold / Inter-Dealer Trade / All Trades.
  const m = html.match(/<table[^>]*id="[^"]*tradeSummaryGridView"[\s\S]*?<\/table>/);
  if (!m) return null;
  const rows = [...m[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(x => rowCells(x[1])).filter(c => c.length === 3);
  return rows.map(c => ({
    type:    c[0],
    trades:  asNum(c[1]),
    parM:    asNum(c[2]),
  }));
}

function parsePrimaryMarketYTD(html) {
  // The yearly primary-market grid lists each month + a Total row.
  const m = html.match(/<table[^>]*id="[^"]*grdYearlyStatistics"[\s\S]*?<\/table>/);
  if (!m) return null;
  const rows = [...m[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(x => rowCells(x[1])).filter(c => c.length === 4);
  return rows.map(c => ({
    period:    c[0],
    issues:    asNum(c[1]),
    parM:      asNum(c[2]),
    avgSizeM:  asNum(c[3]),
  }));
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('msrb');
  if (cached) return res.json(cached);

  const today = todayStr();
  let tradeTypes = null, primaryMarket = null, summary = null;

  try {
    trackApiCall('MSRB EMMA');
    const html = await fetchHtml(VS_URL);
    tradeTypes = parseTradeTypes(html);
    primaryMarket = parsePrimaryMarketYTD(html);

    if (tradeTypes?.length) {
      const all = tradeTypes.find(r => /All/i.test(r.type));
      const ytdTotal = primaryMarket?.find(r => /total/i.test(r.period));
      summary = {
        tradesAll:        all?.trades ?? null,
        parAllM:          all?.parM ?? null,
        ytdIssues:        ytdTotal?.issues ?? null,
        ytdParM:          ytdTotal?.parM ?? null,
        ytdAvgSizeM:      ytdTotal?.avgSizeM ?? null,
      };
    }
  } catch (e) { console.warn('[MSRB]', e.message || e); }

  const _sources = { msrb: !!(tradeTypes && tradeTypes.length) };
  const isLive = _sources.msrb;
  const result = {
    tradeTypes,
    primaryMarket,
    summary,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('msrb', result);
  else {
    const fb = readLatestCache('msrb');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
