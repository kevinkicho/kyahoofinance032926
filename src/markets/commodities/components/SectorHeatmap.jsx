// src/markets/commodities/components/SectorHeatmap.jsx
import React from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
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

const SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture', 'Livestock'];
const SECTOR_ICONS  = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾', Livestock: '🐄' };

export default function SectorHeatmap({ sectorHeatmapData, fredCommodities }) {
  const { colors } = useTheme();
  const { commodities = [], columns = [] } = sectorHeatmapData;
  const colKeys = ['d1', 'w1', 'm1'];

  // KPI computations
  const best1d  = commodities.reduce((b, c) => (c.d1 != null && (b == null || c.d1 > b.d1) ? c : b), null);
  const worst1d = commodities.reduce((w, c) => (c.d1 != null && (w == null || c.d1 < w.d1) ? c : w), null);
  const ppi = fredCommodities?.ppiCommodity;
  const ppiYoy = ppi?.values?.length >= 13
    ? Math.round((ppi.values[ppi.values.length - 1] / ppi.values[ppi.values.length - 13] - 1) * 1000) / 10
    : null;

  // Sector avg 1d% for bars
  const sectorAvgs = SECTORS_ORDER.map(sector => {
    const rows = commodities.filter(c => c.sector === sector);
    if (rows.length === 0) return null;
    const avg = rows.reduce((s, c) => s + (c.d1 || 0), 0) / rows.length;
    return { sector, avg: Math.round(avg * 100) / 100 };
  }).filter(Boolean);
  const maxAbsAvg = Math.max(...sectorAvgs.map(s => Math.abs(s.avg)), 1);

  // PPI chart option
  const ppiOption = ppi?.dates?.length >= 6 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    grid: { top: 8, right: 8, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: ppi.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(ppi.dates.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [{
      type: 'line',
      data: ppi.values,
      smooth: true,
      symbol: 'none',
      itemStyle: { color: '#ca8a04' },
      lineStyle: { color: '#ca8a04', width: 2 },
      areaStyle: { color: 'rgba(202,138,4,0.08)' },
    }],
  } : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Sector Performance Heatmap</span>
        <span className="com-panel-subtitle">% change by commodity and time horizon</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        {best1d && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Best Today</span>
            <span className="com-kpi-value" style={{ color: '#ca8a04' }}>{best1d.name}</span>
            <span className="com-kpi-sub com-up">{fmtPct(best1d.d1)}</span>
          </div>
        )}
        {worst1d && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Worst Today</span>
            <span className="com-kpi-value" style={{ color: '#ca8a04' }}>{worst1d.name}</span>
            <span className="com-kpi-sub com-down">{fmtPct(worst1d.d1)}</span>
          </div>
        )}
        <div className="com-kpi-pill">
          <span className="com-kpi-label">PPI Commodity YoY</span>
          <span className={`com-kpi-value ${ppiYoy != null ? (ppiYoy >= 0 ? 'positive' : 'negative') : ''}`}>
            {ppiYoy != null ? `${ppiYoy > 0 ? '+' : ''}${ppiYoy.toFixed(1)}%` : '—'}
          </span>
          <span className="com-kpi-sub">FRED WPUFD49207</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Retail Gas</span>
          <span className="com-kpi-value">${fredCommodities?.gasRetail?.toFixed(3) ?? '—'}</span>
          <span className="com-kpi-sub">US avg $/gal</span>
        </div>
      </div>

      {/* Main: heatmap table (wide) + sector bars (narrow) */}
      <div className="com-wide-narrow" style={{ marginBottom: 12 }}>
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
                if (rows.length === 0) return null;
                return (
                  <React.Fragment key={sector}>
                    <tr className="com-sector-row">
                      <td colSpan={columns.length + 1}>{SECTOR_ICONS[sector] || ''} {sector}</td>
                    </tr>
                    {rows.map(c => (
                      <tr key={c.ticker} className="com-row">
                        <td className="com-cell">{c.name}</td>
                        {colKeys.map(k => (
                          <td key={k} className={`com-cell ${heatClass(c[k])}`} style={{ fontWeight: 500 }}>
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
        <div className="com-chart-panel">
          <div className="com-chart-title">Sector Avg 1d%</div>
          <div className="com-sector-bars" style={{ marginTop: 8 }}>
            {sectorAvgs.map(s => {
              const pct = Math.abs(s.avg) / maxAbsAvg * 50;
              const isPos = s.avg >= 0;
              return (
                <div key={s.sector} className="com-sector-bar-row">
                  <span className="com-sector-bar-name">{s.sector}</span>
                  <div className="com-sector-bar-wrap">
                    <div className="com-sector-bar-center" />
                    <div
                      className="com-sector-bar-fill"
                      style={{
                        width: `${pct}%`,
                        left: isPos ? '50%' : `${50 - pct}%`,
                        background: isPos ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`com-sector-bar-val ${isPos ? 'positive' : 'negative'}`}>
                    {s.avg >= 0 ? '+' : ''}{s.avg.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PPI chart */}
      {ppiOption && (
        <div className="com-chart-panel" style={{ height: 170, flexShrink: 0 }}>
          <div className="com-chart-title">PPI Commodity Index — 3 Year (FRED monthly)</div>
          <div className="com-mini-chart">
            <SafeECharts option={ppiOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">Colors: green = positive returns · red = negative · PPI: FRED WPUFD49207 · Gas: FRED GASREGW</div>
    </div>
  );
}
