import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { api } from '../../../lib/api';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './PortfolioTracker.css';

const PIE_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#0ea5e9', '#eab308', '#a855f7',
];

const PORTFOLIO_LS_KEY = 'equities-portfolio-v1';
const TICKER_RE = /^[A-Z0-9^][A-Z0-9.\-^=]{0,15}$/;

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((h) => h && typeof h.ticker === 'string' && Number.isFinite(Number(h.shares)) && Number(h.shares) > 0)
      .map((h) => ({ ticker: String(h.ticker).toUpperCase().trim(), shares: Number(h.shares) }));
  } catch {
    return [];
  }
}

function savePortfolio(pf) {
  try {
    localStorage.setItem(PORTFOLIO_LS_KEY, JSON.stringify(pf));
  } catch (e) {
    console.warn('[PortfolioTracker] persist failed:', e?.message);
  }
}

/** Strip API metadata keys so quote lookup stays ticker → quote. */
function stripQuoteMeta(data) {
  if (!data || typeof data !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_')) continue;
    if (v && typeof v === 'object' && (v.price != null || v.regularMarketPrice != null)) {
      out[k] = {
        price: v.price ?? v.regularMarketPrice ?? null,
        changePct: v.changePct ?? v.regularMarketChangePercent ?? null,
        change: v.change ?? v.regularMarketChange ?? null,
        marketCap: v.marketCap ?? null,
        name: v.name || v.longName || v.shortName || k,
        currency: v.currency || 'USD',
      };
    }
  }
  return out;
}

function ingestStockRow(out, row) {
  if (!row || typeof row !== 'object') return;
  const t = row.ticker || row.name;
  if (!t || row.isSectorGroup) return;
  const price = row.price ?? row.p ?? null;
  if (price == null) return;
  const key = String(t).toUpperCase();
  // Prefer existing live-quality entries; only fill gaps
  if (out[key]?.price != null) return;
  out[key] = {
    price,
    changePct: row.changePct ?? row.cp ?? null,
    marketCap: row.marketCap ?? row.mc ?? null,
    name: row.fullName || row.longName || (row.name !== t ? row.name : key),
  };
}

/**
 * Accept:
 *  - { AAPL: { price, changePct } } quote map
 *  - flatData-like array of stock rows
 *  - marketUniverse / displayUniverse: [{ children: [stock, ...] }, ...]
 *  - nested sector groups under regions
 */
function buildUniverseQuoteMap(universeQuotes) {
  if (!universeQuotes) return {};
  if (Array.isArray(universeQuotes)) {
    const out = {};
    const walk = (nodes) => {
      if (!Array.isArray(nodes)) return;
      for (const node of nodes) {
        if (!node) continue;
        if (Array.isArray(node.children) && node.children.length) {
          // Region or sector group — recurse, and also try the node itself
          walk(node.children);
        }
        ingestStockRow(out, node);
      }
    };
    walk(universeQuotes);
    return out;
  }
  if (typeof universeQuotes === 'object') {
    return stripQuoteMeta(universeQuotes);
  }
  return {};
}

export default function PortfolioTracker({
  universeQuotes,
  onTickerSelect,
}) {
  const { colors } = useTheme();
  const [portfolio, setPortfolio] = useState(loadPortfolio);
  const [tickerInput, setTickerInput] = useState('');
  const [sharesInput, setSharesInput] = useState('');
  const [liveQuotes, setLiveQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const inputRef = useRef(null);
  const fetchGen = useRef(0);

  useEffect(() => {
    savePortfolio(portfolio);
  }, [portfolio]);

  const fallbackQuotes = useMemo(() => buildUniverseQuoteMap(universeQuotes), [universeQuotes]);

  const tickersKey = useMemo(
    () => portfolio.map((h) => h.ticker).sort().join(','),
    [portfolio],
  );

  const fetchQuotes = useCallback(async (tickers) => {
    if (!tickers.length) {
      setLiveQuotes({});
      setFetchError(null);
      setLoading(false);
      return;
    }
    const gen = ++fetchGen.current;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.post('/api/stocks', { tickers });
      if (gen !== fetchGen.current) return;
      const cleaned = stripQuoteMeta(data);
      setLiveQuotes(cleaned);
      setLastFetched(new Date());
      const missing = tickers.filter((t) => cleaned[t]?.price == null);
      if (missing.length && missing.length === tickers.length) {
        setFetchError(`No quotes returned for ${missing.join(', ')}`);
      } else if (missing.length) {
        setFetchError(`Missing quotes: ${missing.join(', ')}`);
      } else {
        setFetchError(null);
      }
    } catch (e) {
      if (gen !== fetchGen.current) return;
      setFetchError(e?.message || 'Quote fetch failed');
    } finally {
      if (gen === fetchGen.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tickers = tickersKey ? tickersKey.split(',') : [];
    fetchQuotes(tickers);
    if (!tickers.length) return undefined;
    // Refresh every 60s while holdings exist
    const id = setInterval(() => fetchQuotes(tickers), 60_000);
    return () => {
      clearInterval(id);
      fetchGen.current += 1; // invalidate in-flight
    };
  }, [tickersKey, fetchQuotes]);

  const handleAdd = useCallback(() => {
    const ticker = tickerInput.trim().toUpperCase();
    const shares = parseFloat(sharesInput);
    if (!ticker || !TICKER_RE.test(ticker)) {
      setFetchError('Enter a valid ticker (e.g. AAPL, BRK-B, 7203.T)');
      return;
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      setFetchError('Enter a positive share count');
      return;
    }
    setPortfolio((prev) => {
      const idx = prev.findIndex((h) => h.ticker === ticker);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], shares: next[idx].shares + shares };
        return next;
      }
      return [...prev, { ticker, shares }];
    });
    setTickerInput('');
    setSharesInput('');
    setFetchError(null);
    inputRef.current?.focus();
  }, [tickerInput, sharesInput]);

  const handleRemove = useCallback((ticker) => {
    setPortfolio((prev) => prev.filter((h) => h.ticker !== ticker));
  }, []);

  const handleSharesChange = useCallback((ticker, raw) => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    setPortfolio((prev) =>
      prev.map((h) => (h.ticker === ticker ? { ...h, shares: n } : h)),
    );
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const holdings = useMemo(() => {
    return portfolio.map((h) => {
      const q = liveQuotes[h.ticker] || fallbackQuotes[h.ticker] || null;
      return {
        ...h,
        price: q?.price ?? null,
        changePct: q?.changePct ?? null,
        marketCap: q?.marketCap ?? null,
        name: q?.name || h.ticker,
        quoteSource: liveQuotes[h.ticker] ? 'live' : fallbackQuotes[h.ticker] ? 'universe' : null,
      };
    });
  }, [portfolio, liveQuotes, fallbackQuotes]);

  const totalValue = useMemo(
    () => holdings.reduce((sum, h) => sum + (h.price != null ? h.price * h.shares : 0), 0),
    [holdings],
  );

  const totalReturn = useMemo(() => {
    let valueNow = 0;
    holdings.forEach((h) => {
      if (h.price != null && h.changePct != null) valueNow += h.price * h.shares;
    });
    if (valueNow <= 0) return null;
    return holdings.reduce((sum, h) => {
      if (h.price == null || h.changePct == null) return sum;
      const weight = (h.price * h.shares) / valueNow;
      return sum + h.changePct * weight;
    }, 0);
  }, [holdings]);

  const dayPnl = useMemo(() => {
    if (totalValue <= 0 || totalReturn == null) return null;
    // Approx: value * (ret/100) / (1 + ret/100) ≈ prior-day contribution
    return totalValue * (totalReturn / 100) / (1 + totalReturn / 100);
  }, [totalValue, totalReturn]);

  const pieOption = useMemo(() => {
    if (!holdings.length || totalValue <= 0) return null;
    const data = holdings
      .filter((h) => h.price != null)
      .map((h, i) => ({
        name: h.ticker,
        value: Math.round(h.price * h.shares * 100) / 100,
        itemStyle: { color: PIE_PALETTE[i % PIE_PALETTE.length] },
      }));
    if (!data.length) return null;
    const textColor = colors?.textSecondary || '#94a3b8';
    const dimColor = colors?.textDim || '#475569';
    const border = colors?.cardBg || '#1e293b';
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p) =>
          `<b>${p.name}</b><br/>$${Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2 })}<br/>${p.percent.toFixed(1)}%`,
      },
      series: [
        {
          type: 'pie',
          radius: ['38%', '72%'],
          center: ['50%', '50%'],
          data,
          label: {
            color: textColor,
            fontSize: 10,
            formatter: '{b}\n{d}%',
          },
          labelLine: { lineStyle: { color: dimColor } },
          emphasis: {
            label: { show: true, fontSize: 12, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
          },
          itemStyle: { borderRadius: 4, borderColor: border, borderWidth: 1 },
        },
      ],
    };
  }, [holdings, totalValue, colors]);

  const pricedCount = holdings.filter((h) => h.price != null).length;

  return (
    <div className="pf-tracker" onMouseDown={(e) => e.stopPropagation()}>
      {/* KPI strip */}
      <div className="pf-kpis">
        <div className="pf-kpi">
          <span className="pf-kpi-label">Holdings</span>
          <span className="pf-kpi-value">{portfolio.length}</span>
        </div>
        <div className="pf-kpi">
          <span className="pf-kpi-label">Total Value</span>
          <span className="pf-kpi-value pf-kpi-value--blue">
            {totalValue > 0
              ? `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : '—'}
          </span>
        </div>
        <div className="pf-kpi">
          <span className="pf-kpi-label">Wtd Day %</span>
          <span
            className="pf-kpi-value"
            style={{ color: totalReturn == null ? undefined : totalReturn >= 0 ? '#4ade80' : '#f87171' }}
          >
            {totalReturn != null ? `${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%` : '—'}
          </span>
        </div>
        <div className="pf-kpi">
          <span className="pf-kpi-label">Est. Day P&amp;L</span>
          <span
            className="pf-kpi-value"
            style={{ color: dayPnl == null ? undefined : dayPnl >= 0 ? '#4ade80' : '#f87171' }}
          >
            {dayPnl != null
              ? `${dayPnl >= 0 ? '+' : ''}$${Math.abs(dayPnl).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : '—'}
          </span>
        </div>
        <div className="pf-kpi">
          <span className="pf-kpi-label">Priced</span>
          <span className="pf-kpi-value">
            {pricedCount}/{portfolio.length || 0}
          </span>
        </div>
      </div>

      {/* Add row */}
      <div className="pf-add-row">
        <input
          ref={inputRef}
          className="pf-input pf-input-ticker"
          type="text"
          placeholder="Ticker"
          value={tickerInput}
          onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          aria-label="Ticker symbol"
        />
        <input
          className="pf-input pf-input-shares"
          type="number"
          placeholder="Shares"
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
          onKeyDown={handleKeyDown}
          min="0"
          step="any"
          aria-label="Share quantity"
        />
        <button type="button" className="pf-add-btn" onClick={handleAdd} title="Add holding">
          +
        </button>
        <button
          type="button"
          className="pf-refresh-btn"
          onClick={() => fetchQuotes(portfolio.map((h) => h.ticker))}
          disabled={loading || !portfolio.length}
          title="Refresh quotes"
        >
          {loading ? '…' : '↻'}
        </button>
      </div>

      {fetchError && (
        <div className="pf-error" role="alert">
          {fetchError}
        </div>
      )}

      {/* Holdings table */}
      {holdings.length > 0 ? (
        <div className="pf-holdings">
          <div className="pf-holdings-header">
            <span className="pf-col pf-col-ticker">Ticker</span>
            <span className="pf-col pf-col-shares">Shares</span>
            <span className="pf-col pf-col-price">Price</span>
            <span className="pf-col pf-col-value">Value</span>
            <span className="pf-col pf-col-change">Chg %</span>
            <span className="pf-col pf-col-weight">Wt %</span>
            <span className="pf-col pf-col-action" />
          </div>
          {holdings.map((h, i) => {
            const val = h.price != null ? h.price * h.shares : null;
            const weight = totalValue > 0 && val != null ? (val / totalValue) * 100 : null;
            return (
              <div
                key={h.ticker}
                className="pf-holding-row"
                style={{ borderLeft: `3px solid ${PIE_PALETTE[i % PIE_PALETTE.length]}` }}
              >
                <span
                  className="pf-col pf-col-ticker pf-ticker-name"
                  title={h.name}
                  onClick={() =>
                    onTickerSelect?.({
                      ticker: h.ticker,
                      name: h.name,
                      sector: undefined,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onTickerSelect?.({ ticker: h.ticker, name: h.name });
                  }}
                  role={onTickerSelect ? 'button' : undefined}
                  tabIndex={onTickerSelect ? 0 : undefined}
                >
                  {h.ticker}
                </span>
                <span className="pf-col pf-col-shares">
                  <input
                    className="pf-shares-edit"
                    type="number"
                    min="0"
                    step="any"
                    value={h.shares}
                    onChange={(e) => handleSharesChange(h.ticker, e.target.value)}
                    aria-label={`${h.ticker} shares`}
                  />
                </span>
                <span className="pf-col pf-col-price">
                  {h.price != null ? `$${Number(h.price).toFixed(2)}` : loading ? '…' : '—'}
                </span>
                <span className="pf-col pf-col-value">
                  {val != null
                    ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—'}
                </span>
                <span
                  className="pf-col pf-col-change"
                  style={{
                    color: h.changePct != null ? (h.changePct >= 0 ? '#4ade80' : '#f87171') : undefined,
                  }}
                >
                  {h.changePct != null
                    ? `${h.changePct >= 0 ? '+' : ''}${Number(h.changePct).toFixed(2)}%`
                    : '—'}
                </span>
                <span className="pf-col pf-col-weight">
                  {weight != null ? `${weight.toFixed(1)}%` : '—'}
                </span>
                <span className="pf-col pf-col-action">
                  <button
                    type="button"
                    className="pf-remove-btn"
                    onClick={() => handleRemove(h.ticker)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pf-empty">
          Add a ticker and share count, then press Enter or +. Quotes load from Yahoo Finance.
        </div>
      )}

      {/* Chart + summary */}
      {(pieOption || totalValue > 0) && (
        <div className="pf-bottom">
          {totalValue > 0 && (
            <div className="pf-summary">
              <div className="pf-summary-row">
                <span className="pf-summary-label">Total Value</span>
                <span className="pf-summary-value">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {totalReturn != null && (
                <div className="pf-summary-row">
                  <span className="pf-summary-label">Wtd. Day Return</span>
                  <span
                    className="pf-summary-value"
                    style={{ color: totalReturn >= 0 ? '#4ade80' : '#f87171' }}
                  >
                    {totalReturn >= 0 ? '+' : ''}
                    {totalReturn.toFixed(2)}%
                  </span>
                </div>
              )}
              {lastFetched && (
                <div className="pf-summary-row pf-summary-meta">
                  <span className="pf-summary-label">Quotes</span>
                  <span className="pf-summary-value pf-summary-ts">
                    {loading ? 'updating…' : lastFetched.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
          {pieOption && (
            <div className="pf-chart-wrap">
              <SafeECharts
                option={pieOption}
                style={{ height: '100%', width: '100%' }}
                sourceInfo={{
                  title: 'Portfolio Allocation',
                  source: 'Yahoo Finance',
                  endpoint: '/api/stocks',
                  series: [],
                  updatedAt: lastFetched?.toISOString?.() || new Date().toISOString(),
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
