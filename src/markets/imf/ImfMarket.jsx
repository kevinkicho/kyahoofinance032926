import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import ImfDashboard from './ImfDashboard';
import './ImfDashboard.css';

function getImfProps(centralData) {
  const d = centralData.data || {};
  return {
    countries: d.countries,
    weoForecasts: d.weoForecasts,
    ifsReserves: d.ifsReserves,
    cofer: d.cofer,
    snapshot: d.snapshot,
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

function ImfMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getImfProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="imf-market">
      <ImfDashboard
        countries={props.countries}
        weoForecasts={props.weoForecasts}
        ifsReserves={props.ifsReserves}
        cofer={props.cofer}
        error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
        fetchLog={props.fetchLog}
        isLive={props.isLive || !!props.snapshot}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(ImfMarket);