import React, { useState, useEffect, useCallback } from 'react';
import BentoWrapper from '../../components/BentoWrapper';
import DataFooter from '../../components/DataFooter/DataFooter';
import './AnalyticsDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const FRED_API_KEY = import.meta.env.VITE_FRED_API_KEY || '';

const MARKET_ENDPOINTS = [
  { path: '/api/bonds', label: 'Bonds' },
  { path: '/api/fx', label: 'FX' },
  { path: '/api/commodities', label: 'Commodities' },
  { path: '/api/crypto', label: 'Crypto' },
  { path: '/api/credit', label: 'Credit' },
  { path: '/api/insurance', label: 'Insurance' },
  { path: '/api/realEstate', label: 'Real Estate' },
  { path: '/api/derivatives', label: 'Derivatives' },
  { path: '/api/sentiment', label: 'Sentiment' },
  { path: '/api/calendar', label: 'Calendar' },
  { path: '/api/globalMacro', label: 'Global Macro' },
  { path: '/api/equityDeepDive', label: 'Equity Deep Dive' },
];

function fredVerifyUrl(seriesId) {
  const p = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: '1' });
  return `https://api.stlouisfed.org/fred/series/observations?${p.toString()}`;
}

function fredSeriesPage(seriesId) {
  return `https://fred.stlouisfed.org/series/${seriesId}`;
}

function isFRED(id) {
  return id && /^[A-Z0-9]{3,15}$/.test(id) && !id.startsWith('/');
}

function ProvenanceAudit() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyStates, setVerifyStates] = useState({});
  const [expandedSource, setExpandedSource] = useState(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    const all = [];
    for (const ep of MARKET_ENDPOINTS) {
      try {
        const r = await fetch(ep.path);
        const data = await r.json();
        const sources = data._sources || {};
        const sourceKeys = Object.keys(sources);
        all.push({ ...ep, status: r.status, sources, sourceKeys, error: null });
      } catch (e) {
        all.push({ ...ep, status: 0, sources: {}, sourceKeys: [], error: e.message });
      }
    }
    setResults(all);
    setLoading(false);
  }, []);

  const verifyFRED = useCallback(async (seriesId, sourceKey, marketPath) => {
    const key = `${marketPath}::${sourceKey}::${seriesId}`;
    setVerifyStates(prev => ({ ...prev, [key]: 'checking' }));
    try {
      const r = await fetch(fredVerifyUrl(seriesId));
      const data = await r.json();
      const count = data?.observations?.length || 0;
      const latestVal = data?.observations?.[0]?.value;
      const latestDate = data?.observations?.[0]?.date;
      setVerifyStates(prev => ({
        ...prev,
        [key]: {
          ok: count > 0 && latestVal !== '.',
          count,
          latestVal,
          latestDate,
          url: fredVerifyUrl(seriesId).replace('limit=1', 'limit=5'),
        },
      }));
    } catch {
      setVerifyStates(prev => ({ ...prev, [key]: { ok: false, error: 'Fetch failed' } }));
    }
  }, []);

  const totalSources = results.reduce((a, r) => a + r.sourceKeys.length, 0);
  const receivedSources = results.reduce((a, r) => a + r.sourceKeys.filter(k => r.sources[k]).length, 0);
  const missingSources = totalSources - receivedSources;

  return (
    <div className="ana-prov-audit">
      <div className="ana-prov-header">
        <span className="ana-prov-summary">{totalSources} sources · {receivedSources} received · {missingSources} missing</span>
        <button className="ana-refresh-btn" onClick={runAudit} disabled={loading}>{loading ? 'Auditing...' : 'Run Audit'}</button>
      </div>
      {results.length === 0 && !loading && <div className="ana-empty">Click "Run Audit" to fetch all market endpoints and check provenance</div>}
      {loading && <div className="ana-empty">Fetching endpoints...</div>}
      {results.map(r => (
        <div key={r.path} className="ana-prov-market">
          <div className="ana-prov-market-head">
            <span className="ana-prov-market-label">{r.label}</span>
            <span className="ana-prov-market-path">{r.path}</span>
            <span className={`ana-prov-stat ${r.error ? 'ana-err' : r.sourceKeys.length > 0 ? 'ana-ok' : ''}`}>
              {r.error ? 'ERR' : `${r.sourceKeys.filter(k => r.sources[k]).length}/${r.sourceKeys.length}`}
            </span>
          </div>
          {r.sourceKeys.map(k => {
            const received = r.sources[k];
            const isExpanded = expandedSource === `${r.path}::${k}`;
            return (
              <div key={k} className={`ana-prov-source ${received ? 'ana-ps-ok' : 'ana-ps-miss'}`}>
                <div className="ana-prov-source-row" onClick={() => setExpandedSource(isExpanded ? null : `${r.path}::${k}`)}>
                  <span className="ana-prov-source-name">{k}</span>
                  <span className="ana-prov-source-badge">{received ? '\u2713' : '\u2717'}</span>
                </div>
                {isExpanded && (
                  <div className="ana-prov-source-detail">
                    <div className="ana-prov-detail-row">
                      <span className="ana-dl">Status</span>
                      <span className={received ? 'ana-ok' : 'ana-err'}>{received ? 'Data received' : 'Missing'}</span>
                    </div>
                    <div className="ana-prov-detail-row">
                      <span className="ana-dl">Endpoint</span>
                      <a href={r.path} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ana-prov-link">{r.path}</a>
                    </div>
                    <div className="ana-prov-detail-row">
                      <span className="ana-dl">Verify</span>
                      <span className="ana-prov-verify-text">
                        {received
                          ? 'Click "Verify" on FRED series below to confirm data exists and matches.'
                          : 'Data is missing from this endpoint. Verify FRED series below \u2014 if FRED returns data, the server may have a caching or parsing issue.'}
                      </span>
                    </div>
                    <div className="ana-prov-fred-list">
                      {(getSeriesForSource(r.path, k) || []).map(sid => {
                        const vKey = `${r.path}::${k}::${sid}`;
                        const vs = verifyStates[vKey];
                        return (
                          <div key={sid} className="ana-prov-fred-row">
                            <span className="ana-prov-fred-id">{sid}</span>
                            <a href={fredSeriesPage(sid)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ana-prov-link">Series</a>
                            <a href={fredVerifyUrl(sid).replace('limit=1', 'limit=5')} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ana-prov-link">Fetch JSON</a>
                            <button className="ana-prov-verify-btn" onClick={e => { e.stopPropagation(); verifyFRED(sid, k, r.path); }}>
                              {vs === 'checking' ? '...' : vs?.ok ? '\u2713' : 'Verify'}
                            </button>
                            {vs && vs !== 'checking' && (
                              <span className={`ana-prov-verify-result ${vs.ok ? 'ana-ok' : 'ana-err'}`}>
                                {vs.ok ? `FRED: ${vs.latestVal} (${vs.latestDate}, ${vs.count} obs)` : vs.error || 'No data'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {(!getSeriesForSource(r.path, k) || getSeriesForSource(r.path, k).length === 0) && (
                        <span className="ana-prov-nofred">No FRED series mapped for this source</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const ENDPOINT_SERIES_MAP = {
  '/api/bonds': {
    'US Treasury Yields': ['DGS3MO', 'DGS6MO', 'DGS1', 'DGS2', 'DGS5', 'DGS7', 'DGS10', 'DGS20', 'DGS30'],
    'Spread Indicators': ['T10Y2Y', 'T10Y3M', 'T5Y30'],
    'TIPS Real Yields': ['DFII5', 'DFII10', 'DFII30'],
    'Credit Spreads (IG/HY/EM/BBB)': ['BAMLH0A0HYM2', 'BAMLC0A0CM', 'BAMLEMCBPIOAS'],
    'Breakevens': ['T5YIE', 'T10YIE', 'T5YIFR'],
    'Macro Indicators (Fed BS, M2, Debt, Unemp, GDP)': ['UNRATE', 'GDP', 'PCEPI', 'WALCL', 'M2SL', 'GFDEBTN'],
    'National Debt': ['GFDEBTN'],
    'Treasury Rates': ['TB3MS', 'GS10', 'GS30'],
    'Mortgage Spread': ['MORTGAGE30US'],
    'Curve Spread History': ['T10Y2Y', 'T10Y3M', 'T5Y30'],
    'CPI Components': ['CPIAUCSL', 'CPILFESL'],
    'Debt-to-GDP History': ['GFDEBTN', 'GDP'],
    'Credit Indices (AAA/BAA)': ['AAA', 'BAA'],
  },
  '/api/fx': {
    'fredFxRates': ['DEXUSEU', 'DEXJPUS', 'DEXUSUK', 'DEXSZUS', 'DEXALUS', 'DEXCAUS', 'DTWEXBGS'],
    'reer': [],
    'rateDifferentials': [],
    'dxyHistory': ['DTWEXBGS'],
    'cotHistory': [],
  },
  '/api/commodities': {
    'priceDashboardData': [],
    'futuresCurveData': [],
    'sectorHeatmapData': [],
    'supplyDemandData': [],
    'cotData': [],
    'fredCommodities': ['GOLDAMGBD228NLBM', 'SLVPRUSD', 'PCOPPUSDM', 'POILWTIUSDM', 'POILBREUSDM', 'PNGASUSUSDM'],
    'goldFuturesCurve': [],
    'dbcEtf': [],
  },
  '/api/commodities/v2': {
    'eia': [],
    'fred': ['POILWTIUSDM', 'GOLDAMGBD228NLBM', 'SLVPRUSD', 'PCOPPUSDM', 'POILBREUSDM', 'PNGASUSUSDM'],
    'yahoo': [],
    'worldBank': [],
  },
  '/api/crypto': {
    'coinMarketData': [],
    'fearGreedData': [],
    'defiData': [],
    'fundingData': [],
    'onChainData': [],
    'stablecoinMcap': [],
    'btcDominance': [],
    'topExchanges': [],
    'ethGas': [],
  },
  '/api/credit': {
    'spreadData': ['BAMLH0A0HYM2', 'BAMLC0A0CM'],
    'emBondData': ['BAMLEMCBPIOAS'],
    'loanData': [],
    'defaultData': [],
    'delinquencyRates': ['DRSFRWBS'],
    'lendingStandards': [],
    'commercialPaper': ['CPN3M'],
    'excessReserves': ['EXCSRESNW'],
  },
  '/api/insurance': {
    'combinedRatioData': [],
    'reserveAdequacyData': [],
    'reinsurers': [],
    'hyOAS': ['BAMLH0A0HYM2'],
    'igOAS': ['BAMLC0A0CM'],
    'catBondSpreads': [],
    'fredHyOasHistory': ['BAMLH0A0HYM2'],
    'sectorETF': [],
    'catBondProxy': [],
    'industryAvgCombinedRatio': [],
    'treasury10y': ['DGS10'],
    'catLosses': [],
    'combinedRatioHistory': [],
  },
  '/api/realEstate': {
    'reitData': [],
    'caseShiller': ['CSUSHPISA'],
    'mortgageRates': ['MORTGAGE30US'],
    'housingAffordability': [],
    'homePriceIndex': [],
    'supplyData': ['HOUST'],
    'homeownershipRate': ['RSAHORUS'],
    'rentCpi': ['CPIAUCSL'],
    'reitEtf': [],
    'treasury10y': ['DGS10'],
    'existingHomeSales': ['EXHOSLUS'],
    'rentalVacancy': [],
    'housingStarts': ['HOUST'],
    'medianHomePrice': [],
    'capRateData': [],
    'foreclosureData': [],
    'mbaApplications': [],
    'creDelinquencies': [],
  },
  '/api/derivatives': {
    'vixTermStructure': ['VIXCLS'],
    'vixEnrichment': [],
    'optionsFlow': [],
    'volSurfaceData': [],
    'volPremium': [],
    'fredVixHistory': ['VIXCLS'],
    'putCallRatio': [],
    'skewIndex': ['SKEW'],
    'skewHistory': ['SKEW'],
    'gammaExposure': [],
    'vixPercentile': [],
    'termSpread': [],
  },
  '/api/sentiment': {
    'fearGreedData': [],
    'vixData': ['VIXCLS'],
    'hySpreadData': ['BAMLH0A0HYM2'],
    'igSpreadData': ['BAMLC0A0CM'],
    'yieldCurveData': ['DGS10', 'DGS2'],
    'cftcCot': [],
    'marginDebt': ['ANEDBI'],
    'mutualFundFlows': [],
    'consumerCredit': [],
    'vvixData': [],
    'financialStressIndex': [],
  },
  '/api/calendar': {
    'econEvents': [],
    'centralBankRates': [],
    'earnings': [],
    'fredReleases': [],
    'treasuryAuctions': [],
    'dividends': [],
  },
  '/api/globalMacro': {
    'worldBankIndicators': [],
    'fredRates': ['FEDFUNDS', 'DGS10'],
    'fredRateHistory': ['FEDFUNDS'],
    'fredMacroHistory': ['UNRATE', 'GDP', 'CPIAUCSL', 'M2SL'],
    'oecdCli': [],
    'blsCpi': ['CPIAUCSL', 'CPILFESL'],
  },
  '/api/equityDeepDive': {
    'sectorETFs': [],
    'factorStocks': [],
    'shortInterest': [],
    'equityRiskPremium': [],
    'spPE': ['SP500'],
    'breadthDivergence': [],
    'buffettIndicator': [],
  },
};

function getSeriesForSource(endpointPath, sourceKey) {
  return ENDPOINT_SERIES_MAP[endpointPath]?.[sourceKey] || [];
}

const LAYOUT = {
  lg: [
    { i: 'provenance', x: 0, y: 0, w: 6, h: 6 },
    { i: 'server', x: 6, y: 0, w: 3, h: 3 },
    { i: 'source-health', x: 9, y: 0, w: 3, h: 5 },
    { i: 'endpoints', x: 6, y: 3, w: 3, h: 5 },
    { i: 'freshness', x: 9, y: 5, w: 3, h: 5 },
    { i: 'error-log', x: 0, y: 6, w: 6, h: 3 },
    { i: 'mem-cache', x: 6, y: 8, w: 3, h: 3 },
    { i: 'cache-files', x: 9, y: 10, w: 3, h: 3 },
    { i: 'routes', x: 6, y: 11, w: 3, h: 3 },
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

          {/* Provenance Audit */}
          <div key="provenance" className="ana-bento-card">
            <div className="ana-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Provenance Audit</span>
              <span className="bento-panel-subtitle">Cross-reference _sources with FRED</span>
            </div>
            <div className="bento-panel-content ana-panel-scroll" onMouseDown={stopDrag}>
              <ProvenanceAudit />
            </div>
          </div>

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
                  {(data.cacheFiles?.files || []).map((f, i) => {
                    const name = typeof f === 'string' ? f : f.name;
                    const size = typeof f === 'string' ? null : (f.sizeDisplay || `${f.sizeKB}KB`);
                    const mod = typeof f === 'string' ? null : f.modified;
                    return <tr key={name || i}><td className="ana-mono">{name}</td><td>{size || '—'}</td><td className="ana-mono">{mod ? mod.split('T')[0] : '—'}</td></tr>;
                  })}
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