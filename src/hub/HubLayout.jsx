import React, { useState, useRef, useCallback, useEffect, Suspense, lazy, Component } from 'react';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET, MARKETS } from './markets.config';
import HubFooter from './HubFooter';
import { useToast } from './ToastContext';
import { DataProvider } from './DataProvider';
import { useMarketData } from './DataContext';
import './Skeleton.css';
import './responsive.css';

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
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(err, info) { console.error(`[${this.props.name}] crashed:`, err, info); }
  componentDidUpdate(prev) {
    if (this.state.error && prev.name !== this.props.name) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          <span style={{ fontSize: 28 }}>&#9888;</span>
          <span><strong>{this.props.name}</strong> failed to load.</span>
          <button onClick={() => this.setState({ error: null })} style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
            Retry
          </button>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{this.state.error.message}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

const MARKET_COMPONENTS = {
  equities:          lazy(() => import('../markets/equities/EquitiesMarket')),
  bonds:             lazy(() => import('../markets/bonds/BondsMarket')),
  fx:                lazy(() => import('../markets/fx/FXMarket')),
  derivatives:       lazy(() => import('../markets/derivatives/DerivativesMarket')),
  realEstate:        lazy(() => import('../markets/realEstate/RealEstateMarket')),
  insurance:         lazy(() => import('../markets/insurance/InsuranceMarket')),
  commodities:       lazy(() => import('../markets/commodities/CommoditiesMarket')),
  globalMacro:       lazy(() => import('../markets/globalMacro/GlobalMacroMarket')),
  imf:               lazy(() => import('../markets/imf/ImfMarket')),
  equitiesDeepDive:  lazy(() => import('../markets/equitiesDeepDive/EquitiesDeepDiveMarket')),
  crypto:            lazy(() => import('../markets/crypto/CryptoMarket')),
  credit:            lazy(() => import('../markets/credit/CreditMarket')),
  sentiment:         lazy(() => import('../markets/sentiment/SentimentMarket')),
  calendar:          lazy(() => import('../markets/calendar/CalendarMarket')),
  alerts:            lazy(() => import('../markets/alerts/AlertsMarket')),
  watchlist:         lazy(() => import('../markets/watchlist/WatchlistMarket')),
  analytics:         lazy(() => import('../markets/analytics/AnalyticsMarket')),
};

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

function ActiveMarketWrapper({ activeMarket, currency, setCurrency, snapshotDate, setSnapshotDate, autoRefresh, refreshKey }) {
  const ActiveMarket = MARKET_COMPONENTS[activeMarket];
  const marketCtx = useMarketData(activeMarket);
  const institutionalCtx = useMarketData('institutional');
  if (!ActiveMarket) return null;
  return (
    <ActiveMarket
      currency={currency}
      setCurrency={setCurrency}
      snapshotDate={snapshotDate}
      setSnapshotDate={setSnapshotDate}
      centralData={marketCtx}
      institutionalData={activeMarket === 'equitiesDeepDive' ? institutionalCtx : undefined}
    />
  );
}

export default function HubLayout() {
  const [activeMarket, setActiveMarket] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('market');
    if (fromUrl && MARKETS.some(m => m.id === fromUrl)) return fromUrl;
    const saved = localStorage.getItem('hub-active-market');
    return saved && MARKETS.some(m => m.id === saved) ? saved : DEFAULT_MARKET;
  });
  const [currency, setCurrency] = useState('USD');
  const [snapshotDate, setSnapshotDate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('hub-auto-refresh') === 'on');
  const [refreshKey, setRefreshKey] = useState(0);
  const contentRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    localStorage.setItem('hub-active-market', activeMarket);
    // Don't modify URL in popout windows
    if (window.location.search.includes('popout=')) return;
    const url = new URL(window.location);
    url.searchParams.set('market', activeMarket);
    window.history.pushState({}, '', url);
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

  useEffect(() => { localStorage.setItem('hub-auto-refresh', autoRefresh ? 'on' : 'off'); }, [autoRefresh]);

  const ActiveMarket = MARKET_COMPONENTS[activeMarket];

  const handleExport = useCallback(async () => {
    if (!contentRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(contentRef.current, { useCORS: true, scale: 2 });
    const link = document.createElement('a');
    const marketLabel = MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `${marketLabel}-${date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    addToast('Screenshot saved', 'success');
  }, [activeMarket, addToast]);

  const API_MAP = { equities: null, equitiesDeepDive: 'equityDeepDive' };
  const handleExportData = useCallback(async (format) => {
    const endpoint = API_MAP[activeMarket] ?? activeMarket;
    if (!endpoint) return; // equities has no single JSON endpoint
    try {
      const r = await fetch(`/api/${endpoint}`);
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      const marketLabel = MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket;
      const date = new Date().toISOString().slice(0, 10);
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

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

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

  return (
    <DataProvider autoRefresh={autoRefresh} refreshKey={refreshKey}>
      <div className="hub-layout">
        <MarketTabBar
          activeMarket={activeMarket}
          setActiveMarket={setActiveMarket}
          currency={currency}
          setCurrency={setCurrency}
          onExport={handleExport}
          onExportData={handleExportData}
          autoRefresh={autoRefresh}
          onToggleRefresh={handleToggleRefresh}
          onRefresh={handleRefresh}
        />
        <main id="main-content" ref={contentRef} role="tabpanel" aria-label={MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <MarketErrorBoundary key={activeMarket} name={MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket}>
            <Suspense fallback={<MarketFallback />}>
              <ActiveMarketWrapper activeMarket={activeMarket} currency={currency} setCurrency={setCurrency} snapshotDate={snapshotDate} setSnapshotDate={setSnapshotDate} autoRefresh={autoRefresh} refreshKey={refreshKey} />
            </Suspense>
          </MarketErrorBoundary>
        </main>
        <HubFooter activeMarket={activeMarket} />
      </div>
    </DataProvider>
  );
}
