// Commodities Dashboard - Full unified dashboard, no sidebar, single-viewport bento grid
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import PriceDashboard from './PriceDashboard';
import SectorHeatmap from './SectorHeatmap';
import FuturesCurve from './FuturesCurve';
import SupplyDemand from './SupplyDemand';
import CotPositioning from './CotPositioning';
import './CommoditiesDashboard.css';

function CommoditiesDashboard({
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
  enhancedData,
  dataSources,
  fetchMetadata,
  timestamps,
  freshness,
  formatTimestamp,
  getFreshnessIndicator,
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

  return (
    <div className="com-dashboard com-dashboard--no-sidebar">
      <div className="com-main">
        <div className="com-scroll-container">
          <div className="com-bento-grid">

            {/* Row 1: Prices (8/12) + Futures (4/12) */}
            <div className="com-grid-cell span-8">
              <div className="com-card">
                <div className="com-card-header">
                  <span className="com-card-title">Commodity Prices</span>
                  <span className="com-card-subtitle">
                    Live futures + EIA + FRED
                    {freshness && (
                      <span className="com-freshness-dot" style={{ color: freshness.color }}> · {freshness.label}</span>
                    )}
                  </span>
                  <span className="com-card-spacer" />
                  <button
                    className={`com-toggle-btn ${priceView === 'table' ? 'com-toggle-active' : ''}`}
                    onClick={() => setPriceView('table')}
                  >
                    Table
                  </button>
                  <button
                    className={`com-toggle-btn ${priceView === 'chart' ? 'com-toggle-active' : ''}`}
                    onClick={() => setPriceView('chart')}
                  >
                    Charts
                  </button>
                </div>
                <div className="com-panel-content">
                  {priceView === 'table' ? (
                    <PriceDashboard
                      priceDashboardData={priceDashboardData}
                      dbcEtf={dbcEtf}
                      fredCommodities={fredCommodities}
                      goldOilRatio={goldOilRatio}
                      contangoIndicator={contangoIndicator}
                      commodityCurrencies={commodityCurrencies}
                      enhancedData={enhancedData}
                    />
                  ) : (
                    <PriceCharts
                      priceDashboardData={priceDashboardData}
                      allCommodities={allCommodities}
                      colors={colors}
                      formatChange={formatChange}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="com-grid-cell span-4">
              <div className="com-card">
                <div className="com-panel-content">
                  <FuturesCurve
                    futuresCurveData={futuresCurveData}
                    goldFuturesCurve={goldFuturesCurve}
                    fredCommodities={fredCommodities}
                    seasonalPatterns={seasonalPatterns}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Sector (4/12) + Supply (4/12) + COT (4/12) */}
            <div className="com-grid-cell span-4">
              <div className="com-card">
                <div className="com-card-header">
                  <span className="com-card-title">Sector Performance</span>
                  <span className="com-card-spacer" />
                  <button
                    className={`com-toggle-btn ${sectorView === 'heatmap' ? 'com-toggle-active' : ''}`}
                    onClick={() => setSectorView('heatmap')}
                  >
                    Heatmap
                  </button>
                  <button
                    className={`com-toggle-btn ${sectorView === 'table' ? 'com-toggle-active' : ''}`}
                    onClick={() => setSectorView('table')}
                  >
                    Table
                  </button>
                </div>
                <div className="com-panel-content">
                  <SectorHeatmap
                    sectorHeatmapData={sectorHeatmapData}
                    fredCommodities={fredCommodities}
                    view={sectorView}
                  />
                </div>
              </div>
            </div>

            <div className="com-grid-cell span-4">
              <div className="com-card">
                <div className="com-panel-content">
                  <SupplyDemand
                    supplyDemandData={supplyDemandData}
                    fredCommodities={fredCommodities}
                  />
                </div>
              </div>
            </div>

            <div className="com-grid-cell span-4">
              <div className="com-card">
                <div className="com-panel-content">
                  <CotPositioning
                    cotData={cotData}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * PriceCharts — data-driven sector grouping (no hardcoded ticker map)
 */
function PriceCharts({ priceDashboardData, allCommodities, colors, formatChange }) {
  // Use sector grouping from the data itself
  const groups = useMemo(() => {
    if (!priceDashboardData?.length) return [];
    return priceDashboardData
      .filter(s => s.sector && s.commodities?.length)
      .map(s => ({ sector: s.sector, items: s.commodities }));
  }, [priceDashboardData]);

  if (!groups.length) {
    return <div className="com-empty">No price data available</div>;
  }

  return (
    <div className="com-price-charts">
      {groups.map(({ sector, items }) => (
        <div key={sector} className="com-chart-group">
          <div className="com-chart-group-title" style={{ color: colors.text }}>{sector}</div>
          <div className="com-chart-group-items">
            {items.map(c => (
              <div key={c.ticker || c.name} className="com-chart-item" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                <div className="com-chart-item-header">
                  <span style={{ fontWeight: 600, fontSize: 12, color: colors.text }}>{c.name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: c.change1d >= 0 ? '#22c55e' : '#ef4444' }}>
                    {c.price != null ? `$${Number(c.price).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, padding: '4px 0 8px' }}>
                  1d: {formatChange(c.change1d)} &nbsp; 1w: {formatChange(c.change1w)} &nbsp; 1m: {formatChange(c.change1m)}
                </div>
                {c.sparkline && (
                  <svg viewBox="0 0 80 28" style={{ width: '100%', height: 24 }}>
                    <polyline
                      points={c.sparkline.map((v, i) => {
                        const min = Math.min(...c.sparkline);
                        const max = Math.max(...c.sparkline);
                        const range = max - min || 1;
                        const x = 2 + (i / (c.sparkline.length - 1)) * 76;
                        const y = 26 - ((v - min) / range) * 24;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke={c.change1d >= 0 ? '#22c55e' : '#ef4444'}
                      strokeWidth="1.5"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(CommoditiesDashboard);
