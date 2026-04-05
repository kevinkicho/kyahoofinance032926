import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function shortBarColor(v) {
  if (v == null || Number.isNaN(v)) return '#475569';
  if (v > 20) return '#ef4444';
  if (v > 10) return '#f59e0b';
  return '#22c55e';
}

function buildShortedOption(mostShorted) {
  const sorted = [...mostShorted].sort((a, b) => (b.shortFloat ?? 0) - (a.shortFloat ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        const base = `${params[0].name}: ${params[0].value?.toFixed(1)}% short`;
        return item ? `${base} · ${item.daysToCover?.toFixed(1)}d to cover` : base;
      },
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
      data: sorted.map(s => s.ticker),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(s => ({
        value: s.shortFloat,
        itemStyle: { color: shortBarColor(s.shortFloat) },
      })),
      markLine: {
        data: [{ xAxis: 20 }, { xAxis: 10 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: true, color: '#64748b', fontSize: 9 },
      },
    }],
  };
}

function buildSqueezeOption(mostShorted) {
  const candidates = mostShorted.filter(s => (s.shortFloat ?? 0) > 10);
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: p => `${p.data[3]}<br/>Short Float: ${p.data[0]?.toFixed(1)}%<br/>1W Return: ${p.data[1]?.toFixed(1)}%`,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Short Float %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'value',
      name: '1W Return %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'scatter',
      data: candidates.map(s => [s.shortFloat ?? 0, s.perf1w ?? 0, s.marketCapB ?? 1, s.ticker]),
      symbolSize: d => Math.max(8, Math.min(40, Math.sqrt(d[2] ?? 1) * 3)),
      itemStyle: { color: '#ef4444', opacity: 0.8 },
      label: {
        show: true,
        formatter: p => p.data[3],
        position: 'right',
        color: '#94a3b8',
        fontSize: 9,
      },
      markLine: {
        data: [{ xAxis: 15 }, { yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

export default function ShortInterest({ shortData }) {
  if (!shortData) return null;
  const { mostShorted = [] } = shortData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Short Interest</span>
        <span className="eq-panel-subtitle">Short float % · squeeze candidates: short &gt;10% + positive 1W momentum</span>
      </div>
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Most Shorted</div>
          <div className="eq-chart-subtitle">Red &gt;20% · amber 10–20% · green &lt;10%</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildShortedOption(mostShorted)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Squeeze Watch</div>
          <div className="eq-chart-subtitle">X = short float · Y = 1W return · size = market cap · short &gt;10%</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildSqueezeOption(mostShorted)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
