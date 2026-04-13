import React from 'react';
import { useAlertsData } from './data/useAlertsData';
import AlertsDashboard from './components/AlertsDashboard';
import MarketSkeleton from '../../hub/MarketSkeleton';
import './components/AlertsDashboard.css';

function AlertsMarket({ autoRefresh, refreshKey } = {}) {
  const { alerts, rules, isLoading, isLive, fetchedOn, isCurrent, fetchLog, refetch } = useAlertsData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="alerts-market">
      <div className="alerts-status-bar">
        <span className={isLive ? 'alerts-status-live' : ''}>
          {isLive ? `● Live — Scanning ${rules.length} rules across 6 markets` : '○ Offline — using cached data'}
        </span>
        {alerts.length > 0 && (
          <span className="alerts-alert-count">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''} triggered
          </span>
        )}
        {!isCurrent && fetchedOn && <span className="alerts-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <AlertsDashboard
        alerts={alerts}
        rules={rules}
        isLive={isLive}
        fetchedOn={fetchedOn}
        isCurrent={isCurrent}
      />
    </div>
  );
}

export default React.memo(AlertsMarket);