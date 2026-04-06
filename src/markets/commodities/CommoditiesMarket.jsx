// src/markets/commodities/CommoditiesMarket.jsx
import React, { useState } from 'react';
import { useCommoditiesData } from './data/useCommoditiesData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import PriceDashboard  from './components/PriceDashboard';
import FuturesCurve    from './components/FuturesCurve';
import SectorHeatmap   from './components/SectorHeatmap';
import SupplyDemand    from './components/SupplyDemand';
import CotPositioning  from './components/CotPositioning';
import './CommoditiesMarket.css';

const SUB_TABS = [
  { id: 'price-dashboard', label: 'Price Dashboard' },
  { id: 'futures-curve',   label: 'Futures Curve'   },
  { id: 'sector-heatmap',  label: 'Sector Heatmap'  },
  { id: 'supply-demand',   label: 'Supply & Demand'  },
  { id: 'cot',             label: 'COT Positioning'  },
];

function CommoditiesMarket({ autoRefresh } = {}) {
  const [activeTab, setActiveTab] = useState('price-dashboard');
  const {
    priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
    fredCommodities, goldFuturesCurve, dbcEtf,
    goldOilRatio, contangoIndicator, commodityCurrencies, seasonalPatterns,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useCommoditiesData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="com-market">
      <div className="com-sub-tabs" role="tablist" aria-label="Sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`com-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="com-status-bar">
        <span className={isLive ? 'com-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / EIA / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="com-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="com-content">
        {activeTab === 'price-dashboard' && <PriceDashboard priceDashboardData={priceDashboardData} dbcEtf={dbcEtf} fredCommodities={fredCommodities} goldOilRatio={goldOilRatio} contangoIndicator={contangoIndicator} commodityCurrencies={commodityCurrencies} />}
        {activeTab === 'futures-curve'   && <FuturesCurve   futuresCurveData={futuresCurveData} goldFuturesCurve={goldFuturesCurve} fredCommodities={fredCommodities} seasonalPatterns={seasonalPatterns} />}
        {activeTab === 'sector-heatmap'  && <SectorHeatmap  sectorHeatmapData={sectorHeatmapData} fredCommodities={fredCommodities} />}
        {activeTab === 'supply-demand'   && <SupplyDemand   supplyDemandData={supplyDemandData} fredCommodities={fredCommodities} />}
        {activeTab === 'cot'             && <CotPositioning cotData={cotData} />}
      </div>
    </div>
  );
}

export default React.memo(CommoditiesMarket);
