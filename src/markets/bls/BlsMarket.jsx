import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import BlsDashboard from './components/BlsDashboard';
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
      <div className="bls-status-bar">
        <span className={props.isLive ? 'bls-status-live' : ''}>
          {props.isLive ? '● FETCHED · Bureau of Labor Statistics' : (props.error ? `○ ${props.error}` : '○ Data source temporarily unavailable')}
        </span>
        {props.lastUpdated && <span>Updated: {props.lastUpdated}</span>}
        {!props.isCurrent && props.fetchedOn && <span className="bls-stale-badge">Stale · fetched {props.fetchedOn}</span>}
      </div>
      <BlsDashboard
        series={props.series}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
      />
    </div>
  );
}

export default React.memo(BlsMarket);