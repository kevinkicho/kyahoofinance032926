import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { MARKETS } from './markets.config';
import { MARKET_PANELS } from '../data/marketPanels';
import { MARKET_COMPONENTS } from './lazyMarketComponents';
import { useDataContext } from './DataContext';
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

function SplashScreenInner({ onReady }) {
  const dataCtx = useDataContext();
  const { getMarket } = dataCtx || {};
  const { currency, setCurrency } = useCurrency();
  const [elapsed, setElapsed] = useState(0);
  const [marketStatus, setMarketStatus] = useState(() =>
    Object.fromEntries(MARKETS.map(m => [m.id, 'pending']))
  );
  const [panelsFound, setPanelsFound] = useState(0);
  const [fading, setFading] = useState(false);
  const startTimeRef = useRef(Date.now());
  const cacheRef = useRef({});
  const dismissedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(id);
  }, []);

  const dismiss = (cache) => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setFading(true);
    setTimeout(() => onReadyRef.current(cache), 600);
  };

  // Timeout — force dismiss after 60s
  useEffect(() => {
    const id = setTimeout(() => {
      const finalScan = scanAllPanels();
      for (const [m, panels] of Object.entries(finalScan)) {
        cacheRef.current[m] = { ...(cacheRef.current[m] || {}), ...panels };
      }
      dismiss(cacheRef.current);
    }, 60000);
    return () => clearTimeout(id);
  }, []);

  // Track market loading status
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

  // Continuously scan DOM every 1s while splash is visible
  useEffect(() => {
    const id = setInterval(() => {
      if (dismissedRef.current) return;
      const scan = scanAllPanels();
      for (const [m, panels] of Object.entries(scan)) {
        cacheRef.current[m] = { ...(cacheRef.current[m] || {}), ...panels };
      }
      const totalPanels = Object.values(cacheRef.current).reduce((s, m) => s + Object.keys(m).length, 0);
      setPanelsFound(totalPanels);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Dismiss after all markets loaded AND every panel in every market has been
  // found in the DOM. This ensures the panel-health cache (used by the tab
  // dropdown dots) is complete before the user sees the dashboard.
  //
  // WHY per-market completeness (not just total count):
  //   A global total-count check can pass even when some markets have zero
  //   panels scanned (others over-scanned). The dropdown for that market would
  //   then show stale/wrong status because the cache is missing its entries.
  //
  // WHY a 30s max wait:
  //   Some conditional panels never render (no data source). Without a timeout
  //   the splash would hang forever. 30s is generous — data loads in ~5-10s.
  //
  // DO NOT REMOVE OR SIMPLIFY this logic without verifying that every market's
  // panel-health cache is complete after dismiss. See usePanelHealth.js.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!allLoaded || dismissedRef.current) return;
    const startedAt = Date.now();
    const MAX_WAIT = 30000;
    const check = () => {
      if (dismissedRef.current) return;
      const scan = scanAllPanels();
      for (const [m, panels] of Object.entries(scan)) {
        cacheRef.current[m] = { ...(cacheRef.current[m] || {}), ...panels };
      }
      const allComplete = MARKETS.every(m => {
        const marketPanels = MARKET_PANELS[m.id] || [];
        const scanned = cacheRef.current[m.id] || {};
        return marketPanels.every(p => scanned[p.id] != null);
      });
      if (allComplete || Date.now() - startedAt > MAX_WAIT) {
        dismiss(cacheRef.current);
        return;
      }
      setTimeout(check, 1000);
    };
    const id = setTimeout(check, 3000);
    return () => clearTimeout(id);
  }, [allLoaded]);

  const okCount = Object.values(marketStatus).filter(s => s === 'ok').length;
  const errorCount = Object.values(marketStatus).filter(s => s === 'error').length;
  const loadingCount = Object.values(marketStatus).filter(s => s === 'loading').length;

  return (
    <div className="splash-screen">
      {/* Markets render at full size behind frosted backdrop — DOM is fully painted */}
      <div className="splash-backdrop">
        {MARKETS.map(m => {
          const Component = MARKET_COMPONENTS[m.id];
          const ctx = getMarket?.(m.id);
          if (!Component || !ctx) return null;
          return (
            <div key={m.id} data-splash-market={m.id}>
              <Suspense fallback={null}>
                <Component centralData={ctx} currency={currency} setCurrency={setCurrency} onNavigate={() => {}} />
              </Suspense>
            </div>
          );
        })}
      </div>

      {/* Frosted glass overlay */}
      <div className={`splash-overlay ${fading ? 'splash-fade-out' : ''}`}>
        <div className="splash-content">
          <div className="splash-header">
            <div className="splash-logo">📊</div>
            <h1 className="splash-title">Global Market Hub</h1>
            <p className="splash-subtitle">
              Loading {MARKETS.length} markets · {TOTAL_PANELS} panels · {panelsFound} scanned
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
              const scanned = cacheRef.current[m.id] ? Object.keys(cacheRef.current[m.id]).length : 0;
              return (
                <div key={m.id} className={`splash-market splash-market--${status}`}>
                  <div className="splash-market-header">
                    <span className="splash-market-icon">
                      {status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳'}
                    </span>
                    <span className="splash-market-name">{m.label}</span>
                    <span className="splash-market-count">{scanned}/{panels.length}</span>
                  </div>
                  <div className="splash-panels">
                    {panels.map(p => {
                      const panelStatus = cacheRef.current[m.id]?.[p.id];
                      return (
                        <span
                          key={p.id}
                          className={`splash-panel-dot splash-panel-dot--${panelStatus || status}`}
                          title={`${p.title}${panelStatus ? ` (${panelStatus})` : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {allLoaded && (
            <div className="splash-done">
              {panelsFound >= TOTAL_PANELS
                ? `All ${TOTAL_PANELS} panels verified — opening dashboard`
                : `Data loaded — scanning remaining panels…`
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SplashScreen({ onReady }) {
  return <SplashScreenInner onReady={onReady} />;
}
