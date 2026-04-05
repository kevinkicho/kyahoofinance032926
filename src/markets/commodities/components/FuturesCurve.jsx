// src/markets/commodities/components/FuturesCurve.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CommodComponents.css';

export default function FuturesCurve({ futuresCurveData }) {
  const { labels = [], prices = [], commodity = 'WTI Crude Oil', spotPrice, unit = '$/bbl' } = futuresCurveData;

  const isContango      = prices.length >= 2 && prices[prices.length - 1] > prices[0];
  const isBackwardation = prices.length >= 2 && prices[prices.length - 1] < prices[0];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/><span style="color:#ca8a04">$${p.value.toFixed(2)}${unit.replace('$','')}</span>`;
      },
    },
    grid: { top: 20, right: 24, bottom: 40, left: 56, containLabel: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: (v) => `$${v}` },
    },
    series: [{
      type: 'line',
      data: prices,
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#ca8a04' },
      lineStyle: { color: '#ca8a04', width: 2 },
    }],
  };

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">{commodity} Futures Curve</span>
        <span className="com-panel-subtitle">
          {labels.length} contract months · Spot: {spotPrice != null ? `$${spotPrice.toFixed(2)}${unit.replace('$','')}` : '—'}
        </span>
      </div>
      <div className="com-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {(isContango || isBackwardation) && (
        <div style={{ padding: '8px 0 0' }}>
          <span className={`com-curve-pill ${isContango ? 'com-contango' : 'com-backwardation'}`}>
            {isContango
              ? '▲ Contango — market expects higher future prices'
              : '▼ Backwardation — near-term supply tight, spot premium'}
          </span>
        </div>
      )}
      <div className="com-panel-footer">Source: CME front-month futures (Yahoo Finance) · Prices in USD/bbl</div>
    </div>
  );
}
