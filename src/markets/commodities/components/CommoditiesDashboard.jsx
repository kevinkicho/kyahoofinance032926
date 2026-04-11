// Commodities Dashboard — Dynamic tiling layout using React-Grid-Layout
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import BentoWrapper from '../../../components/BentoWrapper';
import PriceDashboard from './PriceDashboard';
import FuturesCurve from './FuturesCurve';
import SupplyDemand from './SupplyDemand';
import CotPositioning from './CotPositioning';
import SectorHeatmap from './SectorHeatmap';
import './CommoditiesDashboard.css';

const STORAGE_KEY = 'commodities-view';

function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? saved : defaultValue;
    } catch { return defaultValue; }
  });
  const persist = (v) => {
    setValue(v);
    try { localStorage.setItem(key, v); } catch {}
  };
  return [value, persist];
}

function CommoditiesDashboard({
  priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
  fredCommodities, goldFuturesCurve, dbcEtf, goldOilRatio, contangoIndicator,
  commodityCurrencies, seasonalPatterns, enhancedData, dataSources, fetchMetadata,
  timestamps, freshness, formatTimestamp, getFreshnessIndicator,
}) {
  const { colors } = useTheme();
  const [priceView, setPriceView] = usePersistedState(`${STORAGE_KEY}-priceView`, 'table');
  const [sectorView, setSectorView] = usePersistedState(`${STORAGE_KEY}-sectorView`, 'heatmap');

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

  const stopDrag = (e) => e.stopPropagation();

  // RGL uses x, y, w, h. 12-column system.
  const layout = {
    lg: [
      { i: 'prices',  x: 0, y: 0, w: 8, h: 4 },
      { i: 'futures', x: 8, y: 0, w: 4, h: 4 },
      { i: 'sector',  x: 0, y: 4, w: 4, h: 3 },
      { i: 'supply',  x: 4, y: 4, w: 4, h: 3 },
      { i: 'cot',     x: 8, y: 4, w: 4, h: 3 },
    ]
  };

  return (
    <div className="com-dashboard com-dashboard--no-sidebar">
      <BentoWrapper layout={layout} storageKey="commodities-layout">
        <div key="prices" className="bento-card">
          <div className="com-panel-title-row bento-panel-title-row">
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
          <div className="com-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {priceView === 'table' ? (
              <PriceDashboard priceDashboardData={priceDashboardData} dbcEtf={dbcEtf} fredCommodities={fredCommodities} goldOilRatio={goldOilRatio} contangoIndicator={contangoIndicator} commodityCurrencies={commodityCurrencies} enhancedData={enhancedData} />
            ) : (
              <PriceCharts priceDashboardData={priceDashboardData} allCommodities={allCommodities} colors={colors} formatChange={formatChange} />
            )}
          </div>
        </div>
        <div key="futures" className="bento-card">
          <div className="com-panel-title-row bento-panel-title-row">
            <span className="com-panel-title">Futures Curve</span>
          </div>
          <div className="com-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <FuturesCurve futuresCurveData={futuresCurveData} goldFuturesCurve={goldFuturesCurve} fredCommodities={fredCommodities} seasonalPatterns={seasonalPatterns} />
          </div>
        </div>
        <div key="sector" className="bento-card">
          <div className="com-panel-title-row bento-panel-title-row">
            <span className="com-panel-title">Sector Performance</span>
            <span className="com-panel-title-spacer" />
            <button className={`com-toggle-btn ${sectorView === 'heatmap' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('heatmap')}>Heatmap</button>
            <button className={`com-toggle-btn ${sectorView === 'table' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('table')}>Table</button>
          </div>
          <div className="com-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <SectorHeatmap sectorHeatmapData={sectorHeatmapData} fredCommodities={fredCommodities} view={sectorView} />
          </div>
        </div>
        <div key="supply" className="bento-card">
          <div className="com-panel-title-row bento-panel-title-row">
            <span className="com-panel-title">Supply & Demand</span>
          </div>
          <div className="com-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <SupplyDemand supplyDemandData={supplyDemandData} fredCommodities={fredCommodities} />
          </div>
        </div>
        <div key="cot" className="bento-card">
          <div className="com-panel-title-row bento-panel-title-row">
            <span className="com-panel-title">COT Positioning</span>
          </div>
          <div className="com-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <CotPositioning cotData={cotData} />
          </div>
        </div>
      </BentoWrapper>
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
