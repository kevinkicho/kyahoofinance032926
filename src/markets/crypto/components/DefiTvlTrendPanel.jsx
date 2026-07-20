import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function DefiTvlTrendPanel() {
  const cryptoCtx = useMarketData('crypto');
  const data = cryptoCtx?.data || {};
  const defiData = data.defiData;

  const chains = useMemo(() => {
    if (defiData?.chains) return defiData.chains;
    if (Array.isArray(defiData)) return defiData;
    return [];
  }, [defiData]);

  if (!chains.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>DeFi TVL data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TVL by Chain</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Chain</span>
          <span style={{ textAlign: 'right' }}>TVL ($B)</span>
          <span style={{ textAlign: 'right' }}>7d Chg</span>
        </div>
        {chains.slice(0, 8).map(c => (
          <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <strong style={{ fontSize: 11 }}>{c.name}</strong>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={c.tvlB} seriesKey={c.name === 'Ethereum' ? 'defiTvlEth' : c.name === 'Solana' ? 'defiTvlSol' : c.name === 'BSC' ? 'defiTvlBsc' : 'defiTvl'} timestamp={data.lastUpdated} format={v => v.toFixed(1)} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (c.change7d ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
              {c.change7d != null ? `${c.change7d >= 0 ? '+' : ''}${c.change7d.toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
