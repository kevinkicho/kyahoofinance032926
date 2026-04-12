// src/markets/watchlist/WatchlistMarket.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithRetry } from '../../utils/fetchWithRetry';
import BentoWrapper from '../../components/BentoWrapper';
import './WatchlistMarket.css';

const MAX_TICKERS = 20;
const LS_TICKERS = 'hub-watchlist-tickers';
const LS_METRICS = 'hub-watchlist-metrics';

const METRIC_SHORTCUTS = [
  { id: 'vix',       label: 'VIX',              market: 'derivatives', tab: 'vixterm'    },
  { id: 'dxy',       label: 'US Dollar (DXY)',   market: 'fx',         tab: 'dxy'        },
  { id: 'ust10y',    label: '10Y Treasury',      market: 'bonds',      tab: 'yieldcurve' },
  { id: 'btc',       label: 'Bitcoin',           market: 'crypto',     tab: 'overview'   },
  { id: 'gold',      label: 'Gold',              market: 'commodities',tab: 'price'      },
  { id: 'spx',       label: 'S&P 500',           market: 'equities',   tab: null          },
  { id: 'hyspread',  label: 'HY Spread',         market: 'credit',     tab: 'ighy'       },
  { id: 'feargreed', label: 'Fear & Greed',      market: 'sentiment',  tab: 'feargreed'  },
];

const SUB_TABS = [
  { id: 'tickers', label: 'My Tickers' },
  { id: 'metrics', label: 'My Metrics' },
];

const stopDrag = (e) => e.stopPropagation();

const LAYOUTS = {
  tickers: {
    lg: [
      { i: 'ticker-list', x: 0, y: 0, w: 12, h: 5 },
    ]
  },
  metrics: {
    lg: [
      { i: 'metric-cards', x: 0, y: 0, w: 12, h: 3 },
    ]
  },
};

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function WatchlistMarket({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('tickers');
  const [tickers, setTickers] = useState(() => loadJSON(LS_TICKERS, []));
  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [input, setInput] = useState('');
  const [favMetrics, setFavMetrics] = useState(() => loadJSON(LS_METRICS, []));
  const fetchedRef = useRef(new Set());

  useEffect(() => {
    localStorage.setItem(LS_TICKERS, JSON.stringify(tickers));
  }, [tickers]);

  useEffect(() => {
    localStorage.setItem(LS_METRICS, JSON.stringify(favMetrics));
  }, [favMetrics]);

  const fetchQuote = useCallback(async (ticker) => {
    setLoading(prev => ({ ...prev, [ticker]: true }));
    setErrors(prev => { const n = { ...prev }; delete n[ticker]; return n; });
    try {
      const res = await fetchWithRetry(`/api/summary/${encodeURIComponent(ticker)}`);
      const data = await res.json();
      setQuotes(prev => ({ ...prev, [ticker]: data }));
    } catch (err) {
      setErrors(prev => ({ ...prev, [ticker]: err.message }));
    } finally {
      setLoading(prev => ({ ...prev, [ticker]: false }));
    }
  }, []);

  useEffect(() => {
    tickers.forEach(t => {
      if (!fetchedRef.current.has(t)) {
        fetchedRef.current.add(t);
        fetchQuote(t);
      }
    });
    fetchedRef.current.forEach(t => {
      if (!tickers.includes(t)) fetchedRef.current.delete(t);
    });
  }, [tickers, fetchQuote]);

  const addTicker = useCallback(() => {
    const sym = input.trim().toUpperCase();
    if (!sym || tickers.includes(sym) || tickers.length >= MAX_TICKERS) return;
    setTickers(prev => [...prev, sym]);
    setInput('');
  }, [input, tickers]);

  const removeTicker = useCallback((sym) => {
    setTickers(prev => prev.filter(t => t !== sym));
    setQuotes(prev => { const n = { ...prev }; delete n[sym]; return n; });
    setErrors(prev => { const n = { ...prev }; delete n[sym]; return n; });
    fetchedRef.current.delete(sym);
  }, []);

  const toggleMetric = useCallback((id) => {
    setFavMetrics(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }, []);

  const handleMetricClick = useCallback((metric) => {
    if (onNavigate) onNavigate(metric.market, metric.tab);
  }, [onNavigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') addTicker();
  }, [addTicker]);

  const formatChange = (val) => {
    if (val == null) return null;
    const num = Number(val);
    return num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
  };

  const formatPct = (val) => {
    if (val == null) return null;
    const num = Number(val) * 100;
    return num > 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`;
  };

  const changeClass = (val) => {
    if (val == null) return 'watch-price-flat';
    const num = Number(val);
    if (num > 0) return 'watch-price-up';
    if (num < 0) return 'watch-price-down';
    return 'watch-price-flat';
  };

  const sortedMetrics = [...METRIC_SHORTCUTS].sort((a, b) => {
    const aFav = favMetrics.includes(a.id) ? 0 : 1;
    const bFav = favMetrics.includes(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  return (
    <div className="watch-market">
      <div className="watch-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`watch-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="watch-dashboard watch-dashboard--bento">
        <BentoWrapper layout={LAYOUTS[activeTab]} storageKey={`watchlist-${activeTab}-layout`}>
          {activeTab === 'tickers' && (
            <div key="ticker-list" className="watch-bento-card">
              <div className="watch-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">My Tickers</span>
                <span className="bento-panel-subtitle">{tickers.length}/{MAX_TICKERS}</span>
                <span className="bento-panel-title-spacer" />
              </div>
              <div className="bento-panel-content watch-panel-scroll" onMouseDown={stopDrag}>
                <div className="watch-add-bar">
                  <input
                    className="watch-add-input"
                    type="text"
                    placeholder="Add ticker (e.g. AAPL)"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={10}
                  />
                  <button
                    className="watch-add-btn"
                    onClick={addTicker}
                    disabled={!input.trim() || tickers.length >= MAX_TICKERS || tickers.includes(input.trim().toUpperCase())}
                  >
                    Add
                  </button>
                </div>

                {tickers.length === 0 ? (
                  <div className="watch-empty">No tickers added yet. Type a symbol above to start tracking.</div>
                ) : (
                  <table className="watch-ticker-table">
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>Change %</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickers.map(sym => {
                        const q = quotes[sym];
                        const isLoading = loading[sym];
                        const err = errors[sym];
                        const price = q?.price?.regularMarketPrice?.raw ?? q?.price?.regularMarketPrice;
                        const change = q?.price?.regularMarketChange?.raw ?? q?.price?.regularMarketChange;
                        const changePct = q?.price?.regularMarketChangePercent?.raw ?? q?.price?.regularMarketChangePercent;
                        const name = q?.price?.shortName || q?.price?.longName || '';

                        return (
                          <tr key={sym}>
                            <td style={{ fontWeight: 600 }}>{sym}</td>
                            <td style={{ color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isLoading ? <span className="watch-ticker-loading" /> : err ? '' : name}
                            </td>
                            <td>
                              {isLoading ? <span className="watch-ticker-loading" /> : err ? <span className="watch-ticker-error">{err}</span> : price != null ? Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                            </td>
                            <td className={changeClass(change)}>
                              {isLoading ? '' : err ? '' : formatChange(change) ?? '--'}
                            </td>
                            <td className={changeClass(changePct)}>
                              {isLoading ? '' : err ? '' : formatPct(changePct) ?? '--'}
                            </td>
                            <td>
                              <button className="watch-remove-btn" title="Remove" onClick={() => removeTicker(sym)}>
                                &#x2715;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
          {activeTab === 'metrics' && (
            <div key="metric-cards" className="watch-bento-card">
              <div className="watch-panel-title-row bento-panel-title-row">
                <span className="bento-panel-title">My Metrics</span>
                <span className="bento-panel-subtitle">Quick shortcuts</span>
                <span className="bento-panel-title-spacer" />
              </div>
              <div className="bento-panel-content watch-panel-scroll" onMouseDown={stopDrag}>
                <div className="watch-metrics-hint">Click ★ to favorite. Click card to navigate.</div>
                <div className="watch-metrics-grid">
                  {sortedMetrics.map(m => {
                    const isFav = favMetrics.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`watch-metric-card${isFav ? ' favorited' : ''}`}
                        onClick={() => handleMetricClick(m)}
                      >
                        <span className="watch-metric-label">{m.label}</span>
                        <button
                          className={`watch-metric-star${isFav ? ' active' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleMetric(m.id); }}
                          title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFav ? '\u2605' : '\u2606'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </BentoWrapper>
      </div>
    </div>
  );
}

export default React.memo(WatchlistMarket);