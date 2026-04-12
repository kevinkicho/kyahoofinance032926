import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';


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

function buildIndustrialProdOption(industrialProd, colors) {
  const { dates = [], yoyPct = [] } = industrialProd ?? {};
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
      type: 'line',
      data: yoyPct,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#a78bfa', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(167,139,250,0.25)' }, { offset: 1, color: 'rgba(167,139,250,0)' }] } },
      markLine: {
        data: [{ yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

function buildConsumerSentimentOption(consumerSentiment, colors) {
  const { dates = [], values = [] } = consumerSentiment ?? {};
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].axisValue}: ${params[0].value != null ? params[0].value.toFixed(1) : '—'}`,
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
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#f59e0b', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.22)' }, { offset: 1, color: 'rgba(245,158,11,0)' }] } },
    }],
  };
}

export default function GrowthInflation({ growthInflationData, industrialProd, consumerSentiment, cpiBreakdown }) {
  const { colors } = useTheme();
  const { year = '', countries = [] } = growthInflationData ?? {};

  const gdpOption           = useMemo(() => buildGdpOption(countries, colors), [countries, colors]);
  const cpiOption           = useMemo(() => buildCpiOption(countries, colors), [countries, colors]);
  const indProdOption       = useMemo(() => buildIndustrialProdOption(industrialProd, colors), [industrialProd, colors]);
  const sentimentOption     = useMemo(() => buildConsumerSentimentOption(consumerSentiment, colors), [consumerSentiment, colors]);

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
            <SafeECharts option={gdpOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">CPI Inflation (%)</div>
          <div className="mac-chart-subtitle">Ranked highest to lowest · teal = on target (1–3%) · amber = elevated · red = high</div>
          <div className="mac-chart-wrap">
            <SafeECharts option={cpiOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
      {(industrialProd || consumerSentiment) && (
        <div className="mac-two-col" style={{ marginTop: 16 }}>
          {industrialProd && (
            <div className="mac-chart-panel">
              <div className="mac-chart-title">Industrial Production (YoY %)</div>
              <div className="mac-chart-subtitle">US Fed — monthly · purple line · dashed zero = contraction boundary</div>
              <div className="mac-chart-wrap">
                <SafeECharts option={indProdOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}
          {consumerSentiment && (
            <div className="mac-chart-panel">
              <div className="mac-chart-title">Consumer Sentiment (U. Michigan)</div>
              <div className="mac-chart-subtitle">Index level — higher = more optimistic · amber line</div>
              <div className="mac-chart-wrap">
                <SafeECharts option={sentimentOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      )}
      {/* CPI Breakdown */}
      {cpiBreakdown?.components?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="mac-section-header" style={{ marginBottom: 12 }}>
            <span className="mac-panel-title" style={{ fontSize: 14 }}>US CPI Components (BLS)</span>
            <span className="mac-panel-subtitle" style={{ fontSize: 11 }}>Year-over-year change by category</span>
            {cpiBreakdown.asOf && <span style={{ marginLeft: 'auto', fontSize: 11, color: colors.textMuted }}>as of {cpiBreakdown.asOf}</span>}
          </div>
          <div className="mac-cpi-breakdown">
            {cpiBreakdown.components.map((c, i) => {
              const yoyColor = c.yoy == null ? colors.textMuted : c.yoy < 0 ? '#4ade80' : c.yoy < 2 ? '#4ade80' : c.yoy < 4 ? '#f59e0b' : '#ef4444';
              return (
                <div key={c.key} className="mac-cpi-row" style={{ background: i % 2 === 0 ? 'transparent' : colors.cardBg }}>
                  <span className="mac-cpi-name">{c.name}</span>
                  <span className="mac-cpi-weight" style={{ color: colors.textMuted }}>{(c.weight * 100).toFixed(1)}%</span>
                  <span className="mac-cpi-yoy" style={{ color: yoyColor, fontWeight: 600 }}>
                    {c.yoy != null ? `${c.yoy > 0 ? '+' : ''}${c.yoy.toFixed(1)}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
