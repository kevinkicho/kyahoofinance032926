import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

const SERIES_CONFIG = [
  { key: 'IG',  label: 'Investment Grade (IG)', color: '#60a5fa' },
  { key: 'HY',  label: 'High Yield (HY)',       color: '#f472b6' },
  { key: 'EM',  label: 'Emerging Mkt (EM)',      color: '#fbbf24' },
  { key: 'BBB', label: 'BBB-Rated (Crossover)',  color: '#a78bfa' },
];

export default function SpreadMonitor({ spreadData }) {
  const option = useMemo(() => ({
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value} bps</b>`).join('<br/>'),
    },
    legend: {
      data: SERIES_CONFIG.map(s => s.label),
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { top: 40, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: 'category',
      data: spreadData.dates,
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: 'bps',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: SERIES_CONFIG.map(({ key, label, color }) => ({
      name: label,
      type: 'line',
      smooth: false,
      data: spreadData[key],
      itemStyle: { color },
      lineStyle: { width: 2 },
      areaStyle: { color, opacity: 0.06 },
      symbol: 'none',
    })),
  }), [spreadData]);

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Spread Monitor</span>
        <span className="bonds-panel-subtitle">Credit spreads over US Treasuries · basis points (bps)</span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="bonds-series-legend">
        {SERIES_CONFIG.map(({ key, label, color }) => (
          <span key={key} className="bonds-series-legend-item">
            <span className="bonds-series-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <div className="bonds-panel-footer">
        Source: ICE BofA indices via FRED · spreads over US Treasuries
      </div>
    </div>
  );
}
