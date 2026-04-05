import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

function scoreColor(score) {
  if (score <= 25) return '#ef4444';
  if (score <= 45) return '#f97316';
  if (score <= 55) return '#facc15';
  if (score <= 75) return '#84cc16';
  return '#22c55e';
}

function scoreLabelColor(label) {
  const l = label.toLowerCase();
  if (l.includes('extreme fear'))  return '#ef4444';
  if (l.includes('fear'))          return '#f97316';
  if (l.includes('neutral'))       return '#facc15';
  if (l.includes('extreme greed')) return '#22c55e';
  if (l.includes('greed'))         return '#84cc16';
  return '#94a3b8';
}

export default function FearGreed({ fearGreedData, vixHistory }) {
  const { score, label, indicators } = fearGreedData;
  const mainColor = scoreColor(score);

  const historyOption = useMemo(() => {
    if (!vixHistory?.length) return null;
    const dates  = vixHistory.map(p => p.date.slice(5));
    const values = vixHistory.map(p => p.value);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) => `${params[0].axisValue}: <b>${params[0].value}</b>` },
      grid: { top: 10, right: 10, bottom: 30, left: 45 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 9, interval: Math.floor(dates.length / 8) },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        name: 'VIX',
        nameTextStyle: { color: '#64748b', fontSize: 9 },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [{
        type: 'line',
        data: values,
        itemStyle: { color: '#a78bfa' },
        lineStyle: { width: 1.5 },
        areaStyle: { color: '#a78bfa', opacity: 0.07 },
        symbol: 'none',
      }],
    };
  }, [vixHistory]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Fear &amp; Greed</span>
        <span className="deriv-panel-subtitle">Composite sentiment index · 0 = extreme fear · 100 = extreme greed</span>
      </div>
      <div className="fg-layout">
        <div className="fg-gauge-wrap">
          <div className="fg-score" style={{ color: mainColor }}>{score}</div>
          <div className="fg-label" style={{ color: mainColor }}>{label}</div>
        </div>
        <div className="fg-indicators">
          {indicators.map(ind => (
            <div key={ind.name} className="fg-row">
              <span className="fg-row-name">{ind.name}</span>
              <div className="fg-row-bar-wrap">
                <div
                  className="fg-row-bar"
                  style={{ width: `${ind.score}%`, backgroundColor: scoreColor(ind.score) }}
                />
              </div>
              <span className="fg-row-score">{ind.score}</span>
              <span className="fg-row-label" style={{ color: scoreLabelColor(ind.label) }}>
                {ind.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      {vixHistory?.length > 0 && historyOption && (
        <div className="fg-history-wrap">
          <div className="fg-history-title">VIX History (252 trading days)</div>
          <ReactECharts
            data-testid="vix-history-chart"
            option={historyOption}
            style={{ height: 100, width: '100%' }}
          />
        </div>
      )}
      <div className="deriv-panel-footer">
        0–25 Extreme Fear · 26–45 Fear · 46–55 Neutral · 56–75 Greed · 76–100 Extreme Greed
      </div>
    </div>
  );
}
