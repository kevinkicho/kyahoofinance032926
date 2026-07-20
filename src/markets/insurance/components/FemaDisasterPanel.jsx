import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function FemaDisasterPanel() {
  const femaCtx = useMarketData('fema');
  const data = femaCtx?.data || {};
  const declarations = data.declarations || [];
  const byType = data.byType || [];

  if (!declarations.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>FEMA disaster data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      {byType.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>By Type</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {byType.slice(0, 5).map(t => (
              <span key={t.type} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t.type}</span>{' '}
                <strong style={{ color: '#f59e0b' }}>{t.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Declarations</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Title</span>
          <span style={{ textAlign: 'right' }}>States</span>
          <span style={{ textAlign: 'right' }}>Date</span>
        </div>
        {declarations.slice(0, 8).map(d => (
          <div key={d.disasterNumber} style={{ display: 'grid', gridTemplateColumns: '1fr 40px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || d.type}</span>
            <span style={{ textAlign: 'right', color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>{d.stateCount}</span>
            <span style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 9 }}>{d.firstDeclared?.slice(0, 10) || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
