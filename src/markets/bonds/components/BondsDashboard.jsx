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
 * BondsDashboard - Command Center Layout
 * Left sidebar: Key metrics at a glance
 * Main content: All charts visible in grid layout
 */
function BondsDashboard({
  yieldCurveData,
  creditRatingsData,
  spreadIndicators,
  durationLadderData,
  breakevensData,
  fredYieldHistory,
  treasuryRates,
  fedFundsFutures,
  yieldHistory,
  mortgageSpread,
  tipsYields,
  realYieldHistory,
  macroData,
  fedBalanceSheetHistory,
  m2HistoryData,
  auctionData,
  nationalDebt,
  spreadHistory,
  cpiComponents,
  debtToGdpHistory,
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
      legend: { data: countries, top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 }, type: 'scroll', pageIconSize: 8 },
      grid: { top: 32, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: TENORS, axisLabel: { color: colors.textMuted, fontSize: 10 }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: countries.map(c => ({
        name: c,
        type: 'line',
        smooth: true,
        data: TENORS.map(t => yieldCurveData[c]?.[t] ?? null),
        itemStyle: { color: COUNTRY_COLORS[c] || colors.textSecondary },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 4,
      })),
    };
  }, [yieldCurveData, colors]);

  // FRED 10Y history
  const historyOption = useMemo(() => {
    if (!fredYieldHistory?.dates?.length) return null;
    const d = fredYieldHistory.dates;
    const v = fredYieldHistory.values;
    const step = Math.max(1, Math.floor(d.length / 50));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const vals = v.filter((_, i) => i % step === 0 || i === v.length - 1);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>10Y: <b>${p[0].value?.toFixed(2)}%</b>` },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: vals, areaStyle: { color: 'rgba(16,185,129,0.1)' }, lineStyle: { color: '#10b981', width: 1.5 }, itemStyle: { color: '#10b981' }, symbol: 'none', smooth: true }],
    };
  }, [fredYieldHistory, colors]);

  // Multi-tenor history
  const multiTenorOption = useMemo(() => {
    if (!yieldHistory?.dates?.length) return null;
    const d = yieldHistory.dates;
    const step = Math.max(1, Math.floor(d.length / 60));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const subsample = (arr) => arr ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1) : [];
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['2Y', '10Y', '30Y'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '2Y', type: 'line', data: subsample(yieldHistory.dgs2), symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
        { name: '10Y', type: 'line', data: subsample(yieldHistory.dgs10), symbol: 'none', smooth: true, lineStyle: { color: '#fbbf24', width: 1.5 } },
        { name: '30Y', type: 'line', data: subsample(yieldHistory.dgs30), symbol: 'none', smooth: true, lineStyle: { color: '#f87171', width: 1.5 } },
      ],
    };
  }, [yieldHistory, colors]);

  // Real Yields (TIPS) chart
  const realYieldOption = useMemo(() => {
    if (!realYieldHistory?.dates?.length) return null;
    const d = realYieldHistory.dates;
    const step = Math.max(1, Math.floor(d.length / 50));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const subsample = (arr) => arr ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1) : [];
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['5Y TIPS', '10Y TIPS'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '5Y TIPS', type: 'line', data: subsample(realYieldHistory.d5y), symbol: 'none', smooth: true, lineStyle: { color: '#22d3ee', width: 1.5 } },
        { name: '10Y TIPS', type: 'line', data: subsample(realYieldHistory.d10y), symbol: 'none', smooth: true, lineStyle: { color: '#a78bfa', width: 1.5 } },
      ],
    };
  }, [realYieldHistory, colors]);

  // Fed Balance Sheet chart
  const fedBalanceOption = useMemo(() => {
    if (!fedBalanceSheetHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: fedBalanceSheetHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fedBalanceSheetHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '${value}T' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fedBalanceSheetHistory.values, areaStyle: { color: 'rgba(167,139,250,0.1)' }, lineStyle: { color: '#a78bfa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [fedBalanceSheetHistory, colors]);

  // M2 chart
  const m2Option = useMemo(() => {
    if (!m2HistoryData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: m2HistoryData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(m2HistoryData.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '${value}T' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: m2HistoryData.values, areaStyle: { color: 'rgba(96,165,250,0.1)' }, lineStyle: { color: '#60a5fa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [m2HistoryData, colors]);

  // Spread History chart (2s10s, 10s3s, 5s30s)
  const spreadHistoryOption = useMemo(() => {
    if (!spreadHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['2s10s', '10s3s', '5s30s'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: spreadHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(spreadHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '2s10s', type: 'line', data: spreadHistory.t10y2y, symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
        { name: '10s3s', type: 'line', data: spreadHistory.t10y3m, symbol: 'none', smooth: true, lineStyle: { color: '#f59e0b', width: 1.5 } },
        { name: '5s30s', type: 'line', data: spreadHistory.t5y30y, symbol: 'none', smooth: true, lineStyle: { color: '#10b981', width: 1.5 } },
      ],
    };
  }, [spreadHistory, colors]);

  // CPI Components chart
  const cpiOption = useMemo(() => {
    if (!cpiComponents?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['All', 'Core', 'Food', 'Energy'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: cpiComponents.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(cpiComponents.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'All', type: 'line', data: cpiComponents.all, symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
        { name: 'Core', type: 'line', data: cpiComponents.core, symbol: 'none', smooth: true, lineStyle: { color: '#a78bfa', width: 1.5 } },
        { name: 'Food', type: 'line', data: cpiComponents.food, symbol: 'none', smooth: true, lineStyle: { color: '#22c55e', width: 1.5 } },
        { name: 'Energy', type: 'line', data: cpiComponents.energy, symbol: 'none', smooth: true, lineStyle: { color: '#f59e0b', width: 1.5 } },
      ],
    };
  }, [cpiComponents, colors]);

  // Debt-to-GDP chart
  const debtToGdpOption = useMemo(() => {
    if (!debtToGdpHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: debtToGdpHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(debtToGdpHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: debtToGdpHistory.values, areaStyle: { color: 'rgba(239,68,68,0.1)' }, lineStyle: { color: '#ef4444', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [debtToGdpHistory, colors]);

  const countryCount = yieldCurveData ? Object.keys(yieldCurveData).length : 0;
  const us10y = yieldCurveData?.US?.['10y'];

  return (
    <div className="bonds-dashboard" role="region" aria-label="Bonds Market Dashboard">
      {/* Left Sidebar */}
      <div className="bonds-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }} role="region" aria-label="Key Metrics">
        {/* Yield Metrics */}
        <div className="bonds-sidebar-section">
          <div className="bonds-sidebar-title">Yields</div>
          <div className="bonds-metric-card">
            <div className="bonds-metric-label">US 10Y</div>
            <div className="bonds-metric-value accent">{us10y != null ? `${us10y.toFixed(2)}%` : '—'}</div>
          </div>
          <div className="bonds-metric-card">
            <div className="bonds-metric-row">
              <span className="bonds-metric-name">10Y−2Y</span>
              <span className={`bonds-metric-num ${spreadIndicators?.t10y2y >= 0 ? 'positive' : 'negative'}`}>
                {spreadIndicators?.t10y2y != null ? `${spreadIndicators.t10y2y >= 0 ? '+' : ''}${spreadIndicators.t10y2y.toFixed(2)}%` : '—'}
              </span>
            </div>
            <div className="bonds-metric-row">
              <span className="bonds-metric-name">10Y−3M</span>
              <span className={`bonds-metric-num ${spreadIndicators?.t10y3m >= 0 ? 'positive' : 'negative'}`}>
                {spreadIndicators?.t10y3m != null ? `${spreadIndicators.t10y3m >= 0 ? '+' : ''}${spreadIndicators.t10y3m.toFixed(2)}%` : '—'}
              </span>
            </div>
          </div>
          {steepest && (
            <div className="bonds-metric-card">
              <div className="bonds-metric-label">Steepest Curve</div>
              <div className="bonds-metric-value info">{steepest.country} <span style={{ fontSize: 12 }}>({steepest.spread.toFixed(0)}bp)</span></div>
            </div>
          )}
        </div>

        {/* Real Yields */}
        {tipsYields && (
          <div className="bonds-sidebar-section">
            <div className="bonds-sidebar-title">Real Yields</div>
            <div className="bonds-metric-card">
              {tipsYields['5y'] != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">5Y TIPS</span>
                  <span className="bonds-metric-num" style={{ color: '#22d3ee' }}>{tipsYields['5y'].toFixed(2)}%</span>
                </div>
              )}
              {tipsYields['10y'] != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">10Y TIPS</span>
                  <span className="bonds-metric-num" style={{ color: '#a78bfa' }}>{tipsYields['10y'].toFixed(2)}%</span>
                </div>
              )}
              {tipsYields['30y'] != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">30Y TIPS</span>
                  <span className="bonds-metric-num">{tipsYields['30y'].toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Macro */}
        {macroData && (
          <div className="bonds-sidebar-section">
            <div className="bonds-sidebar-title">Macro</div>
            <div className="bonds-metric-card">
              {macroData.unemployment != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">Unemployment</span>
                  <span className="bonds-metric-num">{macroData.unemployment.toFixed(1)}%</span>
                </div>
              )}
              {macroData.gdp != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">GDP Growth</span>
                  <span className="bonds-metric-num" style={{ color: macroData.gdp > 0 ? '#4ade80' : '#f87171' }}>{macroData.gdp.toFixed(1)}%</span>
                </div>
              )}
              {macroData.pce != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">PCE Inflation</span>
                  <span className="bonds-metric-num" style={{ color: macroData.pce > 2 ? '#fbbf24' : '#4ade80' }}>{macroData.pce.toFixed(1)}%</span>
                </div>
              )}
              {nationalDebt != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">US Debt</span>
                  <span className="bonds-metric-num" style={{ color: '#f87171' }}>${nationalDebt.toFixed(1)}T</span>
                </div>
              )}
              {debtToGdpHistory?.latest != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">Debt/GDP</span>
                  <span className="bonds-metric-num" style={{ color: '#f87171' }}>{debtToGdpHistory.latest.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CPI Components */}
        {cpiComponents?.latest && (
          <div className="bonds-sidebar-section">
            <div className="bonds-sidebar-title">CPI YoY</div>
            <div className="bonds-metric-card">
              {cpiComponents.latest.allYoy != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">All Items</span>
                  <span className="bonds-metric-num" style={{ color: cpiComponents.latest.allYoy > 3 ? '#f87171' : cpiComponents.latest.allYoy > 2 ? '#fbbf24' : '#4ade80' }}>
                    {cpiComponents.latest.allYoy.toFixed(1)}%
                  </span>
                </div>
              )}
              {cpiComponents.core?.[cpiComponents.core.length - 1] != null && (
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">Core</span>
                  <span className="bonds-metric-num" style={{ color: '#a78bfa' }}>
                    {cpiComponents.core[cpiComponents.core.length - 1].toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content - ALL visible at once */}
      <div className="bonds-main" role="region" aria-label="Bonds Charts">
        <div className="bonds-content-grid">
          {/* Yield Curve Comparison */}
          {yieldCurveOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }} role="figure" aria-label="Yield Curve Comparison">
              <div className="bonds-panel-header">
                <span className="bonds-panel-title">Yield Curve Comparison</span>
                <span className="bonds-panel-subtitle">{countryCount} countries</span>
              </div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={yieldCurveOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* 10Y History */}
          {historyOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">10Y Treasury History</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Multi-Tenor Trend */}
          {multiTenorOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">2Y/10Y/30Y Trend</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={multiTenorOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* TIPS Real Yields */}
          {realYieldOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">TIPS Real Yields</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={realYieldOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Curve Spreads */}
          {spreadHistoryOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">Curve Spreads (2s10s, 10s3s, 5s30s)</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={spreadHistoryOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Fed Balance Sheet */}
          {fedBalanceOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">Fed Balance Sheet</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={fedBalanceOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* M2 Money Supply */}
          {m2Option && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">M2 Money Supply</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={m2Option} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* CPI Components */}
          {cpiOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">CPI Components (YoY)</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={cpiOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Debt-to-GDP */}
          {debtToGdpOption && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">Debt-to-GDP Ratio</div>
              <div className="bonds-chart-wrap">
                <SafeECharts option={debtToGdpOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* US Treasury Bars */}
          <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">US Treasury Yields</div>
            <div className="bonds-mini-table" style={{ paddingTop: 8 }}>
              {usYieldBars && usYieldBars.map(({ tenor, value, pct }) => (
                <div key={tenor} className="bonds-mini-row" style={{ gap: 6 }}>
                  <span style={{ width: 24, fontWeight: 600, color: colors.textSecondary }}>{tenor}</span>
                  <div style={{ flex: 1, height: 8, background: colors.bgDeep, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'SF Mono', fontSize: 10, fontWeight: 600 }}>{value != null ? `${value.toFixed(2)}%` : '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Inflation Breakevens */}
          <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Inflation Breakevens</div>
            <div className="bonds-mini-table" style={{ paddingTop: 8 }}>
              {breakevensData && (
                <>
                  <div className="bonds-mini-row">
                    <span className="bonds-mini-name">5Y Breakeven</span>
                    <span className="bonds-mini-value">{breakevensData.current?.be5y?.toFixed(2)}%</span>
                  </div>
                  <div className="bonds-mini-row">
                    <span className="bonds-mini-name">10Y Breakeven</span>
                    <span className="bonds-mini-value">{breakevensData.current?.be10y?.toFixed(2)}%</span>
                  </div>
                  <div className="bonds-mini-row">
                    <span className="bonds-mini-name">5Y5Y Forward</span>
                    <span className="bonds-mini-value">{breakevensData.current?.forward5y5y?.toFixed(2)}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Treasury Auctions */}
          {auctionData && auctionData.length > 0 && (
            <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="bonds-panel-title">Recent Auctions</div>
              <div className="bonds-mini-table" style={{ paddingTop: 8 }}>
                {auctionData.slice(0, 6).map((a, i) => (
                  <div key={i} className="bonds-mini-row">
                    <span className="bonds-mini-name">{a.term}</span>
                    <span className="bonds-mini-value">{a.yield?.toFixed(2)}%</span>
                    <span style={{ color: colors.textMuted, fontSize: 9, marginLeft: 4 }}>{a.bidToCover?.toFixed(2)}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duration Ladder */}
          <div className="bonds-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Treasury Duration</div>
            <div className="bonds-mini-table" style={{ paddingTop: 8 }}>
              {durationLadderData?.slice(0, 6).map((d, i) => (
                <div key={i} className="bonds-mini-row">
                  <span className="bonds-mini-name">{d.bucket}</span>
                  <span className="bonds-mini-value">${(d.amount / 1000).toFixed(0)}B</span>
                  <span style={{ color: colors.textMuted, fontSize: 9, marginLeft: 4 }}>{d.pct?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(BondsDashboard);