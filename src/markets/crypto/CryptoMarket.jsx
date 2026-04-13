// src/markets/crypto/CryptoMarket.jsx
import React from 'react';
import { useCryptoData } from './data/useCryptoData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CryptoDashboard from './components/CryptoDashboard';
import './CryptoMarket.css';

/**
 * CryptoMarket - Unified crypto dashboard
 * Shows all crypto data in one glanceable view:
 * - KPI strip (BTC, ETH, BTC Dominance, Fear/Greed, Stablecoins, ETH Gas)
 * - Chart grid (Top Cryptos, Fear & Greed, DeFi TVL, Funding Rates, On-Chain, Exchanges)
 */
function CryptoMarket({ autoRefresh, refreshKey } = {}) {
  const { coinMarketData, fearGreedData, defiData, fundingData, onChainData, stablecoinMcap, btcDominance, topExchanges, ethGas, isLive, lastUpdated, fetchLog, isLoading, fetchedOn, isCurrent, refetch } = useCryptoData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="crypto-market">
      <CryptoDashboard
        coinMarketData={coinMarketData}
        fearGreedData={fearGreedData}
        defiData={defiData}
        fundingData={fundingData}
        onChainData={onChainData}
        stablecoinMcap={stablecoinMcap}
        btcDominance={btcDominance}
        topExchanges={topExchanges}
        ethGas={ethGas}
        isLive={isLive}
        lastUpdated={lastUpdated}
        fetchLog={fetchLog}
      />
    </div>
  );
}

export default React.memo(CryptoMarket);
