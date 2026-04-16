// src/markets/equitiesDeepDive/components/InstitutionalHoldings.jsx
import React from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './EquitiesDeepDiveDashboard.css';

function fmtBillions(v) {
  if (v == null) return '—';
  return `$${(v / 1000).toFixed(1)}T`;
}

function fmtMillions(v) {
  if (v == null) return '—';
  if (v >= 1000) return `${(v / 1000).toFixed(1)}B`;
  return `${v.toFixed(0)}M`;
}

export default function InstitutionalHoldings({ institutions, aggregateTopHoldings, recentChanges, isLive, lastUpdated }) {
  const { colors } = useTheme();

  if (!institutions?.length) {
    return (
      <div className="inst-panel">
        <div className="inst-panel-header">
          <span className="inst-panel-title">Institutional Holdings</span>
          <span className="inst-panel-subtitle">13F filings — major institutions</span>
        </div>
        <div className="inst-empty">No data available</div>
      </div>
    );
  }

  // Pie chart for aggregate holdings
  const pieOption = aggregateTopHoldings ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params) => `${params.name}<br/>$${params.value.toFixed(0)}B (${params.percent.toFixed(1)}%)`,
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: colors.textSecondary, fontSize: 10 },
      formatter: (name) => name.length > 10 ? name.slice(0, 10) + '…' : name,
    },
    series: [{
      type: 'pie',
      radius: ['35%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4 },
      label: { show: false },
      data: aggregateTopHoldings.slice(0, 8).map((h, i) => ({
        name: h.ticker,
        value: h.totalValue,
        itemStyle: { color: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#4ade80', '#22c55e', '#16a34a', '#15803d'][i] },
      })),
    }],
  } : null;

  // Bar chart for institution comparison
  const barOption = {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => `${params[0].name}<br/>$${params[0].value.toFixed(0)}B AUM`,
    },
    grid: { top: 20, right: 20, bottom: 40, left: 80 },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '${value}B' },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'category',
      data: institutions.map(i => i.name.length > 15 ? i.name.slice(0, 15) + '…' : i.name).reverse(),
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'bar',
      data: institutions.map(i => i.totalValue).reverse(),
      itemStyle: { color: '#6366f1', borderRadius: [0, 4, 4, 0] },
      barWidth: '60%',
    }],
  };

  return (
    <div className="inst-panel">
      <div className="inst-panel-header">
        <span className="inst-panel-title">Institutional Holdings</span>
        <span className="inst-panel-subtitle">SEC 13F filings · quarterly positions · top institutions</span>
      </div>

      {/* KPI Strip */}
      <div className="inst-kpi-strip">
        <div className="inst-kpi-pill">
          <span className="inst-kpi-label">Institutions</span>
          <span className="inst-kpi-value">{institutions.length}</span>
          <span className="inst-kpi-sub">tracked</span>
        </div>
        <div className="inst-kpi-pill">
          <span className="inst-kpi-label">Total AUM</span>
          <span className="inst-kpi-value">{fmtBillions(institutions.reduce((s, i) => s + (i.totalValue || 0), 0))}</span>
          <span className="inst-kpi-sub">combined</span>
        </div>
        <div className="inst-kpi-pill">
          <span className="inst-kpi-label">Last Filing</span>
          <span className="inst-kpi-value">{recentChanges?.lastQuarter || '2024-Q4'}</span>
          <span className="inst-kpi-sub">quarter</span>
        </div>
        <div className="inst-kpi-pill">
          <span className="inst-kpi-label">Top Holding</span>
          <span className="inst-kpi-value">{aggregateTopHoldings?.[0]?.ticker || 'AAPL'}</span>
          <span className="inst-kpi-sub">{aggregateTopHoldings?.[0]?.name || 'Apple'}</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="inst-two-col">
        {pieOption && (
          <div className="inst-chart-panel">
            <div className="inst-chart-title">Aggregate Top Holdings</div>
            <div className="inst-chart-subtitle">By total value across all tracked institutions</div>
            <div className="inst-chart-wrap">
              <SafeECharts option={pieOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Aggregate Top Holdings', source: 'SEC EDGAR 13F', endpoint: '/api/equities-deep-dive', series: [] }} />
            </div>
          </div>
        )}
        <div className="inst-chart-panel">
          <div className="inst-chart-title">Assets Under Management</div>
          <div className="inst-chart-subtitle">Billions USD</div>
          <div className="inst-chart-wrap">
            <SafeECharts option={barOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Assets Under Management', source: 'SEC EDGAR 13F', endpoint: '/api/equities-deep-dive', series: [] }} />
          </div>
        </div>
      </div>

      {/* Recent Changes */}
      {recentChanges && (recentChanges.bigBuys?.length > 0 || recentChanges.bigSells?.length > 0 || recentChanges.newPositions?.length > 0) && (
        <div className="inst-section">
          <div className="inst-section-title">Recent 13F Changes</div>
          <div className="inst-changes-grid">
            {recentChanges.bigBuys?.slice(0, 3).map((b, i) => (
              <div key={`buy-${i}`} className="inst-change-card inst-change-buy">
                <span className="inst-change-ticker">{b.ticker}</span>
                <span className="inst-change-name">{b.name}</span>
                <span className="inst-change-detail">Buy by {b.buyer}</span>
                <span className="inst-change-thesis">{b.thesis}</span>
              </div>
            ))}
            {recentChanges.bigSells?.slice(0, 3).map((s, i) => (
              <div key={`sell-${i}`} className="inst-change-card inst-change-sell">
                <span className="inst-change-ticker">{s.ticker}</span>
                <span className="inst-change-name">{s.name}</span>
                <span className="inst-change-detail">Sell by {s.seller}</span>
                <span className="inst-change-thesis">{s.thesis}</span>
              </div>
            ))}
            {recentChanges.newPositions?.slice(0, 3).map((n, i) => (
              <div key={`new-${i}`} className="inst-change-card inst-change-new">
                <span className="inst-change-ticker">{n.ticker}</span>
                <span className="inst-change-name">{n.name}</span>
                <span className="inst-change-detail">New: {n.buyer}</span>
                <span className="inst-change-thesis">{n.thesis}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Institution Details */}
      <div className="inst-section">
        <div className="inst-section-title">Institution Holdings</div>
        <div className="inst-scroll">
          {institutions.map((inst, idx) => (
            <div key={idx} className="inst-inst-card">
              <div className="inst-inst-header">
                <span className="inst-inst-name">{inst.name}</span>
                <span className="inst-inst-value">{fmtBillions(inst.totalValue)}</span>
              </div>
              <div className="inst-holdings-grid">
                {inst.topHoldings?.slice(0, 5).map((h, i) => (
                  <div key={i} className="inst-holding-row">
                    <span className="inst-holding-ticker">{h.ticker}</span>
                    <span className="inst-holding-name">{h.name}</span>
                    <span className="inst-holding-pct">{h.pctOfPortfolio?.toFixed(1)}%</span>
                    <span className="inst-holding-value">${h.value?.toFixed(0)}B</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="inst-panel-footer">
        Data from SEC EDGAR 13F filings · Updated quarterly · Holdings may be stale up to 45 days
      </div>
    </div>
  );
}