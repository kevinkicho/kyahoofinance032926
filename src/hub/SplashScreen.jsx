import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { MARKETS } from './markets.config';
import { MARKET_PANELS } from '../data/marketPanels';
import { MARKET_COMPONENTS } from './lazyMarketComponents';
import { useMarketData, useDataContext } from './DataContext';
import { useCurrency } from './CurrencyContext';
import './SplashScreen.css';

const TOTAL_PANELS = Object.values(MARKET_PANELS).reduce((sum, p) => sum + p.length, 0);

const PANEL_TO_MARKET = {};
for (const [mktId, panels] of Object.entries(MARKET_PANELS)) {
  for (const p of panels) PANEL_TO_MARKET[p.id] = mktId;
}

function scanAllPanels() {
  const els = document.querySelectorAll('[data-panel-key]');
  const result = {};
  els.forEach(el => {
    const key = el.getAttribute('data-panel-key');
    if (!key) return;
    const mktId = PANEL_TO_MARKET[key];
    if (!mktId) return;
    if (!result[mktId]) result[mktId] = {};
    const text = el.textContent || '';
    const footer = el.querySelector('.bento-footer, [class*="footer"]');
    const footerText = footer?.textContent || '';
    if (/stale/i.test(footerText)) {
      result[mktId][key] = 'stale';
    } else if (/\bno data\b|\bunavailable\b|\bnot available\b/i.test(text) && text.length < 200) {
      result[mktId][key] = 'null';
    } else {
      result[mktId][key] = 'ok';
    }
  });
  return result;
}

function SplashMarketRenderer({ marketId, centralData }) {
  const Component = MARKET_COMPONENTS[marketId];
  const { currency, setCurrency } = useCurrency();
  if (!Component || !centralData) return null;
  return (
    <div data-splash-market={marketId}>
      <Suspense fallback={null}>
        <Component centralData={centralData} currency={currency} setCurrency={setCurrency} onNavigate={() => {}} />
      </Suspense>
    </div>
  );
}

function SplashScreenInner({ onReady }) {
  const dataCtx = useDataContext();
  const { getMarket } = dataCtx || {};
  const [elapsed, setElapsed] = useState(0);
  const [marketStatus, setMarketStatus] = useState(() =>
    Object.fromEntries(MARKETS.map(m => [m.id, 'pending']))
  );
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const cache = scanAllPanels();
      onReady(cache);
    }, 30000);
    return () => clearTimeout(id);
  }, [onReady]);

  useEffect(() => {
    if (!getMarket) return;
    const id = setInterval(() => {
      const next = {};
      for (const m of MARKETS) {
        const ctx = getMarket(m.id);
        if (!ctx) next[m.id] = 'pending';
        else if (ctx.isLoading) next[m.id] = 'loading';
        else if (ctx.error && !ctx.data) next[m.id] = 'error';
        else if (ctx.data) next[m.id] = 'ok';
        else next[m.id] = 'pending';
      }
      setMarketStatus(next);
    }, 500);
    return () => clearInterval(id);
  }, [getMarket]);

  const allLoaded = useMemo(() =>
    Object.values(marketStatus).every(s => s === 'ok' || s === 'error'),
    [marketStatus]
  );

  // Poll DOM until we find panels from multiple markets, then scan and dismiss
  useEffect(() => {
    if (!allLoaded) return;
    const id = setInterval(() => {
      const panelEls = document.querySelectorAll('[data-panel-key]');
      const marketsFound = new Set();
      panelEls.forEach(el => {
        const key = el.getAttribute('data-panel-key');
        const mkt = PANEL_TO_MARKET[key];
        if (mkt) marketsFound.add(mkt);
      });
      // Wait until we see panels from at least 3 markets (lazy chunks loaded)
      if (marketsFound.size >= 3) {
        clearInterval(id);
        // Give remaining chunks a moment to finish
        setTimeout(() => {
          const cache = scanAllPanels();
          onReady(cache);
        }, 2000);
      }
    }, 500);
    return () => clearInterval(id);
  }, [allLoaded, onReady]);

  const okCount = Object.values(marketStatus).filter(s => s === 'ok').length;
  const errorCount = Object.values(marketStatus).filter(s => s === 'error').length;
  const loadingCount = Object.values(marketStatus).filter(s => s === 'loading').length;

  const scannedPanelCount = typeof document !== 'undefined'
    ? document.querySelectorAll('[data-panel-key]').length : 0;

  return (
    <>
      {/* Render all markets at full size behind splash for DOM scanning */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 99998, overflow: 'auto', background: '#0a0e1a' }}>
        {MARKETS.map(m => (
          <SplashMarketRenderer
            key={m.id}
            marketId={m.id}
            centralData={getMarket?.(m.id)}
          />
        ))}
      </div>

      {/* Splash overlay */}
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-header">
            <div className="splash-logo">📊</div>
            <h1 className="splash-title">Global Market Hub</h1>
            <p className="splash-subtitle">
              Fetching {MARKETS.length} markets · scanning {TOTAL_PANELS} panels
            </p>
          </div>

          <div className="splash-progress-bar">
            <div className="splash-progress-fill" style={{ width: `${((okCount + errorCount) / MARKETS.length) * 100}%` }} />
          </div>

          <div className="splash-stats">
            <span className="splash-stat splash-stat-ok">{okCount} loaded</span>
            {loadingCount > 0 && <span className="splash-stat splash-stat-loading">{loadingCount} fetching</span>}
            {errorCount > 0 && <span className="splash-stat splash-stat-error">{errorCount} failed</span>}
            <span className="splash-stat splash-stat-time">{elapsed}s</span>
            <span className="splash-stat">{scannedPanelCount} panels scanned</span>
          </div>

          <div className="splash-grid">
            {MARKETS.map(m => {
              const status = marketStatus[m.id];
              const panels = MARKET_PANELS[m.id] || [];
              return (
                <div key={m.id} className={`splash-market splash-market--${status}`}>
                  <div className="splash-market-header">
                    <span className="splash-market-icon">
                      {status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳'}
                    </span>
                    <span className="splash-market-name">{m.label}</span>
                    <span className="splash-market-count">{panels.length}</span>
                  </div>
                  <div className="splash-panels">
                    {panels.map(p => (
                      <span key={p.id} className={`splash-panel-dot splash-panel-dot--${status}`} title={p.title} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default function SplashScreen({ onReady }) {
  return <SplashScreenInner onReady={onReady} />;
}
