import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

export default function DurationLadder({ durationLadderData }) {
  const option = useMemo(() => {
    const buckets  = durationLadderData.map(d => d.bucket);
    const amounts  = durationLadderData.map(d => d.amount);
    const pcts     = durationLadderData.map(d => d.pct);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const i = params[0].dataIndex;
          return `<b>${durationLadderData[i].bucket}</b><br/>` +
            `Amount: <b>$${durationLadderData[i].amount.toLocaleString()}M</b><br/>` +
            `Weight: <b>${durationLadderData[i].pct}%</b>`;
        },
      },
      grid: { top: 20, right: 80, bottom: 30, left: 80 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '${value}M' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        data: buckets,
        inverse: true,
        axisLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 500 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [{
        type: 'bar',
        data: amounts,
        itemStyle: {
          color: (params) => {
            const colors = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 11,
          formatter: (params) => `${pcts[params.dataIndex]}%`,
        },
      }],
    };
  }, [durationLadderData]);

  const totalAmount = durationLadderData.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Duration Ladder</span>
        <span className="bonds-panel-subtitle">
          Portfolio allocation by maturity bucket · Total: ${totalAmount.toLocaleString()}M
        </span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="bonds-panel-footer">
        Maturity buckets: 0–2y (short), 2–5y (medium), 5–10y (long), 10y+ (ultra-long)
      </div>
    </div>
  );
}
