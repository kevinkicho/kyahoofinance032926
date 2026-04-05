// src/markets/realEstate/components/CapRateMonitor.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './REComponents.css';

function yieldColor(y) {
  if (y >= 5) return '#f87171';
  if (y >= 4) return '#fbbf24';
  if (y >= 3) return '#34d399';
  return '#6366f1';
}

export default function CapRateMonitor({ capRateData }) {
  const option = useMemo(() => {
    if (!capRateData?.length) return null;
    const sorted = [...capRateData].sort((a, b) => a.impliedYield - b.impliedYield);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: params => `${params[0].name}: ${params[0].value}%`,
      },
      grid: { top: 8, right: 60, bottom: 8, left: 8, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        data: sorted.map(s => s.sector),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      series: [{
        type: 'bar', barMaxWidth: 20,
        data: sorted.map(s => ({
          value: s.impliedYield,
          itemStyle: { color: yieldColor(s.impliedYield) },
        })),
        label: {
          show: true, position: 'right',
          formatter: p => `${p.value}%`,
          color: '#94a3b8', fontSize: 9,
        },
      }],
    };
  }, [capRateData]);

  if (!option) return null;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Implied Yield by Sector</span>
        <span className="re-panel-subtitle">REIT dividend yield as cap rate proxy · live Yahoo Finance</span>
      </div>
      <div className="re-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="re-panel-footer">
        Dividend yield approximates cap rate · Higher yield = higher risk / lower valuation
      </div>
    </div>
  );
}
