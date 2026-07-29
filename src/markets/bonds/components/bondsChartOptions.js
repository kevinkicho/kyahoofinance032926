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

export function buildFedBalanceOption(fedBalanceSheetHistory, colors, currentSymbol = '$') {
  if (!fedBalanceSheetHistory?.dates?.length) return null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
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
}

export function buildM2Option(m2HistoryData, colors, currentSymbol = '$') {
  if (!m2HistoryData?.dates?.length) return null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { top: 8, right: 16, bottom: 20, left: 44 },
    xAxis: {
      type: 'category',
      data: m2HistoryData.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(m2HistoryData.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: (v) => `${currentSymbol}${v}T` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line',
      data: m2HistoryData.values,
      areaStyle: { color: 'rgba(96,165,250,0.1)' },
      lineStyle: { color: '#60a5fa', width: 1.5 },
      symbol: 'none',
      smooth: true,
    }],
  };
}

export function buildDebtToGdpOption(debtToGdpHistory, colors) {
  if (!debtToGdpHistory?.dates?.length) return null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
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
}
