import React from 'react';
import './InsComponents.css';

function capacityClass(capacity) {
  const map = {
    'Ample':      'ins-capacity-ample',
    'Adequate':   'ins-capacity-adequate',
    'Tight':      'ins-capacity-tight',
    'Very Tight': 'ins-capacity-verytight',
  };
  return map[capacity] || '';
}

function fmtChange(v) {
  return v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;
}

export default function ReinsurancePricing({ reinsurancePricing }) {
  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Reinsurance Pricing</span>
        <span className="ins-panel-subtitle">Treaty reinsurance market · rate-on-line and risk-adjusted premium at latest renewal</span>
      </div>
      <div className="ins-scroll">
        <table className="ins-table">
          <thead>
            <tr>
              <th className="ins-th">Peril</th>
              <th className="ins-th">Layer</th>
              <th className="ins-th">ROL %</th>
              <th className="ins-th">ROL Chg</th>
              <th className="ins-th">RPL %</th>
              <th className="ins-th">RPL Chg</th>
              <th className="ins-th">Capacity</th>
              <th className="ins-th">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {reinsurancePricing.map((row, i) => (
              <tr key={i} className="ins-row">
                <td className="ins-cell">{row.peril}</td>
                <td className="ins-cell">{row.layer}</td>
                <td className="ins-cell">{row.rol.toFixed(1)}%</td>
                <td className={`ins-cell ${row.rolChange >= 0 ? 'ins-change-up' : 'ins-change-down'}`}>
                  {fmtChange(row.rolChange)}
                </td>
                <td className="ins-cell">{row.rpl.toFixed(1)}%</td>
                <td className={`ins-cell ${row.rplChange >= 0 ? 'ins-change-up' : 'ins-change-down'}`}>
                  {fmtChange(row.rplChange)}
                </td>
                <td className={`ins-cell ${capacityClass(row.capacity)}`}>{row.capacity}</td>
                <td className="ins-cell">{row.renewalDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ins-panel-footer">
        ROL = Rate-on-Line (premium ÷ limit) · RPL = Risk-adjusted Premium Level · Chg = YoY change at renewal
      </div>
    </div>
  );
}
