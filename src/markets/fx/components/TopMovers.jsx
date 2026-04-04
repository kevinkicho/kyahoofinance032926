// src/markets/fx/components/TopMovers.jsx
import React, { useMemo } from 'react';
import './FXComponents.css';

// Show these currencies as "X vs USD" movers
const MOVER_CURRENCIES = [
  'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD', 'SEK',
  'NOK', 'NZD', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR',
];

export default function TopMovers({ changes }) {
  const movers = useMemo(() => {
    return MOVER_CURRENCIES
      .filter(c => changes[c] != null)
      .map(c => ({
        code: c,
        // Negate: positive changes[c] means USD got stronger (currency fell), so negate for "currency vs USD"
        changePct: -(changes[c]),
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  }, [changes]);

  const maxAbs = movers.length > 0
    ? Math.max(...movers.map(m => Math.abs(m.changePct)))
    : 1;

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Top Movers</span>
        <span className="fx-panel-subtitle">
          24h % change vs USD · sorted by magnitude · green = currency strengthened
        </span>
      </div>
      <div className="movers-list">
        {movers.map((m, i) => {
          const isPositive = m.changePct >= 0;
          const barPct = maxAbs > 0 ? Math.abs(m.changePct) / maxAbs * 100 : 0;
          return (
            <div key={m.code} className="mover-row">
              <span className="mover-rank">#{i + 1}</span>
              <span className="mover-code">{m.code}</span>
              <span className="mover-pair">vs USD</span>
              <div className="mover-bar-wrap">
                <div
                  className={`mover-bar ${isPositive ? 'positive' : 'negative'}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className={`mover-pct ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{m.changePct.toFixed(3)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
