import React from 'react';

function AlertsSidebar({ alerts, rules, enabledMap, fetchedOn }) {
  // Footer belongs on BentoCard — never render DataFooter inside content
  // (that caused the duplicate FETCHED bar under Alert Status).
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safeRules = Array.isArray(rules) ? rules : [];
  const safeEnabled = enabledMap || {};

  const severityCounts = safeAlerts.reduce((acc, a) => {
    if (acc[a.severity] != null) acc[a.severity]++;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  return (
    <div className="alerts-sidebar-content">
      <div className="alerts-sidebar-section">
        <div className="alerts-sidebar-title">Severity</div>
        <div className="alerts-sidebar-group">
          <div className="alerts-sidebar-item">
            <span className="alerts-sidebar-label">High</span>
            <span className="alerts-sidebar-value high">{severityCounts.high}</span>
          </div>
          <div className="alerts-sidebar-item">
            <span className="alerts-sidebar-label">Medium</span>
            <span className="alerts-sidebar-value medium">{severityCounts.medium}</span>
          </div>
          <div className="alerts-sidebar-item">
            <span className="alerts-sidebar-label">Low</span>
            <span className="alerts-sidebar-value low">{severityCounts.low}</span>
          </div>
          <div className="alerts-sidebar-item">
            <span className="alerts-sidebar-label">Evaluated</span>
            <span className="alerts-sidebar-value">{fetchedOn ? new Date(fetchedOn).toLocaleTimeString() : '—'}</span>
          </div>
        </div>
      </div>
      <div className="alerts-sidebar-section" style={{ marginTop: 12, borderBottom: 'none' }}>
        <div className="alerts-sidebar-title">Rule Health</div>
        <div className="alerts-sidebar-group">
          {safeRules.map(r => {
            const isActive = safeAlerts.some(a => a.id === r.id);
            const isEnabled = safeEnabled[r.id] !== false;
            return (
              <div key={r.id} className="alerts-sidebar-rule-status">
                <span className={`alerts-rule-status-dot ${isActive ? 'active' : ''} ${!isEnabled ? 'disabled' : ''}`} />
                <span className="alerts-rule-status-label">{r.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default React.memo(AlertsSidebar);
