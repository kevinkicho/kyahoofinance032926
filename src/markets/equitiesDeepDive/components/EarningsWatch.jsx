import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './EquityComponents.css';

function beatColor(rate) {
  if (rate == null || Number.isNaN(rate)) return '#475569';
  if (rate >= 70) return '#6366f1';
  if (rate >= 50) return '#f59e0b';
  return '#ef4444';
}

function buildBeatRateOption(beatRates, colors) {
  const sorted = [...beatRates].sort((a, b) => (b.beatRate ?? 0) - (a.beatRate ?? 0));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        const base = `${params[0].name}: ${params[0].value?.toFixed(1)}%`;
        return item ? `${base} (${item.beatCount}/${item.totalCount})` : base;
      },
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0, max: 100,
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.sector),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 9 },
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
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: true, formatter: '50%', color: colors.textSecondary, fontSize: 9 },
      },
    }],
  };
}

export default function EarningsWatch({ earningsData }) {
  const { colors } = useTheme();
  const { upcoming = [], beatRates = [] } = earningsData ?? {};

  const beatRateOption = useMemo(
    () => beatRates.length > 0 ? buildBeatRateOption(beatRates, colors) : null,
    [beatRates, colors]
  );

  if (!earningsData) return null;

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
          {beatRateOption ? (
            <>
              <div className="eq-chart-title">Sector Beat Rate</div>
              <div className="eq-chart-subtitle">Last quarter EPS beat % · indigo ≥70% · amber 50–70% · red &lt;50%</div>
              <div className="eq-chart-wrap">
                <ReactECharts option={beatRateOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </>
          ) : (
            <>
              <div className="eq-chart-title">Sector Beat Rate</div>
              <div className="eq-chart-subtitle" style={{ color: colors.textDim, padding: 20, textAlign: 'center' }}>
                Beat rate data not available — requires historical earnings data
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
