// src/markets/globalMacro/components/MacroScorecard.jsx
import React from 'react';
import './MacroComponents.css';

function gdpHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v > 3)    return 'mac-heat-dg';
  if (v > 1)    return 'mac-heat-lg';
  if (v >= 0)   return 'mac-heat-neu';
  if (v >= -1)  return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function cpiHeat(v) {
  if (v == null)        return 'mac-heat-neu';
  if (v < 0 || v > 6)  return 'mac-heat-dr';
  if (v > 4)            return 'mac-heat-lr';
  if (v > 3)            return 'mac-heat-neu';
  if (v > 2)            return 'mac-heat-lg';
  if (v >= 1)           return 'mac-heat-dg';
  return 'mac-heat-neu'; // 0–1%: below target
}

function rateHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 1)    return 'mac-heat-dg';
  if (v < 3)    return 'mac-heat-lg';
  if (v < 5)    return 'mac-heat-neu';
  if (v < 8)    return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function unempHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 4)    return 'mac-heat-dg';
  if (v < 6)    return 'mac-heat-lg';
  if (v < 8)    return 'mac-heat-neu';
  if (v < 10)   return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function debtHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 40)   return 'mac-heat-dg';
  if (v < 60)   return 'mac-heat-lg';
  if (v < 90)   return 'mac-heat-neu';
  if (v < 120)  return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function fmt1(v) { return v != null ? v.toFixed(1) + '%' : '—'; }
function fmtRate(v) { return v != null ? v.toFixed(2) + '%' : '—'; }

export default function MacroScorecard({ scorecardData = [] }) {
  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Macro Scorecard</span>
        <span className="mac-panel-subtitle">12 countries · latest annual data · World Bank + central banks</span>
      </div>
      <div className="mac-scroll">
        <table className="mac-table">
          <thead>
            <tr>
              <th className="mac-th" style={{ textAlign: 'left' }}>Country</th>
              <th className="mac-th">GDP Growth%</th>
              <th className="mac-th">CPI Inflation%</th>
              <th className="mac-th">Policy Rate</th>
              <th className="mac-th">Unemp%</th>
              <th className="mac-th">Debt/GDP%</th>
            </tr>
          </thead>
          <tbody>
            {scorecardData.map(c => (
              <tr key={c.code} className="mac-row">
                <td className="mac-cell"><span>{c.flag}</span> <span>{c.name}</span></td>
                <td className={`mac-cell ${gdpHeat(c.gdp)}`}  style={{ fontWeight: 500 }}>{fmt1(c.gdp)}</td>
                <td className={`mac-cell ${cpiHeat(c.cpi)}`}  style={{ fontWeight: 500 }}>{fmt1(c.cpi)}</td>
                <td className={`mac-cell ${rateHeat(c.rate)}`} style={{ fontWeight: 500 }}>{fmtRate(c.rate)}</td>
                <td className={`mac-cell ${unempHeat(c.unemp)}`} style={{ fontWeight: 500 }}>{fmt1(c.unemp)}</td>
                <td className={`mac-cell ${debtHeat(c.debt)}`}  style={{ fontWeight: 500 }}>{fmt1(c.debt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mac-panel-footer">
        Color: green = favorable · red = concerning · thresholds per IMF/Maastricht guidelines
      </div>
    </div>
  );
}
