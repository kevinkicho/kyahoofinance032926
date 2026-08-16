import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import { MARKETS } from './markets.config';
import { MARKET_PANELS } from '../data/marketPanels';
import { searchHub } from './lib/searchMarkets';
import { currencySymbols } from '../utils/constants';
import { useTheme } from './ThemeContext';
import { useCurrency } from './CurrencyContext';
import { useDataContext } from './DataContext';
import { useToast } from './ToastContext';
import { usePanelHealth } from '../hooks/usePanelHealth';
import { logUserAction } from '../lib/logger';
import { readOperatorMode, writeOperatorMode, subscribeOperatorMode } from './lib/operatorMode';
import FredBudgetBadge from '../components/FredBudgetBadge/FredBudgetBadge';
import './MarketTabBar.css';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD', 'INR', 'CAD', 'AUD', 'BRL'];

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="hub-search-match">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function reportStatus(entry) {
  if (!entry) return 'unknown';
  if (typeof entry === 'string') return entry;
  return entry.status || 'unknown';
}

function PanelHealthPopover({ report, onClose, onJump }) {
  if (!report) return null;
  const color = report._color || reportStatus(report);
  const trueUi = report.uiOk === true || report.healthQuality === 'ui';
  const bridge = report.bridgeOnly === true || report.healthQuality === 'bridge' || color === 'bridge';
  const verdictClass = trueUi ? 'is-ok' : bridge ? 'is-bridge' : (report.fetchOk ? 'is-pending' : 'is-bad');
  const verdictText = trueUi
    ? 'True UI — fetch · display · confirm'
    : bridge
      ? 'Bridge only — data present; visible UI not proven'
      : report.fetchOk
        ? 'Incomplete — waiting for true UI paint'
        : 'Incomplete — fetch failed or hollow';
  return (
    <div className="panel-health-popover" role="dialog" onClick={e => e.stopPropagation()}>
      <div className="panel-health-popover-head">
        <strong>{report.title || report.panelId}</strong>
        <button type="button" className="panel-health-popover-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className={`panel-health-popover-verdict ${verdictClass}`}>
        {verdictText}
      </div>
      <ul className="panel-health-popover-gates">
        <li className={report.fetchOk ? 'ok' : 'bad'}>
          <span>{report.fetchOk ? '✓' : '✗'}</span> Fetch: {report.fetchDetail || (report.fetchOk ? 'ok' : 'fail')}
        </li>
        <li className={report.displayOk ? (bridge ? 'bridge' : 'ok') : 'bad'}>
          <span>{report.displayOk ? (bridge ? '≈' : '✓') : '✗'}</span> Display: {report.displayDetail || (report.displayOk ? 'ok' : 'fail')}
        </li>
        <li className={report.confirmOk ? (bridge ? 'bridge' : 'ok') : 'bad'}>
          <span>{report.confirmOk ? (bridge ? '≈' : '✓') : '✗'}</span> Confirm: {report.confirmDetail || (report.confirmOk ? 'ok' : 'fail')}
        </li>
        <li className={trueUi ? 'ok' : 'bad'}>
          <span>{trueUi ? '✓' : '✗'}</span> True UI: {trueUi ? 'real metrics/chart/table paint' : 'not proven (bridge or empty)'}
        </li>
      </ul>
      {onJump && (
        <button type="button" className="panel-health-popover-jump" onClick={() => onJump(report.marketId, report.panelId)}>
          Jump to panel
        </button>
      )}
    </div>
  );
}

function PanelDropdownItems({ marketId, onJump, panelHealth }) {
  const panels = MARKET_PANELS[marketId] || [];
  const [detailId, setDetailId] = useState(null);
  return panels.map(p => {
    const report = panelHealth?.[p.id];
    const status = reportStatus(report);
    // Prefer precomputed signal from usePanelHealth (toTopbarDot / derivePanelSignal).
    // Fallback: never map legacy status===ok to green without true UI — bridge is amber.
    const color = report?._color
      || (report?.uiOk === true || report?.healthQuality === 'ui' || report?.paintState === 'true_ui' ? 'ok'
        : report?.bridgeOnly || report?.healthQuality === 'bridge' || report?.paintVia === 'bridge' ? 'bridge'
          : status === 'stale' ? 'stale'
            : status === 'loading' ? 'loading'
              : status === 'pending' || status === 'unknown' || status === 'ok' ? 'pending'
                : 'null');
    const isOk = color === 'ok';
    const isBridge = color === 'bridge';
    const isStale = color === 'stale';
    const isPending = color === 'pending' || color === 'loading';
    const isBad = color === 'null';
    const tooltip = report?._tooltip || (
      isOk ? 'True UI — fetch · display · confirm'
        : isBridge ? 'Bridge only — visible UI not proven'
          : isStale ? 'Stale data'
            : isPending
              ? (report?.fetchOk
                ? 'Data fetched — open this tab to verify display'
                : (status === 'loading' ? 'Loading…' : 'Waiting for data…'))
              : `F${report?.fetchOk ? '✓' : '✗'} D${report?.displayOk ? '✓' : '✗'} C${report?.confirmOk ? '✓' : '✗'}`
    );
    const showDetail = detailId === p.id;
    return (
      <div key={p.id} className="market-panel-dropdown-row">
        <button
          type="button"
          className={`market-panel-dropdown-item${isBad ? ' panel-status-null' : ''}${isStale ? ' panel-status-stale' : ''}${isPending ? ' panel-status-loading' : ''}${isBridge ? ' panel-status-bridge' : ''}${isOk ? ' panel-status-ok' : ''}`}
          onClick={() => onJump(marketId, p.id)}
          title={`${p.title} — ${tooltip}`}
        >
          <span
            className="panel-dropdown-status-dot"
            data-status={color}
            role="button"
            tabIndex={0}
            title="Click for panel health detail"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDetailId(showDetail ? null : p.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setDetailId(showDetail ? null : p.id);
              }
            }}
          />
          <span className="panel-dropdown-title">{p.title}</span>
        </button>
        {showDetail && (
          <PanelHealthPopover
            report={typeof report === 'object' && report ? { ...report, marketId, panelId: p.id, title: p.title } : {
              marketId,
              panelId: p.id,
              title: p.title,
              status,
              fetchOk: false,
              displayOk: false,
              confirmOk: false,
              fetchDetail: 'no report',
              displayDetail: 'n/a',
              confirmDetail: 'n/a',
            }}
            onClose={() => setDetailId(null)}
            onJump={(m, id) => { setDetailId(null); onJump(m, id); }}
          />
        )}
      </div>
    );
  });
}

export default function MarketTabBar({ activeMarket, setActiveMarket, onExport, onExportData, onPopout, onRefresh, isRefreshing = false }) {
  const { currency, setCurrency } = useCurrency();
  const dataCtx = useDataContext();
  const { addToast } = useToast();
  const { historicalDate, setHistoricalDate, listSnapshotDates } = dataCtx || { historicalDate: null, setHistoricalDate: () => {}, listSnapshotDates: async () => [] };
  function handlePopout() {
    if (onPopout) {
      onPopout();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('popout', activeMarket);
    window.open(url.toString(), `popout-${activeMarket}`, 'width=1200,height=800,menubar=no,toolbar=no');
  }
  const { theme, toggle } = useTheme();
  const [operatorMode, setOperatorMode] = useState(() => readOperatorMode());
  useEffect(() => subscribeOperatorMode(setOperatorMode), []);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const settingsRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hoveredMarket, setHoveredMarket] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 40 });
  const closeTimerRef = useRef(null);
  const panelDropdownRef = useRef(null);

  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    if (auth) {
      return auth.onAuthStateChanged(u => {
        setUser(u);
      });
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (auth) {
      try {
        await signOut(auth);
        setDropdownOpen(false);
      } catch (e) {
        console.warn('Sign out failed:', e);
      }
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    if (auth && googleProvider) {
      try {
        await signInWithPopup(auth, googleProvider);
        setDropdownOpen(false);
      } catch (e) {
        console.warn('Sign in failed:', e);
        addToast(`Sign in failed: ${e.message || e}`, 'error');
      }
    } else {
      addToast('Firebase Auth is not configured in this build.', 'error');
    }
  }, [addToast]);

  // Global historical date picker (drives DataProvider.setHistoricalDate which seeds all markets from RTDB /history/{date})
  const [histDates, setHistDates] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    setHistLoading(true);
    // Try a few reliably snapshotted markets; take the first that returns dates.
    (async () => {
      const candidates = ['sentiment', 'bonds', 'analytics', 'globalMacro'];
      for (const c of candidates) {
        try {
          const ds = await listSnapshotDates(c);
          if (alive && Array.isArray(ds) && ds.length) {
            setHistDates(ds);
            return;
          }
        } catch {}
      }
      if (alive) setHistDates([]);
    })().finally(() => { if (alive) setHistLoading(false); });
    return () => { alive = false; };
  }, [listSnapshotDates]);

  const handleHistChange = (e) => {
    const v = e.target.value;
    setHistoricalDate(v || null);
  };
  const handleHistClear = () => setHistoricalDate(null);

  const results = useMemo(() => searchHub(query), [query]);

  // Ctrl+K → focus search input
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
      if (panelDropdownRef.current && !panelDropdownRef.current.contains(e.target)) {
        setHoveredMarket(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlighted(0);
  }, [results]);

  function handleSelect(marketId, subTab, panelId) {
    if (panelId) {
      handlePanelJump(marketId, panelId);
      setQuery('');
      setOpen(false);
      return;
    }
    setActiveMarket(marketId);
    if (subTab) {
      window.dispatchEvent(new CustomEvent('set-hub-subtab', { detail: { marketId, subTab } }));
    }
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
       if (results[highlighted]) {
         const entry = results[highlighted];
         handleSelect(entry.marketId, entry.matchingSub, entry.matchingPanelId);
       }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  function handleChange(e) {
    setQuery(e.target.value);
    setOpen(true);
  }

  const handleMarketClick = useCallback((e) => {
    const marketId = e.currentTarget.dataset.market;
    if (!marketId) return;
    if (marketId !== activeMarket) {
      logUserAction('tab-click', { from: activeMarket, to: marketId });
      setActiveMarket(marketId);
    }
    setHoveredMarket(null);
  }, [setActiveMarket, activeMarket]);

  const handlePanelJump = useCallback((marketId, panelId) => {
    logUserAction('panel-jump', { market: marketId, panel: panelId });
    setHoveredMarket(null);
    const doScroll = () => {
      const panels = MARKET_PANELS[marketId] || [];
      const panelInfo = panels.find(p => p.id === panelId);
      const titleText = panelInfo?.title;
      // Scope to the target market first — panel ids collide (kpi, metrics, …).
      let el = document.querySelector(
        `[data-market-id="${marketId}"] [data-panel-key="${panelId}"]`,
      );
      if (!el && titleText) {
        const scope = document.querySelector(`[data-market-id="${marketId}"]`) || document;
        const titles = scope.querySelectorAll('.bento-panel-title');
        for (const t of titles) {
          if (t.textContent === titleText || t.textContent.includes(titleText)) {
            el = t.closest('.bento-card, .react-grid-item');
            break;
          }
        }
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow 0.3s';
        const orig = el.style.boxShadow;
        el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
        setTimeout(() => { el.style.boxShadow = orig; }, 1200);
      }
    };
    if (activeMarket !== marketId) {
      setActiveMarket(marketId);
      setTimeout(doScroll, 100);
    } else {
      doScroll();
    }
  }, [activeMarket, setActiveMarket]);

  const handleTabMouseEnter = useCallback((e, marketId) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    logUserAction('tab-hover', { market: marketId });
    setHoveredMarket(marketId);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const parent = e.currentTarget.closest('.market-tab-bar');
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      setDropdownPosition({
        left: rect.left - parentRect.left,
        top: rect.bottom - parentRect.top - 2
      });
    }
  }, []);

  const handleTabMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredMarket(null);
    }, 150);
  }, []);

  const handleDropdownMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleDropdownMouseLeave = useCallback(() => {
    setHoveredMarket(null);
  }, []);

  const panelHealth = usePanelHealth(hoveredMarket);



  const handleExportCSV = useCallback(() => {
    onExportData('csv');
    setSettingsOpen(false);
  }, [onExportData]);

  const handleExportJSON = useCallback(() => {
    onExportData('json');
    setSettingsOpen(false);
  }, [onExportData]);

  const handleThemeToggle = useCallback(() => {
    toggle();
    setSettingsOpen(false);
  }, [toggle]);

  const handlePngExport = useCallback(() => {
    onExport();
    setSettingsOpen(false);
  }, [onExport]);

  return (
    <div className="market-tab-bar" role="banner">
      <a href="#main-content" className="sr-only sr-only-focusable">Skip to content</a>
      <nav className="market-tabs" role="tablist" aria-label="Market tabs">
        {MARKETS.map((m, i) => (
          <div
            key={m.id}
            className="market-tab-wrapper"
            onMouseEnter={(e) => handleTabMouseEnter(e, m.id)}
            onMouseLeave={handleTabMouseLeave}
          >
            <button
              role="tab"
              aria-selected={activeMarket === m.id}
              aria-label={`${m.label} market (${i + 1})`}
              className={`market-tab${activeMarket === m.id ? ' active' : ''}${hoveredMarket === m.id ? ' hovered' : ''}`}
              data-market={m.id}
              onClick={handleMarketClick}
              title={activeMarket === m.id ? 'Click to see panel list' : `Switch to ${m.label}`}
            >
              <span className="market-tab-label">{m.label}</span>
            </button>
          </div>
        ))}
      </nav>

      {hoveredMarket && MARKET_PANELS[hoveredMarket] && (
        <div
          ref={panelDropdownRef}
          className="market-panel-dropdown"
          style={{
            position: 'absolute',
            left: dropdownPosition.left,
            top: dropdownPosition.top,
            display: 'block',
          }}
          onMouseEnter={handleDropdownMouseEnter}
          onMouseLeave={handleDropdownMouseLeave}
        >
          <PanelDropdownItems marketId={hoveredMarket} onJump={handlePanelJump} panelHealth={panelHealth} />
        </div>
      )}
      <div className="hub-settings-menu" ref={settingsRef}>
        <button
          className="hub-settings-btn"
          onClick={() => setSettingsOpen(open => !open)}
          aria-label="Settings and utilities"
          aria-expanded={settingsOpen}
          title="Settings and utilities"
        >
          ⚙
        </button>
        {settingsOpen && (
          <div className="hub-settings-dropdown">
            <button className="hub-settings-item" onClick={handleThemeToggle}>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              className="hub-settings-item"
              onClick={() => {
                const next = !operatorMode;
                writeOperatorMode(next);
                setOperatorMode(next);
                setSettingsOpen(false);
                addToast?.(
                  next
                    ? 'Operator mode on — diagnostics & recovery tools (reload splash for full F/D/C verify)'
                    : 'Consumer mode — progressive load, product greens only',
                  'info',
                );
              }}
              title="Operator: diagnostic chips, recovery agent, verify splash. Consumer: progressive product UX."
            >
              {operatorMode ? '✓ Operator mode' : 'Operator mode'}
            </button>
            <button className="hub-settings-item" onClick={handlePngExport}>
              Export PNG
            </button>
            {onExportData && (
              <>
                <button className="hub-settings-item" onClick={handleExportCSV}>Download CSV</button>
                <button className="hub-settings-item" onClick={handleExportJSON}>Download JSON</button>
              </>
            )}
          </div>
        )}
      </div>
      {operatorMode && (
        <span className="hub-operator-badge" title="Operator mode — diagnostics enabled">OPS</span>
      )}
      <FredBudgetBadge enabled={operatorMode} />
      <button
        className={`hub-refresh-btn${isRefreshing ? ' is-refreshing' : ''}`}
        onClick={onRefresh}
        disabled={isRefreshing}
        title={isRefreshing ? 'Mass refresh in progress…' : 'Refresh all markets (same wave as load, force live)'}
        aria-label={isRefreshing ? 'Refreshing all markets' : 'Refresh all markets'}
        aria-busy={isRefreshing}
      >
        {isRefreshing ? '⟳' : '▶'}
      </button>
      {operatorMode && (
      <button
        className="hub-refresh-btn"
        type="button"
        disabled={isRefreshing}
        title="AI recovery agent — observe incomplete panels and refetch only what is needed (not a full-wave stampede)"
        aria-label="Run smart recovery agent"
        onClick={async () => {
          if (!dataCtx?.recoverPanels) {
            addToast?.('Recovery agent unavailable', 'error');
            return;
          }
          try {
            addToast?.('Recovery agent running…', 'info');
            const result = await dataCtx.recoverPanels({ maxCycles: 3, preferAi: true });
            addToast?.(
              `Recovery: ${result?.totalFetches ?? 0} fetch(es), ${result?.cycles ?? 0} cycle(s)`,
              'success',
            );
          } catch (e) {
            addToast?.(e?.message || 'Recovery failed', 'error');
          }
        }}
      >
        ✧
      </button>
      )}

      {/* Global Time Travel / Historical snapshot picker — drives setHistoricalDate so DataProvider seeds from RTDB history for the whole app */}
      <div className="hub-history-control" title={histDates.length ? `${histDates.length} historical dates available via RTDB` : 'Historical snapshots from daily RTDB (may be empty until scheduled runs populate history)'}>
        <span className="hub-hist-label">History</span>
        <select
          className={`hub-hist-select${historicalDate ? ' active' : ''}`}
          value={historicalDate || ''}
          onChange={handleHistChange}
          disabled={histLoading && !histDates.length}
        >
          <option value="">Live (latest)</option>
          {histDates.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {historicalDate && (
          <button className="hub-hist-clear" onClick={handleHistClear} title="Return to live data">×</button>
        )}
        {historicalDate && <span className="hub-hist-badge">HIST</span>}
        {!historicalDate && histDates.length > 0 && <span className="hub-hist-count">{histDates.length}</span>}
      </div>

      <button
        className="hub-popout-btn"
        onClick={handlePopout}
        title="Pop out to new window"
      >
        &#10697;
      </button>

      <div className="hub-user-profile" ref={profileRef}>
        <button
          className="hub-profile-btn"
          onClick={() => setDropdownOpen(d => !d)}
          aria-label="User profile menu"
          title={user ? `Logged in as ${user.email}` : 'Not signed in'}
        >
          {user ? (
            user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="hub-profile-img" referrerPolicy="no-referrer" />
            ) : (
              <div className="hub-profile-avatar">{user.email[0].toUpperCase()}</div>
            )
          ) : (
            <div className="hub-profile-avatar-placeholder">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </button>
        {dropdownOpen && (
          <div className="hub-profile-dropdown">
            {user ? (
              <>
                <div className="hub-user-info">
                  <div className="hub-user-name">{user.displayName || 'User'}</div>
                  <div className="hub-user-email">{user.email}</div>
                </div>
                <div className="hub-dropdown-divider" />
                <button className="hub-dropdown-item logout" onClick={handleSignOut}>
                  Log Off
                </button>
              </>
            ) : (
              <>
                <div className="hub-user-info">
                  <div className="hub-user-name">Guest User</div>
                  <div className="hub-user-email">Not signed in</div>
                </div>
                <div className="hub-dropdown-divider" />
                <button className="hub-dropdown-item login" onClick={handleSignIn}>
                  Sign In with Google
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="hub-search-wrap" ref={wrapRef} role="search">
        <input
          ref={inputRef}
          className="hub-search-input"
          type="text"
          role="combobox"
          aria-label="Search markets and sub-tabs (Ctrl+K)"
          aria-expanded={open && results.length > 0}
          aria-autocomplete="list"
          aria-controls="hub-search-results"
          placeholder="Search markets..."
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {open && results.length > 0 && (
          <div className="hub-search-dropdown" id="hub-search-results" role="listbox">
            {results.map((entry, i) => {
              const q = query.trim().toLowerCase();
              const matchingSubs = entry.subTabs.filter(s => s.toLowerCase().includes(q));
              return (
                <div
                  key={entry.marketId}
                  role="option"
                  aria-selected={i === highlighted}
                  className={`hub-search-item${i === highlighted ? ' highlighted' : ''}`}
                  onMouseEnter={() => setHighlighted(i)}
                    onMouseDown={e => { 
                      e.preventDefault(); 
                      handleSelect(entry.marketId, entry.matchingSub, entry.matchingPanelId);
                    }}
                >
                  <div className="hub-search-item-label">
                    {highlightMatch(entry.label, query.trim())}
                  </div>
                  {matchingSubs.length > 0 && (
                    <div className="hub-search-item-subs">
                      {matchingSubs.map((s, j) => (
                        <React.Fragment key={s}>
                          {j > 0 && ' \u00b7 '}
                          {highlightMatch(s, query.trim())}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {matchingSubs.length === 0 && (
                    <div className="hub-search-item-subs">
                      {entry.subTabs.join(' \u00b7 ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="hub-currency-picker">
        <label className="hub-currency-label" htmlFor="hub-currency-select">Currency</label>
        <select
          id="hub-currency-select"
          className="hub-currency-select"
          aria-label="Currency"
          value={currency}
          onChange={e => setCurrency(e.target.value)}
        >
          {CURRENCIES.map(c => (
            <option key={c} value={c}>{currencySymbols[c] || c} {c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
