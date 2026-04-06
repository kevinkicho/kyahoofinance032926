// src/markets/sentiment/SentimentMarket.jsx
import React, { useState } from 'react';
import { useSentimentData } from './data/useSentimentData';
import FearGreed        from './components/FearGreed';
import CftcPositioning  from './components/CftcPositioning';
import RiskDashboard    from './components/RiskDashboard';
import CrossAssetReturns from './components/CrossAssetReturns';
import './SentimentMarket.css';

const SUB_TABS = [
  { id: 'feargreed', label: 'Fear & Greed'       },
  { id: 'cftc',      label: 'CFTC Positioning'   },
  { id: 'risk',      label: 'Risk Dashboard'      },
  { id: 'returns',   label: 'Cross-Asset Returns' },
];

function SentimentMarket() {
  const [activeTab, setActiveTab] = useState('feargreed');
  const { fearGreedData, cftcData, riskData, returnsData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useSentimentData();

  if (isLoading) {
    return (
      <div className="sent-market sent-loading">
        <div className="sent-loading-spinner" />
        <span className="sent-loading-text">Loading sentiment data…</span>
      </div>
    );
  }

  return (
    <div className="sent-market">
      <div className="sent-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`sent-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="sent-status-bar">
        <span className={isLive ? 'sent-status-live' : ''}>
          {isLive ? '● Live · FRED / CFTC / Alternative.me / Yahoo' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="sent-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="sent-content">
        {activeTab === 'feargreed' && <FearGreed        fearGreedData={fearGreedData} />}
        {activeTab === 'cftc'      && <CftcPositioning  cftcData={cftcData} />}
        {activeTab === 'risk'      && <RiskDashboard    riskData={riskData} />}
        {activeTab === 'returns'   && <CrossAssetReturns returnsData={returnsData} />}
      </div>
    </div>
  );
}

export default React.memo(SentimentMarket);
