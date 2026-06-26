import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MARKETS } from './markets.config';
import { MARKET_PANELS } from '../data/marketPanels';
import { useDataContext } from './DataContext';
import './SplashScreen.css';

const TOTAL_PANELS = Object.values(MARKET_PANELS).reduce((sum, p) => sum + p.length, 0);

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

  // Timeout — force dismiss after 20s
  useEffect(() => {
    const id = setTimeout(onReady, 20000);
    return () => clearTimeout(id);
  }, [onReady]);

  // Poll market status
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

  // Dismiss 3 seconds after all data loaded
  useEffect(() => {
    if (allLoaded) {
      const id = setTimeout(onReady, 3000);
      return () => clearTimeout(id);
    }
  }, [allLoaded, onReady]);

  const okCount = Object.values(marketStatus).filter(s => s === 'ok').length;
  const errorCount = Object.values(marketStatus).filter(s => s === 'error').length;
  const loadingCount = Object.values(marketStatus).filter(s => s === 'loading').length;

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-header">
          <div className="splash-logo">📊</div>
          <h1 className="splash-title">Global Market Hub</h1>
          <p className="splash-subtitle">
            Fetching {MARKETS.length} markets · {TOTAL_PANELS} panels
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

        {allLoaded && (
          <div className="splash-done">All markets loaded — opening dashboard</div>
        )}
      </div>
    </div>
  );
}

export default function SplashScreen({ onReady }) {
  return <SplashScreenInner onReady={onReady} />;
}
