import React, { useState, useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

const COLUMNS = [
  { key: 'ticker',        label: 'Ticker',  numeric: false },
  { key: 'name',          label: 'Name',    numeric: false },
  { key: 'sector',        label: 'Sector',  numeric: false },
  { key: 'price',         label: 'Price',   numeric: true, fmt: v => `$${v?.toFixed(2) ?? '—'}` },
  { key: 'changePct',     label: '1d%',     numeric: true, fmt: v => `${v > 0 ? '+' : ''}${v?.toFixed(1) ?? 0}%` },
  { key: 'marketCap',     label: 'Mkt Cap', numeric: true, fmt: v => `$${v}B` },
  { key: 'dividendYield', label: 'Yield',   numeric: true, fmt: v => `${v?.toFixed(1) ?? '—'}%` },
  { key: 'pFFO',          label: 'P/FFO',   numeric: true, fmt: v => `${v?.toFixed(1) ?? '—'}x` },
  { key: 'ytdReturn',     label: 'YTD',     numeric: true, fmt: v => `${v > 0 ? '+' : ''}${v?.toFixed(1) ?? 0}%` },
];

function buildVnqOption(history, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>$${p[0].value}`,
    },
    grid: { top: 8, right: 12, bottom: 20, left: 40 },
    xAxis: {
      type: 'category', data: history.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(history.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: history.closes, symbol: 'none',
      lineStyle: { color: '#f97316', width: 1.5 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,22,0.25)' }, { offset: 1, color: 'rgba(249,115,22,0)' }] } },
    }],
  };
}

export default function REITScreen({ reitData, reitEtf }) {
  const { colors } = useTheme();
  const [sortKey, setSortKey] = useState('marketCap');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...reitData].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? (av ?? 0) - (bv ?? 0) : (bv ?? 0) - (av ?? 0);
  });

  function handleSort(key) {
    if (key === sortKey) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  // Sector performance
  const sectorPerf = useMemo(() => {
    const groups = {};
    reitData.forEach(r => {
      if (!groups[r.sector]) groups[r.sector] = [];
      groups[r.sector].push(r.ytdReturn ?? 0);
    });
    return Object.entries(groups)
      .map(([sector, returns]) => ({ sector, avg: Math.round(returns.reduce((a, b) => a + b, 0) / returns.length * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg);
  }, [reitData]);

  const maxAbsReturn = Math.max(...sectorPerf.map(s => Math.abs(s.avg)), 1);

  // KPIs
  const totalMktCap = reitData.reduce((s, r) => s + (r.marketCap ?? 0), 0);
  const avgYield = reitData.filter(r => r.dividendYield != null).reduce((s, r, _, a) => s + r.dividendYield / a.length, 0);
  const bestPerf = reitData.reduce((best, r) => (!best || (r.ytdReturn ?? -999) > best.ytdReturn) ? r : best, null);

  const vnqOption = useMemo(
    () => reitEtf?.history ? buildVnqOption(reitEtf.history, colors) : null,
    [reitEtf, colors]
  );

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">REIT Screen</span>
        <span className="re-panel-subtitle">{reitData.length} REITs · click column headers to sort</span>
      </div>

      <div className="re-kpi-strip">
        {reitEtf && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">VNQ</span>
            <span className="re-kpi-value">${reitEtf.price}</span>
            <span className="re-kpi-sub">{reitEtf.ytd != null ? `YTD ${reitEtf.ytd > 0 ? '+' : ''}${reitEtf.ytd}%` : `${reitEtf.changePct > 0 ? '+' : ''}${reitEtf.changePct}%`}</span>
          </div>
        )}
        <div className="re-kpi-pill">
          <span className="re-kpi-label">Total Mkt Cap</span>
          <span className="re-kpi-value">${totalMktCap}B</span>
        </div>
        <div className="re-kpi-pill">
          <span className="re-kpi-label">Avg Yield</span>
          <span className="re-kpi-value">{avgYield.toFixed(1)}%</span>
        </div>
        {bestPerf && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Best Performer</span>
            <span className="re-kpi-value positive">{bestPerf.name}</span>
            <span className="re-kpi-sub">{bestPerf.ticker} +{bestPerf.ytdReturn?.toFixed(1)}% YTD</span>
          </div>
        )}
      </div>

      <div className="re-two-col" style={{ maxHeight: 180, marginBottom: 8 }}>
        <div className="re-chart-panel">
          <div className="re-chart-title">Sector YTD Performance</div>
          <div className="re-sector-bars" style={{ padding: '4px 0' }}>
            {sectorPerf.map(s => (
              <div key={s.sector} className="re-sector-row">
                <span className="re-sector-name">{s.sector}</span>
                <div className="re-sector-bar-wrap">
                  <div className="re-sector-bar-center" />
                  <div
                    className="re-sector-bar-fill"
                    style={{
                      width: `${(Math.abs(s.avg) / maxAbsReturn) * 50}%`,
                      left: s.avg >= 0 ? '50%' : `${50 - (Math.abs(s.avg) / maxAbsReturn) * 50}%`,
                      background: s.avg >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  />
                </div>
                <span className={`re-sector-val ${s.avg >= 0 ? 'positive' : 'negative'}`}>
                  {s.avg > 0 ? '+' : ''}{s.avg}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="re-chart-panel">
          <div className="re-chart-title">VNQ 1-Year</div>
          {vnqOption ? (
            <div className="re-mini-chart">
              <SafeECharts option={vnqOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'VNQ 1-Year', source: 'Yahoo Finance', endpoint: '/api/real-estate', series: [] }} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textDim, fontSize: 11 }}>
              VNQ history not available
            </div>
          )}
        </div>
      </div>

      <div className="reit-scroll">
        <table className="reit-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className={`reit-th${sortKey === col.key ? ' sorted' : ''}`} onClick={() => handleSort(col.key)}>
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
                  const isChange = col.key === 'ytdReturn' || col.key === 'changePct';
                  const colorClass = isChange ? (val >= 0 ? 'reit-positive' : 'reit-negative') : '';
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
        VNQ = Vanguard Real Estate ETF · Mkt Cap in $B · Yield = forward dividend yield · P/FFO = price / funds from operations
      </div>
    </div>
  );
}
