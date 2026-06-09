import React, { useState, useRef, useCallback, useEffect, Suspense, Component } from 'react';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET, MARKETS } from './markets.config';
import HubFooter from './HubFooter';
import { useToast } from './ToastContext';
import { DataProvider } from './DataProvider';
import { useMarketData } from './DataContext';
import { useCurrency } from './CurrencyContext';
import { captureBentoSnapshot } from '../utils/exportUtils';
import { MARKET_COMPONENTS } from './lazyMarketComponents';
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
  const institutionalCtx = useMarketData('institutional');

  if (!ActiveMarket) return null;
  return (
    <div role="region" aria-label={MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket}>
      <ActiveMarket
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

export default function HubLayout() {
  const [activeMarket, setActiveMarket] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('market');
    if (fromUrl && MARKETS.some(m => m.id === fromUrl)) return fromUrl;
    const saved = localStorage.getItem('hub-active-market');
    return saved && MARKETS.some(m => m.id === saved) ? saved : DEFAULT_MARKET;
  });
  const { currency, setCurrency } = useCurrency();
  const [snapshotDate, setSnapshotDate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(() => localStorage.getItem('hub-auto-refresh') === 'on');
  const [refreshKey, setRefreshKey] = useState(0);
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
        <main id="main-content" ref={contentRef} role="tabpanel" aria-label={MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <MarketErrorBoundary key={activeMarket} name={MARKETS.find(m => m.id === activeMarket)?.label ?? activeMarket}>
            <Suspense fallback={<MarketFallback />}>
              <ActiveMarketWrapper activeMarket={activeMarket} currency={currency} setCurrency={setCurrency} snapshotDate={snapshotDate} setSnapshotDate={setSnapshotDate} autoRefresh={autoRefresh} refreshKey={refreshKey} onNavigate={setActiveMarket} />
            </Suspense>
          </MarketErrorBoundary>
        </main>
        <HubFooter activeMarket={activeMarket} />
      </div>
    </DataProvider>
  );
}
