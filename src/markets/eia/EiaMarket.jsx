import React, { useMemo } from 'react';
import MarketSkeleton from '../../hub/MarketSkeleton';
import MetricValue from '../../components/MetricValue/MetricValue';
import BentoWrapper from '../../components/BentoWrapper';
import DataFooter from '../../components/DataFooter/DataFooter';
import './EiaMarket.css';

const EIA_LAYOUT = {
  lg: [
    { i: 'prices', x: 0, y: 0, w: 6, h: 3 },
    { i: 'consumption', x: 6, y: 0, w: 6, h: 3 },
    { i: 'trends', x: 0, y: 3, w: 6, h: 3 },
    { i: 'co2', x: 6, y: 3, w: 6, h: 4 },
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

function MiniSparkline({ values, width = 200, height = 60, color = '#ffa726' }) {
  if (!values?.length || values.length < 2) return null;
  const vals = values.filter(v => v != null);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const step = width / (vals.length - 1);
  const points = vals.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

const ELEC_SECTORS = [
  { key: 'residential', label: 'Residential' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'industrial', label: 'Industrial' },
];

const stopDrag = (e) => e.stopPropagation();

function getEiaProps(centralData) {
  const d = centralData.data || {};
  return {
    electricity: d.electricity || {},
    co2Emissions: d.co2Emissions || {},
    isLive: centralData.isLive,
    lastUpdated: centralData.lastUpdated,
    isLoading: centralData.isLoading,
    fetchedOn: centralData.fetchedOn,
    isCurrent: centralData.isCurrent,
    error: centralData.error,
    fetchLog: centralData.fetchLog || [],
    refetch: centralData.refetch,
  };
}

function EiaMarket({ centralData } = {}) {
  if (!centralData) return <MarketSkeleton />;
  const props = getEiaProps(centralData);

  if (props.isLoading) return <MarketSkeleton />;

  const hasData = props.electricity.residential || props.electricity.commercial || props.electricity.industrial || props.co2Emissions.total || props.co2Emissions.bySector;

  if (!props.isLive && !hasData) {
    return (
      <div className="eia-market">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #888)' }}>
          Data source temporarily unavailable
        </div>
        <DataFooter source="EIA (US Energy Information Administration)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
      </div>
    );
  }

  const co2Sectors = (props.co2Emissions.bySector || []).filter(s => s.name !== 'Total' && s.name !== 'TT');

  return (
    <div className="eia-market">
      <BentoWrapper layout={EIA_LAYOUT} storageKey="eia-layout">
        <div key="prices" className="bento-card">
          <div className="eia-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">US Electricity Retail Prices</span>
          </div>
          <div className="bento-panel-content" onMouseDown={stopDrag}>
            <div className="eia-kpi-grid">
              {ELEC_SECTORS.map(({ key, label }) => (
                <SectorCard key={key} label={label} data={props.electricity[key]} />
              ))}
            </div>
          </div>
        </div>

        <div key="consumption" className="bento-card">
          <div className="eia-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Electricity Consumption</span>
          </div>
          <div className="bento-panel-content" onMouseDown={stopDrag}>
            <div className="eia-kpi-grid">
              {ELEC_SECTORS.map(({ key, label }) => (
                <SalesCard key={`sales-${key}`} label={label} data={props.electricity[key]} />
              ))}
            </div>
          </div>
        </div>

        <div key="trends" className="bento-card">
          <div className="eia-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Price Trends (3-Year Monthly)</span>
          </div>
          <div className="bento-panel-content" onMouseDown={stopDrag}>
            <div className="eia-chart-row">
              {ELEC_SECTORS.filter(({ key }) => props.electricity[key]?.price?.values?.length >= 3).map(({ key, label }) => (
                <div key={`chart-${key}`} className="eia-mini-chart">
                  <h4>{label} Price (¢/kWh)</h4>
                  <MiniSparkline values={props.electricity[key].price.values} color="#ffa726" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {co2Sectors.length > 0 && (
          <div key="co2" className="bento-card">
            <div className="eia-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">CO₂ Emissions by Sector (US)</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <div className="eia-co2-table">
                {co2Sectors.map(s => (
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
          </div>
        )}
      </BentoWrapper>
      <DataFooter source="EIA (US Energy Information Administration)" timestamp={props.lastUpdated} isLive={props.isLive} fetchLog={props.fetchLog} error={props.error} fetchedOn={props.fetchedOn} isCurrent={props.isCurrent} />
    </div>
  );
}

export default React.memo(EiaMarket);