/** Live-chip predicates for commodities tiles that can paint empty / loading hints. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** FAO rows that paint an index; leftover isLive / dates-only bags stay empty. */
export function faoPricePoints(faoData) {
  const series = Array.isArray(faoData?.series) ? faoData.series : [];
  const points = [];
  for (const row of series) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (!isFiniteNumber(row.value)) continue;
    points.push({ date: row.date, value: row.value });
  }
  return points;
}

export function hasFaoPriceSeries(faoData) {
  return faoPricePoints(faoData).length > 0;
}