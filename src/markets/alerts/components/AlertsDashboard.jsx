// src/markets/alerts/components/AlertsDashboard.jsx
import React from 'react';
import './AlertsDashboard.css';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function AlertsDashboard({ alerts, rules, isLive, fetchedOn, isCurrent }) {
  // Group rules by market for sidebar
  const rulesByMarket = rules.reduce((acc, r) => {
    if (!acc[r.market]) acc[r.market] = [];
    acc[r.market].push(r);
    return acc;
  }, {});

  // Count active alerts per market
  const alertCounts = alerts.reduce((acc, a) => {
    acc[a.market] = (acc[a.market] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="alerts-dashboard">
      {/* Left Sidebar: Alert Rules */}
      <aside className="alerts-sidebar">
        <div className="alerts-sidebar-header">
          <span className="alerts-sidebar-title">Alert Rules</span>
          <span className="alerts-sidebar-count">{rules.length} rules</span>
        </div>
        <div className="alerts-sidebar-content">
          {Object.entries(rulesByMarket).map(([market, marketRules]) => (
            <div key={market} className="alerts-market-group">
              <div className="alerts-market-header">
                <span className="alerts-market-name">{market}</span>
                <span className="alerts-market-count">
                  {marketRules.length} rule{marketRules.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="alerts-rules-list">
                {marketRules.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)).map(rule => {
                  const isActive = alerts.some(a => a.id === rule.id);
                  return (
                    <div
                      key={rule.id}
                      className={`alerts-rule-item ${isActive ? 'active' : ''}`}
                      title={rule.description}
                    >
                      <span className={`alerts-rule-severity ${rule.severity}`} />
                      <span className="alerts-rule-label">{rule.label}</span>
                      {isActive && <span className="alerts-rule-badge" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content: Active Alerts */}
      <main className="alerts-main">
        {/* Status Bar */}
        <div className="alerts-status-bar">
          <span className={isLive ? 'alerts-status-live' : 'alerts-status-offline'}>
            {isLive ? `● Live — Scanning ${rules.length} rules across 6 markets` : '○ Offline — using cached data'}
          </span>
          {alerts.length > 0 && (
            <span className="alerts-alert-count">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} triggered
            </span>
          )}
          {!isCurrent && fetchedOn && (
            <span className="alerts-stale-badge">Stale · fetched {fetchedOn}</span>
          )}
        </div>

        {/* Alert Feed */}
        <div className="alerts-feed-container">
          {alerts.length === 0 ? (
            <div className="alerts-all-clear">
              <div className="alerts-clear-icon">✓</div>
              <div className="alerts-clear-title">All Clear</div>
              <div className="alerts-clear-subtitle">No anomalies detected</div>
              <div className="alerts-clear-detail">All monitored thresholds are within normal ranges</div>
            </div>
          ) : (
            <div className="alerts-feed">
              {alerts.map(alert => (
                <div key={alert.id} className={`alerts-alert-card ${alert.severity}`}>
                  <div className="alerts-alert-header">
                    <span className={`alerts-alert-severity ${alert.severity}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="alerts-alert-market">{alert.market}</span>
                  </div>
                  <div className="alerts-alert-label">{alert.label}</div>
                  <div className="alerts-alert-message">{alert.message}</div>
                  {alert.value != null && (
                    <div className="alerts-alert-value">Value: {alert.value}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="alerts-legend">
          <div className="alerts-legend-item">
            <span className="alerts-legend-dot high" /> High severity
          </div>
          <div className="alerts-legend-item">
            <span className="alerts-legend-dot medium" /> Medium severity
          </div>
          <div className="alerts-legend-item">
            <span className="alerts-legend-dot low" /> Low severity
          </div>
        </div>
      </main>
    </div>
  );
}

export default React.memo(AlertsDashboard);