// src/markets/fx/components/CarryMap.jsx
import React, { useMemo } from 'react';
import { CENTRAL_BANK_RATES } from '../data/centralBankRates';
import './FXComponents.css';

const CARRY_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];

// Return a background color scaled to the carry differential (-5% to +5% range)
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

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Carry Map</span>
        <span className="fx-panel-subtitle">
          Interest rate differential (long base − short quote). Positive = earn positive carry.
        </span>
      </div>
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
      <div className="fx-panel-footer">
        Central bank policy rates (approximate, early 2025). Green = positive carry. Red = negative carry.
      </div>
    </div>
  );
}
