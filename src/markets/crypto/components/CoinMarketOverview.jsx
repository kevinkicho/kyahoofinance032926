// src/markets/crypto/components/CoinMarketOverview.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CryptoComponents.css';

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 1000)  return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (p >= 1)     return `$${p.toFixed(2)}`;
  if (p >= 0.001) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(8)}`;
}

function fmtB(v) { return v == null ? '—' : `$${v.toFixed(1)}B`; }
function fmtChange(v) {
  if (v == null) return { text: '—', cls: 'crypto-neu' };
  const cls = v > 0.05 ? 'crypto-pos' : v < -0.05 ? 'crypto-neg' : 'crypto-neu';
  return { text: `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, cls };
}

function buildDominanceOption(globalStats, colors) {
  const { btcDominance = 52, ethDominance = 15, altDominance = 33 } = globalStats || {};
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p.name}: ${p.value.toFixed(1)}%`,
    },
    legend: { show: false },
    series: [{
      type: 'pie',
      radius: ['42%', '72%'],
      center: ['50%', '50%'],
      data: [
        { name: 'BTC',   value: btcDominance, itemStyle: { color: '#f59e0b' } },
        { name: 'ETH',   value: ethDominance, itemStyle: { color: '#818cf8' } },
        { name: 'Alts',  value: altDominance, itemStyle: { color: colors.border } },
      ],
      label: {
        show: true, formatter: p => `${p.name}\n${p.value.toFixed(1)}%`,
        color: colors.textSecondary, fontSize: 10,
      },
      labelLine: { lineStyle: { color: colors.textDim } },
      emphasis: { disabled: true },
    }],
  };
}

export default function CoinMarketOverview({ coinMarketData }) {
  const { colors } = useTheme();
  if (!coinMarketData) return null;
  const { coins = [], globalStats = {} } = coinMarketData;

  const { totalMarketCapT, totalVolumeB, activeCryptocurrencies, marketCapChange24h } = globalStats;
  const ch24 = fmtChange(marketCapChange24h);

  return (
    <div className="crypto-panel">
      <div className="crypto-panel-header">
        <span className="crypto-panel-title">Coin Market Overview</span>
        <span className="crypto-panel-subtitle">Top 20 by market cap · CoinGecko</span>
      </div>
      <div className="crypto-stats-row">
        <div className="crypto-stat-pill">
          <span className="crypto-stat-label">Total Mkt Cap</span>
          <span className="crypto-stat-value amber">${totalMarketCapT?.toFixed(2)}T</span>
        </div>
        <div className="crypto-stat-pill">
          <span className="crypto-stat-label">24h Volume</span>
          <span className="crypto-stat-value">${totalVolumeB?.toFixed(0)}B</span>
        </div>
        <div className="crypto-stat-pill">
          <span className="crypto-stat-label">Active Coins</span>
          <span className="crypto-stat-value">{activeCryptocurrencies?.toLocaleString()}</span>
        </div>
        <div className="crypto-stat-pill">
          <span className="crypto-stat-label">Mkt Cap 24h</span>
          <span className={`crypto-stat-value ${ch24.cls}`}>{ch24.text}</span>
        </div>
      </div>
      <div className="crypto-two-col">
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">Top 20 Coins</div>
          <div className="crypto-chart-subtitle">Price · 24h / 7d / 30d change · mkt cap · volume</div>
          <div className="crypto-scroll">
            <table className="crypto-table">
              <thead>
                <tr>
                  <th className="crypto-th" style={{ textAlign: 'left' }}>#</th>
                  <th className="crypto-th" style={{ textAlign: 'left' }}>Coin</th>
                  <th className="crypto-th">Price</th>
                  <th className="crypto-th">24h</th>
                  <th className="crypto-th">7d</th>
                  <th className="crypto-th">30d</th>
                  <th className="crypto-th">Mkt Cap</th>
                  <th className="crypto-th">Volume</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((c, i) => {
                  const ch24 = fmtChange(c.change24h);
                  const ch7d = fmtChange(c.change7d);
                  const ch30 = fmtChange(c.change30d);
                  return (
                    <tr key={c.id} className="crypto-row">
                      <td className="crypto-cell crypto-muted">{i + 1}</td>
                      <td className="crypto-cell">
                        <strong>{c.symbol}</strong>
                        <span className="crypto-muted"> {c.name}</span>
                      </td>
                      <td className="crypto-cell crypto-num">{fmtPrice(c.price)}</td>
                      <td className={`crypto-cell crypto-num ${ch24.cls}`}>{ch24.text}</td>
                      <td className={`crypto-cell crypto-num ${ch7d.cls}`}>{ch7d.text}</td>
                      <td className={`crypto-cell crypto-num ${ch30.cls}`}>{ch30.text}</td>
                      <td className="crypto-cell crypto-num">{fmtB(c.marketCapB)}</td>
                      <td className="crypto-cell crypto-num">{fmtB(c.volumeB)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">Market Dominance</div>
          <div className="crypto-chart-subtitle">BTC · ETH · Alts share of total market cap</div>
          <div className="crypto-chart-wrap">
            <ReactECharts option={buildDominanceOption(globalStats, colors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
