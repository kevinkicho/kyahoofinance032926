// SEC EDGAR — XBRL company financial data + insider Form 4 filings.
// Docs: https://www.sec.gov/edgar/sec-api-documentation
//
// SEC mandates a User-Agent identifying the requester. Set EDGAR_USER_AGENT
// in .env (e.g. "Your Name your@email.com") — they'll throttle/block
// generic UAs. Falls back to a generic value here, but expect rate limits.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

// Map ticker → CIK (zero-padded to 10 digits) for a small panel of names.
// SEC publishes the full list at https://www.sec.gov/files/company_tickers.json
// — load that on first request and cache in memory for the process lifetime.
let TICKER_CIK_CACHE = null;
async function getTickerCikMap(ua) {
  if (TICKER_CIK_CACHE) return TICKER_CIK_CACHE;
  trackApiCall('SEC EDGAR');
  const data = await fetchJSON('https://www.sec.gov/files/company_tickers.json', ua);
  const map = {};
  for (const v of Object.values(data || {})) {
    if (v?.ticker && v?.cik_str != null) {
      map[v.ticker.toUpperCase()] = String(v.cik_str).padStart(10, '0');
    }
  }
  TICKER_CIK_CACHE = map;
  return map;
}

// Pull a single XBRL "concept" (e.g. Revenues, NetIncomeLoss) for a CIK
// across all reported periods. The /companyconcept/ endpoint returns the
// timeseries for one concept; the /companyfacts/ endpoint returns every
// concept the issuer has filed (much larger).
//
// XBRL concept names drift over time. Companies migrate from one concept
// to another (e.g. Apple files `RevenueFromContractWithCustomerExcludingAssessedTax`
// under ASC 606 since 2019, while NVIDIA still files plain `Revenues`).
// Furthermore an issuer may have BOTH concepts populated — one with
// historical data only, the other with current data — so we try every
// concept in the chain and return whichever has the most recent annual
// observation. Returns [] only if no concept has any data.
async function fetchConcept(cik, concepts, ua) {
  const list = Array.isArray(concepts) ? concepts : [concepts];
  let best = null; // { latestEnd, rows }
  for (const concept of list) {
    try {
      trackApiCall('SEC EDGAR');
      const url = `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${concept}.json`;
      const data = await fetchJSON(url, ua);
      const usd = data?.units?.USD || data?.units?.['USD/shares'] || [];
      const annual = usd.filter(r => r.fp === 'FY' && r.form === '10-K').sort((a, b) => b.end.localeCompare(a.end));
      if (!annual.length) continue;
      const latestEnd = annual[0].end;
      const rows = annual.slice(0, 8).map(r => ({ end: r.end, value: r.val, accn: r.accn, fy: r.fy, concept }));
      if (!best || latestEnd > best.latestEnd) best = { latestEnd, rows };
    } catch (e) { /* try next concept */ }
  }
  return best ? best.rows : [];
}

// Concept fallback chains — order matters (newest accounting standard first).
const REVENUE_CONCEPTS = ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet'];
const NET_INCOME_CONCEPTS = ['NetIncomeLoss'];
const ASSETS_CONCEPTS = ['Assets'];
const LIABILITIES_CONCEPTS = ['Liabilities'];
const EQUITY_CONCEPTS = ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'];
const OPERATING_INCOME_CONCEPTS = ['OperatingIncomeLoss'];
const CASH_FLOW_CONCEPTS = ['NetCashProvidedByUsedInOperatingActivities'];
const CAPEX_CONCEPTS = ['PaymentsToAcquirePropertyPlantAndEquipment'];
const RD_CONCEPTS = ['ResearchAndDevelopmentExpense'];
const INTEREST_EXPENSE_CONCEPTS = ['InterestExpense'];
const CURRENT_ASSETS_CONCEPTS = ['AssetsCurrent'];
const CURRENT_LIABILITIES_CONCEPTS = ['LiabilitiesCurrent'];

// P&C insurance concept chains (combined ratio = (incurred losses + UW
// expense) / net premiums earned). XBRL concept names vary across insurers
// — different filers prefer different us-gaap concepts. fetchConcept's
// fallback returns whichever chain has the most recent annual data.
const PREMIUMS_EARNED_CONCEPTS = [
  'PremiumsEarnedNetPropertyAndCasualty',
  'PremiumsEarnedNet',
  'NetPremiumsEarned',
];
const INSURANCE_LOSSES_CONCEPTS = [
  'PolicyholderBenefitsAndClaimsIncurredNet',
  'IncurredClaimsPropertyCasualtyAndLiability',
  'LiabilityForClaimsAndClaimsAdjustmentExpenseClaimsIncurredNetOfReinsurance',
  'IncurredLossesAndLossAdjustmentExpensesNet',
];
const UNDERWRITING_EXPENSE_CONCEPTS = [
  'OtherUnderwritingExpense',
  'GeneralAndAdministrativeExpense',
];

router.get('/concepts/:ticker', async (req, res) => {
  const ua = (process.env.EDGAR_USER_AGENT || '').trim() || 'kyahoofinance-researcher (Educational Sandbox)';
  const ticker = (req.params.ticker || '').toUpperCase();
  const cacheKey = `edgar_concepts_${ticker.toLowerCase()}`;
  const cached = readDailyCache(cacheKey);
  if (cached) return res.json(cached);

  let cikMap;
  try { cikMap = await getTickerCikMap(ua); }
  catch (e) { return res.status(503).json({ error: `Ticker→CIK lookup failed: ${e.message}` }); }
  const cik = cikMap[ticker];
  if (!cik) return res.status(404).json({ error: `Unknown ticker ${ticker}` });

  const today = todayStr();
  // Each entry: [output-key, concept-fallback-chain]
  const want = [
    ['revenues', REVENUE_CONCEPTS],
    ['netIncome', NET_INCOME_CONCEPTS],
    ['assets', ASSETS_CONCEPTS],
    ['liabilities', LIABILITIES_CONCEPTS],
    ['equity', EQUITY_CONCEPTS],
    ['operatingIncome', OPERATING_INCOME_CONCEPTS],
    ['cashFlow', CASH_FLOW_CONCEPTS],
    ['capex', CAPEX_CONCEPTS],
    ['rdExpense', RD_CONCEPTS],
    ['interestExpense', INTEREST_EXPENSE_CONCEPTS],
    ['currentAssets', CURRENT_ASSETS_CONCEPTS],
    ['currentLiabilities', CURRENT_LIABILITIES_CONCEPTS],
  ];
  const out = {};
  for (const [key, chain] of want) {
    try { out[key] = await fetchConcept(cik, chain, ua); }
    catch (e) { console.warn(`[EDGAR] ${ticker}/${key}:`, e.message); out[key] = null; }
  }

  const _sources = { secEdgarXbrl: !!Object.values(out).some(v => v && v.length) };
  const isLive = _sources.secEdgarXbrl;
  const result = {
    ticker,
    cik,
    concepts: out,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };
  if (isLive) writeDailyCache(cacheKey, result);
  res.json(result);
});

// Default landing endpoint: surface aggregate stats for a broader set of
// mega-cap tickers (so /api/edgar without params returns something useful).
const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BRK-B', 'JPM', 'V', 'UNH', 'XOM', 'JNJ', 'WMT', 'PG'];
router.get('/', async (_req, res) => {
  const cached = readDailyCache('edgar');
  if (cached) return res.json(cached);

  const ua = (process.env.EDGAR_USER_AGENT || '').trim() || 'kyahoofinance-researcher (Educational Sandbox)';
  const today = todayStr();
  const out = {};
  let cikMap;
  try { cikMap = await getTickerCikMap(ua); }
  catch (e) {
    const fallback = readLatestCache('edgar');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
    return res.status(503).json({ error: `EDGAR unavailable: ${e.message}` });
  }
  for (const t of DEFAULT_TICKERS) {
    const cik = cikMap[t];
    if (!cik) continue;
    try {
      const [rev, ni, ast, liab, eq, oi, cf, capex, rd, intExp, ca, cl] = await Promise.all([
        fetchConcept(cik, REVENUE_CONCEPTS, ua),
        fetchConcept(cik, NET_INCOME_CONCEPTS, ua),
        fetchConcept(cik, ASSETS_CONCEPTS, ua),
        fetchConcept(cik, LIABILITIES_CONCEPTS, ua),
        fetchConcept(cik, EQUITY_CONCEPTS, ua),
        fetchConcept(cik, OPERATING_INCOME_CONCEPTS, ua),
        fetchConcept(cik, CASH_FLOW_CONCEPTS, ua),
        fetchConcept(cik, CAPEX_CONCEPTS, ua),
        fetchConcept(cik, RD_CONCEPTS, ua),
        fetchConcept(cik, INTEREST_EXPENSE_CONCEPTS, ua),
        fetchConcept(cik, CURRENT_ASSETS_CONCEPTS, ua),
        fetchConcept(cik, CURRENT_LIABILITIES_CONCEPTS, ua),
      ]);
      out[t] = { cik, revenues: rev, netIncome: ni, assets: ast, liabilities: liab, equity: eq, operatingIncome: oi, cashFlow: cf, capex, rdExpense: rd, interestExpense: intExp, currentAssets: ca, currentLiabilities: cl };
    } catch (e) { console.warn(`[EDGAR] ${t}:`, e.message); out[t] = null; }
  }
  const _sources = { secEdgarXbrl: !!Object.keys(out).length };
  const isLive = _sources.secEdgarXbrl;
  const result = { tickers: out, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
  if (isLive) writeDailyCache('edgar', result);
  else {
    const fallback = readLatestCache('edgar');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

// Filing activity — per-ticker filing lists with dates, descriptions, and
// EDGAR links. Returns categorized filings: material events, insider trades,
// earnings, and recent filings.
const FILING_ACTIVITY_TICKERS = ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','TSLA','JPM','JNJ','V','PG','XOM','UNH','HD','BAC','MA','DIS','ADBE','CRM','NFLX'];

// Classify filing types by significance
function classifyFiling(form) {
  const f = form.toUpperCase().trim();
  if (['8-K', '8-K/A'].includes(f)) return 'material';
  if (['10-K', '10-K/A', '10-Q', '10-Q/A'].includes(f)) return 'earnings';
  if (f === '4' || f === '5') return 'insider';
  if (['SC 13G', 'SC 13G/A', 'SC 13D', 'SC 13D/A'].includes(f)) return 'activist';
  if (['DEF 14A', 'DEFA14A', 'DEF 14C'].includes(f)) return 'proxy';
  if (['S-1', 'S-1/A', 'F-1', 'F-1/A'].includes(f)) return 'ipo';
  if (['424B2', '424B3', '424B5', 'FWP'].includes(f)) return 'offering';
  return 'other';
}

router.get('/filing-activity', async (_req, res) => {
  const cacheKey = 'edgar_filing_activity';
  const cached = readDailyCache(cacheKey);
  if (cached) return res.json(cached);

  const ua = (process.env.EDGAR_USER_AGENT || '').trim() || 'kyahoofinance-researcher (Educational Sandbox)';
  const today = todayStr();
  let cikMap;
  try { cikMap = await getTickerCikMap(ua); }
  catch (e) {
    const fb = readLatestCache(cacheKey);
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    return res.status(503).json({ error: `EDGAR unavailable: ${e.message}` });
  }

  const byType = {};
  const byTicker = {};
  const material = [];  // Recent 8-K filings
  const insider = [];   // Recent Form 4 filings
  const earnings = [];  // Recent 10-K/10-Q filings
  const activist = [];  // Recent 13G/13D filings
  let total = 0;
  let tickerCount = 0;

  for (const t of FILING_ACTIVITY_TICKERS) {
    const cik = cikMap[t];
    if (!cik) continue;
    try {
      trackApiCall('SEC EDGAR');
      const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
      const data = await fetchJSON(url, ua);
      const recent = data?.filings?.recent || {};
      const forms = recent.form || [];
      const dates = recent.filingDate || [];
      const accessions = recent.accessionNumber || [];
      const primaryDocs = recent.primaryDoc || [];
      const descriptions = recent.primaryDocDescription || [];
      const filings = [];
      const limit = Math.min(forms.length, 40);

      for (let i = 0; i < limit; i++) {
        const form = forms[i];
        const filingDate = dates[i] || '';
        const accession = accessions[i] || '';
        const doc = primaryDocs[i] || '';
        const desc = descriptions[i] || '';
        const category = classifyFiling(form);
        byType[form] = (byType[form] || 0) + 1;
        total++;

        const filing = {
          ticker: t,
          form,
          date: filingDate,
          description: desc,
          accession,
          doc,
          category,
          url: `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${accession.replace(/-/g, '')}/${doc}`,
        };
        filings.push(filing);

        // Collect recent significant filings (last 90 days)
        const daysAgo = filingDate ? (Date.now() - new Date(filingDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
        if (daysAgo <= 90) {
          if (category === 'material') material.push(filing);
          if (category === 'insider') insider.push(filing);
          if (category === 'earnings') earnings.push(filing);
          if (category === 'activist') activist.push(filing);
        }
      }
      byTicker[t] = filings;
      tickerCount++;
    } catch (e) { /* skip ticker on error */ }
  }

  // Sort each category by date (most recent first)
  const sortByDate = (a, b) => (b.date || '').localeCompare(a.date || '');
  material.sort(sortByDate);
  insider.sort(sortByDate);
  earnings.sort(sortByDate);
  activist.sort(sortByDate);

  const _sources = { secEdgarFilingActivity: tickerCount > 0 };
  const isLive = _sources.secEdgarFilingActivity;
  const result = {
    byTicker, byType, total, tickerCount,
    material: material.slice(0, 20),
    insider: insider.slice(0, 20),
    earnings: earnings.slice(0, 20),
    activist: activist.slice(0, 20),
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };
  if (isLive) writeDailyCache(cacheKey, result);
  else {
    const fb = readLatestCache(cacheKey);
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

// Combined-ratio extraction for a fixed panel of US P&C insurers. Returns
// per-issuer annual time series of premiums earned, incurred losses,
// underwriting expense, and the derived combined ratio. The Insurance
// dashboard uses this to populate the previously-null Combined Ratio
// panel with real data (vs the hard-coded null placeholders).
const PC_INSURER_TICKERS = ['PGR', 'ALL', 'TRV', 'CB', 'AIG', 'HIG'];

router.get('/insurer-ratios', async (_req, res) => {
  const cacheKey = 'edgar_insurer_ratios';
  const cached = readDailyCache(cacheKey);
  if (cached) return res.json(cached);

  const ua = process.env.EDGAR_USER_AGENT || 'kyahoofinance-researcher (Educational Sandbox)';
  const today = todayStr();
  let cikMap;
  try { cikMap = await getTickerCikMap(ua); }
  catch (e) {
    const fb = readLatestCache(cacheKey);
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
    return res.status(503).json({ error: `EDGAR unavailable: ${e.message}` });
  }

  const issuers = {};
  for (const t of PC_INSURER_TICKERS) {
    const cik = cikMap[t];
    if (!cik) { issuers[t] = null; continue; }
    try {
      const [premiums, losses, uwExpense] = await Promise.all([
        fetchConcept(cik, PREMIUMS_EARNED_CONCEPTS, ua),
        fetchConcept(cik, INSURANCE_LOSSES_CONCEPTS, ua),
        fetchConcept(cik, UNDERWRITING_EXPENSE_CONCEPTS, ua),
      ]);
      // Inner-join on fiscal-year end so combined ratio is well-defined.
      const lossByEnd = new Map(losses.map(r => [r.end, r.value]));
      const uwByEnd = new Map(uwExpense.map(r => [r.end, r.value]));
      const series = [];
      for (const p of premiums) {
        const l = lossByEnd.get(p.end);
        const u = uwByEnd.get(p.end);
        if (p.value > 0 && l != null && u != null) {
          const combined = ((l + u) / p.value) * 100;
          const lossRatio = (l / p.value) * 100;
          const expenseRatio = (u / p.value) * 100;
          series.push({
            fy:           p.fy,
            end:          p.end,
            premiumsB:    Math.round(p.value / 1e8) / 10,        // $B with 1 decimal
            lossesB:      Math.round(l / 1e8) / 10,
            expenseB:     Math.round(u / 1e8) / 10,
            combinedPct:  Math.round(combined * 10) / 10,
            lossPct:      Math.round(lossRatio * 10) / 10,
            expensePct:   Math.round(expenseRatio * 10) / 10,
          });
        }
      }
      series.sort((a, b) => a.end.localeCompare(b.end));
      issuers[t] = {
        cik,
        series: series.slice(-6),                                // ~6 fiscal years
        latest: series.length ? series[series.length - 1] : null,
      };
    } catch (e) {
      console.warn(`[EDGAR insurer-ratios] ${t}:`, e.message);
      issuers[t] = null;
    }
  }

  // Industry summary: simple average of latest combined ratios across
  // issuers that returned data. (Premium-weighted would be more precise
  // but harder to interpret in the panel's small footprint.)
  const liveIssuers = Object.entries(issuers).filter(([, v]) => v?.latest);
  const summary = liveIssuers.length ? {
    issuersWithData:  liveIssuers.length,
    avgCombinedPct:   Math.round(liveIssuers.reduce((s, [, v]) => s + v.latest.combinedPct, 0) / liveIssuers.length * 10) / 10,
    latestEnd:        liveIssuers.map(([, v]) => v.latest.end).sort().pop(),
  } : null;

  const _sources = { secEdgarInsurerRatios: !!liveIssuers.length };
  const isLive = _sources.secEdgarInsurerRatios;
  const result = { issuers, summary, _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today };
  if (isLive) writeDailyCache(cacheKey, result);
  else {
    const fb = readLatestCache(cacheKey);
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
