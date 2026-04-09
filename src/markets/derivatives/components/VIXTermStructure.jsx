// src/markets/derivatives/components/VIXTermStructure.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './DerivComponents.css';

export default function VIXTermStructure({ vixTermStructure, vixEnrichment, fredVixHistory, vixPercentile: vixPctProp, termSpread, putCallRatio }) {
  const { colors } = useTheme();
  const { dates, values, prevValues } = vixTermStructure;

  const isContango = values.length >= 2 && values[values.length - 1] > values[0];

  // KPI computations
  const vixSpot = values[0] ?? null;
  const contangoPct = (values.length >= 2 && values[0])
    ? Math.round(((values[values.length - 1] - values[0]) / values[0]) * 1000) / 10
    : null;
  const vvix = vixEnrichment?.vvix ?? null;
  const percentile = vixEnrichment?.vixPercentile ?? null;

  // New server-direct fields
  const resolvedVixPct  = vixPctProp ?? percentile;  // prefer direct field, fall back to enrichment
  const resolvedTermSpread  = termSpread ?? null;
  const resolvedPCR         = putCallRatio ?? null;

  // Day changes for bar panel
  const dayChanges = dates.map((d, i) => ({
    label: d,
    change: prevValues?.[i] != null ? Math.round((values[i] - prevValues[i]) * 100) / 100 : 0,
  }));
  const maxAbsChange = Math.max(...dayChanges.map(d => Math.abs(d.change)), 0.01);

  const termOption = useMemo(() => ({
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value?.toFixed(2)}</b>`).join('<br/>'),
    },
    legend: {
      data: ['Current', 'Previous Close'],
      top: 0,
      textStyle: { color: colors.textSecondary, fontSize: 10 },
    },
    grid: { top: 30, right: 16, bottom: 24, left: 44 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: colors.textMuted, fontSize: 10 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      name: 'VIX',
      nameTextStyle: { color: colors.textMuted, fontSize: 10 },
      axisLabel: { color: colors.textMuted, fontSize: 10 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      {
        name: 'Current',
        type: 'line',
        data: values,
        itemStyle: { color: '#a78bfa' },
        lineStyle: { width: 2.5 },
        symbol: 'circle',
        symbolSize: 5,
        areaStyle: { color: '#a78bfa', opacity: 0.08 },
      },
      {
        name: 'Previous Close',
        type: 'line',
        data: prevValues,
        itemStyle: { color: colors.textDim },
        lineStyle: { width: 1.5, type: 'dashed' },
        symbol: 'none',
      },
    ],
  }), [vixTermStructure, colors]);

  // FRED VIX 1yr chart
  const fh = fredVixHistory;
  const fredOption = fh?.dates?.length >= 20 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    grid: { top: 8, right: 12, bottom: 24, left: 40 },
    xAxis: {
      type: 'category',
      data: fh.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(fh.dates.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [{
      type: 'line',
      data: fh.values,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: '#a78bfa' },
      itemStyle: { color: '#a78bfa' },
      areaStyle: { color: '#a78bfa', opacity: 0.1 },
    }],
  } : null;

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">VIX Term Structure</span>
        <span className="deriv-panel-subtitle">
          {isContango ? 'Contango (normal — market calm)' : 'Backwardation (elevated near-term fear)'}
        </span>
      </div>

      {/* KPI Strip */}
      <div className="deriv-kpi-strip">
        <div className="deriv-kpi-pill">
          <span className="deriv-kpi-label">VIX Spot</span>
          <span className="deriv-kpi-value accent">{vixSpot != null ? vixSpot.toFixed(1) : '—'}</span>
        </div>
        <div className="deriv-kpi-pill">
          <span className="deriv-kpi-label">{isContango ? 'Contango' : 'Backwardation'}</span>
          <span className={`deriv-kpi-value ${isContango ? 'positive' : 'negative'}`}>
            {contangoPct != null ? `${contangoPct >= 0 ? '+' : ''}${contangoPct.toFixed(1)}%` : '—'}
          </span>
          <span className="deriv-kpi-sub">front → back</span>
        </div>
        {vvix != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">VVIX</span>
            <span className="deriv-kpi-value accent">{vvix.toFixed(1)}</span>
            <span className="deriv-kpi-sub">vol of VIX</span>
          </div>
        )}
        {resolvedVixPct != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">VIX Percentile</span>
            <span className={`deriv-kpi-value ${resolvedVixPct > 75 ? 'negative' : resolvedVixPct < 25 ? 'positive' : 'amber'}`}>
              {resolvedVixPct}th
            </span>
            <span className="deriv-kpi-sub">1yr rank</span>
          </div>
        )}
        {resolvedTermSpread != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">Term Spread</span>
            <span className="deriv-kpi-value accent">
              {resolvedTermSpread.value >= 0 ? '+' : ''}{resolvedTermSpread.value.toFixed(2)}
            </span>
            {resolvedTermSpread.state && (
              <span
                className="deriv-kpi-sub"
                style={{ color: resolvedTermSpread.state === 'contango' ? '#22c55e' : '#ef4444', fontWeight: 600 }}
              >
                {resolvedTermSpread.state}
              </span>
            )}
          </div>
        )}
        {resolvedPCR != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">Put/Call Ratio</span>
            <span className={`deriv-kpi-value ${resolvedPCR > 1.0 ? 'negative' : resolvedPCR < 0.7 ? 'positive' : 'amber'}`}>
              {resolvedPCR.toFixed(2)}
            </span>
            <span className="deriv-kpi-sub">CBOE equity</span>
          </div>
        )}
      </div>

      {/* Main: term structure (wide) + day change bars (narrow) */}
      <div className="deriv-wide-narrow" style={{ marginBottom: 12 }}>
        <div style={{ minHeight: 0, display: 'flex' }}>
          <SafeECharts option={termOption} style={{ height: '100%', width: '100%' }} />
        </div>
        <div className="deriv-chart-panel">
          <div className="deriv-chart-title">Day Change by Tenor</div>
          <div className="deriv-bar-list" style={{ marginTop: 4 }}>
            {dayChanges.map(d => {
              const pct = Math.abs(d.change) / maxAbsChange * 50;
              const isPos = d.change >= 0;
              return (
                <div key={d.label} className="deriv-bar-row">
                  <span className="deriv-bar-name">{d.label}</span>
                  <div className="deriv-bar-wrap">
                    <div className="deriv-bar-center" />
                    <div
                      className="deriv-bar-fill"
                      style={{
                        width: `${pct}%`,
                        left: isPos ? '50%' : `${50 - pct}%`,
                        background: isPos ? '#ef4444' : '#22c55e',
                      }}
                    />
                  </div>
                  <span className={`deriv-bar-val ${isPos ? 'negative' : 'positive'}`}>
                    {isPos ? '+' : ''}{d.change.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FRED VIX 1yr chart */}
      {fredOption && (
        <div className="deriv-chart-panel" style={{ height: 160, flexShrink: 0 }}>
          <div className="deriv-chart-title">VIX — 1 Year (FRED VIXCLS daily)</div>
          <div className="deriv-mini-chart">
            <SafeECharts option={fredOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
