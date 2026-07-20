import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function WorldBankMarketCapPanel() {
  const wbCtx = useMarketData('worldbank');
  const data = wbCtx?.data || {};
  const countries = data.countries || [];

  const sortedByMcap = useMemo(() => {
    return [...countries].sort((a, b) => (b.gdpPerCap || 0) - (a.gdpPerCap || 0));
  }, [countries]);

  if (!countries.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>World Bank data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Key Indicators by Country</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 52px 52px 52px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span></span>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>GDP %</span>
          <span style={{ textAlign: 'right' }}>CPI %</span>
          <span style={{ textAlign: 'right' }}>GDP/Cap</span>
        </div>
        {sortedByMcap.slice(0, 10).map(c => (
          <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 52px 52px 52px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 14 }}>{c.flag}</span>
            <strong style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</strong>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (c.gdpGrowth ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
              <MetricValue value={c.gdpGrowth} seriesKey="wbGdpGrowth" timestamp={c.gdpGrowthYear} format={v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—'} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (c.inflation ?? 0) > 5 ? '#f87171' : '#94a3b8' }}>
              <MetricValue value={c.inflation} seriesKey="wbInflation" timestamp={c.inflationYear} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <MetricValue value={c.gdpPerCap} seriesKey="wbGdpPerCap" timestamp={c.gdpPerCapYear} format={v => v != null ? `$${v.toLocaleString()}` : '—'} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
