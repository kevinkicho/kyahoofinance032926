// src/markets/sentiment/components/FearGreed.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './SentimentComponents.css';

function scoreColor(score) {
  if (score <= 25) return '#ef4444';
  if (score <= 45) return '#f97316';
  if (score <= 55) return '#facc15';
  if (score <= 75) return '#a78bfa';
  return '#7c3aed';
}

function signalColor(signal) {
  if (signal === 'greed') return '#7c3aed';
  if (signal === 'fear')  return '#f97316';
  return '#94a3b8';
}

function buildGaugeOption(score) {
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
      axisLine: { lineStyle: { width: 10, color: [[1, '#1e293b']] } },
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

function buildHistoryOption(history) {
  const dates  = history.map(h => h.date.slice(5));
  const values = history.map(h => h.value);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}: ${params[0].value}`,
    },
    grid: { top: 8, right: 8, bottom: 20, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9, interval: Math.floor(dates.length / 6) },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      axisLabel: { color: '#64748b', fontSize: 9 },
      splitLine: { lineStyle: { color: '#1e293b' } },
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

export default function FearGreed({ fearGreedData }) {
  if (!fearGreedData) return null;
  const { score = 50, label = 'Neutral', altmeScore, history = [], indicators = [] } = fearGreedData;
  const color = scoreColor(score);
  const gaugeOption = useMemo(() => buildGaugeOption(score), [score]);
  const historyOption = useMemo(() => buildHistoryOption(history), [history]);

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
            <ReactECharts option={gaugeOption} style={{ height: 200, width: '100%' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{label}</div>
            {altmeScore != null && <div style={{ fontSize: 10, color: '#64748b' }}>Alt.me raw: {altmeScore}</div>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {indicators.map(ind => (
              <div key={ind.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{ind.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ind.percentile != null && <span style={{ fontSize: 9, color: '#475569' }}>{ind.percentile}th pct</span>}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: signalColor(ind.signal) }}>
                    {typeof ind.value === 'number' ? (ind.value > 100 ? `${Math.round(ind.value)}bps` : ind.value.toFixed(ind.value > 10 ? 1 : 2)) : ind.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: 252-day history */}
        <div className="sent-chart-panel">
          <div className="sent-chart-title">252-Day Fear &amp; Greed History</div>
          <div className="sent-chart-subtitle">Alternative.me daily score · 0 = Extreme Fear · 100 = Extreme Greed</div>
          <div className="sent-chart-wrap">
            <ReactECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
