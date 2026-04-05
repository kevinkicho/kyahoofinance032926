// src/markets/commodities/components/SectorHeatmap.jsx
import React from 'react';
import './CommodComponents.css';

function heatClass(v) {
  if (v == null) return 'com-heat-neu';
  if (v >  2.0) return 'com-heat-dg';
  if (v >  0.0) return 'com-heat-lg';
  if (v > -0.5) return 'com-heat-neu';
  if (v > -2.0) return 'com-heat-lr';
  return 'com-heat-dr';
}

function fmtPct(v) {
  if (v == null) return '—';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

const SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture'];
const SECTOR_ICONS  = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾' };

export default function SectorHeatmap({ sectorHeatmapData }) {
  const { commodities = [], columns = [] } = sectorHeatmapData;
  const colKeys = ['d1', 'w1', 'm1'];

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Sector Performance Heatmap</span>
        <span className="com-panel-subtitle">% change by commodity and time horizon</span>
      </div>
      <div className="com-scroll">
        <table className="com-table">
          <thead>
            <tr>
              <th className="com-th" style={{ textAlign: 'left' }}>Commodity</th>
              {columns.map(col => <th key={col} className="com-th">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {SECTORS_ORDER.map(sector => {
              const rows = commodities.filter(c => c.sector === sector);
              return (
                <React.Fragment key={sector}>
                  <tr className="com-sector-row">
                    <td colSpan={columns.length + 1}>{SECTOR_ICONS[sector] || ''} {sector}</td>
                  </tr>
                  {rows.map(c => (
                    <tr key={c.ticker} className="com-row">
                      <td className="com-cell">{c.name}</td>
                      {colKeys.map((k, i) => (
                        <td key={i} className={`com-cell ${heatClass(c[k])}`} style={{ fontWeight: 500 }}>
                          {fmtPct(c[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="com-panel-footer">Colors: green = positive returns · red = negative · based on 1d, 1w, 1m % change</div>
    </div>
  );
}
