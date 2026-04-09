// src/markets/bonds/components/BondsDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './BondsDashboard.css';

const TENORS = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
const COUNTRY_COLORS = {
  US: '#60a5fa', DE: '#34d399', JP: '#f472b6',
  GB: '#a78bfa', IT: '#fb923c', FR: '#facc15',
  CN: '#f87171', AU: '#4ade80', CA: '#38bdf8',
  CH: '#a3e635', SE: '#fbbf24', ES: '#fb7185',
  NL: '#818cf8', BE: '#34d399', AT: '#c084fc',
  FI: '#2dd4bf', PT: '#f97316', GR: '#ef4444',
  IE: '#22d3ee', DK: '#84cc16', NO: '#0ea5e9', NZ: '#ec4899',
};

/**
 * BondsDashboard - Unified view showing all bond data at once
 * Layout: Yield Curve section (full-width) + Other panels (2-column grid)
 */
export default function BondsDashboard({
  yieldCurveData,
  creditRatingsData,
  spreadData,
  spreadIndicators,
  durationLadderData,
  breakevensData,
  fredYieldHistory,
  treasuryRates,
  fedFundsFutures,
  yieldHistory,
  mortgageSpread,
  // New data props
  tipsYields,
  realYieldHistory,
  macroData,
  fedBalanceSheetHistory,
  m2HistoryData,
  creditIndices,
  auctionData,
  nationalDebt,
}) {
  const { colors } = useTheme();

  // Find steepest curve
  const steepest = useMemo(() => {
    if (!yieldCurveData) return null;
    let best = null;
    let bestSpread = -Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve?.['30y'];
      const s3m = curve?.['3m'];
      if (s30 != null && s3m != null) {
        const spread = s30 - s3m;
        if (spread > bestSpread) { bestSpread = spread; best = cc; }
      }
    }
    return best ? { country: best, spread: bestSpread } : null;
  }, [yieldCurveData]);

  // US yield curve bar data
  const usYieldBars = useMemo(() => {
    if (!yieldCurveData?.US) return null;
    const us = yieldCurveData.US;
    const maxVal = Math.max(...TENORS.map(t => us[t] ?? 0), 0.01);
    return TENORS.map(t => ({
      tenor: t,
      value: us[t],
      pct: us[t] != null ? (us[t] / maxVal) * 100 : 0,
    }));
  }, [yieldCurveData]);

  // Yield Curve chart
  const yieldCurveOption = useMemo(() => {
    if (!yieldCurveData || !Object.keys(yieldCurveData).length) return null;
    const countries = Object.keys(yieldCurveData);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) => params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>') },
      legend: { data: countries, top: 0, textStyle: { color: colors.textSecondary, fontSize: 11 }, type: 'scroll' },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: TENORS, axisLabel: { color: colors.textMuted, fontSize: 11 }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 11, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
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

  // FRED 10Y history
  const historyOption = useMemo(() => {
    if (!fredYieldHistory?.dates?.length) return null;
    const d = fredYieldHistory.dates;
    const v = fredYieldHistory.values;
    const step = Math.max(1, Math.floor(d.length / 60));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const vals = v.filter((_, i) => i % step === 0 || i === v.length - 1);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>10Y: <b>${p[0].value?.toFixed(2)}%</b>` },
      grid: { top: 10, right: 20, bottom: 24, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 10, interval: Math.floor(dates.length / 5) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: vals, areaStyle: { color: 'rgba(16,185,129,0.12)' }, lineStyle: { color: '#10b981', width: 1.5 }, itemStyle: { color: '#10b981' }, symbol: 'none', smooth: true }],
    };
  }, [fredYieldHistory, colors]);

  // Multi-tenor history
  const multiTenorOption = useMemo(() => {
    if (!yieldHistory?.dates?.length) return null;
    const d = yieldHistory.dates;
    const step = Math.max(1, Math.floor(d.length / 80));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const subsample = (arr) => arr ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1) : [];
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) => `<b>${params[0].axisValue}</b><br/>` + params.map(p => `${p.seriesName}: <b>${p.value != null ? p.value.toFixed(2) + '%' : '—'}</b>`).join('<br/>') },
      legend: { data: ['2Y', '10Y', '30Y'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 24, right: 20, bottom: 24, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 10, interval: Math.floor(dates.length / 5) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '2Y', type: 'line', data: subsample(yieldHistory.dgs2), symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 }, itemStyle: { color: '#60a5fa' } },
        { name: '10Y', type: 'line', data: subsample(yieldHistory.dgs10), symbol: 'none', smooth: true, lineStyle: { color: '#fbbf24', width: 1.5 }, itemStyle: { color: '#fbbf24' } },
        { name: '30Y', type: 'line', data: subsample(yieldHistory.dgs30), symbol: 'none', smooth: true, lineStyle: { color: '#f87171', width: 1.5 }, itemStyle: { color: '#f87171' } },
      ],
    };
  }, [yieldHistory, colors]);

  // Real Yields (TIPS) chart
  const realYieldOption = useMemo(() => {
    if (!realYieldHistory?.dates?.length) return null;
    const d = realYieldHistory.dates;
    const step = Math.max(1, Math.floor(d.length / 60));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const subsample = (arr) => arr ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1) : [];
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) => `<b>${params[0].axisValue}</b><br/>` + params.map(p => `${p.seriesName}: <b>${p.value != null ? p.value.toFixed(2) + '%' : '—'}</b>`).join('<br/>') },
      legend: { data: ['5Y TIPS', '10Y TIPS'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 24, right: 20, bottom: 24, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 10, interval: Math.floor(dates.length / 5) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '5Y TIPS', type: 'line', data: subsample(realYieldHistory.d5y), symbol: 'none', smooth: true, lineStyle: { color: '#22d3ee', width: 1.5 }, itemStyle: { color: '#22d3ee' } },
        { name: '10Y TIPS', type: 'line', data: subsample(realYieldHistory.d10y), symbol: 'none', smooth: true, lineStyle: { color: '#a78bfa', width: 1.5 }, itemStyle: { color: '#a78bfa' } },
      ],
    };
  }, [realYieldHistory, colors]);

  // Fed Balance Sheet chart
  const fedBalanceOption = useMemo(() => {
    if (!fedBalanceSheetHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>Fed Balance: <b>$${p[0].value?.toFixed(1)}T</b>` },
      grid: { top: 10, right: 20, bottom: 24, left: 50 },
      xAxis: { type: 'category', data: fedBalanceSheetHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fedBalanceSheetHistory.dates.length / 5) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '${value}T' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fedBalanceSheetHistory.values, areaStyle: { color: 'rgba(167,139,250,0.12)' }, lineStyle: { color: '#a78bfa', width: 1.5 }, itemStyle: { color: '#a78bfa' }, symbol: 'none', smooth: true }],
    };
  }, [fedBalanceSheetHistory, colors]);

  // M2 chart
  const m2Option = useMemo(() => {
    if (!m2HistoryData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>M2: <b>$${p[0].value?.toFixed(1)}T</b>` },
      grid: { top: 10, right: 20, bottom: 24, left: 50 },
      xAxis: { type: 'category', data: m2HistoryData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(m2HistoryData.dates.length / 5) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '${value}T' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: m2HistoryData.values, areaStyle: { color: 'rgba(96,165,250,0.12)' }, lineStyle: { color: '#60a5fa', width: 1.5 }, itemStyle: { color: '#60a5fa' }, symbol: 'none', smooth: true }],
    };
  }, [m2HistoryData, colors]);

  const countryCount = yieldCurveData ? Object.keys(yieldCurveData).length : 0;
  const us10y = yieldCurveData?.US?.['10y'];

  return (
    <div className="bonds-dashboard">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* YIELD CURVE SECTION - Full-width comprehensive panel */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bonds-yield-section" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
        {/* Header */}
        <div className="bonds-panel-header">
          <span className="bonds-panel-title">Yield Curve</span>
          <span className="bonds-panel-subtitle">{countryCount} countries · sovereign benchmark rates</span>
        </div>

        {/* KPI Strip */}
        <div className="bonds-kpi-strip">
          <div className="bonds-kpi-pill">
            <span className="bonds-kpi-label">US 10Y</span>
            <span className="bonds-kpi-value accent">{us10y != null ? `${us10y.toFixed(2)}%` : '—'}</span>
          </div>
          <div className="bonds-kpi-pill">
            <span className="bonds-kpi-label">10Y−2Y</span>
            <span className={`bonds-kpi-value ${spreadIndicators?.t10y2y != null && spreadIndicators.t10y2y >= 0 ? 'positive' : 'negative'}`}>
              {spreadIndicators?.t10y2y != null ? `${spreadIndicators.t10y2y >= 0 ? '+' : ''}${spreadIndicators.t10y2y.toFixed(2)}%` : '—'}
            </span>
          </div>
          <div className="bonds-kpi-pill">
            <span className="bonds-kpi-label">10Y−3M</span>
            <span className={`bonds-kpi-value ${spreadIndicators?.t10y3m != null && spreadIndicators.t10y3m >= 0 ? 'positive' : 'negative'}`}>
              {spreadIndicators?.t10y3m != null ? `${spreadIndicators.t10y3m >= 0 ? '+' : ''}${spreadIndicators.t10y3m.toFixed(2)}%` : '—'}
            </span>
          </div>
          <div className="bonds-kpi-pill">
            <span className="bonds-kpi-label">Steepest</span>
            <span className="bonds-kpi-value accent">{steepest?.country || '—'}</span>
          </div>
          {tipsYields?.['10y'] != null && (
            <div className="bonds-kpi-pill">
              <span className="bonds-kpi-label">Real 10Y</span>
              <span className="bonds-kpi-value" style={{ color: '#22d3ee' }}>{tipsYields['10y'].toFixed(2)}%</span>
            </div>
          )}
          {nationalDebt != null && (
            <div className="bonds-kpi-pill">
              <span className="bonds-kpi-label">US Debt</span>
              <span className="bonds-kpi-value" style={{ color: '#f87171' }}>${nationalDebt.toFixed(1)}T</span>
            </div>
          )}
        </div>

        {/* Wide-Narrow: Chart + US Tenor Bars */}
        {yieldCurveOption && (
          <div className="bonds-wide-narrow">
            <div className="bonds-chart-wrap">
              <SafeECharts option={yieldCurveOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="bonds-chart-panel">
              <div className="bonds-chart-title">US Yield by Tenor</div>
              {usYieldBars && usYieldBars.map(({ tenor, value, pct }) => (
                <div key={tenor} className="bonds-bar-row">
                  <span className="bonds-bar-label">{tenor}</span>
                  <div className="bonds-bar-track">
                    <div className="bonds-bar-fill" style={{ width: `${pct}%`, background: '#10b981' }} />
                  </div>
                  <span className="bonds-bar-val">{value != null ? `${value.toFixed(2)}%` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Charts - Stacked */}
        {historyOption && (
          <div className="bonds-chart-panel" style={{ marginTop: 12 }}>
            <div className="bonds-chart-title">US 10Y Yield — 1Y History (FRED DGS10)</div>
            <SafeECharts option={historyOption} style={{ height: 120, width: '100%' }} />
          </div>
        )}

        {multiTenorOption && (
          <div className="bonds-chart-panel" style={{ marginTop: 12 }}>
            <div className="bonds-chart-title">2Y / 10Y / 30Y Yield — 252-Day History</div>
            <SafeECharts option={multiTenorOption} style={{ height: 140, width: '100%' }} />
          </div>
        )}

        {/* Footer */}
        <div className="bonds-panel-footer">
          X-axis: 3m → 30y · Y-axis: yield % · Hover for details
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MACRO & REAL YIELDS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bonds-section-title">Macro & Real Yields</div>
      <div className="bonds-chart-grid">
        {/* Real Yields (TIPS) */}
        {realYieldOption && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Real Yields (TIPS)</div>
            <div className="bonds-kpi-row">
              {tipsYields?.['5y'] != null && (
                <div className="bonds-mini-kpi">
                  <span className="bonds-mini-label">5Y Real</span>
                  <span className="bonds-mini-val" style={{ color: '#22d3ee' }}>{tipsYields['5y'].toFixed(2)}%</span>
                </div>
              )}
              {tipsYields?.['10y'] != null && (
                <div className="bonds-mini-kpi">
                  <span className="bonds-mini-label">10Y Real</span>
                  <span className="bonds-mini-val" style={{ color: '#a78bfa' }}>{tipsYields['10y'].toFixed(2)}%</span>
                </div>
              )}
              {tipsYields?.['30y'] != null && (
                <div className="bonds-mini-kpi">
                  <span className="bonds-mini-label">30Y Real</span>
                  <span className="bonds-mini-val">{tipsYields['30y'].toFixed(2)}%</span>
                </div>
              )}
            </div>
            <div className="bonds-chart-wrap" style={{ minHeight: 140 }}>
              <SafeECharts option={realYieldOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Fed Balance Sheet */}
        {fedBalanceOption && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Fed Balance Sheet (QE/QT)</div>
            <div className="bonds-kpi-row">
              <div className="bonds-mini-kpi">
                <span className="bonds-mini-label">Current</span>
                <span className="bonds-mini-val" style={{ color: '#a78bfa' }}>${macroData?.fedBalanceSheet?.toFixed(1)}T</span>
              </div>
              <div className="bonds-mini-kpi">
                <span className="bonds-mini-label">M2</span>
                <span className="bonds-mini-val">${macroData?.m2?.toFixed(1)}T</span>
              </div>
            </div>
            <div className="bonds-chart-wrap" style={{ minHeight: 140 }}>
              <SafeECharts option={fedBalanceOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* M2 Money Supply */}
        {m2Option && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">M2 Money Supply</div>
            <div className="bonds-chart-wrap" style={{ minHeight: 140 }}>
              <SafeECharts option={m2Option} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Macro Indicators */}
        <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="bonds-panel-title">Macro Indicators</div>
          <div className="bonds-mini-table">
            {macroData?.unemployment != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">Unemployment</span>
                <span className="bonds-mini-value">{macroData.unemployment.toFixed(1)}%</span>
              </div>
            )}
            {macroData?.gdp != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">GDP Growth</span>
                <span className="bonds-mini-value" style={{ color: macroData.gdp > 0 ? '#4ade80' : '#f87171' }}>{macroData.gdp.toFixed(1)}%</span>
              </div>
            )}
            {macroData?.pce != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">PCE Inflation</span>
                <span className="bonds-mini-value" style={{ color: macroData.pce > 2 ? '#fbbf24' : '#4ade80' }}>{macroData.pce.toFixed(1)}%</span>
              </div>
            )}
            {macroData?.laborParticipation != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">Labor Participation</span>
                <span className="bonds-mini-value">{macroData.laborParticipation.toFixed(1)}%</span>
              </div>
            )}
            {nationalDebt != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">National Debt</span>
                <span className="bonds-mini-value" style={{ color: '#f87171' }}>${nationalDebt.toFixed(1)}T</span>
              </div>
            )}
            {macroData?.surplusDeficit != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">FY Deficit</span>
                <span className="bonds-mini-value" style={{ color: '#f87171' }}>${Math.abs(macroData.surplusDeficit).toFixed(1)}T</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CREDIT & SPREADS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bonds-section-title">Credit & Spreads</div>
      <div className="bonds-chart-grid">
        {/* Credit Spreads */}
        <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="bonds-panel-title">Credit Spreads</div>
          <div className="bonds-mini-table">
            {spreadData?.IG && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">IG OAS</span>
                <span className="bonds-mini-value" style={{ color: spreadData.IG[spreadData.IG.length - 1] > 150 ? '#f87171' : '#4ade80' }}>
                  {spreadData.IG[spreadData.IG.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
            {spreadData?.HY && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">HY OAS</span>
                <span className="bonds-mini-value" style={{ color: spreadData.HY[spreadData.HY.length - 1] > 400 ? '#f87171' : spreadData.HY[spreadData.HY.length - 1] > 250 ? '#fbbf24' : '#4ade80' }}>
                  {spreadData.HY[spreadData.HY.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
            {spreadData?.EM && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">EM Spread</span>
                <span className="bonds-mini-value" style={{ color: spreadData.EM[spreadData.EM.length - 1] > 400 ? '#f87171' : '#fbbf24' }}>
                  {spreadData.EM[spreadData.EM.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
            {spreadData?.BBB && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">BBB Spread</span>
                <span className="bonds-mini-value" style={{ color: spreadData.BBB[spreadData.BBB.length - 1] > 200 ? '#f87171' : '#fbbf24' }}>
                  {spreadData.BBB[spreadData.BBB.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
            {creditIndices?.aaa10y != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">AAA-10Y</span>
                <span className="bonds-mini-value">{creditIndices.aaa10y.toFixed(2)}%</span>
              </div>
            )}
            {creditIndices?.baa10y != null && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">BAA-AAA</span>
                <span className="bonds-mini-value">{creditIndices.baa10y.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Duration Ladder */}
        <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="bonds-panel-title">Duration Ladder</div>
          <div className="bonds-mini-table">
            {durationLadderData?.slice(0, 6).map((d, i) => (
              <div key={i} className="bonds-mini-row">
                <span className="bonds-mini-name">{d.bucket}</span>
                <span className="bonds-mini-value">${(d.amount / 1000).toFixed(0)}B</span>
                <span className="bonds-mini-duration">{d.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakevens */}
        <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="bonds-panel-title">Inflation Breakevens</div>
          <div className="bonds-mini-table">
            {breakevensData && (
              <>
                <div className="bonds-mini-row">
                  <span className="bonds-mini-name">5-Year</span>
                  <span className="bonds-mini-value">{breakevensData.current?.be5y?.toFixed(2)}%</span>
                </div>
                <div className="bonds-mini-row">
                  <span className="bonds-mini-name">10-Year</span>
                  <span className="bonds-mini-value">{breakevensData.current?.be10y?.toFixed(2)}%</span>
                </div>
                <div className="bonds-mini-row">
                  <span className="bonds-mini-name">5Y5Y Forward</span>
                  <span className="bonds-mini-value">{breakevensData.current?.forward5y5y?.toFixed(2)}%</span>
                </div>
                {breakevensData.current?.real5y != null && (
                  <div className="bonds-mini-row">
                    <span className="bonds-mini-name">Real 5Y</span>
                    <span className="bonds-mini-value" style={{ color: '#22d3ee' }}>{breakevensData.current.real5y.toFixed(2)}%</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Credit Ratings */}
        {creditRatingsData?.length > 0 && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Credit Quality</div>
            <div className="bonds-mini-table">
              {creditRatingsData.slice(0, 5).map((c, i) => (
                <div key={i} className="bonds-mini-row">
                  <span className="bonds-mini-name">{c.rating}</span>
                  <span className="bonds-mini-value" style={{ color: c.rating?.startsWith('A') ? '#4ade80' : c.rating?.startsWith('B') ? '#fbbf24' : '#f87171' }}>
                    {c.yield?.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TREASURY AUCTIONS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {auctionData && auctionData.length > 0 && (
        <>
          <div className="bonds-section-title">Treasury Auctions</div>
          <div className="bonds-chart-grid">
            <div className="bonds-panel-card bonds-full-width" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">Recent Auction Results</div>
              <div className="bonds-auction-table">
                <div className="bonds-auction-header">
                  <span>Date</span>
                  <span>Term</span>
                  <span>Yield</span>
                  <span>Bid/Cover</span>
                </div>
                {auctionData.slice(0, 6).map((a, i) => (
                  <div key={i} className="bonds-auction-row">
                    <span>{a.date}</span>
                    <span>{a.term}</span>
                    <span className="bonds-auction-yield">{a.yield?.toFixed(2)}%</span>
                    <span className="bonds-auction-btc">{a.bidToCover?.toFixed(2)}x</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}