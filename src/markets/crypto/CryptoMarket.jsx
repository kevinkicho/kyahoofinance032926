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
function CryptoMarket({ autoRefresh } = {}) {
  const { coinMarketData, fearGreedData, defiData, fundingData, onChainData, stablecoinMcap, btcDominance, topExchanges, ethGas, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCryptoData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="crypto-market">
      <div className="crypto-status-bar">
        <span className={isLive ? 'crypto-status-live' : ''}>
          {isLive ? '● Live · CoinGecko / DeFiLlama' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="crypto-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
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
      />
    </div>
  );
}

export default React.memo(CryptoMarket);
