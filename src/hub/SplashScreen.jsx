import React, { useState, useEffect, useRef, useMemo, Suspense, useCallback } from 'react';
import { MARKETS } from './markets.config';
import { MARKET_PANELS } from '../data/marketPanels';
import { MARKET_COMPONENTS } from './lazyMarketComponents';
import { useDataContext } from './DataContext';
import { useCurrency } from './CurrencyContext';
import {
  evaluateAllMarkets,
  countStatuses,
  panelChipKind,
  marketSplashKind,
  marketPanelTallies,
} from './lib/panelHealthEval';
import './SplashScreen.css';

const TOTAL_PANELS = Object.values(MARKET_PANELS).reduce((sum, p) => sum + p.length, 0);

const MARKET_KIND_ICON = {
  ok: '✅',
  bridge: '🟨',
  partial: '⚠️',
  error: '❌',
  loading: '⏳',
  pending: '⏳',
};

function GateRow({ ok, label, detail, tone }) {
  const rowTone = tone || (ok ? 'ok' : 'bad');
  return (
    <div className={`splash-gate-row splash-gate-row--${rowTone}`}>
      <span className="splash-gate-icon" aria-hidden>
        {rowTone === 'ok' ? '✓' : rowTone === 'bridge' ? '≈' : '✗'}
      </span>
      <div className="splash-gate-body">
        <div className="splash-gate-label">{label}</div>
        <div className="splash-gate-detail">{detail || (ok ? 'pass' : 'fail')}</div>
      </div>
    </div>
  );
}

function PanelDetailCard({ report, onClose }) {
  if (!report) return null;
  const kind = panelChipKind(report);
  const verdictClass =
    kind === 'ui' ? 'is-ok'
      : kind === 'bridge' ? 'is-bridge'
        : kind === 'pending' || kind === 'loading' || kind === 'stale' ? 'is-pending'
          : 'is-bad';
  const verdictText =
    kind === 'ui' ? 'OK — true UI (fetch · display · confirm)'
      : kind === 'bridge' ? 'Bridge only — data present; visible UI not proven'
        : kind === 'pending' ? 'Incomplete — waiting on paint/confirm'
          : kind === 'loading' ? 'Loading…'
            : kind === 'stale' ? 'Stale payload'
              : 'Incomplete — data fetch failed or hollow';
  return (
    <div className="splash-detail" role="dialog" aria-modal="true" aria-label={`Panel ${report.title}`}>
      <div className="splash-detail-header">
        <div>
          <div className="splash-detail-kicker">{report.marketId}</div>
          <h2 className="splash-detail-title">{report.title || report.panelId}</h2>
        </div>
        <button type="button" className="splash-detail-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className={`splash-detail-verdict ${verdictClass}`}>
        {verdictText}
      </div>
      <GateRow ok={!!report.fetchOk} label="1. Data fetch" detail={report.fetchDetail} />
      <GateRow
        ok={!!report.displayOk}
        tone={report.displayOk && (report.bridgeOnly || report.healthQuality === 'bridge') ? 'bridge' : undefined}
        label="2. UI display"
        detail={report.displayDetail}
      />
      <GateRow
        ok={!!report.confirmOk}
        tone={report.confirmOk && (report.bridgeOnly || report.healthQuality === 'bridge') ? 'bridge' : undefined}
        label="3. Display confirms data"
        detail={report.confirmDetail}
      />
      <GateRow
        ok={!!report.uiOk}
        label="4. True UI (non-bridge)"
        detail={report.uiOk ? 'real metrics/chart/table paint' : 'bridge-only, health shell, or hollow visible UI'}
      />
      <dl className="splash-detail-meta">
        {report.field && <><dt>Field</dt><dd><code>{report.field}</code></dd></>}
        {report.fieldPath && <><dt>Path</dt><dd><code>{report.fieldPath}</code></dd></>}
        {report.source && <><dt>Source</dt><dd>{report.source}</dd></>}
        {report.fetchedOn && <><dt>Fetched on</dt><dd>{report.fetchedOn}</dd></>}
        <dt>DOM</dt><dd>{report.elPresent ? 'mounted' : 'not mounted'}</dd>
        <dt>Live</dt><dd>{report.isLive ? 'yes' : 'no'}</dd>
        {report.healthQuality && <><dt>Quality</dt><dd>{report.healthQuality}</dd></>}
        {report.dataSource && <><dt>L1 source</dt><dd>{report.dataSource}</dd></>}
        {report.contract && (
          <>
            <dt>Contract</dt>
            <dd>{report.contract.ok ? 'ok' : `missing: ${(report.contract.missing || []).join(', ')}`}</dd>
          </>
        )}
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

function MarketDetailCard({ marketId, label, reports, panelIds, onSelectPanel, onClose }) {
  const list = (panelIds?.length
    ? panelIds.map((id) => reports?.[id]).filter(Boolean)
    : Object.values(reports || {}));
  const tallies = marketPanelTallies(reports, panelIds);
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
        {tallies.ui} true UI · {tallies.bridge} bridge · {tallies.bad} incomplete
        {' · '}click a panel for the four-gate breakdown
      </p>
      <div className="splash-detail-panel-list">
        {list.map(r => {
          const kind = panelChipKind(r);
          const itemTone =
            kind === 'ui' ? 'is-ok'
              : kind === 'bridge' ? 'is-bridge'
                : kind === 'pending' || kind === 'loading' || kind === 'stale' ? 'is-pending'
                  : 'is-bad';
          return (
            <button
              key={r.panelId}
              type="button"
              className={`splash-detail-panel-item ${itemTone}`}
              onClick={() => onSelectPanel(r)}
            >
              <span className={`splash-chip-dot splash-chip-dot--${kind}`} />
              <span className="splash-detail-panel-title">{r.title || r.panelId}</span>
              <span className="splash-detail-panel-flags">
                {r.fetchOk ? 'F' : '·'}{r.displayOk ? 'D' : '·'}{r.confirmOk ? 'C' : '·'}
                {r.uiOk ? 'U' : (kind === 'bridge' ? 'B' : '·')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Full DOM mount of every market — operator / F/D/C probe mode only. */
function useSplashVerifyMode() {
  const [on, setOn] = useState(() => {
    try {
      // Dynamic import avoided — keep splash light
      const q = new URLSearchParams(window.location.search);
      if (q.get('verify') === '1' || q.get('fdc') === '1' || q.get('operator') === '1') return true;
      if (localStorage.getItem('hub-operator-mode') === '1') return true;
      if (sessionStorage.getItem('hub-splash-verify') === '1') return true;
    } catch { /* ignore */ }
    return false;
  });
  useEffect(() => {
    const sync = () => {
      try {
        const q = new URLSearchParams(window.location.search);
        if (q.get('verify') === '1' || q.get('fdc') === '1' || q.get('operator') === '1') {
          setOn(true);
          return;
        }
        setOn(localStorage.getItem('hub-operator-mode') === '1'
          || sessionStorage.getItem('hub-splash-verify') === '1');
      } catch { setOn(false); }
    };
    window.addEventListener('hub-operator-mode', sync);
    return () => window.removeEventListener('hub-operator-mode', sync);
  }, []);
  return on;
}

function SplashScreenInner({ onReady }) {
  const dataCtx = useDataContext();
  const { getMarket, markets: allMarkets, recoverPanels } = dataCtx || {};
  const { currency, setCurrency } = useCurrency();
  const verifyMode = useSplashVerifyMode();
  const [elapsed, setElapsed] = useState(0);
  const [marketStatus, setMarketStatus] = useState(() =>
    Object.fromEntries(MARKETS.map(m => [m.id, 'pending']))
  );
  const [reportsByMarket, setReportsByMarket] = useState({});
  const [scanTick, setScanTick] = useState(0);
  // Progressive load: Enter is available immediately — wave continues in background.
  const [fading, setFading] = useState(false);
  const [selected, setSelected] = useState(null); // { type:'panel'|'market', ... }
  const [repairing, setRepairing] = useState(false);
  const [repairNote, setRepairNote] = useState('');
  const [autoEnterSec, setAutoEnterSec] = useState(null);
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
        const reports = evaluateAllMarkets(getMarket, allMarkets || dataCtx?.markets, {
          createShell: true,
        });
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

  // Health scan: full F/D/C only in verify mode (mounts all markets).
  // Progressive mode only tracks market payload status (no fake greens from
  // off-screen shells).
  useEffect(() => {
    if (!getMarket) return;
    const run = () => {
      if (dismissedRef.current) return;
      try {
        if (verifyMode) {
          // Full F/D/C + health shells allowed (operator / ?verify=1).
          const cache = evaluateAllMarkets(getMarket, allMarkets || dataCtx?.markets, {
            createShell: true,
          });
          setReportsByMarket(cache);
        } else {
          // Progressive: real L1 placeholder/contract scoring, no DOM / no shells.
          const cache = evaluateAllMarkets(getMarket, allMarkets || dataCtx?.markets, {
            dataOnly: true,
          });
          setReportsByMarket(cache);
        }
        setScanTick(n => n + 1);
      } catch (e) {
        console.warn('[Splash] evaluate failed:', e);
      }
    };
    run();
    const id = setInterval(run, verifyMode ? 1000 : 600);
    return () => clearInterval(id);
  }, [getMarket, allMarkets, dataCtx?.markets, verifyMode]);

  const counts = useMemo(() => countStatuses(reportsByMarket), [reportsByMarket, scanTick]);
  const okCount = Object.values(marketStatus).filter(s => s === 'ok').length;
  const errorCount = Object.values(marketStatus).filter(s => s === 'error').length;
  const loadingCount = Object.values(marketStatus).filter(s => s === 'loading').length;
  const marketsDone = okCount + errorCount;
  const marketPct = MARKETS.length ? (marketsDone / MARKETS.length) * 100 : 0;
  const uiPct = TOTAL_PANELS ? ((counts.okUi || 0) / TOTAL_PANELS) * 100 : 0;
  const bridgePct = TOTAL_PANELS ? ((counts.okBridge || 0) / TOTAL_PANELS) * 100 : 0;
  const footerHonest = verifyMode
    ? (`${counts.okUi || 0} true UI · ${counts.okBridge || 0} bridge · ${counts.bad} incomplete`
      + (counts.dataReady != null ? ` · ${counts.dataReady} data-ready` : '')
      + (counts.fetchFail != null ? ` (${counts.fetchFail} data / ${counts.pending || 0} paint)` : ''))
    : (`${marketsDone}/${MARKETS.length} markets ready`
      + (counts.dataReady != null ? ` · ${counts.dataReady}/${TOTAL_PANELS} panels have data` : '')
      + ' · paint as you open each tab');

  // Auto-enter shortly after first market has data (progressive, not real-time).
  // User can always click Enter immediately. Disable auto-enter in verify mode.
  const autoEnterStartedRef = useRef(false);
  useEffect(() => {
    if (verifyMode || dismissedRef.current || autoEnterStartedRef.current) return undefined;
    if (okCount + errorCount < 1) return undefined;
    autoEnterStartedRef.current = true;
    setAutoEnterSec(3);
    let left = 3;
    const tick = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(tick);
        setAutoEnterSec(0);
        if (!dismissedRef.current) dismiss(reportsByMarket);
        return;
      }
      setAutoEnterSec(left);
    }, 1000);
    return () => clearInterval(tick);
  }, [okCount, errorCount, verifyMode, dismiss, reportsByMarket]);

  const handleEnter = () => {
    setAutoEnterSec(null);
    dismiss(reportsByMarket);
  };

  return (
    <div className="splash-screen">
      {/* Full market mount only for F/D/C verify probes — progressive mode skips
          the multi-tab RGL thrash that caused false greens / blank charts. */}
      {verifyMode && (
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
      )}

      <div className={`splash-overlay ${fading ? 'splash-fade-out' : ''}`}>
        <div className="splash-content">
          <div className="splash-header">
            <div className="splash-logo" aria-hidden>📊</div>
            <h1 className="splash-title">Global Market Hub</h1>
            <p className="splash-subtitle">
              {verifyMode
                ? (<>Verify mode · {MARKETS.length} markets · {TOTAL_PANELS} panels ·{' '}
                    {counts.okUi || 0} true UI · {counts.okBridge || 0} bridge · {counts.bad} incomplete</>)
                : (<>Progressive load · {marketsDone}/{MARKETS.length} markets ready · {loadingCount} fetching ·{' '}
                    enter anytime — panels fill as cache arrives</>)}
            </p>
          </div>

          <div
            className="splash-progress-bar"
            title={verifyMode
              ? `${counts.okUi || 0} true UI + ${counts.okBridge || 0} bridge of ${TOTAL_PANELS}`
              : `${marketsDone} of ${MARKETS.length} markets with payload`}
          >
            {verifyMode ? (
              <>
                <div className="splash-progress-fill splash-progress-fill--ui" style={{ width: `${uiPct}%` }} />
                <div
                  className="splash-progress-fill splash-progress-fill--bridge"
                  style={{ width: `${bridgePct}%`, left: `${uiPct}%` }}
                />
              </>
            ) : (
              <div className="splash-progress-fill splash-progress-fill--ui" style={{ width: `${marketPct}%` }} />
            )}
          </div>

          <div className="splash-stats">
            {verifyMode ? (
              <>
                <span className="splash-stat splash-stat-ok" title="Real metrics/chart/table paint">
                  {counts.okUi || 0} true UI
                </span>
                <span className="splash-stat splash-stat-bridge">{counts.okBridge || 0} bridge</span>
                <span className="splash-stat splash-stat-error">{counts.bad} incomplete</span>
              </>
            ) : (
              <>
                <span className="splash-stat splash-stat-ok" title="Markets with a payload (disk/GCS/live)">
                  {okCount} ready
                </span>
                <span className="splash-stat splash-stat-loading">{loadingCount} fetching</span>
                {errorCount > 0 && (
                  <span className="splash-stat splash-stat-error">{errorCount} error</span>
                )}
              </>
            )}
            <span className="splash-stat splash-stat-time">{elapsed}s</span>
          </div>

          <p className="splash-criteria">
            {verifyMode
              ? 'Verify mode: green = true UI, amber = bridge. Progressive splash (default) enters without mounting every market.'
              : 'Enter anytime. Cache-first wave continues in the background; open a tab and panels fill as each market resolves. Not real-time — one progressive wave, then manual ▶ to refresh.'}
          </p>

          <div className="splash-grid">
            {MARKETS.map(m => {
              const loadStatus = marketStatus[m.id];
              const panels = MARKET_PANELS[m.id] || [];
              const panelIds = panels.map((p) => p.id);
              const reports = reportsByMarket[m.id] || {};
              const tallies = marketPanelTallies(reports, panelIds);
              const kind = verifyMode
                ? marketSplashKind({ marketLoadStatus: loadStatus, reports, panelIds })
                : (loadStatus === 'ok' ? 'ok'
                  : loadStatus === 'error' ? 'error'
                    : loadStatus === 'loading' ? 'loading' : 'pending');
              const countLabel = verifyMode
                ? (tallies.bridge > 0
                  ? `${tallies.ui} UI · ${tallies.bridge} br / ${tallies.total}`
                  : `${tallies.ui}/${tallies.total}`)
                : (loadStatus === 'ok' ? 'ready' : loadStatus === 'loading' ? '…' : loadStatus === 'error' ? 'err' : '—');
              return (
                <div key={m.id} className={`splash-market splash-market--${kind}`}>
                  <button
                    type="button"
                    className="splash-market-chip"
                    onClick={() => setSelected({
                      type: 'market',
                      marketId: m.id,
                      label: m.label,
                      reports,
                      panelIds,
                    })}
                    title={verifyMode
                      ? `${m.label}: ${tallies.ui} true UI, ${tallies.bridge} bridge, ${tallies.bad} incomplete`
                      : `${m.label}: ${loadStatus} — open after enter to paint panels`}
                  >
                    <span className="splash-market-icon">
                      {MARKET_KIND_ICON[kind] || '⏳'}
                    </span>
                    <span className="splash-market-name">{m.label}</span>
                    <span className="splash-market-count">{countLabel}</span>
                  </button>
                  {verifyMode && (
                  <div className="splash-panels" role="list">
                    {panels.map(p => {
                      const report = reports[p.id];
                      const st = panelChipKind(report, loadStatus);
                      const fdc = report
                        ? ` F${report.fetchOk ? '✓' : '✗'} D${report.displayOk ? '✓' : '✗'} C${report.confirmOk ? '✓' : '✗'} U${report.uiOk ? '✓' : '✗'}`
                        : '';
                      const kindLabel =
                        st === 'ui' ? 'true UI'
                          : st === 'bridge' ? 'bridge only'
                            : st === 'pending' ? 'paint pending'
                              : st === 'loading' ? 'loading'
                                : st === 'stale' ? 'stale'
                                  : 'incomplete';
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="listitem"
                          className={`splash-panel-chip splash-panel-chip--${st}`}
                          title={`${p.title}: ${kindLabel}${fdc}`}
                          onClick={() => setSelected({
                            type: 'panel',
                            report: report || {
                              panelId: p.id,
                              title: p.title,
                              marketId: m.id,
                              status: st === 'ui' ? 'ok' : st,
                            },
                          })}
                        >
                          <span className={`splash-chip-dot splash-chip-dot--${st}`} />
                          <span className="splash-panel-chip-label">{p.title}</span>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="splash-footer-actions">
            <div className={`splash-done splash-done--mixed`}>
              {footerHonest}
              {autoEnterSec != null && autoEnterSec > 0
                ? ` · auto-enter in ${autoEnterSec}s`
                : ''}
              {repairNote ? ` ${repairNote}` : ''}
            </div>
            <div className="splash-footer-btn-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {verifyMode && counts.bad > 0 && typeof recoverPanels === 'function' && (
                <button
                  type="button"
                  className="splash-enter-btn splash-enter-btn--ghost"
                  onClick={handleRepair}
                  disabled={repairing}
                  title="Observation-driven recovery agent"
                >
                  {repairing ? 'Repairing…' : `Repair incomplete (${counts.bad})`}
                </button>
              )}
              <button
                type="button"
                className="splash-enter-btn"
                onClick={handleEnter}
              >
                Enter app{autoEnterSec != null && autoEnterSec > 0 ? ` (${autoEnterSec})` : ''}
              </button>
            </div>
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
                  panelIds={selected.panelIds}
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
