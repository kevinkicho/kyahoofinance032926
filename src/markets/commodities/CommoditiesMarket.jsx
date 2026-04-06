// src/markets/commodities/CommoditiesMarket.jsx
import React, { useState } from 'react';
import { useCommoditiesData } from './data/useCommoditiesData';
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

export default function CommoditiesMarket() {
  const [activeTab, setActiveTab] = useState('price-dashboard');
  const { priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCommoditiesData();

  if (isLoading) {
    return (
      <div className="com-market com-loading">
        <div className="com-loading-spinner" />
        <span className="com-loading-text">Loading commodities data…</span>
      </div>
    );
  }

  return (
    <div className="com-market">
      <div className="com-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`com-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="com-status-bar">
        <span className={isLive ? 'com-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / EIA' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="com-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="com-content">
        {activeTab === 'price-dashboard' && <PriceDashboard priceDashboardData={priceDashboardData} />}
        {activeTab === 'futures-curve'   && <FuturesCurve   futuresCurveData={futuresCurveData} />}
        {activeTab === 'sector-heatmap'  && <SectorHeatmap  sectorHeatmapData={sectorHeatmapData} />}
        {activeTab === 'supply-demand'   && <SupplyDemand   supplyDemandData={supplyDemandData} />}
        {activeTab === 'cot'             && <CotPositioning cotData={cotData} />}
      </div>
    </div>
  );
}
