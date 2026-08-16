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


/** USDA NASS rows that paint the ag-prices chart. Leftover isLive / period-only stay empty. */
export function usdaAgSeriesPoints(usdaData, key) {
  const series = Array.isArray(usdaData?.commodities?.[key]) ? usdaData.commodities[key] : [];
  const points = [];
  for (const row of series) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (typeof row.period !== 'string' || !row.period) continue;
    if (!isFiniteNumber(row.year) || !isFiniteNumber(row.value)) continue;
    points.push({ period: row.period, year: row.year, value: row.value });
  }
  return points;
}

/** Summary commodities that have at least one painted NASS point. */
export function usdaAgSummaryRows(usdaData) {
  const summary = Array.isArray(usdaData?.summary) ? usdaData.summary : [];
  const rows = [];
  for (const s of summary) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue;
    if (typeof s.key !== 'string' || !s.key) continue;
    const points = usdaAgSeriesPoints(usdaData, s.key);
    if (!points.length) continue;
    rows.push({
      key: s.key,
      desc: typeof s.desc === 'string' && s.desc ? s.desc : s.key,
      unit: typeof s.unit === 'string' ? s.unit : '',
      color: typeof s.color === 'string' ? s.color : undefined,
      points,
    });
  }
  return rows;
}

export function hasUsdaAgSeries(usdaData) {
  return usdaAgSummaryRows(usdaData).length > 0;
}

const USDA_FRED_KEYS = ['corn', 'wheat', 'soybeans'];

/** FRED fallback histories that paint the tile when NASS is empty. */
export function usdaFredHistoryPoints(fred, key) {
  const history = Array.isArray(fred?.[key]?.history) ? fred[key].history : [];
  const points = [];
  for (const row of history) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (typeof row.date !== 'string' || !row.date) continue;
    if (!isFiniteNumber(row.value)) continue;
    points.push({ date: row.date, value: row.value });
  }
  return points;
}

export function hasUsdaFredSeries(fred) {
  return USDA_FRED_KEYS.some((key) => usdaFredHistoryPoints(fred, key).length > 0);
}

/** Subtitle for usda-ag; leftover latest / desc / unit / yoy must not throw. */
export function usdaAgSubtitle(usdaData) {
  const summary = Array.isArray(usdaData?.summary) ? usdaData.summary : [];
  const parts = [];
  for (const s of summary) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue;
    const latest = s.latest;
    if (!latest || typeof latest !== 'object' || Array.isArray(latest)) continue;
    if (!isFiniteNumber(latest.value)) continue;
    const desc = typeof s.desc === 'string' && s.desc
      ? s.desc
      : (typeof s.key === 'string' ? s.key : '');
    if (!desc) continue;
    const unit = typeof s.unit === 'string' ? s.unit.replace('$/','/') : '';
    let text = desc.slice(0, 4) + ' ' + latest.value.toFixed(2) + unit;
    if (isFiniteNumber(s.yoyPct)) {
      text += ' (' + (s.yoyPct >= 0 ? '+' : '') + s.yoyPct.toFixed(0) + '% YoY)';
    }
    parts.push(text);
    if (parts.length >= 4) break;
  }
  return parts.length ? parts.join(' · ') : null;
}


/** Census trade rows that paint the US-trade chart. Leftover isLive / month-only stay empty. */
export function usTradeBlocPoints(bloc) {
  const series = Array.isArray(bloc?.series) ? bloc.series : [];
  const points = [];
  for (const row of series) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (typeof row.month !== 'string' || !row.month) continue;
    if (!isFiniteNumber(row.balanceB)) continue;
    points.push({
      month: row.month,
      balanceB: row.balanceB,
      exportsB: isFiniteNumber(row.exportsB) ? row.exportsB : null,
      importsB: isFiniteNumber(row.importsB) ? row.importsB : null,
    });
  }
  return points;
}

/** Blocs that have at least one painted balance point. */
export function usTradeBlocs(tradeData) {
  const blocs = Array.isArray(tradeData?.blocs) ? tradeData.blocs : [];
  const rows = [];
  for (const b of blocs) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) continue;
    const points = usTradeBlocPoints(b);
    if (!points.length) continue;
    const code = typeof b.code === 'string' ? b.code : '';
    const label = typeof b.label === 'string' && b.label
      ? b.label
      : (code || 'Bloc');
    rows.push({ code, label, points });
  }
  return rows;
}

export function hasUsTradeSeries(tradeData) {
  return usTradeBlocs(tradeData).length > 0;
}

/** Subtitle for us-trade; leftover summary / toFixed bags must not throw. */
export function usTradeSubtitle(tradeData) {
  const summary = tradeData?.summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return null;
  const month = typeof summary.latestMonth === 'string' && summary.latestMonth
    ? summary.latestMonth
    : '';
  if (!month) return null;
  if (!isFiniteNumber(summary.worldExportsB) || !isFiniteNumber(summary.worldImportsB) || !isFiniteNumber(summary.worldBalanceB)) {
    return null;
  }
  const exp = summary.worldExportsB;
  const imp = summary.worldImportsB;
  const bal = summary.worldBalanceB;
  return month + ': $' + exp.toFixed(1) + 'B exports · $' + imp.toFixed(1) + 'B imports · net ' + (bal >= 0 ? '+' : '') + '$' + bal.toFixed(1) + 'B';
}

/** Physical Pressure table rows. Leftover isLive / bag-only sources stay empty. */
function fmtPressureNum(n, digits) {
  if (!isFiniteNumber(n)) return null;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function pressureYoyRead(yoy) {
  if (!isFiniteNumber(yoy)) return 'No YoY';
  return (yoy >= 0 ? '+' : '') + yoy.toFixed(1) + '% YoY';
}

function pressureFromYoy(yoy, up, down) {
  return isFiniteNumber(yoy) && yoy > 0 ? up : down;
}

function usdaLatestNumber(item) {
  if (isFiniteNumber(item?.latest)) return item.latest;
  const latest = item?.latest;
  if (!latest || typeof latest !== 'object' || Array.isArray(latest)) return null;
  return isFiniteNumber(latest.value) ? latest.value : null;
}

export function physicalPressureRows(eiaData, usdaData, tradeData) {
  const rows = [];

  const crude = eiaPetrolLatest(eiaData, 'crudeStocks');
  if (crude) {
    const value = fmtPressureNum(crude.value / 1000, 0);
    if (value != null) {
      rows.push({
        market: 'Crude stocks',
        value,
        unit: 'M bbl',
        pressure: pressureFromYoy(eiaData?.crudeStocks?.yoyPct, 'Looser', 'Tighter'),
        read: pressureYoyRead(eiaData?.crudeStocks?.yoyPct),
      });
    }
  }

  const gas = eiaPetrolLatest(eiaData, 'gasoline');
  if (gas) {
    const value = fmtPressureNum(gas.value, 2);
    if (value != null) {
      rows.push({
        market: 'Gasoline',
        value,
        unit: '$/gal',
        pressure: pressureFromYoy(eiaData?.gasoline?.yoyPct, 'Inflationary', 'Disinflationary'),
        read: pressureYoyRead(eiaData?.gasoline?.yoyPct),
      });
    }
  }

  const ng = eiaPetrolLatest(eiaData, 'naturalGas');
  if (ng) {
    const value = fmtPressureNum(ng.value, 2);
    if (value != null) {
      rows.push({
        market: 'Henry Hub gas',
        value,
        unit: '$/MMBtu',
        pressure: pressureFromYoy(eiaData?.naturalGas?.yoyPct, 'Tighter', 'Softer'),
        read: pressureYoyRead(eiaData?.naturalGas?.yoyPct),
      });
    }
  }

  const summary = Array.isArray(usdaData?.summary) ? usdaData.summary : [];
  for (const item of summary.slice(0, 4)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const raw = usdaLatestNumber(item);
    if (raw == null) continue;
    const value = fmtPressureNum(raw, 2);
    if (value == null) continue;
    const market = typeof item.desc === 'string' && item.desc
      ? item.desc
      : (typeof item.key === 'string' && item.key ? item.key : '');
    if (!market) continue;
    const unitFromLatest = item.latest && typeof item.latest === 'object' && !Array.isArray(item.latest)
      && typeof item.latest.unit === 'string'
      ? item.latest.unit
      : '';
    const unit = typeof item.unit === 'string' ? item.unit : unitFromLatest;
    rows.push({
      market,
      value,
      unit,
      pressure: pressureFromYoy(item.yoyPct, 'Upward', 'Lower'),
      read: pressureYoyRead(item.yoyPct),
    });
  }

  const tradeSummary = tradeData?.summary;
  if (tradeSummary && typeof tradeSummary === 'object' && !Array.isArray(tradeSummary)
      && isFiniteNumber(tradeSummary.worldBalanceB)) {
    const bal = tradeSummary.worldBalanceB;
    const abs = fmtPressureNum(Math.abs(bal), 1);
    if (abs != null) {
      const month = typeof tradeSummary.latestMonth === 'string' && tradeSummary.latestMonth
        ? tradeSummary.latestMonth
        : 'latest month';
      rows.push({
        market: 'US trade balance',
        value: (bal >= 0 ? '+' : '−') + abs,
        unit: '$B',
        pressure: bal < 0 ? 'Import demand' : 'Export surplus',
        read: month,
      });
    }
  }

  return rows;
}

export function hasPhysicalPressureRows(eiaData, usdaData, tradeData) {
  return physicalPressureRows(eiaData, usdaData, tradeData).length > 0;
}
