import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function BisPropertyPricePanel() {
  const reCtx = useMarketData('realEstate');
  const data = reCtx?.data || {};
  const priceIndexData = data.priceIndexData;

  const countries = useMemo(() => {
    if (!priceIndexData || typeof priceIndexData !== 'object') return [];
    const labels = { US: 'United States', UK: 'United Kingdom', DE: 'Germany', AU: 'Australia', CA: 'Canada', JP: 'Japan' };
    return Object.entries(labels).map(([code, name]) => {
      const series = priceIndexData[code];
      if (!series?.values?.length) return null;
      const latest = series.values[series.values.length - 1];
      const prev = series.values.length > 12 ? series.values[series.values.length - 13] : series.values[0];
      const yoy = prev != null ? ((latest - prev) / prev) * 100 : null;
      return { code, name, latest, yoy, seriesKey: `bisProperty${code}` };
    }).filter(Boolean);
  }, [priceIndexData]);

  if (!countries.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>BIS property price data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Residential Property Price Indices (BIS)</div>
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>Index</span>
          <span style={{ textAlign: 'right' }}>YoY %</span>
        </div>
        {countries.map(c => (
          <div key={c.code} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px', gap: 4, alignItems: 'center', padding: '3px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{c.name}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              <MetricValue value={c.latest} seriesKey={c.seriesKey} timestamp={data.lastUpdated} format={v => v.toFixed(1)} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (c.yoy ?? 0) >= 0 ? '#4ade80' : '#f87171' }}>
              {c.yoy != null ? `${c.yoy >= 0 ? '+' : ''}${c.yoy.toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
