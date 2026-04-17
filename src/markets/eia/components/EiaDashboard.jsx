import React, { useMemo } from 'react';

function computePctChange(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous) * 100).toFixed(1);
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

function SectorCard({ label, data }) {
  if (!data?.latest) return null;
  const chg = computePctChange(data.latest.price, data.previous?.price);
  return (
    <div className="eia-kpi-card">
      <span className="eia-kpi-label">{label}</span>
      <span className="eia-kpi-value">{data.latest.price != null ? data.latest.price.toFixed(2) : '—'}<span className="eia-kpi-unit"> ¢/kWh</span></span>
      {chg != null && (
        <span className={`eia-kpi-change ${parseFloat(chg) > 0 ? 'negative' : 'positive'}`}>
          {parseFloat(chg) > 0 ? '+' : ''}{chg}%
        </span>
      )}
      <span className="eia-kpi-unit">{data.latest.period}</span>
    </div>
  );
}

function SalesCard({ label, data }) {
  if (!data?.latest) return null;
  const salesB = data.latest.sales / 1e6;
  const revB = data.latest.revenue / 1e3;
  return (
    <div className="eia-kpi-card">
      <span className="eia-kpi-label">{label}</span>
      <span className="eia-kpi-value">{salesB.toFixed(1)}<span className="eia-kpi-unit"> B kWh</span></span>
      <span className="eia-kpi-unit">Revenue: ${revB.toFixed(0)}M · {data.latest.period}</span>
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
      <div className="eia-section-title">US Electricity Retail Prices</div>
      <div className="eia-kpi-grid">
        {elecSectors.map(({ key, label }) => (
          <SectorCard key={key} label={label} data={electricity[key]} />
        ))}
      </div>

      <div className="eia-section-title">Electricity Consumption</div>
      <div className="eia-kpi-grid">
        {elecSectors.map(({ key, label }) => (
          <SalesCard key={`sales-${key}`} label={label} data={electricity[key]} />
        ))}
      </div>

      <div className="eia-section-title">Price Trends (3-Year Monthly)</div>
      <div className="eia-chart-row">
        {elecSectors.filter(({ key }) => electricity[key]?.price?.values?.length >= 3).map(({ key, label }) => (
          <div key={`chart-${key}`} className="eia-mini-chart">
            <h4>{label} Price (¢/kWh)</h4>
            <MiniSparkline values={electricity[key].price.values} color="#ffa726" />
          </div>
        ))}
      </div>

      {co2Emissions.bySector && co2Emissions.bySector.length > 0 && (
        <>
          <div className="eia-section-title">CO₂ Emissions by Sector (US)</div>
          <div className="eia-co2-table">
            {co2Emissions.bySector.map(s => (
              <div key={s.name} className="eia-co2-row">
                <span className="eia-co2-sector">{s.name}</span>
                <span>
                  <span className="eia-co2-value">{s.latest.toFixed(1)}</span>
                  <span className="eia-co2-unit">{s.unit} ({s.period})</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}