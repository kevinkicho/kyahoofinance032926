import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './REComponents.css';

const TYPE_COLORS = {
  Industrial:  '#34d399',
  Multifamily: '#60a5fa',
  Retail:      '#fbbf24',
  Office:      '#f87171',
  Hotel:       '#a78bfa',
};

export default function CapRateMonitor({ capRateData }) {
  const option = useMemo(() => {
    const { dates, ...types } = capRateData;
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) =>
          `<b>${params[0].axisValue}</b><br/>` +
          params.map(p => `${p.seriesName}: <b>${p.value?.toFixed(2)}%</b>`).join('<br/>'),
      },
      legend: {
        data: Object.keys(types),
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      grid: { top: 40, right: 20, bottom: 30, left: 55 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: Object.entries(types).map(([name, data]) => ({
        name,
        type: 'line',
        smooth: false,
        data,
        itemStyle: { color: TYPE_COLORS[name] || '#94a3b8' },
        lineStyle: { width: 2 },
        symbol: 'none',
      })),
    };
  }, [capRateData]);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Cap Rate Monitor</span>
        <span className="re-panel-subtitle">Capitalization rates by property type · quarterly</span>
      </div>
      <div className="re-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="re-panel-footer">
        Cap rate = NOI / property value · Rising cap rates = falling valuations
      </div>
    </div>
  );
}
