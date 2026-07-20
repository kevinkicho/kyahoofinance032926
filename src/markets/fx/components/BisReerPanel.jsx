import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function BisReerPanel() {
  const fxCtx = useMarketData('fx');
  const data = fxCtx?.data || {};
  const reer = data.reer;

  const countries = useMemo(() => {
    if (!reer?.dates?.length) return [];
    const labels = { US: 'United States', EU: 'Euro Area', JP: 'Japan', GB: 'United Kingdom', CN: 'China' };
    const seriesKeys = { US: 'reerUS', EU: 'reerEU', JP: 'reerJP', GB: 'reerGB', CN: 'reerCN' };
    return Object.keys(labels).map(code => {
      const values = reer[code];
      if (!values?.length) return null;
      const latest = values[values.length - 1];
      const prev = values.length > 1 ? values[values.length - 2] : null;
      const change = prev != null ? latest - prev : null;
      return { code, name: labels[code], latest, change, seriesKey: seriesKeys[code] };
    }).filter(Boolean);
  }, [reer]);

  if (!countries.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>BIS REER data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Real Effective Exchange Rates (BIS)</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>REER</span>
          <span style={{ textAlign: 'right' }}>Chg</span>
        </div>
        {countries.map(c => (
          <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{c.name}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={c.latest} seriesKey={c.seriesKey} timestamp={reer.dates?.[reer.dates.length - 1]} format={v => v.toFixed(1)} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: c.change >= 0 ? '#4ade80' : '#f87171' }}>
              {c.change != null ? `${c.change >= 0 ? '+' : ''}${c.change.toFixed(1)}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
