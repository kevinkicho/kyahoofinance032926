import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import CommoditiesDashboard from './components/CommoditiesDashboard';
import './components/CommoditiesDashboard.css';

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

function formatTimestamp(isoString) {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
}

function normalizeFredSeries(series) {
  if (!series) return null;
  if (series.dates && series.values) return series;
  if (series.history && Array.isArray(series.history)) {
    return { dates: series.history.map(h => h.date), values: series.history.map(h => h.value) };
  }
  return null;
}

function mapV2ToLegacy(d) {
  const result = { priceDashboardData: null, futuresCurveData: null, sectorHeatmapData: null, supplyDemandData: null, cotData: null, fredCommodities: null, goldFuturesCurve: null, dbcEtf: null, goldOilRatio: null, contangoIndicator: null, commodityCurrencies: null, seasonalPatterns: null };
  if (d.eia) {
    const eiaPrices = [];
    if (d.eia.wti_price) eiaPrices.push({ ticker: 'CL=F', name: 'WTI Crude', price: d.eia.wti_price.value, change1d: null, unit: d.eia.wti_price.unit, _source: 'EIA', _lastUpdated: d.eia.wti_price._lastUpdated });
    if (d.eia.natgas) eiaPrices.push({ ticker: 'NG=F', name: 'Natural Gas', price: d.eia.natgas.value, change1d: null, unit: d.eia.natgas.unit, _source: 'EIA', _lastUpdated: d.eia.natgas._lastUpdated });
    if (eiaPrices.length > 0) result.priceDashboardData = [{ sector: 'Energy', commodities: eiaPrices }];
    if (d.eia.crude_stocks || d.eia.natgas_storage) {
      const sd = {};
      if (d.eia.crude_stocks) {
        const cs = d.eia.crude_stocks;
        sd.crudeStocks = {
          periods: (cs.history || []).map(h => h.date),
          values: (cs.history || []).map(h => h.value),
          avg5yr: cs._avg5yr ?? null,
        };
        sd.crudeStocksLatest = cs.value;
      }
      if (d.eia.natgas_storage) {
        const ns = d.eia.natgas_storage;
        sd.natGasStorage = {
          periods: (ns.history || []).map(h => h.date),
          values: (ns.history || []).map(h => h.value),
          avg5yr: ns._avg5yr ?? null,
        };
        sd.natGasLatest = ns.value;
      }
      if (d.eia.crude_production) {
        const cp = d.eia.crude_production;
        sd.crudeProduction = {
          periods: (cp.history || []).map(h => h.date),
          values: (cp.history || []).map(h => h.value),
        };
      }
      result.supplyDemandData = sd;
    }
  }
  if (d.fred) {
    const fc = {};
    const wtiH = normalizeFredSeries(d.fred.wti);
    if (wtiH) fc.wtiHistory = wtiH;
    const goldH = normalizeFredSeries(d.fred.gold_am);
    if (goldH) fc.goldHistory = goldH;
    const silverH = normalizeFredSeries(d.fred.silver);
    if (silverH) fc.silverHistory = silverH;
    const copperH = normalizeFredSeries(d.fred.copper);
    if (copperH) fc.copperHistory = copperH;
    const brentH = normalizeFredSeries(d.fred.brent);
    if (brentH) fc.brentHistory = brentH;
    const natGasH = normalizeFredSeries(d.fred.natgas);
    if (natGasH) fc.natGasHistory = natGasH;
    if (d.fred.gas_retail) fc.gasRetail = typeof d.fred.gas_retail === 'object' && d.fred.gas_retail.value != null ? d.fred.gas_retail.value : d.fred.gas_retail;
    if (d.fred.ppi_commodity || d.fred.ppiCommodity) {
      const ppi = d.fred.ppi_commodity || d.fred.ppiCommodity;
      fc.ppiCommodity = normalizeFredSeries(ppi);
    }
    const dollarH = normalizeFredSeries(d.fred.dollarIndex);
    if (dollarH) fc.dollarIndex = dollarH;
    if (Object.keys(fc).length > 0) result.fredCommodities = fc;
  }
  if (d.yahoo?.dbc) result.dbcEtf = { price: d.yahoo.dbc.price, changePct: d.yahoo.dbc.change, ytd: d.yahoo.dbc.ytd ?? null, history: d.yahoo.dbc.history ?? null, _source: d.yahoo.dbc._source, _lastUpdated: d.yahoo.dbc._lastUpdated };
  if (d.fred?.gold_am?.value) {
    const wtiPrice = d.eia?.wti_price?.value || d.fred?.wti?.value;
    if (wtiPrice) result.goldOilRatio = { ratio: Math.round((d.fred.gold_am.value / wtiPrice) * 100) / 100 };
  }
  return result;
}

function getCommoditiesProps(centralData) {
  const d = centralData.data || {};
  const hasV2 = d.eia || d.fred || d.yahoo || d.worldBank;
  const mapped = hasV2 ? mapV2ToLegacy(d) : {};
  return {
    priceDashboardData: d.priceDashboardData || mapped.priceDashboardData,
    futuresCurveData: d.futuresCurveData || mapped.futuresCurveData,
    sectorHeatmapData: d.sectorHeatmapData || mapped.sectorHeatmapData,
    supplyDemandData: d.supplyDemandData || mapped.supplyDemandData,
    cotData: d.cotData || mapped.cotData,
    fredCommodities: d.fredCommodities || mapped.fredCommodities,
    goldFuturesCurve: d.goldFuturesCurve || mapped.goldFuturesCurve,
    dbcEtf: d.dbcEtf || mapped.dbcEtf,
    goldOilRatio: d.goldOilRatio || mapped.goldOilRatio,
    contangoIndicator: d.contangoIndicator || mapped.contangoIndicator,
    commodityCurrencies: d.commodityCurrencies || mapped.commodityCurrencies,
    seasonalPatterns: d.seasonalPatterns || mapped.seasonalPatterns,
    enhancedData: d.eia || d.fred || d.yahoo || d.worldBank ? d : d.enhancedData,
    dataSources: d.dataSourceRegistry || d.dataSources,
    dataCoverage: d.dataSourceRegistry ? { byCategory: d.dataSourceRegistry.byCategory, bySource: d.dataSourceRegistry.bySource } : d.dataCoverage,
    fetchMetadata: d._meta ? { fetchDuration: d._meta.fetchDuration, dataSources: d._dataSources, dataFreshness: d._meta.dataFreshness, fetchedAt: d._meta.fetchedAt } : d.fetchMetadata,
    timestamps: d._timestamp ? { eia: d._timestamp, fred: d.fred?.gold_am?._lastUpdated, worldBank: d.worldBank?._lastUpdated, yahoo: d.yahoo?.dbc?._lastUpdated, lastFetch: d._timestamp } : (d.timestamps || { eia: null, fred: null, worldBank: null, yahoo: null, lastFetch: null }),
    freshness: d._timestamp ? calculateDataAge(d._timestamp) : d.freshness,
    formatTimestamp: formatTimestamp,
    getFreshnessIndicator: d._timestamp ? ((source) => calculateDataAge(d._timestamp)) : d.getFreshnessIndicator,
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function CommoditiesMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getCommoditiesProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  return (
    <div className="com-market">
      <CommoditiesDashboard
        priceDashboardData={props.priceDashboardData}
        futuresCurveData={props.futuresCurveData}
        sectorHeatmapData={props.sectorHeatmapData}
        supplyDemandData={props.supplyDemandData}
        cotData={props.cotData}
        fredCommodities={props.fredCommodities}
        goldFuturesCurve={props.goldFuturesCurve}
        dbcEtf={props.dbcEtf}
        goldOilRatio={props.goldOilRatio}
        contangoIndicator={props.contangoIndicator}
        commodityCurrencies={props.commodityCurrencies}
        seasonalPatterns={props.seasonalPatterns}
        enhancedData={props.enhancedData}
        dataSources={props.dataSources}
        dataCoverage={props.dataCoverage}
        fetchMetadata={props.fetchMetadata}
        timestamps={props.timestamps}
        freshness={props.freshness}
        formatTimestamp={props.formatTimestamp}
        getFreshnessIndicator={props.getFreshnessIndicator}
        isLive={props.isLive}
        lastUpdated={props.lastUpdated}
        fetchLog={props.fetchLog}
      />
    </div>
  );
}

export default React.memo(CommoditiesMarket);
