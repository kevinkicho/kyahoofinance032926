import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function EcbDerivativesPanel() {
  const ecbCtx = useMarketData('ecb');
  const data = ecbCtx?.data || {};
  const policyRates = data.policyRates;

  const rates = useMemo(() => {
    if (!policyRates) return [];
    return [
      { label: 'Main Refinancing Rate', key: 'ecbMainRefiRate', value: policyRates.mainRefinancing?.value, period: policyRates.mainRefinancing?.period },
      { label: 'Deposit Facility Rate', key: 'ecbDepositRate', value: policyRates.depositFacility?.value, period: policyRates.depositFacility?.period },
      { label: 'Marginal Lending Rate', key: 'ecbMarginalLending', value: policyRates.marginalLending?.value, period: policyRates.marginalLending?.period },
    ];
  }, [policyRates]);

  const m3Latest = useMemo(() => {
    const m3 = data.m3Growth || [];
    return m3.length > 0 ? m3[m3.length - 1] : null;
  }, [data.m3Growth]);

  const hicpLatest = useMemo(() => {
    const hicp = data.hicpDetail || [];
    return hicp.length > 0 ? hicp[hicp.length - 1] : null;
  }, [data.hicpDetail]);

  if (!policyRates && !data.m3Growth && !data.hicpDetail) {
    return <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>ECB data unavailable.</div>;
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px' }}>
      {rates.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>ECB Policy Rates</div>
          <div className="eq-mini-table">
            {rates.map(r => (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: 6, alignItems: 'center', padding: '2px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
                  <MetricValue value={r.value} seriesKey={r.key} timestamp={r.period} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {m3Latest && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>M3 Money Supply (YoY)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>
              <MetricValue value={m3Latest.value} seriesKey="ecbM3Growth" timestamp={m3Latest.period} format={v => `${v.toFixed(1)}%`} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m3Latest.period}</div>
          </div>
        )}
        {hicpLatest && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>HICP Inflation (YoY)</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: hicpLatest.value > 3 ? '#f87171' : '#22c55e' }}>
              <MetricValue value={hicpLatest.value} seriesKey="ecbHicp" timestamp={hicpLatest.period} format={v => `${v.toFixed(1)}%`} />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{hicpLatest.period}</div>
          </div>
        )}
      </div>
    </div>
  );
}
