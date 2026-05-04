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

function mergeLiveRates(baseRates, rateDiffs) {
  const merged = { ...baseRates };
  if (!rateDiffs) return merged;
  if (rateDiffs.fed != null) merged.USD = { ...merged.USD, rate: rateDiffs.fed };
  if (rateDiffs.ecb != null)  merged.EUR = { ...merged.EUR, rate: rateDiffs.ecb };
  if (rateDiffs.boe != null)  merged.GBP = { ...merged.GBP, rate: rateDiffs.boe };
  if (rateDiffs.boj != null)  merged.JPY = { ...merged.JPY, rate: rateDiffs.boj };
  return merged;
}

// Returns just the carry-map content (KPI strip + matrix + bar list).
// Parent wraps in <BentoCard title="Carry Map" subtitle={...}>. The
// `isCarryLive` flag is exposed as `liveLabel` so the parent can include
// it in the subtitle.
export default function CarryMap({ rateDifferentials }) {
  const rates = useMemo(() => mergeLiveRates(CENTRAL_BANK_RATES, rateDifferentials), [rateDifferentials]);

  const pairs = useMemo(() => {
    const result = {};
    for (const base of CARRY_CURRENCIES) {
      result[base] = {};
      for (const quote of CARRY_CURRENCIES) {
        if (base === quote) { result[base][quote] = null; continue; }
        const baseRate  = rates[base]?.rate ?? 0;
        const quoteRate = rates[quote]?.rate ?? 0;
        result[base][quote] = baseRate - quoteRate;
      }
    }
    return result;
  }, [rates]);

  const rateList = CARRY_CURRENCIES.map(c => ({ code: c, rate: rates[c]?.rate ?? 0 }));
  const sortedRates = [...rateList].sort((a, b) => b.rate - a.rate);
  const maxRate = sortedRates[0]?.rate ?? 0;
  const minRate = sortedRates[sortedRates.length - 1]?.rate ?? 0;
  const g7 = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
  const avgG7 = g7.reduce((s, c) => s + (rates[c]?.rate ?? 0), 0) / g7.length;

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

  const isCarryLive = !!(rateDifferentials && (rateDifferentials.fed != null));
  const liveLabel = isCarryLive
    ? CARRY_CURRENCIES.filter(c => rateDifferentials && rates[c]?.rate !== CENTRAL_BANK_RATES[c]?.rate).map(c => `${c} Live`).join(', ')
    : '';

  return (
    <>
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

      <div className="fx-wide-narrow">
        <div className="carry-scroll">
          <table className="fx-table">
            <thead>
              <tr>
                <th className="fx-th fx-corner">Long ↓ / Short →</th>
                {CARRY_CURRENCIES.map(c => (
                  <th key={c} className="fx-th">
                    {c}<br />
                    <span className="fx-rate-hint">{rates[c]?.rate ?? '—'}%</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CARRY_CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="fx-row-header">
                    {base}<br />
                    <span className="fx-rate-hint">{rates[base]?.rate ?? '—'}%</span>
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

    </>
  );
}