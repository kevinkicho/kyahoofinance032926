import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import SentimentDashboard from './components/SentimentDashboard';
import './SentimentMarket.css';

function getSentimentProps(centralData) {
  const d = centralData.data || {};
  return {
    fearGreedData: d.fearGreedData,
    cftcData: d.cftcData,
    riskData: d.riskData,
    returnsData: d.returnsData,
    marginDebt: d.marginDebt,
    consumerCredit: d.consumerCredit,
    vvixHistory: d.vvixHistory,
    fsiHistory: d.fsiHistory,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function SentimentMarket({ centralData } = {}) {
  // Hooks before any early return to keep call order stable across renders.
  const { convert, currentSymbol } = useCurrency();
  const newsCtx = useMarketData('fedNewsSentiment');

  if (!centralData) return <MarketSkeleton />;
  const props = getSentimentProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    // SentimentDashboard already wraps <SentimentSidebar> inside its
    // BentoWrapper as a real grid panel; the loose left-column copy
    // here was a duplicate and is gone, along with the outer two-column
    // grid (`--with-sidebar`).
    <div className="sent-market" role="region" aria-label="Sentiment">
      <div className="sent-market-main">
        <SentimentDashboard
          fearGreedData={props.fearGreedData}
          cftcData={props.cftcData}
          riskData={props.riskData}
          returnsData={props.returnsData}
          marginDebt={props.marginDebt}
          consumerCredit={props.consumerCredit}
          vvixHistory={props.vvixHistory}
          fsiHistory={props.fsiHistory}
          convert={convert}
          currentSymbol={currentSymbol}
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          fetchLog={props.fetchLog}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
          newsSentimentData={newsCtx?.data}
          newsSentimentLastUpdated={newsCtx?.lastUpdated}
        />
      </div>
    </div>
  );
}

export default React.memo(SentimentMarket);
