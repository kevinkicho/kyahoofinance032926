// src/markets/commodities/data/useCommoditiesData.js
import { useState, useEffect } from 'react';
import {
  priceDashboardData  as mockPriceDashboardData,
  futuresCurveData    as mockFuturesCurveData,
  sectorHeatmapData   as mockSectorHeatmapData,
  supplyDemandData    as mockSupplyDemandData,
  cotData             as mockCotData,
} from './mockCommoditiesData';

const SERVER = '';

export function useCommoditiesData() {
  const [priceDashboardData,  setPriceDashboardData]  = useState(mockPriceDashboardData);
  const [futuresCurveData,    setFuturesCurveData]    = useState(mockFuturesCurveData);
  const [sectorHeatmapData,   setSectorHeatmapData]   = useState(mockSectorHeatmapData);
  const [supplyDemandData,    setSupplyDemandData]    = useState(mockSupplyDemandData);
  const [cotData,             setCotData]             = useState(mockCotData);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — Dec 2025');
  const [isLoading,           setIsLoading]           = useState(true);
  const [fetchedOn,           setFetchedOn]           = useState(null);
  const [isCurrent,           setIsCurrent]           = useState(false);

  useEffect(() => {
    fetch(`${SERVER}/api/commodities`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.priceDashboardData?.length >= 3)             setPriceDashboardData(data.priceDashboardData);
        if (data.futuresCurveData?.prices?.length >= 4)       setFuturesCurveData(data.futuresCurveData);
        if (data.sectorHeatmapData?.commodities?.length >= 4) setSectorHeatmapData(data.sectorHeatmapData);
        if (data.supplyDemandData?.crudeStocks?.periods?.length) setSupplyDemandData(data.supplyDemandData);
        if (data.cotData?.commodities?.length >= 2)           setCotData(data.cotData);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
