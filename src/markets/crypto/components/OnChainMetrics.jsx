// src/markets/crypto/components/OnChainMetrics.jsx
import React from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './CryptoDashboard.css';

function buildExchangesOption(exchanges, colors) {
  const items = [...exchanges].reverse(); // smallest at top so largest appears at bottom → natural bar chart reading
  const names = items.map(e => e.name);
  const volumes = items.map(e => +(e.volume24h / 1e9).toFixed(2));
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 4, right: 56, bottom: 4, left: 80 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].name}<br/>$${params[0].value}B`,
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}B` },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: volumes,
      barMaxWidth: 18,
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.55)' }, { offset: 1, color: '#818cf8' }] },
        borderRadius: [0, 3, 3, 0],
      },
      label: { show: true, position: 'right', color: colors.textMuted, fontSize: 9, formatter: p => `$${p.value}B` },
    }],
  };
}

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

export default function OnChainMetrics({ onChainData, topExchanges = [] }) {
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
          <SafeECharts option={buildHashrateOption(hashrate.history, colors)} style={{ height: 160, width: '100%' }} sourceInfo={{ title: 'Hashrate Trend (30d)', source: 'mempool.space', endpoint: '/api/crypto', series: [] }} />
        </div>
      )}
      {topExchanges.length > 0 && (
        <div className="onchain-chart-wrap">
          <div className="crypto-chart-title">Top Exchanges by 24h Volume</div>
          <SafeECharts
            option={buildExchangesOption(topExchanges.slice(0, 10), colors)}
            style={{ height: Math.max(160, topExchanges.slice(0, 10).length * 22 + 16), width: '100%' }}
            sourceInfo={{ title: 'Top Exchanges by 24h Volume', source: 'CoinGecko', endpoint: '/api/crypto', series: [] }}
          />
        </div>
      )}
    </div>
  );
}
