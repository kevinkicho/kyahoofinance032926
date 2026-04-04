import React from 'react';
import './InsComponents.css';

function spreadClass(spread) {
  if (spread > 700) return 'ins-spread-high';
  if (spread >= 500) return 'ins-spread-mid';
  return 'ins-spread-low';
}

export default function CatBondSpreads({ catBondSpreads }) {
  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Cat Bond Spreads</span>
        <span className="ins-panel-subtitle">Catastrophe bond market · spread over risk-free rate (bps)</span>
      </div>
      <div className="ins-scroll">
        <table className="ins-table">
          <thead>
            <tr>
              <th className="ins-th">Bond</th>
              <th className="ins-th">Peril</th>
              <th className="ins-th">Sponsor</th>
              <th className="ins-th">Spread (bps)</th>
              <th className="ins-th">Rating</th>
              <th className="ins-th">Trigger</th>
              <th className="ins-th">Maturity</th>
              <th className="ins-th">Notional ($M)</th>
              <th className="ins-th">Expected Loss %</th>
            </tr>
          </thead>
          <tbody>
            {catBondSpreads.map((row, i) => (
              <tr key={i} className="ins-row">
                <td className="ins-cell">{row.name}</td>
                <td className="ins-cell">{row.peril}</td>
                <td className="ins-cell">{row.sponsor}</td>
                <td className={`ins-cell ${spreadClass(row.spread)}`}>{row.spread}</td>
                <td className="ins-cell">{row.rating}</td>
                <td className="ins-cell">{row.trigger}</td>
                <td className="ins-cell">{row.maturity}</td>
                <td className="ins-cell">{row.notional}</td>
                <td className="ins-cell">{row.expectedLoss.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ins-panel-footer">
        bps = basis points above risk-free · Indemnity = actual losses trigger · Parametric = index/model trigger · Industry Loss = market-wide loss trigger
      </div>
    </div>
  );
}
