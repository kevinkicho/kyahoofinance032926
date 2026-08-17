/** Live-chip predicates for macro tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isPaintedNumber(v) {
  if (v == null || v === '') return false;
  return Number.isFinite(typeof v === 'number' ? v : Number(v));
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

function hasNumericField(obj) {
  const v = obj?.value;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string' && v.trim() !== '') return Number.isFinite(Number(v));
  return false;
}

/** ECB EUR rate the tile can toFixed. Leftover isLive bag remount-crash .toFixed. */
export function ecbEurRateValue(obs) {
  return hasNumericField(obs) ? Number(obs.value) : null;
}

/** ECB EUR tile paints policy / MM values; leftover isLive bags stay empty. */
export function hasEcbEurContent(ecbData) {
  const pr = ecbData?.policyRates;
  if (!pr || typeof pr !== 'object') return false;
  if (hasNumericField(pr.depositFacility) || hasNumericField(pr.mainRefinancing) || hasNumericField(pr.marginalLending)) return true;
  if (hasNumericField(pr.corridorWidth) || hasNumericField(pr.standingFacilitySpread)) return true;
  const mm = ecbData?.moneyMarket;
  if (mm && typeof mm === 'object') {
    const keys = ['estr', 'estrP25', 'estrP75', 'estrMonthlyAvg', 'euribor1m', 'euribor3m', 'euribor6m', 'euribor1y'];
    if (keys.some((k) => hasNumericField(mm[k]))) return true;
  }
  return false;
}

/** DTS series the tga-balance / global-liquidity charts can slice. Leftover isLive / series bag remount-crash .slice. */
export function dtsSeriesRows(dtsData) {
  return Array.isArray(dtsData?.series) ? dtsData.series : [];
}

/** ECB M3 rows the ecb-eur / global-liquidity charts can slice. Leftover isLive / m3Growth bag remount-crash .slice. */
export function ecbM3GrowthRows(ecbData) {
  return Array.isArray(ecbData?.m3Growth) ? ecbData.m3Growth : [];
}

/** TGA chart paints dts.series; isLive can be true with an empty series. */
export function hasTgaSeries(dtsData) {
  return dtsSeriesRows(dtsData).length > 0;
}

/** GDPNow evolution the gdpnow tile can map. Leftover isLive bag remount-crash .map. */
export function gdpNowEvolutionRows(gdpNowData) {
  return Array.isArray(gdpNowData?.evolution) ? gdpNowData.evolution : [];
}

/** GDPNow prior-quarter rows the gdpnow tile can map. Leftover isLive bag remount-crash .map. */
export function gdpNowPriorQuarterRows(gdpNowData) {
  return Array.isArray(gdpNowData?.priorQuarters) ? gdpNowData.priorQuarters : [];
}

/** GDPNow chart paints evolution[]; currentQuarter-only is the sibling field-map leftover. */
export function hasGdpNowEvolution(gdpNowData) {
  return gdpNowEvolutionRows(gdpNowData).length > 0;
}

const SEP_YEAR_FALLBACK = ['Y1', 'Y2', 'Y3', 'Longer'];

/** FOMC SEP year headers the fomc-sep tile can map. Leftover isLive bag remount-crash .map while projections is real. */
export function sepYearHeaders(sepData) {
  return Array.isArray(sepData?.yearHeaders) ? sepData.yearHeaders : SEP_YEAR_FALLBACK;
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

/** COFER pie needs 3+ currency keys with a numeric share; leftover keys-only bag is empty. */
export function hasImfCoferShares(cofer) {
  if (!cofer || typeof cofer !== 'object' || Array.isArray(cofer)) return false;
  if (Object.keys(cofer).length < 3) return false;
  return Object.values(cofer).some((v) => isPaintedNumber(v?.value));
}

/** Liquidity cards/charts paint TGA close, M3, saving rate, or GDPNow; leftover series length is empty. */
export function hasGlobalLiquidityContent({ dtsData, ecbData, beaData, gdpNowData } = {}) {
  const tgaSeries = dtsSeriesRows(dtsData);
  const tgaLatest = dtsData?.latest || tgaSeries[tgaSeries.length - 1];
  if (isPaintedNumber(tgaLatest?.closeB)) return true;
  if (tgaSeries.some((p) => isPaintedNumber(p?.closeB))) return true;
  const m3 = ecbM3GrowthRows(ecbData);
  if (m3.some((p) => isPaintedNumber(p?.value))) return true;
  const saving = Array.isArray(beaData?.savingRate) ? beaData.savingRate : [];
  if (saving.some((r) => String(r?.desc || '').toLowerCase().includes('personal saving as a percentage') && isPaintedNumber(r?.value))) return true;
  const evo = gdpNowEvolutionRows(gdpNowData);
  const gdpNow = gdpNowData?.latest?.gdp ?? evo[evo.length - 1]?.gdp;
  if (isPaintedNumber(gdpNow)) return true;
  return false;
}
