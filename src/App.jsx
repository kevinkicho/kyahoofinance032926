// src/App.jsx
import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import './index.css';
import { ThemeProvider } from './hub/ThemeContext';
import { ToastProvider } from './hub/ToastContext';
import { DataProvider } from './hub/DataProvider';
import { CurrencyProvider } from './hub/CurrencyContext';
import { useMarketData } from './hub/DataContext';
import HubLayout from './hub/HubLayout';
import { MARKETS } from './hub/markets.config';
import { MARKET_COMPONENTS } from './hub/lazyMarketComponents';

import ErrorBoundary from './components/ErrorBoundary';

function PopoutView({ marketId }) {
  const marketMeta = MARKETS.find(m => m.id === marketId);
  const MarketComponent = MARKET_COMPONENTS[marketId];
  const label = marketMeta ? marketMeta.label : marketId;
  const marketCtx = useMarketData(marketId);
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    document.title = label + ' — Market Hub';
  }, [label]);

  const hasRefetched = useRef(false);
  useEffect(() => {
    if (!hasRefetched.current && !marketCtx?.data && !marketCtx?.isLoading) {
      hasRefetched.current = true;
      marketCtx?.refetch?.();
    }
  }, [marketCtx]);

  const refetchRef = useRef(marketCtx?.refetch);
  useEffect(() => {
    refetchRef.current = marketCtx?.refetch;
  }, [marketCtx?.refetch]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchRef.current?.();
    }, 300000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (!MarketComponent) {
    return (
      <div style={{ padding: 40, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
        Unknown market: {marketId}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      {/* Popout header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 44,
        flexShrink: 0,
        background: 'var(--bg-deep)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {label}
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 4 }}>— Pop-out View</span>
          {marketCtx?.isLoading && <span style={{ fontSize: 10, color: 'var(--accent, #3b82f6)' }}>Loading…</span>}
          {marketCtx?.isHistorical && marketCtx?.asOfDate && !marketCtx?.isLoading && <span style={{ fontSize: 10, color: '#fbbf24' }}>📜 {marketCtx.asOfDate}</span>}
          {marketCtx?.isLive && !marketCtx?.isLoading && !marketCtx?.isHistorical && <span style={{ fontSize: 10, color: '#10b981' }}>● Live</span>}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => marketCtx?.refetch?.()} title="Refresh data" style={{ fontSize: 12, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            ▶ Refresh
          </button>
          <button onClick={() => setAutoRefresh(r => !r)} title={autoRefresh ? 'Auto-refresh ON (5 min)' : 'Auto-refresh OFF'} style={{ fontSize: 12, background: autoRefresh ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)', color: autoRefresh ? '#10b981' : 'var(--text-secondary)', border: '1px solid ' + (autoRefresh ? '#10b981' : 'var(--border-color)'), borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            {autoRefresh ? 'Auto ✓' : 'Auto'}
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: '#3b82f6',
              textDecoration: 'none',
              border: '1px solid #3b82f6',
              borderRadius: 6,
              padding: '4px 10px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            &#8617; Return to Hub
          </a>
        </div>
      </div>
      {/* Market content */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>Loading market...</div>}>
          <MarketComponent currency="USD" centralData={marketCtx} onNavigate={() => {}} />
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  const popoutId = new URLSearchParams(window.location.search).get('popout');
  const isValidPopout = popoutId && MARKET_COMPONENTS[popoutId];

  if (isValidPopout) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <CurrencyProvider initialCurrency="USD">
            <DataProvider autoRefresh={false} refreshKey={0}>
              <ErrorBoundary type="global" name="Market Hub">
                <PopoutView marketId={popoutId} />
              </ErrorBoundary>
            </DataProvider>
          </CurrencyProvider>
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <CurrencyProvider>
          <ErrorBoundary type="global" name="Market Hub">
            <HubLayout />
          </ErrorBoundary>
        </CurrencyProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
