import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CensusDashboard from './components/CensusDashboard';
import DataFooter from '../../components/DataFooter/DataFooter';
import './CensusMarket.css';

function getCensusProps(centralData) {
  const d = centralData.data || {};
  return {
    series: d.series || {},
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

function CensusMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getCensusProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="census-market">
      <CensusDashboard
        series={props.series}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
      <DataFooter source="US Census Bureau (via FRED)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
    </div>
  );
}

export default React.memo(CensusMarket);