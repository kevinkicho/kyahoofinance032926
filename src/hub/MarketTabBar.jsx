import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MARKETS, SEARCH_INDEX } from './markets.config';
import { currencySymbols } from '../utils/constants';
import { useTheme } from './ThemeContext';
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

export default function MarketTabBar({ activeMarket, setActiveMarket, currency, setCurrency, onExport }) {
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEARCH_INDEX.filter(entry =>
      entry.label.toLowerCase().includes(q) ||
      entry.subTabs.some(s => s.toLowerCase().includes(q))
    );
  }, [query]);

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

  function handleSelect(marketId) {
    setActiveMarket(marketId);
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
      if (results[highlighted]) handleSelect(results[highlighted].marketId);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  function handleChange(e) {
    setQuery(e.target.value);
    setOpen(true);
  }

  return (
    <div className="market-tab-bar">
      <nav className="market-tabs">
        {MARKETS.map(m => (
          <button
            key={m.id}
            className={`market-tab${activeMarket === m.id ? ' active' : ''}`}
            onClick={() => setActiveMarket(m.id)}
          >
            <span className="market-tab-icon">{m.icon}</span>
            <span className="market-tab-label">{m.label}</span>
          </button>
        ))}
      </nav>
      <button
        className="hub-theme-toggle"
        onClick={toggle}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
      </button>
      <button
        className="hub-export-btn"
        onClick={onExport}
        title="Export view as PNG"
      >
        {'\uD83D\uDCF7'}
      </button>
      <div className="hub-search-wrap" ref={wrapRef}>
        <span className="hub-search-icon">&#128269;</span>
        <input
          ref={inputRef}
          className="hub-search-input"
          type="text"
          placeholder="Search markets..."
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {open && results.length > 0 && (
          <div className="hub-search-dropdown">
            {results.map((entry, i) => {
              const q = query.trim().toLowerCase();
              const matchingSubs = entry.subTabs.filter(s => s.toLowerCase().includes(q));
              return (
                <div
                  key={entry.marketId}
                  className={`hub-search-item${i === highlighted ? ' highlighted' : ''}`}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={e => { e.preventDefault(); handleSelect(entry.marketId); }}
                >
                  <div className="hub-search-item-label">
                    {entry.icon} {highlightMatch(entry.label, query.trim())}
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
        <label className="hub-currency-label">Currency</label>
        <select
          className="hub-currency-select"
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
