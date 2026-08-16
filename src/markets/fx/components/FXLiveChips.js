/** Live-chip predicates for FX tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

const KPI_PAIRS = ['EUR', 'JPY', 'GBP', 'CHF'];
const G10 = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'NZD'];

/** KPI strip always paints 6 pills; live only when a painted metric is numeric. */
export function hasFxKpiMetrics({ spotRates, changes, dxyHistory } = {}) {
  if (KPI_PAIRS.some((c) => isFiniteNumber(spotRates?.[c]))) return true;
  const vals = dxyHistory?.values;
  const dxyVal = Array.isArray(vals) ? vals[vals.length - 1] : null;
  if (isFiniteNumber(dxyVal)) return true;
  if (G10.some((c) => isFiniteNumber(changes?.[c]))) return true;
  return false;
}

/** Sidebar shows the Frankfurter-empty hint when no non-USD spot rate exists. */
export function hasFxSpotRates(spotRates) {
  if (!spotRates || typeof spotRates !== 'object') return false;
  return Object.entries(spotRates).some(([code, v]) => code !== 'USD' && isFiniteNumber(v));
}

/** Movers list is empty when no non-USD 1d change exists. */
export function hasFxMovers(changes) {
  if (!changes || typeof changes !== 'object') return false;
  return Object.entries(changes).some(([code, v]) => code !== 'USD' && isFiniteNumber(v));
}