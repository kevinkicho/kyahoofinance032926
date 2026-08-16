import React, { useMemo, useState, useEffect, useCallback } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import {
  hasBlsSeries,
  hasBlsKpiItems,
  hasBlsTrendsLaborItems,
  hasBlsTrendsPricesItems,
  hasBlsJoltsItems,
  hasBlsProductivityItems,
  hasBlsCpiItems,
  hasBlsPpiItems,
  hasBlsEciItems,
  hasBlsDurationItems,
} from './BlsLiveChips.js';

const BLS_LAYOUT = {
  // Every thematic panel uses the same master-detail pattern as
  // "Key Labor Market Indicators" (tile rail + large detail chart).
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 5 },
    { i: 'trends-top', x: 0, y: 5, w: 6, h: 5 },
    { i: 'trends-bottom', x: 6, y: 5, w: 6, h: 5 },
    { i: 'jolts', x: 0, y: 10, w: 6, h: 5 },
    { i: 'productivity', x: 6, y: 10, w: 6, h: 5 },
    { i: 'cpi-components', x: 0, y: 15, w: 6, h: 5 },
    { i: 'ppi-by-industry', x: 6, y: 15, w: 6, h: 5 },
    { i: 'eci', x: 0, y: 20, w: 6, h: 5 },
    { i: 'unemployment-duration', x: 6, y: 20, w: 6, h: 5 },
  ],
};

const SERIES_ORDER = [
  'unemployment', 'laborParticipation', 'employmentPop', 'nonfarmPayrolls',
  'cpi', 'ppi', 'jobOpenings', 'unemployedPersons',
];

/** Higher reading is "good" (green change) for these keys. */
const POSITIVE_UP = new Set([
  'laborParticipation', 'employmentPop', 'nonfarmPayrolls', 'jobOpenings',
  'joltsHires', 'outputPerHour', 'eciTotal', 'eciWages', 'eciBenefits',
]);
/** Higher reading is "bad" (red change). */
const NEGATIVE_UP = new Set([
  'unemployment', 'cpi', 'ppi', 'unemployedPersons', 'joltsLayoffs',
  'unitLaborCosts', 'cpiFood', 'cpiEnergy', 'cpiShelter',
  'ppiIntermediate', 'unempLess5Weeks', 'unemp5To14Weeks',
  'unemp15To26Weeks', 'unemp27PlusWeeks',
]);

const FORMAT = {
  unemployment: v => v?.toFixed(1),
  laborParticipation: v => v?.toFixed(1),
  employmentPop: v => v?.toFixed(1),
  nonfarmPayrolls: v => (v != null ? (v >= 1000 ? `${(v / 1000).toFixed(1)}M` : v.toLocaleString()) : '—'),
  cpi: v => v?.toFixed(1),
  ppi: v => v?.toFixed(1),
  jobOpenings: v => (v != null ? `${(v / 1000).toFixed(1)}M` : '—'),
  unemployedPersons: v => (v != null ? `${(v / 1000).toFixed(1)}M` : '—'),
};

const ABSOLUTE_KEYS = new Set([
  'nonfarmPayrolls', 'jobOpenings', 'unemployedPersons',
  'joltsHires', 'unempLess5Weeks', 'unemp5To14Weeks',
  'unemp15To26Weeks', 'unemp27PlusWeeks',
]);

const BLS_SERIES_KEY = {
  unemployment: 'blsUnemployment',
  laborParticipation: 'blsLaborParticipation',
  employmentPop: 'blsEmploymentPop',
  nonfarmPayrolls: 'blsNonfarmPayrolls',
  cpi: 'blsCpi',
  ppi: 'blsPpi',
  jobOpenings: 'blsJobOpenings',
  unemployedPersons: 'blsUnemployedPersons',
};

function formatValue(key, unit, v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  if (FORMAT[key]) return FORMAT[key](v);
  const n = Number(v);
  if (unit === 'K' || /thousand/i.test(unit || '')) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}M` : n.toFixed(0);
  }
  if (unit === '%' || unit === 'index' || /index|%/i.test(unit || '')) {
    return n.toFixed(1);
  }
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toFixed(1);
}

function changeTone(key, pct) {
  if (pct == null || Number.isNaN(pct)) return '';
  const up = pct > 0;
  if (POSITIVE_UP.has(key)) return up ? 'positive' : 'negative';
  if (NEGATIVE_UP.has(key)) return up ? 'negative' : 'positive';
  // Neutral series (e.g. quits rate): up = green
  return up ? 'positive' : 'negative';
}

function chartColor(key, changeClass) {
  if (key === 'unemployment' || key === 'joltsLayoffs' || key === 'unitLaborCosts') return '#ef5350';
  if (key === 'cpi' || key === 'ppi' || key === 'cpiEnergy' || key === 'ppiIntermediate' || key === 'joltsQuits') return '#ffa726';
  if (changeClass === 'positive') return '#4caf50';
  if (key.includes('unemp') || key.includes('Layoff')) return '#ef5350';
  return '#42a5f5';
}

function computeChange(key, series) {
  if (series?.latest?.value == null || series?.previous?.value == null) return null;
  const diff = series.latest.value - series.previous.value;
  const pct = series.previous.value !== 0
    ? (diff / Math.abs(series.previous.value)) * 100
    : 0;
  if (ABSOLUTE_KEYS.has(key)) {
    const v = Math.abs(diff) >= 1000
      ? `${(diff / 1000).toFixed(0)}K`
      : diff.toFixed(0);
    return { diff: v, pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
  }
  return { diff: null, pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
}

function buildDetailChartOption(data, { color = '#42a5f5', unit = '', label = '' } = {}) {
  if (!data?.values?.length) return null;
  const vals = data.values.filter(v => v != null);
  if (vals.length < 2) return null;
  const dates = data.dates || [];
  const useDates = dates.length === vals.length;
  return {
    grid: { left: 50, right: 12, top: 12, bottom: 26, containLabel: false },
    xAxis: {
      type: 'category',
      data: useDates ? dates : vals.map((_, i) => i),
      boundaryGap: false,
      axisLabel: {
        fontSize: 10,
        color: '#888',
        formatter: useDates ? (v) => String(v).slice(0, 7) : undefined,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: '#444' } },
    },
    yAxis: {
      type: 'value',
      min: 'dataMin',
      max: 'dataMax',
      axisLabel: {
        fontSize: 10,
        color: '#888',
        formatter: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(unit === '%' ? 1 : 0)),
      },
      splitLine: { lineStyle: { color: '#222' } },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const dateStr = useDates ? p.axisValue : '';
        const v = typeof p.value === 'number' ? p.value.toFixed(2) : p.value;
        return `<div style="font-size:11px"><b>${label || ''}</b>${dateStr ? `<br/>${dateStr}` : ''}<br/>${p.marker} ${v}${unit ? ` ${unit}` : ''}</div>`;
      },
    },
    dataZoom: [{ type: 'inside' }],
    series: [{
      type: 'line',
      data: vals,
      smooth: 0.25,
      symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `${color}55` },
            { offset: 1, color: `${color}08` },
          ],
        },
      },
    }],
    animation: false,
  };
}

/**
 * Build selectable tile rows from series keys. Each item carries the raw
 * series object plus label / change metadata for the master-detail UI.
 */
function usePanelItems(series, defs) {
  return useMemo(() => {
    return defs
      .map(({ key, label, color }) => {
        const s = series?.[key];
        if (!hasBlsSeries(s)) return null;
        const change = computeChange(key, s);
        const changeClass = change
          ? changeTone(key, parseFloat(change.pct))
          : '';
        return {
          key,
          label: label || s.label || key,
          unit: s.unit || '',
          color: color || chartColor(key, changeClass),
          change,
          changeClass,
          latest: s.latest,
          previous: s.previous,
          history: s.history,
          _source: s._source,
        };
      })
      .filter(Boolean);
  }, [series, defs]);
}

/**
 * Master-detail body matching Key Labor Market Indicators:
 * left = compact selectable metric tiles, right = full history chart.
 * @param {boolean} wideRail — multi-column tile grid (full-width KPI panel)
 */
function MasterDetailBody({ items, formatKey, emptyHint = 'No series available', wideRail = false, totalDefs }) {
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    if (!items.length) return;
    if (!selectedKey || !items.some(k => k.key === selectedKey)) {
      setSelectedKey(items[0].key);
    }
  }, [items, selectedKey]);

  const selected = items.find(k => k.key === selectedKey) || items[0];
  const color = selected?.color || '#42a5f5';

  const chartOption = useMemo(() => {
    if (!selected?.history?.values?.length) return null;
    return buildDetailChartOption(selected.history, {
      color,
      unit: selected.unit,
      label: selected.label,
    });
  }, [selected, color]);

  const fmt = useCallback((item, v) => {
    if (formatKey) return formatKey(item.key, item.unit, v);
    return formatValue(item.key, item.unit, v);
  }, [formatKey]);

  if (!items.length) {
    return (
      <div className="bls-empty">
        {emptyHint}
      </div>
    );
  }

  const missingCount = typeof totalDefs === 'number' ? totalDefs - items.length : 0;

  return (
    <div className={`bls-master-detail${wideRail ? ' bls-master-detail--wide' : ''}`}>
      {missingCount > 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: '6px 8px' }}>
          {missingCount} of {totalDefs} series currently unavailable
        </div>
      )}
      <div className={`bls-tile-rail${wideRail ? ' bls-tile-rail--wide' : ''}`} role="listbox" aria-label="Series">
        {items.map(k => (
          <button
            type="button"
            key={k.key}
            role="option"
            aria-selected={selected?.key === k.key}
            className={`bls-tile${selected?.key === k.key ? ' is-active' : ''}`}
            onClick={() => setSelectedKey(k.key)}
          >
            <span className="bls-tile-label">{k.label}</span>
            <span className="bls-tile-value">
              <MetricValue
                value={k.latest?.value}
                seriesKey={BLS_SERIES_KEY[k.key] || `bls${k.key.charAt(0).toUpperCase()}${k.key.slice(1)}`}
                timestamp={`${k.latest?.period || ''} ${k.latest?.year || ''}`.trim() || undefined}
                format={v => fmt(k, v)}
              />
            </span>
            {k.change && (
              <span className={`bls-tile-change ${k.changeClass}`}>
                {k.change.direction}{k.change.pct}%
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="bls-detail-pane">
        <div className="bls-detail-header">
          <div className="bls-detail-header-main">
            <span className="bls-detail-title">{selected?.label || '—'}</span>
            {selected?.latest?.value != null && (
              <span className="bls-detail-value" style={{ color }}>
                {fmt(selected, selected.latest.value)}
              </span>
            )}
            {selected?.change && (
              <span className={`bls-tile-change ${selected.changeClass}`}>
                {selected.change.direction}{selected.change.pct}%
              </span>
            )}
          </div>
          <span className="bls-detail-meta">
            {selected
              ? `${selected.latest?.period || ''} ${selected.latest?.year || ''}${selected.unit ? ` · ${selected.unit}` : ''}`.trim()
              : ''}
          </span>
        </div>
        <div className="bls-detail-chart">
          {chartOption ? (
            <SafeECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              sourceInfo={{
                title: selected?.label || 'BLS',
                source: 'BLS',
                endpoint: '/api/bls',
                series: [],
              }}
            />
          ) : (
            <div className="bls-empty">No history available</div>
          )}
        </div>
      </div>
    </div>
  );
}

const JOLTS_DEFS = [
  { key: 'jobOpenings', label: 'Job Openings', color: '#42a5f5' },
  { key: 'joltsHires', label: 'Hires', color: '#66bb6a' },
  { key: 'joltsQuits', label: 'Quits Rate', color: '#ffa726' },
  { key: 'joltsLayoffs', label: 'Layoffs & Discharges', color: '#ef5350' },
];

const PRODUCTIVITY_DEFS = [
  { key: 'outputPerHour', label: 'Output per Hour', color: '#42a5f5' },
  { key: 'unitLaborCosts', label: 'Unit Labor Costs', color: '#ef5350' },
];

const CPI_DEFS = [
  { key: 'cpi', label: 'CPI · All Items', color: '#42a5f5' },
  { key: 'cpiFood', label: 'CPI · Food', color: '#66bb6a' },
  { key: 'cpiEnergy', label: 'CPI · Energy', color: '#ffa726' },
  { key: 'cpiShelter', label: 'CPI · Shelter', color: '#ef5350' },
];

const PPI_DEFS = [
  { key: 'ppi', label: 'PPI · Final Demand', color: '#42a5f5' },
  { key: 'ppiIntermediate', label: 'PPI · Intermediate Demand', color: '#ffa726' },
  { key: 'ppiServices', label: 'PPI · Services', color: '#66bb6a' },
];

const ECI_DEFS = [
  { key: 'eciTotal', label: 'Total Compensation', color: '#42a5f5' },
  { key: 'eciWages', label: 'Wages & Salaries', color: '#66bb6a' },
  { key: 'eciBenefits', label: 'Benefits', color: '#ffa726' },
];

const DURATION_DEFS = [
  { key: 'unempLess5Weeks', label: '< 5 Weeks', color: '#66bb6a' },
  { key: 'unemp5To14Weeks', label: '5–14 Weeks', color: '#42a5f5' },
  { key: 'unemp15To26Weeks', label: '15–26 Weeks', color: '#ffa726' },
  { key: 'unemp27PlusWeeks', label: '27+ Weeks', color: '#ef5350' },
];

const TRENDS_LABOR_DEFS = [
  { key: 'unemployment', label: 'Unemployment Rate', color: '#ef5350' },
  { key: 'laborParticipation', label: 'Labor Participation', color: '#42a5f5' },
  { key: 'employmentPop', label: 'Employment / Population', color: '#66bb6a' },
  { key: 'nonfarmPayrolls', label: 'Nonfarm Payrolls', color: '#42a5f5' },
];

const TRENDS_PRICES_DEFS = [
  { key: 'cpi', label: 'CPI', color: '#ffa726' },
  { key: 'ppi', label: 'PPI', color: '#ffa726' },
  { key: 'jobOpenings', label: 'Job Openings', color: '#66bb6a' },
  { key: 'unemployedPersons', label: 'Unemployed Persons', color: '#ef5350' },
];

export default function BlsDashboard({ series, isLive }) {
  const kpiDefs = useMemo(
    () => SERIES_ORDER.map(key => ({ key, label: series?.[key]?.label || key })),
    [series],
  );
  const kpiItems = usePanelItems(series, kpiDefs);
  const trendsLaborItems = usePanelItems(series, TRENDS_LABOR_DEFS);
  const trendsPricesItems = usePanelItems(series, TRENDS_PRICES_DEFS);
  const joltsItems = usePanelItems(series, JOLTS_DEFS);
  const productivityItems = usePanelItems(series, PRODUCTIVITY_DEFS);
  const cpiItems = usePanelItems(series, CPI_DEFS);
  const ppiItems = usePanelItems(series, PPI_DEFS);
  const eciItems = usePanelItems(series, ECI_DEFS);
  const durationItems = usePanelItems(series, DURATION_DEFS);

  // Hooks must run unconditionally (splash mounts this before data arrives).
  const panelCtx = useMemo(() => {
    const bodies = {
      kpi: <MasterDetailBody items={kpiItems} wideRail />,
      'trends-top': <MasterDetailBody items={trendsLaborItems} emptyHint="No labor trend series" />,
      'trends-bottom': <MasterDetailBody items={trendsPricesItems} emptyHint="No price/jobs series" />,
      jolts: <MasterDetailBody items={joltsItems} emptyHint="No JOLTS series" />,
      productivity: <MasterDetailBody items={productivityItems} emptyHint="No productivity series" />,
      'cpi-components': <MasterDetailBody items={cpiItems} emptyHint="No CPI component series" />,
      'ppi-by-industry': <MasterDetailBody items={ppiItems} emptyHint="No PPI series" />,
      eci: <MasterDetailBody items={eciItems} emptyHint="No ECI series" />,
      'unemployment-duration': <MasterDetailBody items={durationItems} emptyHint="No duration series" totalDefs={DURATION_DEFS.length} />,
    };
    const live = {
      kpi: hasBlsKpiItems(series),
      'trends-top': hasBlsTrendsLaborItems(series),
      'trends-bottom': hasBlsTrendsPricesItems(series),
      jolts: hasBlsJoltsItems(series),
      productivity: hasBlsProductivityItems(series),
      'cpi-components': hasBlsCpiItems(series),
      'ppi-by-industry': hasBlsPpiItems(series),
      eci: hasBlsEciItems(series),
      'unemployment-duration': hasBlsDurationItems(series),
    };
    const noFooter = Object.fromEntries(Object.keys(bodies).map((id) => [id, true]));
    return {
      __render: (panelId) => bodies[panelId] ?? null,
      __live: live,
      __noFooter: noFooter,
    };
  }, [
    kpiItems, trendsLaborItems, trendsPricesItems, joltsItems, productivityItems,
    cpiItems, ppiItems, eciItems, durationItems, series,
  ]);

  if (!isLive && kpiItems.length === 0) {
    return (
      <div className="bls-empty bls-empty--page">
        Data source temporarily unavailable
      </div>
    );
  }

  return (
    <MarketPanelGrid
      marketId="bls"
      layout={BLS_LAYOUT}
      storageKey="bls-layout-v5"
      accent="bls"
      ctx={panelCtx}
    />
  );
}
