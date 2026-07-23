import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';

const FALLBACK_LABELS = {
  US: 'United States', GB: 'United Kingdom', JP: 'Japan', CA: 'Canada',
  CN: 'China', KR: 'South Korea', AU: 'Australia', SE: 'Sweden',
  CH: 'Switzerland', DE: 'Germany', FR: 'France', IT: 'Italy',
  ES: 'Spain', BR: 'Brazil', IN: 'India', MX: 'Mexico', ZA: 'South Africa',
  EA: 'Euro Area', XM: 'Euro Area',
};

/**
 * Normalize BIS total-credit payloads:
 *  - { US: { series:[{period,value}], label } }  (preferred)
 *  - { US: 251.2 }                               (legacy / proxy scalar)
 */
function normalizeRows(bisCreditToGDP) {
  if (!bisCreditToGDP || typeof bisCreditToGDP !== 'object') return { rows: [], proxy: null, source: null };

  const proxy = bisCreditToGDP._proxy || null;
  const source = bisCreditToGDP._source || null;
  const rows = [];

  for (const [country, info] of Object.entries(bisCreditToGDP)) {
    if (country.startsWith('_')) continue;

    let latest = null;
    let period = null;
    let label = FALLBACK_LABELS[country] || country;

    if (typeof info === 'number' && Number.isFinite(info)) {
      latest = info;
      period = null;
    } else if (info && typeof info === 'object') {
      label = info.label || label;
      if (Array.isArray(info.series) && info.series.length) {
        const last = info.series[info.series.length - 1];
        latest = last?.value ?? null;
        period = last?.period || null;
      } else if (info.latest != null) {
        latest = Number(info.latest);
        period = info.period || null;
      } else if (info.value != null) {
        latest = Number(info.value);
        period = info.period || null;
      }
    }

    if (latest == null || !Number.isFinite(Number(latest))) continue;
    rows.push({
      country,
      label,
      latest: Number(latest),
      period,
      seriesKey: `bisCreditToGDP_${country}`,
    });
  }

  rows.sort((a, b) => (b.latest || 0) - (a.latest || 0));
  return { rows, proxy, source };
}

function heatColor(v) {
  if (v == null) return 'var(--text-muted)';
  if (v > 280) return '#f87171';
  if (v > 220) return '#f59e0b';
  if (v > 160) return '#fbbf24';
  return '#22c55e';
}

export default function BisTotalCreditPanel() {
  const macroCtx = useMarketData('globalMacro');
  const data = macroCtx?.data || {};
  const bisCreditToGDP = data.bisCreditToGDP;

  const { rows, proxy, source } = useMemo(
    () => normalizeRows(bisCreditToGDP),
    [bisCreditToGDP],
  );

  if (!rows.length) {
    return (
      <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        BIS total credit data unavailable.
        {!macroCtx?.data && ' (load Global Macro / wait for /api/globalMacro)'}
      </div>
    );
  }

  const max = Math.max(...rows.map((r) => r.latest), 1);

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Total credit to non-financial sector (% of GDP)
        {proxy ? ' · proxy (WB gov debt)' : ' · BIS WS_TC'}
      </div>
      <div className="eq-mini-table" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 72px 56px 72px',
            gap: 6,
            alignItems: 'center',
            padding: '0 0 4px',
            fontSize: 8,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            position: 'sticky',
            top: 0,
            background: 'var(--bg-card, transparent)',
          }}
        >
          <span>Country</span>
          <span style={{ textAlign: 'right' }}>Credit/GDP</span>
          <span style={{ textAlign: 'right' }}>Period</span>
          <span style={{ textAlign: 'right' }}>Rel.</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.country}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 72px 56px 72px',
              gap: 6,
              alignItems: 'center',
              padding: '4px 0',
              fontSize: 11,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.label}
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: heatColor(r.latest), fontWeight: 700 }}>
              <MetricValue
                value={r.latest}
                seriesKey={r.seriesKey}
                timestamp={r.period || data.lastUpdated}
                format={(v) => (typeof v === 'number' ? `${v.toFixed(0)}%` : '—')}
              />
            </span>
            <span style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 10 }}>
              {r.period || '—'}
            </span>
            <span style={{ display: 'block', height: 6, borderRadius: 3, background: 'var(--bg-primary)', overflow: 'hidden' }}>
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${Math.min(100, (r.latest / max) * 100)}%`,
                  background: heatColor(r.latest),
                  borderRadius: 3,
                }}
              />
            </span>
          </div>
        ))}
      </div>
      {source && (
        <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 6 }}>
          Source: {String(source).replace(/_/g, ' ')}
        </div>
      )}
    </div>
  );
}
