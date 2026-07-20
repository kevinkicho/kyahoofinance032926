import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function HudAffordabilityPanel() {
  const reCtx = useMarketData('realEstate');
  const data = reCtx?.data || {};
  const hudData = data.hudData;

  const metros = useMemo(() => {
    if (!Array.isArray(hudData)) return [];
    return hudData
      .filter(m => m.ratio != null)
      .sort((a, b) => (b.ratio || 0) - (a.ratio || 0))
      .slice(0, 10);
  }, [hudData]);

  if (!metros.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>HUD affordability data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rent-to-Income Ratio by Metro</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Metro</span>
          <span style={{ textAlign: 'right' }}>Rent/Inc</span>
          <span style={{ textAlign: 'right' }}>Home Val</span>
        </div>
        {metros.map(m => (
          <div key={m.city} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.city}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: m.ratio > 0.3 ? '#f87171' : m.ratio > 0.2 ? '#f59e0b' : '#22c55e' }}>
              <MetricValue value={m.ratio * 100} seriesKey="hudRentIncome" timestamp={data.lastUpdated} format={v => `${v.toFixed(0)}%`} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
              <MetricValue value={m.homeValue} seriesKey="hudHomeValue" timestamp={data.lastUpdated} format={v => v != null ? `$${(v / 1e3).toFixed(0)}K` : '—'} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
