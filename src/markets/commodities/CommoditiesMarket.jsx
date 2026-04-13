// src/markets/commodities/CommoditiesMarket.jsx
import React from 'react';
import { useCommoditiesData } from './data/useCommoditiesData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CommoditiesDashboard from './components/CommoditiesDashboard';
import './components/CommoditiesDashboard.css';

function CommoditiesMarket({ autoRefresh, refreshKey } = {}) {
  const {
    priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
    fredCommodities, goldFuturesCurve, dbcEtf,
    goldOilRatio, contangoIndicator, commodityCurrencies, seasonalPatterns,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent, fetchLog, refetch,
    // Enhanced data
    enhancedData, dataSources, dataCoverage, fetchMetadata,
    timestamps, freshness, formatTimestamp, getFreshnessIndicator,
  } = useCommoditiesData(autoRefresh, refreshKey);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="com-market">
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
        enhancedData={enhancedData}
        dataSources={dataSources}
        dataCoverage={dataCoverage}
        fetchMetadata={fetchMetadata}
        timestamps={timestamps}
        freshness={freshness}
        formatTimestamp={formatTimestamp}
        getFreshnessIndicator={getFreshnessIndicator}
        isLive={isLive}
        lastUpdated={lastUpdated}
        fetchLog={fetchLog}
      />
    </div>
  );
}

export default React.memo(CommoditiesMarket);
