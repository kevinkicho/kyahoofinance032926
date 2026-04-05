// src/markets/commodities/components/PriceDashboard.jsx
import React from 'react';
import './CommodComponents.css';

function fmtPct(v) {
  if (v == null) return '—';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

function pctClass(v) {
  if (v == null) return 'com-flat';
  if (v > 0) return 'com-up';
  if (v < 0) return 'com-down';
  return 'com-flat';
}

function Sparkline({ values }) {
  if (!values || values.length < 2) return <svg className="com-spark" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg className="com-spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" />
    </svg>
  );
}

const SECTOR_ICONS = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾' };

export default function PriceDashboard({ priceDashboardData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Price Dashboard</span>
        <span className="com-panel-subtitle">Live commodity prices · Updated on load</span>
      </div>
      <div className="com-scroll">
        <table className="com-table">
          <thead>
            <tr>
              <th className="com-th" style={{ textAlign: 'left' }}>Commodity</th>
              <th className="com-th">Price</th>
              <th className="com-th">1d%</th>
              <th className="com-th">1w%</th>
              <th className="com-th">1m%</th>
              <th className="com-th">30d Trend</th>
            </tr>
          </thead>
          <tbody>
            {priceDashboardData.map(({ sector, commodities }) => (
              <React.Fragment key={sector}>
                <tr className="com-sector-row">
                  <td colSpan={6}>{SECTOR_ICONS[sector] || ''} {sector}</td>
                </tr>
                {commodities.map(c => (
                  <tr key={c.ticker} className="com-row">
                    <td className="com-cell">{c.name}</td>
                    <td className="com-cell com-price">
                      {c.price != null ? c.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className={`com-cell ${pctClass(c.change1d)}`}>{fmtPct(c.change1d)}</td>
                    <td className={`com-cell ${pctClass(c.change1w)}`}>{fmtPct(c.change1w)}</td>
                    <td className={`com-cell ${pctClass(c.change1m)}`}>{fmtPct(c.change1m)}</td>
                    <td className="com-cell"><Sparkline values={c.sparkline} /></td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="com-panel-footer">Prices: Yahoo Finance futures contracts · Updated on load</div>
    </div>
  );
}
