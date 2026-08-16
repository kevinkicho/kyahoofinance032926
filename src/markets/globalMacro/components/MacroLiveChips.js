/** Live-chip predicates for macro tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function lastValue(hist) {
  return Array.isArray(hist?.values) ? hist.values[hist.values.length - 1] : null;
}

/** KPI strip returns null unless a US/EA/CN GDP, Fed, DXY, or CPI number paints. */
export function hasMacroKpiMetrics({ scorecardData, centralBankData, dxyHistory } = {}) {
  const list = Array.isArray(scorecardData) ? scorecardData : [];
  // Strip bails before DXY when the leftover scorecard bag has no rows.
  if (!list.length) return false;

  const us = list.find((c) => c.code === 'US');
  const eu = list.find((c) => c.code === 'EA');
  const cn = list.find((c) => c.code === 'CN');
  if (isFiniteNumber(us?.gdp) || isFiniteNumber(eu?.gdp) || isFiniteNumber(cn?.gdp)) return true;

  const current = Array.isArray(centralBankData?.current) ? centralBankData.current : [];
  const fedRate = current.find((c) => c.code === 'US')?.rate;
  if (isFiniteNumber(fedRate)) return true;

  if (isFiniteNumber(lastValue(dxyHistory))) return true;

  return list.some((c) => isFiniteNumber(c?.cpi));
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

/** ECB EUR tile paints only when policyRates exists; M3/HICP siblings can set isLive. */
export function hasEcbEurContent(ecbData) {
  const pr = ecbData?.policyRates;
  if (!pr || typeof pr !== 'object') return false;
  if (pr.depositFacility || pr.mainRefinancing || pr.marginalLending) return true;
  const mm = ecbData?.moneyMarket;
  return !!(mm && (mm.estr || mm.euribor1m || mm.euribor3m || mm.euribor6m || mm.euribor1y));
}

/** TGA chart paints dts.series; isLive can be true with an empty series. */
export function hasTgaSeries(dtsData) {
  return Array.isArray(dtsData?.series) && dtsData.series.length > 0;
}

/** GDPNow chart paints evolution[]; currentQuarter-only is the sibling field-map leftover. */
export function hasGdpNowEvolution(gdpNowData) {
  return Array.isArray(gdpNowData?.evolution) && gdpNowData.evolution.length > 0;
}

/** FOMC SEP table paints projections[]; summary-only stays on the loading body. */
export function hasFomcSepProjections(sepData) {
  return Array.isArray(sepData?.projections) && sepData.projections.length > 0;
}

/** Cleveland nowcast is empty unless tables or a YoY/latest headline exist. */
export function hasClevelandNowcast(cleveData) {
  const tables = Array.isArray(cleveData?.tables) ? cleveData.tables : [];
  if (tables.length > 0) return true;
  return !!(cleveData?.byKind?.yoy || cleveData?.latest);
}

/** BEA accounts cards gate on gdpComponents / savingRate; corporateProfits is a sibling. */
export function hasBeaAccountsRows(beaData) {
  return (Array.isArray(beaData?.gdpComponents) && beaData.gdpComponents.length > 0)
    || (Array.isArray(beaData?.savingRate) && beaData.savingRate.length > 0);
}

/** Eurostat chart needs HICP, unemployment, or deficit rows. */
export function hasEurostatRows(eurostatData) {
  return (Array.isArray(eurostatData?.hicp) && eurostatData.hicp.length > 0)
    || (Array.isArray(eurostatData?.unemployment) && eurostatData.unemployment.length > 0)
    || (Array.isArray(eurostatData?.govtDeficit) && eurostatData.govtDeficit.length > 0);
}

/** OECD CLI momentum bars need country series with a latest value. */
export function hasOecdDirectRows(oecdData) {
  const cli = oecdData?.cli && typeof oecdData.cli === 'object' ? oecdData.cli : {};
  return Object.values(cli).some((rows) => {
    const series = Array.isArray(rows) ? rows : [];
    return series.some((r) => r?.value != null);
  });
}

const BEA_INCOME_DESC = [
  'personal income',
  'disposable personal income',
  'personal outlays',
  'personal consumption',
  'personal saving',
];

/** BEA income tile paints savingRate income lines / saving-rate cycle; GDP bag is sibling. */
export function hasBeaIncomeContent(beaData) {
  const rows = Array.isArray(beaData?.savingRate) ? beaData.savingRate : [];
  if (rows.some((r) => String(r?.desc || '').toLowerCase().includes('personal saving as a percentage'))) return true;
  const latestPeriod = rows[0]?.period;
  return rows.some((row) => {
    if (row.period !== latestPeriod || row.value == null) return false;
    const desc = String(row.desc || '').toLowerCase();
    return BEA_INCOME_DESC.some((needle) => desc.includes(needle));
  });
}
