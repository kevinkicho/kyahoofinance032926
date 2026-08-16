/** Live-chip predicates for BLS tiles that can paint emptyHint. */

const KPI_KEYS = [
  'unemployment', 'laborParticipation', 'employmentPop', 'nonfarmPayrolls',
  'cpi', 'ppi', 'jobOpenings', 'unemployedPersons',
];
const TRENDS_LABOR_KEYS = ['unemployment', 'laborParticipation', 'employmentPop', 'nonfarmPayrolls'];
const TRENDS_PRICES_KEYS = ['cpi', 'ppi', 'jobOpenings', 'unemployedPersons'];
const JOLTS_KEYS = ['jobOpenings', 'joltsHires', 'joltsQuits', 'joltsLayoffs'];
const PRODUCTIVITY_KEYS = ['outputPerHour', 'unitLaborCosts'];
const CPI_KEYS = ['cpi', 'cpiFood', 'cpiEnergy', 'cpiShelter'];
const PPI_KEYS = ['ppi', 'ppiIntermediate', 'ppiServices'];
const ECI_KEYS = ['eciTotal', 'eciWages', 'eciBenefits'];
const DURATION_KEYS = ['unempLess5Weeks', 'unemp5To14Weeks', 'unemp15To26Weeks', 'unemp27PlusWeeks'];

/** Same inclusion rule as usePanelItems: source, history, or latest value. */
export function hasBlsSeries(s) {
  if (!s || typeof s !== 'object') return false;
  if (s._source) return true;
  if (Array.isArray(s.history?.values) && s.history.values.length > 0) return true;
  return s.latest?.value != null;
}

export function hasBlsPanelItems(series, keys) {
  if (!series || typeof series !== 'object') return false;
  return (Array.isArray(keys) ? keys : []).some((key) => hasBlsSeries(series[key]));
}

export function hasBlsKpiItems(series) { return hasBlsPanelItems(series, KPI_KEYS); }
export function hasBlsTrendsLaborItems(series) { return hasBlsPanelItems(series, TRENDS_LABOR_KEYS); }
export function hasBlsTrendsPricesItems(series) { return hasBlsPanelItems(series, TRENDS_PRICES_KEYS); }
export function hasBlsJoltsItems(series) { return hasBlsPanelItems(series, JOLTS_KEYS); }
export function hasBlsProductivityItems(series) { return hasBlsPanelItems(series, PRODUCTIVITY_KEYS); }
export function hasBlsCpiItems(series) { return hasBlsPanelItems(series, CPI_KEYS); }
export function hasBlsPpiItems(series) { return hasBlsPanelItems(series, PPI_KEYS); }
export function hasBlsEciItems(series) { return hasBlsPanelItems(series, ECI_KEYS); }
export function hasBlsDurationItems(series) { return hasBlsPanelItems(series, DURATION_KEYS); }
