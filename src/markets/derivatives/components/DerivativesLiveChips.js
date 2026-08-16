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
