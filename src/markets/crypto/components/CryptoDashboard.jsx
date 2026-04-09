// src/markets/crypto/components/CryptoDashboard.jsx
import React, { useMemo, useState } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './CryptoDashboard.css';

export default function CryptoDashboard({
  coinMarketData,
  fearGreedData,
  defiData,
  fundingData,
  onChainData,
  stablecoinMcap,
  btcDominance,
  topExchanges,
  ethGas,
}) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');

  // Top coins
  const coins = useMemo(() => {
    return (coinMarketData?.coins || coinMarketData || []).slice(0, 10);
  }, [coinMarketData]);

  // BTC/ETH data
  const btcData = useMemo(() => coins.find(c => c.symbol === 'BTC' || c.id === 'bitcoin'), [coins]);
  const ethData = useMemo(() => coins.find(c => c.symbol === 'ETH' || c.id === 'ethereum'), [coins]);

  // Fear & Greed chart
  const fgiOption = useMemo(() => {
    if (!fearGreedData?.history?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: fearGreedData.history.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fearGreedData.history.dates.length / 5) } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: fearGreedData.history.values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 2 },
        areaStyle: { color: 'rgba(167,139,250,0.1)' },
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: colors.textDim },
          data: [
            { yAxis: 25, label: { formatter: 'Fear', color: colors.textMuted, fontSize: 9 } },
            { yAxis: 75, label: { formatter: 'Greed', color: colors.textMuted, fontSize: 9 } },
          ],
        },
      }],
    };
  }, [fearGreedData, colors]);

  return (
    <div className="crypto-dashboard">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Key Metrics */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="crypto-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }}>
        {/* BTC */}
        {btcData && (
          <div className="crypto-sidebar-section">
            <div className="crypto-sidebar-title">Bitcoin</div>
            <div className="crypto-metric-card">
              <div className="crypto-metric-label">BTC Price</div>
              <div className="crypto-metric-value" style={{ color: '#f59e0b' }}>
                ${btcData.price?.toFixed(2) || (btcData.current_price?.toFixed(2))}
              </div>
              <span style={{ fontSize: 10, color: (btcData.change24h || btcData.price_change_percentage_24h || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                {(btcData.change24h || btcData.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(btcData.change24h || btcData.price_change_percentage_24h || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* ETH */}
        {ethData && (
          <div className="crypto-sidebar-section">
            <div className="crypto-sidebar-title">Ethereum</div>
            <div className="crypto-metric-card">
              <div className="crypto-metric-label">ETH Price</div>
              <div className="crypto-metric-value" style={{ color: '#60a5fa' }}>
                ${ethData.price?.toFixed(2) || (ethData.current_price?.toFixed(2))}
              </div>
              <span style={{ fontSize: 10, color: (ethData.change24h || ethData.price_change_percentage_24h || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                {(ethData.change24h || ethData.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(ethData.change24h || ethData.price_change_percentage_24h || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Market Metrics */}
        <div className="crypto-sidebar-section">
          <div className="crypto-sidebar-title">Market</div>
          <div className="crypto-metric-card">
            {btcDominance != null && (
              <div className="crypto-metric-row">
                <span className="crypto-metric-name">BTC Dom</span>
                <span className="crypto-metric-num" style={{ color: '#a78bfa' }}>{btcDominance.toFixed(1)}%</span>
              </div>
            )}
            {stablecoinMcap != null && (
              <div className="crypto-metric-row">
                <span className="crypto-metric-name">Stablecoins</span>
                <span className="crypto-metric-num">${(stablecoinMcap / 1e9).toFixed(0)}B</span>
              </div>
            )}
            {ethGas != null && (
              <div className="crypto-metric-row">
                <span className="crypto-metric-name">ETH Gas</span>
                <span className="crypto-metric-num" style={{ color: ethGas > 50 ? '#f87171' : ethGas > 20 ? '#fbbf24' : '#4ade80' }}>
                  {ethGas.toFixed(0)} gwei
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fear & Greed */}
        {fearGreedData?.value != null && (
          <div className="crypto-sidebar-section">
            <div className="crypto-sidebar-title">Sentiment</div>
            <div className="crypto-metric-card">
              <div className="crypto-metric-label">Fear & Greed</div>
              <div className="crypto-metric-value" style={{
                color: fearGreedData.value < 25 ? '#f87171' : fearGreedData.value < 50 ? '#fbbf24' : fearGreedData.value < 75 ? '#4ade80' : '#14b8a6'
              }}>
                {fearGreedData.value}
              </div>
              <div className="crypto-metric-status">{fearGreedData.label || (fearGreedData.value < 25 ? 'Extreme Fear' : fearGreedData.value < 50 ? 'Fear' : fearGreedData.value < 75 ? 'Greed' : 'Extreme Greed')}</div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="crypto-main">
        {/* Tab Navigation */}
        <div className="crypto-tabs">
          <button className={`crypto-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`crypto-tab ${activeTab === 'sentiment' ? 'active' : ''}`} onClick={() => setActiveTab('sentiment')}>Sentiment</button>
          <button className={`crypto-tab ${activeTab === 'defi' ? 'active' : ''}`} onClick={() => setActiveTab('defi')}>DeFi</button>
          <button className={`crypto-tab ${activeTab === 'onchain' ? 'active' : ''}`} onClick={() => setActiveTab('onchain')}>On-Chain</button>
        </div>

        {/* Tab Content */}
        <div className="crypto-tab-content">
          {/* OVERVIEW TAB */}
          <div className={`crypto-tab-panel ${activeTab === 'overview' ? 'active' : ''}`}>
            <div className="crypto-content-grid">
              {/* Top Cryptos */}
              <div className="crypto-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                <div className="crypto-panel-title">Top Cryptos</div>
                <div className="crypto-mini-table">
                  {coins.slice(0, 8).map((c, i) => (
                    <div key={i} className="crypto-mini-row">
                      <span className="crypto-mini-rank">{i + 1}</span>
                      <span className="crypto-mini-name">{c.symbol?.toUpperCase()}</span>
                      <span className="crypto-mini-price">${(c.price || c.current_price)?.toFixed(2)}</span>
                      <span className="crypto-mini-change" style={{ color: (c.change24h || c.price_change_percentage_24h || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                        {(c.change24h || c.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(c.change24h || c.price_change_percentage_24h || 0).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Funding Rates */}
              {fundingData?.length > 0 && (
                <div className="crypto-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="crypto-panel-title">Funding Rates</div>
                  <div className="crypto-mini-table">
                    {fundingData.slice(0, 6).map((f, i) => (
                      <div key={i} className="crypto-mini-row">
                        <span className="crypto-mini-name">{f.exchange}</span>
                        <span className="crypto-mini-value" style={{ color: (f.rate || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                          {(f.rate || 0) >= 0 ? '+' : ''}{((f.rate || 0) * 100).toFixed(4)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Exchanges */}
              {topExchanges?.length > 0 && (
                <div className="crypto-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="crypto-panel-title">Top Exchanges</div>
                  <div className="crypto-mini-table">
                    {topExchanges.slice(0, 6).map((e, i) => (
                      <div key={i} className="crypto-mini-row">
                        <span className="crypto-mini-name">{e.name}</span>
                        <span className="crypto-mini-value">${(e.volume24h / 1e9).toFixed(1)}B</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SENTIMENT TAB */}
          <div className={`crypto-tab-panel ${activeTab === 'sentiment' ? 'active' : ''}`}>
            <div className="crypto-content-grid single">
              {fgiOption && (
                <div className="crypto-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="crypto-panel-header">
                    <span className="crypto-panel-title">Fear & Greed Index</span>
                    <span className="crypto-panel-subtitle">Historical trend</span>
                  </div>
                  <div className="crypto-chart-wrap" style={{ minHeight: 200 }}>
                    <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DEFI TAB */}
          <div className={`crypto-tab-panel ${activeTab === 'defi' ? 'active' : ''}`}>
            <div className="crypto-content-grid">
              {/* DeFi TVL */}
              {defiData?.length > 0 && (
                <div className="crypto-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="crypto-panel-title">DeFi TVL by Chain</div>
                  <div className="crypto-mini-table">
                    {defiData.slice(0, 8).map((d, i) => (
                      <div key={i} className="crypto-mini-row">
                        <span className="crypto-mini-name">{d.chain || d.name}</span>
                        <span className="crypto-mini-value">${(d.tvl / 1e9).toFixed(2)}B</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ON-CHAIN TAB */}
          <div className={`crypto-tab-panel ${activeTab === 'onchain' ? 'active' : ''}`}>
            <div className="crypto-content-grid">
              {/* On-Chain Metrics */}
              {onChainData?.length > 0 && (
                <div className="crypto-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="crypto-panel-title">On-Chain Metrics</div>
                  <div className="crypto-mini-table">
                    {onChainData.slice(0, 8).map((o, i) => (
                      <div key={i} className="crypto-mini-row">
                        <span className="crypto-mini-name">{o.metric}</span>
                        <span className="crypto-mini-value">{o.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}