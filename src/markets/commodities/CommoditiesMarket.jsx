// src/markets/commodities/CommoditiesMarket.jsx
import React from 'react';
import { useCommoditiesData } from './data/useCommoditiesData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CommoditiesDashboard from './components/CommoditiesDashboard';
import './CommoditiesMarket.css';

/**
 * CommoditiesMarket - Unified commodities dashboard
 * Shows all commodities data in one glanceable view:
 * - KPI strip (Gold, Oil, Nat Gas, Gold/Oil Ratio, DBC ETF)
 * - Chart grid (Gold, Oil, Prices, Sector Performance, COT, Supply/Demand)
 */
function CommoditiesMarket({ autoRefresh } = {}) {
  const {
    priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
    fredCommodities, goldFuturesCurve, dbcEtf,
    goldOilRatio, contangoIndicator, commodityCurrencies, seasonalPatterns,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useCommoditiesData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="com-market">
      <div className="com-status-bar">
        <span className={isLive ? 'com-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / EIA / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="com-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <CommoditiesDashboard
        priceDashboardData={priceDashboardData}
        futuresCurveData={futuresCurveData}
        sectorHeatmapData={sectorHeatmapData}
        supplyDemandData={supplyDemandData}
        cotData={cotData}
        fredCommodities={fredCommodities}
        goldFuturesCurve={goldFuturesCurve}
        dbcEtf={dbcEtf}
        goldOilRatio={goldOilRatio}
        contangoIndicator={contangoIndicator}
        commodityCurrencies={commodityCurrencies}
        seasonalPatterns={seasonalPatterns}
      />
    </div>
  );
}

export default React.memo(CommoditiesMarket);
