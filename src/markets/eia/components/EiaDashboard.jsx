import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';

function computePctChange(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous) * 100).toFixed(1);
}

function buildSparklineOption(data, { color = '#ffa726', unit = '', label = '' } = {}) {
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

function SectorCard({ label, data, seriesKey }) {
  if (!data?.latest) return null;
  const chg = computePctChange(data.latest.price, data.previous?.price);
  return (
    <div className="eia-kpi-card">
      <span className="eia-kpi-label">{label}</span>
      <span className="eia-kpi-value"><MetricValue value={data.latest.price} seriesKey={seriesKey} timestamp={data.latest?.period} format={v => v.toFixed(2)} /><span className="eia-kpi-unit"> ¢/kWh</span></span>
      {chg != null && (
        <span className={`eia-kpi-change ${parseFloat(chg) > 0 ? 'negative' : 'positive'}`}>
          {parseFloat(chg) > 0 ? '+' : ''}{chg}%
        </span>
      )}
      <span className="eia-kpi-unit">{data.latest.period}</span>
    </div>
  );
}

function SalesCard({ label, data, seriesKey }) {
  if (!data?.latest) return null;
  const salesB = data.latest.sales / 1e3;
  const revB = data.latest.revenue / 1e3;
  return (
    <div className="eia-kpi-card">
      <span className="eia-kpi-label">{label}</span>
      <span className="eia-kpi-value"><MetricValue value={data.latest.sales} seriesKey={seriesKey} timestamp={data.latest?.period} format={v => `${(v / 1e3).toFixed(1)}`} /><span className="eia-kpi-unit"> B kWh</span></span>
      <span className="eia-kpi-unit">Revenue: ${revB.toFixed(1)}B · {data.latest.period}</span>
    </div>
  );
}

export default function EiaDashboard({ electricity, co2Emissions, isLive }) {
  const hasData = useMemo(() => {
    return electricity.residential || electricity.commercial || electricity.industrial || co2Emissions.total || co2Emissions.bySector;
  }, [electricity, co2Emissions]);

  if (!isLive && !hasData) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
        Data source temporarily unavailable
      </div>
    );
  }

  const elecSectors = [
    { key: 'residential', label: 'Residential' },
    { key: 'commercial', label: 'Commercial' },
    { key: 'industrial', label: 'Industrial' },
  ];

  return (
    <div className="eia-dashboard">
      <div key="prices" className="eia-bento-panel">
        <div className="eia-section-title bento-panel-title-row">US Electricity Retail Prices</div>
        <div className="eia-kpi-grid bento-panel-content" onMouseDown={e => e.stopPropagation()}>
          {elecSectors.map(({ key, label }) => (
            <SectorCard key={key} label={label} data={electricity[key]} />
          ))}
        </div>
      </div>

      <div key="consumption" className="eia-bento-panel">
        <div className="eia-section-title bento-panel-title-row">Electricity Consumption</div>
        <div className="eia-kpi-grid bento-panel-content" onMouseDown={e => e.stopPropagation()}>
          {elecSectors.map(({ key, label }) => (
            <SalesCard key={`sales-${key}`} label={label} data={electricity[key]} />
          ))}
        </div>
      </div>

      <div key="trends" className="eia-bento-panel">
        <div className="eia-section-title bento-panel-title-row">Price Trends (3-Year Monthly)</div>
        <div className="eia-chart-row bento-panel-content" onMouseDown={e => e.stopPropagation()}>
          {elecSectors.filter(({ key }) => electricity[key]?.price?.values?.length >= 3).map(({ key, label }) => {
            const opt = buildSparklineOption(electricity[key].price, { color: '#ffa726', unit: '¢/kWh', label: `${label} Price` });
            return opt ? (
              <div key={`chart-${key}`} className="eia-mini-chart">
                <h4>{label} Price (¢/kWh)</h4>
                <SafeECharts option={opt} style={{ height: 60, width: '100%' }} />
              </div>
            ) : null;
          })}
        </div>
      </div>

      {co2Emissions.bySector && co2Emissions.bySector.length > 0 && (
        <div key="co2" className="eia-bento-panel">
          <div className="eia-section-title bento-panel-title-row">CO₂ Emissions by Sector (US)</div>
          <div className="eia-co2-table bento-panel-content" onMouseDown={e => e.stopPropagation()}>
            {co2Emissions.bySector.filter(s => s.name !== 'Total' && s.name !== 'TT').map(s => (
              <div key={s.name} className="eia-co2-row">
                <span className="eia-co2-sector">{s.name}</span>
                <span>
                  <span className="eia-co2-value">{s.latest.toFixed(1)}</span>
                  <span className="eia-co2-unit">{s.unit} ({s.period})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}