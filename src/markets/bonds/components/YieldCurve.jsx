import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

const TENORS = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
const COUNTRY_COLORS = {
  US: '#60a5fa', DE: '#34d399', JP: '#f472b6',
  GB: '#a78bfa', IT: '#fb923c', FR: '#facc15',
  CN: '#f87171', AU: '#4ade80',
};

export default function YieldCurve({ yieldCurveData }) {
  const option = useMemo(() => {
    const countries = Object.keys(yieldCurveData);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) =>
        params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>')
      },
      legend: {
        data: countries,
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: TENORS,
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: countries.map(c => ({
        name: c,
        type: 'line',
        smooth: true,
        data: TENORS.map(t => yieldCurveData[c]?.[t] ?? null),
        itemStyle: { color: COUNTRY_COLORS[c] || '#94a3b8' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 5,
      })),
    };
  }, [yieldCurveData]);

  const countryCount = Object.keys(yieldCurveData).length;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Yield Curve</span>
        <span className="bonds-panel-subtitle">{countryCount} countries · sovereign benchmark rates</span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="bonds-panel-footer">
        X-axis: 3m → 30y · Y-axis: yield % · Hover for details
      </div>
    </div>
  );
}
