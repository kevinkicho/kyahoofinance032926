import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function buildRankedOption(sectors) {
  const spy = sectors.find(s => s.code === 'SPY');
  const spyRef = spy?.perf1m ?? 0;
  const etfs = [...sectors]
    .filter(s => s.code !== 'SPY')
    .sort((a, b) => (b.perf1m ?? -99) - (a.perf1m ?? -99));

  return {
    animation: false,
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
      data: etfs.map(s => s.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: etfs.map(s => ({
        value: s.perf1m,
        itemStyle: { color: (s.perf1m ?? 0) >= spyRef ? '#6366f1' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: spyRef }],
        symbol: 'none',
        lineStyle: { color: '#e2e8f0', type: 'dashed', width: 1 },
        label: { show: true, formatter: 'SPY', color: '#94a3b8', fontSize: 9 },
      },
    }],
  };
}

function buildRotationOption(sectors) {
  const etfs = sectors.filter(s => s.code !== 'SPY');
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: p => `${p.data[2]}<br/>1M: ${p.data[0]?.toFixed(1)}%<br/>3M: ${p.data[1]?.toFixed(1)}%`,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: '1M %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'value',
      name: '3M %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'scatter',
      data: etfs.map(s => [s.perf1m ?? 0, s.perf3m ?? 0, s.code]),
      symbolSize: 14,
      itemStyle: { color: '#6366f1' },
      label: {
        show: true,
        formatter: p => p.data[2],
        position: 'right',
        color: '#94a3b8',
        fontSize: 9,
      },
      markLine: {
        data: [{ xAxis: 0 }, { yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

export default function SectorRotation({ sectorData }) {
  if (!sectorData) return null;
  const { sectors = [] } = sectorData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Sector Rotation</span>
        <span className="eq-panel-subtitle">1M performance vs S&amp;P 500 · quadrant scatter chart</span>
      </div>
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">ETF Performance</div>
          <div className="eq-chart-subtitle">1M return vs SPY benchmark · indigo = outperforming</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildRankedOption(sectors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Rotation Quadrant</div>
          <div className="eq-chart-subtitle">X = 1M · Y = 3M · top-right = Leading · top-left = Improving</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildRotationOption(sectors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
