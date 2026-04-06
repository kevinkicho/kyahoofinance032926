// src/markets/alerts/AlertsMarket.jsx
import React, { useState } from 'react';
import { useAlertsData } from './data/useAlertsData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import './AlertsMarket.css';

const SUB_TABS = [
  { id: 'active',  label: 'Active Alerts' },
  { id: 'rules',   label: 'Alert Rules' },
];

const MARKET_ICONS = {
  derivatives: '📊',
  bonds: '🏛️',
  credit: '🏦',
  sentiment: '🎭',
  crypto: '🪙',
  commodities: '🛢️',
  fx: '💱',
};

function ActiveAlerts({ alerts }) {
  if (alerts.length === 0) {
    return (
      <div className="alert-all-clear">
        <span className="alert-all-clear-icon">✅</span>
        <span className="alert-all-clear-text">All clear — no anomalies detected</span>
        <span className="alert-all-clear-sub">All monitored thresholds are within normal ranges</span>
      </div>
    );
  }

  return (
    <div className="alert-feed">
      {alerts.map(a => (
        <div key={a.id} className="alert-card">
          <span className={`alert-severity-badge ${a.severity}`} title={a.severity} />
          <div className="alert-card-body">
            <div className="alert-card-header">
              <span className="alert-card-label">{a.label}</span>
              <span className="alert-card-market">{MARKET_ICONS[a.market] || ''} {a.market}</span>
            </div>
            <div className="alert-card-message">{a.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertRules({ rules }) {
  return (
    <table className="alert-rules-table">
      <thead>
        <tr>
          <th>Rule</th>
          <th>Severity</th>
          <th>Market</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {rules.map(r => (
          <tr key={r.id}>
            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.label}</td>
            <td><span className={`alert-severity-tag ${r.severity}`}>{r.severity}</span></td>
            <td>{MARKET_ICONS[r.market] || ''} {r.market}</td>
            <td>{r.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AlertsMarket() {
  const [activeTab, setActiveTab] = useState('active');
  const { alerts, rules, isLoading, isLive, fetchedOn, isCurrent } = useAlertsData();

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="alert-market">
      <div className="alert-sub-tabs" role="tablist" aria-label="Alert sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`alert-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="alert-status-bar">
        <span className={isLive ? 'alert-status-live' : ''}>
          {isLive ? `● Live — Scanning ${rules.length} rules across 6 markets` : '○ Offline — using cached data'}
        </span>
        {alerts.length > 0 && <span>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} triggered</span>}
        {!isCurrent && fetchedOn && <span className="alert-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="alert-content">
        {activeTab === 'active' && <ActiveAlerts alerts={alerts} />}
        {activeTab === 'rules'  && <AlertRules rules={rules} />}
      </div>
    </div>
  );
}

export default React.memo(AlertsMarket);
