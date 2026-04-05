import React from 'react';
import ReactECharts from 'echarts-for-react';
import './MacroComponents.css';

function buildGdpOption(countries) {
  const sorted = [...countries].sort((a, b) => b.gdp - a.gdp);
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
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
        value: c.gdp,
        itemStyle: { color: c.gdp >= 0 ? '#14b8a6' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed' },
        label: { show: false },
      },
    }],
  };
}

function buildCpiOption(countries) {
  const sorted = [...countries].sort((a, b) => b.cpi - a.cpi);
  const barColor = (v) => {
    if (v < 0 || v > 5) return '#ef4444';
    if (v > 3)          return '#f59e0b';
    return '#14b8a6';
  };
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
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
        value: c.cpi,
        itemStyle: { color: barColor(c.cpi) },
      })),
      markLine: {
        data: [{ xAxis: 2 }],
        symbol: 'none',
        lineStyle: { color: '#14b8a6', type: 'dashed', width: 1 },
        label: { show: true, formatter: '2% target', color: '#14b8a6', fontSize: 9 },
      },
    }],
  };
}

export default function GrowthInflation({ growthInflationData }) {
  if (!growthInflationData) return null;
  const { year = '', countries = [] } = growthInflationData;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Growth &amp; Inflation</span>
        <span className="mac-panel-subtitle">{year} annual data — World Bank</span>
      </div>
      <div className="mac-two-col">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">GDP Growth (%)</div>
          <div className="mac-chart-subtitle">Ranked highest to lowest · teal = positive · red = contraction</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildGdpOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">CPI Inflation (%)</div>
          <div className="mac-chart-subtitle">Ranked highest to lowest · teal = on target (1–3%) · amber = elevated · red = high</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildCpiOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
