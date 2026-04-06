// src/markets/realEstate/components/AffordabilityMap.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

function ptiColor(pti) {
  if (pti >= 8) return '#ef4444';
  if (pti >= 6) return '#f97316';
  if (pti >= 4) return '#facc15';
  return '#22c55e';
}

function buildHistoryOption(history, colors) {
  const dates = history.map(h => h.date.slice(0, 7));
  const prices = history.map(h => h.medianPrice / 1000);
  const ptis = history.map(h => h.priceToIncome);
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>Median Price: $${(params[0]?.value * 1000)?.toLocaleString()}<br/>Price/Income: ${params[1]?.value}×`,
    },
    legend: { data: ['Price ($K)', 'Price/Income'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 50, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: [
      { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}K` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}×` }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Price ($K)', type: 'bar', data: prices, yAxisIndex: 0, itemStyle: { color: '#f97316' }, barMaxWidth: 20 },
      { name: 'Price/Income', type: 'line', data: ptis, yAxisIndex: 1, lineStyle: { color: '#6366f1', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#6366f1' } },
    ],
  };
}

function buildMedianPriceOption(medianHomePrice, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>Median Price: <b>$${Number(p[0].value).toLocaleString()}</b>`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: medianHomePrice.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(medianHomePrice.dates.length / 6) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${(v / 1000).toFixed(0)}K` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: medianHomePrice.values, symbol: 'none',
      lineStyle: { color: '#34d399', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(52,211,153,0.25)' }, { offset: 1, color: 'rgba(52,211,153,0)' }] } },
    }],
  };
}

function buildSupplyOption(supplyData, colors) {
  const dates = supplyData.housingStarts.dates;
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: { data: ['Housing Starts', 'Building Permits'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${(v / 1000).toFixed(1)}M` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'Housing Starts', type: 'line', data: supplyData.housingStarts.values, symbol: 'none', lineStyle: { color: '#60a5fa', width: 2 }, itemStyle: { color: '#60a5fa' } },
      { name: 'Building Permits', type: 'line', data: supplyData.permits.values, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2 }, itemStyle: { color: '#a78bfa' } },
    ],
  };
}

export default function AffordabilityMap({ affordabilityData, mortgageRates, supplyData, medianHomePrice, rentalVacancy }) {
  const { colors } = useTheme();
  if (!affordabilityData) return null;
  const { current, history = [] } = affordabilityData;
  const historyOption = useMemo(() => history.length >= 2 ? buildHistoryOption(history, colors) : null, [history, colors]);
  const supplyOption = useMemo(() => supplyData?.housingStarts?.values?.length >= 4 ? buildSupplyOption(supplyData, colors) : null, [supplyData, colors]);
  const medianPriceOption = useMemo(() => medianHomePrice?.dates?.length >= 4 ? buildMedianPriceOption(medianHomePrice, colors) : null, [medianHomePrice, colors]);

  const startsLatest = supplyData?.housingStarts?.values?.at(-1);
  const permitsLatest = supplyData?.permits?.values?.at(-1);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">US Housing Affordability</span>
        <span className="re-panel-subtitle">FRED · Median home price vs median household income + supply indicators</span>
      </div>

      {mortgageRates && (
        <div className="afford-mortgage-banner">
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">30-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate30y.toFixed(2)}%</span>
          </div>
          <div className="afford-mortgage-divider" />
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">15-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate15y.toFixed(2)}%</span>
          </div>
          <span className="afford-mortgage-source">FRED · as of {mortgageRates.asOf}</span>
        </div>
      )}

      {current && (
        <div className="re-two-col">
          <div className="re-chart-panel" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Median Home Price</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>${current.medianPrice?.toLocaleString()}</div>
                {current.yoyChange != null && (
                  <div style={{ fontSize: 10, color: current.yoyChange >= 0 ? '#22c55e' : '#ef4444' }}>
                    {current.yoyChange >= 0 ? '+' : ''}{current.yoyChange}% YoY
                  </div>
                )}
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Median Household Income</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>${current.medianIncome?.toLocaleString()}</div>
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Price-to-Income</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: ptiColor(current.priceToIncome), fontFamily: 'monospace' }}>{current.priceToIncome}×</div>
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Mortgage / Income</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: current.mortgageToIncome > 30 ? '#ef4444' : '#22c55e', fontFamily: 'monospace' }}>{current.mortgageToIncome}%</div>
                <div style={{ fontSize: 9, color: colors.textDim }}>80% LTV · 30yr @ {current.rate30y}%</div>
              </div>
            </div>
            {/* Supply indicators below */}
            {supplyData && (
              <div className="re-supply-grid" style={{ marginTop: 8 }}>
                {startsLatest != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Housing Starts</div>
                    <div className="re-supply-value">{(startsLatest / 1000).toFixed(2)}M</div>
                  </div>
                )}
                {permitsLatest != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Building Permits</div>
                    <div className="re-supply-value">{(permitsLatest / 1000).toFixed(2)}M</div>
                  </div>
                )}
                {supplyData.monthsSupply != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Months Supply</div>
                    <div className="re-supply-value">{supplyData.monthsSupply}</div>
                  </div>
                )}
                {supplyData.activeListings != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Active Listings</div>
                    <div className="re-supply-value">{(supplyData.activeListings / 1e6).toFixed(2)}M</div>
                  </div>
                )}
                {rentalVacancy != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Rental Vacancy</div>
                    <div className="re-supply-value" style={{ color: rentalVacancy < 5 ? '#ef4444' : rentalVacancy < 7 ? '#f97316' : '#22c55e' }}>{rentalVacancy.toFixed(1)}%</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="re-chart-panel">
            {historyOption ? (
              <>
                <div className="re-chart-title">Median Home Price + Price/Income Trend</div>
                <div className="re-mini-chart">
                  <ReactECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textDim, fontSize: 11 }}>
                History data not available
              </div>
            )}
          </div>
        </div>
      )}

      {supplyOption && (
        <div className="re-chart-panel" style={{ marginTop: 8, height: 150, flexShrink: 0 }}>
          <div className="re-chart-title">Housing Starts + Building Permits Trend</div>
          <div className="re-mini-chart">
            <ReactECharts option={supplyOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      {medianPriceOption && (
        <div className="re-chart-panel" style={{ marginTop: 8, height: 150, flexShrink: 0 }}>
          <div className="re-chart-title">Median Home Sale Price (24-Month)</div>
          <div className="re-mini-chart">
            <ReactECharts option={medianPriceOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="re-panel-footer">
        Red ≥ 8× · Orange ≥ 6× · Yellow ≥ 4× · Green &lt; 4× · Mortgage/Income = annual payment as % of gross income
      </div>
    </div>
  );
}
