// src/markets/sentiment/SentimentMarket.jsx
import React, { useState } from 'react';
import { useSentimentData } from './data/useSentimentData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import FearGreed        from './components/FearGreed';
import CftcPositioning  from './components/CftcPositioning';
import RiskDashboard    from './components/RiskDashboard';
import CrossAssetReturns from './components/CrossAssetReturns';
import CorrelationMatrix from './components/CorrelationMatrix';
import './SentimentMarket.css';

const SUB_TABS = [
  { id: 'feargreed',    label: 'Fear & Greed'       },
  { id: 'cftc',         label: 'CFTC Positioning'   },
  { id: 'risk',         label: 'Risk Dashboard'      },
  { id: 'returns',      label: 'Cross-Asset Returns' },
  { id: 'correlation',  label: 'Correlation Matrix'  },
];

function SentimentMarket() {
  const [activeTab, setActiveTab] = useState('feargreed');
  const { fearGreedData, cftcData, riskData, returnsData, marginDebt, consumerCredit, vvixHistory, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useSentimentData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="sent-market">
      <div className="sent-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
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
        {activeTab === 'feargreed' && <FearGreed        fearGreedData={fearGreedData} consumerCredit={consumerCredit} />}
        {activeTab === 'cftc'      && <CftcPositioning  cftcData={cftcData} />}
        {activeTab === 'risk'      && <RiskDashboard    riskData={riskData} marginDebt={marginDebt} vvixHistory={vvixHistory} />}
        {activeTab === 'returns'     && <CrossAssetReturns returnsData={returnsData} />}
        {activeTab === 'correlation' && <CorrelationMatrix returnsData={returnsData} />}
      </div>
    </div>
  );
}

export default React.memo(SentimentMarket);
