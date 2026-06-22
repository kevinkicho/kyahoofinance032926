// Commodities Dashboard — Dynamic tiling layout using React-Grid-Layout
import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import PriceDashboard from './PriceDashboard';
import FuturesCurve from './FuturesCurve';
import SupplyDemand from './SupplyDemand';
import CotPositioning from './CotPositioning';
import SectorHeatmap from './SectorHeatmap';
import { MATERIAL_CATEGORIES, MATERIAL_SECTOR_COLUMNS, MATERIAL_SECTOR_EXPOSURE, STRATEGIC_MATERIALS } from '../../../data/strategicMaterials';
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
  if (price == null || Number.isNaN(Number(price))) return 'Strategic';
  const decimals = Number(price) >= 100 ? 0 : 2;
  return `$${Number(price).toLocaleString(undefined, { maximumFractionDigits: decimals })}${unit ? ` ${unit}` : ''}`;
}

function materialRiskLabel(score) {
  if (score >= 90) return 'Severe';
  if (score >= 80) return 'High';
  if (score >= 70) return 'Elevated';
  return 'Watch';
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
  // 2026-05-04: USDA NASS, Census trade, EIA petroleum.
  const usdaCtx = useMarketData('usda');
  const tradeCtx = useMarketData('censusTrade');
  const eiaPetCtx = useMarketData('eiaPetroleum');

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
    const summary = usdaCtx?.data?.summary || [];
    const commodities = usdaCtx?.data?.commodities || {};
    if (!summary.length) return null;
    const periods = (commodities[summary[0].key] || []).map(p => `${p.period.slice(0, 3)}-${String(p.year).slice(2)}`);
    const series = summary.map(s => ({
      name: `${s.desc} (${s.unit})`,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: (commodities[s.key] || []).map(p => p.value),
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

  // ── EIA petroleum: gasoline + Henry Hub gas dual line, crude stocks ──
  const eiaPetrolOption = useMemo(() => {
    const gas = eiaPetCtx?.data?.gasoline?.series || [];
    const ng = eiaPetCtx?.data?.naturalGas?.series || [];
    if (!gas.length && !ng.length) return null;
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
        value: data.gasoline?.latest?.value,
        yoy: data.gasoline?.yoyPct,
        color: '#f59e0b',
        format: v => `$${v.toFixed(2)}`,
      },
      {
        key: 'naturalGas',
        label: 'Henry Hub',
        unit: '$/MMBtu',
        value: data.naturalGas?.latest?.value,
        yoy: data.naturalGas?.yoyPct,
        color: '#3b82f6',
        format: v => `$${v.toFixed(2)}`,
      },
      {
        key: 'crudeStocks',
        label: 'Crude Stocks',
        unit: 'M bbl',
        value: data.crudeStocks?.latest?.value,
        yoy: data.crudeStocks?.yoyPct,
        color: '#22c55e',
        format: v => `${(v / 1000).toFixed(0)}M`,
      },
    ];
    return rows.filter(row => row.value != null);
  }, [eiaPetCtx]);

  const physicalPressureRows = useMemo(() => {
    const pctRead = yoy => yoy == null ? 'No YoY' : `${Number(yoy) >= 0 ? '+' : ''}${Number(yoy).toFixed(1)}% YoY`;
    const rows = [];
    const eia = eiaPetCtx?.data || {};
    if (eia.crudeStocks?.latest?.value != null) {
      rows.push({
        market: 'Crude stocks',
        latest: `${(Number(eia.crudeStocks.latest.value) / 1000).toFixed(0)}M bbl`,
        pressure: eia.crudeStocks.yoyPct != null && Number(eia.crudeStocks.yoyPct) > 0 ? 'Looser' : 'Tighter',
        read: pctRead(eia.crudeStocks.yoyPct),
      });
    }
    if (eia.gasoline?.latest?.value != null) {
      rows.push({
        market: 'Gasoline',
        latest: `$${Number(eia.gasoline.latest.value).toFixed(2)}/gal`,
        pressure: eia.gasoline.yoyPct != null && Number(eia.gasoline.yoyPct) > 0 ? 'Inflationary' : 'Disinflationary',
        read: pctRead(eia.gasoline.yoyPct),
      });
    }
    if (eia.naturalGas?.latest?.value != null) {
      rows.push({
        market: 'Henry Hub gas',
        latest: `$${Number(eia.naturalGas.latest.value).toFixed(2)}/MMBtu`,
        pressure: eia.naturalGas.yoyPct != null && Number(eia.naturalGas.yoyPct) > 0 ? 'Tighter' : 'Softer',
        read: pctRead(eia.naturalGas.yoyPct),
      });
    }
    (usdaCtx?.data?.summary || []).slice(0, 4).forEach(item => {
      if (!item.latest) return;
      rows.push({
        market: item.desc || item.key,
        latest: `${Number(item.latest.value).toFixed(2)} ${item.unit || ''}`.trim(),
        pressure: item.yoyPct != null && Number(item.yoyPct) > 0 ? 'Upward' : 'Lower',
        read: pctRead(item.yoyPct),
      });
    });
    if (tradeCtx?.data?.summary?.worldBalanceB != null) {
      const bal = Number(tradeCtx.data.summary.worldBalanceB);
      rows.push({
        market: 'US trade balance',
        latest: `${bal >= 0 ? '+' : '-'}$${Math.abs(bal).toFixed(1)}B`,
        pressure: bal < 0 ? 'Import demand' : 'Export surplus',
        read: tradeCtx.data.summary.latestMonth || 'latest month',
      });
    }
    return rows;
  }, [eiaPetCtx, usdaCtx, tradeCtx]);

  const materialPriceMap = useMemo(() => {
    const map = new Map();
    allCommodities.forEach(item => {
      if (!item?.ticker) return;
      map.set(item.ticker, {
        price: item.price,
        change: item.change1d,
        name: item.name,
      });
    });
    if (fredCommodities?.goldLatest?.price != null && !map.has('GC=F')) {
      map.set('GC=F', { price: fredCommodities.goldLatest.price, change: null, name: 'Gold' });
    }
    return map;
  }, [allCommodities, fredCommodities]);

  const strategicMaterials = useMemo(() => {
    return STRATEGIC_MATERIALS.map(material => {
      const live = material.yahoo ? materialPriceMap.get(material.yahoo) : null;
      return {
        ...material,
        livePrice: live?.price ?? null,
        liveChange: live?.change ?? null,
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
    const ratio = (a, b) => bySymbol[a]?.livePrice != null && bySymbol[b]?.livePrice != null
      ? Number(bySymbol[a].livePrice) / Number(bySymbol[b].livePrice)
      : null;
    return {
      rows: preciousRows,
      ratios: [
        { label: 'Gold / Silver', value: ratio('Au', 'Ag') },
        { label: 'Platinum / Gold', value: ratio('Pt', 'Au') },
        { label: 'Palladium / Platinum', value: ratio('Pd', 'Pt') },
      ],
    };
  }, [preciousRows]);

  // ── US trade balance per bloc — line chart, 24 months ─────────────────
  const tradeOption = useMemo(() => {
    const blocs = tradeCtx?.data?.blocs || [];
    if (!blocs.length) return null;
    const world = blocs.find(b => b.code === '-');
    const others = blocs.filter(b => b.code !== '-');
    const periods = (world?.series || others[0]?.series || []).map(p => p.month);
    if (!periods.length) return null;
    const palette = ['#94a3b8', '#22d3ee', '#f59e0b', '#10b981', '#a78bfa', '#ec4899'];
    const series = blocs.map((b, i) => ({
      name: b.label,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { color: palette[i % palette.length], width: b.code === '-' ? 2.4 : 1.4 },
      data: b.series.map(p => p.balanceB),
    }));
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: v => v != null ? (v >= 0 ? '+' : '') + '$' + v.toFixed(1) + 'B' : '—' },
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
    ]
  };

  return (
    <div className="com-dashboard">
      <BentoWrapper layout={layout} storageKey="commodities-layout-v5">
        <BentoCard
          key="sidebar"
          title="Market Summary"
          accent="commodities"
          contentClassName="com-panel-content com-panel-scroll"
          source="CFTC / Yahoo"
          timestamp={lastUpdated}
          isLive={!!cotData}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
            <div className="com-sidebar-section">
              <div className="com-sidebar-title">Key Prices</div>
              <div className="com-sidebar-list">
                 {allCommodities.filter(c => ['Gold', 'WTI Crude Oil', 'Natural Gas'].includes(c.name)).map(c => (
                   <div key={c.ticker} className="com-sidebar-item">
                     <span className="com-sidebar-label">{c.name}</span>
                     <div className="com-sidebar-value-row">
                       <span className="com-sidebar-value">{c.price?.toLocaleString()}</span>
                       <span className="com-sidebar-change">{formatChange(c.change1d)}</span>
                     </div>
                   </div>
                 ))}

              </div>
            </div>

            <div className="com-sidebar-section">
              <div className="com-sidebar-title">Indicators</div>
              <div className="com-sidebar-list">
                <div className="com-sidebar-item">
                  <span className="com-sidebar-label">Gold/Oil Ratio</span>
                  <span className="com-sidebar-value">{goldOilRatio?.ratio || '—'}</span>
                </div>
                <div className="com-sidebar-item">
                  <span className="com-sidebar-label">DBC ETF</span>
                  <div className="com-sidebar-value-row">
                    <span className="com-sidebar-value">{dbcEtf?.price?.toLocaleString()}</span>
                    <span className="com-sidebar-change">{formatChange(dbcEtf?.changePct)}</span>
                  </div>
                </div>
                 <div className="com-sidebar-item">
                   <span className="com-sidebar-label">Contango</span>
                   <span className="com-sidebar-value">{contangoIndicator ? (contangoIndicator.structure === 'Contango' ? 'Contango' : 'Backwardation') : '—'}</span>
                 </div>

              </div>
            </div>

            <div className="com-sidebar-section">
              <div className="com-sidebar-title">COT Net Positions</div>
              <div className="com-sidebar-list">
                {/* Cross-market enrichment now passes cotData as
                    { commodities: [...] } (object with flat array). The
                    older legacy shape was [{ sector, commodities: [] }, ...]
                    so accept both — flatten if it's an array, or read
                    .commodities directly. */}
                {(Array.isArray(cotData)
                  ? cotData.flatMap(s => s.commodities || [])
                  : (cotData?.commodities || [])
                ).slice(0, 5).map(c => (
                  <div key={c.ticker || c.code || c.name} className="com-sidebar-item">
                    <span className="com-sidebar-label">{c.name}</span>
                    <span className={`com-sidebar-value ${(c.netPct ?? c.netPosition ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                      {(() => { const v = c.netPct != null ? `${c.netPct >= 0 ? '+' : ''}${c.netPct}%` : (c.netPosition != null ? `${c.netPosition > 0 ? '+' : ''}${c.netPosition.toLocaleString()}` : '—'); return v; })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
        </BentoCard>

        <BentoCard
          key="prices"
          title="Commodity Prices"
          subtitle={
            <>
              Live futures + EIA + FRED
              {freshness && (
                <span className="com-freshness-dot" style={{ color: freshness.color }}> · {freshness.label}</span>
              )}
            </>
          }
          accent="commodities"
          contentClassName="com-panel-content"
          titleActions={
            <>
              <button className={`com-toggle-btn ${priceView === 'table' ? 'com-toggle-active' : ''}`} onClick={() => setPriceView('table')}>Table</button>
              <button className={`com-toggle-btn ${priceView === 'chart' ? 'com-toggle-active' : ''}`} onClick={() => setPriceView('chart')}>Charts</button>
            </>
          }
          source="EIA / FRED / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={!!priceDashboardData}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          {priceView === 'table' ? (
            <PriceDashboard priceDashboardData={priceDashboardData} dbcEtf={dbcEtf} fredCommodities={fredCommodities} goldOilRatio={goldOilRatio} contangoIndicator={contangoIndicator} commodityCurrencies={commodityCurrencies} enhancedData={enhancedData} lastUpdated={lastUpdated} />
          ) : (
            <PriceCharts priceDashboardData={priceDashboardData} allCommodities={allCommodities} colors={colors} formatChange={formatChange} />
          )}
        </BentoCard>

        <BentoCard
          key="futures"
          title="Futures Curve"
          accent="commodities"
          contentClassName="com-panel-content"
          source="EIA / FRED"
          timestamp={lastUpdated}
          isLive={!!futuresCurveData}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <FuturesCurve futuresCurveData={futuresCurveData} goldFuturesCurve={goldFuturesCurve} fredCommodities={fredCommodities} seasonalPatterns={seasonalPatterns} />
        </BentoCard>

        <BentoCard
          key="sector"
          title="Sector Performance"
          accent="commodities"
          contentClassName="com-panel-content"
          titleActions={
            <>
              <button className={`com-toggle-btn ${sectorView === 'heatmap' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('heatmap')}>Heatmap</button>
              <button className={`com-toggle-btn ${sectorView === 'table' ? 'com-toggle-active' : ''}`} onClick={() => setSectorView('table')}>Table</button>
            </>
          }
          source="FRED / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={!!sectorHeatmapData}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <SectorHeatmap sectorHeatmapData={sectorHeatmapData} fredCommodities={fredCommodities} view={sectorView} />
        </BentoCard>

        <BentoCard
          key="supply"
          title="Supply & Demand"
          accent="commodities"
          contentClassName="com-panel-content"
          source="EIA"
          timestamp={lastUpdated}
          isLive={!!supplyDemandData}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <SupplyDemand supplyDemandData={supplyDemandData} fredCommodities={fredCommodities} lastUpdated={lastUpdated} />
        </BentoCard>

        {wtiBrentOption && (
          <BentoCard
            key="wti-brent"
            title="WTI vs Brent Crude"
            subtitle="1 Year (FRED daily)"
            accent="commodities"
            contentClassName="com-panel-content"
            source="FRED"
            timestamp={lastUpdated}
            isLive={!!fredCommodities?.wtiHistory && !!fredCommodities?.brentHistory}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
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
          </BentoCard>
        )}

        <BentoCard
          key="cot"
          title="COT Positioning"
          accent="commodities"
          contentClassName="com-panel-content"
          source="CFTC / Server"
          timestamp={lastUpdated}
          isLive={!!cotData}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <CotPositioning cotData={cotData} lastUpdated={lastUpdated} />
        </BentoCard>

        <BentoCard
          key="comfx"
          title="Commodity FX (vs USD)"
          accent="commodities"
          contentClassName="com-panel-content"
          source="Yahoo Finance"
          timestamp={lastUpdated}
          isLive={!!commodityCurrencies}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <div className="com-fx-table">
            <div className="com-fx-row header">
              <span>Currency</span>
              <span>Rate</span>
              <span>Change</span>
            </div>
            {commodityCurrencies && Object.entries(commodityCurrencies).map(([cur, data]) => (
              <div key={cur} className="com-fx-row">
                <span className="com-fx-name">{cur}</span>
                <span className="com-fx-rate">{data.rate?.toFixed(4)}</span>
                <span className="com-fx-change">{formatChange(data.changePct)}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* USDA NASS — US Ag Commodity Prices */}
        {usdaOption && (
          <BentoCard
            key="usda-ag"
            title="US Ag Commodity Prices"
            subtitle={(usdaCtx?.data?.summary || []).filter(s => s.latest).slice(0, 4).map(s => `${s.desc.slice(0, 4)} ${s.latest.value.toFixed(2)}${s.unit.replace('$/','/')}${s.yoyPct != null ? ` (${s.yoyPct >= 0 ? '+' : ''}${s.yoyPct.toFixed(0)}% YoY)` : ''}`).join(' · ') || 'Corn / Soybeans / Wheat / Cattle · price received · USDA NASS'}
            accent="commodities"
            className="com-bento-card"
            source="USDA NASS"
            timestamp={usdaCtx?.lastUpdated || lastUpdated}
            isLive={!!usdaCtx?.data?.isLive}
            isCurrent={usdaCtx?.isCurrent ?? isCurrent}
            fetchedOn={usdaCtx?.fetchedOn || fetchedOn}
            fetchLog={usdaCtx?.fetchLog || fetchLog}
            error={usdaCtx?.error || error}
          >
            <SafeECharts option={usdaOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'USDA Ag Commodity Prices', source: 'USDA NASS Quick Stats', endpoint: '/api/usda', series: [], updatedAt: usdaCtx?.lastUpdated || lastUpdated }} />
          </BentoCard>
        )}

        {/* EIA petroleum + natural gas */}
        {eiaPetrolOption && (
          <BentoCard
            key="eia-petrol"
            title="Petroleum & Natural Gas"
            subtitle={eiaPetCtx?.data?.gasoline?.latest && eiaPetCtx?.data?.naturalGas?.latest
              ? `Gasoline $${eiaPetCtx.data.gasoline.latest.value.toFixed(2)}/gal (${eiaPetCtx.data.gasoline.yoyPct >= 0 ? '+' : ''}${eiaPetCtx.data.gasoline.yoyPct?.toFixed(0)}% YoY) · NG $${eiaPetCtx.data.naturalGas.latest.value.toFixed(2)}/MMBtu (${eiaPetCtx.data.naturalGas.yoyPct >= 0 ? '+' : ''}${eiaPetCtx.data.naturalGas.yoyPct?.toFixed(0)}% YoY)${eiaPetCtx?.data?.crudeStocks?.latest ? ` · Crude stocks ${(eiaPetCtx.data.crudeStocks.latest.value / 1000).toFixed(0)}M bbl` : ''}`
              : 'Retail gasoline · Henry Hub spot · weekly'}
            accent="commodities"
            className="com-bento-card"
            source="EIA"
            timestamp={eiaPetCtx?.lastUpdated || lastUpdated}
            isLive={!!eiaPetCtx?.data?.isLive}
            isCurrent={eiaPetCtx?.isCurrent ?? isCurrent}
            fetchedOn={eiaPetCtx?.fetchedOn || fetchedOn}
            fetchLog={eiaPetCtx?.fetchLog || fetchLog}
            error={eiaPetCtx?.error || error}
          >
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
          </BentoCard>
        )}

        {/* US trade balance by bloc */}
        {tradeOption && (
          <BentoCard
            key="us-trade"
            title="US Trade Balance"
            subtitle={tradeCtx?.data?.summary
              ? `${tradeCtx.data.summary.latestMonth}: $${tradeCtx.data.summary.worldExportsB?.toFixed(1)}B exports · $${tradeCtx.data.summary.worldImportsB?.toFixed(1)}B imports · net ${tradeCtx.data.summary.worldBalanceB >= 0 ? '+' : ''}$${tradeCtx.data.summary.worldBalanceB?.toFixed(1)}B`
              : 'Monthly net trade by bloc · 24-month series · Census Bureau'}
            accent="commodities"
            className="com-bento-card"
            source="US Census Bureau"
            timestamp={tradeCtx?.lastUpdated || lastUpdated}
            isLive={!!tradeCtx?.data?.isLive}
            isCurrent={tradeCtx?.isCurrent ?? isCurrent}
            fetchedOn={tradeCtx?.fetchedOn || fetchedOn}
            fetchLog={tradeCtx?.fetchLog || fetchLog}
            error={tradeCtx?.error || error}
          >
            <SafeECharts option={tradeOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'US Trade Balance', source: 'US Census Bureau', endpoint: '/api/census-trade', series: [], updatedAt: tradeCtx?.lastUpdated || lastUpdated }} />
          </BentoCard>
        )}

        <BentoCard
          key="physical-pressure"
          title="Physical Supply Pressure"
          subtitle={`${physicalPressureRows.length} physical and trade indicators from current snapshots`}
          accent="commodities"
          className="com-bento-card"
          contentClassName="com-panel-content com-panel-scroll"
          source="EIA / USDA NASS / US Census Bureau"
          timestamp={eiaPetCtx?.lastUpdated || usdaCtx?.lastUpdated || tradeCtx?.lastUpdated || lastUpdated}
          isLive={!!(eiaPetCtx?.data?.isLive || usdaCtx?.data?.isLive || tradeCtx?.data?.isLive)}
          isCurrent={(eiaPetCtx?.isCurrent ?? usdaCtx?.isCurrent ?? tradeCtx?.isCurrent) ?? isCurrent}
          fetchedOn={eiaPetCtx?.fetchedOn || usdaCtx?.fetchedOn || tradeCtx?.fetchedOn || fetchedOn}
          fetchLog={eiaPetCtx?.fetchLog || usdaCtx?.fetchLog || tradeCtx?.fetchLog || fetchLog}
          error={eiaPetCtx?.error || usdaCtx?.error || tradeCtx?.error || error}
        >
          {physicalPressureRows.length > 0 ? (
            <table className="com-table" style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: 'var(--text-muted)', padding: '5px 8px' }}>Indicator</th>
                  <th style={{ textAlign: 'right', color: 'var(--text-muted)', padding: '5px 8px' }}>Latest</th>
                  <th style={{ textAlign: 'right', color: 'var(--text-muted)', padding: '5px 8px' }}>Pressure</th>
                  <th style={{ textAlign: 'right', color: 'var(--text-muted)', padding: '5px 8px' }}>Read</th>
                </tr>
              </thead>
              <tbody>
                {physicalPressureRows.map(row => (
                  <tr key={row.market}>
                    <td style={{ padding: '5px 8px', borderTop: '1px solid var(--border-subtle)' }}>{row.market}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', borderTop: '1px solid var(--border-subtle)', fontVariantNumeric: 'tabular-nums' }}>{row.latest}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', borderTop: '1px solid var(--border-subtle)', color: ['Tighter', 'Inflationary', 'Upward', 'Import demand'].includes(row.pressure) ? '#f59e0b' : '#22c55e' }}>{row.pressure}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>{row.read}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16, textAlign: 'center' }}>No physical supply indicators available</div>
          )}
        </BentoCard>

        <BentoCard
          key="materials-grid"
          title="Strategic Materials Periodic Grid"
          subtitle={`${strategicMaterials.length} materials · live prices shown where futures/proxies exist`}
          accent="commodities"
          className="com-bento-card"
          contentClassName="com-panel-content com-panel-scroll"
          source="USGS critical-minerals taxonomy / Yahoo Finance proxies"
          timestamp={lastUpdated}
          isLive={materialPriceMap.size > 0}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
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
                  className="com-periodic-tile"
                  style={{ gridColumn: material.group, gridRow: material.period, borderColor: category.color }}
                  title={`${material.name}: ${material.uses.join(', ')}; top producer ${material.topProducer}`}
                >
                  <div className="com-periodic-symbol" style={{ color: category.color }}>{material.symbol}</div>
                  <div className="com-periodic-name">{material.name}</div>
                  <div className="com-periodic-risk">{material.riskLabel} {material.criticality}</div>
                </div>
              );
            })}
          </div>
        </BentoCard>

        <BentoCard
          key="criticality"
          title="Criticality Leaderboard"
          subtitle="Supply-risk score + import reliance"
          accent="commodities"
          className="com-bento-card"
          contentClassName="com-panel-content com-panel-scroll"
          source="USGS / curated supply-chain metadata"
          timestamp={lastUpdated}
          isLive={true}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <div className="com-critical-list">
            {criticalityRows.map(row => (
              <div key={row.symbol} className="com-critical-row">
                <div className="com-critical-main">
                  <span className="com-critical-symbol">{row.symbol}</span>
                  <span className="com-critical-name">{row.name}</span>
                </div>
                <div className="com-critical-score">
                  <span>{row.criticality}</span>
                  <div className="com-critical-bar"><span style={{ width: `${row.criticality}%` }} /></div>
                </div>
                <div className="com-critical-meta">{row.importReliance}% import · {row.topProducer}</div>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard
          key="battery-chain"
          title="Battery Supply Chain"
          subtitle="EV, grid, and cathode/anode minerals"
          accent="commodities"
          className="com-bento-card"
          contentClassName="com-panel-content com-panel-scroll"
          source="USGS / Yahoo Finance proxies"
          timestamp={lastUpdated}
          isLive={materialPriceMap.size > 0}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
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
        </BentoCard>

        <BentoCard
          key="precious-complex"
          title="Precious Metals Complex"
          subtitle="Monetary metals, PGMs, and industrial precious links"
          accent="commodities"
          className="com-bento-card"
          contentClassName="com-panel-content com-panel-scroll"
          source="Yahoo Finance / USGS metadata"
          timestamp={lastUpdated}
          isLive={materialPriceMap.size > 0}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <div className="com-ratio-grid">
            {pricedPrecious.ratios.map(row => (
              <div key={row.label} className="com-ratio-card">
                <span>{row.label}</span>
                <strong>{row.value != null ? row.value.toFixed(2) : '-'}</strong>
              </div>
            ))}
          </div>
          <table className="com-material-table">
            <thead>
              <tr><th>Metal</th><th>Latest</th><th>1d</th><th>Primary Use</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {pricedPrecious.rows.slice(0, 8).map(row => (
                <tr key={row.symbol}>
                  <td><strong>{row.symbol}</strong> {row.name}</td>
                  <td>{formatMaterialPrice(row.livePrice, row.yahoo ? '/oz' : '')}</td>
                  <td className={row.liveChange == null ? '' : Number(row.liveChange) >= 0 ? 'com-up' : 'com-down'}>
                    {row.liveChange == null ? '-' : `${Number(row.liveChange) >= 0 ? '+' : ''}${Number(row.liveChange).toFixed(2)}%`}
                  </td>
                  <td>{row.uses[0]}</td>
                  <td>{row.riskLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </BentoCard>

      </BentoWrapper>
    </div>
  );
}

function PriceCharts({ priceDashboardData, allCommodities, colors, formatChange }) {
  const sectors = priceDashboardData || [];
  const groupColors = { Energy: '#ef4444', Metals: '#f59e0b', Agriculture: '#22c55e', Livestock: '#8b5cf6', Fibers: '#06b6d4' };
  return (
    <div className="com-price-charts">
      {sectors.map(sector => (
        <div key={sector.sector} className="com-chart-group">
          <div className="com-chart-group-title" style={{ color: groupColors[sector.sector] || '#94a3b8' }}>{sector.sector}</div>
          <div className="com-chart-group-items">
            {(sector.commodities || []).map(c => (
              <div key={c.ticker || c.name} className="com-chart-item">
                <div className="com-chart-item-header">
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{c.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: (c.change1d || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{formatChange(c.change1d)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default React.memo(CommoditiesDashboard);
