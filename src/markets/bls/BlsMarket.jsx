import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BlsDashboard from './components/BlsDashboard';
import DataFooter from '../../components/DataFooter/DataFooter';
import './BlsMarket.css';

function getBlsProps(centralData) {
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

function BlsMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getBlsProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="bls-market">
      <BlsDashboard
        series={props.series}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
      <DataFooter source="Bureau of Labor Statistics (via FRED)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
    </div>
  );
}

export default React.memo(BlsMarket);