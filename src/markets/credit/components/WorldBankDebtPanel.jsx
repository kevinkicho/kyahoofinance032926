import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

/** World Bank country rows the wb-debt table can spread. Leftover isLive / countries bag remount-crash [...countries]. */
export function wbDebtCountryRows(wbData) {
  return Array.isArray(wbData?.countries) ? wbData.countries : [];
}

export function hasWbDebtRows(countries) {
  return Array.isArray(countries) && countries.length > 0;
}

export default function WorldBankDebtPanel() {
  const wbCtx = useMarketData('worldbank');
  const data = wbCtx?.data || {};
  const countries = wbDebtCountryRows(data);

  const sorted = useMemo(() => {
    return [...countries].sort((a, b) => (b.gdpGrowth || 0) - (a.gdpGrowth || 0));
  }, [countries]);

  if (!hasWbDebtRows(sorted)) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>World Bank data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Key Indicators by Country</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 52px 52px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span></span>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>GDP %</span>
          <span style={{ textAlign: 'right' }}>Trade %</span>
        </div>
        {sorted.slice(0, 10).map(c => (
          <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 52px 52px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 14 }}>{c.flag}</span>
            <strong style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</strong>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (c.gdpGrowth ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
              <MetricValue value={c.gdpGrowth} seriesKey="wbGdpGrowth" timestamp={c.gdpGrowthYear} format={v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : '—'} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
              <MetricValue value={c.tradeGdp} seriesKey="wbTradeGdp" timestamp={c.tradeGdpYear} format={v => v != null ? `${v.toFixed(0)}%` : '—'} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
