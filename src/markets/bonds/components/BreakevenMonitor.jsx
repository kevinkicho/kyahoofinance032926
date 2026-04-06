import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './BondsComponents.css';

function fmt(v) { return v != null ? `${v.toFixed(2)}%` : '—'; }

function buildBreakevenOption(history, colors) {
  const { dates, be5y, be10y, forward5y5y } = history;
  // Subsample to ~40 points max for readability
  const step = dates.length > 40 ? Math.ceil(dates.length / 40) : 1;
  const d = dates.filter((_, i) => i % step === 0 || i === dates.length - 1);
  const s5 = be5y.filter((_, i) => i % step === 0 || i === dates.length - 1);
  const s10 = be10y.filter((_, i) => i % step === 0 || i === dates.length - 1);
  const sf = forward5y5y.filter((_, i) => i % step === 0 || i === dates.length - 1);

  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 28, right: 16, bottom: 28, left: 48 },
    legend: {
      data: ['5Y BE', '10Y BE', '5Y5Y Fwd'],
      top: 0, right: 0,
      textStyle: { color: colors.textSecondary, fontSize: 10 },
      itemWidth: 14, itemHeight: 2,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: d,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(d.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v.toFixed(1)}%` },
    },
    series: [
      { name: '5Y BE',     type: 'line', data: s5, smooth: true, showSymbol: false, lineStyle: { color: '#10b981', width: 2 } },
      { name: '10Y BE',    type: 'line', data: s10, smooth: true, showSymbol: false, lineStyle: { color: '#34d399', width: 2 } },
      { name: '5Y5Y Fwd',  type: 'line', data: sf, smooth: true, showSymbol: false, lineStyle: { color: '#6ee7b7', width: 1.5, type: 'dashed' } },
    ],
  };
}

export default function BreakevenMonitor({ breakevensData }) {
  const { colors } = useTheme();
  if (!breakevensData) return null;
  const { current, history } = breakevensData;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">TIPS Breakevens & Real Yields</span>
        <span className="bonds-panel-subtitle">Market-implied inflation expectations · FRED</span>
      </div>
      <div className="be-pills">
        <div className="be-pill">
          <span className="be-pill-label">5Y Breakeven</span>
          <span className="be-pill-value green">{fmt(current?.be5y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">10Y Breakeven</span>
          <span className="be-pill-value green">{fmt(current?.be10y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">5Y5Y Forward</span>
          <span className="be-pill-value green">{fmt(current?.forward5y5y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">5Y Real Yield</span>
          <span className="be-pill-value">{fmt(current?.real5y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">10Y Real Yield</span>
          <span className="be-pill-value">{fmt(current?.real10y)}</span>
        </div>
      </div>
      {history?.dates?.length > 5 && (
        <div className="bonds-chart-wrap">
          <ReactECharts option={buildBreakevenOption(history, colors)} style={{ height: '100%', width: '100%' }} />
        </div>
      )}
      <div className="be-footer">
        Breakeven = Nominal − TIPS real yield · Forward = market's expected avg inflation 5–10yr out
      </div>
    </div>
  );
}
