import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import MetricValue from '../../../components/MetricValue/MetricValue';
import CryptoSidebar from './CryptoSidebar';
import './CryptoDashboard.css';

// Crypto sidebar is now a regular bento panel (`sidebar`).
//   Row 0-4: sidebar + top-cryptos + fear-greed + funding (each w:3)
//   Row 4-7: defi-tvl + exchanges + onchain (each w:4)
//   Row 7-10: onchain-chart (full width)
// Sidebar h:4 matches top-row neighbors so the panel reads as a peer.
const LAYOUT = {
  lg: [
    { i: 'sidebar',       x: 0, y: 0, w: 3, h: 4 },
    { i: 'top-cryptos',   x: 3, y: 0, w: 3, h: 4 },
    { i: 'fear-greed',    x: 6, y: 0, w: 3, h: 4 },
    { i: 'funding',       x: 9, y: 0, w: 3, h: 4 },
    { i: 'defi-tvl',      x: 0, y: 4, w: 4, h: 3 },
    { i: 'exchanges',     x: 4, y: 4, w: 4, h: 3 },
    { i: 'onchain',       x: 8, y: 4, w: 4, h: 3 },
    { i: 'onchain-chart', x: 0, y: 7, w: 12, h: 3 },
  ]
};


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

  const fundingRates = useMemo(() => {
    if (Array.isArray(fundingData)) return fundingData;
    if (fundingData?.rates) return fundingData.rates;
    return [];
  }, [fundingData]);

  const defiChains = useMemo(() => {
    if (Array.isArray(defiData)) return defiData;
    if (defiData?.chains) return defiData.chains;
    if (defiData?.protocols) return defiData.protocols;
    return [];
  }, [defiData]);

  const coins = useMemo(() => {
    return (coinMarketData?.coins || coinMarketData || []).slice(0, 10);
  }, [coinMarketData]);

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

  const onchainChartOption = useMemo(() => {
    const hist = onChainData?.hashrate?.history;
    if (!hist || hist.length < 2) return null;
    const dates = hist.map(h => {
      const d = new Date(h.timestamp * 1000);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const vals = hist.map(h => h.avgHashrate);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: params => `${params[0].axisValue}<br/>${params[0].data} EH/s` },
      grid: { top: 20, right: 16, bottom: 24, left: 48 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 5) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: vals,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 2 },
        areaStyle: { color: 'rgba(245,158,11,0.12)' },
      }],
    };
  }, [onChainData, colors]);

  return (
    <div className="crypto-dashboard-layout">
      <BentoWrapper layout={LAYOUT} storageKey="crypto-layout-v3">
        {/* Crypto sidebar — first bento panel (left column). Sidebar manages
            its own footer; pass noFooter. */}
        <BentoCard
          key="sidebar"
          title="Crypto"
          accent="crypto"
          className="crypto-bento-card"
          contentClassName="crypto-panel-content bento-panel-scroll"
          noFooter
        >
          <CryptoSidebar
            coinMarketData={coinMarketData}
            convertedCoins={coinMarketData}
            fearGreedData={fearGreedData}
            stablecoinMcap={stablecoinMcap}
            btcDominance={btcDominance}
            ethGas={ethGas}
            isLive={isLive}
            lastUpdated={lastUpdated}
            fetchLog={fetchLog}
            error={error}
            fetchedOn={fetchedOn}
            isCurrent={isCurrent}
          />
        </BentoCard>

        {/* Top Cryptos */}
        <BentoCard
          key="top-cryptos"
          title="Top Cryptos"
          accent="crypto"
          className="crypto-bento-card"
          contentClassName="crypto-panel-scroll"
          source="CoinGecko"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <div className="crypto-mini-table">
            {coins.slice(0, 10).map((c, i) => (
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
        </BentoCard>

        {/* Fear & Greed Chart */}
        {fgiOption && (
          <BentoCard
            key="fear-greed"
            title="Fear & Greed Index"
            accent="crypto"
            className="crypto-bento-card"
            source="CoinGecko"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="crypto-chart-wrap" style={{ minHeight: 140, flex: 1 }}>
              <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fear & Greed Index', source: 'CoinGecko', endpoint: '/api/crypto', series: [], updatedAt: lastUpdated }} />
            </div>
          </BentoCard>
        )}

        {/* Funding Rates */}
        {fundingRates.length > 0 && (
          <BentoCard
            key="funding"
            title="Funding Rates"
            accent="crypto"
            className="crypto-bento-card"
            contentClassName="crypto-panel-scroll"
            source="Bybit"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="crypto-mini-table">
              {fundingRates.slice(0, 6).map((f) => {
                // Bybit reports rate8h as a fraction (e.g. 0.0001 = 0.01% per 8h).
                // Showing only that 4-decimal number reads as visual noise; pair
                // it with the annualized rate (rate8h × 3 × 365) and open interest
                // so the panel actually communicates the funding regime.
                const rate8h = f.rate8h ?? f.rate ?? 0;
                const annualized = f.rateAnnualized ?? rate8h * 3 * 365 * 100;
                const oi = f.openInterestB;
                const positive = rate8h >= 0;
                return (
                  <div key={f.symbol || f.exchange} className="crypto-mini-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', gap: 6, alignItems: 'baseline' }}>
                    <span className="crypto-mini-name">{f.symbol || f.exchange}</span>
                    <span className="crypto-mini-value" style={{ color: positive ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }} title="Per-8h funding rate">
                      <MetricValue value={rate8h * 100} seriesKey="fundingRate" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(3)}%`} />
                    </span>
                    <span className="crypto-mini-value" style={{ color: positive ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }} title="Annualized funding rate">
                      <MetricValue value={annualized} seriesKey="fundingRateAnnualized" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}% APR`} />
                    </span>
                    <span className="crypto-mini-value" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }} title="Open interest">
                      {typeof oi === 'number' ? `$${oi.toFixed(1)}B OI` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </BentoCard>
        )}

        {/* DeFi TVL */}
        {defiChains.length > 0 && (
          <BentoCard
            key="defi-tvl"
            title="DeFi TVL by Chain"
            accent="crypto"
            className="crypto-bento-card"
            contentClassName="crypto-panel-scroll"
            source="DeFi Llama"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="crypto-mini-table">
              {defiChains.slice(0, 8).map((d) => (
                <div key={d.chain || d.name} className="crypto-mini-row">
                  <span className="crypto-mini-name">{d.chain || d.name}</span>
                  <span className="crypto-mini-value"><MetricValue value={d.tvl ?? d.tvlB} seriesKey="defiTvl" timestamp={lastUpdated} format={v => `$${(v >= 1 ? v.toFixed(2) : (v * 1e9 / 1e9).toFixed(2))}B`} /></span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* Top Exchanges */}
        {topExchanges?.length > 0 && (
          <BentoCard
            key="exchanges"
            title="Top Exchanges"
            accent="crypto"
            className="crypto-bento-card"
            contentClassName="crypto-panel-scroll"
            source="CoinGecko"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="crypto-mini-table">
              {topExchanges.slice(0, 6).map((e) => (
                <div key={e.name || e.id} className="crypto-mini-row">
                  <span className="crypto-mini-name">{e.name}</span>
                  <span className="crypto-mini-value"><MetricValue value={e.volume24h} seriesKey="topExchanges" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(1)}B`} /></span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        {/* On-Chain Metrics */}
        {onChainData && (
          <BentoCard
            key="onchain"
            title="On-Chain Metrics"
            accent="crypto"
            className="crypto-bento-card"
            contentClassName="crypto-panel-scroll"
            source="mempool.space"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
              <div className="onchain-cards">
                {onChainData.hashrate?.current != null && (
                  <div className="onchain-card">
                    <div className="onchain-card-label">Hashrate</div>
                    <div className="onchain-card-value amber">
                      <MetricValue value={onChainData.hashrate.current} seriesKey="onChainData" timestamp={lastUpdated} format={v => `${v} EH/s`} />
                    </div>
                  </div>
                )}
                {onChainData.difficulty && (
                  <div className="onchain-card">
                    <div className="onchain-card-label">Difficulty Progress</div>
                    <div className="onchain-card-value" style={{ color: onChainData.difficulty.difficultyChange > 0 ? '#4ade80' : '#f87171' }}>
                      <MetricValue value={onChainData.difficulty.progressPercent} seriesKey="onChainData" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} />
                    </div>
                    <div className="onchain-card-sub">
                      {onChainData.difficulty.difficultyChange != null && (
                        <span style={{ color: onChainData.difficulty.difficultyChange > 0 ? '#4ade80' : '#f87171' }}>
                          {onChainData.difficulty.difficultyChange > 0 ? '+' : ''}{onChainData.difficulty.difficultyChange.toFixed(1)}%
                        </span>
                      )}
                      {onChainData.difficulty.remainingBlocks != null && <> · {onChainData.difficulty.remainingBlocks} blocks</>}
                    </div>
                  </div>
                )}
                {onChainData.mempool && (
                  <div className="onchain-card">
                    <div className="onchain-card-label">Mempool</div>
                    <div className="onchain-card-value">
                      <MetricValue value={onChainData.mempool.count} seriesKey="onChainData" timestamp={lastUpdated} format={v => v != null ? `${(v / 1000).toFixed(0)}K txs` : '—'} />
                    </div>
                    {onChainData.mempool.vsize != null && <div className="onchain-card-sub">{onChainData.mempool.vsize}M vB</div>}
                  </div>
                )}
                {onChainData.fees && (
                  <div className="onchain-card">
                    <div className="onchain-card-label">BTC Fees</div>
                    <div className="onchain-card-value amber">
                      <MetricValue value={onChainData.fees.fastest} seriesKey="onChainData" timestamp={lastUpdated} format={v => `${v} sat/vB`} />
                    </div>
                    <div className="onchain-card-sub">
                      {onChainData.fees.halfHour} sat · {onChainData.fees.hour} sat · {onChainData.fees.economy} sat
                    </div>
                  </div>
                )}
              </div>
          </BentoCard>
        )}

        {/* On-Chain Hashrate Chart */}
        {onChainData?.hashrate?.history?.length > 0 && (
          <BentoCard
            key="onchain-chart"
            title="BTC Hashrate (30d)"
            accent="crypto"
            className="crypto-bento-card"
            source="mempool.space"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="crypto-chart-wrap" style={{ minHeight: 120, flex: 1 }}>
              <SafeECharts option={onchainChartOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'BTC Hashrate', source: 'mempool.space', endpoint: '/api/crypto', series: [], updatedAt: lastUpdated }} />
            </div>
          </BentoCard>
        )}
      </BentoWrapper>
    </div>
  );
}


export default React.memo(CryptoDashboard);