import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function WbInsurancePenetrationPanel() {
  const wbCtx = useMarketData('worldbank');
  const data = wbCtx?.data || {};
  const countries = data.countries || [];

  const sorted = useMemo(() => {
    return [...countries].filter(c => c.lifeInsPctGdp != null || c.nonLifeInsPctGdp != null).sort((a, b) => ((b.lifeInsPctGdp || 0) + (b.nonLifeInsPctGdp || 0)) - ((a.lifeInsPctGdp || 0) + (a.nonLifeInsPctGdp || 0)));
  }, [countries]);

  if (!sorted.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>World Bank insurance data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Insurance Premiums as % of GDP</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 52px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span></span>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>Life</span>
          <span style={{ textAlign: 'right' }}>Non-Life</span>
        </div>
        {sorted.slice(0, 10).map(c => (
          <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 52px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 14 }}>{c.flag}</span>
            <strong style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</strong>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={c.lifeInsPctGdp} seriesKey="wbLifeIns" timestamp={c.lifeInsPctGdpYear} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#22c55e' }}>
              <MetricValue value={c.nonLifeInsPctGdp} seriesKey="wbNonLifeIns" timestamp={c.nonLifeInsPctGdpYear} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
