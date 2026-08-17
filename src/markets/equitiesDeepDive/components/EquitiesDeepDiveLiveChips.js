/** Live-chip predicates for Equity+ tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

export function sectorList(sectorData) {
  if (Array.isArray(sectorData)) return sectorData;
  return Array.isArray(sectorData?.sectors) ? sectorData.sectors : [];
}

function nonSpySectors(sectorData) {
  return sectorList(sectorData).filter((s) => s && s.code !== 'SPY' && s.name !== 'S&P 500');
}

function factorRows(factorData) {
  if (Array.isArray(factorData)) return factorData;
  return Array.isArray(factorData?.factorReturns) ? factorData.factorReturns : [];
}

function sectorChange(s) {
  return s?.change ?? s?.perf1m ?? s?.perf1w ?? s?.perf1d ?? null;
}

function factorScore(f) {
  const v = f?.return ?? f?.value ?? f?.score;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

const IN_FAVOR_KEYS = ['momentum', 'value', 'quality', 'lowVol'];

function hasNumericInFavor(inFavor) {
  if (!inFavor || typeof inFavor !== 'object' || Array.isArray(inFavor)) return false;
  return IN_FAVOR_KEYS.some((k) => isFiniteNumber(inFavor[k]));
}

/** KPI strip waits / dashes unless a non-SPY sector or numeric factor exists. */
export function hasEqdKpiMetrics({ sectorData, factorData } = {}) {
  if (nonSpySectors(sectorData).length > 0) return true;
  if (Array.isArray(factorData) && factorData.some((f) => factorScore(f) != null)) return true;
  if (hasNumericInFavor(factorData?.inFavor)) return true;
  return false;
}

/** Sidebar shows 'No Equity+ summary data available' unless a painted row exists. */
export function hasEqdSidebarContent({ sectorData, factorData, earningsData, shortData } = {}) {
  const sectors = sectorList(sectorData).filter((s) => sectorChange(s) != null || s?.name);
  if (sectors.length > 0) return true;
  if (factorRows(factorData).length > 0) return true;
  if (earningsData?.avgSurprise != null) return true;
  if (shortData?.aggregateShortPct != null) return true;
  return false;
}


/** Stock rows the table / KPI strip can spread. Leftover isLive / stocks bag remount-crash [...stocks]. */
export function factorStocks(factorData) {
  return Array.isArray(factorData?.stocks) ? factorData.stocks : [];
}

/** Upcoming earnings rows. Leftover upcoming bag remount-crash [...upcoming]. */
export function earningsUpcoming(earningsData) {
  return Array.isArray(earningsData?.upcoming) ? earningsData.upcoming : [];
}

/** Beat-rate rows. Leftover beatRates bag remount-crash .map. */
export function earningsBeatRates(earningsData) {
  return Array.isArray(earningsData?.beatRates) ? earningsData.beatRates : [];
}

/** Insider holder rows. Leftover holders bag remount-crash [...holders]. */
export function insiderHolderRows(insiderData) {
  return Array.isArray(insiderData?.holders) ? insiderData.holders : [];
}

/** Insider transaction rows. Leftover transactions bag remount-crash [...transactions]. */
export function insiderTransactionRows(insiderData) {
  return Array.isArray(insiderData?.transactions) ? insiderData.transactions : [];
}


/** Factor-rankings always paints a 0-chart; leftover inFavor bag is empty. */
export function hasFactorRankingsContent(factorData) {
  if (factorStocks(factorData).length > 0) return true;
  return hasNumericInFavor(factorData?.inFavor);
}


/** Institution rows the table can slice. Leftover isLive / institutions bag remount-crash .slice / inst.name.length. */
export function institutionRows(institutionalData) {
  return Array.isArray(institutionalData?.institutions) ? institutionalData.institutions : [];
}

/** Valuation is an empty fragment unless a gated section would paint. */
export function hasEqdValuationContent({
  spPE,
  buffettIndicator,
  equityRiskPremium,
  sectorData,
  factorData,
  shortData,
  earningsData,
  institutionalData,
  insiderData,
} = {}) {
  if (isFiniteNumber(spPE)) return true;
  if (isFiniteNumber(buffettIndicator?.ratio)) return true;
  if (isFiniteNumber(equityRiskPremium?.erp)) return true;
  if (nonSpySectors(sectorData).length > 0) return true;
  if (Array.isArray(factorData?.stocks) && factorData.stocks.length > 0) return true;
  if (Array.isArray(shortData?.mostShorted) && shortData.mostShorted.length > 0) return true;
  if (Array.isArray(earningsData?.upcoming) && earningsData.upcoming.length > 0) return true;
  if (institutionRows(institutionalData).length > 0) return true;
  if (Array.isArray(insiderData?.transactions) && insiderData.transactions.length > 0) return true;
  return false;
}

/** Earnings-quality always paints 4 cards + table; live only when a metric is real. */
export function hasEqdEarningsQuality({ earningsData, factorData, breadthDivergence } = {}) {
  const upcoming = Array.isArray(earningsData?.upcoming) ? earningsData.upcoming : [];
  if (upcoming.length > 0) return true;
  const beatRates = Array.isArray(earningsData?.beatRates) ? earningsData.beatRates : [];
  if (beatRates.some((row) => isFiniteNumber(row?.beatRate))) return true;
  if (hasNumericInFavor(factorData?.inFavor)) return true;
  if (Array.isArray(factorData?.stocks) && factorData.stocks.length > 0) return true;
  if (isFiniteNumber(breadthDivergence?.divergence)) return true;
  return false;
}
