import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function ImfCoferPanel() {
  const fxCtx = useMarketData('fx');
  const data = fxCtx?.data || {};
  const imfReserves = data.imfReserves;

  const rows = useMemo(() => {
    if (!imfReserves?.reserves) return [];
    return Object.entries(imfReserves.reserves)
      .map(([currency, info]) => ({
        currency,
        share: info.share,
        valueB: info.valueB,
        seriesKey: `imf${currency.charAt(0).toUpperCase() + currency.slice(1).toLowerCase()}Share`,
      }))
      .sort((a, b) => (b.share || 0) - (a.share || 0));
  }, [imfReserves]);

  if (!rows.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>IMF COFER data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      {imfReserves.totalAllocatedB != null && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Total Allocated Reserves</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
            <MetricValue value={imfReserves.totalAllocatedB} seriesKey="imfReserves" timestamp={imfReserves.asOf} format={v => `$${(v / 1e3).toFixed(1)}T`} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>As of: {imfReserves.asOf || '—'}</div>
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Currency Composition</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Currency</span>
          <span style={{ textAlign: 'right' }}>Share</span>
          <span style={{ textAlign: 'right' }}>Value ($B)</span>
        </div>
        {rows.map(r => (
          <div key={r.currency} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <strong style={{ fontSize: 11 }}>{r.currency}</strong>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#22c55e' }}>
              <MetricValue value={r.share} seriesKey={r.seriesKey} timestamp={imfReserves.asOf} format={v => `${v.toFixed(1)}%`} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
              {r.valueB != null ? `$${r.valueB.toFixed(0)}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
