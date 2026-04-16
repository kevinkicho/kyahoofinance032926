// src/markets/sentiment/components/FearGreed.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './SentimentComponents.css';

function scoreColor(score) {
  if (score <= 25) return '#ef4444';
  if (score <= 45) return '#f97316';
  if (score <= 55) return '#facc15';
  if (score <= 75) return '#a78bfa';
  return '#7c3aed';
}

function signalColor(signal, textSecondary = '#94a3b8') {
  if (signal === 'greed') return '#7c3aed';
  if (signal === 'fear')  return '#f97316';
  return textSecondary;
}

function buildGaugeOption(score, colors) {
  const color = scoreColor(score);
  return {
    animation: false,
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20,
      min: 0, max: 100,
      radius: '88%',
      pointer: { show: true, length: '55%', width: 4, itemStyle: { color } },
      progress: { show: true, width: 10, itemStyle: { color } },
      axisLine: { lineStyle: { width: 10, color: [[1, colors.cardBg]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: false,
        formatter: `{value}`,
        color,
        fontSize: 28,
        fontWeight: 700,
        offsetCenter: [0, '20%'],
      },
      data: [{ value: score }],
    }],
  };
}

function buildHistoryOption(history, colors) {
  const dates  = history.map(h => h.date.slice(5));
  const values = history.map(h => h.value);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}: ${params[0].value}`,
    },
    grid: { top: 8, right: 8, bottom: 20, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9, interval: Math.floor(dates.length / 6) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      axisLabel: { color: colors.textMuted, fontSize: 9 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    visualMap: {
      show: false, type: 'continuous', min: 0, max: 100,
      inRange: { color: ['#ef4444', '#f97316', '#facc15', '#a78bfa', '#7c3aed'] },
    },
    series: [{
      type: 'line', data: values,
      lineStyle: { width: 1.5 }, symbol: 'none',
      areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[{offset:0,color:'rgba(124,58,237,0.3)'},{offset:1,color:'rgba(124,58,237,0.02)'}] } },
    }],
  };
}

function buildCreditMiniOption(dates, values, colors) {
  const labels = dates.map(d => d.slice(5));
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const rising = last != null && prev != null && last >= prev;
  const lineColor = rising ? '#34d399' : '#f87171';
  const interval = Math.max(0, Math.floor(labels.length / 4) - 1);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 10 },
      formatter: params => `${params[0].axisValue}: $${params[0].value != null ? (params[0].value / 1000).toFixed(1) : '—'}T`,
    },
    grid: { top: 4, right: 6, bottom: 16, left: 6, containLabel: true },
    xAxis: {
      type: 'category', data: labels,
      axisLabel: { color: colors.textDim, fontSize: 8, interval },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 8, formatter: v => `$${(v / 1000).toFixed(1)}T` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: values,
      lineStyle: { width: 1.5, color: lineColor },
      itemStyle: { color: lineColor },
      symbol: 'none',
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: lineColor + '44' }, { offset: 1, color: lineColor + '05' }] } },
    }],
  };
}

export default function FearGreed({ fearGreedData, consumerCredit }) {
  if (!fearGreedData) return null;
  const { colors } = useTheme();
  const { score = 50, label = 'Neutral', altmeScore, history = [], indicators = [] } = fearGreedData;
  const color = scoreColor(score);
  const gaugeOption = useMemo(() => buildGaugeOption(score, colors), [score, colors]);
  const historyOption = useMemo(() => buildHistoryOption(history, colors), [history, colors]);

  const creditMiniOption = useMemo(() => {
    if (!consumerCredit?.dates?.length) return null;
    return buildCreditMiniOption(consumerCredit.dates, consumerCredit.values, colors);
  }, [consumerCredit, colors]);

  const creditLatest = consumerCredit?.values?.length
    ? consumerCredit.values[consumerCredit.values.length - 1]
    : null;
  const creditPrev = consumerCredit?.values?.length > 1
    ? consumerCredit.values[consumerCredit.values.length - 2]
    : null;
  const creditRising = creditLatest != null && creditPrev != null && creditLatest >= creditPrev;

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Fear &amp; Greed</span>
        <span className="sent-panel-subtitle">Cross-asset composite · Alt.me + FRED VIX/HY/YC + SPY momentum</span>
      </div>
      <div className="sent-two-col">
        {/* Left: gauge + score + indicators */}
        <div className="sent-chart-panel">
          <div className="sent-chart-wrap" style={{ maxHeight: 200, flexShrink: 0 }}>
            <SafeECharts option={gaugeOption} style={{ height: 200, width: '100%' }} sourceInfo={{ title: 'Fear & Greed Gauge', source: 'Alternative.me / FRED', endpoint: '/api/sentiment', series: [] }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{label}</div>
            {altmeScore != null && <div style={{ fontSize: 10, color: colors.textMuted }}>Alt.me raw: {altmeScore}</div>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {indicators.map(ind => (
              <div key={ind.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: `1px solid ${colors.cardBg}` }}>
                <span style={{ fontSize: 11, color: colors.textSecondary }}>{ind.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ind.percentile != null && <span style={{ fontSize: 9, color: colors.textDim }}>{ind.percentile}th pct</span>}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: signalColor(ind.signal, colors.textSecondary) }}>
                    {typeof ind.value === 'number' ? (ind.value > 100 ? `${Math.round(ind.value)}bps` : ind.value.toFixed(ind.value > 10 ? 1 : 2)) : ind.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: 252-day history + Consumer Credit */}
        <div className="sent-chart-panel">
          <div className="sent-chart-title">252-Day Fear &amp; Greed History</div>
          <div className="sent-chart-subtitle">Alternative.me daily score · 0 = Extreme Fear · 100 = Extreme Greed</div>
          <div className="sent-chart-wrap">
            <SafeECharts option={historyOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: '252-Day F&G History', source: 'Alternative.me', endpoint: '/api/sentiment', series: [] }} />
          </div>

          {/* Consumer Credit strip */}
          {creditLatest != null && (
            <div style={{ borderTop: `1px solid ${colors.cardBg}`, paddingTop: 6, marginTop: 4, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <div>
                  <div className="sent-chart-title" style={{ marginBottom: 0 }}>Consumer Credit</div>
                  <div className="sent-chart-subtitle" style={{ marginBottom: 0 }}>Total outstanding · FRED G.19 · 2yr monthly · confidence signal</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: creditRising ? '#34d399' : '#f87171' }}>
                    ${(creditLatest / 1000).toFixed(2)}T
                  </div>
                  <div style={{ fontSize: 9, color: creditRising ? '#34d399' : '#f87171' }}>
                    {creditRising ? '▲ Expanding · bullish' : '▼ Contracting · cautious'}
                  </div>
                </div>
              </div>
              {creditMiniOption && (
                <div style={{ height: 80 }}>
                  <SafeECharts option={creditMiniOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Consumer Credit', source: 'FRED', endpoint: '/api/sentiment', series: [] }} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
