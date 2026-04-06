// src/markets/fx/components/TopMovers.jsx
import React, { useMemo } from 'react';
import './FXComponents.css';

const MOVER_CURRENCIES = [
  'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD', 'SEK',
  'NOK', 'NZD', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR',
];

const G10 = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'NZD'];
const EM  = ['CNY', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR'];

function Sparkline({ values }) {
  if (!values || values.length < 2) return <span className="mover-spark" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.001;
  const W = 48, H = 16;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} className="mover-spark">
      <polyline points={pts} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function fmtPct(val, digits = 3) {
  if (val == null) return '—';
  return (val >= 0 ? '+' : '') + val.toFixed(digits) + '%';
}

export default function TopMovers({
  changes,
  changes1w = {},
  changes1m = {},
  sparklines = {},
  cotData = {},
}) {
  const movers = useMemo(() => {
    return MOVER_CURRENCIES
      .filter(c => changes[c] != null)
      .map(c => ({
        code: c,
        changePct: changes[c],
        change1w: changes1w[c] ?? null,
        change1m: changes1m[c] ?? null,
        spark: sparklines[c] ?? null,
        cotPct: cotData[c] ?? null,
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  }, [changes, changes1w, changes1m, sparklines, cotData]);

  const maxAbs = movers.length > 0 ? Math.max(...movers.map(m => Math.abs(m.changePct))) : 1;

  // KPI computations
  const strongest = movers.length ? movers.reduce((best, m) => m.changePct > best.changePct ? m : best, movers[0]) : null;
  const weakest   = movers.length ? movers.reduce((worst, m) => m.changePct < worst.changePct ? m : worst, movers[0]) : null;
  const avgMag    = movers.length ? movers.reduce((s, m) => s + Math.abs(m.changePct), 0) / movers.length : 0;
  const bigMovers = movers.filter(m => Math.abs(m.changePct) > 0.3).length;

  // G10 vs EM avg
  const g10Avg = (() => {
    const g10Movers = movers.filter(m => G10.includes(m.code));
    return g10Movers.length ? g10Movers.reduce((s, m) => s + m.changePct, 0) / g10Movers.length : 0;
  })();
  const emAvg = (() => {
    const emMovers = movers.filter(m => EM.includes(m.code));
    return emMovers.length ? emMovers.reduce((s, m) => s + m.changePct, 0) / emMovers.length : 0;
  })();

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Top Movers</span>
        <span className="fx-panel-subtitle">
          vs USD · sorted by 24h magnitude · green = currency strengthened
        </span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        {strongest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Strongest</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{strongest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>{fmtPct(strongest.changePct)}</span>
          </div>
        )}
        {weakest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Weakest</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{weakest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{fmtPct(weakest.changePct)}</span>
          </div>
        )}
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Avg Magnitude</span>
          <span className="fx-kpi-value">{avgMag.toFixed(3)}%</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Big Moves (>0.3%)</span>
          <span className="fx-kpi-value">{bigMovers}</span>
          <span className="fx-kpi-sub">of {movers.length} tracked</span>
        </div>
      </div>

      {/* Movers list */}
      <div className="movers-list">
        {movers.map((m, i) => {
          const is24hPos = m.changePct >= 0;
          const is1wPos  = m.change1w != null && m.change1w >= 0;
          const is1mPos  = m.change1m != null && m.change1m >= 0;
          const barPct   = maxAbs > 0 ? Math.abs(m.changePct) / maxAbs * 100 : 0;
          const cotClass = m.cotPct == null ? '' : m.cotPct > 5 ? 'flow-bullish' : m.cotPct < -5 ? 'flow-bearish' : 'flow-neutral';

          return (
            <div key={m.code} className="mover-row">
              <span className="mover-rank">#{i + 1}</span>
              <span className="mover-code">{m.code}</span>
              <span className="mover-pair">vs USD</span>
              <div className="mover-bar-wrap">
                <div
                  className={`mover-bar ${is24hPos ? 'positive' : 'negative'}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className={`mover-pct ${is24hPos ? 'positive' : 'negative'}`}>
                {is24hPos ? '+' : ''}{m.changePct.toFixed(3)}%
              </span>
              <span className={`mover-1w ${m.change1w == null ? '' : is1wPos ? 'positive' : 'negative'}`}>
                {fmtPct(m.change1w)}
              </span>
              <span className={`mover-1m ${m.change1m == null ? '' : is1mPos ? 'positive' : 'negative'}`}>
                {fmtPct(m.change1m)}
              </span>
              <Sparkline values={m.spark} />
              {Object.keys(cotData).length > 0 && (
                <span className={`mover-cot ${cotClass}`}>
                  {m.cotPct == null ? '—' : fmtPct(m.cotPct, 1)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* G10 vs EM comparison */}
      <div className="fx-chart-panel" style={{ flexShrink: 0, marginTop: 12 }}>
        <div className="fx-chart-title">G10 vs Emerging Market Currencies — Avg 24h vs USD</div>
        <div className="fx-group-bars">
          <div className="fx-group-item">
            <span className="fx-group-label">G10 Avg</span>
            <span className={`fx-group-value ${g10Avg >= 0 ? 'positive' : 'negative'}`}>
              {g10Avg >= 0 ? '+' : ''}{g10Avg.toFixed(3)}%
            </span>
          </div>
          <div className="fx-group-divider" />
          <div className="fx-group-item">
            <span className="fx-group-label">EM Avg</span>
            <span className={`fx-group-value ${emAvg >= 0 ? 'positive' : 'negative'}`}>
              {emAvg >= 0 ? '+' : ''}{emAvg.toFixed(3)}%
            </span>
          </div>
          <div className="fx-group-divider" />
          <div className="fx-group-item">
            <span className="fx-group-label">G10 − EM Spread</span>
            <span className={`fx-group-value ${(g10Avg - emAvg) >= 0 ? 'positive' : 'negative'}`}>
              {(g10Avg - emAvg) >= 0 ? '+' : ''}{(g10Avg - emAvg).toFixed(3)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
