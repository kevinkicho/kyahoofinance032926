import React, { useState, useEffect, useCallback } from 'react';
import BentoWrapper from '../../components/BentoWrapper';
import './AnalyticsDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'api-usage', x: 0, y: 0, w: 4, h: 4 },
    { i: 'endpoints', x: 4, y: 0, w: 4, h: 4 },
    { i: 'freshness', x: 8, y: 0, w: 4, h: 4 },
    { i: 'source-limits', x: 0, y: 4, w: 6, h: 3 },
    { i: 'cache-files', x: 6, y: 4, w: 6, h: 3 },
  ]
};

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function pctBar(pct) {
  const width = Math.min(pct, 100);
  const color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';
  return (
    <div className="ana-pct-bar-track">
      <div className="ana-pct-bar-fill" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

function StatusDot({ isCurrent, hasCache }) {
  if (isCurrent) return <span className="ana-dot ana-dot-green" title="Current" />;
  if (hasCache) return <span className="ana-dot ana-dot-yellow" title="Stale" />;
  return <span className="ana-dot ana-dot-red" title="No cache" />;
}

export default function AnalyticsMarket() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON response. The /api/analytics endpoint may not be reachable — try restarting the dev server.`); }
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  if (loading) return <div className="ana-market"><div className="ana-loading">Loading analytics...</div></div>;
  if (error) return <div className="ana-market"><div className="ana-error">Error: {error}</div></div>;
  if (!data) return null;

  const sortedEndpoints = [...(data.endpoints || [])].sort((a, b) => b.calls - a.calls);
  const sortedSources = [...(data.apiUsage?.sources || [])].sort((a, b) => b.pct - a.pct);

  return (
    <div className="ana-market">
      <div className="ana-status-bar">
        <span className="ana-status-live">● Analytics Dashboard</span>
        <span>Uptime: {formatUptime(data.uptime?.seconds || 0)}</span>
        <span>Memory: {data.uptime?.memoryMB || 0} MB</span>
        <button className={`ana-refresh-btn${autoRefresh ? ' active' : ''}`} onClick={() => setAutoRefresh(r => !r)}>
          {autoRefresh ? 'Auto 30s' : 'Auto-refresh'}
        </button>
        <button className="ana-refresh-btn" onClick={fetchData}>Refresh</button>
      </div>
      <div className="ana-dashboard ana-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="analytics-layout">
          {/* API Usage Summary */}
          <div key="api-usage" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">API Usage Today</span>
              <span className="bento-panel-subtitle">{data.apiUsage?.date}</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <div className="ana-stat-grid">
                <div className="ana-stat">
                  <div className="ana-stat-value ana-accent">{data.apiUsage?.totalExternalCalls || 0}</div>
                  <div className="ana-stat-label">Total External Calls</div>
                </div>
                <div className="ana-stat">
                  <div className="ana-stat-value">{data.apiUsage?.sources?.length || 0}</div>
                  <div className="ana-stat-label">Data Sources</div>
                </div>
                <div className="ana-stat">
                  <div className="ana-stat-value">{sortedEndpoints.reduce((s, e) => s + e.calls, 0)}</div>
                  <div className="ana-stat-label">Endpoint Calls</div>
                </div>
                <div className="ana-stat">
                  <div className="ana-stat-value">{sortedEndpoints.reduce((s, e) => s + e.errors, 0)}</div>
                  <div className="ana-stat-label">Errors</div>
                </div>
              </div>
            </div>
          </div>

          {/* Endpoint Metrics */}
          <div key="endpoints" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Endpoint Metrics</span>
              <span className="bento-panel-subtitle">{sortedEndpoints.length} routes</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <table className="ana-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Calls</th>
                    <th>Avg ms</th>
                    <th>Max ms</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEndpoints.map(ep => (
                    <tr key={ep.path}>
                      <td className="ana-path">{ep.path}</td>
                      <td>{ep.calls}</td>
                      <td>{ep.avgMs}</td>
                      <td>{ep.maxMs}</td>
                      <td className={ep.errors > 0 ? 'ana-err' : ''}>{ep.errors} {ep.errorPct > 0 ? `(${ep.errorPct}%)` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Freshness */}
          <div key="freshness" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Data Freshness</span>
              <span className="bento-panel-subtitle">{data.dataFreshness?.currentCount || 0}/{data.dataFreshness?.markets?.length || 0} current</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <table className="ana-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Market</th>
                    <th>Fetched On</th>
                    <th>Age</th>
                    <th>Memory</th>
                    <th>File</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.dataFreshness?.markets || []).map(m => (
                    <tr key={m.market}>
                      <td><StatusDot isCurrent={m.isCurrent} hasCache={!!m.fetchedOn} /></td>
                      <td>{m.market}</td>
                      <td className="ana-mono">{m.fetchedOn || '—'}</td>
                      <td>{m.ageHours != null ? `${m.ageHours}h` : '—'}</td>
                      <td>{m.hasMemCache ? '✓' : '—'}</td>
                      <td>{m.hasFileCache ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rate Limits per Source */}
          <div key="source-limits" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Rate Limit Usage</span>
              <span className="bento-panel-subtitle">{data.apiUsage?.date}</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              {sortedSources.map(s => (
                <div key={s.name} className="ana-rate-row">
                  <div className="ana-rate-header">
                    <span className="ana-rate-name">{s.name}</span>
                    <span className="ana-rate-count">{s.used} / {s.limit} ({s.pct}%)</span>
                  </div>
                  {pctBar(s.pct)}
                </div>
              ))}
            </div>
          </div>

          {/* Cache Files */}
          <div key="cache-files" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Cache Files</span>
              <span className="bento-panel-subtitle">{data.cacheFiles?.count || 0} files · {data.cacheFiles?.totalSizeKB || 0} KB</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <table className="ana-table">
                <thead>
                  <tr>
                    <th>File</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.cacheFiles?.files || []).map(f => (
                    <tr key={f}><td className="ana-mono">{f}</td></tr>
                  ))}
                </tbody>
              </table>
              {(data.cacheFiles?.files || []).length === 0 && <div className="ana-empty">No cache files</div>}
            </div>
          </div>
        </BentoWrapper>
      </div>
    </div>
  );
}