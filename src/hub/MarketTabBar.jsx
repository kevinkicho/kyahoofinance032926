import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MARKETS, SEARCH_INDEX } from './markets.config';
import { currencySymbols } from '../utils/constants';
import { useTheme } from './ThemeContext';
import { useCurrency } from './CurrencyContext';
import { useDataContext } from './DataContext';
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

export default function MarketTabBar({ activeMarket, setActiveMarket, onExport, onExportData, autoRefresh, onToggleRefresh, onRefresh }) {
  const { currency, setCurrency } = useCurrency();
  const dataCtx = useDataContext();
  const { historicalDate, setHistoricalDate, listSnapshotDates } = dataCtx || { historicalDate: null, setHistoricalDate: () => {}, listSnapshotDates: async () => [] };
  function handlePopout() {
    window.open('/?popout=' + activeMarket, '_blank', 'width=1200,height=800,menubar=no,toolbar=no');
  }
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter(entry =>
      entry.label.toLowerCase().includes(q) ||
      entry.subTabs.some(s => s.toLowerCase().includes(q)) ||
      entry.keywords?.some(k => k.toLowerCase().includes(q))
    );
  }, [query]);

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
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlighted(0);
  }, [results]);

  function handleSelect(marketId, subTab) {
    setActiveMarket(marketId);
    if (subTab && window.setHubSubTab) {
      window.setHubSubTab(subTab);
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
         const q = query.trim().toLowerCase();
         const matchingSub = entry.subTabs.find(s => s.toLowerCase().includes(q));
         handleSelect(entry.marketId, matchingSub);
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
    if (marketId) setActiveMarket(marketId);
  }, [setActiveMarket]);

  const handleExportCSV = useCallback(() => {
    onExportData('csv');
  }, [onExportData]);

  const handleExportJSON = useCallback(() => {
    onExportData('json');
  }, [onExportData]);

  return (
    <div className="market-tab-bar" role="banner">
      <a href="#main-content" className="sr-only sr-only-focusable">Skip to content</a>
      <nav className="market-tabs" role="tablist" aria-label="Market tabs">
        {MARKETS.map((m, i) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={activeMarket === m.id}
            aria-label={`${m.label} market (${i + 1})`}
            className={`market-tab${activeMarket === m.id ? ' active' : ''}`}
            data-market={m.id}
            onClick={handleMarketClick}
          >
            <span className="market-tab-label">{m.label}</span>
          </button>
        ))}
      </nav>
      <button
        className="hub-theme-toggle"
        onClick={toggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
      <button
        className="hub-export-btn"
        onClick={onExport}
        aria-label="Export view as PNG"
        title="Export view as PNG"
      >
        Export
      </button>
      {onExportData && (
        <>
          <button className="hub-export-btn" onClick={handleExportCSV} title="Download data as CSV">CSV</button>
          <button className="hub-export-btn" onClick={handleExportJSON} title="Download data as JSON">JSON</button>
        </>
      )}
      <button
        className="hub-refresh-btn"
        onClick={onRefresh}
        title="Refresh data now"
        aria-label="Refresh data now"
      >
        ▶
      </button>
      <button
        className="hub-refresh-toggle"
        onClick={onToggleRefresh}
        title={autoRefresh ? 'Auto-refresh ON (5 min)' : 'Auto-refresh OFF'}
        aria-label={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
      >
        {autoRefresh ? 'On' : 'Off'}
      </button>

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
                      const q = query.trim().toLowerCase();
                      const matchingSub = entry.subTabs.find(s => s.toLowerCase().includes(q));
                      handleSelect(entry.marketId, matchingSub); 
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
