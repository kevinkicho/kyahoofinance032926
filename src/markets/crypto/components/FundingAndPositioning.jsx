// src/markets/crypto/components/FundingAndPositioning.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CryptoComponents.css';

function fundingColor(rate) {
  if (rate > 0.015) return '#ef4444';
  if (rate > 0.005) return '#f59e0b';
  if (rate > -0.005) return '#94a3b8';
  return '#818cf8';
}

function buildOIHistoryOption(history) {
  const { dates = [], btcOIB = [], ethOIB = [] } = history;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: $${p.value.toFixed(1)}B`).join('<br/>')}`,
    },
    legend: { data: ['BTC OI', 'ETH OI'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `$${v}B` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      { name: 'BTC OI', type: 'line', data: btcOIB, lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f59e0b' } },
      { name: 'ETH OI', type: 'line', data: ethOIB, lineStyle: { color: '#818cf8', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#818cf8' } },
    ],
  };
}

export default function FundingAndPositioning({ fundingData }) {
  if (!fundingData) return null;
  const { rates = [], openInterestHistory = { dates: [], btcOIB: [], ethOIB: [] } } = fundingData;

  return (
    <div className="crypto-panel">
      <div className="crypto-panel-header">
        <span className="crypto-panel-title">Funding & Positioning</span>
        <span className="crypto-panel-subtitle">Perpetual futures · 8h funding rate · open interest · Binance</span>
      </div>
      <div className="crypto-two-col">
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">Perpetual Funding Rates</div>
          <div className="crypto-chart-subtitle">8h rate · annualized · open interest · amber = longs paying · indigo = shorts paying</div>
          <div className="crypto-scroll">
            <table className="crypto-table">
              <thead>
                <tr>
                  <th className="crypto-th" style={{ textAlign: 'left' }}>Symbol</th>
                  <th className="crypto-th">Rate 8h</th>
                  <th className="crypto-th">Annualized</th>
                  <th className="crypto-th">Open Interest</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => {
                  const color = fundingColor(r.rate8h);
                  const sign = r.rate8h >= 0 ? '+' : '';
                  const signA = r.rateAnnualized >= 0 ? '+' : '';
                  return (
                    <tr key={r.symbol} className="crypto-row">
                      <td className="crypto-cell"><strong>{r.symbol}</strong></td>
                      <td className="crypto-cell crypto-num" style={{ color }}>{sign}{(r.rate8h * 100).toFixed(4)}%</td>
                      <td className="crypto-cell crypto-num" style={{ color }}>{signA}{r.rateAnnualized.toFixed(1)}%</td>
                      <td className="crypto-cell crypto-num">${r.openInterestB.toFixed(1)}B</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">Open Interest History</div>
          <div className="crypto-chart-subtitle">BTC & ETH perpetual open interest (billions USD) · 6-week trend</div>
          <div className="crypto-chart-wrap">
            <ReactECharts option={buildOIHistoryOption(openInterestHistory)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
