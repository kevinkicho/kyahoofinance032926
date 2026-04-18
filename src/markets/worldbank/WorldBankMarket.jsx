import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import WorldBankDashboard from './WorldBankDashboard';
import './WorldBankDashboard.css';

function getWbProps(centralData) {
  const d = centralData.data || {};
  return {
    countries: d.countries,
    trendData: d.trendData,
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

function WorldBankMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getWbProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="wb-market">

      <WorldBankDashboard
        countries={props.countries}
        trendData={props.trendData}
        error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(WorldBankMarket);