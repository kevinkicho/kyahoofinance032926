import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function buildInFavorOption(inFavor) {
  const factors = [
    { name: 'Low-Vol',  value: inFavor.lowVol    ?? 0 },
    { name: 'Quality',  value: inFavor.quality   ?? 0 },
    { name: 'Value',    value: inFavor.value      ?? 0 },
    { name: 'Momentum', value: inFavor.momentum   ?? 0 },
  ];
  return {
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
      data: factors.map(f => f.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: factors.map(f => ({
        value: f.value,
        itemStyle: { color: f.value >= 0 ? '#6366f1' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

function factorHeat(score) {
  if (score == null || Number.isNaN(score)) return 'eq-heat-neu';
  if (score >= 70) return 'eq-heat-dg';
  if (score >= 50) return 'eq-heat-lg';
  if (score >= 30) return 'eq-heat-neu';
  if (score >= 15) return 'eq-heat-lr';
  return 'eq-heat-dr';
}

export default function FactorRankings({ factorData }) {
  if (!factorData) return null;
  const { inFavor = {}, stocks = [] } = factorData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Factor Rankings</span>
        <span className="eq-panel-subtitle">Percentile scores 1–100 · composite = average of 4 factors</span>
      </div>
      <div className="eq-two-row">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Factor In Favor</div>
          <div className="eq-chart-subtitle">Month-to-date factor return · indigo = positive · which factor is working</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildInFavorOption(inFavor)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Stock Factor Scores</div>
          <div className="eq-chart-subtitle">Top 20 stocks by composite · green ≥ 70 · red ≤ 30</div>
          <div className="eq-scroll">
            <table className="eq-table">
              <thead>
                <tr>
                  <th className="eq-th">Ticker</th>
                  <th className="eq-th">Sector</th>
                  <th className="eq-th">Value</th>
                  <th className="eq-th">Momentum</th>
                  <th className="eq-th">Quality</th>
                  <th className="eq-th">Low-Vol</th>
                  <th className="eq-th">Composite</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => (
                  <tr key={s.ticker} className="eq-row">
                    <td className="eq-cell"><strong>{s.ticker}</strong></td>
                    <td className="eq-cell eq-sector">{s.sector}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.value)}`}>{s.value}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.momentum)}`}>{s.momentum}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.quality)}`}>{s.quality}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.lowVol)}`}>{s.lowVol}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.composite)}`}><strong>{s.composite}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
