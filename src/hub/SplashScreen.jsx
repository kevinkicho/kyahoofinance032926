import React, { useState, useEffect, useRef, useMemo, Suspense, useCallback } from 'react';
import { MARKETS } from './markets.config';
import { MARKET_PANELS } from '../data/marketPanels';
import { MARKET_COMPONENTS } from './lazyMarketComponents';
import { useDataContext } from './DataContext';
import { useCurrency } from './CurrencyContext';
import {
  evaluateAllMarkets,
  countStatuses,
} from './lib/panelHealthEval';
import './SplashScreen.css';

const TOTAL_PANELS = Object.values(MARKET_PANELS).reduce((sum, p) => sum + p.length, 0);

function GateRow({ ok, label, detail }) {
  return (
    <div className={`splash-gate-row ${ok ? 'splash-gate-row--ok' : 'splash-gate-row--bad'}`}>
      <span className="splash-gate-icon" aria-hidden>{ok ? '✓' : '✗'}</span>
      <div className="splash-gate-body">
        <div className="splash-gate-label">{label}</div>
        <div className="splash-gate-detail">{detail || (ok ? 'pass' : 'fail')}</div>
      </div>
    </div>
  );
}

function PanelDetailCard({ report, onClose }) {
  if (!report) return null;
  const ok = report.status === 'ok';
  return (
    <div className="splash-detail" role="dialog" aria-modal="true" aria-label={`Panel ${report.title}`}>
      <div className="splash-detail-header">
        <div>
          <div className="splash-detail-kicker">{report.marketId}</div>
          <h2 className="splash-detail-title">{report.title || report.panelId}</h2>
        </div>
        <button type="button" className="splash-detail-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className={`splash-detail-verdict ${ok ? 'is-ok' : 'is-bad'}`}>
        {ok
          ? (report.bridgeOnly || report.healthQuality === 'bridge'
            ? 'OK (bridge) — fetch complete; visible UI not proven'
            : 'OK — fetch · display · confirm')
          : 'Incomplete'}
      </div>
      <GateRow ok={!!report.fetchOk} label="1. Data fetch" detail={report.fetchDetail} />
      <GateRow ok={!!report.displayOk} label="2. UI display" detail={report.displayDetail} />
      <GateRow ok={!!report.confirmOk} label="3. Display confirms data" detail={report.confirmDetail} />
      {report.uiOk != null && (
        <GateRow
          ok={!!report.uiOk}
          label="4. True UI (non-bridge)"
          detail={report.uiOk ? 'real metrics/chart/table paint' : 'bridge-only or hollow visible UI'}
        />
      )}
      <dl className="splash-detail-meta">
        {report.field && <><dt>Field</dt><dd><code>{report.field}</code></dd></>}
        {report.fieldPath && <><dt>Path</dt><dd><code>{report.fieldPath}</code></dd></>}
        {report.source && <><dt>Source</dt><dd>{report.source}</dd></>}
        {report.fetchedOn && <><dt>Fetched on</dt><dd>{report.fetchedOn}</dd></>}
        <dt>DOM</dt><dd>{report.elPresent ? 'mounted' : 'not mounted'}</dd>
        <dt>Live</dt><dd>{report.isLive ? 'yes' : 'no'}</dd>
      </dl>
      {report.external?.length > 0 && (
        <div className="splash-detail-external">
          <div className="splash-detail-kicker">Upstream</div>
          <ul>
            {report.external.map((e, i) => (
              <li key={i}>{e.name}{e.seriesIds?.length ? ` (${e.seriesIds.slice(0, 6).join(', ')})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MarketDetailCard({ marketId, label, reports, onSelectPanel, onClose }) {
  const list = Object.values(reports || {});
  const ok = list.filter(r => r.status === 'ok').length;
  const bad = list.length - ok;
  return (
    <div className="splash-detail" role="dialog" aria-modal="true" aria-label={`${label} panels`}>
      <div className="splash-detail-header">
        <div>
          <div className="splash-detail-kicker">Market</div>
          <h2 className="splash-detail-title">{label}</h2>
        </div>
        <button type="button" className="splash-detail-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="splash-detail-rule">
        {ok} ok · {bad} incomplete · click a panel for the three-gate breakdown
      </p>
      <div className="splash-detail-panel-list">
        {list.map(r => (
          <button
            key={r.panelId}
            type="button"
            className={`splash-detail-panel-item ${r.status === 'ok' ? 'is-ok' : 'is-bad'}`}
            onClick={() => onSelectPanel(r)}
          >
            <span className={`splash-chip-dot splash-chip-dot--${r.status}`} />
            <span className="splash-detail-panel-title">{r.title || r.panelId}</span>
            <span className="splash-detail-panel-flags">
              {r.fetchOk ? 'F' : '·'}{r.displayOk ? 'D' : '·'}{r.confirmOk ? 'C' : '·'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SplashScreenInner({ onReady }) {
  const dataCtx = useDataContext();
  const { getMarket, markets: allMarkets, recoverPanels } = dataCtx || {};
  const { currency, setCurrency } = useCurrency();
  const [elapsed, setElapsed] = useState(0);
  const [marketStatus, setMarketStatus] = useState(() =>
    Object.fromEntries(MARKETS.map(m => [m.id, 'pending']))
  );
  const [reportsByMarket, setReportsByMarket] = useState({});
  const [scanTick, setScanTick] = useState(0);
  const [readyToEnter, setReadyToEnter] = useState(false);
  const [fading, setFading] = useState(false);
  const [selected, setSelected] = useState(null); // { type:'panel'|'market', ... }
  const [repairing, setRepairing] = useState(false);
  const [repairNote, setRepairNote] = useState('');
  const startTimeRef = useRef(Date.now());
  const dismissedRef = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const handleRepair = useCallback(async () => {
    if (!recoverPanels || repairing) return;
    setRepairing(true);
    setRepairNote('AI recovery agent observing incomplete panels…');
    try {
      const result = await recoverPanels({ maxCycles: 3, preferAi: true });
      const n = result?.totalFetches ?? 0;
      const planner = result?.history?.map((h) => h.planner).filter(Boolean).join(',') || 'local';
      setRepairNote(`Recovery finished — ${n} fetch(es), planner=${planner}. Re-scanning…`);
      setScanTick((t) => t + 1);
    } catch (e) {
      setRepairNote(e?.message || 'Recovery failed');
    } finally {
      setRepairing(false);
    }
  }, [recoverPanels, repairing]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Browser probe hook for scripts/probe-live-fdc.mjs (all 233 F/D/C).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.__kyahooPanelHealth = {
      version: 1,
      totalPanels: TOTAL_PANELS,
      getReports: () => reportsByMarket,
      getCounts: () => countStatuses(reportsByMarket),
      evaluateNow: () => {
        if (!getMarket) return { error: 'no getMarket' };
        const reports = evaluateAllMarkets(getMarket, allMarkets || dataCtx?.markets);
        const counts = countStatuses(reports);
        return { reports, counts, totalPanels: TOTAL_PANELS, at: new Date().toISOString() };
      },
    };
    return () => {
      try { delete window.__kyahooPanelHealth; } catch { /* ignore */ }
    };
  }, [reportsByMarket, getMarket, allMarkets, dataCtx?.markets, scanTick]);

  const dismiss = useCallback((cache) => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setFading(true);
    setTimeout(() => onReadyRef.current(cache || reportsByMarket), 500);
  }, [reportsByMarket]);

  // Market load status
  useEffect(() => {
    if (!getMarket) return;
    const id = setInterval(() => {
      const next = {};
      for (const m of MARKETS) {
        const ctx = getMarket(m.id);
        if (!ctx) next[m.id] = 'pending';
        else if (ctx.isLoading) next[m.id] = 'loading';
        else if (ctx.data) next[m.id] = 'ok';
        else if (ctx.error) next[m.id] = 'error';
        else next[m.id] = 'pending';
      }
      setMarketStatus(next);
    }, 400);
    return () => clearInterval(id);
  }, [getMarket]);

  const allLoaded = useMemo(
    () => Object.values(marketStatus).every(s => s === 'ok' || s === 'error'),
    [marketStatus]
  );

  // Continuous strict scan
  useEffect(() => {
    if (!getMarket) return;
    const run = () => {
      if (dismissedRef.current) return;
      try {
        const cache = evaluateAllMarkets(getMarket, allMarkets || dataCtx?.markets);
        setReportsByMarket(cache);
        setScanTick(n => n + 1);
      } catch (e) {
        console.warn('[Splash] evaluate failed:', e);
      }
    };
    run();
    const id = setInterval(run, 1000);
    return () => clearInterval(id);
  }, [getMarket, allMarkets, dataCtx?.markets]);

  // Ready when markets loaded AND every panel has been evaluated at least once
  // (status present). User must click Enter — we do NOT auto-dismiss.
  useEffect(() => {
    if (!allLoaded || dismissedRef.current) return;
    const panels = MARKETS.every(m => {
      const expected = MARKET_PANELS[m.id] || [];
      const reports = reportsByMarket[m.id] || {};
      return expected.every(p => reports[p.id] != null);
    });
    if (panels) setReadyToEnter(true);
  }, [allLoaded, reportsByMarket, scanTick]);

  // Soft timeout: allow Enter even if some panels never mount / wave is slow.
  // Keep short enough that local dev is never stuck on a 2‑minute wall.
  useEffect(() => {
    const id = setTimeout(() => setReadyToEnter(true), 20000);
    return () => clearTimeout(id);
  }, []);

  const counts = useMemo(() => countStatuses(reportsByMarket), [reportsByMarket, scanTick]);
  const okCount = Object.values(marketStatus).filter(s => s === 'ok').length;
  const errorCount = Object.values(marketStatus).filter(s => s === 'error').length;
  const loadingCount = Object.values(marketStatus).filter(s => s === 'loading').length;

  // As soon as any tab market has data, offer Enter — don't block the app on
  // full-wave completion (deps/aux markets can finish in the background).
  useEffect(() => {
    if (dismissedRef.current || readyToEnter) return;
    if (okCount + errorCount >= 1) setReadyToEnter(true);
  }, [marketStatus, readyToEnter, okCount, errorCount]);

  const handleEnter = () => {
    dismiss(reportsByMarket);
  };

  return (
    <div className="splash-screen">
      <div className="splash-backdrop" aria-hidden>
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

      <div className={`splash-overlay ${fading ? 'splash-fade-out' : ''}`}>
        <div className="splash-content">
          <div className="splash-header">
            <div className="splash-logo" aria-hidden>📊</div>
            <h1 className="splash-title">Global Market Hub</h1>
            <p className="splash-subtitle">
              Loading {MARKETS.length} markets · {TOTAL_PANELS} panels · {counts.ok} ok
              {counts.okBridge ? ` (${counts.okUi || 0} UI · ${counts.okBridge} bridge)` : ''}
              {' / '}{counts.bad} incomplete
              {counts.fetchFail != null ? ` (${counts.fetchFail} data · ${counts.pending || 0} paint)` : ''}
            </p>
          </div>

          <div className="splash-progress-bar">
            <div
              className="splash-progress-fill"
              style={{ width: `${TOTAL_PANELS ? (counts.ok / TOTAL_PANELS) * 100 : 0}%` }}
            />
          </div>

          <div className="splash-stats">
            <span className="splash-stat splash-stat-ok" title="Operational F/D/C ok (includes health-bridge completes)">
              {counts.ok} ok
            </span>
            {(counts.okBridge > 0 || counts.okUi > 0) && (
              <span className="splash-stat" title="UI = real paint · bridge = fetch-stamped hidden metrics only">
                {counts.okUi || 0} UI / {counts.okBridge || 0} bridge
              </span>
            )}
            <span className="splash-stat splash-stat-error" title={`${counts.fetchFail || 0} missing/hollow data · ${counts.pending || 0} data ok but UI not confirmed`}>
              {counts.bad} incomplete
              {counts.fetchFail != null ? ` · ${counts.fetchFail} data / ${counts.pending || 0} paint` : ''}
            </span>
            {loadingCount > 0 && <span className="splash-stat splash-stat-loading">{loadingCount} markets fetching</span>}
            <span className="splash-stat splash-stat-time">{elapsed}s</span>
          </div>

          <p className="splash-criteria">
            Dot status = fetch + display + confirm. Bridge-ok means data is present but UI may still look empty. Click a market or panel for detail.
          </p>

          <div className="splash-grid">
            {MARKETS.map(m => {
              const status = marketStatus[m.id];
              const panels = MARKET_PANELS[m.id] || [];
              const reports = reportsByMarket[m.id] || {};
              const okN = panels.filter(p => reports[p.id]?.status === 'ok').length;
              return (
                <div key={m.id} className={`splash-market splash-market--${status}`}>
                  <button
                    type="button"
                    className="splash-market-chip"
                    onClick={() => setSelected({ type: 'market', marketId: m.id, label: m.label, reports })}
                    title={`Open ${m.label} panel detail`}
                  >
                    <span className="splash-market-icon">
                      {status === 'ok' ? '✅' : status === 'error' ? '❌' : '⏳'}
                    </span>
                    <span className="splash-market-name">{m.label}</span>
                    <span className="splash-market-count">{okN}/{panels.length}</span>
                  </button>
                  <div className="splash-panels" role="list">
                    {panels.map(p => {
                      const report = reports[p.id];
                      const st = report?.status || (status === 'loading' ? 'loading' : 'pending');
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="listitem"
                          className={`splash-panel-chip splash-panel-chip--${st}`}
                          title={`${p.title}: ${st}${report ? ` (F${report.fetchOk ? '✓' : '✗'} D${report.displayOk ? '✓' : '✗'} C${report.confirmOk ? '✓' : '✗'})` : ''}`}
                          onClick={() => setSelected({ type: 'panel', report: report || { panelId: p.id, title: p.title, marketId: m.id, status: st } })}
                        >
                          <span className={`splash-chip-dot splash-chip-dot--${st}`} />
                          <span className="splash-panel-chip-label">{p.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="splash-footer-actions">
            {!readyToEnter && (
              <div className="splash-done splash-done--wait">
                {allLoaded
                  ? 'Data loaded — verifying panel streams (fetch · display · confirm)…'
                  : `Fetching markets… ${okCount + errorCount}/${MARKETS.length}`}
              </div>
            )}
            {readyToEnter && (
              <>
                <div className="splash-done">
                  Verification ready — {counts.ok}/{TOTAL_PANELS} panels ok.
                  Review red chips, then enter the app.
                  {repairNote ? ` ${repairNote}` : ''}
                </div>
                <div className="splash-footer-btn-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {counts.bad > 0 && typeof recoverPanels === 'function' && (
                    <button
                      type="button"
                      className="splash-enter-btn"
                      onClick={handleRepair}
                      disabled={repairing}
                      title="Observation-driven recovery agent (AI plan when available) — not a fixed retry list"
                      style={{ opacity: repairing ? 0.7 : 1, background: 'transparent', border: '1px solid currentColor' }}
                    >
                      {repairing ? 'Repairing…' : `Repair incomplete (${counts.bad})`}
                    </button>
                  )}
                  <button
                    type="button"
                    className="splash-enter-btn"
                    onClick={handleEnter}
                  >
                    Enter app — remove overlay &amp; lock in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {selected && (
          <div className="splash-detail-backdrop" onClick={() => setSelected(null)}>
            <div onClick={e => e.stopPropagation()}>
              {selected.type === 'panel' && (
                <PanelDetailCard report={selected.report} onClose={() => setSelected(null)} />
              )}
              {selected.type === 'market' && (
                <MarketDetailCard
                  marketId={selected.marketId}
                  label={selected.label}
                  reports={selected.reports}
                  onClose={() => setSelected(null)}
                  onSelectPanel={(report) => setSelected({ type: 'panel', report })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SplashScreen({ onReady }) {
  return <SplashScreenInner onReady={onReady} />;
}
