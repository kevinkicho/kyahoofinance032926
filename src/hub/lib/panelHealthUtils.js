/**
 * Shared substance / path helpers for panel health (eval + bus).
 *
 * Design goal: green only when a panel has *real* metric leaves for the
 * fields it claims — not "some sibling in the market payload is non-null".
 */

/** Keys that alone do not prove a live metric (taxonomy / ids without values). */
export const THIN_KEYS = new Set([
  'sector', 'ticker', 'symbol', 'unit', 'id', 'key', 'type', 'category',
  'status', 'source', 'label', 'columns', 'code', 'currency', 'exchange',
  'market', 'panel', 'field', 'path', 'name', 'title',
]);

export const META_KEYS = new Set([
  'lastUpdated', 'fetchedOn', 'isLive', 'isCurrent', 'isHistorical',
  'asOfDate', 'error', 'fetchLog', 'provenance', 'timestamp',
  '_source', '_lastUpdated', '_timestamp', '_meta', '_sources',
  '_coverage', '_error', '_fetchDuration', 'fetchedOn',
]);

export function resolvePath(obj, path) {
  if (obj == null || path == null || path === '') return obj;
  if (typeof path !== 'string') return null;
  if (path.startsWith('(')) return null;
  const parts = path.split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return null;
    cur = /^\d+$/.test(p) ? cur[Number(p)] : cur[p];
  }
  return cur;
}

function isEmDash(s) {
  const t = String(s).trim();
  return !t || t === '—' || t === '-' || t === '–' || t === 'N/A' || t === 'n/a' || t === 'null';
}

/**
 * True when `v` carries at least one displayable metric (number).
 * Rich strings alone are NOT enough for finance panels (was a false-green path).
 */
export function hasSubstance(v, depth = 0) {
  if (v == null || v === false || v === '') return false;
  if (depth > 6) return false;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'boolean') return false;
  if (typeof v === 'string') return false; // strings alone never prove metrics

  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    return v.some((x) => hasSubstance(x, depth + 1));
  }

  if (typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => !k.startsWith('_') && !META_KEYS.has(k));
    if (keys.length === 0) return false;

    for (const k of keys) {
      const child = v[k];
      if (typeof child === 'number' && Number.isFinite(child)) return true;
      if (child && typeof child === 'object' && hasSubstance(child, depth + 1)) return true;
    }
    return false;
  }

  return false;
}

/** Count finite number leaves (for confirm sampling quality). */
export function countNumericLeaves(v, depth = 0, acc = { n: 0 }) {
  if (acc.n >= 24 || depth > 6) return acc;
  if (typeof v === 'number' && Number.isFinite(v)) {
    acc.n += 1;
    return acc;
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      countNumericLeaves(x, depth + 1, acc);
      if (acc.n >= 24) break;
    }
    return acc;
  }
  if (v && typeof v === 'object') {
    for (const [k, child] of Object.entries(v)) {
      if (k.startsWith('_') || META_KEYS.has(k)) continue;
      countNumericLeaves(child, depth + 1, acc);
      if (acc.n >= 24) break;
    }
  }
  return acc;
}

/**
 * Multi-series / multi-row bags. Stopping a placeholder path at these roots
 * must prove density — not "one nested number greened the whole panel".
 */
export const CATALOG_ROOTS = new Set([
  'fred', 'yahoo', 'eia', 'worldBank', 'scorecardData', 'macroData',
  'sectorData', 'factorData', 'earningsData', 'shortData', 'centralBankData',
  'growthInflationData', 'debtData', 'history', 'spotRates', 'prevRates',
  'coinMarketData', 'defiData', 'fundingData', 'onChainData', 'cftcData',
  'riskData', 'returnsData', 'reitData', 'priceIndexData', 'affordabilityData',
  'capRateData', 'caseShillerData', 'supplyData', 'optionsFlow', 'volSurfaceData',
  'vixTermStructure', 'spreadData', 'emBondData', 'loanData', 'defaultData',
  'combinedRatioData', 'reinsurancePricing', 'catBondSpreads', 'insiderData',
  'series', 'quotes', 'indices', 'universe', 'auctionData', 'nationalDebt',
  'cotHistory', 'reer', 'rateDifferentials', 'gammaExposure', 'volPremium',
  'fredVixHistory', 'vixEnrichment', 'foreclosureData', 'mortgageRates',
  'creDelinquencies', 'hudData', 'creditRatings', 'durationLadder',
  'breakevensData', 'tipsYields', 'yieldCurveData', 'changes1d', 'changes1w',
  'changes1m', 'sparklines', 'priceDashboardData', 'sectorHeatmapData',
  'cotData', 'futuresCurveData', 'goldFuturesCurve', 'supplyDemand',
  'commercialPaper', 'delinquencyRates', 'lendingStandards', 'creditQuality',
  'fearGreedData', 'topExchanges', 'stablecoinMcap', 'btcDominance',
  'marginDebt', 'mutualFundFlows', 'consumerCredit', 'vvixHistory',
  'petroleum', 'naturalGas', 'electricity', 'co2Emissions',
]);

/** Single-metric series object (FRED/EIA style). */
export function isMetricSeries(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  if (typeof v.value === 'number' && Number.isFinite(v.value)) return true;
  if (typeof v.price === 'number' && Number.isFinite(v.price)) return true;
  if (Array.isArray(v.values) && v.values.some((x) => typeof x === 'number' && Number.isFinite(x))) return true;
  if (Array.isArray(v.history) && v.history.some((h) => typeof h?.value === 'number' || typeof h === 'number')) return true;
  if (v.latest && typeof v.latest === 'object' && typeof v.latest.value === 'number') return true;
  return false;
}

function filledRowCount(v) {
  if (Array.isArray(v)) {
    return v.filter((row) => countNumericLeaves(row).n > 0).length;
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => !k.startsWith('_') && !META_KEYS.has(k));
    return keys.filter((k) => countNumericLeaves(v[k]).n > 0).length;
  }
  return 0;
}

function bagDensityOk(v) {
  const nums = countNumericLeaves(v).n;
  if (nums === 0) return false;

  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    const filled = filledRowCount(v);
    if (filled === 0) return false;
    // Need a real slice of rows, not 1 lucky quote in a 40-row hollow table
    const need = Math.min(3, v.length);
    return filled >= need || (filled / v.length >= 0.5 && filled >= 2);
  }

  if (v && typeof v === 'object') {
    if (isMetricSeries(v)) return true;
    const keys = Object.keys(v).filter((k) => !k.startsWith('_') && !META_KEYS.has(k));
    if (keys.length === 0) return false;

    // Flat numeric map (FX spots)
    const numericDirect = keys.filter((k) => typeof v[k] === 'number' && Number.isFinite(v[k]));
    if (numericDirect.length >= 2 && numericDirect.length >= keys.length * 0.5) return true;

    // Map of quote objects / nested series
    const filled = filledRowCount(v);
    if (filled === 0) return false;
    const need = Math.min(3, keys.length);
    return filled >= need || (filled / keys.length >= 0.5 && filled >= 2);
  }

  return nums > 0;
}

/**
 * Whether a resolved placeholder path value counts as a filled slot.
 */
export function placeholderValueOk(v, path = '') {
  if (v == null) return false;
  const segs = String(path || '').split('.').filter(Boolean);
  const nums = countNumericLeaves(v).n;

  // Scalars
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string' || typeof v === 'boolean') return false;

  // Path is exactly a multi-series catalog root
  if (segs.length === 1 && CATALOG_ROOTS.has(segs[0])) {
    return bagDensityOk(v);
  }

  // Shallow bag (e.g. sectorHeatmapData.commodities, fred.copper is metric series OK)
  if (segs.length <= 2 && typeof v === 'object') {
    if (isMetricSeries(v)) return true;
    if (typeof v === 'number') return Number.isFinite(v);
    // Nested bag under a parent: still need density
    if (Array.isArray(v) || (v && Object.keys(v).length >= 3)) {
      return bagDensityOk(v);
    }
  }

  if (nums === 0) return false;

  if (Array.isArray(v)) {
    return bagDensityOk(v);
  }

  // Small objects with at least one number leaf
  if (isMetricSeries(v)) return true;
  if (nums >= 1 && segs.length >= 2) return true;
  // Root-ish objects need density
  if (segs.length <= 1) return bagDensityOk(v);

  return nums >= 1;
}
