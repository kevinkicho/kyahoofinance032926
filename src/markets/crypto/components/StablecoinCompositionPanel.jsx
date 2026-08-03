import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';

const FALLBACK_SHARE = [
  { name: 'USDT', pct: 50 },
  { name: 'USDC', pct: 30 },
  { name: 'DAI', pct: 10 },
  { name: 'Other', pct: 10 },
];

export default function StablecoinCompositionPanel() {
  const cryptoCtx = useMarketData('crypto');
  const data = cryptoCtx?.data || {};
  const stablecoinMcap = data.stablecoinMcap;
  const composition = Array.isArray(data.stablecoinComposition) ? data.stablecoinComposition : null;

  const rows = useMemo(() => {
    if (composition?.length) {
      return composition.map((c) => ({
        name: c.symbol || c.name,
        pct: c.pct,
        mcapB: c.mcapB,
      }));
    }
    // Legacy caches without composition: approximate share for layout only
    return FALLBACK_SHARE.map((s) => ({
      name: s.name,
      pct: s.pct,
      mcapB: stablecoinMcap != null ? Math.round((stablecoinMcap * s.pct) / 100 / 1e9 * 10) / 10 : null,
      approximate: true,
    }));
  }, [composition, stablecoinMcap]);

  const pieOption = useMemo(() => {
    if (!rows.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (p) => `${p.name}: ${p.percent?.toFixed?.(1) ?? p.value}%`,
      },
      series: [{
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '52%'],
        label: { fontSize: 9, color: '#94a3b8' },
        data: rows.map((r, i) => ({
          name: r.name,
          value: r.pct,
          itemStyle: {
            color: ['#22c55e', '#3b82f6', '#f59e0b', '#a78bfa', '#ec4899', '#14b8a6', '#eab308', '#64748b'][i % 8],
          },
        })),
      }],
    };
  }, [rows]);

  if (stablecoinMcap == null && !composition?.length) {
    return (
      <div className="eq-panel-content" style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12 }}>
        Stablecoin data unavailable.
      </div>
    );
  }

  return (
    <div className="eq-panel-content" style={{ padding: '8px 12px', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Total Stablecoin Market Cap</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>
          {stablecoinMcap != null ? (
            <MetricValue value={stablecoinMcap} seriesKey="stablecoinTotal" timestamp={data.lastUpdated} format={v => `$${(v / 1e9).toFixed(1)}B`} />
          ) : '—'}
        </div>
        {rows.some((r) => r.approximate) && (
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Share approx until live composition refresh</div>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 90 }}>
        {pieOption && (
          <SafeECharts
            option={pieOption}
            style={{ height: '100%', width: '100%' }}
            sourceInfo={{ title: 'Stablecoin composition', source: 'DefiLlama', endpoint: '/api/crypto', series: [] }}
          />
        )}
      </div>
      <div className="eq-mini-table" style={{ marginTop: 4 }}>
        {rows.slice(0, 6).map((s) => (
          <div
            key={s.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 52px 56px',
              gap: 4,
              alignItems: 'center',
              padding: '2px 0',
              fontSize: 11,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <strong style={{ fontSize: 11 }}>{s.name}</strong>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#60a5fa' }}>
              {s.pct != null ? `${Number(s.pct).toFixed(1)}%` : '—'}
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.75 }}>
              {s.mcapB != null ? `$${s.mcapB}B` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
