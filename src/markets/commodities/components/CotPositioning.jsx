import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CommodComponents.css';

function fmtK(v) { return v != null ? `${(v / 1000).toFixed(0)}K` : '—'; }

function buildHistoryOption(history, name) {
  const dates = history.map(h => h.date.slice(5));
  const values = history.map(h => h.noncommNet);
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 24, left: 52 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>Net: ${fmtK(params[0].value)} contracts`,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => fmtK(v) },
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

export default function CotPositioning({ cotData }) {
  if (!cotData?.commodities?.length) return null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">COT Positioning</span>
        <span className="com-panel-subtitle">CFTC Commitments of Traders · speculative vs commercial</span>
      </div>
      <div className="cot-grid">
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
                <ReactECharts option={buildHistoryOption(c.history, c.name)} style={{ height: '100%', width: '100%' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="com-panel-footer">
        CFTC Commitments of Traders · Weekly · Non-commercial = speculative positioning
      </div>
    </div>
  );
}
