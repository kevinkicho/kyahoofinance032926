import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function TreasuryTicPanel() {
  const ticCtx = useMarketData('treasuryTIC');
  const data = ticCtx?.data || {};
  const latest = data.latest || [];

  const topHolders = useMemo(() => {
    return latest.slice(0, 12);
  }, [latest]);

  const totalHoldings = useMemo(() => {
    return latest.reduce((s, r) => s + (r.holdingsB || 0), 0);
  }, [latest]);

  if (!topHolders.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Treasury TIC data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Total Foreign Holdings (Top 12)</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
          <MetricValue value={totalHoldings} seriesKey="ticTotal" timestamp={topHolders[0]?.period} format={v => `$${(v / 1e3).toFixed(1)}T`} />
        </div>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>As of: {topHolders[0]?.period || '—'}</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Foreign Holders</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>Holdings ($B)</span>
        </div>
        {topHolders.map(r => (
          <div key={r.country} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.country}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={r.holdingsB} seriesKey={r.country === 'Japan' ? 'ticJapan' : r.country === 'China, Mainland' ? 'ticChina' : r.country === 'United Kingdom' ? 'ticUK' : 'ticTotal'} timestamp={r.period} format={v => `$${(v / 1e3).toFixed(1)}T`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
