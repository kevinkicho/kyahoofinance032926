// src/markets/commodities/components/SupplyDemand.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CommodComponents.css';

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

export default function SupplyDemand({ supplyDemandData, fredCommodities }) {
  const { colors } = useTheme();
  if (!supplyDemandData) return null;
  const {
    crudeStocks     = { periods: [], values: [], avg5yr: null },
    natGasStorage   = { periods: [], values: [], avg5yr: null },
    crudeProduction = { periods: [], values: [] },
  } = supplyDemandData;

  // KPI computations
  const crudeLatest = crudeStocks.values.length ? crudeStocks.values[crudeStocks.values.length - 1] : null;
  const crudeDelta  = crudeStocks.avg5yr != null && crudeLatest != null
    ? Math.round((crudeLatest - crudeStocks.avg5yr) * 10) / 10
    : null;
  const gasLatest   = natGasStorage.values.length ? natGasStorage.values[natGasStorage.values.length - 1] : null;
  const gasDelta    = natGasStorage.avg5yr != null && gasLatest != null
    ? Math.round(gasLatest - natGasStorage.avg5yr)
    : null;

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
          <span className="com-kpi-value">{crudeLatest != null ? `${crudeLatest.toFixed(1)}M` : '—'}</span>
          <span className={`com-kpi-sub ${crudeDelta != null ? (crudeDelta >= 0 ? 'com-up' : 'com-down') : ''}`}>
            {crudeDelta != null ? `${crudeDelta >= 0 ? '+' : ''}${crudeDelta.toFixed(1)}M vs 5yr avg` : '—'}
          </span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Nat Gas Storage</span>
          <span className="com-kpi-value">{gasLatest != null ? `${gasLatest.toLocaleString()} Bcf` : '—'}</span>
          <span className={`com-kpi-sub ${gasDelta != null ? (gasDelta >= 0 ? 'com-up' : 'com-down') : ''}`}>
            {gasDelta != null ? `${gasDelta >= 0 ? '+' : ''}${gasDelta.toLocaleString()} vs 5yr avg` : '—'}
          </span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Crude Production</span>
          <span className="com-kpi-value">
            {crudeProduction.values.length ? `${crudeProduction.values[crudeProduction.values.length - 1].toFixed(1)}M` : '—'}
          </span>
          <span className="com-kpi-sub">bbl/day</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold (FRED)</span>
          <span className="com-kpi-value" style={{ color: '#f59e0b' }}>
            {goldH?.values?.length ? `$${goldH.values[goldH.values.length - 1].toLocaleString()}` : '—'}
          </span>
          <span className="com-kpi-sub">London Fix $/oz</span>
        </div>
      </div>

      {/* Three-column top row */}
      <div className="com-three-col" style={{ marginBottom: 12 }}>
        <div className="com-chart-panel">
          <div className="com-chart-title">US Crude Oil Stocks (M bbl)</div>
          <div className="com-mini-chart">
            <ReactECharts
              option={buildStocksOption('Crude Stocks', crudeStocks.periods, crudeStocks.values, crudeStocks.avg5yr, colors)}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        <div className="com-chart-panel">
          <div className="com-chart-title">Natural Gas Storage (Bcf)</div>
          <div className="com-mini-chart">
            <ReactECharts
              option={buildStocksOption('Nat Gas', natGasStorage.periods, natGasStorage.values, natGasStorage.avg5yr, colors)}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        {goldOption ? (
          <div className="com-chart-panel">
            <div className="com-chart-title">Gold Price — 1 Year (FRED)</div>
            <div className="com-mini-chart">
              <ReactECharts option={goldOption} style={{ height: '100%', width: '100%' }} />
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
      <div className="com-chart-panel" style={{ height: 170, flexShrink: 0 }}>
        <div className="com-chart-title">US Crude Production (M bbl/day) — 52 Weeks</div>
        <div className="com-mini-chart">
          <ReactECharts
            option={buildStocksOption('Production', crudeProduction.periods, crudeProduction.values, null, colors)}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>

      <div className="com-panel-footer">Source: EIA API v2 · FRED GOLDAMGBD228NLBM · Crude stocks released Wednesdays · Nat gas released Thursdays</div>
    </div>
  );
}
