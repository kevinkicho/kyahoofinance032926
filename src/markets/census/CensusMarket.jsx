import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CensusDashboard from './components/CensusDashboard';
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
      <div className="census-status-bar">
        <span className={props.isLive ? 'census-status-live' : ''}>
          {props.isLive ? '● FETCHED · US Census Bureau (via FRED)' : (props.error ? `○ ${props.error}` : '○ Data source temporarily unavailable')}
        </span>
        {props.lastUpdated && <span>Updated: {props.lastUpdated}</span>}
        {!props.isCurrent && props.fetchedOn && <span className="census-stale-badge">Stale · fetched {props.fetchedOn}</span>}
      </div>
      <CensusDashboard
        series={props.series}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(CensusMarket);