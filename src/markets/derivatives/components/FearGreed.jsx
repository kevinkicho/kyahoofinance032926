// src/markets/derivatives/components/FearGreed.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

function scoreColor(score) {
  if (score <= 25)  return '#c0392b';
  if (score <= 40)  return '#e67e22';
  if (score <= 60)  return '#f1c40f';
  if (score <= 75)  return '#27ae60';
  return '#1abc9c';
}

export default function FearGreed({ fearGreedData, vixHistory }) {
  if (!fearGreedData) return null;

  const { score, label, indicators } = fearGreedData;

  const vixHistoryOption = vixHistory && vixHistory.length > 0 ? {
    animation: false,
    grid: { top: 8, bottom: 24, left: 40, right: 8 },
    xAxis: {
      type: 'category',
      data: vixHistory.map(d => d.date),
      axisLabel: { fontSize: 10 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [{
      type: 'line',
      data: vixHistory.map(d => d.value),
      smooth: true,
      showSymbol: false,
      lineStyle: { color: '#e74c3c', width: 2 },
    }],
  } : null;

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Fear &amp; Greed</span>
        <span className="deriv-panel-subtitle">Composite sentiment gauge · 0 = Extreme Fear, 100 = Extreme Greed</span>
      </div>

      {/* Composite score */}
      <div className="fg-score-row">
        <span className="fg-score-num" style={{ color: scoreColor(score) }}>{score}</span>
        <span className="fg-score-label">{label}</span>
      </div>

      {/* Individual indicators */}
      <div className="fg-indicators">
        {indicators.map((ind, i) => (
          <div key={i} className="fg-row">
            <span className="fg-row-name">{ind.name}</span>
            <div className="fg-row-track">
              <div
                className="fg-row-bar"
                style={{ width: `${ind.score}%`, background: scoreColor(ind.score) }}
              />
            </div>
            <span className="fg-row-score">{ind.score}</span>
            <span className="fg-row-lbl">{ind.label}</span>
          </div>
        ))}
      </div>

      {/* VIX History chart (optional) */}
      {vixHistoryOption && (
        <div className="fg-history">
          <span className="fg-history-title">VIX History</span>
          <ReactECharts
            option={vixHistoryOption}
            style={{ height: 120 }}
            data-testid="vix-history-chart"
          />
        </div>
      )}

      <div className="deriv-panel-footer">
        Composite of VIX, put/call ratio, momentum, safe haven flows, junk bond demand, breadth &amp; price strength
      </div>
    </div>
  );
}
