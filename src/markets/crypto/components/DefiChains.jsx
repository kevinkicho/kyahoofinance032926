// src/markets/crypto/components/DefiChains.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CryptoComponents.css';

function fmtChange(v) {
  if (v == null) return { text: '—', cls: 'crypto-neu' };
  const cls = v > 0.05 ? 'crypto-pos' : v < -0.05 ? 'crypto-neg' : 'crypto-neu';
  return { text: `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, cls };
}

function buildChainTvlOption(chains, colors) {
  const sorted = [...chains].sort((a, b) => b.tvlB - a.tvlB).slice(0, 10);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].name}: $${params[0].value.toFixed(1)}B TVL`,
    },
    grid: { top: 8, right: 48, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}B` },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => c.name),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map((c, i) => ({
        value: c.tvlB,
        itemStyle: { color: i === 0 ? '#f59e0b' : `rgba(245,158,11,${0.8 - i * 0.07})` },
      })),
      label: {
        show: true, position: 'right',
        formatter: p => `$${p.value.toFixed(1)}B`,
        color: colors.textSecondary, fontSize: 9,
      },
    }],
  };
}

export default function DefiChains({ defiData }) {
  const { colors } = useTheme();
  if (!defiData) return null;
  const { protocols = [], chains = [] } = defiData;

  return (
    <div className="crypto-panel">
      <div className="crypto-panel-header">
        <span className="crypto-panel-title">DeFi & Chains</span>
        <span className="crypto-panel-subtitle">Total Value Locked · DeFiLlama</span>
      </div>
      <div className="crypto-two-col">
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">Top Protocols by TVL</div>
          <div className="crypto-chart-subtitle">Protocol · Category · Chain · TVL (billions) · 24h / 7d change</div>
          <div className="crypto-scroll">
            <table className="crypto-table">
              <thead>
                <tr>
                  <th className="crypto-th" style={{ textAlign: 'left' }}>Protocol</th>
                  <th className="crypto-th" style={{ textAlign: 'left' }}>Category</th>
                  <th className="crypto-th" style={{ textAlign: 'left' }}>Chain</th>
                  <th className="crypto-th">TVL</th>
                  <th className="crypto-th">24h</th>
                  <th className="crypto-th">7d</th>
                </tr>
              </thead>
              <tbody>
                {protocols.map(p => {
                  const ch1d = fmtChange(p.change1d);
                  const ch7d = fmtChange(p.change7d);
                  return (
                    <tr key={p.name} className="crypto-row">
                      <td className="crypto-cell"><strong>{p.name}</strong></td>
                      <td className="crypto-cell crypto-muted">{p.category}</td>
                      <td className="crypto-cell crypto-muted">{p.chain}</td>
                      <td className="crypto-cell crypto-num">${p.tvlB.toFixed(1)}B</td>
                      <td className={`crypto-cell crypto-num ${ch1d.cls}`}>{ch1d.text}</td>
                      <td className={`crypto-cell crypto-num ${ch7d.cls}`}>{ch7d.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">Chain TVL</div>
          <div className="crypto-chart-subtitle">Top 10 chains by total value locked (billions USD)</div>
          <div className="crypto-chart-wrap">
            <ReactECharts option={buildChainTvlOption(chains, colors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
