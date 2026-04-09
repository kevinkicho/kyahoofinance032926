// src/markets/fx/components/FXDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './FXDashboard.css';

const G10 = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'NZD'];
const EM = ['CNY', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR'];

function Sparkline({ values }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.001;
  const W = 48, H = 14;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} className="fx-spark">
      <polyline points={pts} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function FXDashboard({
  spotRates,
  prevRates,
  changes,
  changes1w,
  changes1m,
  sparklines,
  history,
  fredFxRates,
  reer,
  rateDifferentials,
  dxyHistory,
  cotData,
}) {
  const { colors } = useTheme();

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    if (spotRates?.EUR) {
      result.push({
        label: 'EUR/USD',
        value: (1 / spotRates.EUR).toFixed(4),
        change: changes?.EUR,
      });
    }
    if (spotRates?.JPY) {
      result.push({
        label: 'USD/JPY',
        value: spotRates.JPY.toFixed(2),
        change: changes?.JPY,
      });
    }
    if (spotRates?.GBP) {
      result.push({
        label: 'GBP/USD',
        value: (1 / spotRates.GBP).toFixed(4),
        change: changes?.GBP,
      });
    }

    // Strongest/weakest
    const sorted = Object.entries(changes || {})
      .filter(([c]) => c !== 'USD')
      .sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      result.push({
        label: 'Strongest',
        value: sorted[0][0],
        change: sorted[0][1],
        color: '#22c55e',
      });
      result.push({
        label: 'Weakest',
        value: sorted[sorted.length - 1][0],
        change: sorted[sorted.length - 1][1],
        color: '#ef4444',
      });
    }

    // G10 vs EM avg
    const g10Avg = G10.filter(c => changes?.[c] != null).reduce((s, c) => s + changes[c], 0) / G10.filter(c => changes?.[c] != null).length || 0;
    const emAvg = EM.filter(c => changes?.[c] != null).reduce((s, c) => s + changes[c], 0) / EM.filter(c => changes?.[c] != null).length || 0;
    result.push({
      label: 'G10 Avg',
      value: `${g10Avg >= 0 ? '+' : ''}${g10Avg.toFixed(3)}%`,
      color: g10Avg >= 0 ? '#22c55e' : '#ef4444',
    });
    result.push({
      label: 'EM Avg',
      value: `${emAvg >= 0 ? '+' : ''}${emAvg.toFixed(3)}%`,
      color: emAvg >= 0 ? '#22c55e' : '#ef4444',
    });

    return result;
  }, [spotRates, changes]);

  // Movers list
  const movers = useMemo(() => {
    return Object.entries(changes || {})
      .filter(([c]) => c !== 'USD')
      .map(([code, changePct]) => ({
        code,
        changePct,
        change1w: changes1w?.[code],
        change1m: changes1m?.[code],
        spark: sparklines?.[code],
        cotPct: cotData?.[code],
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 12);
  }, [changes, changes1w, changes1m, sparklines, cotData]);

  // DXY chart option
  const dxyOption = useMemo(() => {
    if (!dxyHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: dxyHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: dxyHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2 } }],
    };
  }, [dxyHistory, colors]);

  // Rate differentials table
  const rateDiff = useMemo(() => {
    if (!rateDifferentials) return null;
    return Object.entries(rateDifferentials)
      .filter(([, v]) => v != null)
      .slice(0, 8);
  }, [rateDifferentials]);

  return (
    <div className="fx-dashboard">
      {/* KPI Strip */}
      <div className="fx-kpi-strip-new">
        {kpis.map((kpi, i) => (
          <div key={i} className="fx-kpi-pill-new" style={{ background: colors.bgCard }}>
            <span className="fx-kpi-label">{kpi.label}</span>
            <span className="fx-kpi-value" style={{ color: kpi.color || (kpi.change != null ? (kpi.change >= 0 ? '#22c55e' : '#ef4444') : colors.text) }}>
              {kpi.value}
            </span>
            {kpi.change != null && (
              <span className="fx-kpi-change" style={{ color: kpi.change >= 0 ? '#22c55e' : '#ef4444' }}>
                {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(3)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="fx-chart-grid">
        {/* Top Movers */}
        <div className="fx-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="fx-panel-title">Top Movers vs USD</div>
          <div className="fx-movers-list">
            {movers.map((m, i) => (
              <div key={m.code} className="fx-mover-row">
                <span className="fx-mover-rank">{i + 1}</span>
                <span className="fx-mover-code">{m.code}</span>
                <span className="fx-mover-pct" style={{ color: m.changePct >= 0 ? '#22c55e' : '#ef4444' }}>
                  {m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(3)}%
                </span>
                <span className="fx-mover-1w" style={{ color: m.change1w == null ? colors.textMuted : m.change1w >= 0 ? '#22c55e' : '#ef4444' }}>
                  {m.change1w == null ? '—' : `${m.change1w >= 0 ? '+' : ''}${m.change1w.toFixed(2)}%`}
                </span>
                <Sparkline values={m.spark} />
              </div>
            ))}
          </div>
        </div>

        {/* DXY Tracker */}
        {dxyOption && (
          <div className="fx-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="fx-panel-title">DXY Dollar Index</div>
            <div className="fx-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={dxyOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Rate Differentials */}
        {rateDiff && (
          <div className="fx-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="fx-panel-title">Rate Differentials vs USD</div>
            <div className="fx-mini-table">
              {rateDiff.map(([ccy, diff]) => (
                <div key={ccy} className="fx-mini-row">
                  <span className="fx-mini-name">{ccy}</span>
                  <span className="fx-mini-value" style={{ color: diff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REER Chart */}
        {reer?.dates?.length > 0 && (
          <div className="fx-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="fx-panel-title">Real Effective Exchange Rates</div>
            <div className="fx-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts
                option={{
                  animation: false,
                  backgroundColor: 'transparent',
                  tooltip: { trigger: 'axis' },
                  legend: { top: 2, textStyle: { color: colors.textSecondary, fontSize: 10 } },
                  grid: { top: 30, right: 20, bottom: 30, left: 50 },
                  xAxis: { type: 'category', data: reer.dates, axisLabel: { color: colors.textMuted, fontSize: 9 } },
                  yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
                  series: ['US', 'EU', 'JP', 'GB', 'CN']
                    .filter(k => reer[k]?.length)
                    .map(k => ({
                      name: k,
                      type: 'line',
                      smooth: true,
                      symbol: 'none',
                      lineStyle: { width: 2 },
                      data: reer[k],
                    })),
                }}
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}