/** Live-chip predicates for Sentiment tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function num(...candidates) {
  for (const v of candidates) {
    if (isFiniteNumber(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function lastValue(hist) {
  return Array.isArray(hist?.values) ? hist.values[hist.values.length - 1] : null;
}

function hasSeriesValues(hist) {
  return Array.isArray(hist?.values) && hist.values.length > 0;
}

export function signalList(riskData) {
  if (Array.isArray(riskData)) return riskData;
  return Array.isArray(riskData?.signals) ? riskData.signals : [];
}

function signalValue(riskData, ...names) {
  const signals = riskData?.signals;
  if (!Array.isArray(signals)) return null;
  for (const name of names) {
    const hit = signals.find((s) => s?.name === name || s?.name?.toLowerCase() === name.toLowerCase());
    if (hit && num(hit.value) != null) return hit.value;
  }
  return null;
}

/** Any numeric risk metric the sidebar / key-metrics / risk-dashboard can paint. */
function hasPaintedRiskNumber(riskData, extras = {}) {
  const { vvixHistory, fsiHistory } = extras;
  return num(
    riskData?.overallScore,
    riskData?.vix, signalValue(riskData, 'VIX'),
    riskData?.vvix, signalValue(riskData, 'VVIX'), lastValue(vvixHistory),
    riskData?.vix3m, signalValue(riskData, 'VIX3M'),
    riskData?.move, signalValue(riskData, 'MOVE'),
    riskData?.skew, signalValue(riskData, 'SKEW'),
    riskData?.hyOas, riskData?.hySpread, signalValue(riskData, 'HY Credit Spread', 'HY'),
    riskData?.igOas, riskData?.igSpread, signalValue(riskData, 'IG Credit Spread', 'IG'),
    riskData?.yieldCurve, signalValue(riskData, 'Yield Curve'),
    riskData?.fsi, signalValue(riskData, 'Financial Stress'), lastValue(fsiHistory),
    riskData?.goldVsUsd, signalValue(riskData, 'Gold vs USD'),
    riskData?.emVsUs, signalValue(riskData, 'EM vs US Equities'),
    riskData?.putCallRatio, riskData?.putCall,
  ) != null;
}

/** Sidebar shows empty 'No live risk metrics yet' unless a painted metric exists. */
export function hasSentimentSidebarContent({
  fearGreedData,
  riskData,
  marginDebt,
  consumerCredit,
  vvixHistory,
  fsiHistory,
} = {}) {
  if (num(fearGreedData?.value, fearGreedData?.score) != null) return true;
  if (riskData?.overallLabel) return true;
  if (Array.isArray(fearGreedData?.indicators) && fearGreedData.indicators.length > 0) return true;
  if (hasPaintedRiskNumber(riskData, { vvixHistory, fsiHistory })) return true;
  if (hasSeriesValues(marginDebt) || hasSeriesValues(consumerCredit)) return true;
  return false;
}

/** Key-metrics always paints section chrome; live only when a metric is numeric. */
export function hasSentimentKeyMetrics({
  fearGreedData,
  riskData,
  marginDebt,
  vvixHistory,
  fsiHistory,
} = {}) {
  if (num(riskData?.overallScore) != null) return true;
  if (num(fearGreedData?.value, fearGreedData?.score, fearGreedData?.altmeScore) != null) return true;
  if (hasPaintedRiskNumber(riskData, { vvixHistory, fsiHistory })) return true;
  if (hasSeriesValues(marginDebt)) return true;
  return false;
}

/** FSI chart is EmptyPanelBody unless history dates exist. */
export function hasFsiHistory(fsiHistory) {
  return Array.isArray(fsiHistory?.dates) && fsiHistory.dates.length > 0;
}

/** CFTC tile is EmptyPanelBody unless currency rows exist. */
export function hasCftcCurrencies(cftcData) {
  return Array.isArray(cftcData?.currencies) && cftcData.currencies.length > 0;
}

/** Cross-asset tile is EmptyPanelBody unless return rows exist. */
export function hasCrossAssetReturns(returnsData) {
  const assets = returnsData?.assets || returnsData;
  return Array.isArray(assets) && assets.length > 0;
}

/** Risk dashboard paints dashes / empty when no score, signal, or history series exists. */
export function hasRiskDashboardContent({
  riskData,
  vvixHistory,
  fsiHistory,
  marginDebt,
} = {}) {
  if (num(riskData?.overallScore) != null) return true;
  if (riskData?.overallLabel) return true;
  if (hasPaintedRiskNumber(riskData, { fsiHistory })) return true;
  if (hasFsiHistory(fsiHistory) && hasSeriesValues(fsiHistory)) return true;
  if (Array.isArray(marginDebt?.dates) && marginDebt.dates.length > 0 && hasSeriesValues(marginDebt)) return true;
  if (
    Array.isArray(vvixHistory?.dates) && vvixHistory.dates.length > 0
    && Array.isArray(vvixHistory?.values)
    && vvixHistory.values.some((v) => typeof v === 'number' && v > 50)
  ) return true;
  return false;
}

/** News-sentiment chart is EmptyPanelBody unless SF Fed series rows exist. */
export function hasNewsSentimentSeries(newsSentimentData) {
  return Array.isArray(newsSentimentData?.series) && newsSentimentData.series.length > 0;
}

function fsiFromSignals(riskData) {
  const signals = riskData?.signals;
  if (!Array.isArray(signals)) return null;
  const hit = signals.find((s) => /financial stress|stlfsi|fsi/i.test(s?.name || ''));
  return hit ? num(hit.value) : null;
}

/** Fed-risk-mood always paints 5 cards; leftover riskData bag still dashes all but fake +0 Mixed. */
export function hasFedRiskMoodContent({
  newsSentimentData,
  fearGreedData,
  riskData,
  fsiHistory,
} = {}) {
  const series = newsSentimentData?.series;
  if (Array.isArray(series) && series.length) {
    const latest = series[series.length - 1];
    if (num(latest?.sentiment) != null) return true;
  }
  if (num(fearGreedData?.value, fearGreedData?.score, fearGreedData?.altmeScore) != null) return true;
  if (num(riskData?.overallScore) != null) return true;
  if (num(lastValue(fsiHistory), riskData?.fsi) != null) return true;
  if (fsiFromSignals(riskData) != null) return true;
  return false;
}
