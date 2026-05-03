import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';

const SERIES_ORDER = ['housingStarts', 'buildingPermits', 'newHomeSales', 'constructionSpending', 'retailSales', 'durableGoods', 'tradeBalance'];

const FORMAT = {
  housingStarts: v => v != null ? v.toLocaleString() : '—',
  buildingPermits: v => v != null ? v.toLocaleString() : '—',
  newHomeSales: v => v != null ? v.toLocaleString() : '—',
  constructionSpending: v => v != null ? `$${(v / 1000).toFixed(0)}B` : '—',
  retailSales: v => v != null ? `$${(v / 1000).toFixed(0)}B` : '—',
  durableGoods: v => v != null ? `$${(v / 1000).toFixed(0)}B` : '—',
  tradeBalance: v => v != null ? `$${(v / 1000).toFixed(1)}B` : '—',
};

function computeChange(key, series) {
  if (!series?.latest?.value || !series?.previous?.value) return null;
  const diff = series.latest.value - series.previous.value;
  const pct = series.previous.value !== 0 ? (diff / Math.abs(series.previous.value)) * 100 : 0;
  return { pct: pct.toFixed(1), direction: diff >= 0 ? '+' : '' };
}

const CHANGE_DIRECTION = {
  housingStarts: v => v > 0 ? 'positive' : 'negative',
  buildingPermits: v => v > 0 ? 'positive' : 'negative',
  newHomeSales: v => v > 0 ? 'positive' : 'negative',
  constructionSpending: v => v > 0 ? 'positive' : 'negative',
  retailSales: v => v > 0 ? 'positive' : 'negative',
  durableGoods: v => v > 0 ? 'positive' : 'negative',
  tradeBalance: v => v > 0 ? 'positive' : 'negative',
};

function buildSparklineOption(data, { color = '#ab47bc', unit = '', label = '' } = {}) {
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const HOUSING_KEYS = ['housingStarts', 'buildingPermits', 'newHomeSales', 'constructionSpending'];
const ECO_KEYS = ['retailSales', 'durableGoods', 'tradeBalance'];

const stopDrag = (e) => e.stopPropagation();

export function HousingPanel({ kpiData, housingKeys }) {
  return (
    <div className="census-bento-panel">
      <div className="census-section-title bento-panel-title-row">Housing & Construction</div>
      <div className="census-kpi-grid bento-panel-content" onMouseDown={stopDrag}>
        {kpiData.filter(k => housingKeys.includes(k.key)).map(k => (
          <div key={k.key} className="census-kpi-card">
            <span className="census-kpi-label">{k.label}</span>
            <span className="census-kpi-value">
              <MetricValue value={k.latest?.value} seriesKey={`census${k.key[0].toUpperCase()}${k.key.slice(1)}`} timestamp={k.latest?.date} format={FORMAT[k.key]} />
              {k.unit && <span className="census-kpi-unit"> {k.unit}</span>}
            </span>
            {k.change && (
              <span className={`census-kpi-change ${k.changeClass}`}>
                {k.change.direction}{k.change.pct}% MoM
              </span>
            )}
            <span className="census-kpi-unit">{formatDate(k.latest?.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TradePanel({ kpiData, ecoKeys }) {
  return (
    <div className="census-bento-panel">
      <div className="census-section-title bento-panel-title-row">Trade & Consumption</div>
      <div className="census-kpi-grid bento-panel-content" onMouseDown={stopDrag}>
        {kpiData.filter(k => ecoKeys.includes(k.key)).map(k => (
          <div key={k.key} className="census-kpi-card">
            <span className="census-kpi-label">{k.label}</span>
            <span className="census-kpi-value">
              <MetricValue value={k.latest?.value} seriesKey={`census${k.key[0].toUpperCase()}${k.key.slice(1)}`} timestamp={k.latest?.date} format={FORMAT[k.key]} />
              {k.unit && <span className="census-kpi-unit"> {k.unit}</span>}
            </span>
            {k.change && (
              <span className={`census-kpi-change ${k.changeClass}`}>
                {k.change.direction}{k.change.pct}% MoM
              </span>
            )}
            <span className="census-kpi-unit">{formatDate(k.latest?.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendsHousingPanel({ housingSeries, fetchedOn, lastUpdated }) {
  return (
    <div className="census-bento-panel">
      <div className="census-section-title bento-panel-title-row">Trends — Housing & Construction</div>
      <div className="census-chart-row bento-panel-content" onMouseDown={stopDrag}>
        {housingSeries.map(cs => (
          <div key={cs.key} className="census-mini-chart">
            <h4>{cs.label} ({cs.unit})</h4>
            <SafeECharts option={buildSparklineOption(cs.history, { color: '#ab47bc', unit: cs.unit, label: cs.label })} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: cs.label, source: 'US Census Bureau', endpoint: '/api/census', series: [], updatedAt: fetchedOn || lastUpdated }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendsTradePanel({ ecoSeries, fetchedOn, lastUpdated }) {
  return (
    <div className="census-bento-panel">
      <div className="census-section-title bento-panel-title-row">Trends — Trade & Consumption</div>
      <div className="census-chart-row bento-panel-content" onMouseDown={stopDrag}>
        {ecoSeries.map(cs => (
          <div key={cs.key} className="census-mini-chart">
            <h4>{cs.label} ({cs.unit})</h4>
            <SafeECharts option={buildSparklineOption(cs.history, { color: '#26c6da', unit: cs.unit, label: cs.label })} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: cs.label, source: 'US Census Bureau', endpoint: '/api/census', series: [], updatedAt: fetchedOn || lastUpdated }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export { HOUSING_KEYS, ECO_KEYS };

export function useCensusData(series) {
  const kpiData = useMemo(() => {
    return SERIES_ORDER
      .map(key => {
        const s = series[key];
        if (!s?._source) return null;
        const change = computeChange(key, s);
        const changeClass = change ? CHANGE_DIRECTION[key]?.(parseFloat(change.pct)) || 'negative' : '';
        return { key, ...s, change, changeClass };
      })
      .filter(Boolean);
  }, [series]);

  const housingSeries = useMemo(() => {
    return HOUSING_KEYS.filter(key => series[key]?._source && series[key]?.history?.values?.length >= 3).map(key => ({ key, ...series[key] }));
  }, [series]);

  const ecoSeries = useMemo(() => {
    return ECO_KEYS.filter(key => series[key]?._source && series[key]?.history?.values?.length >= 3).map(key => ({ key, ...series[key] }));
  }, [series]);

  return { kpiData, housingSeries, ecoSeries };
}