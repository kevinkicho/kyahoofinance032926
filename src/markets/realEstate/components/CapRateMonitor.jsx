// src/markets/realEstate/components/CapRateMonitor.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

function yieldColor(y) {
  if (y >= 5) return '#f87171';
  if (y >= 4) return '#fbbf24';
  if (y >= 3) return '#34d399';
  return '#6366f1';
}

function buildYieldOption(capRateData, treasury10y, colors) {
  const sorted = [...capRateData].sort((a, b) => a.impliedYield - b.impliedYield);
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => {
        const v = params[0].value;
        const spread = treasury10y != null ? (v - treasury10y).toFixed(1) : '—';
        return `${params[0].name}: ${v}%<br/>Spread to 10Y: ${spread}%`;
      },
    },
    grid: { top: 8, right: 60, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.sector),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [
      {
        type: 'bar', barMaxWidth: 20,
        data: sorted.map(s => ({
          value: s.impliedYield,
          itemStyle: { color: yieldColor(s.impliedYield) },
        })),
        label: { show: true, position: 'right', formatter: p => `${p.value}%`, color: colors.textSecondary, fontSize: 9 },
        markLine: treasury10y != null ? {
          silent: true,
          data: [{ xAxis: treasury10y, label: { formatter: `10Y: ${treasury10y}%`, color: '#60a5fa', fontSize: 9 }, lineStyle: { color: '#60a5fa', type: 'dashed', width: 1.5 } }],
        } : undefined,
      },
    ],
  };
}

function buildRentCpiOption(rentCpi, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>CPI Rent: ${p[0].value}`,
    },
    grid: { top: 8, right: 12, bottom: 20, left: 40 },
    xAxis: {
      type: 'category', data: rentCpi.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(rentCpi.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: colors.textMuted, fontSize: 9 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: rentCpi.values, symbol: 'none',
      lineStyle: { color: '#f97316', width: 1.5 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,22,0.2)' }, { offset: 1, color: 'rgba(249,115,22,0)' }] } },
    }],
  };
}

export default function CapRateMonitor({ capRateData, reitData, treasury10y, homeownershipRate, rentCpi }) {
  const { colors } = useTheme();

  const yieldOption = useMemo(() => capRateData?.length ? buildYieldOption(capRateData, treasury10y, colors) : null, [capRateData, treasury10y, colors]);
  const rentOption = useMemo(() => rentCpi?.dates?.length >= 4 ? buildRentCpiOption(rentCpi, colors) : null, [rentCpi, colors]);

  const avgYield = capRateData?.length ? Math.round(capRateData.reduce((s, c) => s + c.impliedYield, 0) / capRateData.length * 10) / 10 : null;
  const spread = avgYield != null && treasury10y != null ? Math.round((avgYield - treasury10y) * 10) / 10 : null;

  // Sector detail: count REITs + avg market cap per sector
  const sectorDetail = useMemo(() => {
    if (!capRateData?.length || !reitData?.length) return [];
    return capRateData.map(c => {
      const reits = reitData.filter(r => r.sector === c.sector);
      const avgCap = reits.length ? Math.round(reits.reduce((s, r) => s + (r.marketCap ?? 0), 0) / reits.length) : null;
      return { ...c, count: reits.length, avgCap, spread: treasury10y != null ? Math.round((c.impliedYield - treasury10y) * 10) / 10 : null };
    }).sort((a, b) => b.impliedYield - a.impliedYield);
  }, [capRateData, reitData, treasury10y]);

  if (!yieldOption) return null;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Cap Rate Monitor</span>
        <span className="re-panel-subtitle">REIT dividend yield as cap rate proxy · spread to 10Y Treasury</span>
      </div>

      <div className="re-kpi-strip">
        {avgYield != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Avg REIT Yield</span>
            <span className="re-kpi-value">{avgYield}%</span>
          </div>
        )}
        {treasury10y != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">10Y Treasury</span>
            <span className="re-kpi-value">{treasury10y}%</span>
          </div>
        )}
        {spread != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Spread</span>
            <span className={`re-kpi-value ${spread >= 0 ? 'positive' : 'negative'}`}>{spread > 0 ? '+' : ''}{spread}%</span>
          </div>
        )}
        {homeownershipRate != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Homeownership</span>
            <span className="re-kpi-value">{homeownershipRate}%</span>
          </div>
        )}
      </div>

      <div className="re-two-col">
        <div className="re-chart-panel">
          <div className="re-chart-title">Implied Yield by Sector</div>
          <div className="re-mini-chart">
            <ReactECharts option={yieldOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="re-chart-panel" style={{ overflow: 'auto' }}>
          <div className="re-chart-title">Sector Detail</div>
          <div className="re-sector-cards">
            {sectorDetail.map(s => (
              <div key={s.sector} className="re-sector-card">
                <div className="re-sector-card-name">{s.sector}</div>
                <div className="re-sector-card-row">
                  <span className="re-sector-card-label">Yield</span>
                  <span className="re-sector-card-val" style={{ color: yieldColor(s.impliedYield) }}>{s.impliedYield}%</span>
                </div>
                {s.spread != null && (
                  <div className="re-sector-card-row">
                    <span className="re-sector-card-label">Spread</span>
                    <span className="re-sector-card-val">{s.spread > 0 ? '+' : ''}{s.spread}%</span>
                  </div>
                )}
                <div className="re-sector-card-row">
                  <span className="re-sector-card-label">REITs</span>
                  <span className="re-sector-card-val">{s.count}</span>
                </div>
                {s.avgCap != null && (
                  <div className="re-sector-card-row">
                    <span className="re-sector-card-label">Avg Cap</span>
                    <span className="re-sector-card-val">${s.avgCap}B</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {rentOption && (
        <div className="re-chart-panel" style={{ marginTop: 8, height: 130, flexShrink: 0 }}>
          <div className="re-chart-title">Rent CPI (Primary Residence)</div>
          <div className="re-mini-chart">
            <ReactECharts option={rentOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="re-panel-footer">
        Dividend yield approximates cap rate · Higher yield = higher risk / lower valuation · Spread = yield − 10Y Treasury
      </div>
    </div>
  );
}
