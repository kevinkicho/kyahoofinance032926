import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithRetry } from '../../../utils/fetchWithRetry';
import { useInterval } from '../../../hooks/useInterval';
import { useDataStatus } from '../../../hooks/useDataStatus';
import { priceDashboardData as mockPriceDashboard, futuresCurveData as mockFuturesCurve, sectorHeatmapData as mockSectorHeatmap, supplyDemandData as mockSupplyDemand, cotData as mockCot, fredCommodities as mockFredCommodities, dbcEtf as mockDbcEtf, goldFuturesCurve as mockGoldFutures } from './mockCommoditiesData';

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

export function useCommoditiesData(autoRefresh = false, refreshKey = 0, { disabled = false } = {}) {
  // Legacy data states (maintained for backwards compatibility)
  const [priceDashboardData, setPriceDashboardData] = useState(mockPriceDashboard);
  const [futuresCurveData, setFuturesCurveData] = useState(mockFuturesCurve);
  const [sectorHeatmapData, setSectorHeatmapData] = useState(mockSectorHeatmap);
  const [supplyDemandData, setSupplyDemandData] = useState(mockSupplyDemand);
  const [cotData, setCotData] = useState(mockCot);
  const [fredCommodities, setFredCommodities] = useState(mockFredCommodities);
  const [goldFuturesCurve, setGoldFuturesCurve] = useState(mockGoldFutures);
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
  const { isLive, isLoading, error, lastUpdated, fetchedOn, isCurrent, fetchLog, handleSuccess, handleError, handleFinally, logFetch } = useDataStatus();

  // Calculate freshness for display
  const freshness = useMemo(() => {
    if (!timestamps.lastFetch) return null;
    return calculateDataAge(timestamps.lastFetch);
  }, [timestamps]);

  // Fetch data with enhanced endpoint
  const refetch = useCallback(async () => {
    const t0 = Date.now();
    try {
      // Try enhanced endpoint first
      const response = await fetchWithRetry(`${SERVER}/api/commodities/v2`);
      const data = await response.json();

      logFetch({ url: '/api/commodities/v2', status: 200, duration: Date.now() - t0, sources: { eia: !!data.eia, fred: !!data.fred, yahoo: !!data.yahoo, worldBank: !!data.worldBank }, seriesIds: ['POILWTIUSDM', 'GOLDAMGBD228NLBM', 'SLVPRUSD', 'PCOPPUSDM', 'POILBREUSDM', 'PNGASUSUSDM', 'M2SL'] });

      console.log(`[Commodities] V2 response:`, {
        eia: !!data.eia ? Object.keys(data.eia).length + ' keys' : 'empty',
        fred: !!data.fred ? Object.keys(data.fred).length + ' keys' : 'empty',
        yahoo: !!data.yahoo ? Object.keys(data.yahoo).length + ' keys' : 'empty',
        worldBank: !!data.worldBank ? 'present' : 'empty',
        _sources: data._sources,
        duration: data._fetchDuration,
      });

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

      // Map FRED data (normalize V2 series format to legacy {dates, values} format)
      if (data.fred) {
        const fc = {};
        const norm = (key) => {
          const s = data.fred[key];
          if (!s) return null;
          if (s.dates && s.values) return s;
          if (s.history && Array.isArray(s.history)) return { dates: s.history.map(h => h.date), values: s.history.map(h => h.value) };
          return null;
        };
        const w = norm('wti'); if (w) fc.wtiHistory = w;
        const g = norm('gold_am'); if (g) fc.goldHistory = g;
        const s = norm('silver'); if (s) fc.silverHistory = s;
        const c = norm('copper'); if (c) fc.copperHistory = c;
        const b = norm('brent'); if (b) fc.brentHistory = b;
        const n = norm('natgas'); if (n) fc.natGasHistory = n;
        if (data.fred.gas_retail) fc.gasRetail = typeof data.fred.gas_retail === 'object' && data.fred.gas_retail.value != null ? data.fred.gas_retail.value : data.fred.gas_retail;
        const ppi = data.fred.ppi_commodity || data.fred.ppiCommodity;
        const pn = norm(ppi); if (pn) fc.ppiCommodity = pn;
        const di = norm('dollarIndex'); if (di) fc.dollarIndex = di;
        if (Object.keys(fc).length > 0) setFredCommodities(fc);
      }

      // Map Yahoo data
      if (data.yahoo) {
        if (data.yahoo.dbc) {
          const history = data.yahoo.dbc.history;
          setDbcEtf({
            price: data.yahoo.dbc.price,
            changePct: data.yahoo.dbc.change,
            ytd: data.yahoo.dbc.ytd ?? null,
            history: history ? { dates: history.map(h => h.date), closes: history.map(h => h.close || h.value) } : null,
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

      // V2 doesn't provide futures, sector heatmap, COT, etc — fetch legacy for those
      try {
        console.log('[Commodities] Fetching legacy endpoint for supplemental data (futures, heatmap, COT, etc)...');
        const legacyResp = await fetchWithRetry(`${SERVER}/api/commodities`);
        const legacyData = await legacyResp.json();
        const filled = [];
        if (legacyData.futuresCurveData && !data.futuresCurveData) { setFuturesCurveData(legacyData.futuresCurveData); filled.push('futuresCurveData'); }
        if (legacyData.sectorHeatmapData && !data.sectorHeatmapData) { setSectorHeatmapData(legacyData.sectorHeatmapData); filled.push('sectorHeatmapData'); }
        if (legacyData.cotData?.commodities?.length) { setCotData(legacyData.cotData); filled.push('cotData'); }
        if (legacyData.goldFuturesCurve) { setGoldFuturesCurve(legacyData.goldFuturesCurve); filled.push('goldFuturesCurve'); }
        if (legacyData.contangoIndicator) { setContangoIndicator(legacyData.contangoIndicator); filled.push('contangoIndicator'); }
        if (legacyData.commodityCurrencies) { setCommodityCurrencies(legacyData.commodityCurrencies); filled.push('commodityCurrencies'); }
        if (legacyData.seasonalPatterns) { setSeasonalPatterns(legacyData.seasonalPatterns); filled.push('seasonalPatterns'); }
        if (!priceDashboardData && legacyData.priceDashboardData) { setPriceDashboardData(legacyData.priceDashboardData); filled.push('priceDashboardData'); }
        if (!supplyDemandData && legacyData.supplyDemandData) { setSupplyDemandData(legacyData.supplyDemandData); filled.push('supplyDemandData'); }
        // Merge fredCommodities: add keys from legacy that V2 doesn't provide
        if (legacyData.fredCommodities) {
          setFredCommodities(prev => {
            const merged = { ...prev };
            for (const [k, v] of Object.entries(legacyData.fredCommodities)) {
              if (!merged[k] && v) merged[k] = v;
            }
            return merged;
          });
        }
        if (legacyData.dbcEtf && !dbcEtf) {
          setDbcEtf(prev => prev || legacyData.dbcEtf);
        }
      } catch (legacyErr) {
        console.warn('[Commodities] Legacy supplemental fetch failed:', legacyErr?.message);
      }
    } catch (err) {
      console.warn('Enhanced commodities fetch failed, trying legacy endpoint:', err.message);

      // Fallback to legacy endpoint
      try {
        const response = await fetchWithRetry(`${SERVER}/api/commodities`);
        const data = await response.json();

        logFetch({ url: '/api/commodities', status: 200, duration: Date.now() - t0, sources: { legacy: true }, seriesIds: ['POILWTIUSDM', 'GOLDAMGBD228NLBM', 'M2SL'] });

      console.log(`[Commodities] Legacy fallback response:`, {
        priceDashboard: !!data.priceDashboardData,
        futuresCurve: !!data.futuresCurveData,
        sectorHeatmap: !!data.sectorHeatmapData,
        supplyDemand: !!data.supplyDemandData,
        cotData: !!data.cotData?.commodities?.length,
        fredCommodities: !!data.fredCommodities ? Object.keys(data.fredCommodities).join(',') : 'empty',
        dbcEtf: !!data.dbcEtf,
        goldOilRatio: data.goldOilRatio != null,
        contango: !!data.contangoIndicator,
        currencies: !!data.commodityCurrencies,
        seasonal: !!data.seasonalPatterns,
      });

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
        logFetch({ url: '/api/commodities', status: 'error', duration: Date.now() - t0, error: fallbackErr?.message });
        handleError(fallbackErr, 'Commodities');
      }
    } finally {
      handleFinally();
    }
  }, [handleSuccess, handleError, handleFinally]);

  useEffect(() => { if (!disabled) refetch(); }, [disabled]);
  useEffect(() => { if (refreshKey > 0 && !disabled) refetch(); }, [refreshKey, disabled]);

  useInterval(refetch, (!disabled && autoRefresh) ? 300000 : null);

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
    fetchLog,
    refetch,
  };
}

export default useCommoditiesData;

