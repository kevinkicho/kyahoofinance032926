import React from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import DataFooter from '../../../components/DataFooter/DataFooter';
import './EquitiesDeepDiveDashboard.css';

export default function EquitiesDeepDiveSidebar({ 
  sectorData, factorData, earningsData, shortData, 
  isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent 
}) {
  if (!sectorData?.length && !factorData?.length) return null;

  return (
    <div className="eqd-sidebar">
      <div className="eqd-sidebar-section">
        <div className="eqd-sidebar-title">Sector Performance</div>
        <div className="eqd-sidebar-metrics">
          {sectorData.slice(0, 11).map(s => {
            const change = s.change ?? s.perf1m ?? s.perf1w ?? s.perf1d;
            return (
            <div key={s.name} className="eqd-sidebar-metric-row">
              <span className="eqd-sidebar-label">{s.name}</span>
              <span className="eqd-sidebar-value" style={{ color: (change ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
                <MetricValue 
                  value={change} 
                  format={v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'} 
                  seriesKey={`sector-${s.name}`} 
                  timestamp={lastUpdated} 
                />
              </span>
            </div>
          );})}
        </div>
      </div>

      <div className="eqd-sidebar-section">
        <div className="eqd-sidebar-title">Factor Returns</div>
        <div className="eqd-sidebar-metrics">
          {factorData.map(f => (
            <div key={f.name} className="eqd-sidebar-metric-row">
              <span className="eqd-sidebar-label">{f.name}</span>
              <span className="eqd-sidebar-value" style={{ color: (f.return ?? f.value ?? 0) >= 50 ? '#4ade80' : '#f87171' }}>
                <MetricValue 
                  value={f.return ?? f.value} 
                  format={v => v != null ? v.toFixed(1) : '—'} 
                  seriesKey={`factor-${f.name}`} 
                  timestamp={lastUpdated} 
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="eqd-sidebar-section">
        <div className="eqd-sidebar-title">Earnings Surprise</div>
        <div className="eqd-sidebar-metrics">
          <div className="eqd-sidebar-metric-row">
            <span className="eqd-sidebar-label">Avg Surprise</span>
            <span className="eqd-sidebar-value" style={{ color: earningsData?.avgSurprise >= 0 ? '#4ade80' : '#f87171' }}>
              <MetricValue 
                value={earningsData?.avgSurprise} 
                format={v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'} 
                seriesKey="earnings-surprise" 
                timestamp={lastUpdated} 
              />
            </span>
          </div>
        </div>
      </div>

      <div className="eqd-sidebar-section">
        <div className="eqd-sidebar-title">Short Interest</div>
        <div className="eqd-sidebar-metrics">
          <div className="eqd-sidebar-metric-row">
            <span className="eqd-sidebar-label">Aggregated Short %</span>
            <span className="eqd-sidebar-value" style={{ color: shortData?.aggregateShortPct > 5 ? '#f87171' : '#4ade80' }}>
              <MetricValue 
                value={shortData?.aggregateShortPct} 
                format={v => v != null ? `${v.toFixed(2)}%` : '—'} 
                seriesKey="short-interest" 
                timestamp={lastUpdated} 
              />
            </span>
          </div>
        </div>
      </div>

      <div className="eqd-sidebar-footer">
        <DataFooter 
          source="Yahoo Finance / FactSet" 
          timestamp={lastUpdated} 
          isLive={isLive} 
          fetchLog={fetchLog} 
          error={error} 
          fetchedOn={fetchedOn} 
          isCurrent={isCurrent} 
        />
      </div>
    </div>
  );
}
