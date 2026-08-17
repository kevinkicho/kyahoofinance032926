import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function metroSeriesKey(name) {
  if (name === 'San Francisco') return 'caseShillerSF';
  if (name === 'New York') return 'caseShillerNY';
  if (name === 'Los Angeles') return 'caseShillerLA';
  if (name === 'Miami') return 'caseShillerMiami';
  if (name === 'Chicago') return 'caseShillerChicago';
  return 'caseShiller';
}

/** Metro rows the tile can map. Leftover isLive latest/yoy bags remount-crash .toFixed on the always-mounted heatmap tile. */
export function metroCaseShillerRows(caseShillerData) {
  const metros = caseShillerData?.metros;
  if (!metros || typeof metros !== 'object' || Array.isArray(metros)) return [];
  const rows = [];
  for (const [name, info] of Object.entries(metros)) {
    if (!info || typeof info !== 'object' || Array.isArray(info)) continue;
    const latest = isFiniteNumber(info.latest) ? info.latest : null;
    const yoy = isFiniteNumber(info.yoy) ? info.yoy : null;
    if (latest == null && yoy == null) continue;
    rows.push({ name, latest, yoy, seriesKey: metroSeriesKey(name) });
  }
  return rows;
}

export function hasMetroCaseShillerRows(caseShillerData) {
  return metroCaseShillerRows(caseShillerData).length > 0;
}

export default function MetroCaseShillerPanel() {
  const reCtx = useMarketData('realEstate');
  const data = reCtx?.data || {};
  const caseShillerData = data.caseShillerData;

  const metros = useMemo(() => metroCaseShillerRows(caseShillerData), [caseShillerData]);

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
