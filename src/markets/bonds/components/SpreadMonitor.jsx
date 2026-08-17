import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import { useTheme } from '../../../hub/ThemeContext';
import { creditSpreadSeriesRows } from './BondsLiveChips';
import './BondsDashboard.css';

const SERIES_CONFIG = [
  { key: 'IG',  label: 'Investment Grade (IG)', color: '#60a5fa' },
  { key: 'HY',  label: 'High Yield (HY)',       color: '#f472b6' },
  { key: 'EM',  label: 'Emerging Mkt (EM)',      color: '#fbbf24' },
  { key: 'BBB', label: 'BBB-Rated (Crossover)',  color: '#a78bfa' },
];

export default function SpreadMonitor({ spreadData, mortgageSpread, lastUpdated }) {
  const { colors } = useTheme();

  const hasSeries = !!(Array.isArray(spreadData?.dates) && spreadData.dates.length
    && SERIES_CONFIG.some(({ key }) => creditSpreadSeriesRows(spreadData, key).some((v) => v != null)));

  const option = useMemo(() => {
    if (!hasSeries) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) =>
          `<b>${params[0].axisValue}</b><br/>` +
          params.map(p => `${p.seriesName}: <b>${p.value != null ? p.value : '—'} bps</b>`).join('<br/>'),
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
        data: creditSpreadSeriesRows(spreadData, key),
        connectNulls: true,
        itemStyle: { color },
        lineStyle: { width: 2 },
        areaStyle: { color, opacity: 0.06 },
        symbol: 'none',
      })),
    };
  }, [spreadData, colors, hasSeries]);

  const latest = useMemo(() => {
    if (!spreadData) {
      return { ig: null, hy: null, em: null, bbb: null, widest: null, hyIgGap: null, all: [] };
    }
    const lastNonNull = (arr) => {
      if (!Array.isArray(arr)) return null;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] != null && Number.isFinite(Number(arr[i]))) return Number(arr[i]);
      }
      return null;
    };
    const ig  = spreadData.current?.igSpread ?? lastNonNull(spreadData.IG);
    const hy  = spreadData.current?.hySpread ?? lastNonNull(spreadData.HY);
    const em  = spreadData.current?.emSpread ?? lastNonNull(spreadData.EM);
    const bbb = spreadData.current?.bbbSpread ?? lastNonNull(spreadData.BBB);
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

  const sortedBars = useMemo(() =>
    [...latest.all].sort((a, b) => b.val - a.val),
  [latest.all]);
  const maxSpread = sortedBars.length ? sortedBars[0].val : 1;

  if (!hasSeries && latest.all.length === 0) {
    return (
      <div className="bonds-panel">
        <div className="bonds-panel-header">
          <span className="bonds-panel-title">Credit Spread Monitor</span>
          <span className="bonds-panel-subtitle">IG · HY · EM · BBB spreads over Treasuries</span>
        </div>
        <div className="bonds-empty">No spread data available — FRED credit spread series may be temporarily unavailable</div>
      </div>
    );
  }

  return (
    <div className="bonds-panel" data-panel-bound="1" data-panel-live="1">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Spread Monitor</span>
        <span className="bonds-panel-subtitle">Credit spreads over US Treasuries &middot; basis points (bps)</span>
      </div>

      <div className="bonds-kpi-strip">
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">IG Spread</span>
          <span className="bonds-kpi-value accent">
            <MetricValue value={latest.ig} seriesKey="igSpread" timestamp={lastUpdated} format={(v) => `${Math.round(v)} bps`} />
          </span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">HY Spread</span>
          <span className="bonds-kpi-value accent">
            <MetricValue value={latest.hy} seriesKey="hySpread" timestamp={lastUpdated} format={(v) => `${Math.round(v)} bps`} />
          </span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Widest</span>
          <span className="bonds-kpi-value" style={{ color: latest.widest?.color || '#10b981' }}>
            {latest.widest
              ? <>{latest.widest.key} <MetricValue value={latest.widest.val} seriesKey="hySpread" timestamp={lastUpdated} format={(v) => String(Math.round(v))} /></>
              : '—'}
          </span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">{`HY\u2212IG Gap`}</span>
          <span className="bonds-kpi-value accent">
            <MetricValue value={latest.hyIgGap} seriesKey="hySpread" timestamp={lastUpdated} format={(v) => `${Math.round(v)} bps`} />
          </span>
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

      <div className="bonds-wide-narrow">
        <div className="bonds-chart-wrap">
          {option
            ? <SafeECharts option={option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Spread Monitor', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'BAMLH0A0HYM2' }, { id: 'BAMLC0A0CM' }] }} />
            : <div className="bonds-empty">Chart series incomplete</div>}
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
                <span className="bonds-bar-val">
                  <MetricValue value={s.val} seriesKey={s.key === 'HY' ? 'hySpread' : 'igSpread'} timestamp={lastUpdated} format={(v) => `${Math.round(v)}`} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
