// src/markets/fx/components/DXYTracker.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './FXComponents.css';

const DXY_WEIGHTS = { EUR: 0.576, JPY: 0.136, GBP: 0.119, CAD: 0.091, SEK: 0.042, CHF: 0.036 };
const DXY_COMPONENT_COLORS = {
  EUR: '#10b981', JPY: '#ef4444', GBP: '#f59e0b',
  CAD: '#a855f7', SEK: '#06b6d4', CHF: '#f97316',
};
const DXY_PROXY_COLOR = '#3b82f6';

const RATE_LABELS = { fed: 'Fed', ecb: 'ECB', boe: 'BoE', boj: 'BoJ' };
const DIFF_LABELS = { usFed_ecb: 'Fed−ECB', usFed_boe: 'Fed−BoE', usFed_boj: 'Fed−BoJ' };

export default function DXYTracker({ history, fredFxRates, dxyHistory, rateDifferentials }) {
  const { colors } = useTheme();

  const { chartOption, dxyLatest, dxy30dChange, componentChanges } = useMemo(() => {
    const dates = Object.keys(history).sort();
    if (dates.length < 2) return { chartOption: null, dxyLatest: null, dxy30dChange: null, componentChanges: [] };

    const firstRates = history[dates[0]] || {};
    const lastRates = history[dates[dates.length - 1]] || {};
    const currencies = Object.keys(DXY_WEIGHTS);

    // Component 30d changes
    const compChanges = currencies.map(cur => {
      const base = firstRates[cur] || 1;
      const curr = lastRates[cur] || base;
      const changePct = -((curr / base - 1) * 100);
      return { code: cur, weight: DXY_WEIGHTS[cur], changePct: Math.round(changePct * 100) / 100 };
    }).sort((a, b) => b.changePct - a.changePct);

    const componentSeries = currencies.map(cur => ({
      name: cur,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, opacity: 0.7 },
      itemStyle: { color: DXY_COMPONENT_COLORS[cur] },
      data: dates.map(date => {
        const base = firstRates[cur] || 1;
        const curr = history[date]?.[cur] || base;
        return +((curr / base) * 100).toFixed(3);
      }),
    }));

    const dxyData = dates.map(date => {
      let weighted = 0;
      for (const [cur, weight] of Object.entries(DXY_WEIGHTS)) {
        const base = firstRates[cur] || 1;
        const curr = history[date]?.[cur] || base;
        weighted += weight * (curr / base);
      }
      return +(weighted * 100).toFixed(3);
    });

    const latest = dxyData[dxyData.length - 1];
    const first = dxyData[0];
    const change = first ? Math.round((latest / first - 1) * 1000) / 10 : null;

    const option = {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 40, right: 24, bottom: 54, left: 54 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: params => {
          const date = params[0]?.axisValue;
          const lines = params.map(p =>
            `<span style="color:${p.color}">●</span> ${p.seriesName}: ${Number(p.value).toFixed(2)}`
          );
          return `<div style="font-size:11px"><b>${date}</b><br/>${lines.join('<br/>')}</div>`;
        },
      },
      legend: {
        data: ['DXY Proxy', ...currencies],
        top: 4,
        textStyle: { color: colors.textSecondary, fontSize: 10 },
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: colors.textMuted, fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        name: 'Index (start = 100)',
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: v => v.toFixed(1) },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [
        {
          name: 'DXY Proxy',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2.5 },
          itemStyle: { color: DXY_PROXY_COLOR },
          data: dxyData,
        },
        ...componentSeries,
      ],
    };

    return { chartOption: option, dxyLatest: latest, dxy30dChange: change, componentChanges: compChanges };
  }, [history, colors]);

  // DXY History (server-supplied) chart option
  const dxyHistoryOption = useMemo(() => {
    if (!dxyHistory?.dates?.length || !dxyHistory?.values?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: params => {
          const p = params[0];
          return `<div style="font-size:11px"><b>${p.axisValue}</b><br/>DXY: <b>${Number(p.value).toFixed(2)}</b></div>`;
        },
      },
      grid: { top: 24, right: 16, bottom: 28, left: 48 },
      xAxis: {
        type: 'category',
        data: dxyHistory.dates,
        axisLabel: { color: colors.textMuted, fontSize: 9, rotate: 30, interval: Math.floor(dxyHistory.dates.length / 6) },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v.toFixed(1) },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        name: 'DXY',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.5, color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
        areaStyle: { color: 'rgba(59,130,246,0.08)' },
        data: dxyHistory.values,
      }],
    };
  }, [dxyHistory, colors]);

  // FRED 1yr chart: EUR/USD + USD/JPY overlay
  const eurH = fredFxRates?.eurUsd;
  const jpyH = fredFxRates?.usdJpy;
  const fredOption = eurH?.dates?.length >= 10 && jpyH?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: ['EUR/USD', 'USD/JPY'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 48, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: eurH.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(eurH.dates.length / 6) },
    },
    yAxis: [
      { type: 'value', position: 'left', axisLine: { show: false }, splitLine: { lineStyle: { color: colors.cardBg } }, axisLabel: { color: '#10b981', fontSize: 9 } },
      { type: 'value', position: 'right', axisLine: { show: false }, splitLine: { show: false }, axisLabel: { color: '#ef4444', fontSize: 9 } },
    ],
    series: [
      { name: 'EUR/USD', type: 'line', yAxisIndex: 0, data: eurH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#10b981' }, itemStyle: { color: '#10b981' } },
      { name: 'USD/JPY', type: 'line', yAxisIndex: 1, data: jpyH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ef4444' }, itemStyle: { color: '#ef4444' } },
    ],
  } : null;

  const strongest = componentChanges[0];
  const weakest = componentChanges[componentChanges.length - 1];
  const maxAbsChange = Math.max(...componentChanges.map(c => Math.abs(c.changePct)), 0.1);

  if (!chartOption) {
    return (
      <div className="fx-panel">
        <div className="fx-panel-header">
          <span className="fx-panel-title">DXY Tracker</span>
          <span className="fx-panel-subtitle">30-day USD proxy index</span>
        </div>
        <div className="fx-loading">Loading historical data…</div>
      </div>
    );
  }

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">DXY Tracker</span>
        <span className="fx-panel-subtitle">USD proxy index · DXY-weighted composite + components · 30d</span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">DXY Proxy</span>
          <span className="fx-kpi-value">{dxyLatest != null ? dxyLatest.toFixed(2) : '—'}</span>
          <span className="fx-kpi-sub">base 100</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">30d Change</span>
          <span className={`fx-kpi-value ${dxy30dChange != null ? (dxy30dChange >= 0 ? 'positive' : 'negative') : ''}`}>
            {dxy30dChange != null ? `${dxy30dChange >= 0 ? '+' : ''}${dxy30dChange.toFixed(1)}%` : '—'}
          </span>
        </div>
        {strongest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Strongest Component</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{strongest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>+{strongest.changePct.toFixed(2)}%</span>
          </div>
        )}
        {weakest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Weakest Component</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{weakest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{weakest.changePct.toFixed(2)}%</span>
          </div>
        )}
      </div>

      {/* Main: DXY chart (wide) + component breakdown (narrow) */}
      <div className="fx-wide-narrow" style={{ marginBottom: 12 }}>
        <div style={{ minHeight: 0, display: 'flex' }}>
          <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
        </div>
        <div className="fx-chart-panel">
          <div className="fx-chart-title">DXY Component Weights + 30d %</div>
          <div className="fx-comp-list" style={{ marginTop: 4 }}>
            {componentChanges.map(c => {
              const barPct = Math.abs(c.changePct) / maxAbsChange * 100;
              const isPos = c.changePct >= 0;
              return (
                <div key={c.code} className="fx-comp-row">
                  <span className="fx-comp-code" style={{ color: DXY_COMPONENT_COLORS[c.code] }}>{c.code}</span>
                  <span className="fx-comp-weight">{(c.weight * 100).toFixed(1)}%</span>
                  <div className="fx-comp-bar-wrap">
                    <div
                      className="fx-comp-bar-fill"
                      style={{ width: `${barPct}%`, background: isPos ? '#22c55e' : '#ef4444' }}
                    />
                  </div>
                  <span className={`fx-comp-change ${isPos ? 'positive' : 'negative'}`}>
                    {isPos ? '+' : ''}{c.changePct.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FRED 1yr chart */}
      {fredOption && (
        <div className="fx-chart-panel" style={{ height: 170, flexShrink: 0 }}>
          <div className="fx-chart-title">EUR/USD + USD/JPY — 1 Year (FRED daily)</div>
          <div className="fx-mini-chart">
            <ReactECharts option={fredOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      {/* DXY History (server data) */}
      {dxyHistoryOption && (
        <div className="fx-chart-panel" style={{ height: 180, flexShrink: 0, marginTop: 12 }}>
          <div className="fx-chart-title">Dollar Index (DXY) — Historical</div>
          <div className="fx-mini-chart">
            <ReactECharts option={dxyHistoryOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      {/* Rate Differentials */}
      {rateDifferentials && (
        <div className="fx-chart-panel" style={{ flexShrink: 0, marginTop: 12, padding: '10px 14px' }}>
          <div className="fx-chart-title" style={{ marginBottom: 8 }}>Rate Differentials — Central Bank Policy Rates</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {/* Policy rates */}
            <div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Policy Rates</div>
              <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {Object.entries(RATE_LABELS).map(([key, label]) => {
                    const val = rateDifferentials[key];
                    return (
                      <tr key={key}>
                        <td style={{ paddingRight: 12, color: colors.textSecondary, paddingBottom: 4 }}>{label}</td>
                        <td style={{ fontWeight: 600, color: colors.text, paddingBottom: 4 }}>
                          {val != null ? `${Number(val).toFixed(2)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* US vs others differentials */}
            <div>
              <div style={{ fontSize: 10, color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>US Spread vs.</div>
              <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  {Object.entries(DIFF_LABELS).map(([key, label]) => {
                    const val = rateDifferentials[key];
                    const isPos = val != null && Number(val) >= 0;
                    const isNeg = val != null && Number(val) < 0;
                    return (
                      <tr key={key}>
                        <td style={{ paddingRight: 12, color: colors.textSecondary, paddingBottom: 4 }}>{label}</td>
                        <td style={{
                          fontWeight: 600,
                          color: isPos ? '#22c55e' : isNeg ? '#ef4444' : colors.text,
                          paddingBottom: 4,
                        }}>
                          {val != null ? `${isPos ? '+' : ''}${Number(val).toFixed(2)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
