import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './EquitiesDeepDiveDashboard.css';

function shortBarColor(v, textDim = '#475569') {
  if (v == null || Number.isNaN(v)) return textDim;
  if (v > 20) return '#ef4444';
  if (v > 10) return '#f59e0b';
  return '#22c55e';
}

function buildShortedOption(mostShorted, colors) {
  const sorted = [...mostShorted].sort((a, b) => (b.shortFloat ?? 0) - (a.shortFloat ?? 0));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        const base = `${params[0].name}: ${params[0].value?.toFixed(1)}% short`;
        return item ? `${base} · ${item.daysToCover?.toFixed(1)}d to cover` : base;
      },
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.ticker),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(s => ({
        value: s.shortFloat,
        itemStyle: { color: shortBarColor(s.shortFloat, colors.textDim) },
      })),
      markLine: {
        data: [{ xAxis: 20 }, { xAxis: 10 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: true, color: colors.textMuted, fontSize: 9 },
      },
    }],
  };
}

function buildSqueezeOption(mostShorted, colors) {
  const candidates = mostShorted.filter(s => (s.shortFloat ?? 0) > 10);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p.data[3]}<br/>Short Float: ${p.data[0]?.toFixed(1)}%<br/>1W Return: ${p.data[1]?.toFixed(1)}%`,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Short Float %',
      nameTextStyle: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'value',
      name: '1W Return %',
      nameTextStyle: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'scatter',
      data: candidates.map(s => [s.shortFloat ?? 0, s.perf1w ?? 0, s.marketCapB ?? 1, s.ticker]),
      symbolSize: d => Math.max(8, Math.min(40, Math.sqrt(d[2] ?? 1) * 3)),
      itemStyle: { color: '#ef4444', opacity: 0.8 },
      label: {
        show: true,
        formatter: p => p.data[3],
        position: 'right',
        color: colors.textSecondary,
        fontSize: 9,
      },
      markLine: {
        data: [{ xAxis: 15 }, { yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

export default function ShortInterest({ shortData }) {
  const { colors } = useTheme();
  const { mostShorted = [] } = shortData ?? {};

  const shortedOption = useMemo(() => buildShortedOption(mostShorted, colors), [mostShorted, colors]);
  const squeezeOption = useMemo(() => buildSqueezeOption(mostShorted, colors), [mostShorted, colors]);

  const kpis = useMemo(() => {
    if (!mostShorted.length) return null;
    const top = mostShorted.reduce((a, b) => (a.shortFloat ?? 0) > (b.shortFloat ?? 0) ? a : b);
    const avgShort = mostShorted.reduce((s, st) => s + (st.shortFloat ?? 0), 0) / mostShorted.length;
    const above20 = mostShorted.filter(s => (s.shortFloat ?? 0) > 20).length;
    const avgDays = mostShorted.filter(s => s.daysToCover != null);
    const avgDtc = avgDays.length ? avgDays.reduce((s, st) => s + st.daysToCover, 0) / avgDays.length : null;
    return { top, avgShort, above20, avgDtc, total: mostShorted.length };
  }, [mostShorted]);

  if (!shortData) return null;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Short Interest</span>
        <span className="eq-panel-subtitle">Short float % · squeeze candidates: short &gt;10% + positive 1W momentum</span>
      </div>
      {/* KPI Strip */}
      {kpis && (
        <div className="eq-kpi-strip">
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Most Shorted</span>
            <span className="eq-kpi-value" style={{ color: '#ef4444' }}>{kpis.top.ticker}</span>
            <span className="eq-kpi-sub">{kpis.top.shortFloat?.toFixed(1)}%</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Avg Short Float</span>
            <span className="eq-kpi-value accent">{kpis.avgShort.toFixed(1)}%</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">{'Short > 20%'}</span>
            <span className="eq-kpi-value" style={{ color: kpis.above20 > 3 ? '#ef4444' : '#6366f1' }}>
              {kpis.above20}
            </span>
            <span className="eq-kpi-sub">of {kpis.total}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Avg Days to Cover</span>
            <span className="eq-kpi-value accent">{kpis.avgDtc != null ? `${kpis.avgDtc.toFixed(1)}d` : '\u2014'}</span>
          </div>
        </div>
      )}
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Most Shorted</div>
          <div className="eq-chart-subtitle">Red &gt;20% · amber 10–20% · green &lt;10%</div>
          <div className="eq-chart-wrap">
            <SafeECharts option={shortedOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Most Shorted', source: 'Yahoo Finance', endpoint: '/api/equities-deep-dive', series: [] }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Squeeze Watch</div>
          <div className="eq-chart-subtitle">X = short float · Y = 1W return · size = market cap · short &gt;10%</div>
          <div className="eq-chart-wrap">
            <SafeECharts option={squeezeOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Squeeze Watch', source: 'Yahoo Finance', endpoint: '/api/equities-deep-dive', series: [] }} />
          </div>
        </div>
      </div>
    </div>
  );
}
