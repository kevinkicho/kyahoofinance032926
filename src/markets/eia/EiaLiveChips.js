/** Live-chip predicates for EIA tiles that can paint empty / loading hints. */

const ELEC_SECTORS = ['residential', 'commercial', 'industrial'];
const PETRO_KEYS = ['wti', 'brent', 'gasoline', 'diesel', 'heatingOil'];

function nonNullCount(values) {
  return Array.isArray(values) ? values.filter((v) => v != null).length : 0;
}

/** Prices tile paints SectorCards only when a sector has latest.price. */
export function hasElectricityPrices(electricity) {
  if (!electricity || typeof electricity !== 'object') return false;
  return ELEC_SECTORS.some((key) => electricity[key]?.latest?.price != null);
}

/** Consumption tile paints SalesCards only when a sector has latest.sales. */
export function hasElectricitySales(electricity) {
  if (!electricity || typeof electricity !== 'object') return false;
  return ELEC_SECTORS.some((key) => electricity[key]?.latest?.sales != null);
}

/** Trends tile needs >=3 price points and a sparkline (>=2 non-null). */
export function hasElectricityPriceTrends(electricity) {
  if (!electricity || typeof electricity !== 'object') return false;
  return ELEC_SECTORS.some((key) => {
    const vals = electricity[key]?.price?.values;
    return Array.isArray(vals) && vals.length >= 3 && nonNullCount(vals) >= 2;
  });
}

/** CO2 tile skips Total/TT rows; empty when only those (or nothing) exist. */
export function hasCo2SectorRows(co2Emissions) {
  const rows = Array.isArray(co2Emissions?.bySector) ? co2Emissions.bySector : [];
  return rows.some((s) => {
    const n = String(s?.name || '');
    return n && !/^total\b/i.test(n) && n !== 'TT';
  });
}

/** Petroleum tile paints a sparkline only when a product has >=2 non-null values. */
export function hasPetroleumSeries(petroleum) {
  if (!petroleum || typeof petroleum !== 'object') return false;
  return PETRO_KEYS.some((key) => nonNullCount(petroleum[key]?.values) >= 2);
}

/** Natural-gas tile paints when Henry Hub has a values array. */
export function hasHenryHubSeries(naturalGas) {
  const vals = naturalGas?.henryHub?.values;
  return Array.isArray(vals) && vals.length > 0;
}
