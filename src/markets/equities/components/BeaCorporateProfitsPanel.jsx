import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function BeaCorporateProfitsPanel() {
  const beaCtx = useMarketData('bea');
  const data = beaCtx?.data || {};
  const gdpComponents = data.gdpComponents || [];
  const savingRate = data.savingRate || [];

  const latestGdp = useMemo(() => {
    if (!gdpComponents.length) return null;
    const gdpLine = gdpComponents.filter(r => r.line === '1');
    return gdpLine.length > 0 ? gdpLine[0] : null;
  }, [gdpComponents]);

  const latestSaving = useMemo(() => {
    if (!savingRate.length) return null;
    const sorted = [...savingRate].sort((a, b) => b.period.localeCompare(a.period));
    return sorted[0] || null;
  }, [savingRate]);

  const gdpByComponent = useMemo(() => {
    if (!gdpComponents.length) return [];
    const seen = new Set();
    return gdpComponents.filter(r => {
      if (seen.has(r.line)) return false;
      seen.add(r.line);
      return r.value != null;
    }).slice(0, 12);
  }, [gdpComponents]);

  if (!gdpComponents.length && !savingRate.length) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>BEA data unavailable — BEA_API_KEY may not be configured.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      {latestGdp && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Real GDP (Latest Quarter)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
            <MetricValue value={latestGdp.value} seriesKey="beaGdpNominal" timestamp={latestGdp.period} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Period: {latestGdp.period}</div>
        </div>
      )}
      {latestSaving && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Personal Saving Rate (Latest Month)</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>
            <MetricValue value={latestSaving.value} seriesKey="beaSavingRate" timestamp={latestSaving.period} format={v => `${v.toFixed(1)}%`} />
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Period: {latestSaving.period}</div>
        </div>
      )}
      {gdpByComponent.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>GDP Components (Latest Quarter)</div>
          <div className="eq-mini-table">
            {gdpByComponent.map((r, i) => (
              <div key={r.line || i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 6, alignItems: 'center', padding: '2px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.value >= 0 ? '#4ade80' : '#f87171' }}>
                  {r.value != null ? `${r.value >= 0 ? '+' : ''}${r.value.toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
