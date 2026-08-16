/** Live-chip predicates for macro tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function lastValue(hist) {
  return Array.isArray(hist?.values) ? hist.values[hist.values.length - 1] : null;
}

/** Scorecard / GDP / CPI bars paint from country rows; empty message when none. */
export function hasScorecardRows(scorecardData) {
  return Array.isArray(scorecardData) && scorecardData.length > 0;
}

/** Rate bars return null unless current[] has rows. */
export function hasRateBarRows(centralBankData) {
  return Array.isArray(centralBankData?.current) && centralBankData.current.length > 0;
}

/** Debt bars return null unless countries[] has rows. */
export function hasDebtBarRows(debtData) {
  return Array.isArray(debtData?.countries) && debtData.countries.length > 0;
}

/** Sidebar always paints 4 section titles; live when any bar section has rows. */
export function hasMacroSidebarContent({ scorecardData, centralBankData, debtData } = {}) {
  return hasScorecardRows(scorecardData) || hasRateBarRows(centralBankData) || hasDebtBarRows(debtData);
}

/** Activity always paints CFNAI as —; live when a number or chart series exists. */
export function hasActivityContent(cfnai, yieldSpread) {
  if (isFiniteNumber(cfnai?.latest) || isFiniteNumber(lastValue(cfnai))) return true;
  if (Array.isArray(cfnai?.dates) && cfnai.dates.length > 0
    && Array.isArray(cfnai?.values) && cfnai.values.length > 0) return true;
  if (Array.isArray(yieldSpread?.values) && yieldSpread.values.length > 0) return true;
  return false;
}

/** CLI tile shows "No CLI data available" unless country cards exist. */
export function hasCliRows(oecdCliDetail, oecdCli) {
  if (Array.isArray(oecdCliDetail?.countries) && oecdCliDetail.countries.length > 0) return true;
  if (!oecdCli || typeof oecdCli !== 'object' || Array.isArray(oecdCli)) return false;
  return Object.values(oecdCli).some((entry) => {
    if (isFiniteNumber(entry)) return true;
    return isFiniteNumber(entry?.value) || isFiniteNumber(entry?.cli);
  });
}

/** WB trade chart needs countries with tradeGdp; otherwise "No trade data available". */
export function hasWbTradeRows(wbData) {
  const countries = Array.isArray(wbData?.countries) ? wbData.countries : [];
  return countries.some((c) => c?.tradeGdp != null);
}

/** WB dev scatter needs 2+ countries with gdpPerCap and gdpGrowth. */
export function hasWbDevRows(wbData) {
  const countries = Array.isArray(wbData?.countries) ? wbData.countries : [];
  return countries.filter((c) => c?.gdpPerCap != null && c?.gdpGrowth != null).length >= 2;
}