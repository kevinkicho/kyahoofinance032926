import React from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import { useCurrency } from '../../hub/CurrencyContext';
import { useMarketData } from '../../hub/DataContext';
import CommoditiesDashboard from './components/CommoditiesDashboard';
import { normalizeCommoditiesData } from '../../data/marketNormalizers';
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

// Yahoo futures ticker → (price-dashboard sector, sector-heatmap sector).
// SectorHeatmap.jsx uses the 4-bucket order ['Energy','Metals','Agriculture',
// 'Livestock']; PriceDashboard uses finer-grained labels for grouping. Keep
// the symbol set in sync with futuresSymbols in
// server/routes/commoditiesEnhanced.js.
const COMMODITY_SECTORS = {
  Energy:       ['CL=F', 'BZ=F', 'NG=F', 'HO=F'],
  'Precious Metals': ['GC=F', 'SI=F', 'PL=F', 'PA=F'],
  'Industrial Metals': ['HG=F'],
  Grains:       ['ZC=F', 'ZW=F', 'ZO=F', 'ZS=F', 'ZL=F', 'ZM=F'],
  Softs:        ['KC=F', 'CT=F', 'SB=F'],
  Livestock:    ['LE=F', 'GF=F', 'HE=F'],
};

// Map fine sectors → 4-bucket sector heatmap labels.
const HEATMAP_SECTOR = {
  Energy: 'Energy',
  'Precious Metals': 'Metals',
  'Industrial Metals': 'Metals',
  Grains: 'Agriculture',
  Softs: 'Agriculture',
  Livestock: 'Livestock',
};

const FUTURES_NAMES = {
  // Names must match sidebar/KPI filters (e.g. "WTI Crude Oil") and PriceDashboard labels.
  'CL=F': 'WTI Crude Oil', 'BZ=F': 'Brent Crude', 'NG=F': 'Natural Gas', 'HO=F': 'Heating Oil',
  'GC=F': 'Gold', 'SI=F': 'Silver', 'PL=F': 'Platinum', 'PA=F': 'Palladium',
  'HG=F': 'Copper',
  'ZC=F': 'Corn', 'ZW=F': 'Wheat', 'ZO=F': 'Oats', 'ZS=F': 'Soybeans', 'ZL=F': 'Soybean Oil', 'ZM=F': 'Soybean Meal',
  'KC=F': 'Coffee', 'CT=F': 'Cotton', 'SB=F': 'Sugar',
  'LE=F': 'Live Cattle', 'GF=F': 'Feeder Cattle', 'HE=F': 'Lean Hogs',
};

/**
 * Normalize a futures curve for the UI: drop null months, attach spotPrice,
 * and derive contango from the first two finite prices.
 */
function enrichFuturesCurve(curve, spotFallback) {
  if (!curve || !Array.isArray(curve.labels) || !curve.labels.length) return null;
  const pricesIn = Array.isArray(curve.prices) ? curve.prices : [];
  const pairs = curve.labels
    .map((label, i) => ({ label, price: pricesIn[i] }))
    .filter((p) => typeof p.price === 'number' && Number.isFinite(p.price));
  if (!pairs.length) return null;
  const prices = pairs.map((p) => p.price);
  const spot = (typeof curve.spotPrice === 'number' && Number.isFinite(curve.spotPrice))
    ? curve.spotPrice
    : (typeof spotFallback === 'number' && Number.isFinite(spotFallback) ? spotFallback : prices[0]);
  let contangoPct = curve.contangoPct;
  if (contangoPct == null && prices.length >= 2 && prices[0]) {
    contangoPct = Math.round(((prices[prices.length - 1] / prices[0]) - 1) * 1000) / 10;
  }
  const structure = curve.structure
    || (contangoPct == null ? null
      : contangoPct > 0.35 ? 'Contango'
      : contangoPct < -0.35 ? 'Backwardation'
      : 'Flat');
  return {
    labels: pairs.map((p) => p.label),
    prices,
    unit: curve.unit || null,
    spotPrice: spot,
    contangoPct: contangoPct ?? null,
    structure: structure ?? null,
  };
}

/** Mean of finite numbers, or null. */
function seriesMean(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * EIA weekly petroleum inventory/production series arrive as thousand barrels
 * (EIA "MBBL") while the UI charts label Million Barrels / M bbl/day.
 * Scale down when values look like thousand-unit raw EIA (stocks ≫ 2k,
 * production ≫ 100). Idempotent if already converted.
 */
function scaleEiaSeriesForDisplay(series, kind = 'stocks') {
  if (!series || typeof series !== 'object') return series;
  const values = Array.isArray(series.values) ? series.values : [];
  const latestHint = Number.isFinite(series.latest)
    ? series.latest
    : (values.length ? values[values.length - 1] : null);
  const thr = kind === 'production' ? 100 : kind === 'natgas' ? Infinity : 2000;
  const needsScale = Number.isFinite(latestHint) && latestHint >= thr;
  const scale = (v) => (Number.isFinite(v) ? Math.round((v / 1000) * 100) / 100 : v);
  const nextValues = needsScale ? values.map(scale) : values;
  let avg = series.avg5yr;
  if (needsScale && Number.isFinite(avg)) avg = scale(avg);
  if (avg == null) avg = seriesMean(nextValues);
  if (Number.isFinite(avg)) avg = Math.round(avg * 10) / 10;
  const latest = needsScale && Number.isFinite(series.latest)
    ? scale(series.latest)
    : (series.latest ?? (nextValues.length ? nextValues[nextValues.length - 1] : null));
  return {
    ...series,
    periods: Array.isArray(series.periods) ? series.periods : [],
    values: nextValues,
    avg5yr: avg,
    latest: latest ?? null,
  };
}

function seriesFromEia(eiaEntry) {
  if (!eiaEntry) return null;
  const history = Array.isArray(eiaEntry.history) ? eiaEntry.history : [];
  if (!history.length && eiaEntry.value == null) return null;
  const periods = history.map((h) => h.date);
  const values = history.map((h) => h.value);
  const avg = eiaEntry.avg ?? eiaEntry._avg5yr ?? seriesMean(values);
  return {
    periods,
    values,
    avg5yr: avg,
    latest: eiaEntry.value ?? (values.length ? values[values.length - 1] : null),
  };
}

/**
 * Build UI supplyDemandData from enhanced payload.
 * Prefer server-built `supplyDemand` (has avg5yr), fill gaps from `eia.*`,
 * then normalize EIA thousand-barrel units for display.
 */
function buildSupplyDemandData(d) {
  const fromServer = d.supplyDemand && typeof d.supplyDemand === 'object' ? d.supplyDemand : {};
  const eia = d.eia || {};

  const pick = (serverKey, eiaKey, kind) => {
    const s = fromServer[serverKey];
    const hasVals = s && Array.isArray(s.values) && s.values.length > 0;
    const raw = hasVals
      ? {
          periods: s.periods || [],
          values: s.values,
          avg5yr: s.avg5yr ?? null,
          latest: s.latest ?? s.values[s.values.length - 1],
        }
      : seriesFromEia(eia[eiaKey]);
    if (!raw) return null;
    return scaleEiaSeriesForDisplay(raw, kind);
  };

  const sd = {};
  const crudeStocks = pick('crudeStocks', 'crude_stocks', 'stocks');
  if (crudeStocks) {
    sd.crudeStocks = crudeStocks;
    sd.crudeStocksLatest = crudeStocks.latest;
  }
  const natGas = pick('natGasStorage', 'natgas_storage', 'natgas');
  if (natGas) {
    sd.natGasStorage = natGas;
    sd.natGasLatest = natGas.latest;
  }
  const prod = pick('crudeProduction', 'crude_production', 'production');
  if (prod) sd.crudeProduction = prod;
  const gas = pick('gasolineStocks', 'gasoline_stocks', 'stocks');
  if (gas) sd.gasolineStocks = gas;
  const dist = pick('distillateStocks', 'distillate_stocks', 'stocks');
  if (dist) sd.distillateStocks = dist;

  return Object.keys(sd).length > 0 ? sd : null;
}

function mapV2ToLegacy(d) {
  const result = { priceDashboardData: null, futuresCurveData: null, sectorHeatmapData: null, supplyDemandData: null, cotData: null, fredCommodities: null, goldFuturesCurve: null, dbcEtf: null, goldOilRatio: null, contangoIndicator: null, commodityCurrencies: null, seasonalPatterns: null };
  if (d.eia) {
    const eiaPrices = [];
    if (d.eia.wti_price) eiaPrices.push({ ticker: 'CL=F', name: 'WTI Crude', price: d.eia.wti_price.value, change1d: null, unit: d.eia.wti_price.unit, _source: 'EIA', _lastUpdated: d.eia.wti_price._lastUpdated });
    if (d.eia.natgas) eiaPrices.push({ ticker: 'NG=F', name: 'Natural Gas', price: d.eia.natgas.value, change1d: null, unit: d.eia.natgas.unit, _source: 'EIA', _lastUpdated: d.eia.natgas._lastUpdated });
    if (eiaPrices.length > 0) result.priceDashboardData = [{ sector: 'Energy', commodities: eiaPrices }];
  }

  // Always merge server supplyDemand + eia (prefer supplyDemand avg5yr).
  result.supplyDemandData = buildSupplyDemandData(d);
  if (d.fred) {
    const fc = {};
    const wtiH = normalizeFredSeries(d.fred.wti);
    if (wtiH) fc.wtiHistory = wtiH;
    const goldH = normalizeFredSeries(d.fred.gold_am);
    if (goldH) fc.goldHistory = goldH;
    const goldFuture = d.yahoo?.futures?.['GC=F'];
    if (!goldH && goldFuture?.price != null) {
      fc.goldLatest = {
        price: goldFuture.price,
        source: 'Yahoo Finance',
        timestamp: goldFuture._lastUpdated,
      };
    }
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

  // ─── Yahoo futures → priceDashboardData + sectorHeatmapData ───
  // Server returns yahoo.futures as a flat map keyed by ticker. The UI
  // panels expect data grouped by sector with computed sector averages.
  if (d.yahoo?.futures && Object.keys(d.yahoo.futures).length > 0) {
    const futures = d.yahoo.futures;
    const sectorEntries = [];
    for (const [sector, tickers] of Object.entries(COMMODITY_SECTORS)) {
      const commodities = tickers
        .filter(t => futures[t]?.price != null)
        .map(t => ({
          ticker: t,
          name: FUTURES_NAMES[t] || futures[t].name || t,
          price: futures[t].price,
          change1d: futures[t].change ?? null,
          _source: 'Yahoo Finance',
          _lastUpdated: futures[t]._lastUpdated,
        }));
      if (commodities.length > 0) sectorEntries.push({ sector, commodities });
    }
    if (sectorEntries.length > 0) {
      // Merge with the eia-derived energy entry (if any) — stitch by sector.
      if (result.priceDashboardData) {
        const merged = [...result.priceDashboardData];
        for (const se of sectorEntries) {
          const existing = merged.find(s => s.sector === se.sector);
          if (existing) {
            const seen = new Set(existing.commodities.map(c => c.ticker));
            existing.commodities.push(...se.commodities.filter(c => !seen.has(c.ticker)));
          } else {
            merged.push(se);
          }
        }
        result.priceDashboardData = merged;
      } else {
        result.priceDashboardData = sectorEntries;
      }

      // Sector heatmap expects a FLAT commodities array with a `sector`
      // field per row plus column keys (d1/w1/m1). We only have d1 from
      // yahoo's regular-market change, so w1 and m1 stay null.
      const flat = [];
      for (const se of sectorEntries) {
        const heatmapSector = HEATMAP_SECTOR[se.sector] || se.sector;
        for (const c of se.commodities) {
          flat.push({
            sector: heatmapSector,
            ticker: c.ticker,
            name: c.name,
            d1: c.change1d,
            w1: null,
            m1: null,
          });
        }
      }
      result.sectorHeatmapData = { commodities: flat, columns: ['d1', 'w1', 'm1'] };
    }
  }
  const goldPrice = d.fred?.gold_am?.value || d.yahoo?.futures?.['GC=F']?.price;
  if (goldPrice) {
    const wtiPrice = d.eia?.wti_price?.value || d.fred?.wti?.value || d.yahoo?.futures?.['CL=F']?.price;
    if (wtiPrice) result.goldOilRatio = { ratio: Math.round((goldPrice / wtiPrice) * 100) / 100 };
  }
  // Futures curves: strip null months + attach continuous-contract spot.
  const wtiCurve = enrichFuturesCurve(
    d.futuresCurveData,
    d.yahoo?.futures?.['CL=F']?.price ?? d.eia?.wti_price?.value,
  );
  if (wtiCurve) result.futuresCurveData = wtiCurve;
  const goldCurve = enrichFuturesCurve(
    d.goldFuturesCurve,
    d.yahoo?.futures?.['GC=F']?.price,
  );
  if (goldCurve) result.goldFuturesCurve = goldCurve;

  // Contango indicator for sidebar / price dashboard KPI.
  if (d.contangoIndicator?.contangoPct != null || d.contangoIndicator?.structure) {
    result.contangoIndicator = {
      contangoPct: d.contangoIndicator.contangoPct ?? wtiCurve?.contangoPct ?? null,
      structure: d.contangoIndicator.structure
        || wtiCurve?.structure
        || null,
    };
  } else if (wtiCurve?.contangoPct != null) {
    result.contangoIndicator = {
      contangoPct: wtiCurve.contangoPct,
      structure: wtiCurve.structure,
    };
  }

  // Pass through seasonal patterns when server provides them.
  if (d.seasonalPatterns && typeof d.seasonalPatterns === 'object') {
    result.seasonalPatterns = d.seasonalPatterns;
  }
  return result;
}

function getCommoditiesProps(centralData) {
  const d = centralData.data || {};
  const normalized = normalizeCommoditiesData(d);
  const hasV2 = !!(d.eia || d.fred || d.yahoo || d.worldBank
    || d.futuresCurveData || d.goldFuturesCurve || d.supplyDemand || d.supplyDemandData);
  const mapped = hasV2 ? mapV2ToLegacy(d) : {};
  const fredCommodities = d.fredCommodities || mapped.fredCommodities || {};
  if (!fredCommodities.goldHistory?.dates?.length && normalized.series.goldHistory?.dates?.length) {
    fredCommodities.goldHistory = normalized.series.goldHistory;
  }
  if (!fredCommodities.goldLatest && normalized.values.goldLatest != null) {
    fredCommodities.goldLatest = {
      price: normalized.values.goldLatest,
      source: d.fred?.gold_am ? 'FRED' : 'Yahoo Finance',
      timestamp: d.fred?.gold_am?._lastUpdated || d.yahoo?.futures?.['GC=F']?._lastUpdated || d._timestamp,
    };
  }
  // Gold / silver / platinum / palladium from Yahoo futures when FRED gold
  // series is retired and SLVPRUSD is unavailable — keeps Precious Metals
  // Complex ratios and Latest columns populated.
  if (!fredCommodities.goldLatest && d.yahoo?.futures?.['GC=F']?.price != null) {
    fredCommodities.goldLatest = {
      price: d.yahoo.futures['GC=F'].price,
      source: 'Yahoo Finance',
      timestamp: d.yahoo.futures['GC=F']._lastUpdated || d._timestamp,
    };
  }
  if (!fredCommodities.silverLatest && d.yahoo?.futures?.['SI=F']?.price != null) {
    fredCommodities.silverLatest = {
      price: d.yahoo.futures['SI=F'].price,
      change: d.yahoo.futures['SI=F'].change ?? null,
      source: 'Yahoo Finance',
      timestamp: d.yahoo.futures['SI=F']._lastUpdated || d._timestamp,
    };
  }
  if (!fredCommodities.platinumLatest && d.yahoo?.futures?.['PL=F']?.price != null) {
    fredCommodities.platinumLatest = {
      price: d.yahoo.futures['PL=F'].price,
      change: d.yahoo.futures['PL=F'].change ?? null,
      source: 'Yahoo Finance',
      timestamp: d.yahoo.futures['PL=F']._lastUpdated || d._timestamp,
    };
  }
  if (!fredCommodities.palladiumLatest && d.yahoo?.futures?.['PA=F']?.price != null) {
    fredCommodities.palladiumLatest = {
      price: d.yahoo.futures['PA=F'].price,
      change: d.yahoo.futures['PA=F'].change ?? null,
      source: 'Yahoo Finance',
      timestamp: d.yahoo.futures['PA=F']._lastUpdated || d._timestamp,
    };
  }
  return {
    // Prefer mapped curves (null months stripped + spotPrice) when available.
    priceDashboardData: d.priceDashboardData || mapped.priceDashboardData,
    futuresCurveData: mapped.futuresCurveData || enrichFuturesCurve(d.futuresCurveData, d.yahoo?.futures?.['CL=F']?.price),
    sectorHeatmapData: d.sectorHeatmapData || mapped.sectorHeatmapData,
    // Prefer legacy shape, then mapped v2 (merged supplyDemand+eia+unit scale),
    // then raw enhanced supplyDemand, then normalizer fallback.
    supplyDemandData: d.supplyDemandData || mapped.supplyDemandData || d.supplyDemand || normalized.values.supplyDemandData,
    cotData: d.cotData || mapped.cotData,
    fredCommodities,
    goldFuturesCurve: mapped.goldFuturesCurve || enrichFuturesCurve(d.goldFuturesCurve, d.yahoo?.futures?.['GC=F']?.price),
    dbcEtf: d.dbcEtf || mapped.dbcEtf || (d.yahoo?.dbc ? {
      price: d.yahoo.dbc.price,
      changePct: d.yahoo.dbc.change,
      ytd: d.yahoo.dbc.ytd ?? null,
      _source: d.yahoo.dbc._source,
      _lastUpdated: d.yahoo.dbc._lastUpdated,
    } : null),
    goldOilRatio: d.goldOilRatio || mapped.goldOilRatio || normalized.values.goldOilRatio,
    contangoIndicator: mapped.contangoIndicator || d.contangoIndicator,
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
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    fetchLog: centralData.fetchLog || [],
    error: centralData.error,
    refetch: centralData.refetch,
    normalized,
  };
}

function CommoditiesMarket({ centralData } = {}) {
  const { currency, currentSymbol, convert } = useCurrency();
  // Cross-market enrichment — the commodities API doesn't fetch CFTC COT
  // data or commodity-bloc FX, but those are already loaded by the
  // sentiment + fx markets. Pull them via context so the COT Positioning
  // and Commodity Currencies panels bind without server-side changes.
  const sentimentCtx = useMarketData('sentiment');
  const fxCtx = useMarketData('fx');
  if (!centralData) return <MarketSkeleton />;
  const props = getCommoditiesProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  // CFTC sentiment route returns cftcData = { commodities: [{code, netPct, longK, shortK, oiK}, ...] }.
  // CotPositioning panel expects `cotData.commodities` (a flat array, not
  // a sector tree) where each item has at least { name, netPct, longK,
  // shortK, oiK }. Pass the items through with the names normalised so
  // panel finders like `c.name === 'WTI Crude Oil'` resolve.
  const COMMODITY_NAME_MAP = {
    GC: 'Gold',
    CL: 'WTI Crude Oil',
  };
  const cotFromSentiment = (() => {
    const items = sentimentCtx?.data?.cftcData?.commodities;
    if (!Array.isArray(items) || items.length === 0) return null;
    return {
      asOf: sentimentCtx?.data?.cftcData?.asOf,
      // CotPositioning expects each row to have `latest.{noncommNet,
      // commNet, netChange, totalOI}` (in absolute contracts) and an
      // optional `history`. Sentiment route gives us long/short/oi in
      // thousands ("K") plus a netPct, so reconstruct absolute values
      // and synthesize an empty history.
      commodities: items.map(i => {
        const long  = (i.longK  ?? 0) * 1000;
        const short = (i.shortK ?? 0) * 1000;
        const oi    = (i.oiK    ?? 0) * 1000;
        return {
          ticker: i.code,
          code:   i.code,
          name:   COMMODITY_NAME_MAP[i.code] || i.name || i.code,
          netPct: i.netPct,
          longK:  i.longK,
          shortK: i.shortK,
          oiK:    i.oiK,
          history: [],
          latest: {
            noncommNet: long - short,
            commNet:    short - long,    // commercials are the mirror
            netChange:  0,                // no history → can't compute wk delta
            totalOI:    oi,
          },
        };
      }),
    };
  })();

  // FX market keeps spotRates keyed by ISO currency — derive a small
  // commodity-bloc snapshot the Currencies panel can render.
  // Server field is `changes1d` (not `changes`); UI reads `changePct`.
  const ccyFromFx = (() => {
    const rates = fxCtx?.data?.spotRates;
    const changes = fxCtx?.data?.changes1d || fxCtx?.data?.changes || {};
    if (!rates) return null;
    const out = {};
    for (const ccy of ['CAD', 'AUD', 'NOK', 'BRL', 'CLP', 'ZAR']) {
      if (rates[ccy] != null) {
        const ch = changes?.[ccy] ?? null;
        out[ccy] = { rate: rates[ccy], change1d: ch, changePct: ch };
      }
    }
    return Object.keys(out).length > 0 ? out : null;
  })();

  const cotData = props.cotData || cotFromSentiment;
  const commodityCurrencies = props.commodityCurrencies || ccyFromFx;

  return (
    // The internal "Market Summary" bento panel inside CommoditiesDashboard
    // is a superset of the old loose <CommoditiesSidebar>, so the sidebar
    // and the outer two-column grid are no longer needed.
    <div className="com-market">
      <div className="com-market-main">
        <CommoditiesDashboard
          currency={currency}
          currentSymbol={currentSymbol}
          convert={convert}
          priceDashboardData={props.priceDashboardData}
          futuresCurveData={props.futuresCurveData}
          sectorHeatmapData={props.sectorHeatmapData}
          supplyDemandData={props.supplyDemandData}
          cotData={cotData}
          fredCommodities={props.fredCommodities}
          goldFuturesCurve={props.goldFuturesCurve}
          dbcEtf={props.dbcEtf}
          goldOilRatio={props.goldOilRatio}
          contangoIndicator={props.contangoIndicator}
          commodityCurrencies={commodityCurrencies}
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
          error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent}
          isHistorical={props.isHistorical} asOfDate={props.asOfDate}
          fetchLog={props.fetchLog}
        />
      </div>
    </div>
  );
}

export default React.memo(CommoditiesMarket);
