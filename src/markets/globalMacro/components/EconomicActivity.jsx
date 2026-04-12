// src/markets/globalMacro/components/EconomicActivity.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';


/**
 * Economic Activity component displaying Chicago Fed National Activity Index (CFNAI)
 *
 * CFNAI is a monthly economic indicator that measures overall economic activity:
 * - Values > 0: Economy growing above trend
 * - Values < 0: Economy growing below trend
 * - Values < -0.7: Signal recession (highly predictive)
 *
 * The 3-month moving average (CFNAI-MA3) smooths volatility and is used for recession calls.
 */

function cfnaiStatus(value) {
  if (value == null) return { label: '—', color: '#64748b', bg: '#1e293b' };
  if (value < -0.7) return { label: 'Recession Signal', color: '#ef4444', bg: '#7f1d1d' };
  if (value < -0.3) return { label: 'Contraction', color: '#f87171', bg: '#450a0a' };
  if (value < 0) return { label: 'Below Trend', color: '#fbbf24', bg: '#451a03' };
  if (value < 0.3) return { label: 'Near Trend', color: '#a3e635', bg: '#1a2e05' };
  return { label: 'Above Trend', color: '#4ade80', bg: '#14532d' };
}

export default function EconomicActivity({ cfnai, oecdCli }) {
  const { colors } = useTheme();

  const chartData = useMemo(() => {
    if (!cfnai?.dates?.length) return null;
    const step = Math.max(1, Math.floor(cfnai.dates.length / 60));
    return {
      dates: cfnai.dates.filter((_, i) => i % step === 0 || i === cfnai.dates.length - 1),
      values: cfnai.values.filter((_, i) => i % step === 0 || i === cfnai.values.length - 1),
    };
  }, [cfnai]);

  const latest = cfnai?.latest ?? cfnai?.values?.[cfnai?.values?.length - 1];
  const status = cfnaiStatus(latest);

  // Calculate recession signals (how many months below -0.7 in last year)
  const recessionSignals = useMemo(() => {
    if (!cfnai?.values?.length) return null;
    const last12 = cfnai.values.slice(-12);
    return last12.filter(v => v < -0.7).length;
  }, [cfnai]);

  // Calculate trend direction
  const trendDirection = useMemo(() => {
    if (!cfnai?.values?.length || cfnai.values.length < 3) return null;
    const last3 = cfnai.values.slice(-3);
    const avg = last3.reduce((a, b) => a + b, 0) / 3;
    const prev3 = cfnai.values.slice(-6, -3);
    if (prev3.length < 3) return null;
    const prevAvg = prev3.reduce((a, b) => a + b, 0) / 3;
    if (avg > prevAvg + 0.1) return 'improving';
    if (avg < prevAvg - 0.1) return 'weakening';
    return 'stable';
  }, [cfnai]);

  const option = useMemo(() => {
    if (!chartData) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const v = params[0]?.value;
          const statusText = v < -0.7 ? ' (Recession Signal)' : v < 0 ? ' (Below Trend)' : '';
          return `<b>${params[0].axisValue}</b><br/>CFNAI: <b>${v?.toFixed(3)}${statusText}</b>`;
        },
      },
      grid: { top: 30, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: chartData.dates,
        axisLabel: { color: colors.textMuted, fontSize: 10, interval: Math.floor(chartData.dates.length / 6) },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        name: 'CFNAI',
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: colors.cardBg } },
        // Mark recession threshold
        splitArea: {
          show: true,
          areas: [
            { start: -2, end: -0.7, color: 'rgba(239, 68, 68, 0.1)' }, // Recession zone
            { start: -0.7, end: 0, color: 'rgba(251, 191, 36, 0.05)' }, // Below trend zone
          ],
        },
      },
      series: [{
        type: 'line',
        data: chartData.values,
        symbol: 'none',
        smooth: true,
        lineStyle: { color: '#7c3aed', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(124, 58, 237, 0.3)' },
              { offset: 1, color: 'rgba(124, 58, 237, 0.02)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          data: [
            { yAxis: 0, lineStyle: { color: '#64748b' }, label: { formatter: 'Trend', position: 'end' } },
            { yAxis: -0.7, lineStyle: { color: '#ef4444' }, label: { formatter: 'Recession', position: 'end' } },
          ],
        },
      }],
    };
  }, [chartData, colors]);

  if (!cfnai?.dates?.length) {
    return (
      <div className="mac-panel">
        <div className="mac-panel-header">
          <span className="mac-panel-title">Economic Activity</span>
          <span className="mac-panel-subtitle">CFNAI — Chicago Fed National Activity Index</span>
        </div>
        <div className="mac-empty">No data available</div>
      </div>
    );
  }

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Economic Activity</span>
        <span className="mac-panel-subtitle">CFNAI — Chicago Fed National Activity Index</span>
      </div>

      {/* KPI Strip */}
      <div className="mac-kpi-strip">
        <div className="mac-kpi-pill" style={{ background: status.bg }}>
          <span className="mac-kpi-label">Latest CFNAI</span>
          <span className="mac-kpi-value" style={{ color: status.color }}>
            {latest != null ? latest.toFixed(3) : '—'}
          </span>
          <span className="mac-kpi-sub">{status.label}</span>
        </div>
        {recessionSignals != null && (
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Recession Signals</span>
            <span className="mac-kpi-value" style={{ color: recessionSignals >= 3 ? '#ef4444' : '#f59e0b' }}>
              {recessionSignals}/12
            </span>
            <span className="mac-kpi-sub">Months below -0.7</span>
          </div>
        )}
        {trendDirection && (
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Trend (3M)</span>
            <span className="mac-kpi-value" style={{ color: trendDirection === 'improving' ? '#4ade80' : trendDirection === 'weakening' ? '#f87171' : '#a3e635' }}>
              {trendDirection === 'improving' ? '↗ Improving' : trendDirection === 'weakening' ? '↘ Weakening' : '→ Stable'}
            </span>
            <span className="mac-kpi-sub">vs prior 3 months</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="mac-chart-wrap" style={{ minHeight: 200 }}>
        {option && <SafeECharts option={option} style={{ height: '100%', width: '100%' }} />}
      </div>

      {/* OECD CLI Section */}
      {oecdCli?.countries?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="mac-section-header" style={{ marginBottom: 12 }}>
            <span className="mac-panel-title" style={{ fontSize: 14 }}>OECD Composite Leading Indicators</span>
            <span className="mac-panel-subtitle" style={{ fontSize: 11 }}>CLI &gt; 100 = above trend · &lt; 100 = below trend</span>
            {oecdCli.asOf && <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>as of {oecdCli.asOf}</span>}
          </div>
          <div className="mac-cli-grid">
            {oecdCli.countries.map(c => {
              const cliColor = c.cli > 100 ? '#4ade80' : c.cli < 100 ? '#f87171' : '#fbbf24';
              const trendIcon = c.trend === 'improving' ? '↗' : c.trend === 'slowing' ? '↘' : '→';
              const trendColor = c.trend === 'improving' ? '#4ade80' : c.trend === 'slowing' ? '#f87171' : '#a3e635';
              return (
                <div key={c.code} className="mac-cli-card" style={{ background: colors.cardBg }}>
                  <div className="mac-cli-country">
                    <span className="mac-cli-flag">{c.flag}</span>
                    <span className="mac-cli-name">{c.code}</span>
                  </div>
                  <div className="mac-cli-value" style={{ color: cliColor }}>
                    {c.cli?.toFixed(1) ?? '—'}
                  </div>
                  <div className="mac-cli-trend" style={{ color: trendColor }}>
                    {trendIcon} {c.trend || 'stable'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mac-panel-footer">
        CFNAI &lt; -0.7 signals recession · &lt; 0 indicates below-trend growth · Fed uses this for recession probability models
      </div>
    </div>
  );
}