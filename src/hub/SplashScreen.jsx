import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MARKETS } from './markets.config';
import { MARKET_PANELS } from '../data/marketPanels';
import './SplashScreen.css';

// Total panels across all markets
const TOTAL_PANELS = Object.values(MARKET_PANELS).reduce((sum, panels) => sum + panels.length, 0);

/**
 * SplashScreen — shows initialization progress as all market data is fetched.
 * Displays per-market status (loading → ok/error) and per-panel checkmarks.
 * Auto-dismisses when all markets finish or after timeout.
 */
export default function SplashScreen({ onReady, getMarket, allMarkets }) {
  const [marketStatus, setMarketStatus] = useState(() =>
    Object.fromEntries(MARKETS.map(m => [m.id, 'pending']))
  );
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const [timedOut, setTimedOut] = useState(false);

  // Timer for elapsed display
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Timeout — dismiss after 25s even if some markets failed
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), 25000);
    return () => clearTimeout(id);
  }, []);

  // Poll market status from DataContext
  useEffect(() => {
    const check = () => {
      const next = {};
      for (const m of MARKETS) {
        const ctx = getMarket?.(m.id);
        if (!ctx) {
          next[m.id] = 'pending';
        } else if (ctx.isLoading) {
          next[m.id] = 'loading';
        } else if (ctx.error && !ctx.data) {
          next[m.id] = 'error';
        } else if (ctx.data) {
          next[m.id] = 'ok';
        } else {
          next[m.id] = 'pending';
        }
      }
      setMarketStatus(next);
    };
    check();
    const id = setInterval(check, 500);
    return () => clearInterval(id);
  }, [getMarket, allMarkets]);

  // Check if all markets are done
  const allDone = useMemo(() =>
    Object.values(marketStatus).every(s => s === 'ok' || s === 'error'),
    [marketStatus]
  );

  // Auto-dismiss when all done or timed out
  useEffect(() => {
    if (allDone || timedOut) {
      const id = setTimeout(onReady, 600);
      return () => clearTimeout(id);
    }
  }, [allDone, timedOut, onReady]);

  const okCount = Object.values(marketStatus).filter(s => s === 'ok').length;
  const errorCount = Object.values(marketStatus).filter(s => s === 'error').length;
  const loadingCount = Object.values(marketStatus).filter(s => s === 'loading').length;
  const pendingCount = Object.values(marketStatus).filter(s => s === 'pending').length;

  return (
    <div className={`splash-screen ${allDone || timedOut ? 'splash-fade-out' : ''}`}>
      <div className="splash-content">
        <div className="splash-header">
          <div className="splash-logo">📊</div>
          <h1 className="splash-title">Global Market Hub</h1>
          <p className="splash-subtitle">Initializing {MARKETS.length} markets · {TOTAL_PANELS} panels</p>
        </div>

        <div className="splash-progress-bar">
          <div
            className="splash-progress-fill"
            style={{ width: `${((okCount + errorCount) / MARKETS.length) * 100}%` }}
          />
        </div>

        <div className="splash-stats">
          <span className="splash-stat splash-stat-ok">{okCount} loaded</span>
          {loadingCount > 0 && <span className="splash-stat splash-stat-loading">{loadingCount} fetching</span>}
          {pendingCount > 0 && <span className="splash-stat splash-stat-pending">{pendingCount} queued</span>}
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
                    {status === 'ok' ? '✅' : status === 'error' ? '❌' : status === 'loading' ? '⏳' : '⏸️'}
                  </span>
                  <span className="splash-market-name">{m.label}</span>
                  <span className="splash-market-count">{panels.length}</span>
                </div>
                <div className="splash-panels">
                  {panels.map(p => (
                    <span
                      key={p.id}
                      className={`splash-panel-dot splash-panel-dot--${status}`}
                      title={p.title}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {(allDone || timedOut) && (
          <div className="splash-done">
            {allDone ? 'All markets loaded' : 'Some markets timed out — continuing'}
          </div>
        )}
      </div>
    </div>
  );
}
