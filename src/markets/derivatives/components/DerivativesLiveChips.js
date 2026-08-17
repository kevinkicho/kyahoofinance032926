/** Live-chip predicates for derivatives tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function termValue(vixTermStructure, label) {
  const i = vixTermStructure?.dates?.indexOf?.(label);
  if (i == null || i < 0) return null;
  const v = vixTermStructure?.values?.[i];
  return isFiniteNumber(v) ? v : null;
}

function skewValue(skewIndex) {
  if (isFiniteNumber(skewIndex)) return skewIndex;
  return isFiniteNumber(skewIndex?.value) ? skewIndex.value : null;
}

function gexValue(gammaExposure) {
  if (isFiniteNumber(gammaExposure)) return gammaExposure;
  if (gammaExposure && typeof gammaExposure === 'object') {
    if (isFiniteNumber(gammaExposure.total)) return gammaExposure.total;
    if (Array.isArray(gammaExposure) && gammaExposure.length > 0) {
      const sum = gammaExposure.reduce((s, g) => s + Math.abs(g?.value || 0), 0);
      return isFiniteNumber(sum) ? sum : null;
    }
  }
  return null;
}

/** KPI strip returns null unless a pill has a numeric rawValue. */
export function hasDerivativesKpiMetrics({
  vixTermStructure,
  putCallRatio,
  skewIndex,
  gammaExposure,
} = {}) {
  if (termValue(vixTermStructure, '1M') != null) return true;
  if (termValue(vixTermStructure, '9D') != null) return true;
  if (termValue(vixTermStructure, '3M') != null) return true;
  if (isFiniteNumber(putCallRatio)) return true;
  if (skewValue(skewIndex) != null) return true;
  return gexValue(gammaExposure) != null;
}

/** Vol-premium tile is empty unless ATM 1M IV is numeric; leftover bag isLive is empty. */
export function hasVolPremium(volPremium) {
  if (!volPremium || typeof volPremium !== 'object' || Array.isArray(volPremium)) return false;
  const v = volPremium.atm1mIV;
  if (isFiniteNumber(v)) return true;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return true;
  return false;
}

/** CFTC TFF tile is empty unless a contract has series rows; contracts bag is leftover. */
export function hasCftcTffRows(cftcData) {
  const contracts = cftcData?.contracts;
  if (!contracts || typeof contracts !== 'object' || Array.isArray(contracts)) return false;
  return Object.values(contracts).some((c) => Array.isArray(c?.series) && c.series.length > 0);
}

function hasNumericField(obj) {
  return obj?.value != null && Number.isFinite(Number(obj.value));
}

function lastFiniteValue(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  const last = rows[rows.length - 1];
  return last?.value != null && Number.isFinite(Number(last.value));
}

/** ECB M3 rows the ecb-derivatives chart can map. Leftover isLive / m3Growth bag remount-crash .map. */
export function ecbM3GrowthRows(ecbData) {
  return Array.isArray(ecbData?.m3Growth) ? ecbData.m3Growth : [];
}

/** ECB HICP rows the ecb-derivatives chart can map. Leftover isLive / hicpDetail bag remount-crash .map. */
export function ecbHicpDetailRows(ecbData) {
  return Array.isArray(ecbData?.hicpDetail) ? ecbData.hicpDetail : [];
}

/** ECB policy/MM history series the ecb-derivatives chart can map. Leftover isLive bag remount-crash .map. */
export function ecbHistorySeriesRows(bag, key) {
  return Array.isArray(bag?.history?.[key]) ? bag.history[key] : [];
}

/** ECB derivatives tile paints policy / MM / M3 / HICP values; bag existence is leftover. */
export function hasEcbDerivativesContent(ecbData) {
  const pr = ecbData?.policyRates;
  if (pr && typeof pr === 'object') {
    if (hasNumericField(pr.depositFacility) || hasNumericField(pr.mainRefinancing) || hasNumericField(pr.marginalLending)) return true;
    if (hasNumericField(pr.corridorWidth) || hasNumericField(pr.standingFacilitySpread)) return true;
  }
  const mm = ecbData?.moneyMarket;
  if (mm && typeof mm === 'object') {
    const keys = ['estr', 'estrP25', 'estrP75', 'estrMonthlyAvg', 'euribor1m', 'euribor3m', 'euribor6m', 'euribor1y', 'estrVolume', 'estrTransactions'];
    if (keys.some((k) => hasNumericField(mm[k]))) return true;
  }
  return lastFiniteValue(ecbData?.m3Growth) || lastFiniteValue(ecbData?.hicpDetail);
}

function hasPaintedSeries(arr) {
  return Array.isArray(arr) && arr.some((v) => v != null);
}

function hasDatedValuesSeries(series) {
  if (!Array.isArray(series?.dates) || !series.dates.length) return false;
  return hasPaintedSeries(series?.values);
}

/** VIX term chart is empty when dates exist but no current/prev series paint. */
export function hasVixTermSeries(vixTermStructure) {
  if (!Array.isArray(vixTermStructure?.dates) || !vixTermStructure.dates.length) return false;
  return hasPaintedSeries(vixTermStructure?.values) || hasPaintedSeries(vixTermStructure?.prevValues);
}

/** VIX 1Y chart is empty when dates exist but no values paint. */
export function hasFredVixSeries(fredVixHistory) {
  return hasDatedValuesSeries(fredVixHistory);
}

/** Skew tile is empty when history is dates-only and spot is missing. */
export function hasSkewContent(skewHistory, skewIndex) {
  if (skewIndex?.value != null && Number.isFinite(Number(skewIndex.value))) return true;
  if (!Array.isArray(skewHistory?.dates) || !skewHistory.dates.length) return false;
  return Array.isArray(skewHistory?.values) && skewHistory.values.some((v) => typeof v === 'number' && Number.isFinite(v));
}

/** Vol-surface cells; leftover grid-only bags (no strikes/expiries) stay empty. */
export function volSurfaceHeatmap(volSurfaceData) {
  const strikes = Array.isArray(volSurfaceData?.strikes) ? volSurfaceData.strikes : [];
  const expiries = Array.isArray(volSurfaceData?.expiries) ? volSurfaceData.expiries : [];
  const grid = Array.isArray(volSurfaceData?.grid) ? volSurfaceData.grid : [];
  if (!strikes.length || !expiries.length || !grid.length) {
    return { cells: [], strikes: [], expiries: [] };
  }
  const cells = [];
  for (let ei = 0; ei < expiries.length; ei++) {
    const row = Array.isArray(grid[ei]) ? grid[ei] : [];
    for (let si = 0; si < strikes.length; si++) {
      const v = row[si];
      if (v != null && Number.isFinite(Number(v))) cells.push([si, ei, Number(v)]);
    }
  }
  return { cells, strikes, expiries };
}

export function hasVolSurfaceGrid(volSurfaceData) {
  return volSurfaceHeatmap(volSurfaceData).cells.length > 0;
}
