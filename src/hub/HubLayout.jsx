import React, { useState, useRef, useCallback, useEffect, Suspense, Component } from 'react';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET, MARKETS } from './markets.config';
import HubFooter from './HubFooter';
import { useToast } from './ToastContext';
import { DataProvider } from './DataProvider';
import { useMarketData, useDataContext } from './DataContext';
import { useCurrency } from './CurrencyContext';
import { captureBentoSnapshot } from '../utils/exportUtils';
import { MARKET_COMPONENTS } from './lazyMarketComponents';
import './Skeleton.css';
import './responsive.css';
import SplashScreen from './SplashScreen';
import { setPanelCache } from '../hooks/usePanelHealth';
import ErrorBoundary from '../components/ErrorBoundary';

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

// Consolidated ErrorBoundary is imported from components/ErrorBoundary.jsx



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

function ActiveMarketWrapper({ activeMarket, currency, setCurrency, snapshotDate, setSnapshotDate, onNavigate }) {
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

function HubLayoutInner({ refreshKey, setRefreshKey }) {
  const [activeMarket, setActiveMarket] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('market');
    if (fromUrl && MARKETS.some(m => m.id === fromUrl)) return fromUrl;
    const saved = localStorage.getItem('hub-active-market');
    return saved && MARKETS.some(m => m.id === saved) ? saved : DEFAULT_MARKET;
  });
  const [visitedMarkets, setVisitedMarkets] = useState([activeMarket]);

  useEffect(() => {
    if (!visitedMarkets.includes(activeMarket)) {
      setVisitedMarkets(prev => [...prev, activeMarket]);
    }
  }, [activeMarket, visitedMarkets]);

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

  const handlePopout = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('popout', activeMarket);
    window.open(url.toString(), `popout-${activeMarket}`, 'width=1200,height=800,menubar=no,toolbar=no');
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
    // Force live re-fetch of every market (?refresh=true). Must await the full
    // wave — a previous bug resolved immediately while another fetch held the
    // lock, so the toast said "refreshing" without scheduling new upstream work.
    if (dataCtx?.isRefreshing) {
      addToast('Refresh already in progress…', 'info');
      return;
    }
    try {
      addToast('Mass refresh: all markets (force live)…', 'info');
      if (dataCtx?.refetchAll) {
        await dataCtx.refetchAll();
        addToast('All markets updated.', 'success');
      } else {
        setRefreshKey(k => k + 1);
        addToast('Mass refresh queued.', 'success');
      }
    } catch (e) {
      console.error('[HubLayout] Refresh failed:', e);
      addToast(e.message || 'Refresh failed.', 'error');
    }
  }, [dataCtx, addToast, setRefreshKey]);

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
           onRefresh={handleRefresh}
           isRefreshing={!!dataCtx?.isRefreshing}
         />
        <HistoricalModeBanner />
        <main id="main-content" ref={contentRef} role="tabpanel" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          {MARKETS.map(m => {
            const isVisited = visitedMarkets.includes(m.id);
            if (!isVisited) return null;
            return (
              <div
                key={m.id}
                data-market-id={m.id}
                style={{ display: m.id === activeMarket ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}
              >
                <ErrorBoundary type="tab" name={m.label}>
                  <Suspense fallback={<MarketFallback />}>
                    <ActiveMarketWrapper activeMarket={m.id} currency={currency} setCurrency={setCurrency} snapshotDate={snapshotDate} setSnapshotDate={setSnapshotDate} onNavigate={setActiveMarket} />
                  </Suspense>
                </ErrorBoundary>
              </div>
            );
          })}
        </main>
        <HubFooter activeMarket={activeMarket} />
      </div>
  );
}

export default function HubLayout() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <DataProvider refreshKey={refreshKey}>
      <HubLayoutInner
        refreshKey={refreshKey}
        setRefreshKey={setRefreshKey}
      />
    </DataProvider>
  );
}
