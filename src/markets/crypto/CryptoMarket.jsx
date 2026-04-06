// src/markets/crypto/CryptoMarket.jsx
import React, { useState } from 'react';
import { useCryptoData } from './data/useCryptoData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CoinMarketOverview    from './components/CoinMarketOverview';
import CycleIndicators       from './components/CycleIndicators';
import DefiChains            from './components/DefiChains';
import FundingAndPositioning from './components/FundingAndPositioning';
import OnChainMetrics from './components/OnChainMetrics';
import './CryptoMarket.css';

const SUB_TABS = [
  { id: 'market',   label: 'Market Overview'       },
  { id: 'cycle',    label: 'Cycle Indicators'       },
  { id: 'defi',     label: 'DeFi & Chains'          },
  { id: 'funding',  label: 'Funding & Positioning'  },
];

function CryptoMarket() {
  const [activeTab, setActiveTab] = useState('market');
  const { coinMarketData, fearGreedData, defiData, fundingData, onChainData, stablecoinMcap, btcDominance, topExchanges, ethGas, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCryptoData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="crypto-market">
      <div className="crypto-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`crypto-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="crypto-status-bar">
        <span className={isLive ? 'crypto-status-live' : ''}>
          {isLive ? '● Live · CoinGecko / DeFiLlama' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="crypto-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="crypto-content">
        {activeTab === 'market'  && <>
          <CoinMarketOverview coinMarketData={coinMarketData} btcDominance={btcDominance} stablecoinMcap={stablecoinMcap} ethGas={ethGas} />
          <OnChainMetrics onChainData={onChainData} topExchanges={topExchanges} />
        </>}
        {activeTab === 'cycle'   && <CycleIndicators       fearGreedData={fearGreedData} />}
        {activeTab === 'defi'    && <DefiChains            defiData={defiData} />}
        {activeTab === 'funding' && <FundingAndPositioning fundingData={fundingData} />}
      </div>
    </div>
  );
}

export default React.memo(CryptoMarket);
