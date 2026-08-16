// Commodities Dashboard — Dynamic tiling layout using React-Grid-Layout
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import SafeECharts from '../../../components/SafeECharts';
import PriceDashboard from './PriceDashboard';
import FuturesCurve from './FuturesCurve';
import SupplyDemand from './SupplyDemand';
import CotPositioning from './CotPositioning';
import SectorHeatmap from './SectorHeatmap';
import { MATERIAL_CATEGORIES, MATERIAL_SECTOR_COLUMNS, MATERIAL_SECTOR_EXPOSURE, STRATEGIC_MATERIALS } from '../../../data/strategicMaterials';
import PriceCharts from './PriceCharts';
import { hasFaoPriceSeries, faoPricePoints, hasEiaPetrolSeries, eiaPetrolSeriesPoints, eiaPetrolLatest, eiaPetrolSubtitle, hasUsdaAgSeries, usdaAgSummaryRows, hasUsdaFredSeries, usdaFredHistoryPoints, usdaAgSubtitle, hasUsTradeSeries, usTradeBlocs, usTradeSubtitle, physicalPressureRows as buildPhysicalPressureRows, hasPhysicalPressureRows, hasCotPositioning } from './CommoditiesLiveChips.js';
import './CommoditiesDashboard.css';

const STORAGE_KEY = 'commodities-view';

function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? saved : defaultValue;
    } catch { return defaultValue; }
  });
  const persist = (v) => {
    setValue(v);
    try { localStorage.setItem(key, v); }
    catch (e) { console.warn(`[CommoditiesDashboard] persist failed for "${key}":`, e?.message); }
  };
  return [value, persist];
}

function formatMaterialPrice(price, unit) {
  if (price == null || Number.isNaN(Number(price))) return '—';
  const decimals = Number(price) >= 100 ? 0 : 2;
  return `$${Number(price).toLocaleString(undefined, { maximumFractionDigits: decimals })}${unit ? ` ${unit}` : ''}`;
}

/** Prefer a finite number; ignore null/NaN/non-numeric. */
function finiteNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function materialRiskLabel(score) {
  if (score >= 90) return 'Severe';
  if (score >= 80) return 'High';
  if (score >= 70) return 'Elevated';
  return 'Watch';
}

function avgNumeric(values) {
  const nums = values.map(Number).filter(v => Number.isFinite(v));
  return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
}

function curveSpreadPct(curve) {
  const prices = (curve?.prices || []).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (prices.length < 2 || !prices[0]) return null;
  return ((Number(prices[prices.length - 1]) / Number(prices[0])) - 1) * 100;
}

function curveStructure(spread) {
  if (spread == null || !Number.isFinite(spread)) return 'Unavailable';
  if (spread > 0.35) return 'Contango';
  if (spread < -0.35) return 'Backwardation';
  return 'Flat';
}

function CommoditiesDashboard({
  priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
  fredCommodities, goldFuturesCurve, dbcEtf, goldOilRatio, contangoIndicator,
  commodityCurrencies, seasonalPatterns, enhancedData, dataSources, fetchMetadata,
  timestamps, freshness, formatTimestamp, getFreshnessIndicator,
  isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const [priceView, setPriceView] = usePersistedState(`${STORAGE_KEY}-priceView`, 'table');
  const [sectorView, setSectorView] = usePersistedState(`${STORAGE_KEY}-sectorView`, 'heatmap');
  const [selectedMaterialSymbol, setSelectedMaterialSymbol] = useState('Li');
  // 2026-05-04: USDA NASS, Census trade, EIA petroleum.
  const usdaCtx = useMarketData('usda');
  const tradeCtx = useMarketData('censusTrade');
  const eiaPetCtx = useMarketData('eiaPetroleum');
  const faoCtx = useMarketData('fao');

  const allCommodities = useMemo(() => {
    return priceDashboardData?.flatMap(s => s.commodities || []) || [];
  }, [priceDashboardData]);

  const formatChange = (val) => {
    if (val == null) return <span style={{ color: colors.textMuted }}>—</span>;
    const num = Number(val);
    if (isNaN(num)) return <span style={{ color: colors.textMuted }}>—</span>;
    const sign = num >= 0 ? '+' : '';
    const color = num >= 0 ? '#22c55e' : '#ef4444';
    return <span style={{ color }}>{sign}{num.toFixed(2)}%</span>;
  };


  // ── USDA ag prices: 4-line chart, last 36 months per commodity ────────
  const usdaOption = useMemo(() => {
    const rows = usdaAgSummaryRows(usdaCtx?.data);
    if (!rows.length) return null;
    const periods = rows[0].points.map(p => `${p.period.slice(0, 3)}-${String(p.year).slice(2)}`);
    const series = rows.map(s => ({
      name: s.unit ? `${s.desc} (${s.unit})` : s.desc,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: s.points.map(p => p.value),
      lineStyle: { color: s.color, width: 1.8 },
    }));
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: series.map(s => s.name), top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 28, right: 12, bottom: 24, left: 40 },
      xAxis: { type: 'category', data: periods, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(periods.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series,
    };
  }, [usdaCtx, colors]);

  // FRED fallback for USDA ag prices when NASS is unavailable (no API key).
  const USDA_FRED_KEYS = [
    { key: 'corn',     name: 'Corn',     color: '#f59e0b' },
    { key: 'wheat',    name: 'Wheat',    color: '#fbbf24' },
    { key: 'soybeans', name: 'Soybeans', color: '#10b981' },
  ];
  const usdaFredOption = useMemo(() => {
    const fred = enhancedData?.fred || {};
    const rows = USDA_FRED_KEYS.filter((m) => usdaFredHistoryPoints(fred, m.key).length > 0);
    if (!rows.length) return null;
    const dates = usdaFredHistoryPoints(fred, rows[0].key).map((p) => String(p.date).slice(0, 7));
    const series = rows.map((m) => ({
      name: `${m.name} ($/mt)`,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: usdaFredHistoryPoints(fred, m.key).map((p) => p.value),
      lineStyle: { color: m.color, width: 1.8 },
    }));
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: series.map((s) => s.name), top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 28, right: 12, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series,
    };
  }, [enhancedData, colors]);

  // ── EIA petroleum: gasoline + Henry Hub gas dual line, crude stocks ──
  const eiaPetrolOption = useMemo(() => {
    const gas = eiaPetrolSeriesPoints(eiaPetCtx?.data, 'gasoline');
    const ng = eiaPetrolSeriesPoints(eiaPetCtx?.data, 'naturalGas');
    if (!gas.length) return null;
    // Align natural-gas daily history to gasoline weekly dates (gas is the
    // anchor — weekly is easier to read at this size). Take the gas value
    // closest to each gasoline date.
    const ngByDate = new Map(ng.map(p => [p.date, p.value]));
    const gasDates = gas.slice(-78).map(p => p.date);
    const gasVals = gas.slice(-78).map(p => p.value);
    const ngVals = gasDates.map(d => {
      // Walk back up to 7 days to find a NG observation if no exact match.
      for (let off = 0; off < 7; off++) {
        const probe = new Date(d);
        probe.setUTCDate(probe.getUTCDate() - off);
        const key = probe.toISOString().slice(0, 10);
        if (ngByDate.has(key)) return ngByDate.get(key);
      }
      return null;
    });
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Gasoline ($/gal)', 'Henry Hub Gas ($/MMBtu)'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 28, right: 56, bottom: 24, left: 40 },
      xAxis: { type: 'category', data: gasDates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(gasDates.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: [
        { type: 'value', name: '$/gal', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '${value}' }, splitLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'value', name: '$/MMBtu', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, position: 'right', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '${value}' }, splitLine: { show: false } },
      ],
      series: [
        { name: 'Gasoline ($/gal)', type: 'line', yAxisIndex: 0, data: gasVals, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: 'rgba(245, 158, 11, 0.08)' } },
        { name: 'Henry Hub Gas ($/MMBtu)', type: 'line', yAxisIndex: 1, data: ngVals, smooth: true, symbol: 'none', lineStyle: { color: '#3b82f6', width: 1.6 } },
      ],
    };
  }, [eiaPetCtx, colors]);

  const petroleumKpis = useMemo(() => {
    const data = eiaPetCtx?.data || {};
    const rows = [
      {
        key: 'gasoline',
        label: 'Gasoline',
        unit: '$/gal',
        value: eiaPetrolLatest(data, 'gasoline')?.value,
        yoy: typeof data.gasoline?.yoyPct === 'number' && Number.isFinite(data.gasoline.yoyPct) ? data.gasoline.yoyPct : null,
        color: '#f59e0b',
        format: v => `$${v.toFixed(2)}`,
      },
      {
        key: 'naturalGas',
        label: 'Henry Hub',
        unit: '$/MMBtu',
        value: eiaPetrolLatest(data, 'naturalGas')?.value,
        yoy: typeof data.naturalGas?.yoyPct === 'number' && Number.isFinite(data.naturalGas.yoyPct) ? data.naturalGas.yoyPct : null,
        color: '#3b82f6',
        format: v => `$${v.toFixed(2)}`,
      },
      {
        key: 'crudeStocks',
        label: 'Crude Stocks',
        unit: 'M bbl',
        value: eiaPetrolLatest(data, 'crudeStocks')?.value,
        yoy: typeof data.crudeStocks?.yoyPct === 'number' && Number.isFinite(data.crudeStocks.yoyPct) ? data.crudeStocks.yoyPct : null,
        color: '#22c55e',
        format: v => `${(v / 1000).toFixed(0)}M`,
      },
    ];
    return rows.filter(row => row.value != null);
  }, [eiaPetCtx]);

  const physicalPressureRows = useMemo(
    () => buildPhysicalPressureRows(eiaPetCtx?.data, usdaCtx?.data, tradeCtx?.data),
    [eiaPetCtx, usdaCtx, tradeCtx],
  );

  // Live $/unit quotes for strategic materials. Prefer dashboard rows, then
  // Yahoo futures from the enhanced payload (same feed as Commodity Prices),
  // then FRED/goldLatest fallbacks. Without the enhanced path, Precious Metals
  // Complex ratios and Latest columns stay empty even when futures are live.
  const materialPriceMap = useMemo(() => {
    const map = new Map();
    const put = (ticker, price, change, name, source) => {
      if (!ticker) return;
      const p = finiteNumber(price);
      if (p == null) return;
      const prev = map.get(ticker);
      // Keep an existing quote if it already has a 1d change and the new one does not.
      if (prev && prev.change != null && change == null) return;
      map.set(ticker, {
        price: p,
        change: finiteNumber(change) ?? prev?.change ?? null,
        name: name || prev?.name || ticker,
        source: source || prev?.source || null,
      });
    };

    allCommodities.forEach(item => {
      if (!item?.ticker) return;
      put(
        item.ticker,
        item.price,
        item.change1d ?? item.change,
        item.name,
        item._source || 'Dashboard',
      );
    });

    const yahooFutures = enhancedData?.yahoo?.futures;
    if (yahooFutures && typeof yahooFutures === 'object') {
      Object.entries(yahooFutures).forEach(([ticker, q]) => {
        put(ticker, q?.price, q?.change ?? q?.changePercent, q?.name || ticker, 'Yahoo Finance');
      });
    }

    // FRED commodity map (when series is present — gold AM retired; silver series may lag).
    const fred = enhancedData?.fred || {};
    if (fred.silver?.value != null) put('SI=F', fred.silver.value, null, 'Silver', 'FRED');
    if (fred.gold_am?.value != null) put('GC=F', fred.gold_am.value, null, 'Gold', 'FRED');

    if (fredCommodities?.goldLatest?.price != null) {
      put('GC=F', fredCommodities.goldLatest.price, null, 'Gold', fredCommodities.goldLatest.source || 'FRED');
    }
    if (fredCommodities?.silverLatest?.price != null) {
      put(
        'SI=F',
        fredCommodities.silverLatest.price,
        fredCommodities.silverLatest.change,
        'Silver',
        fredCommodities.silverLatest.source || 'FRED',
      );
    }
    if (fredCommodities?.platinumLatest?.price != null) {
      put(
        'PL=F',
        fredCommodities.platinumLatest.price,
        fredCommodities.platinumLatest.change,
        'Platinum',
        fredCommodities.platinumLatest.source || 'Yahoo Finance',
      );
    }
    if (fredCommodities?.palladiumLatest?.price != null) {
      put(
        'PA=F',
        fredCommodities.palladiumLatest.price,
        fredCommodities.palladiumLatest.change,
        'Palladium',
        fredCommodities.palladiumLatest.source || 'Yahoo Finance',
      );
    }

    // Name-based fill when rows lack tickers (legacy snapshots).
    allCommodities.forEach(item => {
      const name = String(item?.name || '').toLowerCase();
      if (name.includes('gold') && !name.includes('oil')) put('GC=F', item.price, item.change1d ?? item.change, 'Gold', item._source);
      if (name === 'silver' || name.startsWith('silver ')) put('SI=F', item.price, item.change1d ?? item.change, 'Silver', item._source);
      if (name.includes('platinum')) put('PL=F', item.price, item.change1d ?? item.change, 'Platinum', item._source);
      if (name.includes('palladium')) put('PA=F', item.price, item.change1d ?? item.change, 'Palladium', item._source);
    });

    return map;
  }, [allCommodities, fredCommodities, enhancedData]);

  const strategicMaterials = useMemo(() => {
    return STRATEGIC_MATERIALS.map(material => {
      const live = material.yahoo ? materialPriceMap.get(material.yahoo) : null;
      return {
        ...material,
        livePrice: live?.price ?? null,
        liveChange: live?.change ?? null,
        liveSource: live?.source ?? null,
        riskLabel: materialRiskLabel(material.criticality),
      };
    });
  }, [materialPriceMap]);

  const criticalityRows = useMemo(() => {
    return [...strategicMaterials]
      .sort((a, b) => (b.criticality - a.criticality) || (b.importReliance - a.importReliance))
      .slice(0, 12);
  }, [strategicMaterials]);

  const batteryRows = useMemo(() => {
    const wanted = new Set(['Li', 'C', 'Ni', 'Co', 'Mn', 'Cu', 'V']);
    return strategicMaterials.filter(row => wanted.has(row.symbol));
  }, [strategicMaterials]);

  const preciousRows = useMemo(() => {
    return strategicMaterials
      .filter(row => row.category === 'precious')
      .sort((a, b) => (b.livePrice != null) - (a.livePrice != null) || b.criticality - a.criticality);
  }, [strategicMaterials]);

  const pricedPrecious = useMemo(() => {
    const bySymbol = Object.fromEntries(preciousRows.map(row => [row.symbol, row]));
    const ratio = (a, b) => {
      const num = finiteNumber(bySymbol[a]?.livePrice);
      const den = finiteNumber(bySymbol[b]?.livePrice);
      if (num == null || den == null || den === 0) return null;
      return num / den;
    };
    // Liquid futures first (live prices), then remaining PGMs by criticality.
    const ordered = [...preciousRows].sort((a, b) => {
      const aLive = a.livePrice != null ? 1 : 0;
      const bLive = b.livePrice != null ? 1 : 0;
      if (bLive !== aLive) return bLive - aLive;
      // Prefer major monetary/PGM futures order among live rows
      const rank = { Au: 0, Ag: 1, Pt: 2, Pd: 3 };
      const ar = rank[a.symbol] ?? 50;
      const br = rank[b.symbol] ?? 50;
      if (ar !== br) return ar - br;
      return b.criticality - a.criticality;
    });
    return {
      rows: ordered,
      liveCount: ordered.filter(r => r.livePrice != null).length,
      ratios: [
        { label: 'Gold / Silver', value: ratio('Au', 'Ag'), unit: 'x' },
        { label: 'Platinum / Gold', value: ratio('Pt', 'Au'), unit: 'x' },
        { label: 'Palladium / Platinum', value: ratio('Pd', 'Pt'), unit: 'x' },
        { label: 'Gold / Platinum', value: ratio('Au', 'Pt'), unit: 'x' },
      ],
    };
  }, [preciousRows]);

  const selectedMaterial = useMemo(() => {
    return strategicMaterials.find(row => row.symbol === selectedMaterialSymbol) || strategicMaterials[0] || null;
  }, [strategicMaterials, selectedMaterialSymbol]);

  const commodityByTicker = useMemo(() => {
    return Object.fromEntries(allCommodities.map(item => [item.ticker, item]));
  }, [allCommodities]);

  // Prefer 1d change; fall back to 1w / 1m when Yahoo quote change is null
  // (chart-only or FRED rows). Keeps Sector pulse + Regime from all zeros.
  const rowChange = (row) => {
    const v = row?.change1d ?? row?.change ?? row?.d1 ?? row?.change1w ?? row?.w1 ?? row?.change1m ?? row?.m1;
    return finiteNumber(v);
  };

  const sectorPulseRows = useMemo(() => {
    return (priceDashboardData || []).map(sector => {
      const commodities = sector.commodities || [];
      const changes = commodities.map(rowChange).filter(v => v != null);
      const avg1d = avgNumeric(changes);
      const advancers = changes.filter(v => v > 0).length;
      return {
        sector: sector.sector,
        count: commodities.length,
        avg1d,
        breadth: changes.length ? (advancers / changes.length) * 100 : null,
      };
    }).filter(row => row.count > 0);
  }, [priceDashboardData]);

  const regimeSnapshot = useMemo(() => {
    const sectorAvg = (names) => avgNumeric(
      (priceDashboardData || [])
        .filter(s => names.includes(s.sector))
        .flatMap(s => (s.commodities || []).map(rowChange))
    );
    const energy = sectorAvg(['Energy']);
    const metals = sectorAvg(['Precious Metals', 'Industrial Metals', 'Metals']);
    const ag = sectorAvg(['Grains', 'Softs', 'Agriculture']);
    const gold = rowChange(commodityByTicker['GC=F']) ?? 0;
    const copper = rowChange(commodityByTicker['HG=F']) ?? 0;
    const crude = rowChange(commodityByTicker['CL=F']) ?? 0;
    const breadth = avgNumeric(sectorPulseRows.map(row => row.breadth));
    let label = 'Mixed';
    let read = 'Cross-commodity signals are not aligned.';
    if ((energy ?? 0) > 1 && (metals ?? 0) > 0.5) {
      label = 'Inflationary';
      read = 'Energy and metals are rising together.';
    } else if ((crude ?? 0) > 1.5 && copper < 0) {
      label = 'Supply Shock';
      read = 'Oil strength is not confirmed by growth metals.';
    } else if (gold > 0.75 && copper < 0) {
      label = 'Safe Haven';
      read = 'Precious metals are leading cyclicals.';
    } else if ((energy ?? 0) < -1 && (metals ?? 0) < -0.5 && (ag ?? 0) < 0) {
      label = 'Disinflationary';
      read = 'Major commodity groups are soft together.';
    } else if (copper > 0.75 && (breadth ?? 0) >= 55) {
      label = 'Growth-Led';
      read = 'Cyclical metals and breadth are constructive.';
    }
    return { label, read, energy, metals, ag, breadth };
  }, [priceDashboardData, commodityByTicker, sectorPulseRows]);

  const energyStackRows = useMemo(() => {
    const rows = [
      { label: 'WTI crude', ticker: 'CL=F', unit: '$/bbl' },
      { label: 'Brent crude', ticker: 'BZ=F', unit: '$/bbl' },
      { label: 'Natural gas', ticker: 'NG=F', unit: '$/MMBtu' },
      { label: 'Heating oil', ticker: 'HO=F', unit: '$/gal' },
    ].map(row => {
      const live = commodityByTicker[row.ticker] || {};
      return {
        ...row,
        price: live.price,
        change: live.change1d,
        read: live.change1d == null ? 'No live read' : Number(live.change1d) >= 1 ? 'Firm' : Number(live.change1d) <= -1 ? 'Soft' : 'Stable',
      };
    });
    const crudeStocks = eiaPetCtx?.data?.crudeStocks;
    if (crudeStocks?.latest?.value != null) {
      rows.push({
        label: 'Crude stocks',
        unit: 'M bbl',
        price: Number(crudeStocks.latest.value) / 1000,
        change: crudeStocks.yoyPct,
        read: crudeStocks.yoyPct != null && Number(crudeStocks.yoyPct) > 0 ? 'Looser YoY' : 'Tighter YoY',
      });
    }
    return rows;
  }, [commodityByTicker, eiaPetCtx]);

  const curveBoardRows = useMemo(() => {
    return [
      { market: 'WTI crude', curve: futuresCurveData, unit: futuresCurveData?.unit || '$/bbl' },
      { market: 'Gold', curve: goldFuturesCurve, unit: goldFuturesCurve?.unit || '$/oz' },
    ].map(row => {
      const finite = (row.curve?.prices || []).filter((v) => typeof v === 'number' && Number.isFinite(v));
      const spread = curveSpreadPct(row.curve);
      const spot = (typeof row.curve?.spotPrice === 'number' && Number.isFinite(row.curve.spotPrice))
        ? row.curve.spotPrice
        : (finite[0] ?? null);
      return {
        ...row,
        spot,
        contracts: finite.length || row.curve?.labels?.length || 0,
        spread,
        structure: row.curve?.structure || curveStructure(spread),
      };
    });
  }, [futuresCurveData, goldFuturesCurve]);

  const exposureRows = useMemo(() => {
    return strategicMaterials
      .filter(row => MATERIAL_SECTOR_EXPOSURE[row.symbol]?.length)
      .sort((a, b) => b.criticality - a.criticality)
      .slice(0, 18);
  }, [strategicMaterials]);

  // ── US trade balance per bloc — line chart, 24 months ─────────────────
  const tradeOption = useMemo(() => {
    const rows = usTradeBlocs(tradeCtx?.data);
    if (!rows.length) return null;
    const world = rows.find(b => b.code === '-') || rows[0];
    const periods = world.points.map(p => p.month);
    if (!periods.length) return null;
    const palette = ['#94a3b8', '#22d3ee', '#f59e0b', '#10b981', '#a78bfa', '#ec4899'];
    const series = rows.map((b, i) => {
      const byMonth = new Map(b.points.map(p => [p.month, p.balanceB]));
      return {
        name: b.label,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { color: palette[i % palette.length], width: b.code === '-' ? 2.4 : 1.4 },
        data: periods.map(m => (byMonth.has(m) ? byMonth.get(m) : null)),
      };
    });
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: v => (typeof v === 'number' && Number.isFinite(v)) ? ((v >= 0 ? '+' : '') + '$' + v.toFixed(1) + 'B') : '—' },
      legend: { top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 12, bottom: 24, left: 48 },
      xAxis: { type: 'category', data: periods, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(periods.length / 8)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', name: '$B', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v >= 0 ? '+' : ''}${v}` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series,
    };
  }, [tradeCtx, colors]);

  // WTI vs Brent overlay option
  const wtiBrentOption = useMemo(() => {
    const wtiH = fredCommodities?.wtiHistory;
    const brentH = fredCommodities?.brentHistory;
    if (!wtiH?.dates?.length || !brentH?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
      },
      legend: {
        data: ['WTI', 'Brent'],
        textStyle: { color: colors.textMuted, fontSize: 10 },
        top: 0, right: 0,
      },
      grid: { top: 24, right: 8, bottom: 24, left: 44, containLabel: false },
      xAxis: {
        type: 'category',
        data: wtiH.dates,
        axisLine: { lineStyle: { color: colors.cardBg } },
        axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(wtiH.dates.length / 6) },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: colors.cardBg } },
        axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
      },
      series: [
        { name: 'WTI', type: 'line', data: wtiH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ca8a04' }, itemStyle: { color: '#ca8a04' } },
        { name: 'Brent', type: 'line', data: brentH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#60a5fa' }, itemStyle: { color: '#60a5fa' } },
      ],
    };
  }, [fredCommodities, colors]);

  // RGL uses x, y, w, h. 12-column system.
  const layout = {
    lg: [
      { i: 'sidebar', x: 8, y: 0, w: 4, h: 4 },
      { i: 'prices',  x: 0, y: 0, w: 8, h: 4 },
      { i: 'futures', x: 8, y: 4, w: 4, h: 4 },
      // Sector Performance was h:3 — bumped to h:6 so the Sector Avg 1d%
      // bars and PPI mini-chart fit underneath the heatmap/table without
      // getting clipped or wrapping.
      { i: 'sector',  x: 0, y: 4, w: 4, h: 6 },
      { i: 'supply',  x: 4, y: 4, w: 4, h: 3 },
      { i: 'wti-brent', x: 4, y: 7, w: 4, h: 3 },
      { i: 'cot',     x: 8, y: 8, w: 4, h: 3 },
      { i: 'comfx',   x: 0, y: 10, w: 4, h: 3 },
      // 2026-05-04 additions: USDA ag prices, EIA petroleum, US trade.
      { i: 'usda-ag',     x: 0, y: 11, w: 6, h: 4 },
      { i: 'eia-petrol',  x: 6, y: 11, w: 6, h: 4 },
      { i: 'us-trade',    x: 0, y: 15, w: 12, h: 4 },
      { i: 'physical-pressure', x: 0, y: 19, w: 12, h: 3 },
      { i: 'materials-grid', x: 0, y: 22, w: 8, h: 5 },
      { i: 'criticality', x: 8, y: 22, w: 4, h: 5 },
      { i: 'battery-chain', x: 0, y: 27, w: 6, h: 4 },
      { i: 'precious-complex', x: 6, y: 27, w: 6, h: 4 },
      { i: 'regime', x: 0, y: 31, w: 4, h: 3 },
      { i: 'energy-stack', x: 4, y: 31, w: 4, h: 3 },
      { i: 'curve-board', x: 8, y: 31, w: 4, h: 3 },
      { i: 'material-detail', x: 0, y: 34, w: 4, h: 4 },
      { i: 'exposure-matrix', x: 4, y: 34, w: 8, h: 4 },
      { i: 'fao-prices', x: 0, y: 38, w: 6, h: 3 },
    ]
  };

  // Compose independent panels via MarketPanelGrid bridge (__render).
  const panelBodies = {
        sidebar: (
          <div className="com-summary">
            <div className="com-sidebar-section">
              <div className="com-sidebar-title">Key Prices</div>
              <div className="com-sidebar-list">
                {(() => {
                  const keyRows = allCommodities.filter(c =>
                    ['GC=F', 'CL=F', 'NG=F'].includes(c.ticker)
                    || ['Gold', 'WTI Crude Oil', 'WTI Crude', 'Natural Gas'].includes(c.name)
                  );
                  if (!keyRows.length) {
                    return <div className="com-sidebar-empty">No live prices yet</div>;
                  }
                  return keyRows.map(c => (
                    <div key={c.ticker || c.name} className="com-sidebar-item">
                      <span className="com-sidebar-label">{c.name}</span>
                      <div className="com-sidebar-value-row">
                        <span className="com-sidebar-value">
                          {c.price != null ? Number(c.price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                        </span>
                        <span className="com-sidebar-change">{formatChange(c.change1d)}</span>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="com-sidebar-section">
              <div className="com-sidebar-title">Indicators</div>
              <div className="com-sidebar-list">
                <div className="com-sidebar-item">
                  <span className="com-sidebar-label">Gold/Oil Ratio</span>
                  <span className="com-sidebar-value">
                    {goldOilRatio?.ratio != null ? Number(goldOilRatio.ratio).toFixed(1) : '—'}
                  </span>
                </div>
                <div className="com-sidebar-item">
                  <span className="com-sidebar-label">DBC ETF</span>
                  <div className="com-sidebar-value-row">
                    <span className="com-sidebar-value">
                      {dbcEtf?.price != null ? Number(dbcEtf.price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </span>
                    <span className="com-sidebar-change">{formatChange(dbcEtf?.changePct)}</span>
                  </div>
                </div>
                <div className="com-sidebar-item">
                  <span className="com-sidebar-label">WTI Curve</span>
                  {(() => {
                    let structure = contangoIndicator?.structure || null;
                    if (!structure && contangoIndicator?.contangoPct != null) {
                      const pct = contangoIndicator.contangoPct;
                      structure = pct > 0.35 ? 'Contango' : pct < -0.35 ? 'Backwardation' : 'Flat';
                    }
                    const cls = structure === 'Contango' ? 'structure-contango'
                      : structure === 'Backwardation' ? 'structure-backwardation'
                      : structure === 'Flat' ? 'structure-flat' : '';
                    return (
                      <div className="com-sidebar-value-row">
                        <span className={`com-sidebar-value ${cls}`}>{structure || '—'}</span>
                        {contangoIndicator?.contangoPct != null && (
                          <span className="com-sidebar-change">
                            {formatChange(contangoIndicator.contangoPct)}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="com-sidebar-section">
              <div className="com-sidebar-title">COT Net Positions</div>
              <div className="com-sidebar-list">
                {/* Cross-market enrichment: { commodities: [...] } or legacy sector tree */}
                {(() => {
                  const rows = (Array.isArray(cotData)
                    ? cotData.flatMap(s => s.commodities || [])
                    : (cotData?.commodities || [])
                  ).slice(0, 5);
                  if (!rows.length) {
                    return <div className="com-sidebar-empty">Load Sentiment for COT</div>;
                  }
                  return rows.map(c => {
                    const net = c.netPct ?? c.netPosition;
                    return (
                      <div key={c.ticker || c.code || c.name} className="com-sidebar-item">
                        <span className="com-sidebar-label">{c.name}</span>
                        <span className={`com-sidebar-value ${net != null ? (net >= 0 ? 'pos' : 'neg') : ''}`}>
                          {c.netPct != null
                            ? `${c.netPct >= 0 ? '+' : ''}${Number(c.netPct).toFixed(1)}%`
                            : (c.netPosition != null
                              ? `${c.netPosition > 0 ? '+' : ''}${Number(c.netPosition).toLocaleString()}`
                              : '—')}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ),

        prices: (
          <>
            <div
              className="bento-inline-title-actions"
              style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button className={`com-toggle-btn ${priceView === 'table' ? 'com-toggle-active' : ''}`} onClick={() => setPriceView('table')}>Table</button>
              <button className={`com-toggle-btn ${priceView === 'chart' ? 'com-toggle-active' : ''}`} onClick={() => setPriceView('chart')}>Charts</button>
            </div>
            {priceView === 'table' ? (
              <PriceDashboard priceDashboardData={priceDashboardData} dbcEtf={dbcEtf} fredCommodities={fredCommodities} goldOilRatio={goldOilRatio} contangoIndicator={contangoIndicator} commodityCurrencies={commodityCurrencies} enhancedData={enhancedData} lastUpdated={lastUpdated} />
            ) : (
              <PriceCharts priceDashboardData={priceDashboardData} allCommodities={allCommodities} colors={colors} formatChange={formatChange} />
            )}
          </>
        ),

        futures: (
          <FuturesCurve futuresCurveData={futuresCurveData} goldFuturesCurve={goldFuturesCurve} fredCommodities={fredCommodities} seasonalPatterns={seasonalPatterns} />
        ),

        sector: (
          <>
            <div
              className="bento-inline-title-actions"
              style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button className={`com-toggle-btn ${sectorView === 'heatmap' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('heatmap')}>Heatmap</button>
              <button className={`com-toggle-btn ${sectorView === 'table' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('table')}>Table</button>
            </div>
            <SectorHeatmap sectorHeatmapData={sectorHeatmapData} fredCommodities={fredCommodities} view={sectorView} />
          </>
        ),

        supply: (
          <SupplyDemand supplyDemandData={supplyDemandData} fredCommodities={fredCommodities} lastUpdated={lastUpdated} />
        ),

        'wti-brent': (
          wtiBrentOption ? (
            <div style={{ height: '100%', width: '100%', padding: '0 8px 8px 8px', boxSizing: 'border-box' }}>
              <SafeECharts
                option={wtiBrentOption}
                style={{ height: '100%', width: '100%' }}
                sourceInfo={{
                  title: 'WTI vs Brent Crude',
                  source: 'FRED',
                  endpoint: '/api/commodities',
                  series: [{ id: 'DCOILWTICO' }, { id: 'DCOILBRENTEU' }],
                  updatedAt: lastUpdated
                }}
              />
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>WTI / Brent history loading…</div>
          )
        ),

        cot: (
          <CotPositioning cotData={cotData} lastUpdated={lastUpdated} />
        ),

        comfx: (
          <div className="com-fx-panel">
            <div className="com-fx-table">
              <div className="com-fx-row header">
                <span>Currency</span>
                <span style={{ textAlign: 'right' }}>Rate</span>
                <span style={{ textAlign: 'right' }}>1d %</span>
              </div>
              {commodityCurrencies && Object.keys(commodityCurrencies).length > 0 ? (
                Object.entries(commodityCurrencies).map(([cur, data]) => {
                  const meta = {
                    CAD: 'Canada · oil / lumber',
                    AUD: 'Australia · metals / coal',
                    NOK: 'Norway · crude',
                    BRL: 'Brazil · softs / iron',
                    CLP: 'Chile · copper',
                    ZAR: 'S. Africa · PGM / gold',
                  };
                  return (
                    <div key={cur} className="com-fx-row">
                      <span className="com-fx-name">
                        <span className="com-fx-code">{cur}</span>
                        <span className="com-fx-desc">{meta[cur] || 'Commodity bloc'}</span>
                      </span>
                      <span className="com-fx-rate">
                        {data.rate != null ? Number(data.rate).toFixed(4) : '—'}
                      </span>
                      <span className="com-fx-change">
                        {formatChange(data.changePct ?? data.change1d)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="com-sidebar-empty" style={{ padding: '12px 10px' }}>
                  No FX rates — open FX market or wait for spot load
                </div>
              )}
            </div>
            <div className="com-fx-footer">Units per USD · positive = USD stronger vs commodity currency</div>
          </div>
        ),

        'usda-ag': (
          (usdaOption || usdaFredOption)
            ? <SafeECharts option={usdaOption || usdaFredOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'USDA Ag Commodity Prices', source: usdaOption ? 'USDA NASS Quick Stats' : 'FRED', endpoint: usdaOption ? '/api/usda' : '/api/commodities', series: [], updatedAt: usdaOption ? (usdaCtx?.lastUpdated || lastUpdated) : lastUpdated }} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>USDA ag prices unavailable — no USDA key and no FRED fallback</div>
        ),

        'eia-petrol': (
          hasEiaPetrolSeries(eiaPetCtx?.data) ? (
            <div style={{ display: 'grid', gridTemplateRows: petroleumKpis.length ? 'auto 1fr' : '1fr', gap: 8, height: '100%', minHeight: 0 }}>
              {petroleumKpis.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${petroleumKpis.length}, minmax(0, 1fr))`, gap: 8 }}>
                  {petroleumKpis.map(kpi => (
                    <div key={kpi.key} style={{ padding: '6px 8px', minWidth: 0, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{kpi.label}</div>
                      <div style={{ color: kpi.color, fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{kpi.format(Number(kpi.value))}</div>
                      <div style={{ color: kpi.yoy == null ? 'var(--text-muted)' : kpi.yoy >= 0 ? '#22c55e' : '#f87171', fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                        {kpi.yoy != null ? `${kpi.yoy >= 0 ? '+' : ''}${Number(kpi.yoy).toFixed(1)}% YoY` : kpi.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ minHeight: 0 }}>
                <SafeECharts option={eiaPetrolOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'EIA Petroleum & Natural Gas', source: 'EIA', endpoint: '/api/eia-petroleum', series: [{ id: 'EMM_EPMR_PTE_NUS_DPG' }, { id: 'RNGWHHD' }, { id: 'WCRSTUS1' }], updatedAt: eiaPetCtx?.lastUpdated || lastUpdated }} />
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>EIA petroleum series loading…</div>
          )
        ),

        'us-trade': tradeOption ? (
          <SafeECharts option={tradeOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'US Trade Balance', source: 'US Census Bureau', endpoint: '/api/census-trade', series: [], updatedAt: tradeCtx?.lastUpdated || lastUpdated }} />
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>US trade balance unavailable</div>
        ),

        'physical-pressure': (
          physicalPressureRows.length > 0 ? (
            <table className="com-table com-pressure-table">
              <thead>
                <tr>
                  <th className="com-th" style={{ textAlign: 'left' }}>Indicator</th>
                  <th className="com-th com-pressure-latest-col">Latest</th>
                  <th className="com-th">Pressure</th>
                  <th className="com-th">Read</th>
                </tr>
              </thead>
              <tbody>
                {physicalPressureRows.map(row => (
                  <tr key={row.market} className="com-row">
                    <td className="com-cell" style={{ textAlign: 'left' }}>{row.market}</td>
                    <td className="com-cell com-pressure-latest">
                      <span className="com-pressure-value">{row.value}</span>
                      <span className="com-pressure-unit">{row.unit || ''}</span>
                    </td>
                    <td
                      className="com-cell"
                      style={{
                        color: ['Tighter', 'Inflationary', 'Upward', 'Import demand'].includes(row.pressure)
                          ? '#f59e0b'
                          : '#22c55e',
                      }}
                    >
                      {row.pressure}
                    </td>
                    <td className="com-cell" style={{ color: 'var(--text-muted)' }}>{row.read}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16, textAlign: 'center' }}>No physical supply indicators available</div>
          )
        ),

        'materials-grid': (
          <>
          <div className="com-material-legend">
            {Object.entries(MATERIAL_CATEGORIES).map(([key, meta]) => (
              <span key={key} className="com-material-legend-item">
                <span className="com-material-dot" style={{ background: meta.color }} />
                {meta.label}
              </span>
            ))}
          </div>
          <div className="com-periodic-grid">
            {strategicMaterials.map(material => {
              const category = MATERIAL_CATEGORIES[material.category] || MATERIAL_CATEGORIES.industrial;
              return (
                <div
                  key={material.symbol}
                  className={`com-periodic-tile${selectedMaterial?.symbol === material.symbol ? ' selected' : ''}`}
                  style={{ gridColumn: material.group, gridRow: material.period, borderColor: category.color }}
                  title={`${material.name}: ${material.uses.join(', ')}; top producer ${material.topProducer}`}
                  onClick={() => setSelectedMaterialSymbol(material.symbol)}
                >
                  <div className="com-periodic-symbol" style={{ color: category.color }}>{material.symbol}</div>
                  <div className="com-periodic-name">{material.name}</div>
                  <div className="com-periodic-risk">{material.riskLabel} {material.criticality}</div>
                </div>
              );
            })}
          </div>
          </>
        ),

        criticality: (
          <table className="com-material-table com-critical-table">
            <thead>
              <tr>
                <th className="com-critical-rank-col">#</th>
                <th>Material</th>
                <th>Score</th>
                <th>Import</th>
                <th>Top Producer</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {criticalityRows.map((row, idx) => (
                <tr key={row.symbol}>
                  <td className="com-critical-rank-col">{idx + 1}</td>
                  <td>
                    <span className="com-critical-symbol">{row.symbol}</span>
                    {' '}
                    <span className="com-critical-name">{row.name}</span>
                  </td>
                  <td>
                    <div className="com-critical-score">
                      <span>{row.criticality}</span>
                      <div className="com-critical-bar" aria-hidden="true">
                        <span style={{ width: `${row.criticality}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>{row.importReliance}%</td>
                  <td>{row.topProducer}</td>
                  <td style={{ color: row.criticality >= 90 ? '#f87171' : row.criticality >= 75 ? '#f59e0b' : 'var(--text-muted)' }}>
                    {row.riskLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),

        'battery-chain': (
          <table className="com-material-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Proxy</th>
                <th>Latest</th>
                <th>Risk</th>
                {MATERIAL_SECTOR_COLUMNS.slice(0, 3).map(col => <th key={col.key}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {batteryRows.map(row => {
                const exposures = new Set(MATERIAL_SECTOR_EXPOSURE[row.symbol] || []);
                return (
                  <tr key={row.symbol}>
                    <td><strong>{row.symbol}</strong> {row.name}</td>
                    <td>{row.proxy}</td>
                    <td>{formatMaterialPrice(row.livePrice, row.yahoo ? '/contract' : '')}</td>
                    <td style={{ color: row.criticality >= 90 ? '#f87171' : '#f59e0b' }}>{row.riskLabel}</td>
                    {MATERIAL_SECTOR_COLUMNS.slice(0, 3).map(col => (
                      <td key={col.key} className={exposures.has(col.key) ? 'com-material-hit' : ''}>{exposures.has(col.key) ? 'yes' : '-'}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ),

        'precious-complex': (
          <>
          <div className="com-ratio-grid">
            {pricedPrecious.ratios.map(row => (
              <div key={row.label} className="com-ratio-card">
                <span>{row.label}</span>
                <strong className={row.value == null ? 'com-ratio-empty' : ''}>
                  {row.value != null ? `${row.value.toFixed(2)}${row.unit || ''}` : '—'}
                </strong>
              </div>
            ))}
          </div>
          <table className="com-material-table com-precious-table">
            <thead>
              <tr>
                <th>Metal</th>
                <th>Latest</th>
                <th>1d</th>
                <th>Primary Use</th>
                <th>Import</th>
                <th>Risk</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {pricedPrecious.rows.map(row => (
                <tr key={row.symbol} className={row.livePrice == null ? 'com-precious-meta-only' : ''}>
                  <td>
                    <span className="com-critical-symbol">{row.symbol}</span>
                    {' '}
                    <span className="com-critical-name">{row.name}</span>
                  </td>
                  <td className="com-price">
                    {row.livePrice != null
                      ? formatMaterialPrice(row.livePrice, '/oz')
                      : '—'}
                  </td>
                  <td className={row.liveChange == null ? '' : Number(row.liveChange) >= 0 ? 'com-up' : 'com-down'}>
                    {row.liveChange == null
                      ? '—'
                      : `${Number(row.liveChange) >= 0 ? '+' : ''}${Number(row.liveChange).toFixed(2)}%`}
                  </td>
                  <td>{row.uses?.[0] || '—'}</td>
                  <td>{row.importReliance != null ? `${row.importReliance}%` : '—'}</td>
                  <td style={{ color: row.criticality >= 90 ? '#f87171' : row.criticality >= 75 ? '#f59e0b' : 'var(--text-muted)' }}>
                    {row.riskLabel}
                  </td>
                  <td className="com-source-cell">
                    {row.liveSource || (row.yahoo ? row.yahoo : row.proxy) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        ),

        regime: (
          <>
          <div className="com-regime-hero">
            <span>Current Regime</span>
            <strong>{regimeSnapshot.label}</strong>
            <em>{regimeSnapshot.read}</em>
          </div>
          <div className="com-regime-grid">
            {[
              ['Energy', regimeSnapshot.energy],
              ['Metals', regimeSnapshot.metals],
              ['Ags', regimeSnapshot.ag],
              ['Breadth', regimeSnapshot.breadth],
            ].map(([label, value]) => (
              <div key={label} className="com-regime-cell">
                <span>{label}</span>
                <strong className={value == null ? '' : Number(value) >= 0 ? 'com-up' : 'com-down'}>
                  {value == null ? '-' : label === 'Breadth' ? `${Number(value).toFixed(0)}%` : `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`}
                </strong>
              </div>
            ))}
          </div>
          </>
        ),

        'energy-stack': (
          <table className="com-material-table">
            <thead><tr><th>Signal</th><th>Latest</th><th>Move</th><th>Read</th></tr></thead>
            <tbody>
              {energyStackRows.map(row => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.price != null ? Number(row.price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}</td>
                  <td className={row.change == null ? '' : Number(row.change) >= 0 ? 'com-up' : 'com-down'}>
                    {row.change == null ? '-' : `${Number(row.change) >= 0 ? '+' : ''}${Number(row.change).toFixed(2)}%`}
                  </td>
                  <td>{row.read}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),

        'curve-board': (
          <div className="com-curve-board">
            {curveBoardRows.map(row => (
              <div key={row.market} className="com-curve-board-row">
                <div>
                  <strong>{row.market}</strong>
                  <span>{row.contracts} contracts</span>
                </div>
                <div>
                  <strong className={row.structure === 'Backwardation' ? 'com-up' : row.structure === 'Contango' ? 'com-down' : ''}>{row.structure}</strong>
                  <span>{row.spread == null ? '-' : `${row.spread >= 0 ? '+' : ''}${row.spread.toFixed(1)}% front-to-back`}</span>
                </div>
              </div>
            ))}
          </div>
        ),

        'material-detail': (
          selectedMaterial ? (
            <div className="com-material-detail">
              <div className="com-material-detail-head">
                <strong>{selectedMaterial.symbol}</strong>
                <div>
                  <span>{selectedMaterial.name}</span>
                  <em>{MATERIAL_CATEGORIES[selectedMaterial.category]?.label || selectedMaterial.category}</em>
                </div>
              </div>
              <div className="com-material-detail-grid">
                <span>Criticality</span><strong>{selectedMaterial.criticality} / 100</strong>
                <span>Import Reliance</span><strong>{selectedMaterial.importReliance}%</strong>
                <span>Top Producer</span><strong>{selectedMaterial.topProducer}</strong>
                <span>Top Processor</span><strong>{selectedMaterial.topProcessor}</strong>
                <span>Price Proxy</span><strong>{selectedMaterial.proxy}</strong>
                <span>Latest</span><strong>{formatMaterialPrice(selectedMaterial.livePrice, selectedMaterial.yahoo ? '' : '')}</strong>
              </div>
              <div className="com-material-use-list">
                {selectedMaterial.uses.map(use => <span key={use}>{use}</span>)}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>Click a material in the periodic grid</div>
          )
        ),

        'exposure-matrix': (
          <table className="com-material-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Risk</th>
                {MATERIAL_SECTOR_COLUMNS.map(col => <th key={col.key}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {exposureRows.map(row => {
                const exposures = new Set(MATERIAL_SECTOR_EXPOSURE[row.symbol] || []);
                return (
                  <tr key={row.symbol}>
                    <td><strong>{row.symbol}</strong> {row.name}</td>
                    <td>{row.criticality}</td>
                    {MATERIAL_SECTOR_COLUMNS.map(col => (
                      <td key={col.key} className={exposures.has(col.key) ? 'com-material-hit' : ''}>{exposures.has(col.key) ? 'yes' : '-'}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ),

        'fao-prices': (
          hasFaoPriceSeries(faoCtx?.data) ? (
            <div style={{ height: '100%', minHeight: 0, padding: 4 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary, #eee)' }}>
                  {faoPricePoints(faoCtx?.data).at(-1)?.value.toFixed(1)}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #666)' }}>index · {faoPricePoints(faoCtx?.data).at(-1)?.date}</span>
              </div>
              <div style={{ height: 'calc(100% - 30px)', minHeight: 0 }}>
                <SafeECharts
                  option={{
                    animation: false, backgroundColor: 'transparent',
                    grid: { left: 40, right: 8, top: 8, bottom: 20 },
                    xAxis: { type: 'category', data: faoPricePoints(faoCtx?.data).map(s => s.date), axisLabel: { fontSize: 9, color: '#888', interval: Math.floor(faoPricePoints(faoCtx?.data).length / 5) } },
                    yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#888' }, splitLine: { lineStyle: { color: '#222' } } },
                    tooltip: { trigger: 'axis' },
                    series: [{ type: 'line', data: faoPricePoints(faoCtx?.data).map(s => s.value), smooth: true, symbol: 'none', lineStyle: { color: '#22c55e', width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#22c55e40' }, { offset: 1, color: '#22c55e05' }] } } }],
                  }}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{ title: 'FAO Food Price Index', source: 'FAO', endpoint: '/api/fao', series: [] }}
                />
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>FAO food price index loading…</div>
          )
        ),
  };

  const panelCtx = {
    __render: (panelId) => panelBodies[panelId] ?? null,
    __live: {
      sidebar: !!(cotData || allCommodities.length || dbcEtf),
      prices: !!priceDashboardData,
      futures: !!futuresCurveData,
      sector: !!sectorHeatmapData,
      supply: !!supplyDemandData,
      'wti-brent': !!(fredCommodities?.wtiHistory && fredCommodities?.brentHistory),
      cot: hasCotPositioning(cotData),
      comfx: !!commodityCurrencies,
      'usda-ag': !!(hasUsdaAgSeries(usdaCtx?.data) || hasUsdaFredSeries(enhancedData?.fred)),
      'eia-petrol': hasEiaPetrolSeries(eiaPetCtx?.data),
      'us-trade': hasUsTradeSeries(tradeCtx?.data),
      'physical-pressure': hasPhysicalPressureRows(eiaPetCtx?.data, usdaCtx?.data, tradeCtx?.data),
      'materials-grid': materialPriceMap.size > 0,
      criticality: true,
      'battery-chain': materialPriceMap.size > 0,
      'precious-complex': pricedPrecious.liveCount > 0,
      regime: !!priceDashboardData,
      'energy-stack': !!(priceDashboardData || eiaPetCtx?.data),
      'curve-board': !!(futuresCurveData || goldFuturesCurve),
      'material-detail': !!selectedMaterial,
      'exposure-matrix': true,
      'fao-prices': hasFaoPriceSeries(faoCtx?.data),
    },
    __subtitle: {
      prices: (
        <>
          Live futures + EIA + FRED
          {freshness && (
            <span className="com-freshness-dot" style={{ color: freshness.color }}> · {freshness.label}</span>
          )}
        </>
      ),
      'wti-brent': '1 Year (FRED daily)',
      'usda-ag': usdaAgSubtitle(usdaCtx?.data)
        || (hasUsdaFredSeries(enhancedData?.fred)
          ? 'FRED fallback · Corn/Wheat/Soybeans ($/mt)'
          : 'Corn / Soybeans / Wheat / Cattle · price received · USDA NASS'),
      'eia-petrol': eiaPetrolSubtitle(eiaPetCtx?.data) || 'Retail gasoline · Henry Hub spot · weekly',
      'us-trade': usTradeSubtitle(tradeCtx?.data)
        || 'Monthly net trade by bloc · 24-month series · Census Bureau',
      'physical-pressure': `${physicalPressureRows.length} physical and trade indicators from current snapshots`,
      'materials-grid': `${strategicMaterials.length} materials · live prices shown where futures/proxies exist`,
      criticality: 'Supply-risk score + import reliance',
      'battery-chain': 'EV, grid, and cathode/anode minerals',
      'precious-complex': pricedPrecious.liveCount > 0
        ? `${pricedPrecious.liveCount} live futures · PGMs without exchange quotes show metadata only`
        : 'Monetary metals, PGMs · waiting for Yahoo futures',
      regime: 'Energy, metals, agriculture, and breadth',
      'energy-stack': 'Crude, products, natural gas, and inventories',
      'curve-board': 'Contango/backwardation as inventory tightness proxy',
      'material-detail': 'Click a material in the periodic grid',
      'exposure-matrix': 'Which materials matter to EVs, grid, defense, chips, solar, and nuclear',
    },
    __disabled: {
      'wti-brent': !wtiBrentOption,
      'usda-ag': !(hasUsdaAgSeries(usdaCtx?.data) || hasUsdaFredSeries(enhancedData?.fred)),
      'eia-petrol': !hasEiaPetrolSeries(eiaPetCtx?.data),
      'us-trade': !hasUsTradeSeries(tradeCtx?.data),
      'physical-pressure': !hasPhysicalPressureRows(eiaPetCtx?.data, usdaCtx?.data, tradeCtx?.data),
      cot: !hasCotPositioning(cotData),
      'fao-prices': !(faoCtx?.data?.series?.length > 0),
    },
    __noFooter: {},
    __source: {
      sidebar: 'CFTC / Yahoo',
      prices: 'EIA / FRED / Yahoo Finance',
      futures: 'EIA / FRED',
      sector: 'FRED / Yahoo Finance',
      supply: 'EIA',
      'wti-brent': 'FRED',
      cot: 'CFTC / Server',
      comfx: 'FX Market / Spot',
      'usda-ag': usdaOption ? 'USDA NASS' : 'FRED',
      'eia-petrol': 'EIA',
      'us-trade': 'US Census Bureau',
      'physical-pressure': 'EIA / USDA NASS / US Census Bureau',
      'materials-grid': 'USGS critical-minerals taxonomy / Yahoo Finance proxies',
      criticality: 'USGS / curated supply-chain metadata',
      'battery-chain': 'USGS / Yahoo Finance proxies',
      'precious-complex': 'Yahoo Finance futures (GC/SI/PL/PA) · USGS supply metadata',
      regime: 'Yahoo Finance / EIA / FRED',
      'energy-stack': 'Yahoo Finance / EIA',
      'curve-board': 'Yahoo Finance / CME proxies',
      'material-detail': 'USGS / curated supply-chain metadata',
      'exposure-matrix': 'USGS / curated end-use metadata',
      'fao-prices': 'FAO',
    },
  };

  return (
    <div className="com-dashboard">
      <MarketPanelGrid
        marketId="commodities"
        layout={layout}
        storageKey="commodities-layout-v7"
        accent="commodities"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
      />
    </div>
  );
}


export default React.memo(CommoditiesDashboard);
