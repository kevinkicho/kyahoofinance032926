// src/markets/commodities/components/CotPositioning.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CommodComponents.css';

function fmtK(v) { return v != null ? `${(v / 1000).toFixed(0)}K` : '—'; }

function buildHistoryOption(history, name, colors) {
  const dates = history.map(h => h.date.slice(5));
  const values = history.map(h => h.noncommNet);
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 24, left: 52 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>Net: ${fmtK(params[0].value)} contracts`,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => fmtK(v) },
    },
    series: [{
      type: 'bar',
      data: values.map(v => ({
        value: v,
        itemStyle: { color: v >= 0 ? '#10b981' : '#ef4444' },
      })),
      barWidth: '60%',
    }],
  };
}

function buildTrendOption(commodities, colors) {
  const primary = commodities.reduce((a, b) => (a.history?.length || 0) >= (b.history?.length || 0) ? a : b);
  const dates = (primary.history || []).map(h => h.date.slice(5));
  const seriesColors = ['#ca8a04', '#f59e0b', '#10b981', '#60a5fa'];
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: commodities.map(c => c.name),
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 8, bottom: 24, left: 52, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => fmtK(v) },
    },
    series: commodities.map((c, i) => ({
      name: c.name,
      type: 'line',
      data: (c.history || []).map(h => h.noncommNet),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: seriesColors[i % seriesColors.length] },
      itemStyle: { color: seriesColors[i % seriesColors.length] },
    })),
  };
}

export default function CotPositioning({ cotData }) {
  const { colors } = useTheme();
  if (!cotData?.commodities?.length) return null;

  const wti  = cotData.commodities.find(c => c.name === 'WTI Crude Oil');
  const gold = cotData.commodities.find(c => c.name === 'Gold');

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">COT Positioning</span>
        <span className="com-panel-subtitle">CFTC Commitments of Traders · speculative vs commercial</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        {wti && (
          <>
            <div className="com-kpi-pill">
              <span className="com-kpi-label">WTI Spec Net</span>
              <span className={`com-kpi-value ${wti.latest.noncommNet >= 0 ? 'positive' : 'negative'}`}>
                {fmtK(wti.latest.noncommNet)}
              </span>
              <span className={`com-kpi-sub ${wti.latest.netChange >= 0 ? 'com-up' : 'com-down'}`}>
                {wti.latest.netChange >= 0 ? '+' : ''}{fmtK(wti.latest.netChange)} wk
              </span>
            </div>
          </>
        )}
        {gold && (
          <>
            <div className="com-kpi-pill">
              <span className="com-kpi-label">Gold Spec Net</span>
              <span className={`com-kpi-value ${gold.latest.noncommNet >= 0 ? 'positive' : 'negative'}`}>
                {fmtK(gold.latest.noncommNet)}
              </span>
              <span className={`com-kpi-sub ${gold.latest.netChange >= 0 ? 'com-up' : 'com-down'}`}>
                {gold.latest.netChange >= 0 ? '+' : ''}{fmtK(gold.latest.netChange)} wk
              </span>
            </div>
          </>
        )}
        {wti && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">WTI Open Interest</span>
            <span className="com-kpi-value">{fmtK(wti.latest.totalOI)}</span>
            <span className="com-kpi-sub">total contracts</span>
          </div>
        )}
        {gold && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Gold Open Interest</span>
            <span className="com-kpi-value">{fmtK(gold.latest.totalOI)}</span>
            <span className="com-kpi-sub">total contracts</span>
          </div>
        )}
      </div>

      {/* Existing commodity panels */}
      <div className="cot-grid" style={{ marginBottom: 12 }}>
        {cotData.commodities.map(c => (
          <div key={c.name} className="cot-commodity">
            <div className="cot-name">{c.name}</div>
            <div className="cot-metrics">
              <div className="cot-metric">
                <span className="cot-metric-label">Spec Net</span>
                <span className={`cot-metric-value ${c.latest.noncommNet >= 0 ? 'green' : 'red'}`}>
                  {fmtK(c.latest.noncommNet)}
                </span>
              </div>
              <div className="cot-metric">
                <span className="cot-metric-label">Comm Net</span>
                <span className={`cot-metric-value ${c.latest.commNet >= 0 ? 'green' : 'red'}`}>
                  {fmtK(c.latest.commNet)}
                </span>
              </div>
              <div className="cot-metric">
                <span className="cot-metric-label">Total OI</span>
                <span className="cot-metric-value">{fmtK(c.latest.totalOI)}</span>
              </div>
              <div className="cot-metric">
                <span className="cot-metric-label">Wk Change</span>
                <span className={`cot-metric-value ${c.latest.netChange >= 0 ? 'green' : 'red'}`}>
                  {c.latest.netChange >= 0 ? '+' : ''}{fmtK(c.latest.netChange)}
                </span>
              </div>
            </div>
            {c.history?.length > 2 && (
              <div style={{ height: 140 }}>
                <ReactECharts option={buildHistoryOption(c.history, c.name, colors)} style={{ height: '100%', width: '100%' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Net positioning trend overlay */}
      {cotData.commodities.length >= 2 && cotData.commodities[0].history?.length > 2 && (
        <div className="com-chart-panel" style={{ height: 170, flexShrink: 0 }}>
          <div className="com-chart-title">Net Speculative Positioning — 12 Week Trend</div>
          <div className="com-mini-chart">
            <ReactECharts option={buildTrendOption(cotData.commodities, colors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">
        CFTC Commitments of Traders · Weekly · Non-commercial = speculative positioning
      </div>
    </div>
  );
}
