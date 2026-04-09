// src/markets/alerts/AlertsMarket.jsx
import React from 'react';
import { useAlertsData } from './data/useAlertsData';
import AlertsDashboard from './components/AlertsDashboard';
import MarketSkeleton from '../../hub/MarketSkeleton';

function AlertsMarket() {
  const { alerts, rules, isLoading, isLive, fetchedOn, isCurrent } = useAlertsData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <AlertsDashboard
      alerts={alerts}
      rules={rules}
      isLive={isLive}
      fetchedOn={fetchedOn}
      isCurrent={isCurrent}
    />
  );
}

export default React.memo(AlertsMarket);