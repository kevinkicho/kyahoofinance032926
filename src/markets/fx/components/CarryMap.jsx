// src/markets/fx/components/CarryMap.jsx
import React, { useMemo } from 'react';
import { CENTRAL_BANK_RATES } from '../data/centralBankRates';
import './FXComponents.css';

const CARRY_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];

function carryBg(diff) {
  if (Math.abs(diff) < 0.05) return 'transparent';
  const intensity = Math.min(Math.abs(diff) / 5, 1);
  const alpha = 0.12 + intensity * 0.3;
  return diff > 0
    ? `rgba(34, 197, 94, ${alpha})`
    : `rgba(239, 68, 68, ${alpha})`;
}

export default function CarryMap() {
  const pairs = useMemo(() => {
    const result = {};
    for (const base of CARRY_CURRENCIES) {
      result[base] = {};
      for (const quote of CARRY_CURRENCIES) {
        if (base === quote) { result[base][quote] = null; continue; }
        const baseRate  = CENTRAL_BANK_RATES[base]?.rate ?? 0;
        const quoteRate = CENTRAL_BANK_RATES[quote]?.rate ?? 0;
        result[base][quote] = baseRate - quoteRate;
      }
    }
    return result;
  }, []);

  // KPI computations
  const rates = CARRY_CURRENCIES.map(c => ({ code: c, rate: CENTRAL_BANK_RATES[c]?.rate ?? 0 }));
  const sortedRates = [...rates].sort((a, b) => b.rate - a.rate);
  const maxRate = sortedRates[0]?.rate ?? 0;
  const minRate = sortedRates[sortedRates.length - 1]?.rate ?? 0;
  const g7 = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
  const avgG7 = g7.reduce((s, c) => s + (CENTRAL_BANK_RATES[c]?.rate ?? 0), 0) / g7.length;

  // Best/worst carry pairs
  let bestCarry = null, worstCarry = null;
  for (const base of CARRY_CURRENCIES) {
    for (const quote of CARRY_CURRENCIES) {
      if (base === quote) continue;
      const diff = pairs[base]?.[quote];
      if (diff == null) continue;
      if (!bestCarry || diff > bestCarry.diff) bestCarry = { base, quote, diff };
      if (!worstCarry || diff < worstCarry.diff) worstCarry = { base, quote, diff };
    }
  }

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Carry Map</span>
        <span className="fx-panel-subtitle">
          Interest rate differential (long base − short quote). Positive = earn positive carry.
        </span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        {bestCarry && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Highest Carry</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{bestCarry.base}/{bestCarry.quote}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>+{bestCarry.diff.toFixed(2)}%</span>
          </div>
        )}
        {worstCarry && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Lowest Carry</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{worstCarry.base}/{worstCarry.quote}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{worstCarry.diff.toFixed(2)}%</span>
          </div>
        )}
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Avg G7 Rate</span>
          <span className="fx-kpi-value">{avgG7.toFixed(2)}%</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Rate Range</span>
          <span className="fx-kpi-value">{(maxRate - minRate).toFixed(2)}%</span>
          <span className="fx-kpi-sub">{minRate.toFixed(2)}% — {maxRate.toFixed(2)}%</span>
        </div>
      </div>

      {/* Main: carry table (wide) + rate bars (narrow) */}
      <div className="fx-wide-narrow">
        <div className="carry-scroll">
          <table className="fx-table">
            <thead>
              <tr>
                <th className="fx-th fx-corner">Long ↓ / Short →</th>
                {CARRY_CURRENCIES.map(c => (
                  <th key={c} className="fx-th">
                    {c}<br />
                    <span className="fx-rate-hint">{CENTRAL_BANK_RATES[c]?.rate ?? '—'}%</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CARRY_CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="fx-row-header">
                    {base}<br />
                    <span className="fx-rate-hint">{CENTRAL_BANK_RATES[base]?.rate ?? '—'}%</span>
                  </td>
                  {CARRY_CURRENCIES.map(quote => {
                    if (base === quote) {
                      return <td key={quote} className="fx-cell fx-diagonal">—</td>;
                    }
                    const diff = pairs[base][quote];
                    return (
                      <td key={quote} className="fx-cell" style={{ background: carryBg(diff) }}>
                        <span className={`fx-diff ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}`}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
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
          <div className="fx-chart-title">Central Bank Policy Rates</div>
          <div className="fx-bar-list" style={{ marginTop: 4 }}>
            {sortedRates.map(({ code, rate }) => {
              const pct = maxRate > 0 ? (rate / maxRate) * 100 : 0;
              return (
                <div key={code} className="fx-bar-row">
                  <span className="fx-bar-name">{code}</span>
                  <div className="fx-bar-wrap">
                    <div
                      className="fx-bar-fill"
                      style={{ width: `${pct}%`, left: 0, background: '#f59e0b' }}
                    />
                  </div>
                  <span className="fx-bar-val" style={{ color: 'var(--text-primary)' }}>{rate.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fx-panel-footer">
        Central bank policy rates (approximate). Green = positive carry. Red = negative carry.
      </div>
    </div>
  );
}
