import React, { useState, useEffect, useCallback } from 'react';
import BentoWrapper from '../../components/BentoWrapper';
import './AnalyticsDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'server', x: 0, y: 0, w: 3, h: 3 },
    { i: 'source-health', x: 3, y: 0, w: 3, h: 5 },
    { i: 'endpoints', x: 6, y: 0, w: 3, h: 5 },
    { i: 'freshness', x: 9, y: 0, w: 3, h: 5 },
    { i: 'error-log', x: 0, y: 3, w: 3, h: 4 },
    { i: 'mem-cache', x: 3, y: 5, w: 3, h: 3 },
    { i: 'cache-files', x: 6, y: 5, w: 3, h: 3 },
    { i: 'routes', x: 9, y: 5, w: 3, h: 3 },
  ]
};

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function pctBar(pct) {
  const width = Math.min(pct, 100);
  const color = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';
  return (
    <div className="ana-pct-bar-track"><div className="ana-pct-bar-fill" style={{ width: `${width}%`, backgroundColor: color }} /></div>
  );
}

function StatusIcon({ status }) {
  if (status === 'ok') return <span className="ana-dot ana-dot-green" />;
  if (status === 'warning') return <span className="ana-dot ana-dot-yellow" />;
  if (status === 'exhausted') return <span className="ana-dot ana-dot-red" />;
  return <span className="ana-dot ana-dot-gray" />;
}

function Chevron({ open, onClick }) {
  return <span className={`ana-chevron${open ? ' open' : ''}`} onClick={onClick}>&#9654;</span>;
}

function DetailRow({ label, value, mono }) {
  return (
    <div className="ana-detail-row">
      <span className="ana-detail-label">{label}</span>
      <span className={mono ? 'ana-mono' : 'ana-detail-value'}>{value || '—'}</span>
    </div>
  );
}

export default function AnalyticsMarket() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedEp, setExpandedEp] = useState(null);
  const [epDetail, setEpDetail] = useState(null);
  const [expandedMarket, setExpandedMarket] = useState(null);
  const [marketDetail, setMarketDetail] = useState(null);
  const [expandedSource, setExpandedSource] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { throw new Error(`Server returned non-JSON response.`); }
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  const fetchEpDetail = useCallback(async (epPath) => {
    const encoded = encodeURIComponent(epPath.substring(1));
    try {
      const res = await fetch(`/api/analytics/endpoint/${encoded}`);
      if (res.ok) setEpDetail(await res.json());
    } catch {}
  }, []);

  const fetchMarketDetail = useCallback(async (market) => {
    try {
      const res = await fetch(`/api/analytics/cache/${market}`);
      if (res.ok) setMarketDetail(await res.json());
    } catch {}
  }, []);

  const clearMarketCache = useCallback(async (market) => {
    try {
      const res = await fetch(`/api/analytics/cache/${market}`, { method: 'DELETE' });
      if (res.ok) { fetchData(); }
    } catch {}
  }, [fetchData]);

  if (loading) return <div className="ana-market"><div className="ana-loading">Loading analytics...</div></div>;
  if (error) return <div className="ana-market"><div className="ana-error">Error: {error}</div></div>;
  if (!data) return null;

  const sortedEndpoints = [...(data.endpoints || [])].sort((a, b) => b.calls - a.calls);
  const sortedSources = [...(data.apiUsage?.sources || [])].sort((a, b) => b.pct - a.pct);
  const env = data.environment || {};
  const up = data.uptime || {};
  const mc = data.memCache || {};
  const routes = data.routes || [];

  return (
    <div className="ana-market">
      <div className="ana-status-bar">
        <span className="ana-status-live">● Analytics</span>
        <span>Uptime {formatUptime(up.seconds || 0)}</span>
        <span>Heap {up.memoryMB || 0} / {up.heapTotalMB || 0} MB</span>
        <span>RSS {up.rssMB || 0} MB</span>
        <span>MemCache {mc.keyCount || 0} keys ({mc.hitRate || 0}% hit)</span>
        <button className={`ana-refresh-btn${autoRefresh ? ' active' : ''}`} onClick={() => setAutoRefresh(r => !r)}>
          {autoRefresh ? 'Auto 30s' : 'Auto-refresh'}
        </button>
        <button className="ana-refresh-btn" onClick={fetchData}>Refresh</button>
      </div>
      <div className="ana-dashboard ana-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="analytics-layout">

          {/* Server Info */}
          <div key="server" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Server</span>
              <span className="bento-panel-subtitle">PID {env.pid}</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <DetailRow label="Node" value={env.nodeVersion} mono />
              <DetailRow label="Platform" value={`${env.platform} ${env.arch}`} />
              <DetailRow label="CPUs" value={env.cpus} />
              <DetailRow label="Memory" value={`${env.freeMemGB} / ${env.totalMemGB} GB free`} />
              <DetailRow label="Env" value={env.env} />
              <DetailRow label="Host" value={env.hostname} mono />
              <DetailRow label="PID" value={env.pid} mono />
              <DetailRow label="Uptime" value={formatUptime(up.seconds || 0)} />
              <div className="ana-section-divider" />
              <DetailRow label="Heap Used" value={`${up.memoryMB} MB`} />
              <DetailRow label="Heap Total" value={`${up.heapTotalMB} MB`} />
              <DetailRow label="RSS" value={`${up.rssMB} MB`} />
              <DetailRow label="External" value={`${up.externalMB} MB`} />
            </div>
          </div>

          {/* Source Health / Rate Limits */}
          <div key="source-health" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Data Source Health</span>
              <span className="bento-panel-subtitle">{data.apiUsage?.totalExternalCalls || 0} calls today</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              {sortedSources.map(s => (
                <div key={s.name} className="ana-rate-row">
                  <div className="ana-rate-header" onClick={() => setExpandedSource(expandedSource === s.name ? null : s.name)} style={{ cursor: 'pointer' }}>
                    <span className="ana-rate-name"><StatusIcon status={s.used / s.limit > 0.8 ? 'warning' : s.used > 0 ? 'ok' : 'idle'} /> {s.name}</span>
                    <span className="ana-rate-count">{s.used} / {s.limit} ({s.pct}%)</span>
                    <Chevron open={expandedSource === s.name} onClick={() => setExpandedSource(expandedSource === s.name ? null : s.name)} />
                  </div>
                  {pctBar(s.pct)}
                  {expandedSource === s.name && (
                    <div className="ana-expanded-detail">
                      <DetailRow label="Used Today" value={`${s.used} calls`} />
                      <DetailRow label="Daily Limit" value={`${s.limit} calls`} />
                      <DetailRow label="Remaining" value={`${s.remaining} calls`} />
                      <DetailRow label="Usage %" value={`${s.pct}%`} />
                      <DetailRow label="Status" value={s.used / s.limit > 0.8 ? 'WARNING — approaching limit' : s.used > 0 ? 'OK' : 'IDLE — no calls yet'} />
                    </div>
                  )}
                </div>
              ))}
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
                <thead><tr><th></th><th>Route</th><th>Calls</th><th>Avg</th><th>P50</th><th>Max</th><th>Err</th></tr></thead>
                <tbody>
                  {sortedEndpoints.map(ep => (
                    <React.Fragment key={ep.path}>
                      <tr className={expandedEp === ep.path ? 'ana-row-expanded' : 'ana-row-clickable'} onClick={() => { setExpandedEp(expandedEp === ep.path ? null : ep.path); fetchEpDetail(ep.path); }}>
                        <td><Chevron open={expandedEp === ep.path} /></td>
                        <td className="ana-path">{ep.path}</td>
                        <td>{ep.calls}</td>
                        <td>{ep.avgMs}ms</td>
                        <td>{ep.p50Ms || ep.avgMs}ms</td>
                        <td>{ep.maxMs}ms</td>
                        <td className={ep.errors > 0 ? 'ana-err' : ''}>{ep.errors}{ep.errorPct > 0 ? ` (${ep.errorPct}%)` : ''}</td>
                      </tr>
                      {expandedEp === ep.path && (
                        <tr><td colSpan={7}>
                          <div className="ana-expanded-detail">
                            <DetailRow label="Path" value={ep.path} mono />
                            <DetailRow label="Total Calls" value={ep.calls} />
                            <DetailRow label="Avg Response" value={`${ep.avgMs} ms`} />
                            <DetailRow label="Min Response" value={`${ep.minMs ?? ep.avgMs} ms`} />
                            <DetailRow label="Max Response" value={`${ep.maxMs} ms`} />
                            <DetailRow label="P50" value={`${ep.p50Ms || ep.avgMs} ms`} />
                            <DetailRow label="Error Count" value={ep.errors} />
                            <DetailRow label="Last Called" value={ep.lastCalled} mono />
                            {epDetail && epDetail.path === ep.path && epDetail.recentMs?.length > 0 && (
                              <>
                                <div className="ana-section-divider" />
                                <div className="ana-detail-label">Last {epDetail.recentMs.length} response times (ms):</div>
                                <div className="ana-sparkline">{epDetail.recentMs.map((ms, i) => <span key={i} className="ana-spark-bar" style={{ height: `${Math.min(ms / 10, 40)}px` }} title={`${ms}ms`} />)}</div>
                              </>
                            )}
                            {epDetail && epDetail.recentErrors?.length > 0 && (
                              <>
                                <div className="ana-section-divider" />
                                <div className="ana-detail-label">Recent errors:</div>
                                {epDetail.recentErrors.slice(0, 5).map((e, i) => (
                                  <div key={i} className="ana-err-detail">{e.ts} — {e.status} ({e.ms}ms)</div>
                                ))}
                              </>
                            )}
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
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
                <thead><tr><th></th><th></th><th>Market</th><th>Fetched</th><th>Age</th><th>Size</th><th>Keys</th></tr></thead>
                <tbody>
                  {(data.dataFreshness?.markets || []).map(m => (
                    <React.Fragment key={m.market}>
                      <tr className={expandedMarket === m.market ? 'ana-row-expanded' : 'ana-row-clickable'} onClick={() => { setExpandedMarket(expandedMarket === m.market ? null : m.market); fetchMarketDetail(m.market); }}>
                        <td><Chevron open={expandedMarket === m.market} /></td>
                        <td><StatusIcon status={m.isCurrent ? 'ok' : m.fetchedOn ? 'warning' : 'exhausted'} /></td>
                        <td>{m.market}</td>
                        <td className="ana-mono">{m.fetchedOn || '—'}</td>
                        <td>{m.ageHours != null ? `${m.ageHours}h` : '—'}</td>
                        <td>{m.fileSizeKB ? `${m.fileSizeKB}KB` : '—'}</td>
                        <td>{m.keyCount || '—'}</td>
                      </tr>
                      {expandedMarket === m.market && (
                        <tr><td colSpan={7}>
                          <div className="ana-expanded-detail">
                            <DetailRow label="Market" value={m.market} />
                            <DetailRow label="Fetched On" value={m.fetchedOn || 'Never'} mono />
                            <DetailRow label="Is Current" value={m.isCurrent ? 'Yes' : 'No'} />
                            <DetailRow label="Age" value={m.ageHours != null ? `${m.ageHours} hours` : 'N/A'} />
                            <DetailRow label="File Cache" value={m.hasFileCache ? `${m.fileSizeKB || '?'} KB` : 'None'} />
                            <DetailRow label="Memory Cache" value={m.hasMemCache ? 'Yes' : 'No'} />
                            <DetailRow label="Data Keys" value={m.keyCount || 0} />
                            {marketDetail && marketDetail.market === m.market && (
                              <>
                                <div className="ana-section-divider" />
                                <DetailRow label="Cache Size" value={`${marketDetail.dataSize ? Math.round(marketDetail.dataSize / 1024) : '?'} KB`} />
                                <div className="ana-detail-label">Top-level keys:</div>
                                <div className="ana-key-list">{(marketDetail.keys || []).map(k => <span key={k} className="ana-key-chip">{k}</span>)}</div>
                              </>
                            )}
                            <div className="ana-section-divider" />
                            <button className="ana-action-btn" onClick={(e) => { e.stopPropagation(); clearMarketCache(m.market); }}>Clear Cache</button>
                          </div>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Error Log */}
          <div key="error-log" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Error Log</span>
              <span className="bento-panel-subtitle">{(data.errorLog || []).length} entries</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              {(data.errorLog || []).length === 0 && <div className="ana-empty">No errors recorded</div>}
              {(data.errorLog || []).map((e, i) => (
                <div key={i} className="ana-err-entry">
                  <div className="ana-err-header">
                    <span className="ana-err-status">{e.status}</span>
                    <span className="ana-err-method">{e.method}</span>
                    <span className="ana-err-path ana-mono">{e.path}</span>
                  </div>
                  <div className="ana-err-time">{e.timestamp}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Memory Cache */}
          <div key="mem-cache" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Memory Cache</span>
              <span className="bento-panel-subtitle">{mc.keyCount || 0} keys · {mc.hitRate || 0}% hit</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <div className="ana-stat-grid-sm">
                <div className="ana-detail-row"><span className="ana-detail-label">Keys</span><span className="ana-mono">{mc.keyCount}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Hits</span><span className="ana-mono">{mc.hits}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Misses</span><span className="ana-mono">{mc.misses}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Hit Rate</span><span className="ana-mono">{mc.hitRate}%</span></div>
              </div>
              <div className="ana-section-divider" />
              <div className="ana-detail-label">Cache keys:</div>
              <div className="ana-key-list">{(mc.keys || []).map(k => <span key={k} className="ana-key-chip">{k}</span>)}</div>
            </div>
          </div>

          {/* Cache Files */}
          <div key="cache-files" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">File Cache</span>
              <span className="bento-panel-subtitle">{data.cacheFiles?.count || 0} files · {data.cacheFiles?.totalSizeKB || 0} KB</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <table className="ana-table">
                <thead><tr><th>File</th><th>Size</th><th>Modified</th></tr></thead>
                <tbody>
                  {(data.cacheFiles?.files || []).map(f => (
                    <tr key={f.name}><td className="ana-mono">{f.name}</td><td>{f.sizeKB}KB</td><td className="ana-mono">{f.modified ? f.modified.split('T')[0] : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
              {(data.cacheFiles?.files || []).length === 0 && <div className="ana-empty">No cache files</div>}
            </div>
          </div>

          {/* Registered Routes */}
          <div key="routes" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Express Routes</span>
              <span className="bento-panel-subtitle">{routes.length} routes</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <table className="ana-table">
                <thead><tr><th>Method</th><th>Path</th></tr></thead>
                <tbody>
                  {routes.map((r, i) => (
                    <tr key={i}><td className="ana-method-chips">{r.methods.map(m => <span key={m} className={`ana-method-chip ${m.toLowerCase()}`}>{m}</span>)}</td><td className="ana-mono">{r.path}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </BentoWrapper>
      </div>
    </div>
  );
}