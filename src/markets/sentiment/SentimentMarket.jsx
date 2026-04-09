// src/markets/sentiment/SentimentMarket.jsx
import React from 'react';
import { useSentimentData } from './data/useSentimentData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import SentimentDashboard from './components/SentimentDashboard';
import './SentimentMarket.css';

/**
 * SentimentMarket - Unified sentiment dashboard
 * Shows all sentiment data in one glanceable view:
 * - KPI strip (Fear & Greed, VIX, Put/Call, Margin Debt, Consumer Credit)
 * - Chart grid (Fear & Greed Index, VIX/VVIX, CFTC Positioning, Cross-Asset Returns, Risk Metrics, Leverage)
 */
function SentimentMarket({ autoRefresh } = {}) {
  const { fearGreedData, cftcData, riskData, returnsData, marginDebt, consumerCredit, vvixHistory, fsiHistory, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useSentimentData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="sent-market">
      <div className="sent-status-bar">
        <span className={isLive ? 'sent-status-live' : ''}>
          {isLive ? '● Live · FRED / CFTC / Alternative.me / Yahoo' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="sent-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <SentimentDashboard
        fearGreedData={fearGreedData}
        cftcData={cftcData}
        riskData={riskData}
        returnsData={returnsData}
        marginDebt={marginDebt}
        consumerCredit={consumerCredit}
        vvixHistory={vvixHistory}
        fsiHistory={fsiHistory}
      />
    </div>
  );
}

export default React.memo(SentimentMarket);
