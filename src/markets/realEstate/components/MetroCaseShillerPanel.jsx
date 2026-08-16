import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export function hasMetroCaseShillerRows(caseShillerData) {
  const metros = caseShillerData?.metros;
  if (!metros || typeof metros !== 'object') return false;
  return Object.entries(metros).some(([, info]) => info && typeof info === 'object');
}

export default function MetroCaseShillerPanel() {
  const reCtx = useMarketData('realEstate');
  const data = reCtx?.data || {};
  const caseShillerData = data.caseShillerData;

  const metros = useMemo(() => {
    if (!caseShillerData?.metros || typeof caseShillerData.metros !== 'object') return [];
    return Object.entries(caseShillerData.metros)
      .filter(([, info]) => info && typeof info === 'object')
      .map(([name, info]) => ({
        name,
        latest: info.latest ?? null,
        yoy: info.yoy ?? null,
        seriesKey: name === 'San Francisco' ? 'caseShillerSF' : name === 'New York' ? 'caseShillerNY' : name === 'Los Angeles' ? 'caseShillerLA' : name === 'Miami' ? 'caseShillerMiami' : name === 'Chicago' ? 'caseShillerChicago' : 'caseShiller',
      }));
  }, [caseShillerData]);

  if (!metros.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Metro Case-Shiller data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Metro Home Price Indices</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Metro</span>
          <span style={{ textAlign: 'right' }}>Index</span>
          <span style={{ textAlign: 'right' }}>YoY %</span>
        </div>
        {metros.map(m => (
          <div key={m.name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{m.name}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={m.latest} seriesKey={m.seriesKey} timestamp={data.lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (m.yoy ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
              {m.yoy != null ? `${m.yoy >= 0 ? '+' : ''}${m.yoy.toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
