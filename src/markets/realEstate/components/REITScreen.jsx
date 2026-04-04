import React, { useState } from 'react';
import './REComponents.css';

const COLUMNS = [
  { key: 'ticker',        label: 'Ticker',  numeric: false },
  { key: 'name',          label: 'Name',    numeric: false },
  { key: 'sector',        label: 'Sector',  numeric: false },
  { key: 'marketCap',     label: 'Mkt Cap', numeric: true,  fmt: v => `$${v}B`             },
  { key: 'dividendYield', label: 'Yield',   numeric: true,  fmt: v => `${v.toFixed(1)}%`   },
  { key: 'pFFO',          label: 'P/FFO',   numeric: true,  fmt: v => `${v.toFixed(1)}x`   },
  { key: 'ytdReturn',     label: 'YTD',     numeric: true,  fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%` },
];

export default function REITScreen({ reitData }) {
  const [sortKey, setSortKey] = useState('marketCap');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...reitData].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  function handleSort(key) {
    if (key === sortKey) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">REIT Screen</span>
        <span className="re-panel-subtitle">{reitData.length} REITs · click column headers to sort</span>
      </div>
      <div className="reit-scroll">
        <table className="reit-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`reit-th${sortKey === col.key ? ' sorted' : ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.ticker} className="reit-row">
                {COLUMNS.map(col => {
                  const val = row[col.key];
                  const display = col.fmt ? col.fmt(val) : val;
                  const colorClass = col.key === 'ytdReturn'
                    ? (val >= 0 ? 'reit-positive' : 'reit-negative')
                    : '';
                  return (
                    <td key={col.key} className={`reit-cell${colorClass ? ` ${colorClass}` : ''}`}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="re-panel-footer">
        Mkt Cap in $B · Yield = forward dividend yield · P/FFO = price / funds from operations · YTD = year-to-date return
      </div>
    </div>
  );
}
