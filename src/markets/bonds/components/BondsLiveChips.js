/** Live-chip predicates for bonds tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function firstNumber(...vals) {
  for (const v of vals) if (isFiniteNumber(v)) return v;
  return null;
}

/** KPI strip always paints 7 pills; live only when a painted metric is numeric. */
export function hasBondsKpiMetrics({
  treasuryRates,
  yieldCurveData,
  spreadIndicators,
  fedFundsFutures,
  spreadData,
  breakevensData,
} = {}) {
  const us10 = firstNumber(treasuryRates?.US10Y, yieldCurveData?.US?.['10y']);
  const us2 = firstNumber(treasuryRates?.US2Y, yieldCurveData?.US?.['2y']);
  const curve = firstNumber(
    spreadIndicators?.t10y2y,
    us10 != null && us2 != null ? us10 - us2 : null,
  );
  const fed = firstNumber(fedFundsFutures?.m1, treasuryRates?.fedFunds, treasuryRates?.US3M);
  const ig = firstNumber(spreadData?.current?.igSpread, spreadData?.current?.ig);
  const hy = firstNumber(spreadData?.current?.hySpread, spreadData?.current?.hy);
  const be5 = firstNumber(breakevensData?.current?.be5y);
  return [us10, us2, curve, fed, ig, hy, be5].some(isFiniteNumber);
}

function isFiniteNumeric(v) {
  if (isFiniteNumber(v)) return true;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return true;
  return false;
}

/** Metrics sidebar paints yields / spreads / TIPS / macro numbers; leftover bags are empty. */
export function hasBondsMetricsContent({
  yieldCurveData,
  spreadIndicators,
  spreadHistory,
  tipsYields,
  macroData,
  nationalDebt,
  debtToGdpHistory,
  breakevensData,
  fedFundsFutures,
  spreadData,
} = {}) {
  const us = yieldCurveData?.US;
  if (us && typeof us === 'object' && !Array.isArray(us)) {
    if (['3m', '2y', '5y', '10y', '30y'].some((t) => isFiniteNumeric(us[t]))) return true;
  }
  if (yieldCurveData && typeof yieldCurveData === 'object' && !Array.isArray(yieldCurveData)) {
    for (const curve of Object.values(yieldCurveData)) {
      if (isFiniteNumeric(curve?.['30y']) && isFiniteNumeric(curve?.['3m'])) return true;
    }
  }
  if (isFiniteNumeric(spreadIndicators?.t10y2y) || isFiniteNumeric(spreadIndicators?.t10y3m)) return true;
  if (isFiniteNumeric(spreadHistory?.latest?.t5y30y)) return true;
  if (tipsYields && typeof tipsYields === 'object' && !Array.isArray(tipsYields)) {
    if (['5y', '10y', '30y'].some((t) => isFiniteNumeric(tipsYields[t]))) return true;
  }
  if (isFiniteNumeric(macroData?.unemployment) || isFiniteNumeric(macroData?.gdp) || isFiniteNumeric(macroData?.pce)) return true;
  if (isFiniteNumeric(nationalDebt) || isFiniteNumeric(debtToGdpHistory?.latest)) return true;
  if (isFiniteNumeric(breakevensData?.current?.be5y) || isFiniteNumeric(breakevensData?.current?.be10y)) return true;
  if (isFiniteNumeric(fedFundsFutures?.effectiveRate)) return true;
  const cur = spreadData?.current;
  if (isFiniteNumeric(cur?.igSpread) || isFiniteNumeric(cur?.hySpread) || isFiniteNumeric(cur?.emSpread)) return true;
  return false;
}

const YIELD_TENORS = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];

function tenorNumber(curve, tenor) {
  const v = curve?.[tenor];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** Yield-curve countries that paint a tenor; leftover sibling keys still empty / crash the tile. */
export function yieldCurveCountries(yieldCurveData) {
  if (!yieldCurveData || typeof yieldCurveData !== 'object' || Array.isArray(yieldCurveData)) return [];
  return Object.entries(yieldCurveData).filter(([, curve]) => {
    if (!curve || typeof curve !== 'object' || Array.isArray(curve)) return false;
    return YIELD_TENORS.some((t) => tenorNumber(curve, t) != null);
  });
}

export function hasYieldCurveContent(yieldCurveData) {
  return yieldCurveCountries(yieldCurveData).length > 0;
}

/** Ratings tile is empty unless a country row exists; asOf bag is leftover. */
export function hasCreditRatingsRows(creditRatingsData) {
  return Array.isArray(creditRatingsData) && creditRatingsData.length > 0;
}

/** Treasury-cost tile paints rate numbers; latest bag is leftover. */
export function hasTreasuryCostRates(latest) {
  if (!latest || typeof latest !== 'object' || Array.isArray(latest)) return false;
  return Object.values(latest).some((val) => isFiniteNumeric(val?.rate));
}

function hasPaintedSeries(arr) {
  return Array.isArray(arr) && arr.some((v) => v != null);
}

/** Curve-spreads chart is empty when dates exist but no 2s10s/10s3s/5s30s series paint. */
export function hasCurveSpreadSeries(spreadHistory) {
  if (!Array.isArray(spreadHistory?.dates) || !spreadHistory.dates.length) return false;
  return ['t10y2y', 't10y3m', 't5y30y'].some((k) => hasPaintedSeries(spreadHistory?.[k]));
}

/** Fed / M2 / debt-GDP charts are empty when dates exist but no values paint. */
function hasDatedValuesSeries(series) {
  if (!Array.isArray(series?.dates) || !series.dates.length) return false;
  return hasPaintedSeries(series?.values);
}

export function hasFedBalanceSeries(fedBalanceSheetHistory) {
  return hasDatedValuesSeries(fedBalanceSheetHistory);
}

export function hasM2Series(m2HistoryData) {
  return hasDatedValuesSeries(m2HistoryData);
}

export function hasDebtGdpSeries(debtToGdpHistory) {
  return hasDatedValuesSeries(debtToGdpHistory);
}

/** CPI chart is empty when dates exist but no All/Core/Food/Energy series paint. */
export function hasCpiComponentsSeries(cpiComponents) {
  if (!Array.isArray(cpiComponents?.dates) || !cpiComponents.dates.length) return false;
  return ['all', 'core', 'food', 'energy'].some((k) => hasPaintedSeries(cpiComponents?.[k]));
}

/** TIPS real-yield chart is empty when dates exist but no 5Y/10Y series paint. */
export function hasRealYieldSeries(realYieldHistory) {
  if (!Array.isArray(realYieldHistory?.dates) || !realYieldHistory.dates.length) return false;
  return hasPaintedSeries(realYieldHistory?.d5y) || hasPaintedSeries(realYieldHistory?.d10y);
}

const CREDIT_SPREAD_KEYS = ['IG', 'HY', 'EM', 'BBB'];
const FFF_MONTHS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
const MACRO_LEVEL_KEYS = [
  'fedBalanceSheet', 'm2', 'federalDebt', 'surplusDeficit',
  'unemployment', 'laborParticipation', 'gdp', 'pce', 'tb3ms',
];

function lastFiniteInSeries(arr) {
  if (!Array.isArray(arr)) return false;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null && Number.isFinite(Number(arr[i]))) return true;
  }
  return false;
}

function hasNumericField(obj) {
  return obj?.value != null && Number.isFinite(Number(obj.value));
}

function lastFiniteValue(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  const last = rows[rows.length - 1];
  return last?.value != null && Number.isFinite(Number(last.value));
}

/** Credit-spreads tile is empty when dates exist but no IG/HY/EM/BBB series or current values paint. */
export function hasCreditSpreadContent(spreadData) {
  if (!spreadData || typeof spreadData !== 'object') return false;
  const cur = spreadData.current;
  if (
    isFiniteNumeric(cur?.igSpread)
    || isFiniteNumeric(cur?.hySpread)
    || isFiniteNumeric(cur?.emSpread)
    || isFiniteNumeric(cur?.bbbSpread)
  ) return true;
  return CREDIT_SPREAD_KEYS.some((k) => lastFiniteInSeries(spreadData[k]));
}

/** Duration ladder is empty when meta/asOf leftover or FFF keys exist but no bucket/FFF values paint. */
export function hasDurationLadderContent(durationLadderData, fedFundsFutures, treasuryRates) {
  if (Array.isArray(durationLadderData)) {
    if (durationLadderData.some((d) => isFiniteNumeric(d?.amount) || isFiniteNumeric(d?.rate))) return true;
  }
  if (treasuryRates && typeof treasuryRates === 'object' && !Array.isArray(treasuryRates)) {
    const buckets = ['0–2y', '2–5y', '5–10y', '10y+', '0-2y', '2-5y', '5-10y'];
    if (buckets.some((b) => isFiniteNumeric(treasuryRates[b]))) return true;
  }
  if (fedFundsFutures && typeof fedFundsFutures === 'object' && !Array.isArray(fedFundsFutures)) {
    const painted = FFF_MONTHS.filter((k) => isFiniteNumeric(fedFundsFutures[k])).length;
    if (painted >= 2) return true;
  }
  return false;
}

/** Macro-indicators tile is empty when the leftover bag has keys but no numeric rows paint. */
export function hasMacroIndicatorsContent(macroData, nationalDebt, debtToGdpHistory) {
  if (isFiniteNumeric(nationalDebt) || isFiniteNumeric(debtToGdpHistory?.latest)) return true;
  if (!macroData || typeof macroData !== 'object' || Array.isArray(macroData)) return false;
  if (MACRO_LEVEL_KEYS.some((k) => isFiniteNumeric(macroData[k]))) return true;
  const cb = macroData.centralBankRates;
  if (cb && typeof cb === 'object' && !Array.isArray(cb)) {
    if (Object.values(cb).some((v) => isFiniteNumeric(v))) return true;
  }
  return false;
}

/** ECB policy-rates tile is empty when policyRates/moneyMarket bags exist but no rates paint. */
export function hasEcbPolicyRatesContent(ecbData) {
  const pr = ecbData?.policyRates;
  if (pr && typeof pr === 'object') {
    if (hasNumericField(pr.depositFacility) || hasNumericField(pr.mainRefinancing) || hasNumericField(pr.marginalLending)) return true;
    if (hasNumericField(pr.corridorWidth) || hasNumericField(pr.standingFacilitySpread)) return true;
  }
  const mm = ecbData?.moneyMarket;
  if (mm && typeof mm === 'object') {
    const keys = ['estr', 'estrP25', 'estrP75', 'estrMonthlyAvg', 'euribor1m', 'euribor3m', 'euribor6m', 'euribor1y'];
    if (keys.some((k) => hasNumericField(mm[k]))) return true;
  }
  return lastFiniteValue(ecbData?.m3Growth) || lastFiniteValue(ecbData?.hicpDetail);
}

/** Global-rates tile is empty when centralBankRates or sibling ECB bags exist but no painted rate. */
export function hasGlobalCentralBankRates(rates, ecbRate) {
  if (isFiniteNumeric(ecbRate)) return true;
  if (!rates || typeof rates !== 'object' || Array.isArray(rates)) return false;
  return Object.values(rates).some((v) => isFiniteNumeric(v));
}

/** Foreign-holders tile is empty when latest[] exists but no holdingsB / history paints. */
export function hasForeignHoldersContent(ticData) {
  const latest = ticData?.latest;
  if (Array.isArray(latest) && latest.some((r) => isFiniteNumeric(r?.holdingsB))) {
    const history = ticData?.history;
    if (history && typeof history === "object" && !Array.isArray(history)) {
      const paintedHistory = Object.values(history).some((rows) => (
        Array.isArray(rows) && rows.some((row) => isFiniteNumeric(row?.holdingsB) && row?.period)
      ));
      if (paintedHistory) return true;
    }
  }
  return false;
}

/** Money-market tile is empty when SOFR/RRP bags exist but no rate or volume paints. */
export function hasMoneyMarketContent(nyfedData) {
  const sofrSeries = nyfedData?.sofr?.series;
  if (Array.isArray(sofrSeries) && sofrSeries.some((r) => isFiniteNumeric(r?.rate))) return true;
  const rrp = nyfedData?.rrp;
  if (Array.isArray(rrp) && rrp.some((r) => isFiniteNumeric(r?.acceptedB))) return true;
  const latest = nyfedData?.sofr?.latest;
  if (isFiniteNumeric(latest?.rate) || isFiniteNumeric(latest)) return true;
  const effr = nyfedData?.effr;
  if (isFiniteNumeric(effr?.latest) || isFiniteNumeric(effr)) return true;
  return false;
}

/** Auction rows the tile can slice. Leftover isLive / auctions bag remount-crash .slice. */
export function auctionRows(auctionData) {
  return Array.isArray(auctionData?.auctions) ? auctionData.auctions : [];
}

/** Auctions tile is empty when auction rows exist but no BTC / allotment / yield paints. */
export function hasAuctionContent(auctionData) {
  const rows = auctionRows(auctionData);
  if (rows.some((r) => (
    isFiniteNumeric(r?.bidToCover) || isFiniteNumeric(r?.indirectPct) || isFiniteNumeric(r?.stopYieldPct)
  ))) return true;
  const summary = auctionData?.summary;
  if (summary && typeof summary === "object" && !Array.isArray(summary)) {
    if (isFiniteNumeric(summary.avgBidToCover) || isFiniteNumeric(summary.avgIndirectPct)) return true;
  }
  return false;
}
