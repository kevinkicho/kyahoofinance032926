// src/markets/crypto/components/CycleIndicators.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CryptoComponents.css';

function fearGreedColor(v, textSecondary = '#94a3b8') {
  if (v >= 75) return '#ef4444';
  if (v >= 55) return '#f59e0b';
  if (v >= 45) return textSecondary;
  if (v >= 25) return '#818cf8';
  return '#6366f1';
}

function fearGreedLabel(v) {
  if (v >= 75) return 'Extreme Greed';
  if (v >= 55) return 'Greed';
  if (v >= 45) return 'Neutral';
  if (v >= 25) return 'Fear';
  return 'Extreme Fear';
}

function buildGaugeOption(value, colors) {
  const color = fearGreedColor(value, colors.textSecondary);
  return {
    animation: false,
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20,
      min: 0, max: 100,
      radius: '88%',
      center: ['50%', '60%'],
      pointer: { show: true, length: '70%', width: 4, itemStyle: { color } },
      progress: { show: true, roundCap: false, width: 10, itemStyle: { color } },
      axisLine: { lineStyle: { width: 10, color: [[1, colors.cardBg]] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        distance: 18, fontSize: 9, color: colors.textDim,
        formatter: v => v === 0 ? 'Fear' : v === 50 ? 'Neutral' : v === 100 ? 'Greed' : '',
      },
      detail: {
        valueAnimation: false,
        fontSize: 28, fontWeight: 700, color,
        offsetCenter: [0, '10%'],
        formatter: v => `${v}`,
      },
      data: [{ value }],
    }],
  };
}

function buildHistoryOption(history, colors) {
  const dates = history.map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (history.length - 1 - i)); return `${d.getMonth()+1}/${d.getDate()}`;
  });
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].name}: ${params[0].value}`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9, interval: Math.floor(history.length / 5) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [{
      type: 'line', data: history, smooth: false,
      lineStyle: { color: '#f59e0b', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.3)' }, { offset: 1, color: 'rgba(245,158,11,0.02)' }] } },
      symbol: 'none',
      markLine: {
        data: [{ yAxis: 25, name: 'Fear' }, { yAxis: 75, name: 'Greed' }],
        symbol: 'none',
        lineStyle: { color: colors.border, type: 'dashed', width: 1 },
        label: { fontSize: 9, color: colors.textMuted, formatter: p => p.name },
      },
    }],
  };
}

function buildCorrelationOption(correlations, colors) {
  const assets = correlations.map(c => c.asset);
  const vals30  = correlations.map(c => c.corr30d);
  const vals90  = correlations.map(c => c.corr90d);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].name}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}`).join('<br/>')}`,
    },
    legend: { data: ['30d', '90d'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 24, right: 16, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: assets,
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', min: -1, max: 1,
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [
      { name: '30d', type: 'bar', data: vals30.map(v => ({ value: v, itemStyle: { color: v >= 0 ? '#f59e0b' : '#818cf8' } })), barMaxWidth: 24 },
      { name: '90d', type: 'bar', data: vals90.map(v => ({ value: v, itemStyle: { color: v >= 0 ? 'rgba(245,158,11,0.5)' : 'rgba(129,140,248,0.5)' } })), barMaxWidth: 24 },
    ],
  };
}

export default function CycleIndicators({ fearGreedData }) {
  const { colors } = useTheme();
  if (!fearGreedData) return null;
  const { value = 50, history = [], correlations = [] } = fearGreedData;
  const label = fearGreedLabel(value);

  return (
    <div className="crypto-panel">
      <div className="crypto-panel-header">
        <span className="crypto-panel-title">Cycle Indicators</span>
        <span className="crypto-panel-subtitle">Fear & Greed · 30-day history · BTC cross-asset correlation</span>
      </div>
      <div className="crypto-two-col">
        <div className="crypto-two-row">
          <div className="crypto-chart-panel">
            <div className="crypto-chart-title">Fear & Greed Index</div>
            <div className="crypto-chart-subtitle">0 = Extreme Fear · 100 = Extreme Greed · Alternative.me</div>
            <div className="crypto-chart-wrap" style={{ position: 'relative' }}>
              <ReactECharts option={buildGaugeOption(value, colors)} style={{ height: '100%', width: '100%' }} />
              <div style={{ position: 'absolute', bottom: '18%', left: 0, right: 0, textAlign: 'center', fontSize: 11, color: fearGreedColor(value, colors.textSecondary), fontWeight: 600, pointerEvents: 'none' }}>{label}</div>
            </div>
          </div>
          <div className="crypto-chart-panel">
            <div className="crypto-chart-title">30-Day F&G History</div>
            <div className="crypto-chart-subtitle">Daily fear & greed score over the past month</div>
            <div className="crypto-chart-wrap">
              <ReactECharts option={buildHistoryOption(history, colors)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">BTC Cross-Asset Correlation</div>
          <div className="crypto-chart-subtitle">30d vs 90d rolling correlation · amber = positive · indigo = negative</div>
          <div className="crypto-chart-wrap">
            <ReactECharts option={buildCorrelationOption(correlations, colors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
