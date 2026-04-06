// src/markets/crypto/components/FundingAndPositioning.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CryptoComponents.css';

function fundingColor(rate, textSecondary = '#94a3b8') {
  if (rate > 0.015) return '#ef4444';
  if (rate > 0.005) return '#f59e0b';
  if (rate > -0.005) return textSecondary;
  return '#818cf8';
}

function buildOIHistoryOption(history, colors) {
  const { dates = [], btcOIB = [], ethOIB = [] } = history;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: $${p.value.toFixed(1)}B`).join('<br/>')}`,
    },
    legend: { data: ['BTC OI', 'ETH OI'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}B` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'BTC OI', type: 'line', data: btcOIB, lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f59e0b' } },
      { name: 'ETH OI', type: 'line', data: ethOIB, lineStyle: { color: '#818cf8', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#818cf8' } },
    ],
  };
}

export default function FundingAndPositioning({ fundingData }) {
  const { colors } = useTheme();
  if (!fundingData) return null;
  const { rates = [], openInterestHistory } = fundingData;

  return (
    <div className="crypto-panel">
      <div className="crypto-panel-header">
        <span className="crypto-panel-title">Funding & Positioning</span>
        <span className="crypto-panel-subtitle">Perpetual futures · 8h funding rate · open interest · Bybit</span>
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
                  const color = fundingColor(r.rate8h, colors.textSecondary);
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
          {openInterestHistory && openInterestHistory.dates?.length > 0 ? (
            <>
              <div className="crypto-chart-title">Open Interest History</div>
              <div className="crypto-chart-subtitle">BTC & ETH perpetual open interest (billions USD) · 6-week trend</div>
              <div className="crypto-chart-wrap">
                <ReactECharts option={buildOIHistoryOption(openInterestHistory, colors)} style={{ height: '100%', width: '100%' }} />
              </div>
            </>
          ) : (
            <>
              <div className="crypto-chart-title">Open Interest History</div>
              <div className="crypto-chart-subtitle" style={{ color: colors.textDim, padding: 20, textAlign: 'center' }}>
                Historical OI data not available — showing current rates only
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
