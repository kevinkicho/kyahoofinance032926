// src/markets/watchlist/WatchlistMarket.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMarketData } from '../../hub/DataContext';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import MarketPanelGrid from '../../panels/MarketPanelGrid';
import MetricValue from '../../components/MetricValue/MetricValue';
import './WatchlistMarket.css';

const MAX_TICKERS = 20;
const LS_TICKERS = 'hub-watchlist-tickers';
const LS_METRICS = 'hub-watchlist-metrics';

const METRIC_SHORTCUTS = [
  { id: 'vix',       label: 'VIX',              market: 'derivatives', tab: 'vixterm',    seriesKey: 'vix' },
  { id: 'dxy',       label: 'US Dollar (DXY)',   market: 'fx',         tab: 'dxy',        seriesKey: 'dxy' },
  { id: 'ust10y',    label: '10Y Treasury',      market: 'bonds',      tab: 'yieldcurve', seriesKey: '10y' },
  { id: 'btc',       label: 'Bitcoin',           market: 'crypto',     tab: 'overview',   seriesKey: 'cryptoPrice' },
  { id: 'gold',      label: 'Gold',              market: 'commodities',tab: 'price',      seriesKey: 'gold' },
  { id: 'spx',       label: 'S&P 500',           market: 'equities',   tab: null,         seriesKey: 'sp500' },
  { id: 'hyspread',  label: 'HY Spread',         market: 'credit',     tab: 'ighy',       seriesKey: 'hyOAS' },
  { id: 'feargreed', label: 'Fear & Greed',      market: 'sentiment',  tab: 'feargreed',  seriesKey: 'fearGreed' },
];

const SUB_TABS = [
  { id: 'tickers', label: 'My Tickers' },
  { id: 'metrics', label: 'My Metrics' },
];

// KPI strip is a real bento child at row 0 (h:2). Layout keys match
// MARKET_PANELS.watchlist (my-tickers / my-metrics / cross-alerts).
const LAYOUTS = {
  tickers: {
    lg: [
      { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
      { i: 'my-tickers', x: 0, y: 2, w: 12, h: 5 },
      { i: 'cross-alerts', x: 0, y: 7, w: 12, h: 4 },
    ]
  },
  metrics: {
    lg: [
      { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
      { i: 'my-metrics', x: 0, y: 2, w: 12, h: 3 },
      { i: 'cross-alerts', x: 0, y: 5, w: 12, h: 4 },
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
  // When the user hasn't added any tickers yet, the watchlist endpoint is
  // never called and isLive stays false, which paints "NO DATA" pills on
  // the empty state. Treat zero-tickers as an intentional, healthy state
  // so the badge says FETCHED and the inline "Add ticker" hint isn't
  // overshadowed by an error-looking pill.
  const isEmptyByDesign = (tickers?.length ?? 0) === 0;
  const effectiveIsLive = isEmptyByDesign ? true : !!watchlistData?.isLive;
  const effectiveSource = isEmptyByDesign ? 'No tickers yet' : 'Cross-market shortcuts';
  const tickersSource = isEmptyByDesign ? 'No tickers yet' : 'Yahoo Finance';
  const [input, setInput] = useState('');
  const [favMetrics, setFavMetrics] = useState(() => loadJSON(LS_METRICS, []));
  const fetchedRef = useRef(new Set());

  useEffect(() => {
    localStorage.setItem(LS_TICKERS, JSON.stringify(tickers));
  }, [tickers]);

  useEffect(() => {
    localStorage.setItem(LS_METRICS, JSON.stringify(favMetrics));
  }, [favMetrics]);

  const refetchRef = useRef();
  refetchRef.current = watchlistData?.refetch;

  const tickersStr = tickers.join(',');

  useEffect(() => {
    if (tickers.length > 0 && refetchRef.current) {
      refetchRef.current({ tickers: tickersStr });
    }
  }, [tickersStr]);

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

  const crossMarketAlerts = useMemo(() => {
    const rows = [];
    const toNum = v => v == null || Number.isNaN(Number(v)) ? null : Number(v);
    const push = row => rows.push(row);
    const vix = toNum(getLiveValue({ id: 'vix' }));
    push({
      signal: 'Volatility',
      value: vix != null ? vix.toFixed(2) : '—',
      read: vix == null ? 'No VIX snapshot' : vix >= 25 ? 'Risk-off pressure' : vix >= 18 ? 'Elevated watch' : 'Contained',
      severity: vix == null ? 'muted' : vix >= 25 ? 'high' : vix >= 18 ? 'medium' : 'low',
      target: METRIC_SHORTCUTS.find(m => m.id === 'vix'),
    });
    const dxyHist = fxData?.data?.dxyHistory?.values || fxData?.data?.fredFxRates?.dollarIndex?.values || [];
    const dxy = toNum(dxyHist.at?.(-1));
    const dxyPrev = toNum(dxyHist.at?.(-22));
    const dxyMo = dxy != null && dxyPrev != null ? ((dxy / dxyPrev) - 1) * 100 : null;
    push({
      signal: 'US Dollar',
      value: dxy != null ? dxy.toFixed(2) : '—',
      read: dxyMo == null ? 'No 1m read' : `${dxyMo >= 0 ? '+' : ''}${dxyMo.toFixed(1)}% 1m`,
      severity: dxyMo == null ? 'muted' : Math.abs(dxyMo) >= 3 ? 'medium' : 'low',
      target: METRIC_SHORTCUTS.find(m => m.id === 'dxy'),
    });
    const hy = toNum(creditData?.data?.spreadData?.current?.hySpread);
    push({
      signal: 'HY credit',
      value: hy != null ? `${Math.round(hy)} bps` : '—',
      read: hy == null ? 'No spread snapshot' : hy >= 500 ? 'Stress' : hy >= 350 ? 'Caution' : 'Benign',
      severity: hy == null ? 'muted' : hy >= 500 ? 'high' : hy >= 350 ? 'medium' : 'low',
      target: METRIC_SHORTCUTS.find(m => m.id === 'hyspread'),
    });
    const fg = toNum(sentimentData?.data?.fearGreedData?.score);
    push({
      signal: 'Fear & Greed',
      value: fg != null ? Math.round(fg) : '—',
      read: fg == null ? 'No sentiment snapshot' : fg >= 75 ? 'Extreme greed' : fg <= 25 ? 'Extreme fear' : 'Neutral range',
      severity: fg == null ? 'muted' : fg >= 75 || fg <= 25 ? 'medium' : 'low',
      target: METRIC_SHORTCUTS.find(m => m.id === 'feargreed'),
    });
    const btc = cryptoData?.data?.coinMarketData?.coins?.find(c => c.symbol === 'BTC');
    const btcChange = toNum(btc?.change24h ?? btc?.percentChange24h ?? btc?.changePct24h);
    push({
      signal: 'Bitcoin',
      value: btc?.price != null ? `$${Number(btc.price).toLocaleString()}` : '—',
      read: btcChange == null ? 'No 24h read' : `${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(1)}% 24h`,
      severity: btcChange == null ? 'muted' : Math.abs(btcChange) >= 5 ? 'medium' : 'low',
      target: METRIC_SHORTCUTS.find(m => m.id === 'btc'),
    });
    const gold = commData?.data?.priceDashboardData?.flatMap(s => s.commodities || [])?.find(c => c.ticker === 'GC=F');
    push({
      signal: 'Gold',
      value: gold?.price != null ? `$${Number(gold.price).toLocaleString()}` : getLiveValue({ id: 'gold' }) ?? '—',
      read: gold?.change1d != null ? `${Number(gold.change1d) >= 0 ? '+' : ''}${Number(gold.change1d).toFixed(1)}% 1d` : 'Safe-haven watch',
      severity: gold?.change1d != null && Math.abs(Number(gold.change1d)) >= 2 ? 'medium' : 'low',
      target: METRIC_SHORTCUTS.find(m => m.id === 'gold'),
    });
    return rows;
  }, [derivData, fxData, creditData, sentimentData, cryptoData, commData]);

  const tickersBody = (
    <>
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
                    {isLoading ? (
                      <span className="watch-ticker-loading" />
                    ) : err ? (
                      <span className="watch-ticker-error">{err}</span>
                    ) : price != null ? (
                      <MetricValue
                        value={price}
                        seriesKey="watchlistPrice"
                        timestamp={watchlistData?.lastUpdated}
                        format={() => Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      />
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className={changeClass(change)}>
                    {isLoading ? '' : err ? '' : change != null ? (
                      <MetricValue
                        value={change}
                        seriesKey="watchlistPrice"
                        timestamp={watchlistData?.lastUpdated}
                        format={() => formatChange(change) ?? '--'}
                      />
                    ) : (
                      '--'
                    )}
                  </td>
                  <td className={changeClass(changePct)}>
                    {isLoading ? '' : err ? '' : changePct != null ? (
                      <MetricValue
                        value={changePct}
                        seriesKey="watchlistPrice"
                        timestamp={watchlistData?.lastUpdated}
                        format={() => formatPct(changePct) ?? '--'}
                      />
                    ) : (
                      '--'
                    )}
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
    </>
  );

  const metricsBody = (
    <>
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
                  {status === 'loading' ? (
                    <span className="watch-ticker-loading" />
                  ) : (
                    <MetricValue
                      value={getLiveValue(m)}
                      seriesKey={m.seriesKey}
                      timestamp={MARKET_CONTEXTS[m.id]?.lastUpdated}
                      format={v => v ?? '—'}
                    />
                  )}
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
    </>
  );

  const crossAlertsBody = (
      <table className="watch-ticker-table">
        <thead>
          <tr>
            <th>Signal</th>
            <th>Value</th>
            <th>Read</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          {crossMarketAlerts.map(row => (
            <tr key={row.signal} onClick={() => row.target && handleMetricClick(row.target)} style={{ cursor: row.target ? 'pointer' : 'default' }}>
              <td style={{ fontWeight: 600 }}>{row.signal}</td>
              <td>
                <MetricValue
                  value={row.value}
                  seriesKey={row.target?.seriesKey}
                  timestamp={MARKET_CONTEXTS[row.target?.id]?.lastUpdated || watchlistData?.lastUpdated}
                  format={v => v ?? '—'}
                />
              </td>
              <td style={{ color: 'var(--text-muted)' }}>{row.read}</td>
              <td>
                <span
                  className={`watch-metric-status watch-metric-status-${row.severity === 'high' ? 'error' : row.severity === 'medium' ? 'stale' : row.severity === 'muted' ? 'nodata' : 'live'}`}
                >
                  {row.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  );

  const panelOnly = activeTab === 'tickers' ? ['kpi', 'my-tickers', 'cross-alerts'] : ['kpi', 'my-metrics', 'cross-alerts'];

  const panelCtx = useMemo(() => {
    const bodies = {
      kpi: <MarketKpiStrip kpis={kpis} bare />,
      'my-tickers': tickersBody,
      'my-metrics': metricsBody,
      'cross-alerts': crossAlertsBody,
    };
    return {
      __render: (panelId) => bodies[panelId] ?? null,
      __live: {
        kpi: effectiveIsLive,
        'my-tickers': effectiveIsLive,
        'my-metrics': !!watchlistData?.isLive,
        'cross-alerts': effectiveIsLive,
      },
      __subtitle: {
        'my-tickers': `${tickers.length}/${MAX_TICKERS}`,
        'my-metrics': 'Quick shortcuts',
        'cross-alerts': `${crossMarketAlerts.filter(row => row.severity !== 'low' && row.severity !== 'muted').length} active watch signals`,
      },
      __source: {
        kpi: effectiveSource,
        'my-tickers': tickersSource,
        'my-metrics': 'Internal / FRED',
        'cross-alerts': 'Internal cross-market snapshots',
      },
    };
  }, [
    kpis, tickersBody, metricsBody, effectiveIsLive, effectiveSource, tickersSource,
    tickers.length, watchlistData?.isLive, crossAlertsBody, crossMarketAlerts,
  ]);

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
        <MarketPanelGrid
          marketId="watchlist"
          layout={LAYOUTS[activeTab]}
          storageKey={`watchlist-${activeTab}-layout-v5`}
          accent="watchlist"
          ctx={panelCtx}
          only={panelOnly}
          provenance={{
            timestamp: watchlistData?.lastUpdated,
            isCurrent: watchlistData?.isCurrent,
            fetchedOn: watchlistData?.fetchedOn,
            fetchLog: watchlistData?.fetchLog,
            error: watchlistData?.error,
            isLoading,
          }}
        />
      </div>
    </div>
  );
}

export default React.memo(WatchlistMarket);
