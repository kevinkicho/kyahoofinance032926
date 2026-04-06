import React, { useMemo } from 'react';
import './RateMatrix.css';
import './FXComponents.css';

const MATRIX_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD'];

function formatRate(value, quote) {
  return (quote === 'JPY' || quote === 'CNY') ? value.toFixed(2) : value.toFixed(4);
}

export default function RateMatrix({ spotRates, prevRates, changes = {} }) {
  const cells = useMemo(() => {
    const result = {};
    for (const base of MATRIX_CURRENCIES) {
      result[base] = {};
      for (const quote of MATRIX_CURRENCIES) {
        if (base === quote) { result[base][quote] = null; continue; }
        const baseSpot  = spotRates[base];
        const quoteSpot = spotRates[quote];
        const basePrev  = prevRates[base];
        const quotePrev = prevRates[quote];
        const currRate = (baseSpot && quoteSpot) ? quoteSpot / baseSpot : null;
        const prevRate = (basePrev && quotePrev) ? quotePrev / basePrev : null;
        const changePct = (currRate != null && prevRate != null && prevRate !== 0)
          ? ((currRate - prevRate) / prevRate) * 100
          : null;
        result[base][quote] = { rate: currRate, changePct };
      }
    }
    return result;
  }, [spotRates, prevRates]);

  // KPI + strength computations
  const eurUsd = spotRates['EUR'] ? (1 / spotRates['EUR']) : null;
  const usdJpy = spotRates['JPY'] ?? null;
  const currencies = MATRIX_CURRENCIES.filter(c => c !== 'USD' && changes[c] != null);
  const sorted = [...currencies].sort((a, b) => (changes[b] ?? 0) - (changes[a] ?? 0));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const maxAbs = Math.max(...currencies.map(c => Math.abs(changes[c] || 0)), 0.01);

  return (
    <div className="fx-panel" style={{ padding: 20 }}>
      <div className="fx-panel-header">
        <span className="fx-panel-title">Cross-Rate Matrix</span>
        <span className="fx-panel-subtitle">Rows = base · Columns = quote · color = 24h % change</span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">EUR/USD</span>
          <span className="fx-kpi-value">{eurUsd != null ? eurUsd.toFixed(4) : '—'}</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">USD/JPY</span>
          <span className="fx-kpi-value">{usdJpy != null ? usdJpy.toFixed(2) : '—'}</span>
        </div>
        {strongest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Strongest 24h</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{strongest}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>+{(changes[strongest] ?? 0).toFixed(3)}%</span>
          </div>
        )}
        {weakest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Weakest 24h</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{weakest}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{(changes[weakest] ?? 0).toFixed(3)}%</span>
          </div>
        )}
      </div>

      {/* Main: matrix (wide) + strength bars (narrow) */}
      <div className="fx-wide-narrow">
        <div className="rate-matrix-scroll">
          <table className="rate-matrix-table">
            <thead>
              <tr>
                <th className="rate-matrix-corner">Base ↓ / Quote →</th>
                {MATRIX_CURRENCIES.map(c => (
                  <th key={c} className="rate-matrix-col-header">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="rate-matrix-row-header">{base}</td>
                  {MATRIX_CURRENCIES.map(quote => {
                    if (base === quote) {
                      return <td key={quote} className="rate-matrix-cell rate-matrix-diagonal">—</td>;
                    }
                    const cell = cells[base]?.[quote];
                    if (!cell || cell.rate == null) {
                      return <td key={quote} className="rate-matrix-cell">—</td>;
                    }
                    const { rate, changePct } = cell;
                    const isPositive = changePct != null && changePct >= 0;
                    const isNegative = changePct != null && changePct < 0;
                    return (
                      <td key={quote} className={`rate-matrix-cell${isPositive ? ' positive' : isNegative ? ' negative' : ''}`}>
                        <span className="rate-matrix-rate">{formatRate(rate, quote)}</span>
                        <span className="rate-matrix-change">
                          {changePct == null ? '—' : `${isPositive ? '+' : ''}${changePct.toFixed(2)}%`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fx-chart-panel">
          <div className="fx-chart-title">USD Strength — 24h % vs USD</div>
          <div className="fx-bar-list" style={{ marginTop: 4 }}>
            {sorted.map(code => {
              const val = changes[code] ?? 0;
              const pct = Math.abs(val) / maxAbs * 50;
              const isPos = val >= 0;
              return (
                <div key={code} className="fx-bar-row">
                  <span className="fx-bar-name">{code}</span>
                  <div className="fx-bar-wrap">
                    <div className="fx-bar-center" />
                    <div
                      className="fx-bar-fill"
                      style={{
                        width: `${pct}%`,
                        left: isPos ? '50%' : `${50 - pct}%`,
                        background: isPos ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`fx-bar-val ${isPos ? 'positive' : 'negative'}`}>
                    {isPos ? '+' : ''}{val.toFixed(3)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rate-matrix-legend">
        <span className="legend-green">Green = base strengthened vs quote</span>
        <span className="legend-sep">·</span>
        <span className="legend-red">Red = base weakened vs quote</span>
      </div>
    </div>
  );
}
