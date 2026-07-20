import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function BtcOnChainPanel() {
  const cryptoCtx = useMarketData('crypto');
  const data = cryptoCtx?.data || {};
  const onChainData = data.onChainData;

  if (!onChainData) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>On-chain data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {onChainData.hashrate?.current != null && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Hashrate</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>
              <MetricValue value={onChainData.hashrate.current} seriesKey="btcHashrate" timestamp={data.lastUpdated} format={v => `${v} EH/s`} />
            </div>
          </div>
        )}
        {onChainData.mempool?.count != null && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Mempool</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa' }}>
              <MetricValue value={onChainData.mempool.count} seriesKey="btcMempool" timestamp={data.lastUpdated} format={v => `${(v / 1000).toFixed(0)}K txs`} />
            </div>
          </div>
        )}
        {onChainData.difficulty?.difficultyChange != null && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Difficulty Change</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: onChainData.difficulty.difficultyChange >= 0 ? '#4ade80' : '#f87171' }}>
              <MetricValue value={onChainData.difficulty.difficultyChange} seriesKey="btcDifficulty" timestamp={data.lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
            </div>
          </div>
        )}
        {onChainData.fees?.fastest != null && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Fees (fastest)</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa' }}>
              <MetricValue value={onChainData.fees.fastest} seriesKey="btcMempool" timestamp={data.lastUpdated} format={v => `${v} sat/vB`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
