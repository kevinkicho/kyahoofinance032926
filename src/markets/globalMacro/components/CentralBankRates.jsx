import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';


const HISTORY_COLORS = {
  US: '#14b8a6', EA: '#3b82f6', GB: '#a855f7',
  JP: '#f59e0b', CA: '#ef4444', AU: '#22c55e', SE: '#fb923c',
};

function barColor(rate, textDim = '#475569') {
  if (rate == null || Number.isNaN(rate)) return textDim;
  if (rate < 3)    return '#14b8a6';
  if (rate < 6)    return '#f59e0b';
  return '#ef4444';
}

function buildRankedOption(current, colors) {
  const sorted = [...current].sort((a, b) => (b.rate ?? -99) - (a.rate ?? -99));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(2)}%`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.name}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.rate,
        itemStyle: { color: barColor(c.rate, colors.textDim) },
      })),
    }],
  };
}

function buildHistoryOption(history, colors) {
  const { dates = [], series = [] } = history;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: series.map(s => s.name),
      textStyle: { color: colors.textMuted, fontSize: 9 },
      top: 0, right: 0,
      itemWidth: 12, itemHeight: 8,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 36, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: {
        color: colors.textMuted, fontSize: 9,
        interval: Math.floor(dates.length / 8),
        formatter: v => v ? v.slice(0, 7) : v,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [
      ...series.map(s => ({
        name: s.name,
        type: 'line',
        data: s.values,
        symbol: 'none',
        smooth: false,
        lineStyle: { color: HISTORY_COLORS[s.code] || colors.textSecondary, width: 1.5 },
        itemStyle: { color: HISTORY_COLORS[s.code] || colors.textSecondary },
      })),
      {
        name: 'Neutral',
        type: 'line',
        data: Array(dates.length).fill(2),
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        silent: true,
      },
    ],
  };
}

export default function CentralBankRates({ centralBankData }) {
  const { colors } = useTheme();
  const { current = [], history = { dates: [], series: [] } } = centralBankData ?? {};

  const rankedOption = useMemo(() => buildRankedOption(current, colors), [current, colors]);
  const historyOption = useMemo(() => buildHistoryOption(history, colors), [history, colors]);

  const kpis = useMemo(() => {
    const withRate = current.filter(c => c.rate != null);
    if (!withRate.length) return null;
    const highest = withRate.reduce((a, b) => a.rate > b.rate ? a : b);
    const lowest = withRate.reduce((a, b) => a.rate < b.rate ? a : b);
    const avg = withRate.reduce((s, c) => s + c.rate, 0) / withRate.length;
    const lowRate = withRate.filter(c => c.rate <= 2).length;
    return { highest, lowest, avg, lowRate };
  }, [current]);

  if (!centralBankData) return null;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Policy Rates</span>
        <span className="mac-panel-subtitle">Ranked + 5-year history · FRED + central bank sources</span>
      </div>
      {/* KPI Strip */}
      {kpis && (
        <div className="mac-kpi-strip">
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Highest Rate</span>
            <span className="mac-kpi-value" style={{ color: '#ef4444' }}>{kpis.highest.name}</span>
            <span className="mac-kpi-sub">{kpis.highest.rate.toFixed(2)}%</span>
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Lowest Rate</span>
            <span className="mac-kpi-value accent">{kpis.lowest.name}</span>
            <span className="mac-kpi-sub">{kpis.lowest.rate.toFixed(2)}%</span>
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Avg Rate</span>
            <span className="mac-kpi-value accent">{kpis.avg.toFixed(2)}%</span>
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">{`Rate \u2264 2%`}</span>
            <span className="mac-kpi-value accent">{kpis.lowRate}</span>
            <span className="mac-kpi-sub">of {current.length}</span>
          </div>
        </div>
      )}
      <div className="mac-two-row">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Current Rates — Ranked</div>
          <div className="mac-chart-subtitle">Highest to lowest · green &lt;3% · amber 3–6% · red &gt;6%</div>
          <div className="mac-chart-wrap">
            <SafeECharts option={rankedOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Policy Rates — Ranked', source: 'FRED', endpoint: '/api/global-macro', series: [] }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">5-Year Rate History</div>
          <div className="mac-chart-subtitle">G7 + Australia + Sweden · dashed line = 2% neutral rate</div>
          <div className="mac-chart-wrap">
            <SafeECharts option={historyOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: '5-Year Rate History', source: 'FRED', endpoint: '/api/global-macro', series: [] }} />
          </div>
        </div>
      </div>
    </div>
  );
}
