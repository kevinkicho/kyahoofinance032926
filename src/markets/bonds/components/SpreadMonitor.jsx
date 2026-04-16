import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './BondsDashboard.css';

const SERIES_CONFIG = [
  { key: 'IG',  label: 'Investment Grade (IG)', color: '#60a5fa' },
  { key: 'HY',  label: 'High Yield (HY)',       color: '#f472b6' },
  { key: 'EM',  label: 'Emerging Mkt (EM)',      color: '#fbbf24' },
  { key: 'BBB', label: 'BBB-Rated (Crossover)',  color: '#a78bfa' },
];

export default function SpreadMonitor({ spreadData, mortgageSpread }) {
  const { colors } = useTheme();

  const option = useMemo(() => ({
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value} bps</b>`).join('<br/>'),
    },
    legend: {
      data: SERIES_CONFIG.map(s => s.label),
      top: 0,
      textStyle: { color: colors.textSecondary, fontSize: 11 },
    },
    grid: { top: 40, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: 'category',
      data: spreadData.dates,
      axisLabel: { color: colors.textMuted, fontSize: 11 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      name: 'bps',
      nameTextStyle: { color: colors.textMuted, fontSize: 10 },
      axisLabel: { color: colors.textMuted, fontSize: 11 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: SERIES_CONFIG.map(({ key, label, color }) => ({
      name: label,
      type: 'line',
      smooth: false,
      data: spreadData[key],
      itemStyle: { color },
      lineStyle: { width: 2 },
      areaStyle: { color, opacity: 0.06 },
      symbol: 'none',
    })),
  }), [spreadData, colors]);

  // KPI computations
  const latest = useMemo(() => {
    const ig  = spreadData.IG?.[spreadData.IG.length - 1] ?? null;
    const hy  = spreadData.HY?.[spreadData.HY.length - 1] ?? null;
    const em  = spreadData.EM?.[spreadData.EM.length - 1] ?? null;
    const bbb = spreadData.BBB?.[spreadData.BBB.length - 1] ?? null;
    const all = [
      { key: 'IG', val: ig, color: '#60a5fa' },
      { key: 'HY', val: hy, color: '#f472b6' },
      { key: 'EM', val: em, color: '#fbbf24' },
      { key: 'BBB', val: bbb, color: '#a78bfa' },
    ].filter(s => s.val != null);
    const widest = all.length ? all.reduce((a, b) => a.val > b.val ? a : b) : null;
    const hyIgGap = (hy != null && ig != null) ? hy - ig : null;
    return { ig, hy, em, bbb, widest, hyIgGap, all };
  }, [spreadData]);

  // Sort bars descending for side panel
  const sortedBars = useMemo(() =>
    [...latest.all].sort((a, b) => b.val - a.val),
  [latest.all]);
  const maxSpread = sortedBars.length ? sortedBars[0].val : 1;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Spread Monitor</span>
        <span className="bonds-panel-subtitle">Credit spreads over US Treasuries &middot; basis points (bps)</span>
      </div>

      {/* KPI Strip */}
      <div className="bonds-kpi-strip">
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">IG Spread</span>
          <span className="bonds-kpi-value accent">{latest.ig != null ? `${latest.ig} bps` : '\u2014'}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">HY Spread</span>
          <span className="bonds-kpi-value accent">{latest.hy != null ? `${latest.hy} bps` : '\u2014'}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Widest</span>
          <span className="bonds-kpi-value" style={{ color: latest.widest?.color || '#10b981' }}>
            {latest.widest ? `${latest.widest.key} ${latest.widest.val}` : '\u2014'}
          </span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">{`HY\u2212IG Gap`}</span>
          <span className="bonds-kpi-value accent">{latest.hyIgGap != null ? `${latest.hyIgGap} bps` : '\u2014'}</span>
        </div>
        {mortgageSpread != null && (
          <div className="bonds-kpi-pill">
            <span className="bonds-kpi-label">Mtg Spread</span>
            <span className="bonds-kpi-value" style={{
              color: mortgageSpread < 1.5 ? '#34d399' : mortgageSpread <= 2.0 ? '#fbbf24' : '#f87171'
            }}>
              {`+${mortgageSpread.toFixed(2)}%`}
            </span>
          </div>
        )}
      </div>

      {/* Wide-Narrow: Chart + Latest Bars */}
      <div className="bonds-wide-narrow">
        <div className="bonds-chart-wrap">
          <SafeECharts option={option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Spread Monitor', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'BAMLH0A0HYM2' }, { id: 'BAMLC0A0CM' }] }} />
        </div>
        <div className="bonds-chart-panel">
          <div className="bonds-chart-title">Latest Spreads</div>
          {sortedBars.map(s => {
            const pct = (s.val / maxSpread) * 100;
            return (
              <div key={s.key} className="bonds-bar-row">
                <span className="bonds-bar-label">{s.key}</span>
                <div className="bonds-bar-track">
                  <div className="bonds-bar-fill" style={{ width: `${pct}%`, background: s.color }} />
                </div>
                <span className="bonds-bar-val">{s.val} bps</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bonds-panel-footer">
        Source: ICE BofA indices via FRED &middot; spreads over US Treasuries
      </div>
    </div>
  );
}
