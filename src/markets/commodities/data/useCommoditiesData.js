// Enhanced commodities hook with timestamp support and data freshness indicators
import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import {
  priceDashboardData as mockPriceDashboardData,
  futuresCurveData as mockFuturesCurveData,
  sectorHeatmapData as mockSectorHeatmapData,
  supplyDemandData as mockSupplyDemandData,
  cotData as mockCotData,
  fredCommodities as mockFredCommodities,
  goldFuturesCurve as mockGoldFuturesCurve,
  dbcEtf as mockDbcEtf,
} from './mockCommoditiesData';

const SERVER = '';

// Data freshness calculation
function calculateDataAge(dateString) {
  if (!dateString) return { label: 'Unknown', color: 'gray', isStale: true };

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 5) return { label: 'Live', color: '#22c55e', isStale: false };
  if (diffMinutes < 60) return { label: `${diffMinutes}m ago`, color: '#22c55e', isStale: false };
  if (diffHours < 24) return { label: `${diffHours}h ago`, color: '#22c55e', isStale: false };
  if (diffDays === 1) return { label: '1 day old', color: '#fbbf24', isStale: false };
  if (diffDays < 7) return { label: `${diffDays} days old`, color: '#fbbf24', isStale: false };
  if (diffDays < 30) return { label: `${Math.floor(diffDays / 7)} weeks old`, color: '#f97316', isStale: true };
  return { label: `${Math.floor(diffDays / 30)} months old`, color: '#ef4444', isStale: true };
}

// Format timestamp for display
function formatTimestamp(isoString) {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function useCommoditiesData(autoRefresh = false) {
  // Legacy data states (maintained for backwards compatibility)
  const [priceDashboardData, setPriceDashboardData] = useState(mockPriceDashboardData);
  const [futuresCurveData, setFuturesCurveData] = useState(mockFuturesCurveData);
  const [sectorHeatmapData, setSectorHeatmapData] = useState(mockSectorHeatmapData);
  const [supplyDemandData, setSupplyDemandData] = useState(mockSupplyDemandData);
  const [cotData, setCotData] = useState(mockCotData);
  const [fredCommodities, setFredCommodities] = useState(mockFredCommodities);
  const [goldFuturesCurve, setGoldFuturesCurve] = useState(mockGoldFuturesCurve);
  const [dbcEtf, setDbcEtf] = useState(mockDbcEtf);
  const [goldOilRatio, setGoldOilRatio] = useState(null);
  const [contangoIndicator, setContangoIndicator] = useState(null);
  const [commodityCurrencies, setCommodityCurrencies] = useState(null);
  const [seasonalPatterns, setSeasonalPatterns] = useState(null);

  // New enhanced data states
  const [enhancedData, setEnhancedData] = useState(null);
  const [dataSources, setDataSources] = useState(null);
  const [dataCoverage, setDataCoverage] = useState(null);
  const [fetchMetadata, setFetchMetadata] = useState(null);

  // Timestamp tracking for data freshness
  const [timestamps, setTimestamps] = useState({
    eia: null,
    fred: null,
    worldBank: null,
    yahoo: null,
    lastFetch: null,
  });

  // Status with error handling
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, handleSuccess, handleError, handleFinally } = useDataStatus();

  // Calculate freshness for display
  const freshness = useMemo(() => {
    if (!timestamps.lastFetch) return null;
    return calculateDataAge(timestamps.lastFetch);
  }, [timestamps]);

  // Fetch data with enhanced endpoint
  const refetch = useCallback(async () => {
    try {
      // Try enhanced endpoint first
      const response = await fetchWithRetry(`${SERVER}/api/commodities/v2`);
      const data = await response.json();

      // Update timestamps
      setTimestamps({
        eia: data._timestamp || null,
        fred: data.fred?.gold_am?._lastUpdated || null,
        worldBank: data.worldBank?._lastUpdated || null,
        yahoo: data.yahoo?.dbc?._lastUpdated || null,
        lastFetch: data._timestamp || new Date().toISOString(),
      });

      // Update metadata
      setFetchMetadata({
        fetchDuration: data._fetchDuration,
        dataSources: data._dataSources,
        dataFreshness: data._meta?.dataFreshness,
        fetchedAt: data._meta?.fetchedAt,
      });

      // Store enhanced data
      setEnhancedData(data);
      setDataSources(data.dataSourceRegistry);
      setDataCoverage({
        byCategory: data.dataSourceRegistry?.byCategory,
        bySource: data.dataSourceRegistry?.bySource,
      });

      // Map EIA data to legacy format (for backwards compatibility)
      if (data.eia) {
        const eiaPrices = [];
        const eiaStocks = [];

        // Extract price data
        if (data.eia.wti_price) {
          eiaPrices.push({
            ticker: 'CL=F',
            name: 'WTI Crude',
            price: data.eia.wti_price.value,
            change1d: null, // Calculate from history if available
            unit: data.eia.wti_price.unit,
            _source: 'EIA',
            _lastUpdated: data.eia.wti_price._lastUpdated,
          });
        }

        if (data.eia.natgas) {
          eiaPrices.push({
            ticker: 'NG=F',
            name: 'Natural Gas',
            price: data.eia.natgas.value,
            change1d: null,
            unit: data.eia.natgas.unit,
            _source: 'EIA',
            _lastUpdated: data.eia.natgas._lastUpdated,
          });
        }

        // Create price dashboard structure
        if (eiaPrices.length > 0) {
          setPriceDashboardData([{ sector: 'Energy', commodities: eiaPrices }]);
        }

        // Create supply/demand structure
        if (data.eia.crude_stocks || data.eia.natgas_storage) {
          const stocks = [];
          if (data.eia.crude_stocks) {
            stocks.push({
              name: 'Crude Oil Inventories',
              value: data.eia.crude_stocks.value,
              unit: data.eia.crude_stocks.unit,
              change: data.eia.crude_stocks.history?.length > 1
                ? data.eia.crude_stocks.value - data.eia.crude_stocks.history[data.eia.crude_stocks.history.length - 2].value
                : null,
              _source: 'EIA',
              _lastUpdated: data.eia.crude_stocks._lastUpdated,
            });
          }
          if (data.eia.natgas_storage) {
            stocks.push({
              name: 'Natural Gas Storage',
              value: data.eia.natgas_storage.value,
              unit: data.eia.natgas_storage.unit,
              change: data.eia.natgas_storage.history?.length > 1
                ? data.eia.natgas_storage.value - data.eia.natgas_storage.history[data.eia.natgas_storage.history.length - 2].value
                : null,
              _source: 'EIA',
              _lastUpdated: data.eia.natgas_storage._lastUpdated,
            });
          }
          setSupplyDemandData(stocks);
        }
      }

      // Map FRED data
      if (data.fred) {
        const fredData = {
          wtiHistory: data.fred.wti,
          goldHistory: data.fred.gold_am,
          silverHistory: data.fred.silver,
          copperHistory: data.fred.copper,
          brentHistory: data.fred.brent,
          natGasHistory: data.fred.natgas,
        };
        setFredCommodities(fredData);
      }

      // Map Yahoo data
      if (data.yahoo) {
        if (data.yahoo.dbc) {
          setDbcEtf({
            price: data.yahoo.dbc.price,
            changePct: data.yahoo.dbc.change,
            _source: data.yahoo.dbc._source,
            _lastUpdated: data.yahoo.dbc._lastUpdated,
          });
        }
      }

      // Calculate gold/oil ratio if both available
      if (data.fred?.gold_am?.value && data.fred?.wti?.value) {
        const ratio = Math.round((data.fred.gold_am.value / data.fred.wti.value) * 100) / 100;
        setGoldOilRatio({ ratio });
      }

      handleSuccess(data);
    } catch (err) {
      console.warn('Enhanced commodities fetch failed, trying legacy endpoint:', err.message);

      // Fallback to legacy endpoint
      try {
        const response = await fetchWithRetry(`${SERVER}/api/commodities`);
        const data = await response.json();

        // Update legacy state
        if (data.priceDashboardData) setPriceDashboardData(data.priceDashboardData);
        if (data.futuresCurveData) setFuturesCurveData(data.futuresCurveData);
        if (data.sectorHeatmapData) setSectorHeatmapData(data.sectorHeatmapData);
        if (data.supplyDemandData) setSupplyDemandData(data.supplyDemandData);
        if (data.cotData?.commodities?.length >= 2) setCotData(data.cotData);
        if (data.fredCommodities) setFredCommodities(data.fredCommodities);
        if (data.goldFuturesCurve) setGoldFuturesCurve(data.goldFuturesCurve);
        if (data.dbcEtf) setDbcEtf(data.dbcEtf);
        if (data.goldOilRatio != null) setGoldOilRatio(typeof data.goldOilRatio === 'number' ? { ratio: data.goldOilRatio } : data.goldOilRatio);
        if (data.contangoIndicator) setContangoIndicator(data.contangoIndicator);
        if (data.commodityCurrencies) setCommodityCurrencies(data.commodityCurrencies);
        if (data.seasonalPatterns) setSeasonalPatterns(data.seasonalPatterns);

        setTimestamps(prev => ({
          ...prev,
          lastFetch: data.lastUpdated || new Date().toISOString(),
        }));

        handleSuccess(data);
      } catch (fallbackErr) {
        handleError(fallbackErr, 'Commodities');
      }
    } finally {
      handleFinally();
    }
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { refetch(); }, [refetch]);

  useInterval(refetch, autoRefresh ? 300000 : null);

  // Get source information for a specific commodity
  const getSourceInfo = useCallback((commodityKey) => {
    if (!dataSources) return null;
    const bySource = dataSources?.bySource;
    const sourceList = bySource ? Object.keys(bySource) : [];
    const primary = sourceList.length > 0 ? sourceList[0] : 'Yahoo Finance';
    const fallbacks = sourceList.length > 1 ? sourceList.slice(1) : ['FRED', 'EIA'];
    return {
      primary,
      fallbacks,
      lastUpdated: timestamps.lastFetch,
      frequency: 'Daily',
    };
  }, [dataSources, timestamps]);

  // Get freshness indicator for display
  const getFreshnessIndicator = useCallback((source) => {
    if (!timestamps[source]) return { label: 'Unknown', color: 'gray' };
    return calculateDataAge(timestamps[source]);
  }, [timestamps]);

  return {
    // Legacy data (backwards compatibility)
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

    // Enhanced data
    enhancedData,
    dataSources,
    dataCoverage,
    fetchMetadata,

    // Timestamp and freshness
    timestamps,
    freshness,
    formatTimestamp,
    getSourceInfo,
    getFreshnessIndicator,
    calculateDataAge,

    // Status
    isLive,
    lastUpdated,
    isLoading,
    error,
    fetchedOn,
    isCurrent,
  };
}

export default useCommoditiesData;

