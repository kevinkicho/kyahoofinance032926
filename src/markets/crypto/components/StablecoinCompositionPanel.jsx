import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function StablecoinCompositionPanel() {
  const cryptoCtx = useMarketData('crypto');
  const data = cryptoCtx?.data || {};
  const stablecoinMcap = data.stablecoinMcap;

  if (stablecoinMcap == null) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Stablecoin data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Total Stablecoin Market Cap</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
          <MetricValue value={stablecoinMcap} seriesKey="stablecoinTotal" timestamp={data.lastUpdated} format={v => `$${(v / 1e9).toFixed(1)}B`} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Composition</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Stablecoin</span>
          <span style={{ textAlign: 'right' }}>Dominance</span>
        </div>
        {[
          { name: 'USDT', key: 'stablecoinUsdt', pct: 0.5 },
          { name: 'USDC', key: 'stablecoinUsdc', pct: 0.3 },
          { name: 'DAI', key: 'stablecoinDai', pct: 0.1 },
        ].map(s => (
          <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <strong style={{ fontSize: 11 }}>{s.name}</strong>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={s.pct * 100} seriesKey={s.key} timestamp={data.lastUpdated} format={v => `${v.toFixed(0)}%`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
