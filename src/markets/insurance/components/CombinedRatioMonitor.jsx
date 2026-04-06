import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './InsComponents.css';

const LINE_COLORS = ['#0ea5e9', '#a78bfa', '#f59e0b', '#22c55e'];

export default function CombinedRatioMonitor({ combinedRatioData }) {
  const { colors } = useTheme();
  const { quarters, lines } = combinedRatioData;
  const lineNames = Object.keys(lines);

  const series = lineNames.map((name, i) => ({
    name,
    type: 'line',
    data: lines[name],
    smooth: true,
    lineStyle: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    itemStyle: { color: LINE_COLORS[i % LINE_COLORS.length] },
    symbol: 'circle',
    symbolSize: 5,
  }));

  const option = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) =>
        params[0].axisValue + '<br/>' +
        params.map(p => `${p.seriesName}: ${p.value.toFixed(1)}`).join('<br/>'),
    },
    legend: {
      data: lineNames,
      textStyle: { color: colors.textSecondary, fontSize: 11 },
      top: 0,
    },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: quarters,
      axisLabel: { color: colors.textMuted, fontSize: 11 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      name: 'Combined Ratio (%)',
      nameTextStyle: { color: colors.textMuted, fontSize: 10 },
      axisLabel: { color: colors.textMuted, fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: colors.cardBg } },
      markLine: { silent: true },
    },
    series: [
      ...series,
      {
        type: 'line',
        markLine: {
          silent: true,
          data: [{ yAxis: 100 }],
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
          label: { formatter: '100% breakeven', color: '#ef4444', fontSize: 10 },
        },
        data: [],
      },
    ],
  };

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Combined Ratio Monitor</span>
        <span className="ins-panel-subtitle">Loss ratio + expense ratio by line · below 100% = underwriting profit</span>
      </div>
      <div className="ins-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="ins-panel-footer">
        Combined Ratio = Loss Ratio + Expense Ratio · &lt;100% = underwriting profit · &gt;100% = underwriting loss
      </div>
    </div>
  );
}
