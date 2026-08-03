import React, { useMemo, useCallback } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import CryptoSidebar from './CryptoSidebar';
import StablecoinCompositionPanel from './StablecoinCompositionPanel';
import DefiTvlTrendPanel from './DefiTvlTrendPanel';
import BtcOnChainPanel from './BtcOnChainPanel';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
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
    { i: 'stablecoin-composition', x: 0, y: 10, w: 4, h: 3 },
    { i: 'defi-tvl-trend', x: 4, y: 10, w: 4, h: 3 },
    { i: 'btc-onchain', x: 8, y: 10, w: 4, h: 3 },
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

  const fgiValue = fearGreedData?.value ?? fearGreedData?.score ?? null;
  const fgiLabel = fearGreedData?.label
    ?? (fgiValue == null ? null
      : fgiValue <= 25 ? 'Extreme Fear'
      : fgiValue <= 45 ? 'Fear'
      : fgiValue <= 55 ? 'Neutral'
      : fgiValue <= 75 ? 'Greed'
      : 'Extreme Greed');

  const fgiOption = useMemo(() => {
    const hist = fearGreedData?.history;
    if (!hist) return null;
    let dates;
    let values;
    if (Array.isArray(hist)) {
      if (!hist.length) return null;
      if (typeof hist[0] === 'number') {
        values = hist;
        dates = hist.map((_, i) => `${i + 1}d`);
      } else {
        values = hist.map((h) => Number(h?.value ?? h)).filter((v) => Number.isFinite(v));
        dates = hist.map((h, i) => (h?.date ? String(h.date).slice(5) : `${i + 1}d`));
      }
    } else {
      dates = hist.dates || [];
      values = hist.values || [];
    }
    if (!values?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 16, right: 12, bottom: 22, left: 32, containLabel: false },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 5) - 1) } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 2 },
        areaStyle: { color: 'rgba(167,139,250,0.12)' },
        markLine: {
          silent: true,
          symbol: 'none',
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
    // Optional second series if fee history exists (often single latest only)
    const feeHist = onChainData?.fees?.history;
    const feeVals = Array.isArray(feeHist)
      ? feeHist.map((h) => Number(h?.avgFee ?? h?.fee ?? h))
      : null;
    const hasFees = Array.isArray(feeVals) && feeVals.length === vals.length && feeVals.some((v) => Number.isFinite(v));
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: hasFees ? ['Hashrate EH/s', 'Fees'] : ['Hashrate EH/s'],
        top: 0,
        textStyle: { color: colors.textSecondary, fontSize: 9 },
      },
      grid: { top: 24, right: hasFees ? 40 : 16, bottom: 24, left: 48 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 5) } },
      yAxis: hasFees
        ? [
            { type: 'value', name: 'EH/s', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
            { type: 'value', name: 'fee', position: 'right', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { show: false } },
          ]
        : { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        {
          name: 'Hashrate EH/s',
          type: 'line',
          yAxisIndex: 0,
          data: vals,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 2 },
          areaStyle: { color: 'rgba(245,158,11,0.12)' },
        },
        ...(hasFees
          ? [{
              name: 'Fees',
              type: 'line',
              yAxisIndex: 1,
              data: feeVals,
              smooth: true,
              symbol: 'none',
              lineStyle: { color: '#22d3ee', width: 1.4 },
            }]
          : []),
      ],
    };
  }, [onChainData, colors]);

  const renderPanel = useCallback((panelId) => {
    switch (panelId) {
      case 'sidebar':
        return (
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
        );

      case 'top-cryptos':
        return (
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
        );

      case 'fear-greed': {
        const btc = coins.find((c) => /btc|bitcoin/i.test(c.symbol || c.id || ''));
        const btcChg = btc?.change24h ?? btc?.price_change_percentage_24h;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, padding: '8px 10px', boxSizing: 'border-box', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
              <span style={{
                fontSize: 36,
                fontWeight: 700,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                lineHeight: 1,
                color: fgiValue == null ? '#94a3b8'
                  : fgiValue <= 25 ? '#f87171'
                  : fgiValue <= 45 ? '#fbbf24'
                  : fgiValue <= 55 ? '#e2e8f0'
                  : fgiValue <= 75 ? '#a78bfa'
                  : '#c084fc',
              }}>
                {fgiValue ?? '—'}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fgiLabel || '—'}</div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>0 Fear · 100 Greed</div>
                {btcChg != null && (
                  <div style={{ fontSize: 10, marginTop: 2, color: btcChg >= 0 ? '#4ade80' : '#f87171' }}>
                    BTC 24h {btcChg >= 0 ? '+' : ''}{Number(btcChg).toFixed(1)}%
                  </div>
                )}
                {btcDominance != null && (
                  <div style={{ fontSize: 10, opacity: 0.7 }}>BTC dom {Number(btcDominance).toFixed(1)}%</div>
                )}
              </div>
            </div>
            {fgiOption ? (
              <div className="crypto-chart-wrap" style={{ minHeight: 120, flex: 1 }}>
                <SafeECharts
                  option={fgiOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{ title: 'Fear & Greed Index', source: 'Alternative.me', endpoint: '/api/crypto', series: [], updatedAt: lastUpdated }}
                />
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', padding: 8 }}>
                History unavailable — score only
              </div>
            )}
          </div>
        );
      }

      case 'funding':
        return fundingRates.length > 0 ? (
          <div className="crypto-mini-table">
            <div className="crypto-mini-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', gap: 6, fontSize: 9, opacity: 0.65, marginBottom: 2 }}>
              <span>Pair</span><span>8h</span><span>Ann.</span><span>OI</span>
            </div>
            {fundingRates.slice(0, 10).map((f) => {
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
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>No funding rate data</div>
        );

      case 'defi-tvl':
        return defiChains.length > 0 || (defiData?.protocols?.length > 0) ? (
          <div style={{ display: 'grid', gridTemplateColumns: defiData?.protocols?.length ? '1fr 1fr' : '1fr', gap: 8, height: '100%' }}>
            <div className="crypto-mini-table">
              <div style={{ fontSize: 9, opacity: 0.65, marginBottom: 4, textTransform: 'uppercase' }}>Chains</div>
              {defiChains.slice(0, 8).map((d) => (
                <div key={d.chain || d.name} className="crypto-mini-row">
                  <span className="crypto-mini-name">{d.chain || d.name}</span>
                  <span className="crypto-mini-value"><MetricValue value={d.tvl ?? d.tvlB} seriesKey="defiTvl" timestamp={lastUpdated} format={v => `$${(v >= 1 ? v.toFixed(2) : (v * 1e9 / 1e9).toFixed(2))}B`} /></span>
                </div>
              ))}
            </div>
            {Array.isArray(defiData?.protocols) && defiData.protocols.length > 0 && (
              <div className="crypto-mini-table">
                <div style={{ fontSize: 9, opacity: 0.65, marginBottom: 4, textTransform: 'uppercase' }}>Top protocols</div>
                {defiData.protocols.slice(0, 8).map((p) => (
                  <div key={p.name || p.slug} className="crypto-mini-row">
                    <span className="crypto-mini-name">{p.name || p.slug}</span>
                    <span className="crypto-mini-value">
                      <MetricValue
                        value={p.tvlB ?? (p.tvl != null ? p.tvl / 1e9 : null)}
                        seriesKey="defiProtocolTvl"
                        timestamp={lastUpdated}
                        format={(v) => (v != null ? `$${Number(v).toFixed(1)}B` : '—')}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>No DeFi TVL data</div>
        );

      case 'exchanges': {
        const totalVol = (topExchanges || []).reduce((s, e) => s + (Number(e.volume24h) || 0), 0);
        return topExchanges?.length > 0 ? (
          <div className="crypto-mini-table">
            <div className="crypto-mini-row" style={{ fontSize: 9, opacity: 0.65 }}>
              <span className="crypto-mini-name">Exchange</span>
              <span className="crypto-mini-value">BTC vol 24h · share</span>
            </div>
            {topExchanges.slice(0, 10).map((e) => {
              const vol = Number(e.volume24h);
              const share = totalVol > 0 && Number.isFinite(vol) ? (vol / totalVol) * 100 : null;
              return (
                <div key={e.name || e.id} className="crypto-mini-row">
                  <span className="crypto-mini-name">{e.name}</span>
                  <span className="crypto-mini-value">
                    <MetricValue value={vol} seriesKey="topExchanges" timestamp={lastUpdated} format={v => (v != null ? `${v.toFixed(0)} BTC` : '—')} />
                    {share != null && <span style={{ opacity: 0.65, marginLeft: 6, fontSize: 10 }}>{share.toFixed(0)}%</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>Exchange volume loading…</div>
        );
      }

      case 'onchain':
        return onChainData ? (
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
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>No on-chain data</div>
        );

      case 'onchain-chart':
        return onchainChartOption ? (
          <div className="crypto-chart-wrap" style={{ minHeight: 120, flex: 1 }}>
            <SafeECharts option={onchainChartOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'BTC Hashrate', source: 'mempool.space', endpoint: '/api/crypto', series: [], updatedAt: lastUpdated }} />
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>No hashrate history</div>
        );

      case 'stablecoin-composition':
        return <StablecoinCompositionPanel />;

      case 'defi-tvl-trend':
        return <DefiTvlTrendPanel />;

      case 'btc-onchain':
        return <BtcOnChainPanel />;

      default:
        return null;
    }
  }, [
    coinMarketData, fearGreedData, stablecoinMcap, btcDominance, ethGas,
    isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent, coins,
    fgiValue, fgiLabel, fgiOption, fundingRates, defiChains, topExchanges,
    onChainData, onchainChartOption,
  ]);

  const panelCtx = useMemo(() => ({
    __render: renderPanel,
    __live: {
      sidebar: !!isLive,
      'top-cryptos': !!isLive,
      'fear-greed': !!(isLive && fgiValue != null),
      funding: !!(isLive && fundingRates.length > 0),
      'defi-tvl': !!(isLive && defiChains.length > 0),
      exchanges: !!isLive,
      onchain: !!(isLive && onChainData),
      'onchain-chart': !!(isLive && onChainData?.hashrate?.history?.length > 0),
      'stablecoin-composition': stablecoinMcap != null,
      'defi-tvl-trend': !!defiData?.chains?.length,
      'btc-onchain': !!onChainData,
    },
    __subtitle: {
      'fear-greed': fgiValue != null ? `${fgiLabel || '—'} · ${fgiValue}/100` : 'Crypto market sentiment',
      'stablecoin-composition': 'Total market cap and dominance',
      'defi-tvl-trend': 'TVL by chain with 7d change',
      'btc-onchain': 'Hashrate, mempool, difficulty, fees',
    },
    __disabled: {
      funding: fundingRates.length === 0,
      'defi-tvl': defiChains.length === 0,
      onchain: !onChainData,
      'onchain-chart': !onchainChartOption,
    },
    __noFooter: {
      sidebar: true,
    },
    __source: {
      'top-cryptos': 'CoinGecko',
      'fear-greed': 'Alternative.me',
      funding: 'Bybit',
      'defi-tvl': 'DeFi Llama',
      exchanges: 'CoinGecko',
      onchain: 'mempool.space',
      'onchain-chart': 'mempool.space',
      'stablecoin-composition': 'DeFi Llama',
      'defi-tvl-trend': 'DeFi Llama',
      'btc-onchain': 'mempool.space',
    },
  }), [
    renderPanel, isLive, fgiValue, fgiLabel, fundingRates, defiChains,
    onChainData, onchainChartOption, stablecoinMcap, defiData,
  ]);

  return (
    <div className="crypto-dashboard-layout">
      <MarketPanelGrid
        marketId="crypto"
        layout={LAYOUT}
        storageKey="crypto-layout-v4"
        accent="crypto"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
      />
    </div>
  );
}


export default React.memo(CryptoDashboard);
