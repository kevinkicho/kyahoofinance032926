/** Live-chip predicates for commodities tiles that can paint empty / loading hints. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isChartDate(d) {
  if (typeof d !== 'string' || !d) return false;
  const parsed = new Date(d);
  return Number.isFinite(parsed.getTime());
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

/** EIA petrol rows that paint the gasoline / Henry Hub chart. */
export function eiaPetrolSeriesPoints(eiaData, key) {
  const series = Array.isArray(eiaData?.[key]?.series) ? eiaData[key].series : [];
  const points = [];
  for (const row of series) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (!isChartDate(row.date) || !isFiniteNumber(row.value)) continue;
    points.push({ date: row.date, value: row.value });
  }
  return points;
}

/** Tile / live chip: gasoline is the date anchor; leftover isLive / dates-only stay empty. */
export function hasEiaPetrolSeries(eiaData) {
  return eiaPetrolSeriesPoints(eiaData, 'gasoline').length > 0;
}

export function eiaPetrolLatest(eiaData, key) {
  const latest = eiaData?.[key]?.latest;
  if (!latest || typeof latest !== 'object' || Array.isArray(latest)) return null;
  if (!isFiniteNumber(latest.value)) return null;
  return latest;
}

function yoyLabel(yoy) {
  if (!isFiniteNumber(yoy)) return null;
  return `${yoy >= 0 ? '+' : ''}${yoy.toFixed(0)}% YoY`;
}

/** Subtitle for eia-petrol; leftover latest / yoy bags must not throw. */
export function eiaPetrolSubtitle(eiaData) {
  const gas = eiaPetrolLatest(eiaData, 'gasoline');
  const ng = eiaPetrolLatest(eiaData, 'naturalGas');
  if (!gas || !ng) return null;
  const gasYoy = yoyLabel(eiaData?.gasoline?.yoyPct);
  const ngYoy = yoyLabel(eiaData?.naturalGas?.yoyPct);
  let text = `Gasoline $${gas.value.toFixed(2)}/gal${gasYoy ? ` (${gasYoy})` : ''} · NG $${ng.value.toFixed(2)}/MMBtu${ngYoy ? ` (${ngYoy})` : ''}`;
  const crude = eiaPetrolLatest(eiaData, 'crudeStocks');
  if (crude) text += ` · Crude stocks ${(crude.value / 1000).toFixed(0)}M bbl`;
  return text;
}
