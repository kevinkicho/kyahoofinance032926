import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { api } from '../../../lib/api';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import DataFooter from '../../../components/DataFooter/DataFooter';
import './PortfolioTracker.css';

const PIE_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#f43f5e', '#0ea5e9', '#eab308', '#a855f7',
];

const PORTFOLIO_LS_KEY = 'equities-portfolio-v1';

function loadPortfolio() {
  try {
    const raw = localStorage.getItem(PORTFOLIO_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function savePortfolio(pf) {
  try { localStorage.setItem(PORTFOLIO_LS_KEY, JSON.stringify(pf)); }
  catch (e) { console.warn('[PortfolioTracker] persist failed:', e?.message); }
}

export default function PortfolioTracker({ indexQuotes, onTickerSelect }) {
  const { colors } = useTheme();
  const [portfolio, setPortfolio] = useState(loadPortfolio);
  const [tickerInput, setTickerInput] = useState('');
  const [sharesInput, setSharesInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { savePortfolio(portfolio); }, [portfolio]);

  const handleAdd = useCallback(() => {
    const ticker = tickerInput.trim().toUpperCase();
    const shares = parseFloat(sharesInput);
    if (!ticker || isNaN(shares) || shares <= 0) return;
    setPortfolio(prev => {
      const idx = prev.findIndex(h => h.ticker === ticker);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], shares: next[idx].shares + shares };
        return next;
      }
      return [...prev, { ticker, shares }];
    });
    setTickerInput('');
    setSharesInput('');
    inputRef.current?.focus();
  }, [tickerInput, sharesInput]);

  const handleRemove = useCallback((ticker) => {
    setPortfolio(prev => prev.filter(h => h.ticker !== ticker));
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleAdd();
  }, [handleAdd]);

  const tickersToFetch = useMemo(() => portfolio.map(h => h.ticker), [portfolio]);

  const [liveQuotes, setLiveQuotes] = useState({});
  useEffect(() => {
    if (!tickersToFetch.length) { setLiveQuotes({}); return; }
    let cancelled = false;
    api.post('/api/stocks', { tickers: tickersToFetch })
      .then(data => { if (!cancelled) setLiveQuotes(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tickersToFetch.join(',')]);

  const holdings = useMemo(() => {
    return portfolio.map(h => {
      const q = liveQuotes[h.ticker];
      const price = q?.price ?? null;
      const changePct = q?.changePct ?? null;
      const marketCap = q?.marketCap ?? null;
      return { ...h, price, changePct, marketCap };
    });
  }, [portfolio, liveQuotes]);

  const totalValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.price != null ? h.price * h.shares : 0), 0);
  }, [holdings]);

  const totalReturn = useMemo(() => {
    let valueNow = 0;
    let countWithReturn = 0;
    holdings.forEach(h => {
      if (h.price != null && h.changePct != null) {
        valueNow += h.price * h.shares;
        countWithReturn++;
      }
    });
    if (!countWithReturn) return null;
    const weightedReturn = holdings.reduce((sum, h) => {
      if (h.price == null || h.changePct == null) return sum;
      const weight = (h.price * h.shares) / valueNow;
      return sum + h.changePct * weight;
    }, 0);
    return weightedReturn;
  }, [holdings]);

  const pieOption = useMemo(() => {
    if (!holdings.length || totalValue === 0) return null;
    const data = holdings
      .filter(h => h.price != null)
      .map((h, i) => ({
        name: h.ticker,
        value: Math.round(h.price * h.shares * 100) / 100,
        itemStyle: { color: PIE_PALETTE[i % PIE_PALETTE.length] },
      }));
    if (!data.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p) => `<b>${p.name}</b><br/>$${p.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}<br/>${p.percent.toFixed(1)}%`,
      },
      series: [{
        type: 'pie',
        radius: ['35%', '70%'],
        center: ['50%', '50%'],
        data,
        label: {
          color: colors.textSecondary,
          fontSize: 10,
          formatter: '{b}\n{d}%',
        },
        labelLine: { lineStyle: { color: colors.textDim } },
        emphasis: {
          label: { show: true, fontSize: 12, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
        itemStyle: { borderRadius: 4, borderColor: colors.cardBg, borderWidth: 1 },
      }],
    };
  }, [holdings, totalValue, colors]);

  return (
    <div className="eq-panel-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="eq-panel-title-row bento-panel-title-row">
        <span className="eq-panel-title">Portfolio Tracker</span>
        <span className="eq-panel-subtitle">Track holdings · weighted returns</span>
      </div>
      <div className="eq-panel-content bento-panel-content pf-tracker" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pf-add-row" onMouseDown={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            className="pf-input pf-input-ticker"
            type="text"
            placeholder="Ticker"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={8}
          />
          <input
            className="pf-input pf-input-shares"
            type="number"
            placeholder="Shares"
            value={sharesInput}
            onChange={(e) => setSharesInput(e.target.value)}
            onKeyDown={handleKeyDown}
            min="0"
            step="0.01"
          />
          <button className="pf-add-btn" onClick={handleAdd} title="Add holding">+</button>
        </div>
        
        {holdings.length > 0 && (
          <div className="pf-holdings" onMouseDown={(e) => e.stopPropagation()}>
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
                <div key={h.ticker} className="pf-holding-row" style={{ borderLeft: `3px solid ${PIE_PALETTE[i % PIE_PALETTE.length]}` }}>
                  <span className="pf-col pf-col-ticker pf-ticker-name">{h.ticker}</span>
                  <span className="pf-col pf-col-shares">{h.shares % 1 === 0 ? h.shares : h.shares.toFixed(2)}</span>
                  <span className="pf-col pf-col-price">{h.price != null ? `$${h.price.toFixed(2)}` : '—'}</span>
                  <span className="pf-col pf-col-value">{val != null ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</span>
                  <span className="pf-col pf-col-change" style={{ color: h.changePct != null ? (h.changePct >= 0 ? '#4ade80' : '#f87171') : undefined }}>
                    {h.changePct != null ? `${h.changePct >= 0 ? '+' : ''}${h.changePct.toFixed(2)}%` : '—'}
                  </span>
                  <span className="pf-col pf-col-weight">{weight != null ? `${weight.toFixed(1)}%` : '—'}</span>
                  <span className="pf-col pf-col-action">
                    <button className="pf-remove-btn" onClick={() => handleRemove(h.ticker)} title="Remove">✕</button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        
        {totalValue > 0 && (
          <div className="pf-summary" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pf-summary-row">
              <span className="pf-summary-label">Total Value</span>
              <span className="pf-summary-value">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {totalReturn != null && (
              <div className="pf-summary-row">
                <span className="pf-summary-label">Wtd. Return</span>
                <span className="pf-summary-value" style={{ color: totalReturn >= 0 ? '#4ade80' : '#f87171' }}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        )}
        
        {pieOption && (
          <div className="pf-chart-wrap" onMouseDown={(e) => e.stopPropagation()}>
            <SafeECharts option={pieOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Portfolio Allocation', source: 'Yahoo Finance', endpoint: '/api/stocks', series: [], updatedAt: new Date().toISOString() }} />
          </div>
        )}
        
        {!portfolio.length && (
          <div className="pf-empty" onMouseDown={(e) => e.stopPropagation()}>
            Add tickers and shares to track your portfolio
          </div>
        )}
      </div>
      <div className="eq-panel-footer">
        <DataFooter source="Yahoo Finance" timestamp="Live" isLive={true} isCurrent={true} />
      </div>
    </div>
  );
}
