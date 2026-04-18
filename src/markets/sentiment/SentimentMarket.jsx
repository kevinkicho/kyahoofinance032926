import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
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
  if (!centralData) return <MarketSkeleton />;
  const props = getSentimentProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="sent-market">

      <SentimentDashboard
        fearGreedData={props.fearGreedData}
        cftcData={props.cftcData}
        riskData={props.riskData}
        returnsData={props.returnsData}
        marginDebt={props.marginDebt}
        consumerCredit={props.consumerCredit}
        vvixHistory={props.vvixHistory}
        fsiHistory={props.fsiHistory}
        error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(SentimentMarket);
