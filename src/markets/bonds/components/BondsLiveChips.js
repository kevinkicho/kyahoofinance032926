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