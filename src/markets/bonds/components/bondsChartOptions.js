/**
 * Pure ECharts option builders for Bonds dashboard history charts.
 * Kept free of React so they are easy to unit-test and tree-shake.
 */

export function buildSpreadHistoryOption(spreadHistory, colors) {
  if (!spreadHistory?.dates?.length) return null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['2s10s', '10s3s', '5s30s'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
    grid: { top: 20, right: 16, bottom: 20, left: 44 },
    xAxis: {
      type: 'category',
      data: spreadHistory.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(spreadHistory.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: '2s10s', type: 'line', data: spreadHistory.t10y2y, symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
      { name: '10s3s', type: 'line', data: spreadHistory.t10y3m, symbol: 'none', smooth: true, lineStyle: { color: '#f59e0b', width: 1.5 } },
      { name: '5s30s', type: 'line', data: spreadHistory.t5y30y, symbol: 'none', smooth: true, lineStyle: { color: '#10b981', width: 1.5 } },
    ],
  };
}

/** Latest level + approx YoY % from a { dates, values } series. */
export function seriesLevelMeta(series) {
  const values = series?.values;
  if (!Array.isArray(values) || !values.length) return null;
  const last = values[values.length - 1];
  if (last == null || !Number.isFinite(Number(last))) return null;
  // Prefer ~12 steps back when monthly-ish; else half the sample.
  const lag = values.length > 14 ? 12 : Math.max(1, Math.floor(values.length / 2));
  const prior = values[values.length - 1 - lag];
  const yoy = prior != null && Number(prior) !== 0
    ? ((Number(last) - Number(prior)) / Math.abs(Number(prior))) * 100
    : null;
  return {
    latest: Number(last),
    yoy,
    asOf: series.dates?.[values.length - 1] || null,
  };
}

function withLevelMarkLine(option, latest) {
  if (!option || latest == null || !Number.isFinite(latest)) return option;
  const series0 = option.series?.[0];
  if (!series0) return option;
  series0.markLine = {
    silent: true,
    symbol: 'none',
    lineStyle: { type: 'dashed', color: '#94a3b8', width: 1 },
    label: { formatter: 'latest', fontSize: 9, color: '#94a3b8' },
    data: [{ yAxis: latest }],
  };
  return option;
}

export function buildFedBalanceOption(fedBalanceSheetHistory, colors, currentSymbol = '$') {
  if (!fedBalanceSheetHistory?.dates?.length) return null;
  const meta = seriesLevelMeta(fedBalanceSheetHistory);
  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const yoyStr = meta?.yoy != null ? `<br/>~YoY: ${meta.yoy >= 0 ? '+' : ''}${meta.yoy.toFixed(1)}%` : '';
        return `${p.axisValue}<br/>${currentSymbol}${Number(p.value).toFixed(2)}T${yoyStr}`;
      },
    },
    grid: { top: 8, right: 16, bottom: 20, left: 44 },
    xAxis: {
      type: 'category',
      data: fedBalanceSheetHistory.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fedBalanceSheetHistory.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: (v) => `${currentSymbol}${v}T` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line',
      data: fedBalanceSheetHistory.values,
      areaStyle: { color: 'rgba(167,139,250,0.1)' },
      lineStyle: { color: '#a78bfa', width: 1.5 },
      symbol: 'none',
      smooth: true,
    }],
  };
  return withLevelMarkLine(option, meta?.latest);
}

export function buildM2Option(m2HistoryData, colors, currentSymbol = '$') {
  if (!m2HistoryData?.dates?.length) return null;
  const meta = seriesLevelMeta(m2HistoryData);
  // YoY series for second line when enough history
  const yoySeries = (m2HistoryData.values || []).map((v, i, arr) => {
    const lag = 12;
    if (i < lag || v == null || arr[i - lag] == null || Number(arr[i - lag]) === 0) return null;
    return ((Number(v) - Number(arr[i - lag])) / Math.abs(Number(arr[i - lag]))) * 100;
  });
  const hasYoy = yoySeries.some((v) => v != null);
  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: hasYoy
      ? { data: ['M2 level', 'M2 YoY %'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } }
      : undefined,
    grid: { top: hasYoy ? 22 : 8, right: hasYoy ? 44 : 16, bottom: 20, left: 44 },
    xAxis: {
      type: 'category',
      data: m2HistoryData.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(m2HistoryData.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: hasYoy
      ? [
          {
            type: 'value',
            axisLabel: { color: colors.textMuted, fontSize: 9, formatter: (v) => `${currentSymbol}${v}T` },
            splitLine: { lineStyle: { color: colors.cardBg } },
          },
          {
            type: 'value',
            position: 'right',
            axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' },
            splitLine: { show: false },
          },
        ]
      : {
          type: 'value',
          axisLabel: { color: colors.textMuted, fontSize: 9, formatter: (v) => `${currentSymbol}${v}T` },
          splitLine: { lineStyle: { color: colors.cardBg } },
        },
    series: [
      {
        name: 'M2 level',
        type: 'line',
        yAxisIndex: 0,
        data: m2HistoryData.values,
        areaStyle: { color: 'rgba(96,165,250,0.1)' },
        lineStyle: { color: '#60a5fa', width: 1.5 },
        symbol: 'none',
        smooth: true,
      },
      ...(hasYoy
        ? [{
            name: 'M2 YoY %',
            type: 'line',
            yAxisIndex: 1,
            data: yoySeries,
            lineStyle: { color: '#f59e0b', width: 1.3, type: 'dashed' },
            symbol: 'none',
            smooth: true,
          }]
        : []),
    ],
  };
  return withLevelMarkLine(option, meta?.latest);
}

export function buildDebtToGdpOption(debtToGdpHistory, colors) {
  if (!debtToGdpHistory?.dates?.length) return null;
  const meta = seriesLevelMeta(debtToGdpHistory);
  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const yoyStr = meta?.yoy != null ? `<br/>~chg: ${meta.yoy >= 0 ? '+' : ''}${meta.yoy.toFixed(1)}%` : '';
        return `${p.axisValue}<br/>${Number(p.value).toFixed(1)}%${yoyStr}`;
      },
    },
    grid: { top: 8, right: 16, bottom: 20, left: 44 },
    xAxis: {
      type: 'category',
      data: debtToGdpHistory.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(debtToGdpHistory.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line',
      data: debtToGdpHistory.values,
      areaStyle: { color: 'rgba(239,68,68,0.1)' },
      lineStyle: { color: '#ef4444', width: 1.5 },
      symbol: 'none',
      smooth: true,
    }],
  };
  return withLevelMarkLine(option, meta?.latest);
}
