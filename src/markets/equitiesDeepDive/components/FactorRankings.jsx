import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './EquitiesDeepDiveDashboard.css';

function buildInFavorOption(inFavor, stocks, colors) {
  const factors = [
    { name: 'Low-Vol',  key: 'lowVol',   value: inFavor.lowVol    ?? 0 },
    { name: 'Quality',  key: 'quality',  value: inFavor.quality   ?? 0 },
    { name: 'Value',    key: 'value',    value: inFavor.value      ?? 0 },
    { name: 'Momentum', key: 'momentum', value: inFavor.momentum   ?? 0 },
  ];
  const topByFactor = {};
  factors.forEach(f => {
    let best = null;
    (stocks || []).forEach(s => {
      if (s[f.key] != null && (best == null || s[f.key] > best[f.key])) best = s;
    });
    topByFactor[f.key] = best;
  });
  const nameToKey = {};
  factors.forEach(f => { nameToKey[f.name] = f.key; });
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const base = `${params[0].name}: ${params[0].value?.toFixed(1)}%`;
        const key = nameToKey[params[0].name];
        const top = key ? topByFactor[key] : null;
        if (!top) return base;
        return `${base} · Top ${top.ticker}${top.name ? ` (${top.name})` : ''} ${top[key].toFixed(0)}`;
      },
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

function breadthSignal(divergence) {
  if (divergence == null) return { label: 'N/A', color: '#6b7280' };
  if (divergence > 2)    return { label: 'Narrow breadth (top-heavy)', color: '#ef4444' };
  if (divergence < -2)   return { label: 'Broad breadth', color: '#22c55e' };
  return { label: 'Neutral', color: '#f59e0b' };
}

export default function FactorRankings({ factorData, breadthDivergence, equityRiskPremium }) {
  const { colors } = useTheme();
  const { inFavor = {}, stocks = [] } = factorData ?? {};

  const inFavorOption = useMemo(() => buildInFavorOption(inFavor, stocks, colors), [inFavor, stocks, colors]);

  const kpis = useMemo(() => {
    if (!stocks.length) return null;
    const factors = [
      { name: 'Momentum', key: 'momentum', val: inFavor.momentum ?? 0 },
      { name: 'Value',    key: 'value',    val: inFavor.value ?? 0 },
      { name: 'Quality',  key: 'quality',  val: inFavor.quality ?? 0 },
      { name: 'Low-Vol',   key: 'lowVol',   val: inFavor.lowVol ?? 0 },
    ];
    const topFactor = factors.reduce((a, b) => a.val > b.val ? a : b);
    const topFactorStock = topFactor.key ? stocks
      .filter(s => s[topFactor.key] != null)
      .sort((a, b) => (b[topFactor.key] ?? 0) - (a[topFactor.key] ?? 0))[0] || null : null;
    const topStock = stocks.reduce((a, b) => (a.composite ?? 0) > (b.composite ?? 0) ? a : b);
    const avgComposite = stocks.reduce((s, st) => s + (st.composite ?? 0), 0) / stocks.length;
    const highQuality = stocks.filter(s => (s.quality ?? 0) >= 70).length;
    const topQualityStock = stocks
      .filter(s => (s.quality ?? 0) >= 70)
      .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))[0] || null;
    return { topFactor, topFactorStock, topStock, avgComposite, highQuality, topQualityStock };
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
            <span className="eq-kpi-sub">{kpis.topFactor.val >= 0 ? '+' : ''}{kpis.topFactor.val.toFixed(1)}%{kpis.topFactorStock ? ` · Top ${kpis.topFactorStock.ticker}${kpis.topFactorStock.name ? ` (${kpis.topFactorStock.name})` : ''} ${kpis.topFactorStock[kpis.topFactor.key]?.toFixed(0)}` : ''}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Top Stock</span>
            <span className="eq-kpi-value accent">{kpis.topStock.ticker}</span>
            <span className="eq-kpi-sub">{kpis.topStock.name ? `${kpis.topStock.name} · ` : ''}{kpis.topStock.sector ? `${kpis.topStock.sector} · ` : ''}Composite {kpis.topStock.composite}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Avg Composite</span>
            <span className="eq-kpi-value accent">{kpis.avgComposite.toFixed(0)}</span>
            <span className="eq-kpi-sub">{kpis.topStock ? `Top: ${kpis.topStock.ticker} (${kpis.topStock.composite})` : ''}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">{`Quality \u2265 70`}</span>
            <span className="eq-kpi-value accent">{kpis.highQuality}</span>
            <span className="eq-kpi-sub">of {stocks.length}{stocks.length > 0 ? ` · ${Math.round(kpis.highQuality / stocks.length * 100)}%` : ''}{kpis.topQualityStock ? ` · Top: ${kpis.topQualityStock.ticker} ${kpis.topQualityStock.quality?.toFixed(0)}` : ''}</span>
          </div>
        </div>
      )}
      {/* Breadth Divergence */}
      {breadthDivergence && (() => {
        const signal = breadthSignal(breadthDivergence.divergence);
        return (
          <div style={{ marginBottom: '12px' }}>
            <div className="eq-chart-title" style={{ marginBottom: '6px' }}>Breadth Divergence</div>
            <div className="eq-kpi-strip">
              <div className="eq-kpi-pill">
                <span className="eq-kpi-label">SPY 1M</span>
                <span className={`eq-kpi-value ${(breadthDivergence.spy1m ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(breadthDivergence.spy1m ?? 0) >= 0 ? '+' : ''}{breadthDivergence.spy1m?.toFixed(2)}%
                </span>
              </div>
              <div className="eq-kpi-pill">
                <span className="eq-kpi-label">RSP 1M</span>
                <span className={`eq-kpi-value ${(breadthDivergence.rsp1m ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(breadthDivergence.rsp1m ?? 0) >= 0 ? '+' : ''}{breadthDivergence.rsp1m?.toFixed(2)}%
                </span>
              </div>
              <div className="eq-kpi-pill">
                <span className="eq-kpi-label">Divergence</span>
                <span className="eq-kpi-value" style={{ color: signal.color }}>
                  {(breadthDivergence.divergence ?? 0) >= 0 ? '+' : ''}{breadthDivergence.divergence?.toFixed(2)}%
                </span>
                <span className="eq-kpi-sub" style={{ color: signal.color }}>{signal.label}</span>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Equity Risk Premium */}
      {equityRiskPremium && (
        <div style={{ marginBottom: '12px' }}>
          <div className="eq-chart-title" style={{ marginBottom: '6px' }}>Equity Risk Premium</div>
          <div className="eq-kpi-strip">
            <div className="eq-kpi-pill">
              <span className="eq-kpi-label">Earnings Yield</span>
              <span className="eq-kpi-value accent">{equityRiskPremium.earningsYield?.toFixed(2)}%</span>
              <span className="eq-kpi-sub">1 / P/E</span>
            </div>
            <div className="eq-kpi-pill">
              <span className="eq-kpi-label">10Y Treasury</span>
              <span className="eq-kpi-value accent">{equityRiskPremium.treasury10y?.toFixed(2)}%</span>
              <span className="eq-kpi-sub">Risk-free rate</span>
            </div>
            <div className="eq-kpi-pill">
              <span className="eq-kpi-label">ERP</span>
              <span className="eq-kpi-value" style={{ color: equityRiskPremium.erp > 3 ? '#22c55e' : equityRiskPremium.erp >= 1 ? '#f59e0b' : '#ef4444' }}>
                {equityRiskPremium.erp?.toFixed(2)}%
              </span>
              <span className="eq-kpi-sub">Earnings yield − 10Y</span>
            </div>
          </div>
        </div>
      )}
      <div className="eq-two-row">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Factor In Favor</div>
          <div className="eq-chart-subtitle">Month-to-date factor return · indigo = positive · which factor is working</div>
          <div className="eq-chart-wrap">
            <SafeECharts option={inFavorOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Factor In Favor', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [] }} />
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
                  <th className="eq-th">Company</th>
                  <th className="eq-th">Sector</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Value</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Momentum</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Quality</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Low-Vol</th>
                  <th className="eq-th" style={{ textAlign: 'center' }}>Composite</th>
                </tr>
              </thead>
              <tbody>
                {[...stocks].sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0)).map(s => (
                  <tr key={s.ticker} className="eq-row">
                    <td className="eq-cell"><strong>{s.ticker}</strong></td>
                    <td className="eq-cell eq-name">{s.name || '—'}</td>
                    <td className="eq-cell eq-sector">{s.sector}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.value)}`}><MetricValue value={s.value} seriesKey="factorValue" format={v => v != null ? v.toFixed(1) : '—'} /></td>
                    <td className={`eq-cell eq-score ${factorHeat(s.momentum)}`}><MetricValue value={s.momentum} seriesKey="factorMomentum" format={v => v != null ? v.toFixed(1) : '—'} /></td>
                    <td className={`eq-cell eq-score ${factorHeat(s.quality)}`}><MetricValue value={s.quality} seriesKey="factorQuality" format={v => v != null ? v.toFixed(1) : '—'} /></td>
                    <td className={`eq-cell eq-score ${factorHeat(s.lowVol)}`}><MetricValue value={s.lowVol} seriesKey="factorLowVol" format={v => v != null ? v.toFixed(1) : '—'} /></td>
                    <td className={`eq-cell eq-score ${factorHeat(s.composite)}`}><strong><MetricValue value={s.composite} seriesKey="factorComposite" format={v => v != null ? v.toFixed(1) : '—'} /></strong></td>
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
