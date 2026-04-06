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
    animation: false,
    backgroundColor: 'transparent',
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

export default function AffordabilityMap({ affordabilityData, mortgageRates }) {
  const { colors } = useTheme();
  if (!affordabilityData) return null;
  const { current, history = [] } = affordabilityData;
  const historyOption = useMemo(() => history.length >= 2 ? buildHistoryOption(history, colors) : null, [history, colors]);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">US Housing Affordability</span>
        <span className="re-panel-subtitle">FRED · Median home price vs median household income · national metrics</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: colors.textMuted }}>Median Home Price</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>${current.medianPrice?.toLocaleString()}</div>
                {current.yoyChange != null && (
                  <div style={{ fontSize: 10, color: current.yoyChange >= 0 ? '#34d399' : '#f87171' }}>
                    {current.yoyChange >= 0 ? '+' : ''}{current.yoyChange}% YoY
                  </div>
                )}
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: colors.textMuted }}>Median Household Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>${current.medianIncome?.toLocaleString()}</div>
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: colors.textMuted }}>Price-to-Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ptiColor(current.priceToIncome), fontFamily: 'monospace' }}>{current.priceToIncome}×</div>
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: colors.textMuted }}>Mortgage / Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: current.mortgageToIncome > 30 ? '#f87171' : '#34d399', fontFamily: 'monospace' }}>{current.mortgageToIncome}%</div>
                <div style={{ fontSize: 9, color: colors.textDim }}>80% LTV · 30yr @ {current.rate30y}%</div>
              </div>
            </div>
          </div>
          <div className="re-chart-panel">
            {historyOption ? (
              <>
                <div className="re-chart-title">Median Home Price + Price/Income Trend</div>
                <div className="re-chart-wrap">
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
      <div className="re-panel-footer">
        Red ≥ 8× · Orange ≥ 6× · Yellow ≥ 4× · Green &lt; 4× · Mortgage/Income = annual payment as % of gross income
      </div>
    </div>
  );
}
