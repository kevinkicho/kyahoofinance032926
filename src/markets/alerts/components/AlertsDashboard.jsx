import React, { useState, useCallback, useMemo } from 'react';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import AlertsSidebar from './AlertsSidebar';
import './AlertsDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const STORAGE_KEY = 'alert-rules-enabled';

const LAYOUT = {
  lg: [
    { i: 'sidebar', x: 0, y: 0, w: 3, h: 4 },
    { i: 'alert-feed', x: 3, y: 0, w: 5, h: 4 },
    { i: 'correlations', x: 8, y: 0, w: 4, h: 4 },
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

function AlertsDashboard({ alerts, rules, onToggleRule, fetchedOn, correlationData, isLive, lastUpdated, error, fetchLog, isCurrent }) {
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

  const rulesByMarket = rules.reduce((acc, r) => {
    if (!acc[r.market]) acc[r.market] = [];
    acc[r.market].push(r);
    return acc;
  }, {});

  const alertCounts = alerts.reduce((acc, a) => {
    acc[a.market] = (acc[a.market] || 0) + 1;
    return acc;
  }, {});

  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const a of alerts) {
      if (counts[a.severity] != null) counts[a.severity]++;
    }
    return counts;
  }, [alerts]);

  const correlationMatrix = useMemo(() => {
    if (!correlationData) return null;
    const assets = ['spx', 'tenYear', 'vix', 'btc', 'gold', 'dxy'];
    const labels = ['S&P', '10Y', 'VIX', 'BTC', 'Gold', 'DXY'];
    const data = [];

    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        const seriesI = correlationData[assets[i]?.history] || [];
        const seriesJ = correlationData[assets[j]?.history] || [];
        
        if (seriesI.length < 2 || seriesJ.length < 2) {
          data.push([i, j, 0]);
          continue;
        }

        const minLen = Math.min(seriesI.length, seriesJ.length);
        const sI = seriesI.slice(-minLen);
        const sJ = seriesJ.slice(-minLen);
        
        const meanI = sI.reduce((a, b) => a + b, 0) / minLen;
        const meanJ = sJ.reduce((a, b) => a + b, 0) / minLen;
        
        let num = 0;
        let denI = 0;
        let denJ = 0;
        
        for (let k = 0; k < minLen; k++) {
          const diffI = sI[k] - meanI;
          const diffJ = sJ[k] - meanJ;
          num += diffI * diffJ;
          denI += diffI * diffI;
          denJ += diffJ * diffJ;
        }
        
        const corr = denI === 0 || denJ === 0 ? 0 : num / Math.sqrt(denI * denJ);
        data.push([i, j, corr]);
      }
    }
    return { data, labels };
  }, [correlationData]);

    return (
      <div className="alerts-dashboard alerts-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="alerts-layout">

        {/* Sidebar — Status Summary + Rule Health */}
        <div key="sidebar" className="alerts-bento-card">
          <div className="alerts-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Status Summary</span>
          </div>
          <div className="alerts-panel-content bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
            <AlertsSidebar 
              alerts={alerts} 
              rules={rules} 
              enabledMap={enabledMap} 
              fetchedOn={fetchedOn} 
              lastUpdated={lastUpdated} 
            />
          </div>
          <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
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

        {/* Correlations Matrix */}
        <div key="correlations" className="alerts-bento-card">
          <div className="alerts-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Cross-Market Correlations</span>
          </div>
          <div className="alerts-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {correlationMatrix ? (
              <SafeECharts
                option={{
                  tooltip: { position: 'top' },
                  grid: { top: '10%', left: '10%', right: '10%', bottom: '10%' },
                  xAxis: {
                    type: 'category',
                    data: correlationMatrix.labels,
                    axisLabel: { color: '#888' }
                  },
                  yAxis: {
                    type: 'category',
                    data: correlationMatrix.labels,
                    axisLabel: { color: '#888' }
                  },
                  visualMap: {
                    min: -1,
                    max: 1,
                    calculable: true,
                    orient: 'horizontal',
                    left: 'center',
                    bottom: '5%',
                    inRange: { color: ['#ef5350', '#fff', '#66bb6a'] }
                  },
                  series: [{
                    name: 'Correlation',
                    type: 'heatmap',
                    data: correlationMatrix.data,
                    label: { show: true, color: '#fff' }
                  }]
                }}
                style={{ height: '100%', width: '100%' }}
              />
            ) : (
              <div className="alerts-empty-state">Loading correlation data...</div>
            )}
          </div>
        </div>

        </BentoWrapper>
      </div>
    );
  }


export default React.memo(AlertsDashboard);