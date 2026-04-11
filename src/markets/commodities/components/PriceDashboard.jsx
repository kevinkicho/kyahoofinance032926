// src/markets/commodities/components/PriceDashboard.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './CommoditiesDashboard.css';

function fmtPct(v) {
  if (v == null) return '—';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

function pctClass(v) {
  if (v == null) return 'com-flat';
  if (v > 0) return 'com-up';
  if (v < 0) return 'com-down';
  return 'com-flat';
}

function Sparkline({ values }) {
  if (!values || values.length < 2) return <svg className="com-spark" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg className="com-spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" />
    </svg>
  );
}

// Unified commodity map — merges Yahoo futures, EIA, and FRED into one list
const COMMODITY_MAP = [
  // Energy
  { name: 'WTI Crude Oil', category: 'Energy', yahoo: 'CL=F', eia: 'wti_price', fred: 'wti', unit: '$/bbl' },
  { name: 'Brent Crude', category: 'Energy', yahoo: 'BZ=F', eia: 'brent_price', fred: 'brent', unit: '$/bbl' },
  { name: 'Natural Gas', category: 'Energy', yahoo: 'NG=F', eia: 'henry_hub', fred: 'natgas', unit: '$/MMBtu' },
  { name: 'Heating Oil', category: 'Energy', yahoo: 'HO=F', eia: 'heating_oil', unit: '$/gal' },
  { name: 'Gasoline (Reg)', category: 'Energy', eia: 'gasoline_regular', unit: '$/gal' },
  { name: 'Diesel (ULS)', category: 'Energy', eia: 'diesel_uls', unit: '$/gal' },
  { name: 'Jet Fuel', category: 'Energy', eia: 'jet_fuel', unit: '$/gal' },
  { name: 'Propane', category: 'Energy', eia: 'propane', unit: '$/gal' },

  // Precious Metals
  { name: 'Gold', category: 'Precious Metals', yahoo: 'GC=F', fred: 'gold_am', unit: '$/oz' },
  { name: 'Silver', category: 'Precious Metals', yahoo: 'SI=F', fred: 'silver', unit: '$/oz' },
  { name: 'Platinum', category: 'Precious Metals', yahoo: 'PL=F', unit: '$/oz' },
  { name: 'Palladium', category: 'Precious Metals', yahoo: 'PA=F', unit: '$/oz' },

  // Industrial Metals
  { name: 'Copper', category: 'Industrial Metals', yahoo: 'HG=F', fred: 'copper', unit: '$/lb' },
  { name: 'Aluminum', category: 'Industrial Metals', fred: 'aluminum', unit: 'Index' },

  // Grains
  { name: 'Corn', category: 'Grains', yahoo: 'ZC=F', fred: 'corn', unit: '¢/bu' },
  { name: 'Wheat', category: 'Grains', yahoo: 'ZW=F', fred: 'wheat', unit: '¢/bu' },
  { name: 'Soybeans', category: 'Grains', yahoo: 'ZS=F', fred: 'soybeans', unit: '¢/bu' },
  { name: 'Oats', category: 'Grains', yahoo: 'ZO=F', unit: '¢/bu' },
  { name: 'Soybean Oil', category: 'Grains', yahoo: 'ZL=F', unit: '¢/lb' },
  { name: 'Soybean Meal', category: 'Grains', yahoo: 'ZM=F', unit: '$/ton' },
  { name: 'Rice', category: 'Grains', fred: 'rice', unit: '$/mt' },

  // Softs
  { name: 'Coffee', category: 'Softs', yahoo: 'KC=F', unit: '¢/lb' },
  { name: 'Cotton', category: 'Softs', yahoo: 'CT=F', unit: '¢/lb' },
  { name: 'Sugar', category: 'Softs', yahoo: 'SB=F', unit: '¢/lb' },

  // Livestock
  { name: 'Live Cattle', category: 'Livestock', yahoo: 'LE=F', unit: '¢/lb' },
  { name: 'Feeder Cattle', category: 'Livestock', yahoo: 'GF=F', unit: '¢/lb' },
  { name: 'Lean Hogs', category: 'Livestock', yahoo: 'HE=F', unit: '¢/lb' },
  { name: 'Beef', category: 'Livestock', fred: 'beef', unit: '$/kg' },
  { name: 'Poultry', category: 'Livestock', fred: 'poultry', unit: '$/kg' },
];

const CATEGORY_ORDER = ['Energy', 'Precious Metals', 'Industrial Metals', 'Grains', 'Softs', 'Livestock'];

/**
 * Build a unified commodity row from enhanced data sources.
 * Priority: Yahoo futures (real-time) > EIA (daily) > FRED (daily/monthly)
 */
function resolveRow(spec, enhancedData, legacyMap) {
  const yahooFutures = enhancedData?.yahoo?.futures;
  const eia = enhancedData?.eia;
  const fred = enhancedData?.fred;

  let price = null;
  let change = null;
  let sparkline = null;
  let source = null;

  // Try Yahoo futures first
  if (spec.yahoo && yahooFutures?.[spec.yahoo]) {
    const yf = yahooFutures[spec.yahoo];
    price = yf.price;
    change = yf.change;
    source = 'Yahoo';
  }

  // Fall back to legacy data (which already has sparklines and multi-period changes)
  const legacy = legacyMap?.[spec.yahoo || spec.name];
  if (legacy) {
    if (price == null && legacy.price != null) {
      price = legacy.price;
      source = legacy._source || 'Yahoo';
    }
    change = change ?? legacy.change1d;
    sparkline = legacy.sparkline;
  }

  // Try EIA
  if (spec.eia && eia?.[spec.eia]) {
    const eiaRow = eia[spec.eia];
    if (price == null) {
      price = eiaRow.value;
      source = 'EIA';
    } else {
      source = source + ' / EIA';
    }
  }

  // Try FRED
  if (spec.fred && fred?.[spec.fred]) {
    const fredRow = fred[spec.fred];
    if (price == null) {
      price = fredRow.value;
      source = 'FRED';
    } else if (source && !source.includes('FRED')) {
      source = source + ' / FRED';
    }
    // FRED history can provide sparkline if we don't have one
    if (!sparkline && fredRow.history?.length >= 5) {
      sparkline = fredRow.history.slice(-20).map(h => h.value);
    }
  }

  if (price == null) return null;

  return {
    name: spec.name,
    ticker: spec.yahoo || '',
    category: spec.category,
    unit: spec.unit,
    price,
    change1d: change ?? legacy?.change1d ?? null,
    change1w: legacy?.change1w ?? null,
    change1m: legacy?.change1m ?? null,
    sparkline,
    source: source || '—',
  };
}

export default function PriceDashboard({ priceDashboardData, dbcEtf, fredCommodities, goldOilRatio, contangoIndicator, commodityCurrencies, enhancedData }) {
  const { colors } = useTheme();

  // Build a lookup from legacy data by ticker
  const legacyMap = useMemo(() => {
    const map = {};
    if (priceDashboardData) {
      priceDashboardData.forEach(s => {
        (s.commodities || []).forEach(c => {
          if (c.ticker) map[c.ticker] = c;
          map[c.name] = c;
        });
      });
    }
    return map;
  }, [priceDashboardData]);

  // Build unified commodity rows from enhanced data, or fall back to legacy
  const displayGroups = useMemo(() => {
    // Only use COMMODITY_MAP when we have real enhanced data from the server
    if (enhancedData?.yahoo?.futures || enhancedData?.eia || enhancedData?.fred) {
      const rows = COMMODITY_MAP
        .map(spec => resolveRow(spec, enhancedData, legacyMap))
        .filter(Boolean);

      const grouped = {};
      rows.forEach(r => {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
      });

      const result = CATEGORY_ORDER
        .filter(cat => grouped[cat]?.length)
        .map(cat => ({ sector: cat, commodities: grouped[cat] }));

      if (result.length > 0) return result;
    }

    // Fall back to legacy data (mock mode or no enhanced data)
    return priceDashboardData || [];
  }, [enhancedData, legacyMap, priceDashboardData]);

  // KPI computations
  const allCommodities = displayGroups.flatMap(s => s.commodities || []);
  const wti  = allCommodities.find(c => c.ticker === 'CL=F' || c.name === 'WTI Crude Oil');
  const gold = allCommodities.find(c => c.ticker === 'GC=F' || c.name === 'Gold');
  const best1m = allCommodities.reduce((best, c) => (c.change1m != null && (best == null || c.change1m > best.change1m) ? c : best), null);

  // DBC 1yr line chart option
  const dbcOption = dbcEtf?.history?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    grid: { top: 8, right: 8, bottom: 24, left: 40, containLabel: false },
    xAxis: {
      type: 'category',
      data: dbcEtf.history.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(dbcEtf.history.dates.length / 5) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
    },
    series: [{
      type: 'line',
      data: dbcEtf.history.closes,
      smooth: true,
      symbol: 'none',
      itemStyle: { color: '#ca8a04' },
      lineStyle: { color: '#ca8a04', width: 2 },
      areaStyle: { color: 'rgba(202,138,4,0.08)' },
    }],
  } : null;

  // WTI vs Brent overlay option
  const wtiH = fredCommodities?.wtiHistory;
  const brentH = fredCommodities?.brentHistory;
  const overlayOption = wtiH?.dates?.length >= 10 && brentH?.dates?.length >= 10 ? {
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
  } : null;

  return (
    <div className="com-panel" style={{ overflow: 'hidden' }}>
      {/* KPI Strip */}
      <div className="com-kpi-strip">
        <div className="com-kpi-pill">
          <span className="com-kpi-label">WTI Crude</span>
          <span className="com-kpi-value">${wti?.price?.toFixed(2) ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(wti?.change1d)}`}>{fmtPct(wti?.change1d)} today</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold</span>
          <span className="com-kpi-value">${gold?.price?.toLocaleString() ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(gold?.change1d)}`}>{fmtPct(gold?.change1d)} today</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">DBC Index</span>
          <span className="com-kpi-value">${dbcEtf?.price?.toFixed(2) ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(dbcEtf?.ytd)}`}>YTD {dbcEtf?.ytd != null ? `${dbcEtf.ytd > 0 ? '+' : ''}${dbcEtf.ytd.toFixed(1)}%` : '—'}</span>
        </div>
        {best1m && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Best 1M</span>
            <span className="com-kpi-value" style={{ color: '#ca8a04' }}>{best1m.name}</span>
            <span className="com-kpi-sub com-up">{fmtPct(best1m.change1m)}</span>
          </div>
        )}
        {goldOilRatio != null && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Gold/Oil</span>
            <span className="com-kpi-value">{(typeof goldOilRatio === 'object' ? goldOilRatio.ratio : goldOilRatio)?.toFixed(1) ?? '—'}</span>
            <span className="com-kpi-sub">oz gold / bbl oil</span>
          </div>
        )}
        {contangoIndicator?.structure && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">WTI Structure</span>
            <span className="com-kpi-value">
              <span className={contangoIndicator.structure === 'Contango' ? 'com-up' : 'com-down'}>
                {contangoIndicator.structure}
              </span>
            </span>
            <span className="com-kpi-sub">
              spread {contangoIndicator.spread != null
                ? `${contangoIndicator.spread > 0 ? '+' : ''}$${contangoIndicator.spread.toFixed(2)}`
                : '—'}
            </span>
          </div>
        )}
        {commodityCurrencies && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Commodity FX</span>
            <span className="com-kpi-value" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {['CAD', 'AUD', 'NOK'].map(ccy => (
                commodityCurrencies[ccy] != null && (
                  <span key={ccy} className="com-fx-badge" style={{ background: colors.cardBg, borderColor: colors.cardBorder || colors.tooltipBorder }}>
                    {ccy} {commodityCurrencies[ccy].toFixed(4)}
                  </span>
                )
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Main: table (wide) + DBC chart (narrow) */}
      <div className="com-wide-narrow">
        <div className="com-scroll">
          <table className="com-table">
            <thead className="com-thead-sticky">
              <tr>
                <th className="com-th" style={{ textAlign: 'left' }}>Commodity</th>
                <th className="com-th">Price</th>
                <th className="com-th">Unit</th>
                <th className="com-th">1d%</th>
                <th className="com-th">1w%</th>
                <th className="com-th">1m%</th>
                <th className="com-th">30d Trend</th>
                <th className="com-th">Source</th>
              </tr>
            </thead>
            <tbody>
              {displayGroups.map(({ sector, commodities }) => (
                <React.Fragment key={sector}>
                  <tr className="com-sector-row">
                    <td colSpan={8}>{sector}</td>
                  </tr>
                  {(commodities || []).map(c => (
                    <tr key={c.ticker || c.name} className="com-row">
                      <td className="com-cell">{c.name}</td>
                      <td className="com-cell com-price">
                        {c.price != null ? c.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="com-cell" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.unit || ''}</td>
                      <td className={`com-cell ${pctClass(c.change1d)}`}>{fmtPct(c.change1d)}</td>
                      <td className={`com-cell ${pctClass(c.change1w)}`}>{fmtPct(c.change1w)}</td>
                      <td className={`com-cell ${pctClass(c.change1m)}`}>{fmtPct(c.change1m)}</td>
                      <td className="com-cell"><Sparkline values={c.sparkline} /></td>
                      <td className="com-cell com-source-cell">{c.source || c._source || ''}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {dbcOption && (
          <div className="com-chart-panel">
            <div className="com-chart-title">DBC Commodity ETF — 1 Year</div>
            <div className="com-mini-chart">
              <SafeECharts option={dbcOption} style={{ height: '100%', maxHeight: '100%', width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom chart: WTI vs Brent */}
      {overlayOption && (
        <div className="com-chart-panel" style={{ flexShrink: 0, minHeight: 80 }}>
          <div className="com-chart-title">WTI vs Brent Crude — 1 Year (FRED daily)</div>
          <div className="com-mini-chart">
            <SafeECharts option={overlayOption} style={{ height: '100%', maxHeight: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">
        Prices: Yahoo Finance futures · EIA daily · FRED daily/monthly · DBC: Invesco DB Commodity Index
        <span>{allCommodities.length} commodities</span>
      </div>
    </div>
  );
}
