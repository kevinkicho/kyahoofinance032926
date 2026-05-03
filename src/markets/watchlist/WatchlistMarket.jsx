// src/markets/watchlist/WatchlistMarket.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { fetchWithRetry } from '../../utils/fetchWithRetry';
import BentoWrapper from '../../components/BentoWrapper';
import { useMarketData } from '../../hub/DataContext';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import DataFooter from '../../components/DataFooter/DataFooter';
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

// KPI strip is now a real bento child at row 0 (h:2). Storage keys
// bumped because the layout schema changed.
const LAYOUTS = {
  tickers: {
    lg: [
      { i: 'kpi',         x: 0, y: 0, w: 12, h: 2 },
      { i: 'ticker-list', x: 0, y: 2, w: 12, h: 5 },
    ]
  },
  metrics: {
    lg: [
      { i: 'kpi',          x: 0, y: 0, w: 12, h: 2 },
      { i: 'metric-cards', x: 0, y: 2, w: 12, h: 3 },
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
  const watchlistData = useMarketData('watchlist');
  const quotes = watchlistData?.data || {};
  const isLoading = watchlistData?.isLoading || false;
  const errors = watchlistData?.error ? { global: watchlistData.error } : {};
  const [input, setInput] = useState('');
  const [favMetrics, setFavMetrics] = useState(() => loadJSON(LS_METRICS, []));
  const fetchedRef = useRef(new Set());

  useEffect(() => {
    localStorage.setItem(LS_TICKERS, JSON.stringify(tickers));
  }, [tickers]);

  useEffect(() => {
    localStorage.setItem(LS_METRICS, JSON.stringify(favMetrics));
  }, [favMetrics]);

  const refetchWatchlist = useCallback(() => {
    if (watchlistData?.refetch) {
        watchlistData.refetch({ tickers: tickers.join(',') });
    }
  }, [watchlistData, tickers]);

  useEffect(() => {
    refetchWatchlist();
  }, [tickers, refetchWatchlist]);

  const addTicker = useCallback(() => {
    const sym = input.trim().toUpperCase();
    if (!sym || tickers.includes(sym) || tickers.length >= MAX_TICKERS) return;
    setTickers(prev => [...prev, sym]);
    setInput('');
  }, [input, tickers]);

  const removeTicker = useCallback((sym) => {
    setTickers(prev => prev.filter(t => t !== sym));
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

  const derivData = useMarketData('derivatives');
  const fxData = useMarketData('fx');
  const bondData = useMarketData('bonds');
  const cryptoData = useMarketData('crypto');
  const commData = useMarketData('commodities');
  const creditData = useMarketData('credit');
  const sentimentData = useMarketData('sentiment');
  const equityEddData = useMarketData('equitiesDeepDive');

  const MARKET_CONTEXTS = {
    vix: derivData,
    dxy: fxData,
    ust10y: bondData,
    btc: cryptoData,
    gold: commData,
    spx: equityEddData,
    hyspread: creditData,
    feargreed: sentimentData,
  };

  const getSourceStatus = (metric) => {
    const ctx = MARKET_CONTEXTS[metric.id];
    if (!ctx) return 'nodata';
    if (ctx.isLoading) return 'loading';
    if (ctx.error) return 'error';
    if (ctx.isLive || ctx.isCurrent) return 'live';
    if (ctx.fetchedOn) return 'stale';
    return 'nodata';
  };

  const getLiveValue = (metric) => {
    switch (metric.id) {
      case 'vix': {
        const ts = derivData?.data?.vixTermStructure?.values;
        const vix = (ts && ts.length > 1) ? ts[1] : ts?.[0];
        if (vix != null) return Number(vix).toFixed(2);
        const hist = derivData?.data?.fredVixHistory?.values;
        if (hist?.length) return Number(hist[hist.length - 1]).toFixed(2);
        return null;
      }
      case 'dxy': {
        const dxyHist = fxData?.data?.dxyHistory?.values;
        if (dxyHist?.length) return Number(dxyHist[dxyHist.length - 1]).toFixed(2);
        const dxyFred = fxData?.data?.fredFxRates?.dollarIndex?.values;
        if (dxyFred?.length) return Number(dxyFred[dxyFred.length - 1]).toFixed(2);
        return null;
      }
      case 'ust10y': {
        const us10y = bondData?.data?.yieldCurveData?.US?.['10y'];
        if (us10y != null) return `${Number(us10y).toFixed(2)}%`;
        const notes10y = bondData?.data?.treasuryRates?.notes;
        if (notes10y != null) return `${Number(notes10y).toFixed(2)}%`;
        return null;
      }
      case 'btc': {
        const coins = cryptoData?.data?.coinMarketData?.coins;
        const btcObj = coins?.find(c => c.symbol === 'BTC');
        if (btcObj?.price != null) return `$${Number(btcObj.price).toLocaleString()}`;
        return null;
      }
      case 'gold': {
        const spot = commData?.data?.goldFuturesCurve?.spotPrice;
        if (spot != null) return `$${Number(spot).toLocaleString()}`;
        const sectorGold = commData?.data?.priceDashboardData
          ?.flatMap(s => s.commodities || [])
          ?.find(c => c.ticker === 'GC=F');
        if (sectorGold?.price != null) return `$${Number(sectorGold.price).toLocaleString()}`;
        return null;
      }
      case 'spx': {
        const sectors = equityEddData?.data?.sectorData?.sectors;
        const spy = sectors?.find(s => s.code === 'SPY');
        if (spy?.price != null) return Number(spy.price).toLocaleString();
        return null;
      }
      case 'hyspread': {
        const hy = creditData?.data?.spreadData?.current?.hySpread;
        return hy != null ? `${Math.round(hy)} bps` : null;
      }
      case 'feargreed': {
        const fg = sentimentData?.data?.fearGreedData?.score;
        return fg != null ? Math.round(fg) : null;
      }
      default: return null;
    }
  };

  const kpis = useMemo(() => {
    return [
      { label: 'VIX', value: getLiveValue({ id: 'vix' }) ?? '—', color: 'var(--text-primary)', trend: null, sublabel: 'Volatility' },
      { label: 'DXY', value: getLiveValue({ id: 'dxy' }) ?? '—', color: 'var(--text-primary)', trend: null, sublabel: 'US Dollar' },
      { label: 'US 10Y', value: getLiveValue({ id: 'ust10y' }) ?? '—', color: 'var(--text-primary)', trend: null, sublabel: 'Treasury' },
      { label: 'BTC', value: getLiveValue({ id: 'btc' }) ?? '—', color: 'var(--text-primary)', trend: null, sublabel: 'Crypto' },
    ];
  }, [derivData, fxData, bondData, cryptoData, commData, creditData, sentimentData, equityEddData]);

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
        <BentoWrapper layout={LAYOUTS[activeTab]} storageKey={`watchlist-${activeTab}-layout-v2`}>
          {/* KPI strip — full-width bento child at row 0 in both sub-tabs. */}
          <div key="kpi" className="watch-bento-card">
            <div className="watch-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Watchlist Key Metrics</span>
            </div>
            <div className="bento-panel-content watch-panel-scroll" onMouseDown={stopDrag}>
              <MarketKpiStrip kpis={kpis} bare />
            </div>
            <DataFooter
              source="Cross-market shortcuts"
              timestamp={watchlistData?.lastUpdated}
              isLive={watchlistData?.isLive}
              fetchLog={watchlistData?.fetchLog}
              error={watchlistData?.error}
              fetchedOn={watchlistData?.fetchedOn}
              isCurrent={watchlistData?.isCurrent}
            />
          </div>
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
                        const err = errors[sym] || errors.global;
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
              <DataFooter source="Yahoo Finance" timestamp={watchlistData?.lastUpdated} isLive={watchlistData?.isLive} fetchLog={watchlistData?.fetchLog || []} error={watchlistData?.error} fetchedOn={watchlistData?.fetchedOn} isCurrent={watchlistData?.isCurrent} />
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
                    const status = getSourceStatus(m);
                    const statusClass = `watch-metric-status-${status}`;
                    const statusLabel = { live: 'LIVE', stale: 'STALE', loading: '…', error: 'ERR', nodata: '—' }[status];
                    return (
                      <div
                        key={m.id}
                        className={`watch-metric-card${isFav ? ' favorited' : ''}`}
                        onClick={() => handleMetricClick(m)}
                      >
                        <div className="watch-metric-main">
                          <span className="watch-metric-label">{m.label}</span>
                          <span className={`watch-metric-value ${statusClass}`} title={status === 'error' ? (MARKET_CONTEXTS[m.id]?.error || 'Fetch error') : ''}>
                            {status === 'loading' ? <span className="watch-ticker-loading" /> : getLiveValue(m) ?? '—'}
                          </span>
                        </div>
                        <div className="watch-metric-right">
                          <span className={`watch-metric-status ${statusClass}`} title={`Source: ${m.label} — ${status}`}>{statusLabel}</span>
                          <button
                            className={`watch-metric-star${isFav ? ' active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleMetric(m.id); }}
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {isFav ? '\u2605' : '\u2606'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DataFooter source="Internal / FRED" timestamp={watchlistData?.lastUpdated} isLive={watchlistData?.isLive} fetchLog={watchlistData?.fetchLog || []} error={watchlistData?.error} fetchedOn={watchlistData?.fetchedOn} isCurrent={watchlistData?.isCurrent} />
            </div>
          )}
        </BentoWrapper>
      </div>
    </div>
  );
}

export default React.memo(WatchlistMarket);