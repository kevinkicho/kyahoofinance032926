import React, { useState, useEffect, useCallback } from 'react';
import { api, apiUrl } from '../../lib/api';
import BentoWrapper from '../../components/BentoWrapper';
import BentoCard from '../../components/BentoCard/BentoCard';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import { useMarketData, useDataContext } from '../../hub/DataContext';
import { auth } from '../../lib/firebase';
import PanelTraceInspector from './PanelTraceInspector';
import DataFooter from '../../components/DataFooter/DataFooter';
import { PANEL_REGISTRY, TRACEABLE_MARKETS } from '../../data/panelRegistry';
import { MARKETS } from '../../hub/markets.config';
import './AnalyticsDashboard.css';

// Helper to load analytics snapshot from RTDB (written by daily scheduled refresher).
// This makes rich analytics / rate-limit / cache results persistent and debuggable
// without requiring live Functions calls every time.
// Now accepts optional date to load a historical entry (for date-aware views).
async function loadAnalyticsFromRTDB(date = null) {
  try {
    const suffix = date ? `history/${date}` : 'latest';
    const res = await fetch(`https://kfinance032926-default-rtdb.firebaseio.com/marketSnapshots/analytics/${suffix}.json`);
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload && payload.data) {
      return { data: payload.data, fetchedAt: payload.fetchedAt, source: 'rtdb' };
    }
    return null;
  } catch {
    return null;
  }
}

async function loadDiagnosticsReport(date = null) {
  try {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return await api.get(`/api/admin/diagnostics-report${qs}`);
  } catch {
    return null;
  }
}


const FRED_API_BASE = apiUrl('/api/fred/observations');

import { MARKET_ENDPOINTS as MARKET_ENDPOINTS_MAP } from '../../hub/DataProvider';

const MARKET_ENDPOINTS = Object.entries(MARKET_ENDPOINTS_MAP).map(([id, path]) => ({
  id,
  path,
  label: id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1').trim(),
}));

function fredVerifyUrl(seriesId) {
  const p = new URLSearchParams({ series_id: seriesId, file_type: 'json', sort_order: 'desc', limit: '1' });
  return `${FRED_API_BASE}?${p.toString()}`;
}

function fredSeriesPage(seriesId) {
  return `https://fred.stlouisfed.org/series/${seriesId}`;
}

function isFRED(id) {
  return id && /^[A-Z0-9]{3,15}$/.test(id) && !id.startsWith('/');
}

function useIsAdminUser() {
  const [user, setUser] = useState(() => auth?.currentUser || null);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => setAdminEmail(data.adminEmail || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!auth) return undefined;
    return auth.onAuthStateChanged(setUser);
  }, []);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  return isLocalhost || (user?.email && adminEmail && user.email === adminEmail);
}

// Persist audit history so it can be inspected later (we keep the last
// AUDIT_HISTORY_MAX runs). Each entry is a {ranAt, results} record. The
// most recent audit is restored on mount so the panel stops showing the
// "Click Run Audit" empty state across reloads.
const AUDIT_HISTORY_KEY = 'analytics-prov-audit-history-v1';
const AUDIT_HISTORY_MAX = 10;

function loadAuditHistory() {
  try {
    const raw = localStorage.getItem(AUDIT_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveAuditHistory(history) {
  try { localStorage.setItem(AUDIT_HISTORY_KEY, JSON.stringify(history.slice(0, AUDIT_HISTORY_MAX))); }
  catch (e) { console.warn('[ProvenanceAudit] localStorage save failed:', e?.message); }
}

const OPTIONAL_PROVENANCE_KEYS = new Set([
  'ECB Yield Curve',
  'bisCreditToGDP',
  'buffettIndicator',
  'catLosses',
  'censusTrade',
  'delinquencyRates_DRSFRWBS',
  'econdb',
  'econEventsFallback',
  'equityRiskPremium',
  'ethGas',
  'fredReleasesFallback',
  'gammaExposure',
  'imfReserves',
  'imfWEO',
  'industryAvgCombinedRatio',
  'insiderTrading',
  'nyfedPrimaryDealers',
  'reinsurancePricing',
  'skewHistory',
  'spPE',
  'yahooFinance',
]);

export function getSourceAuditState(endpointPath, sourceKey, value) {
  if (value) {
    return {
      kind: 'ok',
      className: 'ana-ps-ok',
      badge: '\u2713',
      status: 'Data received',
      detail: 'Data received from this source for the selected snapshot.',
    };
  }

  if (sourceKey.endsWith('Fallback')) {
    return {
      kind: 'optional',
      className: 'ana-ps-optional',
      badge: '-',
      status: 'Fallback not used',
      detail: 'This is a fallback marker. False means the primary source was used, so it is not a data failure.',
    };
  }

  if (
    OPTIONAL_PROVENANCE_KEYS.has(sourceKey) ||
    OPTIONAL_PROVENANCE_KEYS.has(`${endpointPath}::${sourceKey}`) ||
    sourceKey.startsWith('imfWEO_') ||
    sourceKey.endsWith('_synthetic')
  ) {
    return {
      kind: 'optional',
      className: 'ana-ps-optional',
      badge: '-',
      status: 'Optional source unavailable',
      detail: 'This source is optional, provider-limited, synthetic, or only populated for specific request modes. It is not counted as a hard failure.',
    };
  }

  return {
    kind: 'missing',
    className: 'ana-ps-miss',
    badge: '\u2717',
    status: 'Missing',
    detail: 'Required source data is missing from this endpoint for the selected snapshot.',
  };
}

export function countSourcesByState(row, kind) {
  return row.sourceKeys.filter(k => getSourceAuditState(row.path, k, row.sources[k]).kind === kind).length;
}

function ProvenanceAudit({ defaultDate = null, availableDates = null, onDateChange = null }) {
  const ctx = (() => { try { return useDataContext(); } catch { return null; } })();
  const isAdmin = useIsAdminUser();
  const globalHistorical = ctx?.historicalDate || null;
  const listDates = ctx?.listSnapshotDates || (async () => []);

  const initialHistory = typeof window !== 'undefined' ? loadAuditHistory() : [];
  const [results, setResults] = useState(initialHistory[0]?.results || []);
  const [loading, setLoading] = useState(false);
  const [verifyStates, setVerifyStates] = useState({});
  const [expandedSource, setExpandedSource] = useState(null);
  const [history, setHistory] = useState(initialHistory);
  const lastRanAt = history[0]?.ranAt || null;

  // Local audit date (for this panel) — falls back to global historicalDate when present.
  const [auditDate, setAuditDate] = useState(defaultDate || globalHistorical || null);
  const [auditDates, setAuditDates] = useState(Array.isArray(availableDates) ? availableDates : []);
  useEffect(() => {
    if (defaultDate) setAuditDate(defaultDate);
  }, [defaultDate]);
  // If global changes and we don't have a local override, follow it for convenience.
  useEffect(() => {
    if (!defaultDate && globalHistorical) setAuditDate(globalHistorical);
  }, [globalHistorical, defaultDate]);

  // Load date list for the audit picker (if not provided by parent)
  useEffect(() => {
    if (availableDates && availableDates.length) { setAuditDates(availableDates); return; }
    let alive = true;
    listDates('bonds').then(ds => { if (alive && ds?.length) setAuditDates(ds); }).catch(()=>{});
    return () => { alive = false; };
  }, [listDates, availableDates]);

  const runAudit = useCallback(async (forceLive = false, explicitDate = null) => {
    setLoading(true);
    const targetDate = explicitDate || auditDate || globalHistorical || null;
    const all = [];
    for (const ep of MARKET_ENDPOINTS) {
      let usedSnapshot = false;
      if (!forceLive) {
        try {
          // Leverage RTDB snapshot (populated by the daily scheduled refresher).
          // Now date-aware: when a historical date is selected (global or local to audit),
          // fetch /history/{date}.json instead of /latest so audit reflects that day's data.
          const suffix = targetDate ? `history/${targetDate}` : 'latest';
          const snapUrl = `https://kfinance032926-default-rtdb.firebaseio.com/marketSnapshots/${ep.id}/${suffix}.json`;
          const r = await fetch(snapUrl);
          if (r.ok) {
            const snap = await r.json();
            if (!snap?.data) throw new Error('No RTDB snapshot data');
            const data = snap?.data || {};
            const sources = data._sources || {};
            const sourceKeys = Object.keys(sources);
            all.push({
              ...ep,
              status: 200,
              sources,
              sourceKeys,
              error: null,
              fromSnapshot: snap?.fetchedAt || (targetDate ? `RTDB ${targetDate}` : 'latest RTDB snapshot'),
            });
            usedSnapshot = true;
          }
        } catch {}
      }
      if (!usedSnapshot) {
        // Fallback to live (use apiUrl to ensure correct host even on GH Pages)
        try {
          const url = apiUrl(ep.path);
          const r = await fetch(url);
          const data = await r.json().catch(() => ({}));
          const sources = data._sources || {};
          const sourceKeys = Object.keys(sources);
          all.push({ ...ep, status: r.status, sources, sourceKeys, error: null });
        } catch (e) {
          all.push({ ...ep, status: 0, sources: {}, sourceKeys: [], error: e.message });
        }
      }
    }
    setResults(all);
    setLoading(false);
    // Persist this audit to local history (most recent first, capped to MAX).
    // For wider backend persistence/debugging, the source data is already in RTDB snapshots.
    // Future enhancement: write audit results to RTDB under /auditHistory if write rules allow.
    const entry = { ranAt: new Date().toISOString(), results: all, date: targetDate || 'live' };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, AUDIT_HISTORY_MAX);
      saveAuditHistory(next);
      return next;
    });
  }, [auditDate, globalHistorical]);

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
  const receivedSources = results.reduce((a, r) => a + countSourcesByState(r, 'ok'), 0);
  const optionalSources = results.reduce((a, r) => a + countSourcesByState(r, 'optional'), 0);
  const missingSources = results.reduce((a, r) => a + countSourcesByState(r, 'missing'), 0);

  const effectiveAuditDate = auditDate || globalHistorical || null;
  const handleAuditRun = (force) => {
    if (force && !isAdmin) return;
    runAudit(force);
  };
  const handleAuditDateChange = (e) => {
    const v = e.target.value || null;
    setAuditDate(v);
    if (onDateChange) onDateChange(v);
    // Auto re-run non-live audit for the newly chosen date so results match selection.
    // User can still Force Live.
    if (!loading) {
      // slight delay so state settles; run with explicit to be sure
      setTimeout(() => runAudit(false, v), 0);
    }
  };

  return (
    <div className="ana-prov-audit">
      <div className="ana-prov-header">
        <span className="ana-prov-summary">
          {totalSources} sources · {receivedSources} received · {optionalSources} optional · {missingSources} missing
          {effectiveAuditDate && <span style={{ marginLeft: 6, color: '#f59e0b' }}>· {effectiveAuditDate}</span>}
          {lastRanAt && (
            <span style={{ marginLeft: 8, opacity: 0.6, fontSize: 11 }}>
              · last run {new Date(lastRanAt).toLocaleString()}
              {history.length > 1 && ` (${history.length} stored)`}
            </span>
          )}
        </span>

        {/* Date-aware controls for the audit */}
        <select
          className="ana-hist-select"
          value={auditDate || ''}
          onChange={handleAuditDateChange}
          disabled={loading}
          title="Audit a specific historical RTDB snapshot (or follow global History picker)"
        >
          <option value="">(global / latest)</option>
          {auditDates.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <button className="ana-refresh-btn" onClick={() => handleAuditRun(false)} disabled={loading}>{loading ? 'Auditing...' : (effectiveAuditDate ? `Audit ${effectiveAuditDate}` : 'Run Audit (RTDB snapshots)')}</button>
        <button
          className="ana-refresh-btn"
          onClick={() => handleAuditRun(true)}
          disabled={loading || !isAdmin}
          title={isAdmin ? 'Bypass RTDB and query live endpoints' : 'Admin sign-in required'}
        >
          Force Live Audit
        </button>
      </div>
      {results.length === 0 && !loading && <div className="ana-empty">Click audit button to analyze provenance from RTDB snapshots for the selected date (or latest). The picker lets you audit a past day's data. "Force Live" bypasses RTDB.</div>}
      {loading && <div className="ana-empty">Fetching endpoints...</div>}
      {results.map(r => (
        <div key={r.path} className="ana-prov-market">
          <div className="ana-prov-market-head">
            <span className="ana-prov-market-label">{r.label}</span>
            <span className="ana-prov-market-path">{r.path}</span>
            <span className={`ana-prov-stat ${r.error || countSourcesByState(r, 'missing') > 0 ? 'ana-err' : r.sourceKeys.length > 0 ? 'ana-ok' : ''}`}>
              {r.error ? 'ERR' : `${countSourcesByState(r, 'ok')} received`}
              {!r.error && countSourcesByState(r, 'optional') > 0 && (
                <span className="ana-prov-optional-note"> · {countSourcesByState(r, 'optional')} optional</span>
              )}
              {!r.error && countSourcesByState(r, 'missing') > 0 && (
                <span className="ana-prov-required-missing"> · {countSourcesByState(r, 'missing')} required missing</span>
              )}
              {r.fromSnapshot && <span style={{fontSize: '9px', marginLeft: '4px', opacity: 0.7}}>(snapshot)</span>}
            </span>
          </div>
          {r.sourceKeys.map(k => {
            const auditState = getSourceAuditState(r.path, k, r.sources[k]);
            const isExpanded = expandedSource === `${r.path}::${k}`;
            return (
              <div key={k} className={`ana-prov-source ${auditState.className}`}>
                <div className="ana-prov-source-row" onClick={() => setExpandedSource(isExpanded ? null : `${r.path}::${k}`)}>
                  <span className="ana-prov-source-name">{k}</span>
                  <span className="ana-prov-source-badge">{auditState.badge}</span>
                </div>
                {isExpanded && (
                  <div className="ana-prov-source-detail">
                    <div className="ana-prov-detail-row">
                      <span className="ana-dl">Status</span>
                      <span className={`ana-source-state-text ${auditState.className}`}>{auditState.status}</span>
                    </div>
                    <div className="ana-prov-detail-row">
                      <span className="ana-dl">Endpoint</span>
                      <a href={r.path} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="ana-prov-link">{r.path}</a>
                    </div>
                    <div className="ana-prov-detail-row">
                      <span className="ana-dl">Verify</span>
                      <span className="ana-prov-verify-text">
                        {auditState.kind === 'ok'
                          ? 'Click "Verify" on FRED series below to confirm data exists and matches.'
                          : auditState.detail}
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
  '/api/commoditiesEnhanced': {
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

// KPI strip is now a real bento child at row 0 (h:2). Other panels
// shifted down 2 rows.
const LAYOUT = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
    { i: 'provenance', x: 0, y: 2, w: 6, h: 6 },
    { i: 'server', x: 6, y: 2, w: 3, h: 3 },
    { i: 'api-usage', x: 9, y: 2, w: 3, h: 3 },
    { i: 'source-health', x: 9, y: 5, w: 3, h: 5 },
    { i: 'endpoints', x: 6, y: 5, w: 3, h: 5 },
    { i: 'freshness', x: 9, y: 10, w: 3, h: 5 },
    { i: 'error-log', x: 0, y: 8, w: 6, h: 3 },
    { i: 'diagnostics', x: 0, y: 11, w: 6, h: 5 },
    { i: 'mem-cache', x: 6, y: 10, w: 3, h: 3 },
    { i: 'cache-files', x: 9, y: 15, w: 3, h: 3 },
    { i: 'routes', x: 6, y: 13, w: 3, h: 3 },
    { i: 'panel-trace', x: 0, y: 16, w: 12, h: 8 },
    { i: 'coverage-matrix', x: 0, y: 24, w: 12, h: 4 },
    { i: 'visibility-audit', x: 0, y: 28, w: 12, h: 6 },
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

function ApiDiagnosticsCard() {
  const isAdmin = useIsAdminUser();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const r = await loadDiagnosticsReport();
    if (r) {
      setReport(r);
      setErr(null);
    } else {
      setErr('No saved diagnostics report available yet.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const runDiagnostics = async () => {
    if (!isAdmin) {
      setErr('Admin sign-in required to run live diagnostics.');
      return;
    }
    setRunning(true);
    setErr(null);
    try {
      const token = await auth?.currentUser?.getIdToken?.();
      if (!token) throw new Error('Admin sign-in required');
      const live = await fetch(apiUrl('/api/admin/diagnose'), {
        headers: { Authorization: `Bearer ${token}` },
      }).then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        return body;
      });
      setReport(live);
    } catch (e) {
      setErr(`Failed to run diagnostics: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <div className="ana-loading">Loading diagnostics report...</div>;

  return (
    <div className="ana-diagnostics">
      {err && <div className="ana-err-detail" style={{ margin: '8px 0', color: '#ef4444' }}>{err}</div>}
      
      {report && (
        <>
          <div className="ana-diagnostics-summary">
            <span>Overall Status: </span>
            <span className={`ana-status-badge ${report.overallStatus}`}>
              {report.overallStatus}
            </span>
            <span className="ana-diagnostics-timestamp">
              {report.timestamp ? new Date(report.timestamp).toLocaleTimeString() : 'never'}
            </span>
            <button 
              className="ana-refresh-btn" 
              onClick={runDiagnostics} 
              disabled={running || !isAdmin}
              title={isAdmin ? 'Run live endpoint probes' : 'Admin sign-in required'}
              style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '10px' }}
            >
              {running ? 'Running Probes...' : 'Run Live Diagnostics'}
            </button>
          </div>

          <div className="ana-diagnostics-grid">
            {Object.entries(report.markets || {}).map(([market, mData]) => (
              <div key={market} className="ana-diag-card">
                <div className="ana-diag-header">
                  <span className="ana-diag-name">{market}</span>
                  <span className={`ana-diag-status ${mData.status}`}>
                    {mData.status}
                  </span>
                </div>
                {mData.error && (
                  <div className="ana-diag-error" title={mData.error}>{mData.error}</div>
                )}
                <div className="ana-diag-footer">
                  <span>Latency: {mData.duration != null ? `${mData.duration}ms` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PanelVisibilityAudit({ onNavigate }) {
  const [selectedMarket, setSelectedMarket] = useState('bonds');
  const marketCtx = useMarketData(selectedMarket);
  const marketData = marketCtx?.data || null;
  const routeErrors = marketData?._errors || {};

  const panels = PANEL_REGISTRY[selectedMarket] || [];
  
  const getFieldValueByPath = (obj, path) => {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  };

  const visibilityCache = typeof window !== 'undefined' ? window.__panelVisibility : null;
  const renderedKeys = visibilityCache?.[selectedMarket];
  const hasBeenScanned = Array.isArray(renderedKeys);

  const marketLabel = MARKETS.find(m => m.id === selectedMarket)?.label || selectedMarket;

  const handleSwitchTab = () => {
    if (onNavigate) {
      onNavigate(selectedMarket);
    }
  };

  return (
    <div className="ana-vis-audit">
      <div className="ana-vis-header">
        <span className="ana-vis-summary">
          Audit rendering state of grid components (cards) against expected panels.
        </span>
        <select
          className="ana-vis-select"
          value={selectedMarket}
          onChange={(e) => setSelectedMarket(e.target.value)}
        >
          {TRACEABLE_MARKETS.map(mId => (
            <option key={mId} value={mId}>
              {MARKETS.find(m => m.id === mId)?.label || mId}
            </option>
          ))}
        </select>
      </div>

      {!hasBeenScanned ? (
        <div className="ana-vis-prompt">
          <span>No DOM visibility data cached for {marketLabel} tab.</span>
          <button className="ana-vis-switch-btn" onClick={handleSwitchTab}>
            Switch to {marketLabel} Tab to Scan
          </button>
        </div>
      ) : (
        <div className="ana-vis-grid">
          {panels.map(p => {
            const isRendered = renderedKeys.includes(p.id);
            const val = marketData ? getFieldValueByPath(marketData, p.fieldPath || p.field) : undefined;
            const hasData = val != null && (Array.isArray(val) ? val.length > 0 : typeof val === 'object' ? Object.keys(val).length > 0 : true);
            const errMessage = routeErrors[p.field] || null;

            let status = 'hidden';
            let statusText = 'Hidden';
            let reason = '';

            if (isRendered) {
              status = 'rendered';
              statusText = 'Rendered';
            } else if (errMessage) {
              reason = `Upstream error: ${errMessage}`;
            } else if (!hasData) {
              reason = `API response field "${p.field}" is null or empty`;
            } else {
              reason = 'Tab unmounted (React unmounts non-active dashboards)';
            }

            return (
              <div key={p.id} className="ana-vis-card">
                <div className="ana-vis-card-header">
                  <span className="ana-vis-card-title">{p.title}</span>
                  <span className={`ana-vis-badge ${status}`}>{statusText}</span>
                </div>
                <div className="ana-vis-field">
                  Field: <code>{p.fieldPath || p.field}</code>
                </div>
                {reason && (
                  <div className="ana-vis-reason">
                    <strong>Reason:</strong> {reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsMarket({ onNavigate }) {
  const isAdmin = useIsAdminUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedEp, setExpandedEp] = useState(null);
  const [epDetail, setEpDetail] = useState(null);
  const [expandedMarket, setExpandedMarket] = useState(null);
  const [marketDetail, setMarketDetail] = useState(null);
  const [expandedSource, setExpandedSource] = useState(null);

  const ctx = (() => { try { return useDataContext(); } catch { return null; } })();
  const histDate = ctx?.historicalDate || null;

  const fetchData = useCallback(async (forceLive = false) => {
    if (!forceLive) {
      const snap = await loadAnalyticsFromRTDB(histDate);
      if (snap) {
        setData(snap.data);
        setError(null);
        setLoading(false);
        // Still allow live refresh via button
        return;
      }
    }
    try {
      const json = await api.get('/api/analytics');
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [histDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  useEffect(() => {
    if (autoRefresh && !isAdmin) setAutoRefresh(false);
  }, [autoRefresh, isAdmin]);

  const handleAutoRefreshToggle = useCallback(() => {
    if (!isAdmin) return;
    setAutoRefresh(r => !r);
  }, [isAdmin]);

  const handleForceLiveRefresh = useCallback(() => {
    if (!isAdmin) return;
    fetchData(true);
  }, [fetchData, isAdmin]);

  const fetchEpDetail = useCallback(async (epPath) => {
    if (!epPath) return;
    const encoded = encodeURIComponent(epPath.substring(1));
    try {
      const res = await fetch(apiUrl(`/api/analytics/endpoint/${encoded}`));
      if (res.ok) setEpDetail(await res.json());
    } catch {}
  }, []);

  const fetchMarketDetail = useCallback(async (market) => {
    try {
      const res = await fetch(apiUrl(`/api/analytics/cache/${market}`));
      if (res.ok) setMarketDetail(await res.json());
    } catch {}
  }, []);

  const clearMarketCache = useCallback(async (market) => {
    try {
      const res = await fetch(apiUrl(`/api/analytics/cache/${market}`), { method: 'DELETE' });
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
  const freshnessByMarket = new Map((data.dataFreshness?.markets || []).map(m => [m.market, m]));
  const coverageRows = MARKET_ENDPOINTS.map(ep => {
    const marketCtx = ctx?.getMarket?.(ep.id) || {};
    const snapshot = marketCtx.data || null;
    const sourceEntries = Object.entries(snapshot?._sources || {});
    const okSources = sourceEntries.filter(([, value]) => !!value).length;
    const freshness = freshnessByMarket.get(ep.id) || {};
    const status = marketCtx.error
      ? 'error'
      : marketCtx.isLoading
        ? 'loading'
        : okSources > 0
          ? 'ok'
          : snapshot
            ? 'snapshot'
            : freshness.fetchedOn
              ? 'cached'
              : 'missing';
    return {
      ...ep,
      status,
      okSources,
      totalSources: sourceEntries.length,
      fetchedOn: marketCtx.fetchedOn || freshness.fetchedOn || snapshot?.fetchedAt || snapshot?.lastUpdated || '—',
      keys: snapshot ? Object.keys(snapshot).filter(k => !k.startsWith('_')).length : (freshness.keyCount || 0),
      route: ep.path,
    };
  });

    const kpis = [
      { label: 'Endpoints',  value: String(MARKET_ENDPOINTS.length), sublabel: 'Tracked'  },
      { label: 'Last Fetch', value: data.dataFreshness?.lastFetch || '—', sublabel: 'Across markets' },
      { label: 'Cache Hit',  value: `${mc.hitRate || 0}%`, sublabel: 'In-memory'    },
      { label: 'Hot Limits', value: String(sortedSources.filter(s => s.used / s.limit > 0.8).length), sublabel: '> 80% used', color: '#fbbf24' },
    ];

    return (
      <div className="ana-market">
        <div className="ana-status-bar">
          <span className="ana-status-live">● Analytics</span>

        <span>Uptime {formatUptime(up.seconds || 0)}</span>
        <span>Heap {up.memoryMB || 0} / {up.heapTotalMB || 0} MB</span>
        <span>RSS {up.rssMB || 0} MB</span>
        <span>MemCache {mc.keyCount || 0} keys ({mc.hitRate || 0}% hit)</span>
        <button
          className={`ana-refresh-btn${autoRefresh ? ' active' : ''}`}
          onClick={handleAutoRefreshToggle}
          disabled={!isAdmin}
          title={isAdmin ? 'Auto-refresh analytics every 30 seconds' : 'Admin sign-in required'}
        >
          {autoRefresh ? 'Auto 30s' : 'Auto-refresh'}
        </button>
        <button
          className="ana-refresh-btn"
          onClick={handleForceLiveRefresh}
          disabled={!isAdmin}
          title={isAdmin ? 'Bypass RTDB and fetch live analytics' : 'Admin sign-in required'}
        >
          Refresh (force live)
        </button>
        {/* Audit controls (date-aware) live inside the "Provenance Audit" bento card below — supports global History picker + per-audit date select. */}
      </div>
      <div className="ana-dashboard ana-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="analytics-layout-v4">
          {/* KPI strip — real bento child at row 0. */}
          <BentoCard key="kpi" title="Analytics Key Metrics" accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <MarketKpiStrip kpis={kpis} bare />
          </BentoCard>

          {/* Provenance Audit */}
          <BentoCard key="provenance" title="Provenance Audit" subtitle="Cross-reference _sources with FRED" accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <ProvenanceAudit />
          </BentoCard>

          {/* API Diagnostics */}
          <BentoCard key="diagnostics" title="API Health Diagnostics" subtitle="Probe structural integrity and latency" accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <ApiDiagnosticsCard />
          </BentoCard>

          {/* Server Info */}
          <BentoCard key="server" title="Server" subtitle={`PID ${env.pid}`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <>
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
            </>
          </BentoCard>

          {/* API Usage */}
          <BentoCard key="api-usage" title="API Usage" subtitle={`${data.apiUsage?.totalExternalCalls || 0} calls today`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <>
              <div className="ana-stat-grid-sm">
                <div className="ana-detail-row"><span className="ana-detail-label">Total Calls</span><span className="ana-mono">{data.apiUsage?.totalExternalCalls || 0}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Sources</span><span className="ana-mono">{sortedSources.length}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Near Limit</span><span className="ana-mono">{sortedSources.filter(s => s.used / s.limit > 0.8).length}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Exhausted</span><span className="ana-mono">{sortedSources.filter(s => s.used >= s.limit).length}</span></div>
              </div>
              <div className="ana-section-divider" />
              {sortedSources.map(s => (
                <div key={s.name} className="ana-rate-row">
                  <div className="ana-rate-header">
                    <span className="ana-rate-name">{s.name}</span>
                    <span className="ana-rate-count">{s.used}/{s.limit}</span>
                  </div>
                  {pctBar(s.pct)}
                </div>
              ))}
            </>
          </BentoCard>

          {/* Source Health / Rate Limits */}
          <BentoCard key="source-health" title="Data Source Health" subtitle={`${data.apiUsage?.totalExternalCalls || 0} calls today`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
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
          </BentoCard>

          {/* Endpoint Metrics */}
          <BentoCard key="endpoints" title="Endpoint Metrics" subtitle={`${sortedEndpoints.length} routes`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
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
          </BentoCard>

          {/* Data Freshness */}
          <BentoCard key="freshness" title="Data Freshness" subtitle={`${data.dataFreshness?.currentCount || 0}/${data.dataFreshness?.markets?.length || 0} current`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
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
          </BentoCard>

          {/* Error Log */}
          <BentoCard key="error-log" title="Error Log" subtitle={`${(data.errorLog || []).length} entries`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <>
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
            </>
          </BentoCard>

          {/* Memory Cache */}
          <BentoCard key="mem-cache" title="Memory Cache" subtitle={`${mc.keyCount || 0} keys · ${mc.hitRate || 0}% hit`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <>
              <div className="ana-stat-grid-sm">
                <div className="ana-detail-row"><span className="ana-detail-label">Keys</span><span className="ana-mono">{mc.keyCount}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Hits</span><span className="ana-mono">{mc.hits}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Misses</span><span className="ana-mono">{mc.misses}</span></div>
                <div className="ana-detail-row"><span className="ana-detail-label">Hit Rate</span><span className="ana-mono">{mc.hitRate}%</span></div>
              </div>
              <div className="ana-section-divider" />
              <div className="ana-detail-label">Cache keys:</div>
              <div className="ana-key-list">{(mc.keys || []).map(k => <span key={k} className="ana-key-chip">{k}</span>)}</div>
            </>
          </BentoCard>

          {/* Cache Files */}
          <BentoCard key="cache-files" title="File Cache" subtitle={`${data.cacheFiles?.count || 0} files · ${data.cacheFiles?.totalSizeKB || 0} KB`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <>
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
            </>
          </BentoCard>

          {/* Registered Routes */}
          <BentoCard key="routes" title="Express Routes" subtitle={`${routes.length} routes`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
              <table className="ana-table">
                <thead><tr><th>Method</th><th>Path</th></tr></thead>
                <tbody>
                  {routes.map((r, i) => (
                    <tr key={i}><td className="ana-method-chips">{r.methods.map(m => <span key={m} className={`ana-method-chip ${m.toLowerCase()}`}>{m}</span>)}</td><td className="ana-mono">{r.path}</td></tr>
                  ))}
                </tbody>
              </table>
          </BentoCard>

          <BentoCard key="panel-trace" title="Panel Trace Inspector" subtitle="Trace data flow: frontend panel → backend field → external API" accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <PanelTraceInspector />
          </BentoCard>

          <BentoCard key="coverage-matrix" title="Endpoint Coverage Matrix" subtitle={`${coverageRows.filter(r => r.status === 'ok').length}/${coverageRows.length} markets with source coverage`} accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <table className="ana-table">
              <thead><tr><th>Market</th><th>Route</th><th>Status</th><th>Sources</th><th>Keys</th><th>Fetched</th></tr></thead>
              <tbody>
                {coverageRows.map(row => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td className="ana-mono">{row.route}</td>
                    <td style={{ color: row.status === 'ok' ? '#22c55e' : row.status === 'missing' || row.status === 'error' ? '#ef4444' : '#f59e0b' }}>{row.status}</td>
                    <td>{row.totalSources ? `${row.okSources}/${row.totalSources}` : '—'}</td>
                    <td>{row.keys || '—'}</td>
                    <td className="ana-mono">{String(row.fetchedOn || '—').replace('T', ' ').slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </BentoCard>

          <BentoCard key="visibility-audit" title="Panel Visibility Audit" subtitle="Audit DOM visibility of grid panels" accent="analytics" className="ana-bento-card" contentClassName="ana-panel-scroll" noFooter>
            <PanelVisibilityAudit onNavigate={onNavigate} />
          </BentoCard>

        </BentoWrapper>
      </div>
      <DataFooter
        source="Internal Diagnostics / RTDB"
        timestamp={data.dataFreshness?.lastFetch || new Date().toISOString()}
        isLive={true}
        fetchLog={[{ method: 'GET', url: '/api/analytics', status: 200, duration: 0 }]}
      />
    </div>
  );
}
