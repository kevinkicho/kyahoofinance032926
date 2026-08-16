import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

/** Normalize mixed server shapes (live HUD vs FRED proxy). */
function normalizeMetro(m) {
  if (!m || typeof m !== 'object') return null;
  let ratio = m.ratio ?? m.rentToIncome ?? null;
  if (ratio != null && Number(ratio) > 0 && Number(ratio) <= 1.5) {
    // Some payloads store 0.30 instead of 30
    ratio = Math.round(Number(ratio) * 1000) / 10;
  }
  let homeValue = m.homeValue ?? null;
  if (homeValue == null && m.medianHomeValue != null) {
    if (typeof m.medianHomeValue === 'number') homeValue = m.medianHomeValue;
    else if (Array.isArray(m.medianHomeValue?.values) && m.medianHomeValue.values.length) {
      homeValue = m.medianHomeValue.values[m.medianHomeValue.values.length - 1];
    }
  }
  if (ratio == null && homeValue == null && m.income == null) return null;
  return {
    city: m.city || m.metro || m.name || '—',
    ratio: ratio != null && Number.isFinite(Number(ratio)) ? Number(ratio) : null,
    homeValue: homeValue != null && Number.isFinite(Number(homeValue)) ? Number(homeValue) : null,
    rent: m.rent != null ? Number(m.rent) : null,
    income: m.income != null ? Number(m.income) : null,
    proxy: m._proxy || null,
  };
}

export function hasHudAffordabilityRows(hudData) {
  if (!Array.isArray(hudData)) return false;
  return hudData.some((m) => normalizeMetro(m)?.ratio != null);
}

export default function HudAffordabilityPanel() {
  const reCtx = useMarketData('realEstate');
  const data = reCtx?.data || {};
  const hudData = data.hudData;

  const metros = useMemo(() => {
    if (!Array.isArray(hudData)) return [];
    return hudData
      .map(normalizeMetro)
      .filter((m) => m && m.ratio != null)
      .sort((a, b) => (b.ratio || 0) - (a.ratio || 0))
      .slice(0, 15);
  }, [hudData]);

  if (!metros.length) {
    return (
      <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        HUD affordability data unavailable.
      </div>
    );
  }

  const isProxy = Array.isArray(hudData) && hudData.some((m) => m?._proxy);

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Rent-to-income by metro
        {isProxy ? ' · estimated (FRED / Case-Shiller)' : ' · HUD FMR + IL'}
      </div>
      <div className="eq-mini-table" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px', gap: 4, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', position: 'sticky', top: 0, background: 'var(--bg-card, transparent)' }}>
          <span>Metro</span>
          <span style={{ textAlign: 'right' }}>Rent/Inc</span>
          <span style={{ textAlign: 'right' }}>Home Val</span>
        </div>
        {metros.map((m) => (
          <div key={m.city} style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px', gap: 4, alignItems: 'center', padding: '4px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.city}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: m.ratio > 40 ? '#f87171' : m.ratio > 30 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
              <MetricValue value={m.ratio} seriesKey="hudRentIncome" timestamp={data.lastUpdated} format={(v) => (typeof v === 'number' ? `${v.toFixed(1)}%` : '—')} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
              <MetricValue value={m.homeValue} seriesKey="hudHomeValue" timestamp={data.lastUpdated} format={(v) => (v != null ? `$${(v / 1e3).toFixed(0)}K` : '—')} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
