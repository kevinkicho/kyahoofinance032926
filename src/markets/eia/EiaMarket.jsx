import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EiaDashboard from './components/EiaDashboard';
import DataFooter from '../../components/DataFooter/DataFooter';
import './EiaMarket.css';

function getEiaProps(centralData) {
  const d = centralData.data || {};
  return {
    electricity: d.electricity || {},
    co2Emissions: d.co2Emissions || {},
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

function EiaMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getEiaProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="eia-market">
      <EiaDashboard
        electricity={props.electricity}
        co2Emissions={props.co2Emissions}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
      <DataFooter source="EIA (US Energy Information Administration)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
    </div>
  );
}

export default React.memo(EiaMarket);