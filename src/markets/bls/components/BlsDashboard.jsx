import React, { useMemo, useState, useEffect } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';

const BLS_LAYOUT = {
  // KPI panel uses master-detail (compact tile-rail + big chart) so it
  // fits all 10 series without vertical overflow. h=5 gives the detail
  // chart enough breathing room. Trends panels stay h=3 because their
  // mini-chart grid is now auto-fit horizontal-first (CSS).
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 5 },
    { i: 'trends-top', x: 0, y: 5, w: 6, h: 3 },
    { i: 'trends-bottom', x: 6, y: 5, w: 6, h: 3 },
  ]
};

const SERIES_ORDER = ['unemployment', 'laborParticipation', 'employmentPop', 'nonfarmPayrolls', 'avgHourlyEarnings', 'avgWeeklyHours', 'cpi', 'ppi', 'jobOpenings', 'unemployedPersons'];

const FORMAT = {
  unemployment: v => v?.toFixed(1),
  laborParticipation: v => v?.toFixed(1),
  employmentPop: v => v?.toFixed(1),
  nonfarmPayrolls: v => v != null ? (v >= 1000 ? `${(v / 1000).toFixed(1)}M` : v.toLocaleString()) : '—',
  avgHourlyEarnings: v => v != null ? `$${v.toFixed(2)}` : '—',
  avgWeeklyHours: v => v?.toFixed(1),
  cpi: v => v?.toFixed(1),
  ppi: v => v?.toFixed(1),
  jobOpenings: v => v != null ? `${(v / 1000).toFixed(1)}M` : '—',
  unemployedPersons: v => v != null ? `${(v / 1000).toFixed(1)}M` : '—',
};

const CHANGE_COLORS = {
  unemployment: v => v > 0 ? 'negative' : 'positive',
  laborParticipation: v => v > 0 ? 'positive' : 'negative',
  employmentPop: v => v > 0 ? 'positive' : 'negative',
  nonfarmPayrolls: v => v > 0 ? 'positive' : 'negative',
  avgHourlyEarnings: v => v > 0 ? 'negative' : 'positive',
  avgWeeklyHours: v => v > 0 ? 'positive' : 'negative',
  cpi: v => v > 0 ? 'negative' : 'positive',
  ppi: v => v > 0 ? 'negative' : 'positive',
  jobOpenings: v => v > 0 ? 'positive' : 'negative',
  unemployedPersons: v => v > 0 ? 'negative' : 'positive',
};

function computeChange(key, series) {
  if (!series?.latest?.value || !series?.previous?.value) return null;
  const diff = series.latest.value - series.previous.value;
  const pct = series.previous.value !== 0 ? (diff / Math.abs(series.previous.value)) * 100 : 0;
  const isAbsolute = ['nonfarmPayrolls', 'jobOpenings', 'unemployedPersons'].includes(key);
  if (isAbsolute) {
    const v = diff >= 1000 ? `${(diff / 1000).toFixed(0)}K` : diff.toFixed(0);
    return { diff: v, pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
  }
  return { diff: null, pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
}

// Detail chart for the master-detail KPI panel: full axes, gridlines,
// readable tick labels. Reuses the same color hint as the matching tile.
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
      axisLabel: { fontSize: 10, color: '#888', formatter: useDates ? (v) => String(v).slice(0, 7) : undefined, hideOverlap: true },
      axisLine: { lineStyle: { color: '#444' } },
    },
    yAxis: {
      type: 'value',
      min: 'dataMin',
      max: 'dataMax',
      axisLabel: { fontSize: 10, color: '#888', formatter: (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(unit === '%' ? 1 : 0)) },
      splitLine: { lineStyle: { color: '#222' } },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const dateStr = useDates ? p.axisValue : '';
        const v = typeof p.value === 'number' ? p.value.toFixed(2) : p.value;
        return `<div style="font-size:11px"><b>${label || ''}</b>${dateStr ? '<br/>' + dateStr : ''}<br/>${p.marker} ${v}${unit ? ' ' + unit : ''}</div>`;
      },
    },
    dataZoom: [{ type: 'inside' }],
    series: [{
      type: 'line',
      data: vals,
      smooth: 0.25,
      symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '55' }, { offset: 1, color: color + '08' }] } },
    }],
    animation: false,
  };
}

function buildSparklineOption(data, { color = '#42a5f5', unit = '', label = '' } = {}) {
  if (!data?.values?.length) return null;
  const vals = data.values.filter(v => v != null);
  if (vals.length < 2) return null;
  const dates = data.dates || [];
  return {
    grid: { left: 2, right: 2, top: 4, bottom: 2, containLabel: false },
    xAxis: { type: 'category', show: false, data: dates.length === vals.length ? dates : vals.map((_, i) => i), boundaryGap: false },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const dateStr = dates.length === vals.length ? p.axisValue : '';
        return `<div style="font-size:11px"><b>${label || p.seriesName || ''}</b>${dateStr ? '<br/>' + dateStr : ''}<br/>${p.marker} ${p.value?.toFixed != null ? p.value.toFixed(2) : p.value}${unit ? ' ' + unit : ''}</div>`;
      },
    },
    dataZoom: [{ type: 'inside', zoomLock: false }],
    series: [{
      type: 'line',
      data: vals,
      smooth: 0.3,
      symbol: 'none',
      lineStyle: { color, width: 1.5 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } },
    }],
    animation: false,
  };
}

const BLS_SERIES_KEY = {
  unemployment: 'blsUnemployment',
  laborParticipation: 'blsLaborParticipation',
  employmentPop: 'blsEmploymentPop',
  nonfarmPayrolls: 'blsNonfarmPayrolls',
  avgHourlyEarnings: 'blsAvgHourlyEarnings',
  avgWeeklyHours: 'blsAvgWeeklyHours',
  cpi: 'blsCpi',
  ppi: 'blsPpi',
  jobOpenings: 'blsJobOpenings',
  unemployedPersons: 'blsUnemployedPersons',
};

export default function BlsDashboard({ series, isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent }) {
  const kpiData = useMemo(() => {
    return SERIES_ORDER
      .map(key => {
        const s = series[key];
        if (!s?._source) return null;
        const change = computeChange(key, s);
        const changeClass = change ? CHANGE_COLORS[key]?.(parseFloat(change.pct)) || 'negative' : '';
        return { key, ...s, change, changeClass };
      })
      .filter(Boolean);
  }, [series]);

  const chartSeries = useMemo(() => {
    return SERIES_ORDER
      .filter(key => series[key]?._source && series[key]?.history?.values?.length >= 3)
      .map(key => ({ key, ...series[key] }));
  }, [series]);

  // Master-detail selection. Default to the first KPI that has history;
  // when the dataset reshapes (e.g. data refresh drops a series), fall
  // back to whatever's available so the detail pane never goes blank.
  const [selectedKey, setSelectedKey] = useState(null);
  useEffect(() => {
    if (kpiData.length === 0) return;
    if (!selectedKey || !kpiData.some(k => k.key === selectedKey)) {
      setSelectedKey(kpiData[0].key);
    }
  }, [kpiData, selectedKey]);
  const selected = kpiData.find(k => k.key === selectedKey) || kpiData[0];
  const selectedColor = selected ? (CHANGE_COLORS[selected.key]?.(parseFloat(selected.change?.pct ?? 0)) === 'positive' ? '#4caf50' : selected.key === 'unemployment' ? '#ef5350' : selected.key === 'cpi' || selected.key === 'ppi' ? '#ffa726' : '#42a5f5') : '#42a5f5';

  if (!isLive && kpiData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Data source temporarily unavailable
      </div>
    );
  }

  return (
    <BentoWrapper layout={BLS_LAYOUT} storageKey="bls-layout-v3">
      <BentoCard
        key="kpi"
        title="Key Labor Market Indicators"
        accent="bls"
        className="bls-bento-panel"
        noFooter
      >
        <div className="bls-master-detail">
          <div className="bls-tile-rail" role="listbox" aria-label="Labor market indicators">
            {kpiData.map(k => (
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
                  <MetricValue value={k.latest?.value} seriesKey={BLS_SERIES_KEY[k.key]} timestamp={`${k.latest?.period || ''} ${k.latest?.year || ''}`.trim() || undefined} format={FORMAT[k.key]} />
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
              <span className="bls-detail-title">{selected?.label || '—'}</span>
              <span className="bls-detail-meta">
                {selected ? `${selected.latest?.period || ''} ${selected.latest?.year || ''} · ${selected.unit || ''}` : ''}
              </span>
            </div>
            <div className="bls-detail-chart">
              {selected?.history?.values?.length >= 2 ? (
                <SafeECharts
                  option={buildDetailChartOption(selected.history, { color: selectedColor, unit: selected.unit, label: selected.label })}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{ title: selected.label, source: 'BLS', endpoint: '/api/bls', series: [] }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted, #888)', fontSize: 12 }}>
                  No history available
                </div>
              )}
            </div>
          </div>
        </div>
      </BentoCard>

      <BentoCard
        key="trends-top"
        title="Trends (3-Year) — Labor"
        accent="bls"
        className="bls-bento-panel"
        noFooter
      >
        <div className="bls-chart-row">
          {chartSeries.slice(0, Math.ceil(chartSeries.length / 2)).map(cs => (
            <div key={cs.key} className="bls-mini-chart">
              <h4>{cs.label} ({cs.unit})</h4>
              <div className="bls-mini-chart-body">
                <SafeECharts option={buildSparklineOption(cs.history, { color: cs.key === 'unemployment' ? '#ef5350' : '#42a5f5', unit: cs.unit, label: cs.label })} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: cs.label, source: 'BLS', endpoint: '/api/bls', series: [] }} />
              </div>
            </div>
          ))}
        </div>
      </BentoCard>

      <BentoCard
        key="trends-bottom"
        title="Trends (3-Year) — Prices & Jobs"
        accent="bls"
        className="bls-bento-panel"
        noFooter
      >
        <div className="bls-chart-row">
          {chartSeries.slice(Math.ceil(chartSeries.length / 2)).map(cs => (
            <div key={cs.key} className="bls-mini-chart">
              <h4>{cs.label} ({cs.unit})</h4>
              <div className="bls-mini-chart-body">
                <SafeECharts option={buildSparklineOption(cs.history, { color: cs.key === 'cpi' || cs.key === 'ppi' ? '#ffa726' : '#66bb6a', unit: cs.unit, label: cs.label })} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: cs.label, source: 'BLS', endpoint: '/api/bls', series: [] }} />
              </div>
            </div>
          ))}
        </div>
      </BentoCard>
    </BentoWrapper>
  );
}