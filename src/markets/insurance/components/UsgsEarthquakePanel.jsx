import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function UsgsEarthquakePanel() {
  const usgsCtx = useMarketData('usgs');
  const data = usgsCtx?.data || {};
  const events = data.events || [];
  const magBuckets = data.magBuckets || [];
  const biggest = data.biggest;

  if (!events.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>USGS earthquake data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      {biggest && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Largest Recent Event</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171' }}>
            M{biggest.mag?.toFixed(1)} — {biggest.place}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{biggest.time?.slice(0, 10)} · depth: {biggest.depthKm} km</div>
        </div>
      )}
      {magBuckets.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Magnitude Distribution (30d)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {magBuckets.map(b => (
              <span key={b.range} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: 'var(--text-muted)' }}>M{b.range}</span>{' '}
                <strong style={{ color: b.range.startsWith('7') ? '#f87171' : '#f59e0b' }}>{b.count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent Events (M4.5+)</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 40px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span style={{ textAlign: 'right' }}>Mag</span>
          <span>Location</span>
          <span style={{ textAlign: 'right' }}>Date</span>
        </div>
        {events.slice(0, 8).map(e => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 40px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (e.mag ?? 0) >= 6 ? '#f87171' : '#f59e0b', fontWeight: 700 }}>
              {e.mag?.toFixed(1)}
            </span>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.place}</span>
            <span style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 9 }}>{e.time?.slice(0, 10) || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
