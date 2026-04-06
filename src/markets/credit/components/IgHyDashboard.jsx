// src/markets/credit/components/IgHyDashboard.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CreditComponents.css';

function spreadTrend(cur, prev) {
  if (cur == null || prev == null) return { text: '—', cls: 'credit-neu' };
  const d = cur - prev;
  return { text: `${d >= 0 ? '+' : ''}${d}bps`, cls: d > 0 ? 'credit-neg' : d < 0 ? 'credit-pos' : 'credit-neu' };
}

function buildSpreadHistoryOption(history, colors) {
  const { dates = [], IG = [], HY = [], BBB = [] } = history;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value}bps`).join('<br/>')}`,
    },
    legend: { data: ['IG','HY','BBB'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9, interval: Math.floor(dates.length / 5) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'IG',  type: 'line', data: IG,  lineStyle: { color: '#06b6d4', width: 2 }, symbol: 'none', itemStyle: { color: '#06b6d4' } },
      { name: 'HY',  type: 'line', data: HY,  lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'none', itemStyle: { color: '#f59e0b' } },
      { name: 'BBB', type: 'line', data: BBB, lineStyle: { color: '#818cf8', width: 2, type: 'dashed' }, symbol: 'none', itemStyle: { color: '#818cf8' } },
    ],
  };
}

export default function IgHyDashboard({ spreadData, commercialPaper }) {
  if (!spreadData) return null;
  const { colors } = useTheme();
  const { current = {}, history = {}, etfs = [] } = spreadData;

  const spreads = [
    { label: 'IG Spread',  value: current.igSpread,  series: 'IG',  prev: (history.IG  || []).at(-2) },
    { label: 'HY Spread',  value: current.hySpread,  series: 'HY',  prev: (history.HY  || []).at(-2) },
    { label: 'BBB Spread', value: current.bbbSpread, series: 'BBB', prev: (history.BBB || []).at(-2) },
    { label: 'EM Spread',  value: current.emSpread,  series: 'EM',  prev: null },
    { label: 'CCC Spread', value: current.cccSpread, series: 'CCC', prev: null },
  ];

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">IG / HY Dashboard</span>
        <span className="credit-panel-subtitle">OAS spreads in bps · FRED · rising spread = wider = more risk premium</span>
      </div>
      <div className="credit-stats-row">
        {spreads.map(s => {
          const trend = spreadTrend(s.value, s.prev);
          return (
            <div key={s.label} className="credit-stat-pill">
              <span className="credit-stat-label">{s.label}</span>
              <span className="credit-stat-value cyan">{s.value != null ? `${s.value}bps` : '—'}</span>
              {s.prev != null && <span style={{ fontSize: 9, color: trend.cls === 'credit-pos' ? '#34d399' : trend.cls === 'credit-neg' ? '#f87171' : colors.textMuted }}>{trend.text} MoM</span>}
            </div>
          );
        })}
        {commercialPaper?.financial3m != null && (
          <div className="credit-stat-pill">
            <span className="credit-stat-label">Fin CP 3M</span>
            <span className="credit-stat-value">{commercialPaper.financial3m.toFixed(2)}%</span>
          </div>
        )}
        {commercialPaper?.nonfinancial3m != null && (
          <div className="credit-stat-pill">
            <span className="credit-stat-label">Non-Fin CP 3M</span>
            <span className="credit-stat-value">{commercialPaper.nonfinancial3m.toFixed(2)}%</span>
          </div>
        )}
      </div>
      <div className="credit-two-col">
        <div className="credit-chart-panel">
          <div className="credit-chart-title">12-Month Spread History</div>
          <div className="credit-chart-subtitle">IG · HY · BBB OAS in basis points · cyan narrows = compression</div>
          <div className="credit-chart-wrap">
            <ReactECharts option={buildSpreadHistoryOption(history, colors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="credit-chart-panel">
          <div className="credit-chart-title">Credit ETF Monitor</div>
          <div className="credit-chart-subtitle">LQD · HYG · EMB · JNK · BKLN · MUB — price · 1d Δ · yield · duration</div>
          <div className="credit-scroll">
            <table className="credit-table">
              <thead>
                <tr>
                  <th className="credit-th" style={{ textAlign: 'left' }}>ETF</th>
                  <th className="credit-th" style={{ textAlign: 'left' }}>Name</th>
                  <th className="credit-th">Price</th>
                  <th className="credit-th">1d Δ%</th>
                  <th className="credit-th">Yield</th>
                  <th className="credit-th">Dur (yr)</th>
                </tr>
              </thead>
              <tbody>
                {etfs.map(e => {
                  const chCls = e.change1d > 0.05 ? 'credit-pos' : e.change1d < -0.05 ? 'credit-neg' : 'credit-neu';
                  return (
                    <tr key={e.ticker} className="credit-row">
                      <td className="credit-cell"><strong>{e.ticker}</strong></td>
                      <td className="credit-cell credit-muted">{e.name}</td>
                      <td className="credit-cell credit-num">${e.price?.toFixed(2)}</td>
                      <td className={`credit-cell credit-num ${chCls}`}>{e.change1d >= 0 ? '+' : ''}{e.change1d?.toFixed(2)}%</td>
                      <td className="credit-cell credit-num">{e.yieldPct?.toFixed(2)}%</td>
                      <td className="credit-cell credit-num">{e.durationYr?.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
