import React from 'react';
import './REComponents.css';

const MAX_PTI = 20;

function ptiColor(pti) {
  if (pti >= 12) return '#ef4444';
  if (pti >= 8)  return '#f97316';
  if (pti >= 5)  return '#facc15';
  return '#22c55e';
}

export default function AffordabilityMap({ affordabilityData, mortgageRates }) {
  const sorted = [...affordabilityData].sort((a, b) => b.priceToIncome - a.priceToIncome);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Affordability Map</span>
        <span className="re-panel-subtitle">Price-to-income ratio by city · sorted least affordable first</span>
      </div>
      {mortgageRates && (
        <div className="afford-mortgage-banner">
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">30-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate30y.toFixed(2)}%</span>
          </div>
          <div className="afford-mortgage-divider" />
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">15-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate15y.toFixed(2)}%</span>
          </div>
          <span className="afford-mortgage-source">FRED · as of {mortgageRates.asOf}</span>
        </div>
      )}
      <div className="afford-scroll">
        <table className="afford-table">
          <thead>
            <tr>
              <th className="afford-th">City</th>
              <th className="afford-th">Price/Income</th>
              <th className="afford-th">P/I Bar</th>
              <th className="afford-th">Mortgage/Income</th>
              <th className="afford-th">Median Price</th>
              <th className="afford-th">YoY</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const barPct = Math.min((row.priceToIncome / MAX_PTI) * 100, 100);
              const color  = ptiColor(row.priceToIncome);
              return (
                <tr key={row.city}>
                  <td className="afford-cell">{row.city}</td>
                  <td className="afford-cell">{row.priceToIncome.toFixed(1)}×</td>
                  <td className="afford-bar-cell">
                    <div className="afford-bar-wrap">
                      <div className="afford-bar" style={{ width: `${barPct}%`, backgroundColor: color }} />
                    </div>
                  </td>
                  <td className="afford-cell">{row.mortgageToIncome.toFixed(1)}%</td>
                  <td className="afford-cell">${row.medianPrice.toLocaleString()}</td>
                  <td className={`afford-cell${row.yoyChange >= 0 ? ' reit-positive' : ' reit-negative'}`}>
                    {row.yoyChange >= 0 ? '+' : ''}{row.yoyChange.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="re-panel-footer">
        Red ≥ 12× · Orange ≥ 8× · Yellow ≥ 5× · Green &lt; 5× · Mortgage/Income = % of gross household income
      </div>
    </div>
  );
}
