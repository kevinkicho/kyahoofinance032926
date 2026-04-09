// src/markets/commodities/components/CommoditiesDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './CommoditiesDashboard.css';

export default function CommoditiesDashboard({
  priceDashboardData,
  futuresCurveData,
  sectorHeatmapData,
  supplyDemandData,
  cotData,
  fredCommodities,
  goldFuturesCurve,
  dbcEtf,
  goldOilRatio,
  contangoIndicator,
  commodityCurrencies,
  seasonalPatterns,
}) {
  const { colors } = useTheme();

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    // Flatten commodities from nested sector structure
    const allCommodities = (priceDashboardData || []).flatMap(s => s.commodities || []);

    // Gold
    const gold = allCommodities.find(c => c.ticker === 'GC=F' || c.name?.includes('Gold'));
    if (gold?.price) {
      result.push({
        label: 'Gold',
        value: `$${gold.price.toFixed(0)}`,
        change: gold.change1d,
        color: '#f59e0b',
      });
    }
    // Oil (WTI)
    const oil = allCommodities.find(c => c.ticker === 'CL=F' || c.name?.includes('Crude'));
    if (oil?.price) {
      result.push({
        label: 'WTI Oil',
        value: `$${oil.price.toFixed(2)}`,
        change: oil.change1d,
        color: '#14b8a6',
      });
    }
    // Natural Gas
    const natGas = allCommodities.find(c => c.ticker === 'NG=F' || c.name?.includes('Natural Gas'));
    if (natGas?.price) {
      result.push({
        label: 'Nat Gas',
        value: `$${natGas.price.toFixed(2)}`,
        change: natGas.change1d,
        color: '#a78bfa',
      });
    }
    // Gold/Oil Ratio
    if (goldOilRatio != null) {
      result.push({
        label: 'Gold/Oil',
        value: goldOilRatio.toFixed(1),
        color: '#60a5fa',
      });
    }
    // DBC ETF
    if (dbcEtf?.price) {
      result.push({
        label: 'DBC ETF',
        value: `$${dbcEtf.price.toFixed(2)}`,
        change: dbcEtf.changePct,
        color: '#22c55e',
      });
    }
    return result;
  }, [priceDashboardData, goldOilRatio, dbcEtf]);

  // Gold chart
  const goldOption = useMemo(() => {
    const goldData = fredCommodities?.gold || fredCommodities?.goldHistory;
    if (!goldData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: goldData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(goldData.dates.length / 6) } },
      yAxis: { type: 'value', name: '$/oz', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: goldData.values, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 } }],
    };
  }, [fredCommodities, colors]);

  // Oil chart
  const oilOption = useMemo(() => {
    const oilData = fredCommodities?.oil || fredCommodities?.wtiHistory;
    if (!oilData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: oilData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(oilData.dates.length / 6) } },
      yAxis: { type: 'value', name: '$/bbl', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: oilData.values, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 } }],
    };
  }, [fredCommodities, colors]);

  return (
    <div className="com-dashboard">
      {/* KPI Strip */}
      <div className="com-kpi-strip">
        {kpis.map((kpi, i) => (
          <div key={i} className="com-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="com-kpi-label">{kpi.label}</span>
            <span className="com-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
            {kpi.change != null && (
              <span className="com-kpi-change" style={{ color: kpi.change >= 0 ? '#22c55e' : '#ef4444' }}>
                {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="com-chart-grid">
        {/* Gold Chart */}
        {goldOption && (
          <div className="com-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="com-panel-title">Gold Price</div>
            <div className="com-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={goldOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Oil Chart */}
        {oilOption && (
          <div className="com-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="com-panel-title">WTI Oil Price</div>
            <div className="com-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={oilOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Price Dashboard */}
        {(priceDashboardData?.flatMap?.(s => s.commodities || s) || priceDashboardData || []).length > 0 && (
          <div className="com-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="com-panel-title">Commodity Prices</div>
            <div className="com-mini-table">
              {(priceDashboardData?.flatMap?.(s => s.commodities || s) || priceDashboardData || []).slice(0, 8).map((c, i) => (
                <div key={i} className="com-mini-row">
                  <span className="com-mini-name">{c.name || c.ticker}</span>
                  <span className="com-mini-price">${c.price?.toFixed(2)}</span>
                  <span className="com-mini-change" style={{ color: (c.change1d || c.changePct || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(c.change1d || c.changePct || 0) >= 0 ? '+' : ''}{(c.change1d || c.changePct || 0).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sector Heatmap */}
        {(sectorHeatmapData?.commodities || sectorHeatmapData)?.length > 0 && (
          <div className="com-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="com-panel-title">Sector Performance</div>
            <div className="com-mini-table">
              {((sectorHeatmapData?.commodities || sectorHeatmapData) || []).slice(0, 6).map((s, i) => (
                <div key={i} className="com-mini-row">
                  <span className="com-mini-name">{s.sector || s.name}</span>
                  <span className="com-mini-change" style={{ color: (s.d1 || s.changePct || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(s.d1 || s.changePct || 0) >= 0 ? '+' : ''}{(s.d1 || s.changePct || 0).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COT Positioning */}
        {cotData?.length > 0 && (
          <div className="com-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="com-panel-title">COT Positioning</div>
            <div className="com-mini-table">
              {cotData.slice(0, 6).map((c, i) => (
                <div key={i} className="com-mini-row">
                  <span className="com-mini-name">{c.commodity}</span>
                  <span className="com-mini-value" style={{ color: (c.netLong || 0) > 0 ? '#22c55e' : '#ef4444' }}>
                    {(c.netLong || 0) > 0 ? 'Long' : 'Short'} {Math.abs(c.netLong || 0).toFixed(0)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Supply/Demand */}
        {supplyDemandData?.length > 0 && (
          <div className="com-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="com-panel-title">Supply/Demand</div>
            <div className="com-mini-table">
              {supplyDemandData.slice(0, 6).map((s, i) => (
                <div key={i} className="com-mini-row">
                  <span className="com-mini-name">{s.commodity}</span>
                  <span className="com-mini-value" style={{ color: s.balance > 0 ? '#22c55e' : '#ef4444' }}>
                    {s.balance > 0 ? 'Surplus' : 'Deficit'} {Math.abs(s.balance).toFixed(1)}Mbbl
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}