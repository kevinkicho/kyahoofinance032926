import React, { useMemo } from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import MetricValue from '../../components/MetricValue/MetricValue';
import BentoWrapper from '../../components/BentoWrapper';
import BentoCard from '../../components/BentoCard/BentoCard';
import DataFooter from '../../components/DataFooter/DataFooter';
import SafeECharts from '../../components/SafeECharts';
import './EiaMarket.css';

const EIA_LAYOUT = {
  lg: [
    { i: 'prices', x: 0, y: 0, w: 6, h: 3 },
    { i: 'consumption', x: 6, y: 0, w: 6, h: 3 },
    { i: 'trends', x: 0, y: 3, w: 6, h: 3 },
    { i: 'co2', x: 6, y: 3, w: 6, h: 4 },
    { i: 'petroleum', x: 0, y: 7, w: 6, h: 4 },
    { i: 'natural-gas', x: 6, y: 7, w: 6, h: 4 },
  ]
};

function computePctChange(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous) * 100).toFixed(1);
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

const ELEC_SECTORS = [
  { key: 'residential', label: 'Residential' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'industrial', label: 'Industrial' },
];


function getEiaProps(centralData) {
  const d = centralData.data || {};
  return {
    electricity: d.electricity || {},
    co2Emissions: d.co2Emissions || {},
    petroleum: d.petroleum || {},
    naturalGas: d.naturalGas || {},
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    isHistorical: centralData.isHistorical,
    asOfDate: centralData.asOfDate,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function EiaMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getEiaProps(centralData);

  
  const hasData = props.electricity.residential || props.electricity.commercial || props.electricity.industrial || props.co2Emissions.total || props.co2Emissions.bySector || props.petroleum?.wti || props.petroleum?.brent || props.naturalGas?.henryHub;

  if (!props.isLive && !hasData) {
    return (
      <div className="eia-market">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
          Data source temporarily unavailable
        </div>
        <DataFooter source="EIA (US Energy Information Administration)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
      </div>
    );
  }

  const co2Sectors = (props.co2Emissions.bySector || []).filter(s => s.name !== 'Total' && s.name !== 'TT');

  return (
    <div className="eia-market">
      <BentoWrapper layout={EIA_LAYOUT} storageKey="eia-layout-v2">
        <BentoCard key="prices" title="US Electricity Retail Prices" accent="eia" noFooter>
          <div className="eia-kpi-grid">
            {ELEC_SECTORS.map(({ key, label }) => {
              const seriesKey = `eia${key.charAt(0).toUpperCase() + key.slice(1)}Price`;
              return <SectorCard key={key} label={label} data={props.electricity[key]} seriesKey={seriesKey} />;
            })}
          </div>
        </BentoCard>

        <BentoCard key="consumption" title="Electricity Consumption" accent="eia" noFooter>
          <div className="eia-kpi-grid">
            {ELEC_SECTORS.map(({ key, label }) => {
              const seriesKey = `eia${key.charAt(0).toUpperCase() + key.slice(1)}Sales`;
              return <SalesCard key={`sales-${key}`} label={label} data={props.electricity[key]} seriesKey={seriesKey} />;
            })}
          </div>
        </BentoCard>

        <BentoCard key="trends" title="Price Trends (3-Year Monthly)" accent="eia" noFooter>
          <div className="eia-chart-row">
            {ELEC_SECTORS.filter(({ key }) => props.electricity[key]?.price?.values?.length >= 3).map(({ key, label }) => {
              const opt = buildSparklineOption(props.electricity[key].price, { color: '#ffa726', unit: '¢/kWh', label: `${label} Price` });
              return opt ? (
                <div key={`chart-${key}`} className="eia-mini-chart" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4>{label} Price (¢/kWh)</h4>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <SafeECharts
                      option={opt}
                      style={{ height: '100%', width: '100%', minHeight: '60px' }}
                      sourceInfo={{ title: `${label} Price`, source: 'EIA', endpoint: '/api/eia', series: [] }}
                    />
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </BentoCard>

        {co2Sectors.length > 0 && (
          <BentoCard key="co2" title="CO₂ Emissions by Sector (US)" accent="eia" noFooter>
            <div className="eia-co2-table">
              {co2Sectors.map(s => (
                <div key={s.name} className="eia-co2-row">
                  <span className="eia-co2-sector">{s.name}</span>
                  <span>
                    <span className="eia-co2-value">
                      <MetricValue
                        value={s.latest}
                        seriesKey="eiaCo2BySector"
                        timestamp={s.period}
                        format={v => v.toFixed(1)}
                      />
                    </span>
                    <span className="eia-co2-unit">{s.unit} ({s.period})</span>
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}

        <BentoCard key="petroleum" title="Petroleum Prices" accent="eia" noFooter>
          <div className="eia-chart-row">
            {[
              { key: 'wti', label: 'WTI Crude', color: '#f97316', unit: '$/bbl' },
              { key: 'brent', label: 'Brent Crude', color: '#3b82f6', unit: '$/bbl' },
              { key: 'gasoline', label: 'Gasoline', color: '#22c55e', unit: '$/gal' },
              { key: 'diesel', label: 'Diesel', color: '#a855f7', unit: '$/gal' },
              { key: 'heatingOil', label: 'Heating Oil', color: '#ef4444', unit: '$/gal' },
            ].map(({ key, label, color, unit }) => {
              const data = props.petroleum?.[key];
              if (!data?.values?.length) return null;
              const opt = buildSparklineOption(data, { color, unit, label });
              return opt ? (
                <div key={key} className="eia-mini-chart">
                  <h4>{label}</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #eee)' }}>
                      <MetricValue value={data.latest?.value} seriesKey={`eiaPetroleum${key.charAt(0).toUpperCase() + key.slice(1)}`} timestamp={data.latest?.period} format={v => v.toFixed(2)} />
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #666)' }}>{unit} · {data.latest?.period}</span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <SafeECharts option={opt} style={{ height: '100%', width: '100%', minHeight: '60px' }} sourceInfo={{ title: label, source: 'EIA', endpoint: '/api/eia', series: [] }} />
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </BentoCard>

        <BentoCard key="natural-gas" title="Natural Gas — Henry Hub Spot" accent="eia" noFooter>
          {props.naturalGas?.henryHub?.values?.length > 0 ? (() => {
            const data = props.naturalGas.henryHub;
            const opt = buildSparklineOption(data, { color: '#06b6d4', unit: '$/MMBTU', label: 'Henry Hub' });
            return (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '8px 12px 0' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary, #eee)' }}>
                    <MetricValue value={data.latest?.value} seriesKey="eiaNaturalGasHenryHub" timestamp={data.latest?.period} format={v => v.toFixed(2)} />
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #666)' }}>$/MMBTU · {data.latest?.period}</span>
                </div>
                <div style={{ flex: 1, minHeight: 0, padding: '0 12px 8px' }}>
                  {opt && <SafeECharts option={opt} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Henry Hub Natural Gas', source: 'EIA', endpoint: '/api/eia', series: [] }} />}
                </div>
              </div>
            );
          })() : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted, #888)' }}>Natural gas price data unavailable</div>
          )}
        </BentoCard>
      </BentoWrapper>
      <DataFooter source="EIA (US Energy Information Administration)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} isHistorical={props.isHistorical} asOfDate={props.asOfDate} />
    </div>
  );
}

export default React.memo(EiaMarket);
