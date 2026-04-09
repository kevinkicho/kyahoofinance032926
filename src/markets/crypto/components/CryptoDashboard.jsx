// src/markets/crypto/components/CryptoDashboard.jsx
import React, { useMemo } from 'react';
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

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    const coins = coinMarketData?.coins || [];
    // BTC Price
    const btc = coins.find(c => c.symbol === 'BTC' || c.id === 'bitcoin');
    if (btc?.price) {
      result.push({
        label: 'BTC',
        value: `$${(btc.price / 1000).toFixed(1)}K`,
        change: btc.change24h,
        color: '#f59e0b',
      });
    }
    // ETH Price
    const eth = coins.find(c => c.symbol === 'ETH' || c.id === 'ethereum');
    if (eth?.price) {
      result.push({
        label: 'ETH',
        value: `$${(eth.price / 1000).toFixed(2)}K`,
        change: eth.change24h,
        color: '#60a5fa',
      });
    }
    // BTC Dominance from globalStats or prop
    const btcDom = btcDominance ?? coinMarketData?.globalStats?.btcDominance;
    if (btcDom != null) {
      result.push({
        label: 'BTC Dom',
        value: `${btcDom.toFixed(1)}%`,
        color: '#a78bfa',
      });
    }
    // Fear & Greed
    if (fearGreedData?.value != null) {
      const fgi = fearGreedData.value;
      result.push({
        label: 'Fear/Greed',
        value: fgi,
        classification: fearGreedData.label || (fgi < 25 ? 'Extreme Fear' : fgi < 50 ? 'Fear' : fgi < 75 ? 'Greed' : 'Extreme Greed'),
        color: fgi < 25 ? '#ef4444' : fgi < 50 ? '#f59e0b' : fgi < 75 ? '#22c55e' : '#14b8a6',
      });
    }
    // Stablecoin Mcap
    if (stablecoinMcap != null) {
      result.push({
        label: 'Stablecoins',
        value: `$${(stablecoinMcap / 1e9).toFixed(0)}B`,
        color: '#14b8a6',
      });
    }
    // ETH Gas
    if (ethGas != null) {
      result.push({
        label: 'ETH Gas',
        value: `${ethGas.toFixed(0)} gwei`,
        color: ethGas > 50 ? '#ef4444' : ethGas > 20 ? '#f59e0b' : '#22c55e',
      });
    }
    return result;
  }, [coinMarketData, btcDominance, fearGreedData, stablecoinMcap, ethGas]);

  // Fear & Greed history chart
  const fgiOption = useMemo(() => {
    if (!fearGreedData?.history?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: fearGreedData.history.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fearGreedData.history.dates.length / 6) } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: fearGreedData.history.values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 2 },
        areaStyle: { color: '#a78bfa', opacity: 0.1 },
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: colors.textDim },
          data: [
            { yAxis: 25, label: { formatter: 'Extreme Fear', color: colors.textMuted, fontSize: 9 } },
            { yAxis: 75, label: { formatter: 'Extreme Greed', color: colors.textMuted, fontSize: 9 } },
          ],
        },
      }],
    };
  }, [fearGreedData, colors]);

  return (
    <div className="crypto-dashboard">
      {/* KPI Strip */}
      <div className="crypto-kpi-strip">
        {kpis.map((kpi, i) => (
          <div key={i} className="crypto-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="crypto-kpi-label">{kpi.label}</span>
            <span className="crypto-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
            {kpi.change != null && (
              <span className="crypto-kpi-change" style={{ color: kpi.change >= 0 ? '#22c55e' : '#ef4444' }}>
                {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}%
              </span>
            )}
            {kpi.classification && (
              <span className="crypto-kpi-status">{kpi.classification}</span>
            )}
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="crypto-chart-grid">
        {/* Coin Market Overview */}
        {(coinMarketData?.coins?.length > 0 || coinMarketData?.length > 0) && (
          <div className="crypto-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="crypto-panel-title">Top Cryptos</div>
            <div className="crypto-mini-table">
              {(coinMarketData?.coins || coinMarketData || []).slice(0, 8).map((c, i) => (
                <div key={i} className="crypto-mini-row">
                  <span className="crypto-mini-rank">{i + 1}</span>
                  <span className="crypto-mini-name">{c.symbol?.toUpperCase()}</span>
                  <span className="crypto-mini-price">${c.price?.toFixed(2) || c.current_price?.toFixed(2)}</span>
                  <span className="crypto-mini-change" style={{ color: (c.change24h || c.price_change_percentage_24h || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(c.change24h || c.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(c.change24h || c.price_change_percentage_24h || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fear & Greed Chart */}
        {fgiOption && (
          <div className="crypto-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="crypto-panel-title">Fear & Greed Index</div>
            <div className="crypto-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* DeFi Chains */}
        {defiData?.length > 0 && (
          <div className="crypto-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="crypto-panel-title">DeFi TVL</div>
            <div className="crypto-mini-table">
              {defiData.slice(0, 6).map((d, i) => (
                <div key={i} className="crypto-mini-row">
                  <span className="crypto-mini-name">{d.chain || d.name}</span>
                  <span className="crypto-mini-value">${(d.tvl / 1e9).toFixed(2)}B</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Funding Rates */}
        {fundingData?.length > 0 && (
          <div className="crypto-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="crypto-panel-title">Funding Rates</div>
            <div className="crypto-mini-table">
              {fundingData.slice(0, 6).map((f, i) => (
                <div key={i} className="crypto-mini-row">
                  <span className="crypto-mini-name">{f.exchange}</span>
                  <span className="crypto-mini-value" style={{ color: (f.rate || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(f.rate || 0) >= 0 ? '+' : ''}{((f.rate || 0) * 100).toFixed(4)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* On-Chain Metrics */}
        {onChainData?.length > 0 && (
          <div className="crypto-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="crypto-panel-title">On-Chain Metrics</div>
            <div className="crypto-mini-table">
              {onChainData.slice(0, 6).map((o, i) => (
                <div key={i} className="crypto-mini-row">
                  <span className="crypto-mini-name">{o.metric}</span>
                  <span className="crypto-mini-value">{o.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Exchanges */}
        {topExchanges?.length > 0 && (
          <div className="crypto-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
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
  );
}