// src/markets/credit/components/DefaultWatch.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CreditComponents.css';

function buildDefaultHistoryOption(defaultHistory) {
  const { dates = [], hy = [], loan = [] } = defaultHistory;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(1)}%`).join('<br/>')}`,
    },
    legend: { data: ['HY Default','Loan Default'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      { name: 'HY Default',   type: 'line', data: hy,   lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f59e0b' } },
      { name: 'Loan Default', type: 'line', data: loan, lineStyle: { color: '#06b6d4', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#06b6d4' } },
    ],
  };
}

function buildChargeoffOption(chargeoffs) {
  const { dates = [], commercial = [], consumer = [] } = chargeoffs;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>')}`,
    },
    legend: { data: ['C&I Loans','Consumer'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      { name: 'C&I Loans', type: 'line', data: commercial, lineStyle: { color: '#818cf8', width: 2 }, areaStyle: { color: 'rgba(129,140,248,0.1)' }, symbol: 'none' },
      { name: 'Consumer',  type: 'line', data: consumer,   lineStyle: { color: '#f87171', width: 2 }, areaStyle: { color: 'rgba(248,113,113,0.1)' }, symbol: 'none' },
    ],
  };
}

export default function DefaultWatch({ defaultData }) {
  if (!defaultData) return null;
  const { rates = [], chargeoffs = { dates:[], commercial:[], consumer:[] }, defaultHistory = { dates:[], hy:[], loan:[] } } = defaultData;

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">Default Watch</span>
        <span className="credit-panel-subtitle">HY/loan default rates · bank charge-offs · distressed ratios · FRED / Moody's</span>
      </div>
      <div className="credit-two-col">
        <div className="credit-two-row">
          <div className="credit-chart-panel">
            <div className="credit-chart-title">Default Rate Trend</div>
            <div className="credit-chart-subtitle">HY bond & leveraged loan TTM default rates (%) — amber = HY · cyan = loans</div>
            <div className="credit-chart-wrap">
              <ReactECharts option={buildDefaultHistoryOption(defaultHistory)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="credit-chart-panel">
            <div className="credit-chart-title">Bank Charge-Off Rates</div>
            <div className="credit-chart-subtitle">FRED quarterly charge-off rates (%) — commercial & consumer loans · DRALACBN / DRSFRMACBS</div>
            <div className="credit-chart-wrap">
              <ReactECharts option={buildChargeoffOption(chargeoffs)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
        <div className="credit-chart-panel">
          <div className="credit-chart-title">Distressed Debt Indicators</div>
          <div className="credit-chart-subtitle">Current reading · prior period · cycle peak — rising = deterioration</div>
          <div className="credit-scroll">
            <table className="credit-table">
              <thead>
                <tr>
                  <th className="credit-th" style={{ textAlign:'left' }}>Indicator</th>
                  <th className="credit-th">Current</th>
                  <th className="credit-th">Prior</th>
                  <th className="credit-th">Cycle Peak</th>
                  <th className="credit-th">vs Peak</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => {
                  const vsPeak = r.peak != null ? ((r.value / r.peak) * 100).toFixed(0) : null;
                  const cls = r.value > r.prev ? 'credit-neg' : r.value < r.prev ? 'credit-pos' : 'credit-neu';
                  return (
                    <tr key={r.category} className="credit-row">
                      <td className="credit-cell">{r.category}</td>
                      <td className={`credit-cell credit-num ${cls}`}><strong>{r.value}{r.unit}</strong></td>
                      <td className="credit-cell credit-num credit-muted">{r.prev}{r.unit}</td>
                      <td className="credit-cell credit-num credit-muted">{r.peak}{r.unit}</td>
                      <td className="credit-cell credit-num credit-muted">{vsPeak ? `${vsPeak}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
