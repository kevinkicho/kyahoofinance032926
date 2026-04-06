import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './MacroComponents.css';

function buildGdpOption(countries, colors) {
  const sorted = [...countries].sort((a, b) => b.gdp - a.gdp);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.name}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.gdp,
        itemStyle: { color: c.gdp >= 0 ? '#14b8a6' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed' },
        label: { show: false },
      },
    }],
  };
}

function buildCpiOption(countries, colors) {
  const sorted = [...countries].sort((a, b) => b.cpi - a.cpi);
  const barColor = (v) => {
    if (v < 0 || v > 5) return '#ef4444';
    if (v > 3)          return '#f59e0b';
    return '#14b8a6';
  };
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.name}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.cpi,
        itemStyle: { color: barColor(c.cpi) },
      })),
      markLine: {
        data: [{ xAxis: 2 }],
        symbol: 'none',
        lineStyle: { color: '#14b8a6', type: 'dashed', width: 1 },
        label: { show: true, formatter: '2% target', color: '#14b8a6', fontSize: 9 },
      },
    }],
  };
}

export default function GrowthInflation({ growthInflationData }) {
  const { colors } = useTheme();
  const { year = '', countries = [] } = growthInflationData ?? {};

  const gdpOption = useMemo(() => buildGdpOption(countries, colors), [countries, colors]);
  const cpiOption = useMemo(() => buildCpiOption(countries, colors), [countries, colors]);

  const kpis = useMemo(() => {
    if (!countries.length) return null;
    const fastest = countries.reduce((a, b) => (a.gdp ?? -99) > (b.gdp ?? -99) ? a : b);
    const lowestCpi = countries.reduce((a, b) => (a.cpi ?? 99) < (b.cpi ?? 99) ? a : b);
    const aboveTarget = countries.filter(c => c.cpi > 2).length;
    const ADV = ['US', 'EA', 'GB', 'JP', 'CA', 'AU', 'SE'];
    const adv = countries.filter(c => ADV.includes(c.code));
    const em = countries.filter(c => !ADV.includes(c.code));
    const avgAdv = adv.length ? adv.reduce((s, c) => s + (c.gdp || 0), 0) / adv.length : 0;
    const avgEm = em.length ? em.reduce((s, c) => s + (c.gdp || 0), 0) / em.length : 0;
    return { fastest, lowestCpi, aboveTarget, gdpGap: avgAdv - avgEm };
  }, [countries]);

  if (!growthInflationData) return null;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Growth &amp; Inflation</span>
        <span className="mac-panel-subtitle">{year} annual data — World Bank</span>
      </div>
      {/* KPI Strip */}
      {kpis && (
        <div className="mac-kpi-strip">
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Fastest Growing</span>
            <span className="mac-kpi-value accent">{kpis.fastest.name}</span>
            <span className="mac-kpi-sub">{kpis.fastest.gdp?.toFixed(1)}%</span>
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Lowest CPI</span>
            <span className="mac-kpi-value accent">{kpis.lowestCpi.name}</span>
            <span className="mac-kpi-sub">{kpis.lowestCpi.cpi?.toFixed(1)}%</span>
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">{`Above 2% Target`}</span>
            <span className="mac-kpi-value" style={{ color: kpis.aboveTarget > 6 ? '#ef4444' : '#14b8a6' }}>
              {kpis.aboveTarget}
            </span>
            <span className="mac-kpi-sub">of {countries.length}</span>
          </div>
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">{`Adv\u2212EM GDP Gap`}</span>
            <span className={`mac-kpi-value ${kpis.gdpGap >= 0 ? 'positive' : 'negative'}`}>
              {kpis.gdpGap >= 0 ? '+' : ''}{kpis.gdpGap.toFixed(1)}pp
            </span>
          </div>
        </div>
      )}
      <div className="mac-two-col">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">GDP Growth (%)</div>
          <div className="mac-chart-subtitle">Ranked highest to lowest · teal = positive · red = contraction</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={gdpOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">CPI Inflation (%)</div>
          <div className="mac-chart-subtitle">Ranked highest to lowest · teal = on target (1–3%) · amber = elevated · red = high</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={cpiOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
