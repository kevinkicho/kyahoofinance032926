import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function beatColor(rate) {
  if (rate == null || Number.isNaN(rate)) return '#475569';
  if (rate >= 70) return '#6366f1';
  if (rate >= 50) return '#f59e0b';
  return '#ef4444';
}

function buildBeatRateOption(beatRates) {
  const sorted = [...beatRates].sort((a, b) => (b.beatRate ?? 0) - (a.beatRate ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        return `${params[0].name}: ${params[0].value?.toFixed(1)}% (${item?.beatCount}/${item?.totalCount})`;
      },
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0, max: 100,
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.sector),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(s => ({
        value: s.beatRate,
        itemStyle: { color: beatColor(s.beatRate) },
      })),
      markLine: {
        data: [{ xAxis: 50 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: true, formatter: '50%', color: '#94a3b8', fontSize: 9 },
      },
    }],
  };
}

export default function EarningsWatch({ earningsData }) {
  if (!earningsData) return null;
  const { upcoming = [], beatRates = [] } = earningsData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Earnings Watch</span>
        <span className="eq-panel-subtitle">Next 14 days · EPS estimate vs prior quarter · last quarter beat rates</span>
      </div>
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Upcoming Earnings</div>
          <div className="eq-chart-subtitle">▲ est &gt; prior · ▼ est &lt; prior</div>
          <div className="eq-scroll">
            <table className="eq-table">
              <thead>
                <tr>
                  <th className="eq-th">Date</th>
                  <th className="eq-th">Company</th>
                  <th className="eq-th">EPS Est</th>
                  <th className="eq-th">Prior</th>
                  <th className="eq-th">Dir</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(e => (
                  <tr key={e.ticker} className="eq-row">
                    <td className="eq-cell eq-date">{e.date}</td>
                    <td className="eq-cell">
                      <strong>{e.ticker}</strong>
                      <span className="eq-name"> {e.name}</span>
                    </td>
                    <td className="eq-cell eq-num">${e.epsEst?.toFixed(2)}</td>
                    <td className="eq-cell eq-num eq-muted">${e.epsPrev?.toFixed(2)}</td>
                    <td className="eq-cell eq-dir">
                      {(e.epsEst ?? 0) >= (e.epsPrev ?? 0) ? '▲' : '▼'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Sector Beat Rate</div>
          <div className="eq-chart-subtitle">Last quarter EPS beat % · indigo ≥70% · amber 50–70% · red &lt;50%</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildBeatRateOption(beatRates)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
