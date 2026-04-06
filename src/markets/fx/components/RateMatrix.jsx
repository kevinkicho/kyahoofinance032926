import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './RateMatrix.css';
import './FXComponents.css';

const MATRIX_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD'];

function formatRate(value, quote) {
  return (quote === 'JPY' || quote === 'CNY') ? value.toFixed(2) : value.toFixed(4);
}

const REER_COLORS = { US: '#3b82f6', EU: '#10b981', JP: '#ef4444', GB: '#f59e0b', CN: '#a855f7' };
const REER_KEYS = ['US', 'EU', 'JP', 'GB', 'CN'];

export default function RateMatrix({ spotRates, prevRates, changes = {}, reer }) {
  const { colors } = useTheme();

  const reerOption = useMemo(() => {
    if (!reer?.dates?.length) return null;
    const series = REER_KEYS
      .filter(k => reer[k]?.length)
      .map(k => ({
        name: k,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: REER_COLORS[k] },
        itemStyle: { color: REER_COLORS[k] },
        data: reer[k],
      }));
    if (!series.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: params => {
          const date = params[0]?.axisValue;
          const lines = params.map(p =>
            `<span style="color:${p.color}">●</span> ${p.seriesName}: ${Number(p.value).toFixed(1)}`
          );
          return `<div style="font-size:11px"><b>${date}</b><br/>${lines.join('<br/>')}</div>`;
        },
      },
      legend: {
        data: REER_KEYS,
        top: 2,
        textStyle: { color: colors.textSecondary, fontSize: 10 },
      },
      grid: { top: 30, right: 16, bottom: 28, left: 48 },
      xAxis: {
        type: 'category',
        data: reer.dates,
        axisLabel: { color: colors.textMuted, fontSize: 9, rotate: 30, interval: Math.floor(reer.dates.length / 6) },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        name: 'Index',
        nameTextStyle: { color: colors.textMuted, fontSize: 9 },
        axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v.toFixed(0) },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series,
    };
  }, [reer, colors]);

  const cells = useMemo(() => {
    const result = {};
    for (const base of MATRIX_CURRENCIES) {
      result[base] = {};
      for (const quote of MATRIX_CURRENCIES) {
        if (base === quote) { result[base][quote] = null; continue; }
        const baseSpot  = spotRates[base];
        const quoteSpot = spotRates[quote];
        const basePrev  = prevRates[base];
        const quotePrev = prevRates[quote];
        const currRate = (baseSpot && quoteSpot) ? quoteSpot / baseSpot : null;
        const prevRate = (basePrev && quotePrev) ? quotePrev / basePrev : null;
        const changePct = (currRate != null && prevRate != null && prevRate !== 0)
          ? ((currRate - prevRate) / prevRate) * 100
          : null;
        result[base][quote] = { rate: currRate, changePct };
      }
    }
    return result;
  }, [spotRates, prevRates]);

  // KPI + strength computations
  const eurUsd = spotRates['EUR'] ? (1 / spotRates['EUR']) : null;
  const usdJpy = spotRates['JPY'] ?? null;
  const currencies = MATRIX_CURRENCIES.filter(c => c !== 'USD' && changes[c] != null);
  const sorted = [...currencies].sort((a, b) => (changes[b] ?? 0) - (changes[a] ?? 0));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const maxAbs = Math.max(...currencies.map(c => Math.abs(changes[c] || 0)), 0.01);

  return (
    <div className="fx-panel" style={{ padding: 20 }}>
      <div className="fx-panel-header">
        <span className="fx-panel-title">Cross-Rate Matrix</span>
        <span className="fx-panel-subtitle">Rows = base · Columns = quote · color = 24h % change</span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">EUR/USD</span>
          <span className="fx-kpi-value">{eurUsd != null ? eurUsd.toFixed(4) : '—'}</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">USD/JPY</span>
          <span className="fx-kpi-value">{usdJpy != null ? usdJpy.toFixed(2) : '—'}</span>
        </div>
        {strongest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Strongest 24h</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{strongest}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>+{(changes[strongest] ?? 0).toFixed(3)}%</span>
          </div>
        )}
        {weakest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Weakest 24h</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{weakest}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{(changes[weakest] ?? 0).toFixed(3)}%</span>
          </div>
        )}
      </div>

      {/* Main: matrix (wide) + strength bars (narrow) */}
      <div className="fx-wide-narrow">
        <div className="rate-matrix-scroll">
          <table className="rate-matrix-table">
            <thead>
              <tr>
                <th className="rate-matrix-corner">Base ↓ / Quote →</th>
                {MATRIX_CURRENCIES.map(c => (
                  <th key={c} className="rate-matrix-col-header">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="rate-matrix-row-header">{base}</td>
                  {MATRIX_CURRENCIES.map(quote => {
                    if (base === quote) {
                      return <td key={quote} className="rate-matrix-cell rate-matrix-diagonal">—</td>;
                    }
                    const cell = cells[base]?.[quote];
                    if (!cell || cell.rate == null) {
                      return <td key={quote} className="rate-matrix-cell">—</td>;
                    }
                    const { rate, changePct } = cell;
                    const isPositive = changePct != null && changePct >= 0;
                    const isNegative = changePct != null && changePct < 0;
                    return (
                      <td key={quote} className={`rate-matrix-cell${isPositive ? ' positive' : isNegative ? ' negative' : ''}`}>
                        <span className="rate-matrix-rate">{formatRate(rate, quote)}</span>
                        <span className="rate-matrix-change">
                          {changePct == null ? '—' : `${isPositive ? '+' : ''}${changePct.toFixed(2)}%`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fx-chart-panel">
          <div className="fx-chart-title">USD Strength — 24h % vs USD</div>
          <div className="fx-bar-list" style={{ marginTop: 4 }}>
            {sorted.map(code => {
              const val = changes[code] ?? 0;
              const pct = Math.abs(val) / maxAbs * 50;
              const isPos = val >= 0;
              return (
                <div key={code} className="fx-bar-row">
                  <span className="fx-bar-name">{code}</span>
                  <div className="fx-bar-wrap">
                    <div className="fx-bar-center" />
                    <div
                      className="fx-bar-fill"
                      style={{
                        width: `${pct}%`,
                        left: isPos ? '50%' : `${50 - pct}%`,
                        background: isPos ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`fx-bar-val ${isPos ? 'positive' : 'negative'}`}>
                    {isPos ? '+' : ''}{val.toFixed(3)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rate-matrix-legend">
        <span className="legend-green">Green = base strengthened vs quote</span>
        <span className="legend-sep">·</span>
        <span className="legend-red">Red = base weakened vs quote</span>
      </div>

      {/* Real Effective Exchange Rates */}
      {reerOption && (
        <div className="fx-chart-panel" style={{ height: 200, flexShrink: 0, marginTop: 16 }}>
          <div className="fx-chart-title">Real Effective Exchange Rates (BIS) — 24 Months</div>
          <div className="fx-mini-chart">
            <ReactECharts option={reerOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
