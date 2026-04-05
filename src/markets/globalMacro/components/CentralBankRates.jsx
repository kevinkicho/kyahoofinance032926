import React from 'react';
import ReactECharts from 'echarts-for-react';
import './MacroComponents.css';

const HISTORY_COLORS = {
  US: '#14b8a6', EA: '#3b82f6', GB: '#a855f7',
  JP: '#f59e0b', CA: '#ef4444', AU: '#22c55e', SE: '#fb923c',
};

function barColor(rate) {
  if (rate == null) return '#475569';
  if (rate < 3)    return '#14b8a6';
  if (rate < 6)    return '#f59e0b';
  return '#ef4444';
}

function buildRankedOption(current) {
  const sorted = [...current].sort((a, b) => (b.rate ?? -99) - (a.rate ?? -99));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(2)}%`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.name}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.rate,
        itemStyle: { color: barColor(c.rate) },
      })),
    }],
  };
}

function buildHistoryOption(history) {
  const { dates = [], series = [] } = history;
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
    },
    legend: {
      data: series.map(s => s.name),
      textStyle: { color: '#64748b', fontSize: 9 },
      top: 0, right: 0,
      itemWidth: 12, itemHeight: 8,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 36, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        color: '#64748b', fontSize: 9,
        interval: Math.floor(dates.length / 8),
        formatter: v => v ? v.slice(0, 7) : v,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [
      ...series.map(s => ({
        name: s.name,
        type: 'line',
        data: s.values,
        symbol: 'none',
        smooth: false,
        lineStyle: { color: HISTORY_COLORS[s.code] || '#94a3b8', width: 1.5 },
        itemStyle: { color: HISTORY_COLORS[s.code] || '#94a3b8' },
      })),
      {
        name: 'Neutral',
        type: 'line',
        data: Array(dates.length).fill(2),
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        silent: true,
      },
    ],
  };
}

export default function CentralBankRates({ centralBankData }) {
  if (!centralBankData) return null;
  const { current = [], history = { dates: [], series: [] } } = centralBankData;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Policy Rates</span>
        <span className="mac-panel-subtitle">Ranked + 5-year history · FRED + central bank sources</span>
      </div>
      <div className="mac-two-row">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Current Rates — Ranked</div>
          <div className="mac-chart-subtitle">Highest to lowest · green &lt;3% · amber 3–6% · red &gt;6%</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildRankedOption(current)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">5-Year Rate History</div>
          <div className="mac-chart-subtitle">G7 + Australia + Sweden · dashed line = 2% neutral rate</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildHistoryOption(history)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
