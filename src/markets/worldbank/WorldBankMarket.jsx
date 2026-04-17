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
      <div className="wb-status-bar">
        <span className={props.isLive ? 'wb-status-live' : ''}>
          {props.isLive ? '● FETCHED · World Bank WDI' : '○ No data received'}
        </span>
        {props.lastUpdated && <span>Updated: {props.lastUpdated}</span>}
        {!props.isCurrent && props.fetchedOn && <span className="wb-stale-badge">Stale · fetched {props.fetchedOn}</span>}
      </div>
      <WorldBankDashboard
        countries={props.countries}
        trendData={props.trendData}
        fetchLog={props.fetchLog}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(WorldBankMarket);