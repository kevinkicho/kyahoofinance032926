import React from 'react';
import BentoWrapper from '../../../components/BentoWrapper';
import './AlertsDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const LAYOUT = {
  lg: [
    { i: 'alert-rules', x: 0, y: 0, w: 3, h: 4 },
    { i: 'alert-feed', x: 3, y: 0, w: 9, h: 4 },
  ]
};

function AlertsDashboard({ alerts, rules }) {
  const rulesByMarket = rules.reduce((acc, r) => {
    if (!acc[r.market]) acc[r.market] = [];
    acc[r.market].push(r);
    return acc;
  }, {});

  const alertCounts = alerts.reduce((acc, a) => {
    acc[a.market] = (acc[a.market] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="alerts-dashboard alerts-dashboard--bento">
      <BentoWrapper layout={LAYOUT} storageKey="alerts-layout">
        {/* Alert Rules */}
        <div key="alert-rules" className="alerts-bento-card">
          <div className="alerts-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Alert Rules</span>
            <span className="bento-panel-subtitle">{rules.length} rules</span>
          </div>
          <div className="alerts-panel-content bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
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
        </div>

        {/* Alert Feed */}
        <div key="alert-feed" className="alerts-bento-card">
          <div className="alerts-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Active Alerts</span>
          </div>
          <div className="alerts-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {alerts.length === 0 ? (
              <div className="alerts-all-clear">
                <div className="alerts-clear-icon">&#x2713;</div>
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
          </div>
        </div>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(AlertsDashboard);