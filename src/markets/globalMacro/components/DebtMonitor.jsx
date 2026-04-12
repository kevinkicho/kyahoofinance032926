import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';


function debtBarColor(v, textDim = '#475569') {
  if (v == null || Number.isNaN(v)) return textDim;
  if (v < 60)  return '#14b8a6';
  if (v < 90)  return '#f59e0b';
  return '#ef4444';
}

function buildDebtOption(countries, colors) {
  const sorted = [...countries].sort((a, b) => (b.debt ?? 0) - (a.debt ?? 0));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}% of GDP`,
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.code}`),
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisTick: { show: false },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.debt,
        itemStyle: { color: debtBarColor(c.debt, colors.textDim) },
      })),
      markLine: {
        data: [{ yAxis: 60 }, { yAxis: 100 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: true, color: colors.textMuted, fontSize: 9 },
      },
    }],
  };
}

function buildCurrentAcctOption(countries, colors) {
  const sorted = [...countries].sort((a, b) => (b.currentAccount ?? 0) - (a.currentAccount ?? 0));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}% of GDP`,
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.code}`),
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisTick: { show: false },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.currentAccount,
        itemStyle: { color: (c.currentAccount ?? 0) >= 0 ? '#14b8a6' : '#ef4444' },
      })),
      markLine: {
        data: [{ yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

function buildYieldSpreadOption(yieldSpread, colors) {
  const { dates = [], values = [] } = yieldSpread ?? {};
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const v = params[0].value;
        return `${params[0].axisValue}: ${v != null ? v.toFixed(2) : '—'}% ${v != null && v < 0 ? '⚠ Inverted' : ''}`;
      },
    },
    grid: { top: 12, right: 12, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisTick: { show: false },
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    visualMap: {
      show: false,
      dimension: 1,
      pieces: [
        { lte: 0, color: '#ef4444' },
        { gt: 0, color: '#14b8a6' },
      ],
    },
    series: [{
      type: 'line',
      data: values,
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.15 },
      markLine: {
        data: [{ yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
        label: { show: true, formatter: 'Inversion →', color: '#ef4444', fontSize: 9, position: 'end' },
      },
    }],
  };
}

function buildM2GrowthOption(m2Growth, colors) {
  const { dates = [], yoyPct = [] } = m2Growth ?? {};
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].axisValue}: ${params[0].value != null ? params[0].value.toFixed(1) : '—'}%`,
    },
    grid: { top: 8, right: 12, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisTick: { show: false },
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'bar',
      data: yoyPct.map(v => ({
        value: v,
        itemStyle: { color: v > 8 ? '#ef4444' : v > 4 ? '#f59e0b' : '#14b8a6' },
      })),
    }],
  };
}

export default function DebtMonitor({ debtData, yieldSpread, m2Growth }) {
  const { colors } = useTheme();
  const { year = '', countries = [] } = debtData ?? {};

  const debtOption        = useMemo(() => buildDebtOption(countries, colors), [countries, colors]);
  const currentAcctOption = useMemo(() => buildCurrentAcctOption(countries, colors), [countries, colors]);
  const yieldSpreadOption = useMemo(() => buildYieldSpreadOption(yieldSpread, colors), [yieldSpread, colors]);
  const m2GrowthOption    = useMemo(() => buildM2GrowthOption(m2Growth, colors), [m2Growth, colors]);

  const kpis = useMemo(() => {
    if (!countries.length) return null;
    const withDebt = countries.filter(c => c.debt != null);
    const highestDebt = withDebt.length ? withDebt.reduce((a, b) => a.debt > b.debt ? a : b) : null;
    const withCA = countries.filter(c => c.currentAccount != null);
    const largestSurplus = withCA.length ? withCA.reduce((a, b) => a.currentAccount > b.currentAccount ? a : b) : null;
    const above90 = withDebt.filter(c => c.debt > 90).length;
    const avgDebt = withDebt.length ? withDebt.reduce((s, c) => s + c.debt, 0) / withDebt.length : 0;
    return { highestDebt, largestSurplus, above90, avgDebt, totalCountries: withDebt.length };
  }, [countries]);

  if (!debtData) return null;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Debt Monitor</span>
        <span className="mac-panel-subtitle">{year} data — World Bank · Maastricht reference lines at 60% and 100%</span>
      </div>
      {/* KPI Strip */}
      {kpis && (
        <div className="mac-kpi-strip">
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Highest Debt</span>
            <span className="mac-kpi-value" style={{ color: '#ef4444' }}>
              {kpis.highestDebt ? kpis.highestDebt.name : '\u2014'}
            </span>
            {kpis.highestDebt && <span className="mac-kpi-sub">{kpis.highestDebt.debt.toFixed(0)}% GDP</span>}
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Largest Surplus</span>
            <span className="mac-kpi-value accent">
              {kpis.largestSurplus ? kpis.largestSurplus.name : '\u2014'}
            </span>
            {kpis.largestSurplus && (
              <span className="mac-kpi-sub">
                {kpis.largestSurplus.currentAccount >= 0 ? '+' : ''}{kpis.largestSurplus.currentAccount.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Debt &gt; 90%</span>
            <span className="mac-kpi-value" style={{ color: kpis.above90 > 3 ? '#ef4444' : '#14b8a6' }}>
              {kpis.above90}
            </span>
            <span className="mac-kpi-sub">of {kpis.totalCountries}</span>
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Avg Debt/GDP</span>
            <span className="mac-kpi-value accent">{kpis.avgDebt.toFixed(0)}%</span>
          </div>
        </div>
      )}
      <div className="mac-two-col">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Government Debt (% of GDP)</div>
          <div className="mac-chart-subtitle">Green &lt;60% · amber 60–90% · red &gt;90% (Maastricht criteria)</div>
          <div className="mac-chart-wrap">
            <SafeECharts option={debtOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Current Account Balance (% of GDP)</div>
          <div className="mac-chart-subtitle">Teal = surplus · red = deficit · sorted surplus to deficit</div>
          <div className="mac-chart-wrap">
            <SafeECharts option={currentAcctOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
      {(yieldSpread || m2Growth) && (
        <div className="mac-two-col" style={{ marginTop: 16 }}>
          {yieldSpread && (
            <div className="mac-chart-panel">
              <div className="mac-chart-title">Yield Spread — 10Y minus 2Y (Recession Indicator)</div>
              <div className="mac-chart-subtitle">36 months · teal = normal · red = inverted (below 0) · dashed = inversion threshold</div>
              <div className="mac-chart-wrap">
                <SafeECharts option={yieldSpreadOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}
          {m2Growth && (
            <div className="mac-chart-panel">
              <div className="mac-chart-title">M2 Money Supply Growth (YoY %)</div>
              <div className="mac-chart-subtitle">Teal &lt;4% · amber 4–8% · red &gt;8% — elevated M2 growth signals inflation risk</div>
              <div className="mac-chart-wrap">
                <SafeECharts option={m2GrowthOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mac-panel-footer">Source: World Bank · Annual data · CA positive = capital exporter, negative = importer · Yield spread: FRED T10Y2Y</div>
    </div>
  );
}
