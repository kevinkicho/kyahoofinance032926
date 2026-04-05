import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

export default function VIXTermStructure({ vixTermStructure, vixEnrichment }) {
  const { dates, values, prevValues } = vixTermStructure;

  const isContango = values[values.length - 1] > values[0];
  const structureLabel = isContango
    ? 'Contango (normal — market calm)'
    : 'Backwardation (elevated near-term fear)';

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value?.toFixed(2)}</b>`).join('<br/>'),
    },
    legend: {
      data: ['Current', 'Previous Close'],
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: 'VIX',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Current',
        type: 'line',
        data: values,
        itemStyle: { color: '#a78bfa' },
        lineStyle: { width: 2.5 },
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: { color: '#a78bfa', opacity: 0.08 },
      },
      {
        name: 'Previous Close',
        type: 'line',
        data: prevValues,
        itemStyle: { color: '#475569' },
        lineStyle: { width: 1.5, type: 'dashed' },
        symbol: 'none',
      },
    ],
  }), [vixTermStructure]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">VIX Term Structure</span>
        <span className="deriv-panel-subtitle">{structureLabel}</span>
      </div>
      <div className="deriv-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {vixEnrichment && (
        <div className="vix-enrichment-row">
          {vixEnrichment.vvix != null && (
            <div className="vix-enrich-pill">
              <span className="vix-enrich-label">VVIX</span>
              <span className="vix-enrich-value">{vixEnrichment.vvix.toFixed(1)}</span>
            </div>
          )}
          {vixEnrichment.vixPercentile != null && (
            <div className="vix-enrich-pill">
              <span className="vix-enrich-label">VIX Percentile (252d)</span>
              <span className="vix-enrich-value">{vixEnrichment.vixPercentile}th</span>
            </div>
          )}
        </div>
      )}
      <div className="deriv-panel-footer">
        Spot VIX + 9 futures expirations · Dashed = previous close · Contango = upward slope
      </div>
    </div>
  );
}
