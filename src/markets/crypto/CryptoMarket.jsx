import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CryptoDashboard from './components/CryptoDashboard';
import CryptoSidebar from './components/CryptoSidebar';
import { useCurrency } from '../../hub/CurrencyContext';
import MetricValue from '../../components/MetricValue/MetricValue';
import SafeECharts from '../../components/SafeECharts/SafeECharts';
import './CryptoMarket.css';

function getCryptoProps(centralData) {
  const d = centralData.data || {};
  return {
    coinMarketData: d.coinMarketData,
    fearGreedData: d.fearGreedData,
    defiData: d.defiData,
    fundingData: d.fundingData,
    onChainData: d.onChainData,
    stablecoinMcap: d.stablecoinMcap,
    btcDominance: d.btcDominance,
    topExchanges: d.topExchanges || [],
    ethGas: d.ethGas,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function CryptoMarket({ centralData } = {}) {
  const { convert, currentSymbol } = useCurrency();
  if (!centralData) return <MarketSkeleton />;
  const props = getCryptoProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  // coinMarketData arrives in two shapes from upstream:
  //   1) flat array of coins (server's own /api/crypto)
  //   2) { coins: [...], globalStats, ... } envelope (CoinGecko-derived)
  // Normalise here so map never blows up.
  const coinList = Array.isArray(props.coinMarketData)
    ? props.coinMarketData
    : (Array.isArray(props.coinMarketData?.coins) ? props.coinMarketData.coins : []);
  const convertedCoins = coinList.map(coin => {
    const price = coin.price ?? coin.current_price ?? 0;
    const marketCap = coin.marketCap ?? coin.market_cap ?? 0;
    return {
      ...coin,
      price: convert(price),
      marketCap: convert(marketCap),
      formattedPrice: `${currentSymbol}${convert(price).toLocaleString()}`,
      formattedMarketCap: `${currentSymbol}${convert(marketCap).toLocaleString()}`,
    };
  });

  return (
    <div className="crypto-market" role="region" aria-label="Crypto">
      <div className="crypto-market-provenance" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>
        <MetricValue value={props.lastUpdated} seriesKey="cryptoLastUpdated" timestamp={props.lastUpdated} format={v => v ? new Date(v).toLocaleString() : '—'} />
        <SafeECharts option={{}} style={{ width: 0, height: 0 }} sourceInfo={{ title: 'Crypto Market', source: 'CoinGecko / DeFi Llama / mempool.space', endpoint: '/api/crypto', series: [], updatedAt: props.lastUpdated }} />
      </div>
      <div className="crypto-market-main">
        <CryptoDashboard
          coinMarketData={convertedCoins}
          fearGreedData={props.fearGreedData}
          defiData={props.defiData}
          fundingData={props.fundingData}
          onChainData={props.onChainData}
          stablecoinMcap={convert(props.stablecoinMcap)}
          btcDominance={props.btcDominance}
          topExchanges={props.topExchanges}
          ethGas={props.ethGas}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
          fetchLog={props.fetchLog}
          error={props.error}
          fetchedOn={props.fetchedOn}
          isCurrent={props.isCurrent}
        />
      </div>
    </div>
  );
}

export default React.memo(CryptoMarket);
