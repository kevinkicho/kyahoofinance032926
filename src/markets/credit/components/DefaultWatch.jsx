// src/markets/credit/components/DefaultWatch.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './CreditComponents.css';

function buildDelinquencyOption(delinquencyRates, colors) {
  const { dates = [], commercial = [], allLoans = [] } = delinquencyRates || {};
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>')}`,
    },
    legend: { data: ['Commercial RE', 'All Loans'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'Commercial RE', type: 'line', data: commercial, lineStyle: { color: '#f87171', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f87171' } },
      { name: 'All Loans',     type: 'line', data: allLoans,   lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f59e0b' } },
    ],
  };
}

function buildLendingStandardsOption(lendingStandards, colors) {
  const { dates = [], values = [] } = lendingStandards || {};
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}: ${params[0].value?.toFixed(1)}% net tightening`,
    },
    grid: { top: 16, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'bar',
      data: values.map(v => ({
        value: v,
        itemStyle: { color: v >= 0 ? '#f87171' : '#34d399' },
      })),
      barMaxWidth: 32,
    }],
  };
}

function buildDefaultHistoryOption(defaultHistory, colors) {
  const { dates = [], hy = [], loan = [] } = defaultHistory;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(1)}%`).join('<br/>')}`,
    },
    legend: { data: ['HY Default','Loan Default'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'HY Default',   type: 'line', data: hy,   lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f59e0b' } },
      { name: 'Loan Default', type: 'line', data: loan, lineStyle: { color: '#06b6d4', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#06b6d4' } },
    ],
  };
}

function buildChargeoffOption(chargeoffs, colors) {
  const { dates = [], commercial = [], consumer = [] } = chargeoffs;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>')}`,
    },
    legend: { data: ['C&I Loans','Consumer'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'C&I Loans', type: 'line', data: commercial, lineStyle: { color: '#818cf8', width: 2 }, areaStyle: { color: 'rgba(129,140,248,0.1)' }, symbol: 'none' },
      { name: 'Consumer',  type: 'line', data: consumer,   lineStyle: { color: '#f87171', width: 2 }, areaStyle: { color: 'rgba(248,113,113,0.1)' }, symbol: 'none' },
    ],
  };
}

export default function DefaultWatch({ defaultData, delinquencyRates, lendingStandards }) {
  if (!defaultData) return null;
  const { colors } = useTheme();
  const { rates = [], chargeoffs = { dates:[], commercial:[], consumer:[] }, defaultHistory = { dates:[], hy:[], loan:[] } } = defaultData;

  const kpis = useMemo(() => {
    const hyRate       = defaultHistory.hy?.length   ? defaultHistory.hy[defaultHistory.hy.length - 1]     : null;
    const loanRate     = defaultHistory.loan?.length  ? defaultHistory.loan[defaultHistory.loan.length - 1] : null;
    const consumerCO   = chargeoffs.consumer?.length  ? chargeoffs.consumer[chargeoffs.consumer.length - 1] : null;
    const deteriorating = rates.filter(r => r.value > r.prev).length;
    return { hyRate, loanRate, consumerCO, deteriorating };
  }, [rates, chargeoffs, defaultHistory]);

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">Default Watch</span>
        <span className="credit-panel-subtitle">HY/loan default rates · bank charge-offs · distressed ratios · FRED / Moody's</span>
      </div>
      <div className="credit-kpi-strip">
        <div className="credit-kpi-pill">
          <span className="credit-kpi-label">HY Default Rate</span>
          <span className="credit-kpi-value accent">{kpis.hyRate != null ? `${kpis.hyRate.toFixed(1)}%` : '—'}</span>
        </div>
        <div className="credit-kpi-pill">
          <span className="credit-kpi-label">Loan Default Rate</span>
          <span className="credit-kpi-value">{kpis.loanRate != null ? `${kpis.loanRate.toFixed(1)}%` : '—'}</span>
        </div>
        <div className="credit-kpi-pill">
          <span className="credit-kpi-label">Consumer Chargeoff</span>
          <span className="credit-kpi-value">{kpis.consumerCO != null ? `${kpis.consumerCO.toFixed(2)}%` : '—'}</span>
        </div>
        <div className="credit-kpi-pill">
          <span className="credit-kpi-label"># Deteriorating</span>
          <span className="credit-kpi-value">{kpis.deteriorating}</span>
        </div>
      </div>
      {(delinquencyRates || lendingStandards) && (
        <div className="credit-two-col" style={{ marginBottom: 0 }}>
          {delinquencyRates && (
            <div className="credit-chart-panel">
              <div className="credit-chart-title">Delinquency Rates</div>
              <div className="credit-chart-subtitle">FRED quarterly · commercial RE (red) · all loans (amber) · % past-due</div>
              <div className="credit-chart-wrap">
                <SafeECharts option={buildDelinquencyOption(delinquencyRates, colors)} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}
          {lendingStandards && (
            <div className="credit-chart-panel">
              <div className="credit-chart-title">Lending Standards (C&amp;I)</div>
              <div className="credit-chart-subtitle">Net % of banks tightening C&amp;I loan standards · red = tightening · green = easing</div>
              <div className="credit-chart-wrap">
                <SafeECharts option={buildLendingStandardsOption(lendingStandards, colors)} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      )}
      <div className="credit-two-col">
        <div className="credit-two-row">
          <div className="credit-chart-panel">
            <div className="credit-chart-title">Default Rate Trend</div>
            <div className="credit-chart-subtitle">HY bond & leveraged loan TTM default rates (%) — amber = HY · cyan = loans</div>
            <div className="credit-chart-wrap">
              <SafeECharts option={buildDefaultHistoryOption(defaultHistory, colors)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="credit-chart-panel">
            <div className="credit-chart-title">Bank Charge-Off Rates</div>
            <div className="credit-chart-subtitle">FRED quarterly charge-off rates (%) — commercial & consumer loans · DRALACBN / DRSFRMACBS</div>
            <div className="credit-chart-wrap">
              <SafeECharts option={buildChargeoffOption(chargeoffs, colors)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
        <div className="credit-chart-panel">
          <div className="credit-chart-title">Distressed Debt Indicators</div>
          <div className="credit-chart-subtitle">Current reading · prior period · cycle peak — rising = deterioration</div>
          <div className="credit-scroll">
            <table className="credit-table">
              <thead>
                <tr>
                  <th className="credit-th" style={{ textAlign:'left' }}>Indicator</th>
                  <th className="credit-th">Current</th>
                  <th className="credit-th">Prior</th>
                  <th className="credit-th">Cycle Peak</th>
                  <th className="credit-th">vs Peak</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => {
                  const vsPeak = r.peak != null ? ((r.value / r.peak) * 100).toFixed(0) : null;
                  const cls = r.value > r.prev ? 'credit-neg' : r.value < r.prev ? 'credit-pos' : 'credit-neu';
                  return (
                    <tr key={r.category} className="credit-row">
                      <td className="credit-cell">{r.category}</td>
                      <td className={`credit-cell credit-num ${cls}`}><strong>{r.value}{r.unit}</strong></td>
                      <td className="credit-cell credit-num credit-muted">{r.prev}{r.unit}</td>
                      <td className="credit-cell credit-num credit-muted">{r.peak}{r.unit}</td>
                      <td className="credit-cell credit-num credit-muted">{vsPeak ? `${vsPeak}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
