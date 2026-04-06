import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

const MARKET_COLORS = {
  US: '#60a5fa', UK: '#34d399', DE: '#f472b6',
  AU: '#fbbf24', CA: '#a78bfa', JP: '#fb923c',
};

function buildBisOption(priceIndexData, colors) {
  const markets = Object.keys(priceIndexData);
  const dates = priceIndexData[markets[0]]?.dates ?? [];
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value}</b>`).join('<br/>'),
    },
    legend: { data: markets, top: 0, textStyle: { color: colors.textSecondary, fontSize: 11 } },
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textMuted, fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 11 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: markets.map(m => ({
      name: m, type: 'line', smooth: true,
      data: priceIndexData[m].values,
      itemStyle: { color: MARKET_COLORS[m] || colors.textSecondary },
      lineStyle: { width: 2 }, symbol: 'none',
    })),
  };
}

function buildCaseShillerOption(national, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>Index: <b>${p[0].value}</b>`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 48 },
    xAxis: {
      type: 'category', data: national.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(national.dates.length / 6) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: national.values, symbol: 'none',
      lineStyle: { color: '#f97316', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,22,0.3)' }, { offset: 1, color: 'rgba(249,115,22,0)' }] } },
    }],
  };
}

function buildHousingStartsOption(housingStarts, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params =>
        `${params[0].axisValue}<br/>` +
        params.map(p => `${p.seriesName}: <b>${(p.value / 1000).toFixed(2)}M</b>`).join('<br/>'),
    },
    legend: { data: ['Starts', 'Permits'], top: 2, textStyle: { color: colors.textSecondary, fontSize: 9 } },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: housingStarts.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(housingStarts.dates.length / 6) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${(v / 1000).toFixed(1)}M` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'Starts', type: 'line', data: housingStarts.starts, symbol: 'none', lineStyle: { color: '#60a5fa', width: 2 }, itemStyle: { color: '#60a5fa' } },
      { name: 'Permits', type: 'line', data: housingStarts.permits, symbol: 'none', lineStyle: { color: '#fbbf24', width: 2 }, itemStyle: { color: '#fbbf24' } },
    ],
  };
}

function buildExistingHomeSalesOption(existingHomeSales, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>Existing Sales: <b>${(p[0].value / 1000).toFixed(2)}M</b>`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: existingHomeSales.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(existingHomeSales.dates.length / 6) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${(v / 1000).toFixed(1)}M` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: existingHomeSales.values, symbol: 'none',
      lineStyle: { color: '#a78bfa', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(167,139,250,0.25)' }, { offset: 1, color: 'rgba(167,139,250,0)' }] } },
    }],
  };
}

export default function PriceIndex({ priceIndexData, caseShillerData, housingStarts, existingHomeSales }) {
  const { colors } = useTheme();
  const bisOption = useMemo(() => buildBisOption(priceIndexData, colors), [priceIndexData, colors]);
  const csOption = useMemo(() => caseShillerData?.national ? buildCaseShillerOption(caseShillerData.national, colors) : null, [caseShillerData, colors]);
  const startsOption = useMemo(() => housingStarts?.starts?.length >= 4 ? buildHousingStartsOption(housingStarts, colors) : null, [housingStarts, colors]);
  const salesOption = useMemo(() => existingHomeSales?.dates?.length >= 4 ? buildExistingHomeSalesOption(existingHomeSales, colors) : null, [existingHomeSales, colors]);

  const salesLatest = existingHomeSales?.values?.at(-1);
  const salesPrev = existingHomeSales?.values?.at(-13);
  const salesYoy = salesLatest != null && salesPrev != null ? Math.round((salesLatest / salesPrev - 1) * 1000) / 10 : null;
  const startsLatest = housingStarts?.starts?.at(-1);
  const permitsLatest = housingStarts?.permits?.at(-1);

  const usData = priceIndexData.US;
  const usLatest = usData?.values?.[usData.values.length - 1] ?? null;
  const usYoy = usData?.values?.length >= 5
    ? Math.round((usData.values[usData.values.length - 1] / usData.values[usData.values.length - 5] - 1) * 1000) / 10
    : null;
  const usPeak = usData?.values ? Math.max(...usData.values) : null;
  const peakDiff = usPeak && usLatest ? Math.round((usLatest / usPeak - 1) * 1000) / 10 : null;

  let fastest = null;
  for (const [cc, d] of Object.entries(priceIndexData)) {
    if (d.values.length >= 5) {
      const growth = Math.round((d.values[d.values.length - 1] / d.values[d.values.length - 5] - 1) * 1000) / 10;
      if (!fastest || growth > fastest.growth) fastest = { cc, growth };
    }
  }

  const metros = caseShillerData?.metros || {};
  const metroEntries = Object.entries(metros);
  const maxMetroVal = metroEntries.length ? Math.max(...metroEntries.map(([, m]) => m.latest)) : 1;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Price Index</span>
        <span className="re-panel-subtitle">{Object.keys(priceIndexData).length} markets · quarterly · indexed to 100</span>
      </div>

      <div className="re-kpi-strip">
        {usLatest != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">US Index</span>
            <span className="re-kpi-value">{usLatest}</span>
          </div>
        )}
        {usYoy != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">US YoY</span>
            <span className={`re-kpi-value ${usYoy >= 0 ? 'positive' : 'negative'}`}>{usYoy > 0 ? '+' : ''}{usYoy}%</span>
          </div>
        )}
        {peakDiff != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">From Peak</span>
            <span className={`re-kpi-value ${peakDiff >= 0 ? 'positive' : 'negative'}`}>{peakDiff > 0 ? '+' : ''}{peakDiff}%</span>
          </div>
        )}
        {fastest && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Fastest Growing</span>
            <span className="re-kpi-value">{fastest.cc}</span>
            <span className="re-kpi-sub">+{fastest.growth}% YoY</span>
          </div>
        )}
        {salesLatest != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Existing Sales</span>
            <span className="re-kpi-value">{(salesLatest / 1000).toFixed(2)}M</span>
            {salesYoy != null && <span className={`re-kpi-sub ${salesYoy >= 0 ? 'positive' : 'negative'}`}>{salesYoy > 0 ? '+' : ''}{salesYoy}% YoY</span>}
          </div>
        )}
        {startsLatest != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Housing Starts</span>
            <span className="re-kpi-value">{(startsLatest / 1000).toFixed(2)}M</span>
          </div>
        )}
        {permitsLatest != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Permits</span>
            <span className="re-kpi-value">{(permitsLatest / 1000).toFixed(2)}M</span>
          </div>
        )}
      </div>

      <div className="re-wide-narrow">
        <div className="re-chart-panel">
          <div className="re-chart-title">Global House Price Indices (BIS)</div>
          <div className="re-mini-chart">
            <ReactECharts option={bisOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="re-chart-panel">
          <div className="re-chart-title">US Metro Indices (Case-Shiller)</div>
          {metroEntries.length > 0 ? (
            <div className="re-metro-list" style={{ padding: '8px 0' }}>
              {metroEntries.sort((a, b) => b[1].latest - a[1].latest).map(([name, m]) => (
                <div key={name} className="re-metro-row">
                  <span className="re-metro-name">{name}</span>
                  <div className="re-metro-bar">
                    <div className="re-metro-bar-fill" style={{ width: `${(m.latest / maxMetroVal) * 100}%` }} />
                  </div>
                  <span className="re-metro-val">{m.latest}</span>
                  <span className={`re-metro-yoy ${m.yoy >= 0 ? 'positive' : 'negative'}`}>
                    {m.yoy > 0 ? '+' : ''}{m.yoy}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textDim, fontSize: 11 }}>
              Metro data not available
            </div>
          )}
        </div>
      </div>

      {csOption && (
        <div className="re-chart-panel" style={{ marginTop: 12, height: 140, flexShrink: 0 }}>
          <div className="re-chart-title">Case-Shiller National Home Price Index</div>
          <div className="re-mini-chart">
            <ReactECharts option={csOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      {startsOption && (
        <div className="re-chart-panel" style={{ marginTop: 8, height: 150, flexShrink: 0 }}>
          <div className="re-chart-title">Housing Starts &amp; Building Permits (24-Month)</div>
          <div className="re-mini-chart">
            <ReactECharts option={startsOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      {salesOption && (
        <div className="re-chart-panel" style={{ marginTop: 8, height: 140, flexShrink: 0 }}>
          <div className="re-chart-title">Existing Home Sales (24-Month)</div>
          <div className="re-mini-chart">
            <ReactECharts option={salesOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="re-panel-footer">
        BIS Index base = 100 · Source: national statistical agencies + S&P CoreLogic Case-Shiller
      </div>
    </div>
  );
}
