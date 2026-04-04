import React from 'react';
import ReactECharts from 'echarts-for-react';
import './InsComponents.css';

function adequacyColor(pct) {
  if (pct >= 105) return '#22c55e';
  if (pct >= 100) return '#84cc16';
  if (pct >= 95)  return '#f59e0b';
  return '#ef4444';
}

export default function ReserveAdequacy({ reserveAdequacyData }) {
  const { lines, reserves, required, adequacy } = reserveAdequacyData;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const idx = params[0].dataIndex;
        return `${lines[idx]}<br/>Reserves: $${reserves[idx].toLocaleString()}M<br/>Required: $${required[idx].toLocaleString()}M<br/>Adequacy: ${adequacy[idx].toFixed(1)}%`;
      },
    },
    legend: {
      data: ['Held Reserves ($M)', 'Required Reserves ($M)'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 0,
    },
    grid: { left: 160, right: 20, top: 40, bottom: 20 },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '${value}M' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: lines,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Held Reserves ($M)',
        type: 'bar',
        data: reserves.map((v, i) => ({ value: v, itemStyle: { color: adequacyColor(adequacy[i]) } })),
        barMaxWidth: 24,
        label: { show: true, position: 'right', formatter: (p) => `${adequacy[p.dataIndex].toFixed(1)}%`, color: '#94a3b8', fontSize: 10 },
      },
      {
        name: 'Required Reserves ($M)',
        type: 'bar',
        data: required,
        barMaxWidth: 24,
        itemStyle: { color: '#1e293b', borderColor: '#475569', borderWidth: 1 },
      },
    ],
  };

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Reserves vs Requirements</span>
        <span className="ins-panel-subtitle">Held vs required by line of business · % label = adequacy ratio</span>
      </div>
      <div className="ins-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="ins-panel-footer">
        Adequacy Ratio = Held ÷ Required · ≥105% oversupply · 100–104% adequate · 95–99% watch · &lt;95% deficient
      </div>
    </div>
  );
}
