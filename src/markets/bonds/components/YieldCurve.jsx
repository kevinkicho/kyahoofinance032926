import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './BondsComponents.css';

const TENORS = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
const COUNTRY_COLORS = {
  US: '#60a5fa', DE: '#34d399', JP: '#f472b6',
  GB: '#a78bfa', IT: '#fb923c', FR: '#facc15',
  CN: '#f87171', AU: '#4ade80',
};

export default function YieldCurve({ yieldCurveData, spreadIndicators, fredYieldHistory }) {
  const { colors } = useTheme();

  const option = useMemo(() => {
    const countries = Object.keys(yieldCurveData);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) =>
        params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>')
      },
      legend: {
        data: countries,
        top: 0,
        textStyle: { color: colors.textSecondary, fontSize: 11 },
      },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: TENORS,
        axisLabel: { color: colors.textMuted, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: countries.map(c => ({
        name: c,
        type: 'line',
        smooth: true,
        data: TENORS.map(t => yieldCurveData[c]?.[t] ?? null),
        itemStyle: { color: COUNTRY_COLORS[c] || colors.textSecondary },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 5,
      })),
    };
  }, [yieldCurveData, colors]);

  // FRED 10Y history chart
  const historyOption = useMemo(() => {
    if (!fredYieldHistory?.dates?.length) return null;
    const d = fredYieldHistory.dates;
    const v = fredYieldHistory.values;
    // Subsample to ~60 points
    const step = Math.max(1, Math.floor(d.length / 60));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const vals  = v.filter((_, i) => i % step === 0 || i === v.length - 1);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>10Y: <b>${p[0].value?.toFixed(2)}%</b>` },
      grid: { top: 10, right: 20, bottom: 24, left: 50 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: colors.textMuted, fontSize: 10, interval: Math.floor(dates.length / 5) },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'line',
        data: vals,
        areaStyle: { color: 'rgba(16,185,129,0.12)' },
        lineStyle: { color: '#10b981', width: 1.5 },
        itemStyle: { color: '#10b981' },
        symbol: 'none',
        smooth: true,
      }],
    };
  }, [fredYieldHistory, colors]);

  const countryCount = Object.keys(yieldCurveData).length;
  const us = yieldCurveData.US || {};
  const us10y = us['10y'];
  const spread10y2y = spreadIndicators?.t10y2y;
  const spread10y3m = spreadIndicators?.t10y3m;

  // Steepest curve: country with largest 30y - 3m spread
  const steepest = useMemo(() => {
    let best = null;
    let bestSpread = -Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve['30y'];
      const s3m = curve['3m'];
      if (s30 != null && s3m != null) {
        const spread = s30 - s3m;
        if (spread > bestSpread) { bestSpread = spread; best = cc; }
      }
    }
    return best;
  }, [yieldCurveData]);

  // US tenor bars
  const maxYield = Math.max(...TENORS.map(t => us[t] ?? 0), 0.01);

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Yield Curve</span>
        <span className="bonds-panel-subtitle">{countryCount} countries &middot; sovereign benchmark rates</span>
      </div>

      {/* KPI Strip */}
      <div className="bonds-kpi-strip">
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">US 10Y</span>
          <span className="bonds-kpi-value accent">{us10y != null ? `${us10y.toFixed(2)}%` : '\u2014'}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">10Y&minus;2Y</span>
          <span className={`bonds-kpi-value ${spread10y2y != null && spread10y2y >= 0 ? 'positive' : 'negative'}`}>
            {spread10y2y != null ? `${spread10y2y >= 0 ? '+' : ''}${spread10y2y.toFixed(2)}%` : '\u2014'}
          </span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">10Y&minus;3M</span>
          <span className={`bonds-kpi-value ${spread10y3m != null && spread10y3m >= 0 ? 'positive' : 'negative'}`}>
            {spread10y3m != null ? `${spread10y3m >= 0 ? '+' : ''}${spread10y3m.toFixed(2)}%` : '\u2014'}
          </span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Steepest</span>
          <span className="bonds-kpi-value accent">{steepest || '\u2014'}</span>
        </div>
      </div>

      {/* Wide-Narrow: Chart + US Tenor Bars */}
      <div className="bonds-wide-narrow">
        <div className="bonds-chart-wrap">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
        <div className="bonds-chart-panel">
          <div className="bonds-chart-title">US Yield by Tenor</div>
          {TENORS.map(t => {
            const val = us[t];
            const pct = val != null ? (val / maxYield) * 100 : 0;
            return (
              <div key={t} className="bonds-bar-row">
                <span className="bonds-bar-label">{t}</span>
                <div className="bonds-bar-track">
                  <div className="bonds-bar-fill" style={{ width: `${pct}%`, background: '#10b981' }} />
                </div>
                <span className="bonds-bar-val">{val != null ? `${val.toFixed(2)}%` : '\u2014'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FRED 10Y History */}
      {historyOption && (
        <div className="bonds-chart-panel" style={{ marginTop: 12 }}>
          <div className="bonds-chart-title">US 10Y Yield &mdash; 1yr History (FRED DGS10)</div>
          <ReactECharts option={historyOption} style={{ height: 120, width: '100%' }} />
        </div>
      )}

      <div className="bonds-panel-footer">
        X-axis: 3m &rarr; 30y &middot; Y-axis: yield % &middot; Hover for details
      </div>
    </div>
  );
}
