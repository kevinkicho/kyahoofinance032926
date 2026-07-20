import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function BisTotalCreditPanel() {
  const macroCtx = useMarketData('globalMacro');
  const data = macroCtx?.data || {};
  const bisCreditToGDP = data.bisCreditToGDP;

  const rows = useMemo(() => {
    if (!bisCreditToGDP || typeof bisCreditToGDP !== 'object') return [];
    return Object.entries(bisCreditToGDP)
      .map(([country, info]) => {
        if (!info?.series?.length) return null;
        const latest = info.series[info.series.length - 1];
        return { country, label: info.label || country, latest: latest?.value, period: latest?.period, seriesKey: `bisCreditToGDP_${country}` };
      })
      .filter(Boolean)
      .sort((a, b) => (b.latest || 0) - (a.latest || 0));
  }, [bisCreditToGDP]);

  if (!rows.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>BIS total credit data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Credit to Non-Financial Sector (% of GDP)</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>Credit/GDP</span>
          <span style={{ textAlign: 'right' }}>Period</span>
        </div>
        {rows.map(r => (
          <div key={r.country} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.latest > 200 ? '#f87171' : r.latest > 150 ? '#f59e0b' : '#22c55e' }}>
              <MetricValue value={r.latest} seriesKey={r.seriesKey} timestamp={r.period} format={v => `${v.toFixed(0)}%`} />
            </span>
            <span style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 10 }}>{r.period || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
