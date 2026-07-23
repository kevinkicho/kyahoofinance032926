import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './ImfCoferPanel.css';

const COFER_COLORS = {
  USD: '#22c55e',
  EUR: '#3b82f6',
  JPY: '#f87171',
  GBP: '#a78bfa',
  CNY: '#f59e0b',
  CHF: '#94a3b8',
  SDR: '#14b8a6',
  Other: '#6b7280',
  Total: '#64748b',
};

/**
 * Normalize COFER into rows of { currency, share } from either:
 *  - fx.imfReserves.reserves: { USD: 57.8 } or { USD: { share, valueB } }
 *  - imf.cofer: { USD: { value: 57.8, asOf } }
 */
function normalizeCofer(imfReserves, imfCofer) {
  const rows = [];
  let asOf = imfReserves?.asOf || null;
  let totalAllocatedB = imfReserves?.totalAllocatedB ?? null;
  let source = imfReserves?._source || imfReserves?._vintage || null;

  const push = (currency, share, valueB = null) => {
    if (!currency || currency === 'Total') return;
    const s = Number(share);
    if (!Number.isFinite(s)) return;
    rows.push({
      currency,
      share: s,
      valueB: valueB != null && Number.isFinite(Number(valueB)) ? Number(valueB) : null,
      seriesKey: `imf${currency.charAt(0).toUpperCase()}${currency.slice(1).toLowerCase()}Share`,
    });
  };

  if (imfReserves?.reserves && typeof imfReserves.reserves === 'object') {
    for (const [currency, info] of Object.entries(imfReserves.reserves)) {
      if (typeof info === 'number') {
        push(currency, info, null);
      } else if (info && typeof info === 'object') {
        const share = info.share ?? info.value ?? info.pct ?? null;
        const valueB = info.valueB ?? info.amountB ?? info.usdBn ?? null;
        push(currency, share, valueB);
        if (!asOf && info.asOf) asOf = info.asOf;
      }
    }
  }

  // Cross-market: /api/imf cofer shape
  if (rows.length < 3 && imfCofer && typeof imfCofer === 'object') {
    for (const [currency, info] of Object.entries(imfCofer)) {
      if (typeof info === 'number') push(currency, info, null);
      else if (info && typeof info === 'object') {
        push(currency, info.value ?? info.share, info.valueB);
        if (!asOf && info.asOf) asOf = info.asOf;
      }
    }
    if (!source) source = 'imf.cofer';
  }

  rows.sort((a, b) => (b.share || 0) - (a.share || 0));
  return { rows, asOf, totalAllocatedB, source };
}

export default function ImfCoferPanel() {
  const { colors } = useTheme();
  const fxCtx = useMarketData('fx');
  const imfCtx = useMarketData('imf');
  const data = fxCtx?.data || {};
  const imfReserves = data.imfReserves;
  const imfCofer = imfCtx?.data?.cofer;

  const { rows, asOf, totalAllocatedB, source } = useMemo(
    () => normalizeCofer(imfReserves, imfCofer),
    [imfReserves, imfCofer],
  );

  const chartOption = useMemo(() => {
    if (rows.length < 2) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: (p) => `<b>${p.name}</b><br/>Share: <b>${Number(p.value).toFixed(1)}%</b>`,
      },
      series: [{
        type: 'pie',
        // Slightly larger ring — labels live in the table on the right
        radius: ['48%', '74%'],
        center: ['50%', '52%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 3, borderColor: colors.cardBg || 'transparent', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
            fontWeight: 600,
            color: colors.textPrimary || colors.text,
          },
        },
        data: rows.map((r) => ({
          name: r.currency,
          value: r.share,
          itemStyle: { color: COFER_COLORS[r.currency] || '#6b7280' },
        })),
      }],
    };
  }, [rows, colors]);

  if (!rows.length) {
    return (
      <div className="cofer-panel cofer-empty">
        IMF COFER data unavailable.
      </div>
    );
  }

  const hasValueB = rows.some((r) => r.valueB != null);
  const maxShare = Math.max(...rows.map((r) => r.share || 0), 1);

  return (
    <div className="cofer-panel">
      <div className="cofer-header">
        <div className="cofer-header-left">
          <span className="cofer-kicker">Official FX reserve shares</span>
          {totalAllocatedB != null && (
            <span className="cofer-total">
              <MetricValue
                value={totalAllocatedB}
                seriesKey="imfReserves"
                timestamp={asOf}
                format={(v) => (typeof v === 'number' ? `$${(v / 1e3).toFixed(1)}T` : '—')}
              />
            </span>
          )}
        </div>
        <div className="cofer-header-right">
          {asOf ? <span>As of {asOf}</span> : null}
          {source ? <span className="cofer-source">{String(source).replace(/_/g, ' ')}</span> : null}
        </div>
      </div>

      <div className="cofer-body">
        {chartOption && (
          <div className="cofer-chart">
            <SafeECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              sourceInfo={{
                title: 'IMF COFER Currency Shares',
                source: 'IMF COFER',
                endpoint: '/api/fx',
                series: [],
                updatedAt: asOf,
              }}
            />
          </div>
        )}

        <div className="cofer-table-wrap">
          <div
            className="cofer-thead"
            style={{ gridTemplateColumns: hasValueB ? '1fr 52px 56px' : '1fr 52px minmax(40px, 0.9fr)' }}
          >
            <span>Currency</span>
            <span className="cofer-num">Share</span>
            <span className="cofer-num">{hasValueB ? 'Value' : ''}</span>
          </div>
          <div className="cofer-tbody">
            {rows.map((r) => (
              <div
                key={r.currency}
                className="cofer-row"
                style={{ gridTemplateColumns: hasValueB ? '1fr 52px 56px' : '1fr 52px minmax(40px, 0.9fr)' }}
              >
                <span className="cofer-ccy">
                  <span
                    className="cofer-dot"
                    style={{ background: COFER_COLORS[r.currency] || '#6b7280' }}
                  />
                  <strong>{r.currency}</strong>
                </span>
                <span className="cofer-share">
                  <MetricValue
                    value={r.share}
                    seriesKey={r.seriesKey}
                    timestamp={asOf}
                    format={(v) => (typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(1)}%` : '—')}
                  />
                </span>
                {hasValueB ? (
                  <span className="cofer-value">
                    {r.valueB != null ? `$${r.valueB.toFixed(0)}B` : '—'}
                  </span>
                ) : (
                  <span className="cofer-bar-track">
                    <span
                      className="cofer-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(2, (r.share / maxShare) * 100))}%`,
                        background: COFER_COLORS[r.currency] || '#6b7280',
                      }}
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
