import React from 'react';
import ReactECharts from 'echarts-for-react';
import './MacroComponents.css';

function debtBarColor(v) {
  if (v == null || Number.isNaN(v)) return '#475569';
  if (v < 60)  return '#14b8a6';
  if (v < 90)  return '#f59e0b';
  return '#ef4444';
}

function buildDebtOption(countries) {
  const sorted = [...countries].sort((a, b) => (b.debt ?? 0) - (a.debt ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}% of GDP`,
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.code}`),
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.debt,
        itemStyle: { color: debtBarColor(c.debt) },
      })),
      markLine: {
        data: [{ yAxis: 60 }, { yAxis: 100 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: true, color: '#64748b', fontSize: 9 },
      },
    }],
  };
}

function buildCurrentAcctOption(countries) {
  const sorted = [...countries].sort((a, b) => (b.currentAccount ?? 0) - (a.currentAccount ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}% of GDP`,
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.code}`),
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.currentAccount,
        itemStyle: { color: (c.currentAccount ?? 0) >= 0 ? '#14b8a6' : '#ef4444' },
      })),
      markLine: {
        data: [{ yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

export default function DebtMonitor({ debtData }) {
  if (!debtData) return null;
  const { year = '', countries = [] } = debtData;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Debt Monitor</span>
        <span className="mac-panel-subtitle">{year} data — World Bank · Maastricht reference lines at 60% and 100%</span>
      </div>
      <div className="mac-two-col">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Government Debt (% of GDP)</div>
          <div className="mac-chart-subtitle">Green &lt;60% · amber 60–90% · red &gt;90% (Maastricht criteria)</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildDebtOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Current Account Balance (% of GDP)</div>
          <div className="mac-chart-subtitle">Teal = surplus · red = deficit · sorted surplus to deficit</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildCurrentAcctOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
      <div className="mac-panel-footer">Source: World Bank · Annual data · CA positive = capital exporter, negative = importer</div>
    </div>
  );
}
