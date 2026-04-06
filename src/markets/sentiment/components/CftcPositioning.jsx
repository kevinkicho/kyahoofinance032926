// src/markets/sentiment/components/CftcPositioning.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './SentimentComponents.css';

function buildBarOption(items, colors) {
  const sorted = [...items].sort((a, b) => b.netPct - a.netPct);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => {
        const item = items.find(i => i.code === params[0].name || i.name === params[0].name);
        return `${params[0].name}: ${params[0].value > 0 ? '+' : ''}${params[0].value}% net<br/>Long: ${item?.longK}K · Short: ${item?.shortK}K · OI: ${item?.oiK}K`;
      },
    },
    grid: { top: 4, right: 60, bottom: 4, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(i => i.code),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
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
        color: colors.textSecondary, fontSize: 9,
      },
    }],
  };
}

function Section({ title, items, height = 180, colors }) {
  if (!items?.length) return null;
  return (
    <div className="sent-cftc-section">
      <div className="sent-cftc-section-label">{title}</div>
      <ReactECharts option={buildBarOption(items, colors)} style={{ height, width: '100%' }} />
    </div>
  );
}

export default function CftcPositioning({ cftcData }) {
  if (!cftcData) return null;
  const { colors } = useTheme();
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
        <div style={{ overflowY: 'auto', background: colors.bg, padding: '4px 0' }}>
          <Section title="Currencies" items={currencies} height={200} colors={colors} />
        </div>
        <div style={{ overflowY: 'auto', background: colors.bg, padding: '4px 0' }}>
          <Section title="Equity Index Futures" items={equities} height={100} colors={colors} />
          <Section title="Rates" items={rates} height={80} colors={colors} />
          <Section title="Commodities" items={commodities} height={100} colors={colors} />
        </div>
      </div>
    </div>
  );
}
