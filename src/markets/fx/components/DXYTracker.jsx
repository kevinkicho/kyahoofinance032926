// src/markets/fx/components/DXYTracker.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './FXComponents.css';

// Standard DXY currency weights (ICE futures contract)
const DXY_WEIGHTS = { EUR: 0.576, JPY: 0.136, GBP: 0.119, CAD: 0.091, SEK: 0.042, CHF: 0.036 };
const DXY_COMPONENT_COLORS = {
  EUR: '#10b981', JPY: '#ef4444', GBP: '#f59e0b',
  CAD: '#a855f7', SEK: '#06b6d4', CHF: '#f97316',
};
const DXY_PROXY_COLOR = '#3b82f6';

export default function DXYTracker({ history }) {
  const chartOption = useMemo(() => {
    const dates = Object.keys(history).sort();
    if (dates.length < 2) return null;

    const firstRates = history[dates[0]] || {};
    const currencies = Object.keys(DXY_WEIGHTS);

    // Individual normalized lines: index = (rate_t / rate_0) * 100
    // Higher value = USD bought more of that currency = USD is stronger
    const componentSeries = currencies.map(cur => ({
      name: cur,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, opacity: 0.7 },
      itemStyle: { color: DXY_COMPONENT_COLORS[cur] },
      data: dates.map(date => {
        const base = firstRates[cur] || 1;
        const curr = history[date]?.[cur] || base;
        return +((curr / base) * 100).toFixed(3);
      }),
    }));

    // DXY proxy: weighted average of normalized ratios × 100
    const dxyData = dates.map(date => {
      let weighted = 0;
      for (const [cur, weight] of Object.entries(DXY_WEIGHTS)) {
        const base = firstRates[cur] || 1;
        const curr = history[date]?.[cur] || base;
        weighted += weight * (curr / base);
      }
      return +(weighted * 100).toFixed(3);
    });

    const allSeries = [
      {
        name: 'DXY Proxy',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.5 },
        itemStyle: { color: DXY_PROXY_COLOR },
        data: dxyData,
      },
      ...componentSeries,
    ];

    return {
      backgroundColor: 'transparent',
      grid: { top: 40, right: 24, bottom: 54, left: 54 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: params => {
          const date = params[0]?.axisValue;
          const lines = params.map(p =>
            `<span style="color:${p.color}">●</span> ${p.seriesName}: ${Number(p.value).toFixed(2)}`
          );
          return `<div style="font-size:11px"><b>${date}</b><br/>${lines.join('<br/>')}</div>`;
        },
      },
      legend: {
        data: ['DXY Proxy', ...currencies],
        top: 4,
        textStyle: { color: '#94a3b8', fontSize: 10 },
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        name: 'Index (start = 100)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10, formatter: v => v.toFixed(1) },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: allSeries,
    };
  }, [history]);

  if (!chartOption) {
    return (
      <div className="fx-panel">
        <div className="fx-panel-header">
          <span className="fx-panel-title">DXY Tracker</span>
          <span className="fx-panel-subtitle">30-day USD proxy index</span>
        </div>
        <div className="fx-loading">Loading historical data…</div>
      </div>
    );
  }

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">DXY Tracker</span>
        <span className="fx-panel-subtitle">
          USD proxy index · DXY-weighted composite + individual components · normalized to 100 at start · 30-day window
        </span>
      </div>
      <div className="fx-chart-wrap">
        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
}
