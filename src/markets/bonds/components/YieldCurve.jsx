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

export default function YieldCurve({ yieldCurveData, spreadIndicators }) {
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

  const countryCount = Object.keys(yieldCurveData).length;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Yield Curve</span>
        <span className="bonds-panel-subtitle">{countryCount} countries · sovereign benchmark rates</span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {spreadIndicators && (
        <div className="yc-indicators">
          <div className={`yc-pill ${spreadIndicators.t10y2y >= 0 ? 'yc-pill-pos' : 'yc-pill-neg'}`}>
            <span className="yc-pill-label">10Y−2Y</span>
            <span className="yc-pill-value">{spreadIndicators.t10y2y?.toFixed(2)}%</span>
          </div>
          <div className={`yc-pill ${spreadIndicators.t10y3m >= 0 ? 'yc-pill-pos' : 'yc-pill-neg'}`}>
            <span className="yc-pill-label">10Y−3M</span>
            <span className="yc-pill-value">{spreadIndicators.t10y3m?.toFixed(2)}%</span>
          </div>
          <div className="yc-pill">
            <span className="yc-pill-label">5Y Breakeven</span>
            <span className="yc-pill-value">{spreadIndicators.t5yie?.toFixed(2)}%</span>
          </div>
          <div className="yc-pill">
            <span className="yc-pill-label">10Y Breakeven</span>
            <span className="yc-pill-value">{spreadIndicators.t10yie?.toFixed(2)}%</span>
          </div>
          <div className="yc-pill">
            <span className="yc-pill-label">TIPS 10Y Real</span>
            <span className="yc-pill-value">{spreadIndicators.dfii10?.toFixed(2)}%</span>
          </div>
        </div>
      )}
      <div className="bonds-panel-footer">
        X-axis: 3m → 30y · Y-axis: yield % · Hover for details
      </div>
    </div>
  );
}
