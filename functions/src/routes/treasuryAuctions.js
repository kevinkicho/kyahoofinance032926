// US Treasury — Auction Results.
//
// Source: api.fiscaldata.treasury.gov auctions_query. No key required.
// We pull recent completed auctions (bid_to_cover_ratio non-null) across
// Bills / Notes / Bonds / TIPS / FRNs and surface the metrics that drive
// bond-market sentiment:
//   - bid_to_cover_ratio  → demand strength
//   - indirect_bidder %   → foreign / SOMA proxy
//   - direct_bidder %     → domestic non-dealer
//   - primary_dealer %    → what dealers had to absorb (high = weak demand)
//   - high_yield / high_investment_rate → stop-out yield
//
// Reference: https://fiscaldata.treasury.gov/datasets/treasury-securities-auctions-data/
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query';
const FIELDS = [
  'auction_date', 'issue_date', 'maturity_date',
  'security_type', 'security_term',
  'bid_to_cover_ratio',
  'indirect_bidder_accepted', 'direct_bidder_accepted', 'primary_dealer_accepted',
  'offering_amt', 'total_accepted',
  'high_yield', 'high_investment_rate', 'high_discnt_rate',
].join(',');

// Pull the last ~60 completed auctions so the panel has enough history for
// a small indirect-bidder-share trend without paging through unrelated data.
const PAGE_SIZE = 60;

function num(v) {
  if (v == null || v === 'null' || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('treasuryAuctions');
  if (cached) return res.json(cached);

  const today = todayStr();
  let auctions = null;

  try {
    trackApiCall('Treasury Fiscal Data');
    // filter for bid_to_cover_ratio>0 to drop the auctions that haven't run yet.
    const url = `${BASE}?sort=-auction_date&filter=bid_to_cover_ratio:gt:0&page%5Bsize%5D=${PAGE_SIZE}&fields=${FIELDS}`;
    const data = await fetchJSON(url);
    const rows = Array.isArray(data?.data) ? data.data : [];
    auctions = rows.map(r => {
      const total = num(r.total_accepted);
      const indirect = num(r.indirect_bidder_accepted);
      const direct = num(r.direct_bidder_accepted);
      const dealer = num(r.primary_dealer_accepted);
      // "Stop-out" yield is reported as `high_yield` for notes/bonds and
      // `high_investment_rate` for bills (the discount rate is also there
      // but the investment rate is more comparable across the curve).
      const yieldPct = num(r.high_yield) ?? num(r.high_investment_rate) ?? null;
      // Dollar amounts come back in raw dollars; convert to billions for
      // display and compute share-of-accepted percentages.
      return {
        auctionDate:   r.auction_date,
        issueDate:     r.issue_date,
        maturityDate:  r.maturity_date,
        securityType:  r.security_type,
        securityTerm:  r.security_term,
        bidToCover:    num(r.bid_to_cover_ratio),
        indirectPct:   total > 0 && indirect != null ? (indirect / total) * 100 : null,
        directPct:     total > 0 && direct   != null ? (direct   / total) * 100 : null,
        dealerPct:     total > 0 && dealer   != null ? (dealer   / total) * 100 : null,
        offeringB:     num(r.offering_amt) != null ? num(r.offering_amt) / 1e9 : null,
        acceptedB:     total != null ? total / 1e9 : null,
        stopYieldPct:  yieldPct,
      };
    });
  } catch (e) {
    console.warn('[TreasuryAuctions]', e.message || e);
  }

  const _sources = { treasuryAuctions: !!(auctions && auctions.length) };
  const isLive = _sources.treasuryAuctions;

  // Compact aggregate header — gives the panel a one-liner without rescanning
  // 60 rows in the client, and gives DataProvider's hasNonNullData guard a
  // second non-null field so the response isn't filtered out as "empty".
  const summary = isLive ? (() => {
    const recent = auctions.slice(0, 10);
    const avgBTC = recent.reduce((s, a) => s + (a.bidToCover || 0), 0) / recent.length;
    const avgIndirect = recent.filter(a => a.indirectPct != null).reduce((s, a) => s + a.indirectPct, 0) / Math.max(1, recent.filter(a => a.indirectPct != null).length);
    return {
      latestDate: auctions[0]?.auctionDate || null,
      latestType: auctions[0]?.securityType || null,
      latestTerm: auctions[0]?.securityTerm || null,
      avgBidToCover10: Math.round(avgBTC * 100) / 100,
      avgIndirectPct10: Math.round(avgIndirect * 10) / 10,
      count: auctions.length,
    };
  })() : null;

  const result = {
    auctions,
    summary,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('treasuryAuctions', result);
  else {
    const fallback = readLatestCache('treasuryAuctions');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
