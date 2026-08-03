import React, { useMemo } from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import MetricValue from '../../components/MetricValue/MetricValue';
import DataFooter from '../../components/DataFooter/DataFooter';
import SafeECharts from '../../components/SafeECharts';
import MarketPanelGrid from '../../panels/MarketPanelGrid';
import './EiaMarket.css';

const EIA_LAYOUT = {
  lg: [
    { i: 'prices', x: 0, y: 0, w: 6, h: 3 },
    { i: 'consumption', x: 6, y: 0, w: 6, h: 3 },
    { i: 'trends', x: 0, y: 3, w: 6, h: 3 },
    { i: 'co2', x: 6, y: 3, w: 6, h: 4 },
    { i: 'petroleum', x: 0, y: 7, w: 6, h: 4 },
    { i: 'natural-gas', x: 6, y: 7, w: 6, h: 4 },
  ],
};

function computePctChange(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous) * 100).toFixed(1);
}

function EmptyHint({ children }) {
  return (
    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted, #888)', fontSize: '0.85rem' }}>
      {children}
    </div>
  );
}

function SectorCard({ label, data, seriesKey }) {
  if (!data?.latest) return null;
  const chg = computePctChange(data.latest.price, data.previous?.price);
  // Prefer explicit YoY when history spans ~12 periods
  const hist = data.history || data.values;
  let yoy = null;
  if (Array.isArray(hist) && hist.length > 12) {
    const last = hist[hist.length - 1]?.price ?? hist[hist.length - 1];
    const prior = hist[hist.length - 13]?.price ?? hist[hist.length - 13];
    yoy = computePctChange(last, prior);
  }
  const spark = buildSparklineOption(
    data.values
      ? { values: data.values, dates: data.dates }
      : Array.isArray(data.history)
        ? { values: data.history.map((h) => h?.price ?? h), dates: data.history.map((h) => h?.period || h?.date) }
        : null,
    { color: '#ffa726', unit: '¢/kWh', label },
  );
  return (
    <div className="eia-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="eia-kpi-label">{label}</span>
      <span className="eia-kpi-value">
        <MetricValue
          value={data.latest.price}
          seriesKey={seriesKey}
          timestamp={data.latest?.period}
          format={(v) => v.toFixed(2)}
        />
        <span className="eia-kpi-unit"> ¢/kWh</span>
      </span>
      {chg != null && (
        <span className={`eia-kpi-change ${parseFloat(chg) > 0 ? 'negative' : 'positive'}`}>
          {parseFloat(chg) > 0 ? '+' : ''}{chg}% prior
        </span>
      )}
      {yoy != null && (
        <span className={`eia-kpi-change ${parseFloat(yoy) > 0 ? 'negative' : 'positive'}`} style={{ fontSize: 10 }}>
          YoY {parseFloat(yoy) > 0 ? '+' : ''}{yoy}%
        </span>
      )}
      <span className="eia-kpi-unit">{data.latest.period}</span>
      {spark && (
        <div style={{ height: 36, marginTop: 2 }}>
          <SafeECharts option={spark} style={{ height: '100%', width: '100%' }} />
        </div>
      )}
    </div>
  );
}

function SalesCard({ label, data, seriesKey }) {
  if (!data?.latest) return null;
  const revB = data.latest.revenue / 1e3;
  const spark = buildSparklineOption(
    data.values
      ? { values: data.values, dates: data.dates }
      : Array.isArray(data.history)
        ? { values: data.history.map((h) => h?.sales ?? h), dates: data.history.map((h) => h?.period || h?.date) }
        : null,
    { color: '#22d3ee', unit: 'B kWh', label },
  );
  return (
    <div className="eia-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="eia-kpi-label">{label}</span>
      <span className="eia-kpi-value">
        <MetricValue
          value={data.latest.sales}
          seriesKey={seriesKey}
          timestamp={data.latest?.period}
          format={(v) => `${(v / 1e3).toFixed(1)}`}
        />
        <span className="eia-kpi-unit"> B kWh</span>
      </span>
      <span className="eia-kpi-unit">Revenue: ${revB.toFixed(1)}B · {data.latest.period}</span>
      {spark && (
        <div style={{ height: 36, marginTop: 2 }}>
          <SafeECharts option={spark} style={{ height: '100%', width: '100%' }} />
        </div>
      )}
    </div>
  );
}

function buildSparklineOption(data, { color = '#ffa726', unit = '', label = '' } = {}) {
  if (!data?.values?.length) return null;
  const vals = data.values.filter((v) => v != null);
  if (vals.length < 2) return null;
  const dates = data.dates || [];
  return {
    grid: { left: 2, right: 2, top: 4, bottom: 2, containLabel: false },
    xAxis: {
      type: 'category',
      show: false,
      data: dates.length === vals.length ? dates : vals.map((_, i) => i),
      boundaryGap: false,
    },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const dateStr = dates.length === vals.length ? p.axisValue : '';
        return `<div style="font-size:11px"><b>${label || p.seriesName || ''}</b>${dateStr ? `<br/>${dateStr}` : ''}<br/>${p.marker} ${p.value?.toFixed != null ? p.value.toFixed(2) : p.value}${unit ? ` ${unit}` : ''}</div>`;
      },
    },
    dataZoom: [{ type: 'inside', zoomLock: false }],
    series: [{
      type: 'line',
      data: vals,
      smooth: 0.3,
      symbol: 'none',
      lineStyle: { color, width: 1.5 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `${color}40` },
            { offset: 1, color: `${color}05` },
          ],
        },
      },
    }],
    animation: false,
  };
}

const ELEC_SECTORS = [
  { key: 'residential', label: 'Residential' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'industrial', label: 'Industrial' },
];

const PETRO_SERIES = [
  { key: 'wti', label: 'WTI Crude', color: '#f97316', unit: '$/bbl' },
  { key: 'brent', label: 'Brent Crude', color: '#3b82f6', unit: '$/bbl' },
  { key: 'gasoline', label: 'Gasoline', color: '#22c55e', unit: '$/gal' },
  { key: 'diesel', label: 'Diesel', color: '#a855f7', unit: '$/gal' },
  { key: 'heatingOil', label: 'Heating Oil', color: '#ef4444', unit: '$/gal' },
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
  // Keep hooks unconditional — splash mounts markets before centralData exists.
  const props = centralData ? getEiaProps(centralData) : {
    electricity: {},
    co2Emissions: {},
    petroleum: {},
    naturalGas: {},
    isLive: false,
    lastUpdated: null,
    isLoading: true,
    fetchedOn: null,
    isCurrent: false,
    isHistorical: false,
    asOfDate: null,
    error: null,
    fetchLog: [],
  };

  // Always mount bento shells so panel-health / smoke never see 0 panels.
  const co2Sectors = (Array.isArray(props.co2Emissions.bySector) ? props.co2Emissions.bySector : [])
    .filter((s) => {
      const n = String(s?.name || '');
      return n && !/^total\b/i.test(n) && n !== 'TT';
    });

  const priceCards = ELEC_SECTORS
    .filter(({ key }) => props.electricity[key]?.latest?.price != null)
    .map(({ key, label }) => {
      const seriesKey = `eia${key.charAt(0).toUpperCase() + key.slice(1)}Price`;
      return <SectorCard key={key} label={label} data={props.electricity[key]} seriesKey={seriesKey} />;
    });

  const salesCards = ELEC_SECTORS
    .filter(({ key }) => props.electricity[key]?.latest?.sales != null)
    .map(({ key, label }) => {
      const seriesKey = `eia${key.charAt(0).toUpperCase() + key.slice(1)}Sales`;
      return <SalesCard key={`sales-${key}`} label={label} data={props.electricity[key]} seriesKey={seriesKey} />;
    });

  const trendCharts = ELEC_SECTORS
    .filter(({ key }) => props.electricity[key]?.price?.values?.length >= 3)
    .map(({ key, label }) => {
      const opt = buildSparklineOption(props.electricity[key].price, {
        color: '#ffa726',
        unit: '¢/kWh',
        label: `${label} Price`,
      });
      if (!opt) return null;
      return (
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
      );
    })
    .filter(Boolean);

  const petroCharts = PETRO_SERIES.map(({ key, label, color, unit }) => {
    const data = props.petroleum?.[key];
    if (!data?.values?.length) return null;
    const opt = buildSparklineOption(data, { color, unit, label });
    if (!opt) return null;
    return (
      <div key={key} className="eia-mini-chart">
        <h4>{label}</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary, #eee)' }}>
            <MetricValue
              value={data.latest?.value}
              seriesKey={`eiaPetroleum${key.charAt(0).toUpperCase() + key.slice(1)}`}
              timestamp={data.latest?.period}
              format={(v) => v.toFixed(2)}
            />
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #666)' }}>
            {unit} · {data.latest?.period}
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SafeECharts
            option={opt}
            style={{ height: '100%', width: '100%', minHeight: '60px' }}
            sourceInfo={{ title: label, source: 'EIA', endpoint: '/api/eia', series: [] }}
          />
        </div>
      </div>
    );
  }).filter(Boolean);

  const ng = props.naturalGas?.henryHub;
  const ngOpt = ng?.values?.length > 0
    ? buildSparklineOption(ng, { color: '#06b6d4', unit: '$/MMBTU', label: 'Henry Hub' })
    : null;

  const panelCtx = useMemo(() => {
    const bodies = {
      prices: (
        <div className="eia-kpi-grid">
          {priceCards.length ? priceCards : (
            <EmptyHint>
              {props.isLoading ? 'Loading electricity prices…' : 'Electricity price data unavailable'}
            </EmptyHint>
          )}
        </div>
      ),
      consumption: (
        <div className="eia-kpi-grid">
          {salesCards.length ? salesCards : (
            <EmptyHint>
              {props.isLoading ? 'Loading consumption…' : 'Electricity consumption data unavailable'}
            </EmptyHint>
          )}
        </div>
      ),
      trends: (
        <div className="eia-chart-row">
          {trendCharts.length ? trendCharts : (
            <EmptyHint>
              {props.isLoading ? 'Loading trends…' : 'Price trend series unavailable'}
            </EmptyHint>
          )}
        </div>
      ),
      co2: co2Sectors.length > 0 ? (
        <div className="eia-co2-table">
          {co2Sectors.map((s) => (
            <div key={s.name} className="eia-co2-row">
              <span className="eia-co2-sector">{s.name}</span>
              <span>
                <span className="eia-co2-value">
                  <MetricValue
                    value={s.latest}
                    seriesKey="eiaCo2BySector"
                    timestamp={s.period}
                    format={(v) => v.toFixed(1)}
                  />
                </span>
                <span className="eia-co2-unit">{s.unit} ({s.period})</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyHint>
          {props.isLoading ? 'Loading emissions…' : 'CO₂ emissions data unavailable'}
        </EmptyHint>
      ),
      petroleum: (
        <div className="eia-chart-row">
          {petroCharts.length ? petroCharts : (
            <EmptyHint>
              {props.isLoading ? 'Loading petroleum…' : 'Petroleum price data unavailable'}
            </EmptyHint>
          )}
        </div>
      ),
      'natural-gas': ng?.values?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '8px 12px 0' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary, #eee)' }}>
              <MetricValue
                value={ng.latest?.value}
                seriesKey="eiaNaturalGasHenryHub"
                timestamp={ng.latest?.period}
                format={(v) => v.toFixed(2)}
              />
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #666)' }}>
              $/MMBTU · {ng.latest?.period}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0, padding: '0 12px 8px' }}>
            {ngOpt && (
              <SafeECharts
                option={ngOpt}
                style={{ height: '100%', width: '100%' }}
                sourceInfo={{ title: 'Henry Hub Natural Gas', source: 'EIA', endpoint: '/api/eia', series: [] }}
              />
            )}
          </div>
        </div>
      ) : (
        <EmptyHint>
          {props.isLoading ? 'Loading natural gas…' : 'Natural gas price data unavailable'}
        </EmptyHint>
      ),
    };
    const ids = Object.keys(bodies);
    return {
      __render: (panelId) => bodies[panelId] ?? null,
      __live: Object.fromEntries(ids.map((id) => [id, !!props.isLive])),
      __noFooter: Object.fromEntries(ids.map((id) => [id, true])),
    };
  }, [priceCards, salesCards, trendCharts, co2Sectors, petroCharts, ng, ngOpt, props.isLive, props.isLoading]);

  return (
    <div className="eia-market" data-market="eia">
      <MarketPanelGrid
        marketId="eia"
        layout={EIA_LAYOUT}
        storageKey="eia-layout-v2"
        accent="eia"
        ctx={panelCtx}
        provenance={{
          timestamp: props.lastUpdated,
          isCurrent: props.isCurrent,
          fetchedOn: props.fetchedOn,
          fetchLog: props.fetchLog,
          error: props.error,
          isLoading: props.isLoading,
        }}
      />
      <DataFooter
        source="EIA (US Energy Information Administration)"
        timestamp={props.lastUpdated}
        isLive={props.isLive}
        fetchLog={props.fetchLog}
        error={props.error}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
        isHistorical={props.isHistorical}
        asOfDate={props.asOfDate}
        isLoading={props.isLoading}
      />
    </div>
  );
}

export default React.memo(EiaMarket);
