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

/** Ratings tile is empty unless a country row exists; asOf bag is leftover. */
export function hasCreditRatingsRows(creditRatingsData) {
  return Array.isArray(creditRatingsData) && creditRatingsData.length > 0;
}

/** Treasury-cost tile paints rate numbers; latest bag is leftover. */
export function hasTreasuryCostRates(latest) {
  if (!latest || typeof latest !== 'object' || Array.isArray(latest)) return false;
  return Object.values(latest).some((val) => isFiniteNumeric(val?.rate));
}
