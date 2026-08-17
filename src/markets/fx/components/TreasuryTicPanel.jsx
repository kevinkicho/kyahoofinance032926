import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './TreasuryTicPanel.css';

/** TIC latest rows the treasury-tic tile can slice. Leftover isLive / latest bag remount-crash .slice. */
export function ticLatestRows(ticData) {
  return Array.isArray(ticData?.latest) ? ticData.latest : [];
}

export function hasTreasuryTicRows(latest) {
  return Array.isArray(latest) && latest.length > 0;
}

const TIC_PALETTE = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#22d3ee', '#fb923c', '#4ade80', '#e879f9', '#94a3b8',
  '#2dd4bf', '#f472b6',
];

function seriesKeyFor(country) {
  if (country === 'Japan') return 'ticJapan';
  if (country === 'China, Mainland') return 'ticChina';
  if (country === 'United Kingdom') return 'ticUK';
  return 'ticTotal';
}

function shortName(country) {
  if (!country) return '—';
  if (country === 'China, Mainland') return 'China';
  if (country === 'United Kingdom') return 'UK';
  if (country === 'Cayman Islands') return 'Cayman';
  if (country === 'Luxembourg') return 'Lux.';
  if (country === 'Switzerland') return 'Swiss';
  if (country === 'Belgium') return 'Belgium';
  if (country === 'Ireland') return 'Ireland';
  if (country === 'Hong Kong') return 'HK';
  if (country.length > 14) return `${country.slice(0, 12)}…`;
  return country;
}

export default function TreasuryTicPanel() {
  const { colors } = useTheme();
  const ticCtx = useMarketData('treasuryTIC');
  const latest = ticLatestRows(ticCtx?.data);

  const topHolders = useMemo(() => latest.slice(0, 12), [latest]);

  const totalHoldings = useMemo(
    () => latest.reduce((s, r) => s + (r.holdingsB || 0), 0),
    [latest],
  );

  const asOf = topHolders[0]?.period || null;

  const chartOption = useMemo(() => {
    if (topHolders.length < 2) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: (p) => {
          const b = Number(p.value);
          const t = b / 1e3;
          return `<b>${p.name}</b><br/>$${b.toFixed(0)}B · $${t.toFixed(2)}T<br/>Share: <b>${p.percent?.toFixed?.(1) ?? '—'}%</b>`;
        },
      },
      series: [{
        type: 'pie',
        radius: ['48%', '74%'],
        center: ['50%', '52%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 3,
          borderColor: colors.cardBg || 'transparent',
          borderWidth: 2,
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 10,
            fontWeight: 600,
            color: colors.textPrimary || colors.text,
          },
        },
        data: topHolders.map((r, i) => ({
          name: shortName(r.country),
          value: r.holdingsB || 0,
          itemStyle: { color: TIC_PALETTE[i % TIC_PALETTE.length] },
        })),
      }],
    };
  }, [topHolders, colors]);

  if (!hasTreasuryTicRows(topHolders)) {
    return <div className="tic-panel tic-empty">Treasury TIC data unavailable.</div>;
  }

  return (
    <div className="tic-panel">
      <div className="tic-body">
        {chartOption && (
          <div className="tic-chart">
            <SafeECharts
              option={chartOption}
              style={{ height: '100%', width: '100%' }}
              sourceInfo={{
                title: 'Treasury TIC Top Holders',
                source: 'US Treasury TIC',
                endpoint: '/api/treasuryTIC',
                series: [],
                updatedAt: asOf,
              }}
            />
          </div>
        )}

        <div className="tic-side">
          <div className="tic-total-card">
            <span className="tic-total-label">Total foreign holdings</span>
            <span className="tic-total-val">
              <MetricValue
                value={totalHoldings}
                seriesKey="ticTotal"
                timestamp={asOf}
                format={(v) => (typeof v === 'number' ? `$${(v / 1e3).toFixed(1)}T` : '—')}
              />
            </span>
            <span className="tic-total-meta">
              Top {topHolders.length}
              {asOf ? ` · ${asOf}` : ''}
            </span>
          </div>

          <div className="tic-table-wrap">
            <div className="tic-thead">
              <span>Country</span>
              <span className="tic-num">$B</span>
              <span className="tic-num">Share</span>
            </div>
            <div className="tic-tbody">
              {topHolders.map((r, i) => {
                const share = totalHoldings > 0 ? ((r.holdingsB || 0) / totalHoldings) * 100 : 0;
                return (
                  <div key={r.country} className="tic-row">
                    <span className="tic-ccy">
                      <span
                        className="tic-dot"
                        style={{ background: TIC_PALETTE[i % TIC_PALETTE.length] }}
                      />
                      <span className="tic-name" title={r.country}>{shortName(r.country)}</span>
                    </span>
                    <span className="tic-hold">
                      <MetricValue
                        value={r.holdingsB}
                        seriesKey={seriesKeyFor(r.country)}
                        timestamp={r.period}
                        format={(v) => (typeof v === 'number' ? `$${v.toFixed(0)}` : '—')}
                      />
                    </span>
                    <span className="tic-share">{share.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
