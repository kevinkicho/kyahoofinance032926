// src/markets/commodities/components/SupplyDemand.jsx
import React from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './CommoditiesDashboard.css';

function buildStocksOption(title, periods, values, avg5yr, colors) {
  const avgLine = avg5yr != null ? Array(values.length).fill(avg5yr) : null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: avgLine ? {
      data: [title, '5yr Avg'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    } : undefined,
    grid: { top: avgLine ? 24 : 10, right: 8, bottom: 28, left: 48, containLabel: false },
    xAxis: {
      type: 'category',
      data: periods,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: {
        color: colors.textMuted, fontSize: 9,
        formatter: (v) => v ? v.slice(5) : v,
        interval: Math.floor(periods.length / 6),
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [
      {
        name: title,
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#ca8a04' },
        lineStyle: { color: '#ca8a04', width: 2 },
        areaStyle: { color: 'rgba(202,138,4,0.08)' },
      },
      ...(avgLine ? [{
        name: '5yr Avg',
        type: 'line',
        data: avgLine,
        symbol: 'none',
        lineStyle: { color: colors.textDim, width: 1, type: 'dashed' },
      }] : []),
    ],
  };
}

function buildGoldOption(dates, values, colors) {
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>$${params[0].value.toFixed(2)}/oz`,
    },
    grid: { top: 10, right: 8, bottom: 28, left: 52, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(dates.length / 5) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
    },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'none',
      itemStyle: { color: '#f59e0b' },
      lineStyle: { color: '#f59e0b', width: 2 },
      areaStyle: { color: 'rgba(245,158,11,0.08)' },
    }],
  };
}

export default function SupplyDemand({ supplyDemandData, fredCommodities, lastUpdated }) {
  const { colors } = useTheme();
  if (!supplyDemandData) return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Supply &amp; Demand Monitor</span>
        <span className="com-panel-subtitle">EIA weekly data + FRED gold history</span>
      </div>
      <div className="com-empty">No supply/demand data available</div>
    </div>
  );

  let crudeStocks, natGasStorage, crudeProduction, gasolineStocks, distillateStocks;
  if (Array.isArray(supplyDemandData)) {
    const cs = supplyDemandData.find(s => s.name === 'Crude Oil Inventories');
    const ns = supplyDemandData.find(s => s.name === 'Natural Gas Storage');
    crudeStocks = cs ? { periods: [], values: [], avg5yr: null } : { periods: [], values: [], avg5yr: null };
    natGasStorage = ns ? { periods: [], values: [], avg5yr: null } : { periods: [], values: [], avg5yr: null };
    crudeProduction = { periods: [], values: [] };
    gasolineStocks = { periods: [], values: [], avg5yr: null };
    distillateStocks = { periods: [], values: [], avg5yr: null };
  } else {
    crudeStocks     = supplyDemandData.crudeStocks     || { periods: [], values: [], avg5yr: null };
    natGasStorage   = supplyDemandData.natGasStorage   || { periods: [], values: [], avg5yr: null };
    crudeProduction = supplyDemandData.crudeProduction || { periods: [], values: [] };
    gasolineStocks  = supplyDemandData.gasolineStocks  || { periods: [], values: [], avg5yr: null };
    distillateStocks = supplyDemandData.distillateStocks || { periods: [], values: [], avg5yr: null };
  }

  // KPI computations
  const crudeLatest = crudeStocks.values.length ? crudeStocks.values[crudeStocks.values.length - 1] : null;
  const crudeDelta  = crudeStocks.avg5yr != null && crudeLatest != null
    ? Math.round((crudeLatest - crudeStocks.avg5yr) * 10) / 10
    : null;
  const gasLatest   = natGasStorage.values.length ? natGasStorage.values[natGasStorage.values.length - 1] : null;
  const gasDelta    = natGasStorage.avg5yr != null && gasLatest != null
    ? Math.round(gasLatest - natGasStorage.avg5yr)
    : null;

  const surplusRows = [
    { label: 'Crude Oil', latest: crudeLatest, avg5yr: crudeStocks.avg5yr, unit: 'M bbl', delta: crudeDelta },
    { label: 'Gasoline', latest: gasolineStocks.values.length ? gasolineStocks.values[gasolineStocks.values.length - 1] : null, avg5yr: gasolineStocks.avg5yr, unit: 'M bbl', delta: null },
    { label: 'Distillate', latest: distillateStocks.values.length ? distillateStocks.values[distillateStocks.values.length - 1] : null, avg5yr: distillateStocks.avg5yr, unit: 'M bbl', delta: null },
    { label: 'Nat Gas', latest: gasLatest, avg5yr: natGasStorage.avg5yr, unit: 'Bcf', delta: gasDelta },
  ].map(r => {
    if (r.delta == null && r.latest != null && r.avg5yr != null) {
      r.delta = Math.round((r.latest - r.avg5yr) * 10) / 10;
    }
    r.status = r.delta == null ? null : r.delta >= 0 ? 'SURPLUS' : 'DEFICIT';
    return r;
  });

  const goldH = fredCommodities?.goldHistory;
  const goldOption = goldH?.dates?.length >= 10 ? buildGoldOption(goldH.dates, goldH.values, colors) : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Supply &amp; Demand Monitor</span>
        <span className="com-panel-subtitle">EIA weekly data + FRED gold history</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Crude Stocks</span>
          <span className="com-kpi-value">{crudeLatest != null ? <MetricValue value={crudeLatest} seriesKey="crudeStocks" timestamp={lastUpdated} format={v => `${v.toFixed(1)}M`} /> : '—'}</span>
          <span className={`com-kpi-sub ${crudeDelta != null ? (crudeDelta >= 0 ? 'com-up' : 'com-down') : ''}`}>
            {crudeDelta != null ? <><MetricValue value={crudeDelta} seriesKey="crudeStocks" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}M`} /> vs 5yr avg</> : '—'}
          </span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Nat Gas Storage</span>
          <span className="com-kpi-value">{gasLatest != null ? <MetricValue value={gasLatest} seriesKey="gasStorage" timestamp={lastUpdated} format={v => `${v.toLocaleString()} Bcf`} /> : '—'}</span>
          <span className={`com-kpi-sub ${gasDelta != null ? (gasDelta >= 0 ? 'com-up' : 'com-down') : ''}`}>
            {gasDelta != null ? <><MetricValue value={gasDelta} seriesKey="gasStorage" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toLocaleString()}`} /> vs 5yr avg</> : '—'}
          </span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Crude Production</span>
          <span className="com-kpi-value">
            {crudeProduction.values.length ? <MetricValue value={crudeProduction.values[crudeProduction.values.length - 1]} seriesKey="crudeProduction" timestamp={lastUpdated} format={v => `${v.toFixed(1)}M`} /> : '—'}
          </span>
          <span className="com-kpi-sub">bbl/day</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold (FRED)</span>
          <span className="com-kpi-value" style={{ color: '#f59e0b' }}>
            {goldH?.values?.length ? <MetricValue value={goldH.values[goldH.values.length - 1]} seriesKey="goldFRED" timestamp={lastUpdated} format={v => `$${v.toLocaleString()}`} /> : '—'}
          </span>
          <span className="com-kpi-sub">London Fix $/oz</span>
        </div>
      </div>

      {/* Surplus/Deficit Table */}
      {surplusRows.some(r => r.status != null) && (
        <div className="com-surplus-table" style={{ marginTop: 6, marginBottom: 6, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.cardBg}` }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: colors.textMuted, fontWeight: 600 }}>Commodity</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: colors.textMuted, fontWeight: 600 }}>Latest</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: colors.textMuted, fontWeight: 600 }}>5yr Avg</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: colors.textMuted, fontWeight: 600 }}>vs Avg</th>
                <th style={{ textAlign: 'center', padding: '4px 8px', color: colors.textMuted, fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {surplusRows.filter(r => r.latest != null).map(r => (
                <tr key={r.label} style={{ borderBottom: `1px solid ${colors.cardBg}` }}>
                  <td style={{ padding: '4px 8px', color: colors.text }}>{r.label}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: colors.text, fontFamily: 'monospace' }}>{r.latest != null ? `${r.latest.toFixed(1)} ${r.unit}` : '—'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: colors.textDim, fontFamily: 'monospace' }}>{r.avg5yr != null ? `${r.avg5yr.toFixed(1)} ${r.unit}` : '—'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', color: r.delta != null ? (r.delta >= 0 ? '#22c55e' : '#ef4444') : colors.textDim }}>{r.delta != null ? `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(1)}` : '—'}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, fontSize: 10, letterSpacing: 0.5, color: r.status === 'SURPLUS' ? '#22c55e' : r.status === 'DEFICIT' ? '#ef4444' : colors.textDim }}>{r.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Three-column top row */}
      <div className="com-three-col" style={{ marginBottom: 8 }}>
        <div className="com-chart-panel">
          <div className="com-chart-title">US Crude Oil Stocks (M bbl)</div>
          <div className="com-mini-chart">
            <SafeECharts
              option={buildStocksOption('Crude Stocks', crudeStocks.periods, crudeStocks.values, crudeStocks.avg5yr, colors)}
              style={{ height: '100%', maxHeight: '100%', width: '100%' }}
              sourceInfo={{ title: 'US Crude Oil Stocks', source: 'EIA', endpoint: '/api/commodities', series: [], updatedAt: lastUpdated }}
            />
          </div>
        </div>
        <div className="com-chart-panel">
          <div className="com-chart-title">Natural Gas Storage (Bcf)</div>
          <div className="com-mini-chart">
            <SafeECharts
              option={buildStocksOption('Nat Gas', natGasStorage.periods, natGasStorage.values, natGasStorage.avg5yr, colors)}
              style={{ height: '100%', maxHeight: '100%', width: '100%' }}
              sourceInfo={{ title: 'Natural Gas Storage', source: 'EIA', endpoint: '/api/commodities', series: [], updatedAt: lastUpdated }}
            />
          </div>
        </div>
        {goldOption ? (
          <div className="com-chart-panel">
            <div className="com-chart-title">Gold Price — 1 Year (FRED)</div>
            <div className="com-mini-chart">
              <SafeECharts option={goldOption} style={{ height: '100%', maxHeight: '100%', width: '100%' }} sourceInfo={{ title: 'Gold Price (FRED)', source: 'FRED', endpoint: '/api/commodities', series: [{ id: 'GOLDAMGBD228NLBM' }], updatedAt: lastUpdated }} />
            </div>
          </div>
        ) : (
          <div className="com-chart-panel">
            <div className="com-chart-title">Gold Price</div>
            <div className="com-mini-chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textDim }}>
              No FRED data available
            </div>
          </div>
        )}
      </div>

      {/* Bottom: crude production full-width */}
      <div className="com-chart-panel" style={{ marginTop: 8 }}>
        <div className="com-chart-title">US Crude Production (M bbl/day) — 52 Weeks</div>
        <div className="com-mini-chart">
<SafeECharts
              option={buildStocksOption('Production', crudeProduction.periods, crudeProduction.values, null, colors)}
              style={{ height: '100%', maxHeight: '100%', width: '100%' }}
              sourceInfo={{ title: 'US Crude Production', source: 'EIA', endpoint: '/api/commodities', series: [], updatedAt: lastUpdated }}
            />
        </div>
      </div>

      <div className="com-panel-footer">Source: EIA API v2 · FRED GOLDAMGBD228NLBM · Crude stocks released Wednesdays · Nat gas released Thursdays</div>
    </div>
  );
}
