import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import SentimentDashboard from './components/SentimentDashboard';
import { normalizeSentimentData } from '../../data/marketNormalizers';
import './SentimentMarket.css';

function getSentimentProps(centralData) {
  const d = centralData.data || {};
  const normalized = normalizeSentimentData(d);
  return {
    fearGreedData: normalized.values.fearGreedData,
    cftcData: normalized.values.cftcData,
    riskData: normalized.values.riskData,
    returnsData: normalized.values.returnsData,
    marginDebt: d.marginDebt || normalized.series.marginDebt,
    consumerCredit: d.consumerCredit || normalized.series.consumerCredit,
    vvixHistory: normalized.series.vvixHistory,
    fsiHistory: normalized.series.fsiHistory,
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
    normalized,
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
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
          fetchLog={props.fetchLog}
          isLive={props.isLive}
          lastUpdated={props.lastUpdated}
          newsSentimentCtx={newsCtx}
        />
      </div>
    </div>
  );
}

export default React.memo(SentimentMarket);
