import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './EquityComponents.css';

function buildInFavorOption(inFavor, colors) {
  const factors = [
    { name: 'Low-Vol',  value: inFavor.lowVol    ?? 0 },
    { name: 'Quality',  value: inFavor.quality   ?? 0 },
    { name: 'Value',    value: inFavor.value      ?? 0 },
    { name: 'Momentum', value: inFavor.momentum   ?? 0 },
  ];
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
      data: factors.map(f => f.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: factors.map(f => ({
        value: f.value,
        itemStyle: { color: f.value >= 0 ? '#6366f1' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

function factorHeat(score) {
  if (score == null || Number.isNaN(score)) return 'eq-heat-neu';
  if (score >= 70) return 'eq-heat-dg';
  if (score >= 50) return 'eq-heat-lg';
  if (score >= 30) return 'eq-heat-neu';
  if (score >= 15) return 'eq-heat-lr';
  return 'eq-heat-dr';
}

export default function FactorRankings({ factorData }) {
  const { colors } = useTheme();
  const { inFavor = {}, stocks = [] } = factorData ?? {};

  const inFavorOption = useMemo(() => buildInFavorOption(inFavor, colors), [inFavor, colors]);

  const kpis = useMemo(() => {
    if (!stocks.length) return null;
    const factors = [
      { name: 'Momentum', val: inFavor.momentum ?? 0 },
      { name: 'Value', val: inFavor.value ?? 0 },
      { name: 'Quality', val: inFavor.quality ?? 0 },
      { name: 'Low-Vol', val: inFavor.lowVol ?? 0 },
    ];
    const topFactor = factors.reduce((a, b) => a.val > b.val ? a : b);
    const topStock = stocks.reduce((a, b) => (a.composite ?? 0) > (b.composite ?? 0) ? a : b);
    const avgComposite = stocks.reduce((s, st) => s + (st.composite ?? 0), 0) / stocks.length;
    const highQuality = stocks.filter(s => (s.quality ?? 0) >= 70).length;
    return { topFactor, topStock, avgComposite, highQuality };
  }, [inFavor, stocks]);

  if (!factorData) return null;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Factor Rankings</span>
        <span className="eq-panel-subtitle">Percentile scores 1–100 · composite = average of 4 factors</span>
      </div>
      {/* KPI Strip */}
      {kpis && (
        <div className="eq-kpi-strip">
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Top Factor</span>
            <span className="eq-kpi-value accent">{kpis.topFactor.name}</span>
            <span className="eq-kpi-sub">{kpis.topFactor.val >= 0 ? '+' : ''}{kpis.topFactor.val.toFixed(1)}%</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Top Stock</span>
            <span className="eq-kpi-value accent">{kpis.topStock.ticker}</span>
            <span className="eq-kpi-sub">Composite {kpis.topStock.composite}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Avg Composite</span>
            <span className="eq-kpi-value accent">{kpis.avgComposite.toFixed(0)}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">{`Quality \u2265 70`}</span>
            <span className="eq-kpi-value accent">{kpis.highQuality}</span>
            <span className="eq-kpi-sub">of {stocks.length}</span>
          </div>
        </div>
      )}
      <div className="eq-two-row">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Factor In Favor</div>
          <div className="eq-chart-subtitle">Month-to-date factor return · indigo = positive · which factor is working</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={inFavorOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Stock Factor Scores</div>
          <div className="eq-chart-subtitle">Top 20 stocks by composite · green ≥ 70 · red ≤ 30</div>
          <div className="eq-scroll">
            <table className="eq-table">
              <thead>
                <tr>
                  <th className="eq-th">Ticker</th>
                  <th className="eq-th">Sector</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Value</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Momentum</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Quality</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Low-Vol</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Composite</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => (
                  <tr key={s.ticker} className="eq-row">
                    <td className="eq-cell"><strong>{s.ticker}</strong></td>
                    <td className="eq-cell eq-sector">{s.sector}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.value)}`}>{s.value}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.momentum)}`}>{s.momentum}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.quality)}`}>{s.quality}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.lowVol)}`}>{s.lowVol}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.composite)}`}><strong>{s.composite}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
