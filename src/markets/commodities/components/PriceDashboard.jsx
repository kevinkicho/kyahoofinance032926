// src/markets/commodities/components/PriceDashboard.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
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

const SECTOR_ICONS = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾', Livestock: '🐄' };

export default function PriceDashboard({ priceDashboardData, dbcEtf, fredCommodities }) {
  const { colors } = useTheme();

  // KPI computations
  const allCommodities = priceDashboardData.flatMap(s => s.commodities);
  const wti  = allCommodities.find(c => c.ticker === 'CL=F');
  const gold = allCommodities.find(c => c.ticker === 'GC=F');
  const best1m = allCommodities.reduce((best, c) => (c.change1m != null && (best == null || c.change1m > best.change1m) ? c : best), null);

  // DBC 1yr line chart option
  const dbcOption = dbcEtf?.history?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    grid: { top: 8, right: 8, bottom: 24, left: 40, containLabel: false },
    xAxis: {
      type: 'category',
      data: dbcEtf.history.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(dbcEtf.history.dates.length / 5) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
    },
    series: [{
      type: 'line',
      data: dbcEtf.history.closes,
      smooth: true,
      symbol: 'none',
      itemStyle: { color: '#ca8a04' },
      lineStyle: { color: '#ca8a04', width: 2 },
      areaStyle: { color: 'rgba(202,138,4,0.08)' },
    }],
  } : null;

  // WTI vs Brent overlay option
  const wtiH = fredCommodities?.wtiHistory;
  const brentH = fredCommodities?.brentHistory;
  const overlayOption = wtiH?.dates?.length >= 10 && brentH?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: ['WTI', 'Brent'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 8, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: wtiH.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(wtiH.dates.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
    },
    series: [
      { name: 'WTI', type: 'line', data: wtiH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ca8a04' }, itemStyle: { color: '#ca8a04' } },
      { name: 'Brent', type: 'line', data: brentH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#60a5fa' }, itemStyle: { color: '#60a5fa' } },
    ],
  } : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Price Dashboard</span>
        <span className="com-panel-subtitle">Live commodity prices · Updated on load</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        <div className="com-kpi-pill">
          <span className="com-kpi-label">WTI Crude</span>
          <span className="com-kpi-value">${wti?.price?.toFixed(2) ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(wti?.change1d)}`}>{fmtPct(wti?.change1d)} today</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold</span>
          <span className="com-kpi-value">${gold?.price?.toLocaleString() ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(gold?.change1d)}`}>{fmtPct(gold?.change1d)} today</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">DBC Index</span>
          <span className="com-kpi-value">${dbcEtf?.price?.toFixed(2) ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(dbcEtf?.ytd)}`}>YTD {dbcEtf?.ytd != null ? `${dbcEtf.ytd > 0 ? '+' : ''}${dbcEtf.ytd.toFixed(1)}%` : '—'}</span>
        </div>
        {best1m && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Best 1M Performer</span>
            <span className="com-kpi-value" style={{ color: '#ca8a04' }}>{best1m.name}</span>
            <span className="com-kpi-sub com-up">{fmtPct(best1m.change1m)}</span>
          </div>
        )}
      </div>

      {/* Main content: table (wide) + DBC chart (narrow) */}
      <div className="com-wide-narrow" style={{ marginBottom: 12 }}>
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
        {dbcOption && (
          <div className="com-chart-panel">
            <div className="com-chart-title">DBC Commodity ETF — 1 Year</div>
            <div className="com-mini-chart">
              <ReactECharts option={dbcOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom chart: WTI vs Brent */}
      {overlayOption && (
        <div className="com-chart-panel" style={{ height: 180, flexShrink: 0 }}>
          <div className="com-chart-title">WTI vs Brent Crude — 1 Year (FRED daily)</div>
          <div className="com-mini-chart">
            <ReactECharts option={overlayOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">Prices: Yahoo Finance futures · History: FRED DCOILWTICO/DCOILBRENTEU · DBC: Invesco DB Commodity Index</div>
    </div>
  );
}
