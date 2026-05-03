import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import DataFooter from '../../../components/DataFooter/DataFooter';
import './CryptoSidebar.css';

function fgiLabel(value) {
  if (value == null) return '—';
  if (value < 25) return 'Extreme Fear';
  if (value < 50) return 'Fear';
  if (value < 75) return 'Greed';
  return 'Extreme Greed';
}

function fgiColor(value) {
  if (value == null) return 'var(--text-muted)';
  if (value < 25) return '#f87171';
  if (value < 50) return '#fbbf24';
  if (value < 75) return '#4ade80';
  return '#14b8a6';
}

function gasColor(v) {
  if (v == null) return 'var(--text-muted)';
  if (v > 50) return '#f87171';
  if (v > 20) return '#fbbf24';
  return '#4ade80';
}

export default function CryptoSidebar({
  coinMarketData,
  convertedCoins,
  fearGreedData,
  stablecoinMcap,
  btcDominance,
  ethGas,
  isLive,
  lastUpdated,
  fetchLog,
  error,
  fetchedOn,
  isCurrent,
}) {
  const coins = useMemo(() => {
    if (convertedCoins && convertedCoins.length) return convertedCoins;
    return (coinMarketData?.coins || coinMarketData || []).slice(0, 10);
  }, [coinMarketData, convertedCoins]);

  const btcData = useMemo(() => coins.find(c => c.symbol === 'BTC' || c.id === 'bitcoin'), [coins]);
  const ethData = useMemo(() => coins.find(c => c.symbol === 'ETH' || c.id === 'ethereum'), [coins]);

  const ethGasValue = useMemo(() => {
    if (ethGas == null) return null;
    if (typeof ethGas === 'number') return ethGas;
    return ethGas.average ?? ethGas.low ?? null;
  }, [ethGas]);

  const btcPrice = btcData?.price ?? btcData?.current_price;
  const btcChange = btcData?.change24h ?? btcData?.price_change_percentage_24h;
  const ethPrice = ethData?.price ?? ethData?.current_price;
  const ethChange = ethData?.change24h ?? ethData?.price_change_percentage_24h;
  const totalMarketCap = coinMarketData?.globalStats?.totalMarketCapT ??
    (coinMarketData?.total_market_cap_usd ? coinMarketData.total_market_cap_usd / 1e12 : null);
  const fgiValue = fearGreedData?.value ?? fearGreedData?.score;

  return (
    // Now rendered inside a `.crypto-bento-card` (real bento panel), so the
    // outer chrome (background/border/shadow) comes from .bento-card. The
    // sidebar element itself is just a vertical layout container.
    <div className="crypto-sidebar crypto-sidebar--in-bento">
      <div className="crypto-sidebar-section">
        <h3 className="crypto-sidebar-section-title">BTC / ETH</h3>
        {btcData && (
          <div className="crypto-sidebar-metric">
            <div className="crypto-sidebar-metric-main">
              <span className="crypto-sidebar-metric-label">BTC</span>
              <span className="crypto-sidebar-metric-value" style={{ color: '#f59e0b' }}>
                <MetricValue value={btcPrice} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => v != null ? `$${v.toLocaleString()}` : '—'} />
              </span>
            </div>
            <span className="crypto-sidebar-metric-change" style={{ color: btcChange >= 0 ? '#4ade80' : '#f87171' }}>
              {btcChange != null ? `${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(1)}%` : '—'}
            </span>
          </div>
        )}
        {ethData && (
          <div className="crypto-sidebar-metric">
            <div className="crypto-sidebar-metric-main">
              <span className="crypto-sidebar-metric-label">ETH</span>
              <span className="crypto-sidebar-metric-value" style={{ color: '#60a5fa' }}>
                <MetricValue value={ethPrice} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => v != null ? `$${v.toLocaleString()}` : '—'} />
              </span>
            </div>
            <span className="crypto-sidebar-metric-change" style={{ color: ethChange >= 0 ? '#4ade80' : '#f87171' }}>
              {ethChange != null ? `${ethChange >= 0 ? '+' : ''}${ethChange.toFixed(1)}%` : '—'}
            </span>
          </div>
        )}
      </div>

      <div className="crypto-sidebar-section">
        <h3 className="crypto-sidebar-section-title">Market</h3>
        <div className="crypto-sidebar-metric">
          <span className="crypto-sidebar-metric-label">Global Cap</span>
          <span className="crypto-sidebar-metric-value">
            <MetricValue value={totalMarketCap} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => v != null ? `$${v.toFixed(2)}T` : '—'} />
          </span>
        </div>
        <div className="crypto-sidebar-metric">
          <span className="crypto-sidebar-metric-label">BTC Dom</span>
          <span className="crypto-sidebar-metric-value">
            <MetricValue value={btcDominance} seriesKey="btcDominance" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
          </span>
        </div>
        <div className="crypto-sidebar-metric">
          <span className="crypto-sidebar-metric-label">Stables</span>
          <span className="crypto-sidebar-metric-value">
            <MetricValue value={stablecoinMcap} seriesKey="stablecoinMcap" timestamp={lastUpdated} format={v => v != null ? `$${(v / 1e9).toFixed(0)}B` : '—'} />
          </span>
        </div>
        <div className="crypto-sidebar-metric">
          <span className="crypto-sidebar-metric-label">ETH Gas</span>
          <span className="crypto-sidebar-metric-value" style={{ color: gasColor(ethGasValue) }}>
            <MetricValue value={ethGasValue} seriesKey="ethGas" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(0)} gwei` : '—'} />
          </span>
        </div>
      </div>

      <div className="crypto-sidebar-section">
        <h3 className="crypto-sidebar-section-title">Fear & Greed</h3>
        {fgiValue != null && (
          <>
            <div className="crypto-sidebar-metric">
              <span className="crypto-sidebar-metric-label">Index</span>
              <span className="crypto-sidebar-metric-value" style={{ color: fgiColor(fgiValue), fontSize: 18, fontWeight: 700 }}>
                {Math.round(fgiValue)}
              </span>
            </div>
            <div className="crypto-sidebar-metric-sub" style={{ color: fgiColor(fgiValue), fontSize: 11 }}>
              {fearGreedData?.label || fgiLabel(fgiValue)}
            </div>
          </>
        )}
        {fgiValue == null && (
          <div className="crypto-sidebar-metric">
            <span className="crypto-sidebar-metric-label">Index</span>
            <span className="crypto-sidebar-metric-value">—</span>
          </div>
        )}
      </div>

      <div className="crypto-sidebar-status">
        {isLive ? <span className="crypto-sidebar-live">● Live</span> : <span className="crypto-sidebar-fallback">● Awaiting data</span>}
      </div>

      <DataFooter
        source="CoinGecko / Mempool / DefiLlama / Alternative.me"
        timestamp={lastUpdated}
        isLive={isLive}
        fetchLog={fetchLog}
        error={error}
        fetchedOn={fetchedOn}
        isCurrent={isCurrent}
      />
    </div>
  );
}