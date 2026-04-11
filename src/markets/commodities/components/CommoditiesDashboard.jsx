// Commodities Dashboard — Bento grid layout using bento-grid-builder
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { BentoGrid } from 'bento-grid-builder';
import PriceDashboard from './PriceDashboard';
import SectorHeatmap from './SectorHeatmap';
import FuturesCurve from './FuturesCurve';
import SupplyDemand from './SupplyDemand';
import CotPositioning from './CotPositioning';
import './CommoditiesDashboard.css';

function CommoditiesDashboard({
  priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
  fredCommodities, goldFuturesCurve, dbcEtf, goldOilRatio, contangoIndicator,
  commodityCurrencies, seasonalPatterns, enhancedData, dataSources, fetchMetadata,
  timestamps, freshness, formatTimestamp, getFreshnessIndicator,
}) {
  const { colors } = useTheme();
  const [priceView, setPriceView] = useState('table');
  const [sectorView, setSectorView] = useState('heatmap');

  const allCommodities = useMemo(() => {
    return priceDashboardData?.flatMap(s => s.commodities || []) || [];
  }, [priceDashboardData]);

  const formatChange = (val) => {
    if (val == null) return <span style={{ color: colors.textMuted }}>—</span>;
    const num = Number(val);
    if (isNaN(num)) return <span style={{ color: colors.textMuted }}>—</span>;
    const sign = num >= 0 ? '+' : '';
    const color = num >= 0 ? '#22c55e' : '#ef4444';
    return <span style={{ color }}>{sign}{num.toFixed(2)}%</span>;
  };

  const layout = {
    columns: 6,
    rows: 2,
    gap: 8,
    rowHeights: ['3fr', '2fr'],
    placements: [
      { cardId: 'prices',  col: 1, row: 1, colSpan: 3, rowSpan: 2 },
      { cardId: 'futures', col: 4, row: 1, colSpan: 3, rowSpan: 1 },
      { cardId: 'sector',  col: 4, row: 2, colSpan: 1, rowSpan: 1 },
      { cardId: 'supply',  col: 5, row: 2, colSpan: 1, rowSpan: 1 },
      { cardId: 'cot',     col: 6, row: 2, colSpan: 1, rowSpan: 1 },
    ],
  };

  const cards = [
    {
      id: 'prices',
      component: () => (
        <>
          <div className="com-panel-title-row">
            <span className="com-panel-title">Commodity Prices</span>
            <span className="com-panel-subtitle">
              Live futures + EIA + FRED
              {freshness && (
                <span className="com-freshness-dot" style={{ color: freshness.color }}> · {freshness.label}</span>
              )}
            </span>
            <span className="com-panel-title-spacer" />
            <button className={`com-toggle-btn ${priceView === 'table' ? 'com-toggle-active' : ''}`} onClick={() => setPriceView('table')}>Table</button>
            <button className={`com-toggle-btn ${priceView === 'chart' ? 'com-toggle-active' : ''}`} onClick={() => setPriceView('chart')}>Charts</button>
          </div>
          <div className="com-panel-content">
            {priceView === 'table' ? (
              <PriceDashboard priceDashboardData={priceDashboardData} dbcEtf={dbcEtf} fredCommodities={fredCommodities} goldOilRatio={goldOilRatio} contangoIndicator={contangoIndicator} commodityCurrencies={commodityCurrencies} enhancedData={enhancedData} />
            ) : (
              <PriceCharts priceDashboardData={priceDashboardData} allCommodities={allCommodities} colors={colors} formatChange={formatChange} />
            )}
          </div>
        </>
      ),
    },
    {
      id: 'futures',
      component: () => (
        <div className="com-panel-content">
          <FuturesCurve futuresCurveData={futuresCurveData} goldFuturesCurve={goldFuturesCurve} fredCommodities={fredCommodities} seasonalPatterns={seasonalPatterns} />
        </div>
      ),
    },
    {
      id: 'sector',
      component: () => (
        <>
          <div className="com-panel-title-row">
            <span className="com-panel-title">Sector Performance</span>
            <span className="com-panel-title-spacer" />
            <button className={`com-toggle-btn ${sectorView === 'heatmap' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('heatmap')}>Heatmap</button>
            <button className={`com-toggle-btn ${sectorView === 'table' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('table')}>Table</button>
          </div>
          <div className="com-panel-content">
            <SectorHeatmap sectorHeatmapData={sectorHeatmapData} fredCommodities={fredCommodities} view={sectorView} />
          </div>
        </>
      ),
    },
    {
      id: 'supply',
      component: () => (
        <div className="com-panel-content">
          <SupplyDemand supplyDemandData={supplyDemandData} fredCommodities={fredCommodities} />
        </div>
      ),
    },
    {
      id: 'cot',
      component: () => (
        <div className="com-panel-content">
          <CotPositioning cotData={cotData} />
        </div>
      ),
    },
  ];

  return (
    <div className="com-dashboard com-dashboard--no-sidebar">
      <BentoGrid
        layout={layout}
        cards={cards}
        data={{}}
        dataMapping={cards.map(c => ({ cardId: c.id, propsSelector: () => ({}) }))}
        className="com-bento-root"
      />
    </div>
  );
}

function PriceCharts({ priceDashboardData, allCommodities, colors, formatChange }) {
  const sectors = priceDashboardData || [];
  const groupColors = { Energy: '#ef4444', Metals: '#f59e0b', Agriculture: '#22c55e', Livestock: '#8b5cf6', Fibers: '#06b6d4' };
  return (
    <div className="com-price-charts">
      {sectors.map(sector => (
        <div key={sector.sector} className="com-chart-group">
          <div className="com-chart-group-title" style={{ color: groupColors[sector.sector] || '#94a3b8' }}>{sector.sector}</div>
          <div className="com-chart-group-items">
            {(sector.commodities || []).map(c => (
              <div key={c.ticker || c.name} className="com-chart-item">
                <div className="com-chart-item-header">
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{c.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: (c.change1d || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{formatChange(c.change1d)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(CommoditiesDashboard);