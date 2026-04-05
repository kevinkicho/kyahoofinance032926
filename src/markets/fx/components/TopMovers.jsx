// src/markets/fx/components/TopMovers.jsx
import React, { useMemo } from 'react';
import './FXComponents.css';

const MOVER_CURRENCIES = [
  'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD', 'SEK',
  'NOK', 'NZD', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR',
];

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
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
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
        changePct:  -(changes[c]),
        change1w:   changes1w[c]  ?? null,
        change1m:   changes1m[c]  ?? null,
        spark:      sparklines[c] ?? null,
        cotPct:     cotData[c]    ?? null,
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  }, [changes, changes1w, changes1m, sparklines, cotData]);

  const maxAbs = movers.length > 0
    ? Math.max(...movers.map(m => Math.abs(m.changePct)))
    : 1;

  function fmtPct(val, digits = 3) {
    if (val == null) return '—';
    return (val >= 0 ? '+' : '') + val.toFixed(digits) + '%';
  }

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Top Movers</span>
        <span className="fx-panel-subtitle">
          vs USD · sorted by 24h magnitude · green = currency strengthened
        </span>
      </div>
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
    </div>
  );
}
