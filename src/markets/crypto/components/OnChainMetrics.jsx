// src/markets/crypto/components/OnChainMetrics.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CryptoComponents.css';

function buildHashrateOption(history, colors) {
  const dates = history.map(h => {
    const d = new Date(h.timestamp * 1000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const values = history.map(h => h.avgHashrate);
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 10, right: 12, bottom: 24, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params[0].value} EH/s`,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}` },
    },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: '#f59e0b', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.25)' }, { offset: 1, color: 'rgba(245,158,11,0.02)' }] } },
    }],
  };
}

export default function OnChainMetrics({ onChainData }) {
  const { colors } = useTheme();
  if (!onChainData) return null;
  const { fees, mempool, difficulty, hashrate } = onChainData;

  return (
    <div className="crypto-panel" style={{ marginTop: 1 }}>
      <div className="crypto-panel-header">
        <span className="crypto-panel-title">BTC On-Chain Metrics</span>
        <span className="crypto-panel-subtitle">mempool.space · fees · hashrate · difficulty</span>
      </div>
      <div className="onchain-cards">
        <div className="onchain-card">
          <span className="onchain-card-label">Recommended Fee</span>
          <span className="onchain-card-value amber">{fees?.fastest ?? '—'} <small>sat/vB</small></span>
          <span className="onchain-card-sub">Economy: {fees?.economy ?? '—'} · Min: {fees?.minimum ?? '—'}</span>
        </div>
        <div className="onchain-card">
          <span className="onchain-card-label">Mempool Size</span>
          <span className="onchain-card-value">{mempool?.vsize ?? '—'} <small>vMB</small></span>
          <span className="onchain-card-sub">{mempool?.count?.toLocaleString() ?? '—'} unconfirmed tx</span>
        </div>
        <div className="onchain-card">
          <span className="onchain-card-label">Hashrate</span>
          <span className="onchain-card-value amber">{hashrate?.current ?? '—'} <small>EH/s</small></span>
          <span className="onchain-card-sub">30-day network average</span>
        </div>
        <div className="onchain-card">
          <span className="onchain-card-label">Next Difficulty</span>
          <span className="onchain-card-value">{difficulty?.difficultyChange != null ? `${difficulty.difficultyChange > 0 ? '+' : ''}${difficulty.difficultyChange}%` : '—'}</span>
          <span className="onchain-card-sub">{difficulty?.progressPercent ?? '—'}% · {difficulty?.remainingBlocks?.toLocaleString() ?? '—'} blocks left</span>
        </div>
      </div>
      {hashrate?.history?.length > 2 && (
        <div className="onchain-chart-wrap">
          <div className="crypto-chart-title">Hashrate Trend (30d)</div>
          <ReactECharts option={buildHashrateOption(hashrate.history, colors)} style={{ height: 160, width: '100%' }} />
        </div>
      )}
    </div>
  );
}
