import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function BisExchangeTradedPanel() {
  const bisCtx = useMarketData('bisOTC');
  const data = bisCtx?.data || {};
  const categories = data.categories || {};

  const categoryList = useMemo(() => {
    return Object.entries(categories).map(([key, cat]) => {
      const latest = cat.series && cat.series.length > 0 ? cat.series[cat.series.length - 1] : null;
      return { key, label: cat.label, latest, series: cat.series || [] };
    });
  }, [categories]);

  if (!categoryList.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>BIS OTC derivatives data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>OTC Derivatives Outstanding (Notional, $T)</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Category</span>
          <span style={{ textAlign: 'right' }}>Latest</span>
          <span style={{ textAlign: 'right' }}>Period</span>
        </div>
        {categoryList.map(cat => (
          <div key={cat.key} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{cat.label}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={cat.latest?.value} seriesKey={`bisOTC_${cat.key === 'total' ? 'Total' : cat.key === 'fx' ? 'FX' : cat.key === 'ir' ? 'IR' : cat.key === 'equity' ? 'Equity' : cat.key === 'cds' ? 'CDS' : cat.key}`} timestamp={cat.latest?.period} format={v => v != null ? `${(v / 1e6).toFixed(1)}T` : '—'} />
            </span>
            <span style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 10 }}>{cat.latest?.period || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
