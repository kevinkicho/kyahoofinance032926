// src/markets/sentiment/SentimentMarket.jsx
import React from 'react';
import { useSentimentData } from './data/useSentimentData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import SentimentDashboard from './components/SentimentDashboard';
import './SentimentMarket.css';

/**
 * SentimentMarket - Unified sentiment dashboard
 * Shows all sentiment data in one glanceable view:
 * - Fear & Greed Index, Financial Stress Index
 * - Cross-Asset Returns, Risk Signals, Leverage Metrics
 */
function SentimentMarket({ autoRefresh } = {}) {
  const { fearGreedData, riskData, returnsData, marginDebt, consumerCredit, fsiHistory, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useSentimentData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="sent-market">
      <div className="sent-status-bar">
        <span className={isLive ? 'sent-status-live' : ''}>
          {isLive ? '● Live · FRED / Alternative.me / Yahoo' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="sent-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <SentimentDashboard
        fearGreedData={fearGreedData}
        riskData={riskData}
        returnsData={returnsData}
        marginDebt={marginDebt}
        consumerCredit={consumerCredit}
        fsiHistory={fsiHistory}
      />
    </div>
  );
}

export default React.memo(SentimentMarket);
