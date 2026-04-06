// src/markets/commodities/data/useCommoditiesData.js
import { useState, useEffect } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import {
  priceDashboardData  as mockPriceDashboardData,
  futuresCurveData    as mockFuturesCurveData,
  sectorHeatmapData   as mockSectorHeatmapData,
  supplyDemandData    as mockSupplyDemandData,
  cotData             as mockCotData,
  fredCommodities     as mockFredCommodities,
  goldFuturesCurve    as mockGoldFuturesCurve,
  dbcEtf              as mockDbcEtf,
} from './mockCommoditiesData';

const SERVER = '';

export function useCommoditiesData() {
  const [priceDashboardData,  setPriceDashboardData]  = useState(mockPriceDashboardData);
  const [futuresCurveData,    setFuturesCurveData]    = useState(mockFuturesCurveData);
  const [sectorHeatmapData,   setSectorHeatmapData]   = useState(mockSectorHeatmapData);
  const [supplyDemandData,    setSupplyDemandData]    = useState(mockSupplyDemandData);
  const [cotData,             setCotData]             = useState(mockCotData);
  const [fredCommodities,     setFredCommodities]     = useState(mockFredCommodities);
  const [goldFuturesCurve,    setGoldFuturesCurve]    = useState(mockGoldFuturesCurve);
  const [dbcEtf,              setDbcEtf]              = useState(mockDbcEtf);
  const [goldOilRatio,        setGoldOilRatio]        = useState(null);
  const [contangoIndicator,   setContangoIndicator]   = useState(null);
  const [commodityCurrencies, setCommodityCurrencies] = useState(null);
  const [seasonalPatterns,    setSeasonalPatterns]    = useState(null);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — Dec 2025');
  const [isLoading,           setIsLoading]           = useState(true);
  const [fetchedOn,           setFetchedOn]           = useState(null);
  const [isCurrent,           setIsCurrent]           = useState(false);

  useEffect(() => {
    fetchWithRetry(`${SERVER}/api/commodities`)
      .then(r => r.json())
      .then(data => {
        let anyReplaced = false;
        if (data.priceDashboardData?.length >= 3)              { setPriceDashboardData(data.priceDashboardData); anyReplaced = true; }
        if (data.futuresCurveData?.prices?.length >= 4)        { setFuturesCurveData(data.futuresCurveData); anyReplaced = true; }
        if (data.sectorHeatmapData?.commodities?.length >= 4)  { setSectorHeatmapData(data.sectorHeatmapData); anyReplaced = true; }
        if (data.supplyDemandData?.crudeStocks?.periods?.length){ setSupplyDemandData(data.supplyDemandData); anyReplaced = true; }
        if (data.cotData?.commodities?.length >= 2)            { setCotData(data.cotData); anyReplaced = true; }
        if (data.fredCommodities?.wtiHistory?.dates?.length >= 10) { setFredCommodities(data.fredCommodities); anyReplaced = true; }
        if (data.goldFuturesCurve?.prices?.length >= 3)        { setGoldFuturesCurve(data.goldFuturesCurve); anyReplaced = true; }
        if (data.dbcEtf?.price)                                { setDbcEtf(data.dbcEtf); anyReplaced = true; }
        if (data.goldOilRatio != null)                         { setGoldOilRatio(data.goldOilRatio); anyReplaced = true; }
        if (data.contangoIndicator?.structure)                 { setContangoIndicator(data.contangoIndicator); anyReplaced = true; }
        if (data.commodityCurrencies?.CAD)                     { setCommodityCurrencies(data.commodityCurrencies); anyReplaced = true; }
        if (data.seasonalPatterns?.CL?.length >= 12)           { setSeasonalPatterns(data.seasonalPatterns); anyReplaced = true; }
        if (anyReplaced) setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return {
    priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
    fredCommodities, goldFuturesCurve, dbcEtf,
    goldOilRatio, contangoIndicator, commodityCurrencies, seasonalPatterns,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  };
}
