// src/markets/crypto/components/CryptoDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './CryptoDashboard.css';

const LAYOUT = {
  lg: [
    { i: 'key-metrics', x: 0, y: 0, w: 3, h: 3 },
    { i: 'top-cryptos', x: 3, y: 0, w: 3, h: 3 },
    { i: 'fear-greed', x: 6, y: 0, w: 3, h: 3 },
    { i: 'funding', x: 9, y: 0, w: 3, h: 3 },
    { i: 'defi-tvl', x: 0, y: 3, w: 4, h: 3 },
    { i: 'exchanges', x: 4, y: 3, w: 4, h: 3 },
    { i: 'onchain', x: 8, y: 3, w: 4, h: 3 },
  ]
};

const stopDrag = (e) => e.stopPropagation();

function CryptoDashboard({
  coinMarketData,
  fearGreedData,
  defiData,
  fundingData,
  onChainData,
  stablecoinMcap,
  btcDominance,
  topExchanges,
  ethGas,
  isLive,
  lastUpdated,
  fetchLog,
  error,
  fetchedOn,
  isCurrent,
}) {
  const { colors } = useTheme();

  const coins = useMemo(() => {
    return (coinMarketData?.coins || coinMarketData || []).slice(0, 10);
  }, [coinMarketData]);

  const btcData = useMemo(() => coins.find(c => c.symbol === 'BTC' || c.id === 'bitcoin'), [coins]);
  const ethData = useMemo(() => coins.find(c => c.symbol === 'ETH' || c.id === 'ethereum'), [coins]);

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
    <div className="crypto-dashboard crypto-dashboard--bento" role="region" aria-label="Crypto Dashboard">
      <BentoWrapper layout={LAYOUT} storageKey="crypto-layout">
        {/* Key Metrics card — consolidates sidebar */}
        <div key="key-metrics" className="crypto-bento-card">
          <div className="crypto-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content crypto-panel-scroll" onMouseDown={stopDrag}>
            {btcData && (
              <div className="crypto-metric-section">
                <div className="crypto-metric-label">Bitcoin</div>
                <div className="crypto-metric-card">
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">BTC Price</span>
                    <span className="crypto-metric-num" style={{ color: '#f59e0b' }}>
                      <MetricValue value={btcData.price ?? btcData.current_price} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => `$${v.toFixed(2)}`} />
                    </span>
                  </div>
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">24h</span>
                    <span className="crypto-metric-num" style={{ fontSize: 10, color: (btcData.change24h || btcData.price_change_percentage_24h || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      <MetricValue value={(btcData.change24h || btcData.price_change_percentage_24h || 0)} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {ethData && (
              <div className="crypto-metric-section">
                <div className="crypto-metric-label">Ethereum</div>
                <div className="crypto-metric-card">
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">ETH Price</span>
                    <span className="crypto-metric-num" style={{ color: '#60a5fa' }}>
                      <MetricValue value={ethData.price ?? ethData.current_price} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => `$${v.toFixed(2)}`} />
                    </span>
                  </div>
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">24h</span>
                    <span className="crypto-metric-num" style={{ fontSize: 10, color: (ethData.change24h || ethData.price_change_percentage_24h || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      <MetricValue value={(ethData.change24h || ethData.price_change_percentage_24h || 0)} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="crypto-metric-section">
              <div className="crypto-metric-label">Market</div>
              <div className="crypto-metric-card">
                {btcDominance != null && (
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">BTC Dom</span>
                    <span className="crypto-metric-num" style={{ color: '#a78bfa' }}><MetricValue value={btcDominance} seriesKey="btcDominance" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} /></span>
                  </div>
                )}
                {stablecoinMcap != null && (
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">Stablecoins</span>
                    <span className="crypto-metric-num"><MetricValue value={stablecoinMcap} seriesKey="stablecoinMcap" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(0)}B`} /></span>
                  </div>
                )}
                {ethGas != null && (
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">ETH Gas</span>
                    <span className="crypto-metric-num" style={{ color: ethGas > 50 ? '#f87171' : ethGas > 20 ? '#fbbf24' : '#4ade80' }}>
                      <MetricValue value={ethGas} seriesKey="ethGas" timestamp={lastUpdated} format={v => `${v.toFixed(0)} gwei`} />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {fearGreedData?.value != null && (
              <div className="crypto-metric-section">
                <div className="crypto-metric-label">Sentiment</div>
                <div className="crypto-metric-card">
                  <div className="crypto-metric-row">
                    <span className="crypto-metric-name">Fear & Greed</span>
                    <span className="crypto-metric-num" style={{
                      color: fearGreedData.value < 25 ? '#f87171' : fearGreedData.value < 50 ? '#fbbf24' : fearGreedData.value < 75 ? '#4ade80' : '#14b8a6'
                    }}>
                      <MetricValue value={fearGreedData.value} seriesKey="fearGreed" timestamp={lastUpdated} format={v => `${v}`} />
                    </span>
                  </div>
                  <div className="crypto-metric-status">{fearGreedData.label || (fearGreedData.value < 25 ? 'Extreme Fear' : fearGreedData.value < 50 ? 'Fear' : fearGreedData.value < 75 ? 'Greed' : 'Extreme Greed')}</div>
                </div>
              </div>
            )}
          </div>
          <DataFooter source="CoinGecko / FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Top Cryptos */}
        <div key="top-cryptos" className="crypto-bento-card">
          <div className="crypto-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Top Cryptos</span>
          </div>
          <div className="bento-panel-content crypto-panel-scroll" onMouseDown={stopDrag}>
            <div className="crypto-mini-table">
              {coins.slice(0, 8).map((c, i) => (
                <div key={c.id || c.symbol} className="crypto-mini-row">
                  <span className="crypto-mini-rank">{i + 1}</span>
                  <span className="crypto-mini-name">{c.symbol?.toUpperCase()}</span>
                  <span className="crypto-mini-price"><MetricValue value={c.price || c.current_price} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => `$${v.toFixed(2)}`} /></span>
                  <span className="crypto-mini-change" style={{ color: (c.change24h || c.price_change_percentage_24h || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                    <MetricValue value={c.change24h || c.price_change_percentage_24h || 0} seriesKey="coinMarketData" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                  </span>
                </div>
              ))}
            </div>
          </div>
          <DataFooter source="CoinGecko" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Fear & Greed Chart */}
        {fgiOption && (
          <div key="fear-greed" className="crypto-bento-card">
            <div className="crypto-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Fear & Greed Index</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <div className="crypto-chart-wrap" style={{ minHeight: 140, flex: 1 }}>
                <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fear & Greed Index', source: 'CoinGecko', endpoint: '/api/crypto', series: [], updatedAt: lastUpdated }} />
              </div>
            </div>
            <DataFooter source="CoinGecko" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Funding Rates */}
        {fundingData?.length > 0 && (
          <div key="funding" className="crypto-bento-card">
            <div className="crypto-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Funding Rates</span>
            </div>
            <div className="bento-panel-content crypto-panel-scroll" onMouseDown={stopDrag}>
              <div className="crypto-mini-table">
                {fundingData.slice(0, 6).map((f) => (
                  <div key={f.exchange || f.symbol} className="crypto-mini-row">
                    <span className="crypto-mini-name">{f.exchange}</span>
                    <span className="crypto-mini-value" style={{ color: (f.rate || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      <MetricValue value={(f.rate || 0) * 100} seriesKey="fundingRate" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(4)}%`} />
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <DataFooter source="CoinGecko" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>
        )}

        {/* DeFi TVL */}
        {defiData?.length > 0 && (
          <div key="defi-tvl" className="crypto-bento-card">
            <div className="crypto-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">DeFi TVL by Chain</span>
            </div>
            <div className="bento-panel-content crypto-panel-scroll" onMouseDown={stopDrag}>
              <div className="crypto-mini-table">
                {defiData.slice(0, 8).map((d) => (
                  <div key={d.chain || d.name} className="crypto-mini-row">
                    <span className="crypto-mini-name">{d.chain || d.name}</span>
                    <span className="crypto-mini-value"><MetricValue value={d.tvl} seriesKey="defiTvl" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(2)}B`} /></span>
                  </div>
                ))}
            </div>
          </div>
          <DataFooter source="DeFi Llama" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>
        )}

        {/* Top Exchanges */}
        {topExchanges?.length > 0 && (
          <div key="exchanges" className="crypto-bento-card">
            <div className="crypto-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Top Exchanges</span>
            </div>
            <div className="bento-panel-content crypto-panel-scroll" onMouseDown={stopDrag}>
              <div className="crypto-mini-table">
                {topExchanges.slice(0, 6).map((e) => (
                  <div key={e.name || e.id} className="crypto-mini-row">
                    <span className="crypto-mini-name">{e.name}</span>
                    <span className="crypto-mini-value"><MetricValue value={e.volume24h} seriesKey="topExchanges" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(1)}B`} /></span>
                  </div>
                ))}
            </div>
          </div>
          <DataFooter source="CoinGecko" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>
        )}

        {/* On-Chain Metrics */}
        {onChainData?.length > 0 && (
          <div key="onchain" className="crypto-bento-card">
            <div className="crypto-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">On-Chain Metrics</span>
            </div>
            <div className="bento-panel-content crypto-panel-scroll" onMouseDown={stopDrag}>
              <div className="crypto-mini-table">
                {onChainData.slice(0, 8).map((o) => (
                  <div key={o.metric || o.name} className="crypto-mini-row">
                    <span className="crypto-mini-name">{o.metric}</span>
                    <span className="crypto-mini-value"><MetricValue value={o.value} seriesKey="onChainData" timestamp={lastUpdated} format={v => `${v}`} /></span>
                  </div>
                ))}
            </div>
          </div>
          <DataFooter source="Glassnode / Server" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(CryptoDashboard);