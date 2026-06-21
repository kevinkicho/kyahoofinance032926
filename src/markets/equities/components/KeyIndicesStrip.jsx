// KeyIndicesStrip — KPI strip for the Equities Key Indices panel.
//
// Differences vs the generic <MarketKpiStrip>:
//   1. Each pill is hoverable / clickable, opening a popover with a 3-month
//      sparkline + source info (ticker, exchange, currency, last update).
//   2. History is fetched lazily via /api/history/:ticker on first hover
//      and cached for the session — so cold load doesn't pay 11 chart
//      requests up front, but a hover reveals the chart instantly after
//      the first ~250ms.
// Footer note: DataFooter (FETCHED · Yahoo Finance) is rendered by the
// parent <BentoCard> in its footer slot so it lands flush at the bottom
// of the card chrome, matching every other panel. This component used to
// render it inline at the end of the content, which left it floating
// mid-panel with empty space below.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiUrl } from '../../../lib/api';
import { createPortal } from 'react-dom';

// Tiny inline SVG sparkline. Styled green if last > first, red if down.
function Sparkline({ closes, width = 280, height = 90 }) {
  if (!closes?.length || closes.length < 2) {
    return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>No history</div>;
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const padTop = 6, padBot = 6, padL = 4, padR = 4;
  const w = width - padL - padR;
  const h = height - padTop - padBot;
  const step = w / (closes.length - 1);
  const isUp = closes[closes.length - 1] >= closes[0];
  const stroke = isUp ? '#4ade80' : '#f87171';
  const points = closes.map((v, i) => `${padL + i * step},${padTop + h - ((v - min) / range) * h}`).join(' ');
  // Area fill — same path closed to baseline.
  const areaPath = `M ${padL},${padTop + h} L ${closes.map((v, i) => `${padL + i * step},${padTop + h - ((v - min) / range) * h}`).join(' L ')} L ${padL + w},${padTop + h} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <path d={areaPath} fill={stroke} fillOpacity="0.12" />
      <polyline fill="none" stroke={stroke} strokeWidth="1.6" points={points} />
    </svg>
  );
}

// Popover that follows the pill, showing sparkline + ticker info. Anchored
// below the pill, falls back above if it would clip the viewport.
function PillPopover({ anchor, ticker, label, currency, history, error, loading, onClose, locked }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos({ left: r.left, below: r.bottom + 8, above: r.top - 8 });
  }, [anchor]);

  // Close on outside click only when locked (otherwise hover handles it).
  useEffect(() => {
    if (!locked) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target) && !anchor.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [locked, onClose, anchor]);

  if (!pos) return null;

  // Choose vertical position to avoid viewport clipping.
  const popH = 180;
  const top = pos.below + popH > window.innerHeight ? Math.max(8, pos.above - popH) : pos.below;

  return createPortal(
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(pos.left, window.innerWidth - 320)),
        top,
        width: 304,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 6,
        padding: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        zIndex: 10000,
        fontSize: 11,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{label}</span>
          <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{ticker}{currency ? ` · ${currency}` : ''}</span>
        </div>
        {locked && (
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
        )}
      </div>
      <div style={{ marginBottom: 6 }}>
        {loading
          ? <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading 3-month history…</div>
          : error
            ? <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>{error}</div>
            : <Sparkline closes={history?.map(h => h.close)} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
        <span>3 months · daily close</span>
        {history?.length > 0 && (
          <span>
            {history[0].date.slice(2)} → {history[history.length - 1].date.slice(2)}
          </span>
        )}
      </div>
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
        <span>Source: Yahoo Finance · </span>
        <a
          href={`https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: '#22d3ee', textDecoration: 'none' }}
        >
          finance.yahoo.com/quote/{ticker}
        </a>
      </div>
    </div>,
    document.body
  );
}

function Pill({ kpi, onHover, onLeave, onClick, locked }) {
  const ref = useRef(null);
  const handleEnter = useCallback(() => onHover?.(kpi.ticker, ref.current), [kpi.ticker, onHover]);
  const handleClick = useCallback(() => onClick?.(kpi.ticker, ref.current), [kpi.ticker, onClick]);
  return (
    <div
      ref={ref}
      className="market-kpi-pill"
      onMouseEnter={handleEnter}
      onMouseLeave={onLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer', position: 'relative' }}
      title={`Click for 3-month chart of ${kpi.ticker}`}
    >
      <span className="market-kpi-label">{kpi.label}</span>
      <div className="market-kpi-value-row">
        <span className="market-kpi-value" style={kpi.color ? { color: kpi.color } : undefined}>
          {kpi.value}
        </span>
        {kpi.trend && (
          <span className="market-kpi-trend" style={kpi.color ? { color: kpi.color } : undefined}>
            {kpi.trend}
          </span>
        )}
      </div>
      {kpi.sublabel && <span className="market-kpi-sublabel">{kpi.sublabel}</span>}
    </div>
  );
}

export default function KeyIndicesStrip({
  // Two strips so the panel can render US + China-HK with their own
  // section headers. Each is a {label, kpis: [{ticker, ...}]} object.
  // Footer/source props no longer accepted — DataFooter is rendered by
  // the parent BentoCard's footer slot so the FETCHED bar lands flush at
  // the bottom of the card chrome like every other panel.
  groups = [],
}) {
  // History cache: ticker → { history|error|loading }
  const [hist, setHist] = useState({});
  const [hover, setHover] = useState(null);   // { ticker, anchor, locked }

  const fetchHistory = useCallback(async (ticker) => {
    if (hist[ticker]?.history || hist[ticker]?.loading) return;
    // DX=F (dollar index futures) often lacks reliable history in the current
    // backend data pipeline (no local file + Yahoo fallback fails in Functions env).
    // Skip to avoid spamming 404s in console; the pill will just show price without sparkline.
    if (ticker === 'DX=F') {
      setHist(prev => ({ ...prev, [ticker]: { error: 'No history (special ticker)' } }));
      return;
    }
    setHist(prev => ({ ...prev, [ticker]: { loading: true } }));
    try {
      const r = await fetch(apiUrl(`/api/history/${encodeURIComponent(ticker)}?period=3m`));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (Array.isArray(data) && data.length) {
        setHist(prev => ({ ...prev, [ticker]: { history: data } }));
      } else {
        setHist(prev => ({ ...prev, [ticker]: { error: 'No history' } }));
      }
    } catch (e) {
      setHist(prev => ({ ...prev, [ticker]: { error: e.message } }));
    }
  }, [hist]);

  const onPillHover = useCallback((ticker, anchor) => {
    if (hover?.locked) return;                 // don't overwrite a locked popover
    setHover({ ticker, anchor, locked: false });
    fetchHistory(ticker);
  }, [hover, fetchHistory]);

  const onPillLeave = useCallback(() => {
    if (hover?.locked) return;
    setHover(null);
  }, [hover]);

  const onPillClick = useCallback((ticker, anchor) => {
    setHover({ ticker, anchor, locked: true });
    fetchHistory(ticker);
  }, [fetchHistory]);

  const closePopover = useCallback(() => setHover(null), []);

  const allKpis = groups.flatMap(g => g.kpis);
  const hoveredKpi = hover ? allKpis.find(k => k.ticker === hover.ticker) : null;
  const hoveredEntry = hover ? hist[hover.ticker] : null;

  return (
    <div className="market-kpi-panel eq-indices-panel">
      <div className="eq-indices-grid">
        {groups.map((g, gi) => (
          <div key={gi} className={`eq-index-group eq-index-group--${gi}`}>
            {g.label && (
              <div className="eq-index-group-label">
                {g.label}
              </div>
            )}
            <div className="market-kpi-strip">
              {g.kpis.map((kpi, i) => (
                <Pill
                  key={`${gi}-${i}`}
                  kpi={kpi}
                  onHover={onPillHover}
                  onLeave={onPillLeave}
                  onClick={onPillClick}
                  locked={hover?.locked && hover.ticker === kpi.ticker}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {hover && hoveredKpi && (
        <PillPopover
          anchor={hover.anchor}
          ticker={hover.ticker}
          label={hoveredKpi.label}
          currency={hoveredKpi.currency}
          history={hoveredEntry?.history}
          error={hoveredEntry?.error}
          loading={hoveredEntry?.loading}
          onClose={closePopover}
          locked={hover.locked}
        />
      )}
    </div>
  );
}
