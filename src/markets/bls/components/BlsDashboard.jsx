import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';

const BLS_LAYOUT = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 3 },
    { i: 'trends-top', x: 0, y: 3, w: 6, h: 3 },
    { i: 'trends-bottom', x: 6, y: 3, w: 6, h: 3 },
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

  if (!isLive && kpiData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Data source temporarily unavailable
      </div>
    );
  }

  return (
    <BentoWrapper layout={BLS_LAYOUT} storageKey="bls-layout-v2">
      <div key="kpi" className="bls-bento-panel">
        <div className="bls-section-title bento-panel-title-row">Key Labor Market Indicators</div>
        <div className="bls-kpi-grid bento-panel-content" onMouseDown={e => e.stopPropagation()}>
          {kpiData.map(k => (
            <div key={k.key} className="bls-kpi-card">
              <span className="bls-kpi-label">{k.label}</span>
              <span className="bls-kpi-value">
                <MetricValue value={k.latest?.value} seriesKey={BLS_SERIES_KEY[k.key]} timestamp={`${k.latest?.period || ''} ${k.latest?.year || ''}`.trim() || undefined} format={FORMAT[k.key]} />
                {k.unit && k.unit !== '%' && k.unit !== '$' && k.unit !== 'index' && <span className="bls-kpi-unit"> {k.unit}</span>}
              </span>
              {k.change && (
                <span className={`bls-kpi-change ${k.changeClass}`}>
                  {k.change.direction}{k.change.pct}%
                  {k.change.diff !== null && ` (${k.change.direction}${k.change.diff})`}
                </span>
              )}
              <span className="bls-kpi-unit">{k.latest?.period} {k.latest?.year}</span>
              {k.history?.values?.length >= 2 && (
                <div className="bls-kpi-sparkline">
                  <SafeECharts option={buildSparklineOption(k.history, { color: '#42a5f5', unit: k.unit, label: k.label })} style={{ height: 40, width: '100%' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div key="trends-top" className="bls-bento-panel">
        <div className="bls-section-title bento-panel-title-row">Trends (3-Year) — Labor</div>
        <div className="bls-chart-row bento-panel-content" onMouseDown={e => e.stopPropagation()}>
          {chartSeries.slice(0, Math.ceil(chartSeries.length / 2)).map(cs => (
            <div key={cs.key} className="bls-mini-chart">
              <h4>{cs.label} ({cs.unit})</h4>
              <SafeECharts option={buildSparklineOption(cs.history, { color: cs.key === 'unemployment' ? '#ef5350' : '#42a5f5', unit: cs.unit, label: cs.label })} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: cs.label, source: 'BLS', endpoint: '/api/bls', series: [] }} />
            </div>
          ))}
        </div>
      </div>

      <div key="trends-bottom" className="bls-bento-panel">
        <div className="bls-section-title bento-panel-title-row">Trends (3-Year) — Prices & Jobs</div>
        <div className="bls-chart-row bento-panel-content" onMouseDown={e => e.stopPropagation()}>
          {chartSeries.slice(Math.ceil(chartSeries.length / 2)).map(cs => (
            <div key={cs.key} className="bls-mini-chart">
              <h4>{cs.label} ({cs.unit})</h4>
              <SafeECharts option={buildSparklineOption(cs.history, { color: cs.key === 'cpi' || cs.key === 'ppi' ? '#ffa726' : '#66bb6a', unit: cs.unit, label: cs.label })} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: cs.label, source: 'BLS', endpoint: '/api/bls', series: [] }} />
            </div>
          ))}
        </div>
      </div>
    </BentoWrapper>
  );
}