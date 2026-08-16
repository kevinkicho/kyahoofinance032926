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

/** REER chart is empty when dates exist but no US/EU/JP/GB/CN series paints. */
const REER_COUNTRIES = ['US', 'EU', 'JP', 'GB', 'CN'];
export function hasReerSeries(reer) {
  if (!Array.isArray(reer?.dates) || !reer.dates.length) return false;
  return REER_COUNTRIES.some((k) => Array.isArray(reer[k]) && reer[k].length > 0);
}

/** Correlation matrix only uses G10 history; leftover sibling keys still empty the tile. */
export function hasFxCorrelationHistory(history) {
  if (!history || typeof history !== 'object') return false;
  return G10.some((ccy) => Array.isArray(history[ccy]) && history[ccy].length > 0);
}

/** DXY chart is empty when dates exist but no values paint. */
export function hasDxyHistory(dxyHistory) {
  if (!Array.isArray(dxyHistory?.dates) || !dxyHistory.dates.length) return false;
  return Array.isArray(dxyHistory?.values) && dxyHistory.values.some((v) => v != null);
}

/** COT chart only uses currency series arrays; leftover sibling keys still empty / crash the tile. */
export function cotHistorySeries(cotHistory) {
  if (!cotHistory || typeof cotHistory !== 'object') return [];
  return Object.entries(cotHistory).filter(([, arr]) => (
    Array.isArray(arr) && arr.some((d) => d && d.net != null)
  ));
}

export function hasCotHistory(cotHistory) {
  return cotHistorySeries(cotHistory).length > 0;
}
