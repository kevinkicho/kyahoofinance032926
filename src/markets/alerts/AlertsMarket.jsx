import React from 'react';
import AlertsDashboard from './components/AlertsDashboard';
import MarketSkeleton from '../../hub/MarketSkeleton';
import DataFooter from '../../components/DataFooter/DataFooter';
import './components/AlertsDashboard.css';

function getAlertsProps(centralData) {
  const d = centralData.data || {};
  return {
    alerts: d.alerts || [],
    rules: d.rules || [],
    isLive: centralData.isLive,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    lastUpdated: centralData.lastUpdated,
    refetch: centralData.refetch,
    isLoading: centralData.isLoading,
  };
}

function AlertsMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getAlertsProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="alerts-market">
      {props.alerts.length > 0 && (
        <span className="alerts-alert-count">
          {props.alerts.length} alert{props.alerts.length !== 1 ? 's' : ''} triggered
        </span>
      )}
      <AlertsDashboard
        alerts={props.alerts}
        rules={props.rules}
        isLive={props.isLive}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
        fetchLog={props.fetchLog}
      />
      <DataFooter source="Multi-market (6 endpoints)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
    </div>
  );
}

export default React.memo(AlertsMarket);