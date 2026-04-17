import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import EiaDashboard from './components/EiaDashboard';
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
      <div className="eia-status-bar">
        <span className={props.isLive ? 'eia-status-live' : ''}>
          {props.isLive ? '● FETCHED · EIA (US Energy Information Administration)' : (props.error ? `○ ${props.error}` : '○ Data source temporarily unavailable')}
        </span>
        {props.lastUpdated && <span>Updated: {props.lastUpdated}</span>}
        {!props.isCurrent && props.fetchedOn && <span className="eia-stale-badge">Stale · fetched {props.fetchedOn}</span>}
      </div>
      <EiaDashboard
        electricity={props.electricity}
        co2Emissions={props.co2Emissions}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(EiaMarket);