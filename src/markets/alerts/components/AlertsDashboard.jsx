import React, { useState, useCallback, useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import AlertsSidebar from './AlertsSidebar';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import './AlertsDashboard.css';

const STORAGE_KEY = 'alert-rules-enabled';

// Keys must match MARKET_PANELS.alerts ids (kpi / active-alerts / alert-rules)
// so panel health can find [data-panel-key] nodes.
const LAYOUT = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 3, h: 4 },
    { i: 'active-alerts', x: 3, y: 0, w: 5, h: 4 },
    { i: 'alert-rules', x: 8, y: 0, w: 4, h: 4 },
  ]
};

function loadEnabled() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveEnabled(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

const FOOTER_SOURCE = 'Multi-market rules · federated';

const ALERT_SERIES = {
  'vix-spike': 'alertVix',
  'curve-inversion': 'alertCurve',
  'hy-spread-wide': 'alertHY',
  'fear-extreme': 'alertFear',
  'greed-extreme': 'alertGreed',
  'btc-crash': 'alertBTC',
  'gold-rally': 'alertGold',
  'dxy-move': 'alertDXY',
};

function AlertsDashboard({
  alerts,
  rules,
  onToggleRule,
  fetchedOn,
  correlationData,
  isLive,
  lastUpdated,
  error,
  fetchLog,
  isCurrent,
}) {
  const initialMap = {};
  const stored = loadEnabled();
  for (const r of rules) {
    initialMap[r.id] = stored && r.id in stored ? stored[r.id] : true;
  }
  const [enabledMap, setEnabledMap] = useState(initialMap);

  const toggleRule = useCallback((ruleId) => {
    setEnabledMap(prev => {
      const next = { ...prev, [ruleId]: !prev[ruleId] };
      saveEnabled(next);
      if (onToggleRule) onToggleRule(ruleId, next[ruleId]);
      return next;
    });
  }, [onToggleRule]);

  const enabledCount = rules.filter(r => enabledMap[r.id] !== false).length;

  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const a of alerts) {
      if (counts[a.severity] != null) counts[a.severity]++;
    }
    return counts;
  }, [alerts]);

  const correlationMatrix = useMemo(() => {
    if (!correlationData) return null;
    const ALL = [
      { key: 'spx',     label: 'S&P' },
      { key: 'tenYear', label: '10Y' },
      { key: 'vix',     label: 'VIX' },
      { key: 'btc',     label: 'BTC' },
      { key: 'gold',    label: 'Gold' },
      { key: 'dxy',     label: 'DXY' },
    ];
    // Drop assets whose history is missing/too short — without this, missing
    // assets paint a row/column of zeros that look like real "uncorrelated"
    // signal. (Earlier bug used `assets[i]?.history` which always returned
    // undefined and made the entire matrix zeros.)
    const present = ALL.filter(a => Array.isArray(correlationData[a.key]?.history) && correlationData[a.key].history.length >= 2);
    if (present.length < 2) return null;

    const labels = present.map(a => a.label);
    const data = [];
    for (let i = 0; i < present.length; i++) {
      const seriesI = correlationData[present[i].key].history;
      for (let j = 0; j < present.length; j++) {
        const seriesJ = correlationData[present[j].key].history;
        const minLen = Math.min(seriesI.length, seriesJ.length);
        const sI = seriesI.slice(-minLen);
        const sJ = seriesJ.slice(-minLen);
        const meanI = sI.reduce((a, b) => a + b, 0) / minLen;
        const meanJ = sJ.reduce((a, b) => a + b, 0) / minLen;
        let num = 0, denI = 0, denJ = 0;
        for (let k = 0; k < minLen; k++) {
          const diffI = sI[k] - meanI;
          const diffJ = sJ[k] - meanJ;
          num += diffI * diffJ;
          denI += diffI * diffI;
          denJ += diffJ * diffJ;
        }
        const corr = denI === 0 || denJ === 0 ? 0 : num / Math.sqrt(denI * denJ);
        data.push([i, j, Math.round(corr * 100) / 100]);
      }
    }
    return { data, labels };
  }, [correlationData]);

  const panelLive = !!(isLive || rules.length > 0);

  const renderPanel = useCallback((panelId) => {
    switch (panelId) {
      case 'kpi':
        return (
          <div data-panel-bound="1" data-panel-live="1">
            <div className="alerts-status-kpis" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <div className="bonds-kpi-pill" style={{ minWidth: 88 }}>
                <span className="bonds-kpi-label">Active</span>
                <span className="bonds-kpi-value accent">
                  <MetricValue value={alerts.length} seriesKey="alertActive" format={(v) => String(Math.round(v))} />
                </span>
              </div>
              <div className="bonds-kpi-pill" style={{ minWidth: 88 }}>
                <span className="bonds-kpi-label">Rules</span>
                <span className="bonds-kpi-value">
                  <MetricValue value={enabledCount} seriesKey="alertRules" format={(v) => String(Math.round(v))} />
                  <span style={{ fontSize: 11, opacity: 0.7 }}>/{rules.length}</span>
                </span>
              </div>
              <div className="bonds-kpi-pill" style={{ minWidth: 88 }}>
                <span className="bonds-kpi-label">High</span>
                <span className="bonds-kpi-value" style={{ color: severityCounts.high ? '#f87171' : undefined }}>
                  <MetricValue value={severityCounts.high} seriesKey="alertHigh" format={(v) => String(Math.round(v))} />
                </span>
              </div>
            </div>
            <AlertsSidebar
              alerts={alerts}
              rules={rules}
              enabledMap={enabledMap}
              fetchedOn={fetchedOn}
            />
          </div>
        );

      case 'active-alerts':
        return (
          <div data-panel-bound="1" data-panel-live="1">
            {alerts.length === 0 ? (
              <div className="alerts-all-clear">
                <div className="alerts-clear-icon">&#x2713;</div>
                <div className="alerts-clear-title">All Clear</div>
                <div className="alerts-clear-subtitle">
                  <MetricValue value={0} seriesKey="alertActive" format={() => '0'} /> anomalies ·{' '}
                  <MetricValue value={enabledCount} seriesKey="alertRules" format={(v) => String(Math.round(v))} /> rules online
                </div>
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
                      <div className="alerts-alert-value">Value: <MetricValue seriesKey={ALERT_SERIES[alert.id]} value={alert.value} /></div>
                    )}
                    {alert.sources && alert.sources.length > 0 && (
                      <div className="alerts-alert-sources">
                        {alert.sources.map(s => (
                          <span key={s} className="alerts-source-badge">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="alerts-legend">
              <div className="alerts-legend-item">
                <i className="alerts-legend-dot high" /> High severity
              </div>
              <div className="alerts-legend-item">
                <i className="alerts-legend-dot medium" /> Medium severity
              </div>
              <div className="alerts-legend-item">
                <i className="alerts-legend-dot low" /> Low severity
              </div>
            </div>
          </div>
        );

      case 'alert-rules':
        return (
          <div data-panel-bound="1" data-panel-live="1" style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', minHeight: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <MetricValue value={enabledCount} seriesKey="alertRules" format={(v) => String(Math.round(v))} />
              {' / '}
              <MetricValue value={rules.length} seriesKey="alertRulesTotal" format={(v) => String(Math.round(v))} />
              {' rules enabled'}
            </div>
            <div className="alerts-rules-list" style={{ overflow: 'auto', flex: '0 0 auto', maxHeight: '42%' }}>
              {rules.map((r) => {
                const on = enabledMap[r.id] !== false;
                return (
                  <div key={r.id} className="alerts-sidebar-rule-status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                    <button
                      type="button"
                      onClick={() => toggleRule(r.id)}
                      style={{
                        border: 'none',
                        background: on ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.15)',
                        color: on ? '#4ade80' : 'var(--text-muted)',
                        borderRadius: 4,
                        fontSize: 10,
                        padding: '2px 6px',
                        cursor: 'pointer',
                      }}
                    >
                      {on ? 'ON' : 'OFF'}
                    </button>
                    <span style={{ fontSize: 12, flex: 1 }}>{r.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.severity}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>Cross-Market Correlations</div>
            <div style={{ flex: 1, minHeight: 120 }}>
              {correlationMatrix ? (
                <SafeECharts
                  option={{
                    tooltip: { position: 'top' },
                    grid: { top: '8%', left: '12%', right: '4%', bottom: '18%' },
                    xAxis: {
                      type: 'category',
                      data: correlationMatrix.labels,
                      axisLabel: { color: '#888', fontSize: 10 },
                    },
                    yAxis: {
                      type: 'category',
                      data: correlationMatrix.labels,
                      axisLabel: { color: '#888', fontSize: 10 },
                    },
                    visualMap: {
                      min: -1,
                      max: 1,
                      calculable: true,
                      orient: 'horizontal',
                      left: 'center',
                      bottom: '2%',
                      textStyle: { color: '#888', fontSize: 9 },
                      inRange: { color: ['#ef5350', '#fff', '#66bb6a'] },
                    },
                    series: [{
                      name: 'Correlation',
                      type: 'heatmap',
                      data: correlationMatrix.data,
                      label: { show: true, color: '#111', fontSize: 9 },
                    }],
                  }}
                  style={{ height: '100%', width: '100%' }}
                />
              ) : (
                <div className="alerts-empty-state">Loading correlation data…</div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  }, [
    alerts, enabledCount, rules, severityCounts, enabledMap, fetchedOn,
    correlationMatrix, toggleRule,
  ]);

  const panelCtx = useMemo(() => ({
    __render: renderPanel,
    __live: {
      kpi: panelLive,
      'active-alerts': panelLive,
      'alert-rules': panelLive,
    },
    __source: {
      kpi: FOOTER_SOURCE,
      'active-alerts': FOOTER_SOURCE,
      'alert-rules': FOOTER_SOURCE,
    },
  }), [renderPanel, panelLive]);

  return (
    <div className="alerts-dashboard alerts-dashboard--bento">
      <MarketPanelGrid
        marketId="alerts"
        layout={LAYOUT}
        storageKey="alerts-layout-v3"
        accent="alerts"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
      />
    </div>
  );
}


export default React.memo(AlertsDashboard);
