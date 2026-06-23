import React, { useState, useCallback, useEffect } from 'react';
import { useMarketData, useDataContext } from '../../hub/DataContext';
import { MARKET_ENDPOINTS as MARKET_ENDPOINTS_MAP } from '../../hub/DataProvider';
import { apiUrl } from '../../lib/api';
import { PANEL_REGISTRY, TRACEABLE_MARKETS } from '../../data/panelRegistry';
import './PanelTraceInspector.css';

function getFieldByPath(obj, path) {
  if (!path || !obj) return undefined;
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function describeValue(val) {
  if (val === null || val === undefined) return { shape: 'null', count: 0, detail: 'null' };
  if (Array.isArray(val)) return { shape: 'array', count: val.length, detail: `array[${val.length}]` };
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    const nestedArrays = keys.filter(k => Array.isArray(val[k]));
    if (nestedArrays.length > 0) {
      return { shape: 'object_with_arrays', count: keys.length, detail: `{${nestedArrays.map(k => `${k}[${val[k].length}]`).join(', ')}}` };
    }
    return { shape: 'object', count: keys.length, detail: `{${keys.slice(0, 6).join(', ')}${keys.length > 6 ? '...' : ''}}` };
  }
  return { shape: typeof val, count: 1, detail: String(val).substring(0, 80) };
}

function StatusBadge({ status }) {
  const map = {
    ok: { cls: 'pti-ok', label: 'OK' },
    null: { cls: 'pti-null', label: 'NULL' },
    missing: { cls: 'pti-missing', label: 'MISSING' },
    'shape-error': { cls: 'pti-shape-error-badge', label: 'SHAPE' },
    'subfield-null': { cls: 'pti-subfield-badge', label: 'SUBFIELD' },
    error: { cls: 'pti-error', label: 'ERROR' },
    warn: { cls: 'pti-warn', label: 'WARN' },
  };
  const m = map[status] || map.warn;
  return <span className={`pti-badge ${m.cls}`}>{m.label}</span>;
}

function PanelRow({ panel, apiData, ctxData, crossMarketData, expanded, onToggle }) {
  const isCrossMarket = !!panel.crossMarket;

  // Check backend field
  let backendVal = null;
  let backendDesc = { shape: 'null', count: 0, detail: 'not in response' };
  if (isCrossMarket) {
    // For cross-market panels, the data comes from a different endpoint.
    // crossMarketData is fetched by the parent and passed in.
    backendVal = crossMarketData ? getFieldByPath(crossMarketData, panel.fieldPath) : undefined;
    if (backendVal !== undefined) backendDesc = describeValue(backendVal);
  } else if (apiData) {
    backendVal = getFieldByPath(apiData, panel.fieldPath);
    backendDesc = describeValue(backendVal);
  }

  // Check frontend context data (what DataProvider actually has)
  let frontendVal = null;
  let frontendDesc = { shape: 'null', count: 0, detail: 'not loaded' };
  if (ctxData) {
    frontendVal = getFieldByPath(ctxData, panel.fieldPath);
    frontendDesc = describeValue(frontendVal);
  }

  // Run shape check if the panel has one
  let shapeResult = null;
  const checkVal = isCrossMarket ? backendVal : backendVal;
  if (panel.shapeCheck && checkVal !== undefined && checkVal !== null) {
    try {
      shapeResult = panel.shapeCheck(checkVal);
    } catch (e) {
      shapeResult = { ok: false, detail: `shapeCheck error: ${e.message}` };
    }
  }

  // Run sub-field check (inspects array elements for null fields)
  let subFieldResult = null;
  if (panel.subFieldCheck && backendVal != null) {
    try {
      subFieldResult = panel.subFieldCheck(backendVal);
    } catch (e) {
      subFieldResult = { ok: false, detail: `subFieldCheck error: ${e.message}` };
    }
  }

  // Check _sources
  const sources = apiData?._sources || {};
  const sourceKey = Object.keys(sources).find(k =>
    k.toLowerCase().includes(panel.field.toLowerCase().replace('History','').replace('Data','')) ||
    panel.field.toLowerCase().includes(k.toLowerCase().replace(/\s*\(.*\)/,'').split(' ')[0].toLowerCase())
  );
  const sourceValue = sourceKey !== undefined ? sources[sourceKey] : undefined;

  // Determine overall status
  let status = 'ok';
  if (isCrossMarket && !crossMarketData) {
    status = 'missing';
  } else if (backendDesc.shape === 'null') {
    status = 'null';
  } else if (backendDesc.count === 0) {
    status = 'missing';
  } else if (shapeResult && !shapeResult.ok) {
    status = 'shape-error';
  } else if (subFieldResult && !subFieldResult.ok) {
    status = 'subfield-null';
  } else if (sourceKey !== undefined && sourceValue === false) {
    status = 'warn';
  }

  return (
    <>
      <tr className={`pti-row ${expanded ? 'pti-row-expanded' : ''}`} onClick={onToggle}>
        <td className="pti-toggle">{expanded ? '▼' : '▶'}</td>
        <td className="pti-panel-title">{panel.title}</td>
        <td className="pti-field-name">{panel.field}</td>
        <td className="pti-cell">
          {isCrossMarket ? <span className="pti-cross-market">→ {panel.crossMarket}</span> :
            <span className={`pti-shape pti-shape-${backendDesc.shape}`}>{backendDesc.detail}</span>}
        </td>
        <td className="pti-cell">
          {subFieldResult ? (
            <span className={subFieldResult.ok ? 'pti-src-ok' : 'pti-subfield-text'}>
              {subFieldResult.ok ? '✓ subfields' : '✗ subfields'} {subFieldResult.detail.substring(0, 50)}
            </span>
          ) : shapeResult ? (
            <span className={shapeResult.ok ? 'pti-src-ok' : 'pti-shape-error'}>
              {shapeResult.ok ? '✓ shape' : '✗ shape'} {shapeResult.detail.substring(0, 40)}
            </span>
          ) : sourceKey !== undefined ? (
            <span className={sourceValue ? 'pti-src-ok' : 'pti-src-false'}>
              {sourceValue ? '✓' : '✗'} {sourceKey.substring(0, 25)}
            </span>
          ) : <span className="pti-src-none">—</span>}
        </td>
        <td className="pti-cell">
          {!isCrossMarket && frontendDesc.shape !== 'null' ? (
            <span className={`pti-shape pti-shape-${frontendDesc.shape}`}>{frontendDesc.detail}</span>
          ) : <span className="pti-src-none">—</span>}
        </td>
        <td><StatusBadge status={status} /></td>
      </tr>
      {expanded && (
        <tr className="pti-detail-row">
          <td colSpan={7}>
            <div className="pti-detail">
              <div className="pti-detail-section">
                <span className="pti-detail-label">Frontend render check:</span>
                <code className="pti-code">{panel.renderCheck}</code>
              </div>
              {shapeResult && (
                <div className="pti-detail-section">
                  <span className="pti-detail-label">Shape check:</span>
                  <span className={shapeResult.ok ? 'pti-src-ok' : 'pti-shape-error'}>
                    {shapeResult.ok ? '✓' : '✗'} {shapeResult.detail}
                  </span>
                </div>
              )}
              {subFieldResult && (
                <div className="pti-detail-section">
                  <span className="pti-detail-label">Sub-field check:</span>
                  <span className={subFieldResult.ok ? 'pti-src-ok' : 'pti-subfield-text'}>
                    {subFieldResult.ok ? '✓' : '✗'} {subFieldResult.detail}
                  </span>
                </div>
              )}
              {isCrossMarket && (
                <div className="pti-detail-section">
                  <span className="pti-detail-label">Cross-market dep:</span>
                  <code className="pti-code">useMarketData("{panel.crossMarket}")</code>
                </div>
              )}
              <div className="pti-detail-section">
                <span className="pti-detail-label">Backend source:</span>
                <code className="pti-code">{panel.source}</code>
              </div>
              <div className="pti-detail-section">
                <span className="pti-detail-label">External APIs:</span>
                <span>{panel.external.map(e => `${e.name}${e.seriesIds.length ? ` (${e.seriesIds.join(', ')})` : ''}`).join(' · ')}</span>
              </div>
              {panel.renderType && (
                <div className="pti-detail-section">
                  <span className="pti-detail-label">Render type:</span>
                  <span>{panel.renderType}</span>
                </div>
              )}
              {panel.notes && (
                <div className="pti-detail-section pti-notes">
                  <span className="pti-detail-label">Notes:</span>
                  <span>{panel.notes}</span>
                </div>
              )}
              {!isCrossMarket && (
                <div className="pti-detail-section">
                  <span className="pti-detail-label">Backend value sample:</span>
                  <pre className="pti-pre">{JSON.stringify(backendVal, null, 2).substring(0, 500)}</pre>
                </div>
              )}
              <div className="pti-detail-section">
                <span className="pti-detail-label">Frontend context value:</span>
                <pre className="pti-pre">{JSON.stringify(frontendVal, null, 2).substring(0, 500)}</pre>
              </div>
              <div className={`pti-verdict ${status === 'ok' ? 'pti-verdict-ok' : 'pti-verdict-bad'}`}>
                {status === 'ok' && '✓ Data pipeline intact — if panel renders empty, check SafeECharts hasDimensions (container offsetWidth/Height > 0) or stale localStorage layout.'}
                {status === 'null' && '✗ Backend field is null — upstream API call failed and was silently caught. Check server logs for the FRED/external fetch error.'}
                {status === 'missing' && (isCrossMarket
                  ? '✗ Cross-market data not loaded — the DataProvider has not fetched the source market yet, or it failed the structural guard.'
                  : '✗ Backend field has 0 items — upstream API returned empty data. Check if API key is configured or rate limit exhausted.')}
                {status === 'shape-error' && `✗ WRONG DATA SHAPE — field is present but structured incorrectly: ${shapeResult?.detail}. The component expects a different format. Check the normalizer or backend route.`}
                {status === 'subfield-null' && `⚠ SUB-FIELD NULLS — data array has ${subFieldResult?.detail}. The panel will show "—" in those columns. This may be expected (e.g. Yahoo doesn't return fundamentals for recent IPOs) or may indicate the backend isn't fetching all available fields.`}
                {status === 'warn' && '⚠ _sources flag is false — backend marked this source as not received. Panel may show partial/stale data.'}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PanelTraceInspector() {
  const [selectedMarket, setSelectedMarket] = useState('bonds');
  const [apiTrace, setApiTrace] = useState(null);
  const [crossMarketData, setCrossMarketData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPanel, setExpandedPanel] = useState(null);

  const ctx = (() => { try { return useDataContext(); } catch { return null; } })();
  const marketCtx = useMarketData(selectedMarket);

  const panels = PANEL_REGISTRY[selectedMarket] || [];

  // Collect all cross-market dependencies for this market
  const crossMarketDeps = panels.filter(p => p.crossMarket).map(p => p.crossMarket);

  const runTrace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Trace the primary market endpoint
      const url = apiUrl(`/api/analytics/panel-trace/${selectedMarket}`);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setApiTrace(data);

      // 2. Fetch cross-market data for panels that depend on other endpoints
      const crossData = {};
      for (const dep of crossMarketDeps) {
        try {
          const depEndpoint = MARKET_ENDPOINTS_MAP[dep];
          if (depEndpoint) {
            const depRes = await fetch(apiUrl(depEndpoint));
            if (depRes.ok) {
              crossData[dep] = await depRes.json();
            }
          }
        } catch (e) {
          console.warn(`[PanelTrace] cross-market fetch failed for ${dep}:`, e.message);
        }
      }
      setCrossMarketData(crossData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMarket, crossMarketDeps.join(',')]);

  useEffect(() => {
    runTrace();
  }, [runTrace]);

  const apiData = apiTrace;
  const ctxData = marketCtx?.data || null;

  const summary = apiTrace ? {
    total: apiTrace.totalFields || 0,
    null: apiTrace.nullFields?.length || 0,
    populated: apiTrace.populatedFields || 0,
    fetchMs: apiTrace.fetchMs || 0,
    status: apiTrace.status || 0,
  } : null;

  return (
    <div className="panel-trace-inspector">
      <div className="pti-header">
        <select
          className="pti-market-select"
          value={selectedMarket}
          onChange={e => { setSelectedMarket(e.target.value); setExpandedPanel(null); }}
          disabled={loading}
        >
          {TRACEABLE_MARKETS.map(m => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace(/([A-Z])/g, ' $1').trim()}</option>
          ))}
        </select>
        <button className="pti-run-btn" onClick={runTrace} disabled={loading}>
          {loading ? 'Tracing...' : 'Run Trace'}
        </button>
        {summary && (
          <span className="pti-summary">
            {summary.populated}/{summary.total} fields populated · {summary.null} null · {summary.fetchMs}ms · HTTP {summary.status}
          </span>
        )}
        {apiTrace?.error && <span className="pti-error-msg">{apiTrace.error}</span>}
        {error && <span className="pti-error-msg">{error}</span>}
      </div>

      {apiTrace?.nullFields?.length > 0 && (
        <div className="pti-null-banner">
          ⚠ {apiTrace.nullFields.length} null field(s): {apiTrace.nullFields.join(', ')}
        </div>
      )}

      <div className="pti-table-wrap">
        <table className="pti-table">
          <thead>
            <tr>
              <th></th>
              <th>Panel</th>
              <th>Field</th>
              <th>Backend (API)</th>
              <th>_sources</th>
              <th>Frontend (Context)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {panels.map(panel => (
              <PanelRow
                key={panel.id}
                panel={panel}
                apiData={apiData}
                ctxData={ctxData}
                crossMarketData={panel.crossMarket ? crossMarketData[panel.crossMarket] : undefined}
                expanded={expandedPanel === panel.id}
                onToggle={() => setExpandedPanel(expandedPanel === panel.id ? null : panel.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="pti-legend">
        <span className="pti-legend-item"><StatusBadge status="ok" /> Data present and correct</span>
        <span className="pti-legend-item"><StatusBadge status="null" /> Field is null (API call failed)</span>
        <span className="pti-legend-item"><StatusBadge status="missing" /> Field has 0 items</span>
        <span className="pti-legend-item"><StatusBadge status="shape-error" /> Wrong data structure</span>
        <span className="pti-legend-item"><StatusBadge status="subfield-null" /> Array items have null sub-fields</span>
        <span className="pti-legend-item"><StatusBadge status="warn" /> _sources flag is false</span>
      </div>
    </div>
  );
}