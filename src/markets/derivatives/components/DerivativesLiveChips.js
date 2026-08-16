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