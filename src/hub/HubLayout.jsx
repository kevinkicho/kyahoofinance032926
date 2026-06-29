import React, { useState, useRef, useCallback, useEffect, Suspense, Component } from 'react';
import MarketTabBar from './MarketTabBar';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { DEFAULT_MARKET, MARKETS } from './markets.config';
import HubFooter from './HubFooter';
import { useToast } from './ToastContext';
import { DataProvider } from './DataProvider';
import { useMarketData, useDataContext } from './DataContext';
import { useCurrency } from './CurrencyContext';
import { captureBentoSnapshot } from '../utils/exportUtils';
import { apiUrl } from '../lib/api';
import { getRecaptchaEnterpriseToken } from '../lib/recaptchaEnterprise';
import { MARKET_COMPONENTS } from './lazyMarketComponents';
import './Skeleton.css';
import './responsive.css';
import SplashScreen from './SplashScreen';
import { setPanelCache } from '../hooks/usePanelHealth';

function flattenForCSV(obj, prefix = '') {
  const rows = [];
  function walk(val, key) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      val.forEach((item, i) => {
        const flat = {};
        for (const [k, v] of Object.entries(item)) {
          flat[`${key}.${k}`] = v;
        }
        rows.push(flat);
      });
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [k, v] of Object.entries(val)) walk(v, key ? `${key}.${k}` : k);
    } else {
      rows.push({ field: key, value: val });
    }
  }
  walk(obj, prefix);
  return rows;
}

class MarketErrorBoundary extends Component {
  state = { error: null, componentStack: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(err, info) {
    console.error(`[${this.props.name}] crashed:`, err, info);
    this.setState({ componentStack: info?.componentStack || null });
  }
  componentDidUpdate(prev) {
    if (this.state.error && prev.name !== this.props.name) this.setState({ error: null, componentStack: null });
  }
  render() {
    if (this.state.error) {
      const stackLines = (this.state.componentStack || '').split('\n').filter(l => l.trim()).slice(0, 3);
      const fullStack = this.state.componentStack || '';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--text-muted)', fontSize: 13, padding: 16 }}>
          <span style={{ fontSize: 28 }}>&#9888;</span>
          <span><strong>{this.props.name}</strong> failed to load.</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', maxWidth: 400, textAlign: 'center', wordBreak: 'break-word' }}>{this.state.error.message}</span>
          {stackLines.length > 0 && (
            <pre style={{ fontSize: 9, color: 'var(--text-dim)', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: 4, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, lineHeight: 1.4 }}>{stackLines.join('\n')}</pre>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => this.setState({ error: null, componentStack: null })} style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
              Retry
            </button>
            {fullStack && (
              <button onClick={() => { navigator.clipboard.writeText(`${this.state.error?.stack || this.state.error?.message}\n\nComponent stack:\n${fullStack}`); }} style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11 }}>
                Copy Stack
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}



function MarketFallback() {
  return (
    <div className="skeleton-market">
      <div className="skeleton-header">
        {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-tab" />)}
      </div>
      <div className="skeleton skeleton-status" />
      <div className="skeleton-kpi-strip">
        {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-kpi" />)}
      </div>
      <div className="skeleton-row">
        <div className="skeleton skeleton-chart" />
        <div className="skeleton skeleton-chart" />
      </div>
      <div className="skeleton skeleton-table" />
      <div className="skeleton skeleton-footer" />
    </div>
  );
}

function ActiveMarketWrapper({ activeMarket, currency, setCurrency, snapshotDate, setSnapshotDate, autoRefresh, refreshKey, onNavigate }) {
  const ActiveMarket = MARKET_COMPONENTS[activeMarket];
  const marketCtx = useMarketData(activeMarket);
  const dataCtx = useDataContext();
  const institutionalCtx = useMarketData('institutional');
  const historicalKey = dataCtx?.historicalDate || 'live';

  if (!ActiveMarket) return null;
  return (
    <div role="region" aria-label={MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket}>
      <ActiveMarket
        key={`${activeMarket}:${historicalKey}`}
        currency={currency}
        setCurrency={setCurrency}
        snapshotDate={snapshotDate}
        setSnapshotDate={setSnapshotDate}
        centralData={marketCtx}
        institutionalData={activeMarket === 'equitiesDeepDive' ? institutionalCtx : undefined}
        onNavigate={onNavigate}
      />
    </div>
  );
}

// Thin global banner shown whenever a historicalDate is active in DataProvider.
// Clicking exit calls setHistoricalDate(null) which makes DataProvider fall back to /latest + live fetches.
function HistoricalModeBanner() {
  const ctx = (() => { try { return useDataContext(); } catch { return null; } })();
  if (!ctx || !ctx.historicalDate) return null;
  const { historicalDate, setHistoricalDate } = ctx;
  return (
    <div className="hub-hist-banner" role="status" aria-live="polite">
      <span>Historical view: <strong>{historicalDate}</strong> (snapshots where available)</span>
      <button onClick={() => setHistoricalDate(null)} title="Exit historical mode and return to live/latest data across the app">
        Exit to live
      </button>
      <span className="hub-hist-hint">Tabs without a snapshot will say so instead of silently showing live data.</span>
    </div>
  );
}

function HubLayoutInner({ autoRefresh, setAutoRefresh, refreshKey, setRefreshKey }) {
  const [activeMarket, setActiveMarket] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('market');
    if (fromUrl && MARKETS.some(m => m.id === fromUrl)) return fromUrl;
    const saved = localStorage.getItem('hub-active-market');
    return saved && MARKETS.some(m => m.id === saved) ? saved : DEFAULT_MARKET;
  });
  const [splashDone, setSplashDone] = useState(() => {
    // Skip splash if user has visited before (has cached panel health)
    try { return sessionStorage.getItem('hub-splash-seen') === '1'; } catch { return false; }
  });
  const { currency, setCurrency } = useCurrency();
  const [snapshotDate, setSnapshotDate] = useState(null);
  const contentRef = useRef(null);
  const marketDataRef = useRef(null);
  const { addToast } = useToast();
  const activeMarketData = useMarketData(activeMarket);
  marketDataRef.current = activeMarketData;

  useEffect(() => {
    localStorage.setItem('hub-active-market', activeMarket);
    // Don't modify URL in popout windows
    if (window.location.search.includes('popout=')) return;
    const url = new URL(window.location);
    url.searchParams.set('market', activeMarket);
    window.history.pushState({}, '', url);

    const marketLabel = MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket;
    document.title = `${marketLabel} — Global Market Hub`;
  }, [activeMarket]);

  useEffect(() => {
    window.__panelVisibility = window.__panelVisibility || {};

    const scanDOM = () => {
      const elements = document.querySelectorAll('[data-panel-key]');
      const foundKeys = new Set();
      elements.forEach(el => {
        const key = el.getAttribute('data-panel-key');
        if (key) {
          foundKeys.add(key);
        }
      });
      window.__panelVisibility[activeMarket] = Array.from(foundKeys);
    };

    scanDOM();

    const observer = new MutationObserver(() => {
      scanDOM();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-panel-key']
    });

    return () => {
      observer.disconnect();
    };
  }, [activeMarket]);

  // Sync market from browser back/forward navigation
  useEffect(() => {
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('market');
      if (m && MARKETS.some(mk => mk.id === m)) setActiveMarket(m);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.title = 'Global Market Hub';
  }, []);

  useEffect(() => { localStorage.setItem('hub-auto-refresh', autoRefresh ? 'on' : 'off'); }, [autoRefresh]);

  const ActiveMarket = MARKET_COMPONENTS[activeMarket];

  const handlePopout = useCallback(() => {
    const url = new URL(window.location.origin);
    url.searchParams.set('popout', 'true');
    url.searchParams.set('market', activeMarket);
    window.open(url.toString(), `popout-${activeMarket}`, 'width=1200,height=800');
    addToast(`Popped out ${MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket}`, 'success');
  }, [activeMarket, addToast]);

  const handleExport = useCallback(async () => {
    if (!contentRef.current) return;
    const marketLabel = MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket;
    const date = new Date().toISOString().slice(0, 10);
    
    try {
      await captureBentoSnapshot(contentRef.current, `${marketLabel}-${date}.png`);
      addToast('Screenshot saved', 'success');
    } catch (e) {
      addToast('Export failed: ' + e.message, 'error');
    }
  }, [activeMarket, addToast]);

  const handleExportData = useCallback(async (format) => {
    const marketLabel = MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket;
    const date = new Date().toISOString().slice(0, 10);
    try {
      const data = marketDataRef.current?.data;
      if (!data) { addToast('No data available to export — fetch first', 'error'); return; }
      let blob, ext;
      if (format === 'csv') {
        const { unparse } = await import('papaparse');
        const flat = flattenForCSV(data);
        blob = new Blob([unparse(flat)], { type: 'text/csv' });
        ext = 'csv';
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        ext = 'json';
      }
      const link = document.createElement('a');
      link.download = `${marketLabel}-${date}.${ext}`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      addToast(`Data exported as ${ext.toUpperCase()}`, 'success');
    } catch (e) {
      console.warn('Data export failed:', e.message);
      addToast('Export failed: ' + e.message, 'error');
    }
  }, [activeMarket, addToast]);

  const handleToggleRefresh = useCallback(() => {
    setAutoRefresh(r => !r);
  }, []);

  const dataCtx = useDataContext();

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;
    const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : null;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
        if (!res.ok) return;
        const latest = await res.json();
        if (!cancelled && currentVersion && latest?.version && latest.version !== currentVersion) {
          addToast('New version available. Hard refresh to update.', 'info');
        }
      } catch {
        // Version checks are best-effort only; never disturb the dashboard.
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addToast]);

  const handleRefresh = useCallback(async () => {
    try {
      let token = null;
      let email = null;

      // 1. Google sign-in if client-side Firebase Auth is configured
      if (auth && googleProvider) {
        let user = auth.currentUser;
        if (!user) {
          addToast('Admin sign-in required to refresh global data.', 'info');
          return;
        }
        email = user.email;
        token = await user.getIdToken();
      } else {
        addToast('Admin sign-in is not available in this build.', 'error');
        return;
      }

      // 2. Email verification
      if (email !== 'kevinkicho@gmail.com') {
        addToast('Admin account required to refresh global data.', 'error');
        return;
      }

      addToast('Admin authenticated. Triggering global refresh crawl...', 'info');
      const recaptchaToken = await getRecaptchaEnterpriseToken('ADMIN_REFRESH');

      // 3. Trigger backend crawl
      const res = await fetch(apiUrl('/api/admin/refresh-all'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Recaptcha-Token': recaptchaToken || '',
          'X-Recaptcha-Action': 'ADMIN_REFRESH'
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.userMessage || 'Admin refresh could not be started.');
      }

      const resData = await res.json();

      // 4. Reload data in frontend
      if (dataCtx && dataCtx.refetchLatestSnapshots) {
        dataCtx.refetchLatestSnapshots();
        addToast('Global refresh completed! Reloading latest snapshots...', 'success');
      } else if (dataCtx && dataCtx.refetchAll) {
        dataCtx.refetchAll();
        addToast('Global refresh completed! Reloading all markets...', 'success');
      } else {
        setRefreshKey(k => k + 1);
        addToast('Global refresh completed!', 'success');
      }
    } catch (e) {
      console.error('[HubLayout] Global refresh failed:', e);
      addToast(e.message || 'Admin refresh could not be started.', 'error');
    }
  }, [dataCtx, addToast]);

  // Keyboard shortcuts: 1-9,0 for markets, Ctrl+E export, Ctrl+K search, Escape
  useEffect(() => {
    function handleKeyDown(e) {
      // Skip if user is typing in an input/textarea
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      // Ctrl+E → PNG export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
        return;
      }
      // Ctrl+K → focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.hub-search-input')?.focus();
        return;
      }
      // Number keys 1-9, 0 → switch market tabs (1=first, 0=10th)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const num = e.key === '0' ? 10 : parseInt(e.key, 10);
        if (num >= 1 && num <= MARKETS.length) {
          setActiveMarket(MARKETS[num - 1].id);
          return;
        }
        // Left/Right arrow → prev/next market
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          const idx = MARKETS.findIndex(m => m.id === activeMarket);
          const next = e.key === 'ArrowLeft'
            ? (idx - 1 + MARKETS.length) % MARKETS.length
            : (idx + 1) % MARKETS.length;
          setActiveMarket(MARKETS[next].id);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMarket, handleExport, setActiveMarket]);

  const handleSplashReady = useCallback((cache) => {
    setPanelCache(cache);
    setSplashDone(true);
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch {}
  }, []);

  return (
      <div className="hub-layout">
        {!splashDone && dataCtx && (
          <SplashScreen
            onReady={handleSplashReady}
            getMarket={dataCtx.getMarket}
            allMarkets={dataCtx.markets}
          />
        )}
        <a href='#main-content' className='skip-link'>Skip to content</a>
         <MarketTabBar
           activeMarket={activeMarket}
           setActiveMarket={setActiveMarket}
           currency={currency}
           setCurrency={setCurrency}
           onExport={handleExport}
           onExportData={handleExportData}
           onPopout={handlePopout}
           autoRefresh={autoRefresh}
           onToggleRefresh={handleToggleRefresh}
           onRefresh={handleRefresh}
         />
        <HistoricalModeBanner />
        <main id="main-content" ref={contentRef} role="tabpanel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          {MARKETS.map(m => (
            <div key={m.id} style={{ display: m.id === activeMarket ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <MarketErrorBoundary name={m.label}>
                <Suspense fallback={<MarketFallback />}>
                  <ActiveMarketWrapper activeMarket={m.id} currency={currency} setCurrency={setCurrency} snapshotDate={snapshotDate} setSnapshotDate={setSnapshotDate} autoRefresh={autoRefresh} refreshKey={refreshKey} onNavigate={setActiveMarket} />
                </Suspense>
              </MarketErrorBoundary>
            </div>
          ))}
        </main>
        <HubFooter activeMarket={activeMarket} />
      </div>
  );
}

export default function HubLayout() {
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('hub-auto-refresh') === 'on');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <DataProvider autoRefresh={autoRefresh} refreshKey={refreshKey}>
      <HubLayoutInner
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        refreshKey={refreshKey}
        setRefreshKey={setRefreshKey}
      />
    </DataProvider>
  );
}
