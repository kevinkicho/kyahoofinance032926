import React from 'react';
import './DerivComponents.css';

function fmtVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

export default function OptionsFlow({ optionsFlow }) {
  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Options Flow</span>
        <span className="deriv-panel-subtitle">Unusual options activity · sorted by volume</span>
      </div>
      <div className="flow-scroll">
        <table className="flow-table">
          <thead>
            <tr>
              <th className="flow-th">Ticker</th>
              <th className="flow-th">Strike</th>
              <th className="flow-th">Expiry</th>
              <th className="flow-th">C/P</th>
              <th className="flow-th">Volume</th>
              <th className="flow-th">OI</th>
              <th className="flow-th">Vol/OI</th>
              <th className="flow-th">Premium</th>
              <th className="flow-th">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {optionsFlow.map((row, i) => {
              const volOI = row.openInterest > 0
                ? (row.volume / row.openInterest).toFixed(2)
                : '—';
              return (
                <tr key={i} className="flow-row">
                  <td className="flow-cell">{row.ticker}</td>
                  <td className="flow-cell">${row.strike}</td>
                  <td className="flow-cell">{row.expiry}</td>
                  <td className={`flow-cell ${row.type === 'C' ? 'flow-call' : 'flow-put'}`}>
                    {row.type}
                  </td>
                  <td className="flow-cell">{fmtVolume(row.volume)}</td>
                  <td className="flow-cell">{fmtVolume(row.openInterest)}</td>
                  <td className="flow-cell">{volOI}</td>
                  <td className="flow-cell">${row.premium.toFixed(2)}</td>
                  <td className={`flow-cell flow-${row.sentiment}`}>{row.sentiment}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="deriv-panel-footer">
        Vol/OI &gt; 1 = volume exceeds open interest (unusual activity) · C = call · P = put
      </div>
    </div>
  );
}
