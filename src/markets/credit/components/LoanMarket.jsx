// src/markets/credit/components/LoanMarket.jsx
import React from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './CreditComponents.css';

function trancheColor(tranche) {
  const t = tranche?.toUpperCase();
  if (t === 'AAA') return '#06b6d4';
  if (t === 'AA')  return '#38bdf8';
  if (t === 'A')   return '#818cf8';
  if (t === 'BBB') return '#a78bfa';
  if (t === 'BB')  return '#f59e0b';
  if (t === 'B')   return '#fb923c';
  return '#f87171'; // Equity / NR
}

function buildCloOption(tranches, colors) {
  const withSpread = tranches.filter(t => t.spread != null);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].name}: ${params[0].value}bps spread · ${tranches.find(t=>t.tranche===params[0].name)?.yield?.toFixed(1)}% yield`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: withSpread.map(t => t.tranche),
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}bps` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'bar',
      data: withSpread.map(t => ({ value: t.spread, itemStyle: { color: trancheColor(t.tranche) } })),
      label: { show: true, position: 'top', formatter: p => `${p.value}`, color: colors.textSecondary, fontSize: 9 },
      barMaxWidth: 48,
    }],
  };
}

function buildExcessReservesOption(excessReserves, colors) {
  const { dates = [], values = [] } = excessReserves || {};
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}: $${(params[0].value / 1000).toFixed(2)}T`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9, interval: Math.floor(dates.length / 5) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${(v / 1000).toFixed(1)}T` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: values,
      lineStyle: { color: '#818cf8', width: 2 },
      areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[{offset:0,color:'rgba(129,140,248,0.25)'},{offset:1,color:'rgba(129,140,248,0.02)'}] } },
      symbol: 'none', itemStyle: { color: '#818cf8' },
    }],
  };
}

function buildBklnOption(priceHistory, colors) {
  const { dates = [], bkln = [] } = priceHistory;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}: $${params[0].value?.toFixed(2)}`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v.toFixed(1)}` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: bkln,
      lineStyle: { color: '#06b6d4', width: 2 },
      areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[{offset:0,color:'rgba(6,182,212,0.25)'},{offset:1,color:'rgba(6,182,212,0.02)'}] } },
      symbol: 'circle', symbolSize: 4, itemStyle: { color: '#06b6d4' },
    }],
  };
}

export default function LoanMarket({ loanData, excessReserves, lastUpdated }) {
  if (!loanData) return null;
  const { colors } = useTheme();
  const { cloTranches = [], indices = [], priceHistory = { dates: [], bkln: [] } } = loanData;

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">Loan Market</span>
        <span className="credit-panel-subtitle">Leveraged loans · CLO tranches · BKLN ETF proxy · Invesco / LCD</span>
      </div>
      <div className="credit-stats-row">
        {indices.map(idx => (
          <div key={idx.name} className="credit-stat-pill">
            <span className="credit-stat-label">{idx.name}</span>
            <span className="credit-stat-value">{idx.value != null ? (idx.spread != null ? `${idx.spread}bps` : idx.value.toFixed(idx.value > 100 ? 0 : 2)) : '—'}</span>
          </div>
        ))}
      </div>
      <div className="credit-two-col">
        <div className="credit-chart-panel">
          <div className="credit-chart-title">CLO Tranche Spreads</div>
          <div className="credit-chart-subtitle">AAA → Equity waterfall · OAS spread (bps) by tranche rating</div>
          <div className="credit-chart-wrap">
            <SafeECharts option={buildCloOption(cloTranches, colors)} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'CLO Tranche Spreads', source: 'LCD / Yahoo Finance', endpoint: '/api/credit', series: [] }} />
          </div>
        </div>
        <div className="credit-two-row">
          <div className="credit-chart-panel">
            <div className="credit-chart-title">BKLN Price (6-Month)</div>
            <div className="credit-chart-subtitle">Invesco Senior Loan ETF — floating-rate leveraged loan proxy</div>
            <div className="credit-chart-wrap">
              <SafeECharts option={buildBklnOption(priceHistory, colors)} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'BKLN Price (6-Month)', source: 'Yahoo Finance', endpoint: '/api/credit', series: [] }} />
            </div>
          </div>
          {excessReserves?.dates?.length >= 2 && (
            <div className="credit-chart-panel">
              <div className="credit-chart-title">Excess Reserves (3-Year)</div>
              <div className="credit-chart-subtitle">FRED · bank excess reserves held at Fed ($B) · EXCSRESNW</div>
              <div className="credit-chart-wrap">
                <SafeECharts option={buildExcessReservesOption(excessReserves, colors)} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Excess Reserves (3-Year)', source: 'FRED', endpoint: '/api/credit', series: [{ id: 'EXCSRESNW' }] }} />
              </div>
            </div>
          )}
          <div className="credit-chart-panel">
            <div className="credit-chart-title">CLO Tranche Details</div>
            <div className="credit-chart-subtitle">Tranche · rating · spread (bps) · yield · attachment (LTV)</div>
            <div className="credit-scroll">
              <table className="credit-table">
                <thead>
                  <tr>
                    <th className="credit-th" style={{ textAlign:'left' }}>Tranche</th>
                    <th className="credit-th" style={{ textAlign:'center' }}>Rating</th>
                    <th className="credit-th">Spread</th>
                    <th className="credit-th">Yield</th>
                    <th className="credit-th">LTV</th>
                  </tr>
                </thead>
                <tbody>
                  {cloTranches.map(t => (
                    <tr key={t.tranche} className="credit-row">
                      <td className="credit-cell"><strong style={{ color: trancheColor(t.tranche) }}>{t.tranche}</strong></td>
                      <td className="credit-cell" style={{ textAlign:'center' }}>
                        <span className={`credit-rating-badge ${t.rating === 'NR' ? 'credit-rating-nr' : t.rating?.startsWith('A') || t.rating?.startsWith('BBB') ? 'credit-rating-ig' : 'credit-rating-hy'}`}>{t.rating}</span>
                      </td>
                      <td className="credit-cell credit-num"><MetricValue value={t.spread} seriesKey="cloSpread" timestamp={lastUpdated} format={v => v != null ? `${v}bps` : '—'} /></td>
                      <td className="credit-cell credit-num"><MetricValue value={t.yield} seriesKey="cloYield" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></td>
                      <td className="credit-cell credit-num"><MetricValue value={t.ltv} seriesKey="cloLtv" timestamp={lastUpdated} format={v => v != null ? `${v}%` : '—'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
