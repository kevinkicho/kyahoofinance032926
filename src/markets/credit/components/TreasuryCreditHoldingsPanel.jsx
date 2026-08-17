import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

/** TIC latest rows the treasury-credit-holdings tile can slice. Leftover isLive / latest bag remount-crash .slice. */
export function ticLatestRows(ticData) {
  return Array.isArray(ticData?.latest) ? ticData.latest : [];
}

export function hasTreasuryCreditHoldings(latest) {
  return Array.isArray(latest) && latest.length > 0;
}

export default function TreasuryCreditHoldingsPanel() {
  const ticCtx = useMarketData('treasuryTIC');
  const latest = ticLatestRows(ticCtx?.data);

  const topHolders = useMemo(() => {
    return latest.slice(0, 10);
  }, [latest]);

  if (!hasTreasuryCreditHoldings(topHolders)) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>Treasury TIC data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Top Foreign Holders of US Treasury Securities</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>Holdings ($B)</span>
        </div>
        {topHolders.map((r, i) => (
          <div key={r.country} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 10, marginRight: 4 }}>#{i + 1}</span>
              {r.country}
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={r.holdingsB} seriesKey={r.country === 'Japan' ? 'ticJapan' : r.country === 'China, Mainland' ? 'ticChina' : r.country === 'United Kingdom' ? 'ticUK' : 'ticTotal'} timestamp={r.period} format={v => `$${(v / 1e3).toFixed(1)}T`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
