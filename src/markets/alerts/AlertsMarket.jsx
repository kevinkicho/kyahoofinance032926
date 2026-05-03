import React from 'react';
import AlertsDashboard from './components/AlertsDashboard';
import MarketSkeleton from '../../hub/MarketSkeleton';
import DataFooter from '../../components/DataFooter/DataFooter';
import { useCurrency } from '../../hub/CurrencyContext';
import './components/AlertsDashboard.css';
import './AlertsMarket.css';

const ALERT_SOURCES = {
  'vix-spike': ['derivatives', 'sentiment'],
  'curve-inversion': ['bonds'],
  'hy-spread-wide': ['credit'],
  'fear-extreme': ['sentiment'],
  'greed-extreme': ['sentiment'],
  'btc-crash': ['crypto'],
  'gold-rally': ['commodities'],
  'dxy-move': ['fx'],
};

function getAlertsProps(centralData) {
  const d = centralData.data || {};
  const rawAlerts = d.alerts || [];
  const alerts = rawAlerts.map(a => ({
    ...a,
    sources: ALERT_SOURCES[a.id] || [a.market],
  }));
  const rawRules = d.rules || [];
  const rules = rawRules.map(r => ({
    ...r,
    sources: ALERT_SOURCES[r.id] || [r.market],
  }));
  return {
    alerts,
    rules,
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
  const { convert, currentSymbol } = useCurrency();
  if (!centralData) return <MarketSkeleton />;
  const props = getAlertsProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    // The "Severity / Rule Health" bento panel inside AlertsDashboard
    // already wraps <AlertsSidebar>, so the loose left-column copy is gone.
    <div className="alerts-market">
      <div className="alerts-market-main">
        {props.alerts.length > 0 && (
          <span className="alerts-alert-count">
            {props.alerts.length} alert{props.alerts.length !== 1 ? 's' : ''} triggered
          </span>
        )}
        <AlertsDashboard
          convert={convert}
          currentSymbol={currentSymbol}
          alerts={props.alerts}
          rules={props.rules}
          isLive={props.isLive}
          fetchedOn={props.fetchedOn}
          isCurrent={props.isCurrent}
          fetchLog={props.fetchLog}
          onToggleRule={props.refetch}
        />
        <DataFooter source="Multi-market (6 endpoints)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
      </div>
    </div>
  );
}

export default React.memo(AlertsMarket);
