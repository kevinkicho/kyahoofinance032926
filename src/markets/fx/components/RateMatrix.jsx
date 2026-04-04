import React, { useMemo } from 'react';
import './RateMatrix.css';

const MATRIX_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD'];

function formatRate(value, quote) {
  return (quote === 'JPY' || quote === 'CNY') ? value.toFixed(2) : value.toFixed(4);
}

export default function RateMatrix({ spotRates, prevRates }) {
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
        const changePct = (currRate != null && prevRate && prevRate !== 0)
          ? ((currRate - prevRate) / prevRate) * 100
          : 0;
        result[base][quote] = { rate: currRate, changePct };
      }
    }
    return result;
  }, [spotRates, prevRates]);

  return (
    <div className="rate-matrix-wrap">
      <div className="rate-matrix-header">
        <span className="rate-matrix-title">Cross-Rate Matrix</span>
        <span className="rate-matrix-subtitle">Rows = base · Columns = quote · color = 24h % change</span>
      </div>
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
                  const isPositive = changePct >= 0;
                  return (
                    <td key={quote} className={`rate-matrix-cell ${isPositive ? 'positive' : 'negative'}`}>
                      <span className="rate-matrix-rate">{formatRate(rate, quote)}</span>
                      <span className="rate-matrix-change">
                        {isPositive ? '+' : ''}{changePct.toFixed(2)}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rate-matrix-legend">
        <span className="legend-green">Green = base strengthened vs quote</span>
        <span className="legend-sep">·</span>
        <span className="legend-red">Red = base weakened vs quote</span>
      </div>
    </div>
  );
}
