// src/markets/crypto/CryptoMarket.jsx
import React, { useState } from 'react';
import { useCryptoData } from './data/useCryptoData';
import CoinMarketOverview    from './components/CoinMarketOverview';
import CycleIndicators       from './components/CycleIndicators';
import DefiChains            from './components/DefiChains';
import FundingAndPositioning from './components/FundingAndPositioning';
import './CryptoMarket.css';

const SUB_TABS = [
  { id: 'market',   label: 'Market Overview'       },
  { id: 'cycle',    label: 'Cycle Indicators'       },
  { id: 'defi',     label: 'DeFi & Chains'          },
  { id: 'funding',  label: 'Funding & Positioning'  },
];

export default function CryptoMarket() {
  const [activeTab, setActiveTab] = useState('market');
  const { coinMarketData, fearGreedData, defiData, fundingData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCryptoData();

  if (isLoading) {
    return (
      <div className="crypto-market crypto-loading">
        <div className="crypto-loading-spinner" />
        <span className="crypto-loading-text">Loading crypto data…</span>
      </div>
    );
  }

  return (
    <div className="crypto-market">
      <div className="crypto-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
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
        {activeTab === 'market'  && <CoinMarketOverview    coinMarketData={coinMarketData} />}
        {activeTab === 'cycle'   && <CycleIndicators       fearGreedData={fearGreedData} />}
        {activeTab === 'defi'    && <DefiChains            defiData={defiData} />}
        {activeTab === 'funding' && <FundingAndPositioning fundingData={fundingData} />}
      </div>
    </div>
  );
}
