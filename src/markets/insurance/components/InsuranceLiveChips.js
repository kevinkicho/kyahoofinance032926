/** Live-chip predicates for insurance tiles that can paint empty. */

/** KPI strip returns null when no combined-ratio / reinsurer / HY OAS / FRED equity pill exists. */
export function hasInsuranceKpiMetrics({
  industryAvgCombinedRatio,
  reinsurers,
  fredHyOasHistory,
  sectorETF,
} = {}) {
  if (typeof industryAvgCombinedRatio === 'number') return true;
  if (Array.isArray(reinsurers) && reinsurers.slice(0, 4).some((r) => r?.price != null)) return true;
  const hyOasPct = fredHyOasHistory?.values?.[fredHyOasHistory.values.length - 1];
  if (hyOasPct != null) return true;
  if (Array.isArray(sectorETF)) {
    return sectorETF.some((e) => e && (e.symbol || e.ticker || e.seriesId) && e.price != null);
  }
  if (sectorETF && typeof sectorETF === 'object') return sectorETF.price != null;
  return false;
}

/** Same fallbacks as the catastrophe-loss chart: FRED $ series, else FEMA by-type / by-year. */
export function resolveCatLosses(catLosses, femaData) {
  if (catLosses?.values?.length >= 2) return catLosses;
  const byType = femaData?.byType;
  if (Array.isArray(byType) && byType.length) {
    const rows = byType.filter((r) => r?.type && Number(r.count) != null);
    if (rows.length) {
      return {
        dates: rows.map((r) => r.type),
        values: rows.map((r) => Number(r.count) || 0),
        seriesId: 'FEMA_BY_TYPE',
        unit: 'declarations',
        _note: 'Proxy: FEMA declaration counts by disaster type (not $ losses)',
      };
    }
  }
  if (catLosses?.values?.length) return catLosses;
  const decls = femaData?.declarations;
  if (Array.isArray(decls) && decls.length) {
    const byYear = {};
    for (const d of decls) {
      const y = String(d.declarationDate || d.firstDeclared || d.incidentBegin || d.date || '').slice(0, 4);
      if (/^\d{4}$/.test(y)) byYear[y] = (byYear[y] || 0) + 1;
    }
    const years = Object.keys(byYear).sort();
    if (years.length) {
      return {
        dates: years,
        values: years.map((y) => byYear[y]),
        seriesId: 'FEMA_DECL_COUNT',
        unit: 'declarations',
        _note: 'Proxy: FEMA declaration counts by year',
      };
    }
  }
  return null;
}

export function hasCatLossSeries(catLosses, femaData) {
  const resolved = resolveCatLosses(catLosses, femaData);
  return Array.isArray(resolved?.values) && resolved.values.length > 0;
}

/** Combined-ratio-by-line table: byLine[] with ratio, or last numeric in lines map. */
export function combinedRatioByLineRows(combinedRatioData) {
  if (Array.isArray(combinedRatioData?.byLine) && combinedRatioData.byLine.length) {
    return combinedRatioData.byLine.filter((r) => r?.ratio != null);
  }
  const lines = combinedRatioData?.lines;
  if (!lines || typeof lines !== 'object') return [];
  const rows = [];
  for (const [line, arr] of Object.entries(lines)) {
    if (!Array.isArray(arr)) continue;
    let ratio = null;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] != null && Number.isFinite(Number(arr[i]))) {
        ratio = Number(arr[i]);
        break;
      }
    }
    if (ratio != null) rows.push({ line, ratio });
  }
  return rows.sort((a, b) => b.ratio - a.ratio);
}

export function hasCombinedRatioByLine(combinedRatioData) {
  return combinedRatioByLineRows(combinedRatioData).length > 0;
}

/** Reinsurance-rate table: byCategory, equity-proxy array, or priced reinsurers. */
export function reinsuranceRateRows(reinsurancePricing, reinsurers) {
  if (Array.isArray(reinsurancePricing?.byCategory) && reinsurancePricing.byCategory.length) {
    return reinsurancePricing.byCategory;
  }
  if (Array.isArray(reinsurancePricing) && reinsurancePricing.length) {
    return reinsurancePricing;
  }
  if (Array.isArray(reinsurers) && reinsurers.length) {
    return reinsurers.filter((r) => r?.price != null);
  }
  return [];
}

export function hasReinsuranceRateRows(reinsurancePricing, reinsurers) {
  return reinsuranceRateRows(reinsurancePricing, reinsurers).length > 0;
}