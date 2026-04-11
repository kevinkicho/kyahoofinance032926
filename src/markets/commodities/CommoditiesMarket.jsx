// src/markets/commodities/CommoditiesMarket.jsx
import React from 'react';
import { useCommoditiesData } from './data/useCommoditiesData';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CommoditiesDashboard from './components/CommoditiesDashboard';
import './components/CommoditiesDashboard.css';

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
    // Enhanced data
    enhancedData, dataSources, dataCoverage, fetchMetadata,
    timestamps, freshness, formatTimestamp, getFreshnessIndicator,
  } = useCommoditiesData(autoRefresh);

  if (isLoading) return <MarketSkeleton />;

  return (
    <div className="com-market">
      <div className="com-status-bar">
        <span className={isLive ? 'com-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {isLive && fetchMetadata?.dataSources && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {fetchMetadata.dataSources.join(' · ')}
          </span>
        )}
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {fetchMetadata?.fetchDuration && <span style={{ fontSize: 9, color: 'var(--text-dim)' }}>({fetchMetadata.fetchDuration})</span>}
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
        // Enhanced props
        enhancedData={enhancedData}
        dataSources={dataSources}
        dataCoverage={dataCoverage}
        fetchMetadata={fetchMetadata}
        timestamps={timestamps}
        freshness={freshness}
        formatTimestamp={formatTimestamp}
        getFreshnessIndicator={getFreshnessIndicator}
      />
    </div>
  );
}

export default React.memo(CommoditiesMarket);
