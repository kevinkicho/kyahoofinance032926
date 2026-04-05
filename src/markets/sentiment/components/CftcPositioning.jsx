// src/markets/sentiment/components/CftcPositioning.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './SentimentComponents.css';

function buildBarOption(items) {
  const sorted = [...items].sort((a, b) => b.netPct - a.netPct);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => {
        const item = items.find(i => i.code === params[0].name || i.name === params[0].name);
        return `${params[0].name}: ${params[0].value > 0 ? '+' : ''}${params[0].value}% net<br/>Long: ${item?.longK}K · Short: ${item?.shortK}K · OI: ${item?.oiK}K`;
      },
    },
    grid: { top: 4, right: 60, bottom: 4, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(i => i.code),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar', barMaxWidth: 20,
      data: sorted.map(i => ({
        value: i.netPct,
        itemStyle: { color: i.netPct >= 0 ? '#34d399' : '#f87171' },
      })),
      label: {
        show: true, position: 'right',
        formatter: p => `${p.value >= 0 ? '+' : ''}${p.value}%`,
        color: '#94a3b8', fontSize: 9,
      },
    }],
  };
}

function Section({ title, items, height = 180 }) {
  if (!items?.length) return null;
  return (
    <div className="sent-cftc-section">
      <div className="sent-cftc-section-label">{title}</div>
      <ReactECharts option={buildBarOption(items)} style={{ height, width: '100%' }} />
    </div>
  );
}

export default function CftcPositioning({ cftcData }) {
  if (!cftcData) return null;
  const { currencies = [], equities = [], rates = [], commodities = [], asOf } = cftcData;

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">CFTC Positioning</span>
        <span className="sent-panel-subtitle">
          Net speculative position as % of open interest · green = net long · red = net short
          {asOf && <> · as of {asOf}</>}
        </span>
      </div>
      <div className="sent-two-col">
        <div style={{ overflowY: 'auto', background: '#0f172a', padding: '4px 0' }}>
          <Section title="Currencies" items={currencies} height={200} />
        </div>
        <div style={{ overflowY: 'auto', background: '#0f172a', padding: '4px 0' }}>
          <Section title="Equity Index Futures" items={equities} height={100} />
          <Section title="Rates" items={rates} height={80} />
          <Section title="Commodities" items={commodities} height={100} />
        </div>
      </div>
    </div>
  );
}
