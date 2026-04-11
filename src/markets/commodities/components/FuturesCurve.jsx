// src/markets/commodities/components/FuturesCurve.jsx
import React from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './CommoditiesDashboard.css';

function buildCurveOption(labels, prices, accentColor, unit, colors) {
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/><span style="color:${accentColor}">$${p.value.toFixed(2)}</span>`;
      },
    },
    grid: { top: 12, right: 16, bottom: 32, left: 52, containLabel: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 10, formatter: v => `$${v}` },
    },
    series: [{
      type: 'line',
      data: prices,
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: accentColor },
      lineStyle: { color: accentColor, width: 2 },
    }],
  };
}

function spreadPct(prices) {
  if (!prices || prices.length < 2) return null;
  return Math.round((prices[prices.length - 1] / prices[0] - 1) * 1000) / 10;
}

function structureLabel(spread) {
  if (spread == null) return '';
  return spread > 0 ? 'Contango' : spread < 0 ? 'Backwardation' : 'Flat';
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildSeasonalOption(seasonalPatterns, colors) {
  if (!seasonalPatterns) return null;
  const { CL, GC, ZC } = seasonalPatterns;
  if (!CL?.length || !GC?.length || !ZC?.length) return null;

  function makeSeries(name, data, color) {
    return {
      name,
      type: 'bar',
      data: data.map((v, i) => ({
        value: v,
        itemStyle: { color: v >= 0 ? '#22c55e' : '#ef4444', opacity: 0.85 },
      })),
      barMaxWidth: 20,
      label: { show: false },
    };
  }

  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const month = MONTH_LABELS[params[0]?.dataIndex ?? 0];
        const lines = params.map(p => {
          const val = p.value;
          const sign = val >= 0 ? '+' : '';
          const col = val >= 0 ? '#22c55e' : '#ef4444';
          return `<span style="color:${col}">● ${p.seriesName}: ${sign}${val.toFixed(2)}%</span>`;
        });
        return `<b>${month}</b><br/>${lines.join('<br/>')}`;
      },
    },
    legend: {
      data: ['CL (Crude)', 'GC (Gold)', 'ZC (Corn)'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 28, right: 8, bottom: 32, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: MONTH_LABELS,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [
      makeSeries('CL (Crude)', CL, '#ca8a04'),
      makeSeries('GC (Gold)', GC, '#f59e0b'),
      makeSeries('ZC (Corn)', ZC, '#4ade80'),
    ],
  };
}

export default function FuturesCurve({ futuresCurveData, goldFuturesCurve, fredCommodities, seasonalPatterns }) {
  const { colors } = useTheme();
  const wti = futuresCurveData || {};
  const gold = goldFuturesCurve || {};

  const wtiSpread  = spreadPct(wti.prices);
  const goldSpread = spreadPct(gold.prices);

  const wtiOption      = wti.labels?.length >= 2  ? buildCurveOption(wti.labels, wti.prices, '#ca8a04', wti.unit, colors) : null;
  const goldOption     = gold.labels?.length >= 2 ? buildCurveOption(gold.labels, gold.prices, '#f59e0b', gold.unit, colors) : null;
  const seasonalOption = buildSeasonalOption(seasonalPatterns, colors);

  // Dollar Index vs WTI overlay (dual Y-axis)
  const dollarH = fredCommodities?.dollarIndex;
  const wtiH    = fredCommodities?.wtiHistory;
  const dualOption = dollarH?.dates?.length >= 10 && wtiH?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: ['WTI ($/bbl)', 'Dollar Index'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 48, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: wtiH.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(wtiH.dates.length / 6) },
    },
    yAxis: [
      {
        type: 'value',
        position: 'left',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: colors.cardBg } },
        axisLabel: { color: '#ca8a04', fontSize: 9, formatter: v => `$${v}` },
      },
      {
        type: 'value',
        position: 'right',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#60a5fa', fontSize: 9 },
      },
    ],
    series: [
      { name: 'WTI ($/bbl)', type: 'line', yAxisIndex: 0, data: wtiH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ca8a04' }, itemStyle: { color: '#ca8a04' } },
      { name: 'Dollar Index', type: 'line', yAxisIndex: 1, data: dollarH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#60a5fa' }, itemStyle: { color: '#60a5fa' } },
    ],
  } : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Futures Curves</span>
        <span className="com-panel-subtitle">Forward contract pricing — term structure</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        <div className="com-kpi-pill">
          <span className="com-kpi-label">WTI Spot</span>
          <span className="com-kpi-value">${wti.spotPrice?.toFixed(2) ?? '—'}</span>
          <span className="com-kpi-sub">{structureLabel(wtiSpread)} {wtiSpread != null ? `(${wtiSpread > 0 ? '+' : ''}${wtiSpread.toFixed(1)}%)` : ''}</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold Spot</span>
          <span className="com-kpi-value">${gold.spotPrice?.toLocaleString() ?? '—'}</span>
          <span className="com-kpi-sub">{structureLabel(goldSpread)} {goldSpread != null ? `(${goldSpread > 0 ? '+' : ''}${goldSpread.toFixed(1)}%)` : ''}</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">WTI Contracts</span>
          <span className="com-kpi-value">{wti.labels?.length ?? 0}</span>
          <span className="com-kpi-sub">months forward</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold Contracts</span>
          <span className="com-kpi-value">{gold.labels?.length ?? 0}</span>
          <span className="com-kpi-sub">months forward</span>
        </div>
      </div>

      {/* Two curves side by side */}
      <div className="com-two-col" style={{ marginBottom: 8 }}>
        {wtiOption && (
          <div className="com-chart-panel">
            <div className="com-chart-title">WTI Crude Oil — {wti.labels?.length} Months ({wti.unit})</div>
            <div className="com-mini-chart">
              <SafeECharts option={wtiOption} style={{ height: '100%', maxHeight: '100%', width: '100%' }} />
            </div>
            {wtiSpread != null && (
              <span className={`com-curve-pill ${wtiSpread > 0 ? 'com-contango' : 'com-backwardation'}`} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                {wtiSpread > 0 ? '▲ Contango' : '▼ Backwardation'} · {Math.abs(wtiSpread).toFixed(1)}%
              </span>
            )}
          </div>
        )}
        {goldOption && (
          <div className="com-chart-panel">
            <div className="com-chart-title">Gold — {gold.labels?.length} Months ({gold.unit})</div>
            <div className="com-mini-chart">
              <SafeECharts option={goldOption} style={{ height: '100%', maxHeight: '100%', width: '100%' }} />
            </div>
            {goldSpread != null && (
              <span className={`com-curve-pill ${goldSpread > 0 ? 'com-contango' : 'com-backwardation'}`} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                {goldSpread > 0 ? '▲ Contango' : '▼ Backwardation'} · {Math.abs(goldSpread).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dollar vs WTI overlay */}
      {dualOption && (
        <div className="com-chart-panel" style={{ marginTop: 8 }}>
          <div className="com-chart-title">Dollar Index vs WTI — 1 Year (FRED daily, inverse correlation)</div>
          <div className="com-mini-chart">
            <SafeECharts option={dualOption} style={{ height: '100%', maxHeight: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      {/* Seasonal Patterns */}
      {seasonalOption && (
        <div className="com-chart-panel" style={{ marginTop: 8 }}>
          <div className="com-chart-title">Seasonal Patterns — 5-Year Avg Monthly Returns (CL, GC, ZC)</div>
          <div className="com-mini-chart">
            <SafeECharts option={seasonalOption} style={{ height: '100%', maxHeight: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">Source: CME futures (Yahoo Finance) · FRED DCOILWTICO / DTWEXBGS · Seasonal: 5yr monthly avg</div>
    </div>
  );
}
