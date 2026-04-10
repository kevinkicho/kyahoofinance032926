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

function FXDashboard({
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
  cotHistory,
}) {
  const { colors } = useTheme();

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

  // Key pairs for sidebar
  const keyPairs = useMemo(() => {
    const pairs = [];
    if (spotRates?.EUR) {
      pairs.push({ label: 'EUR/USD', value: (1 / spotRates.EUR).toFixed(4), change: changes?.EUR });
    }
    if (spotRates?.JPY) {
      pairs.push({ label: 'USD/JPY', value: spotRates.JPY.toFixed(2), change: changes?.JPY });
    }
    if (spotRates?.GBP) {
      pairs.push({ label: 'GBP/USD', value: (1 / spotRates.GBP).toFixed(4), change: changes?.GBP });
    }
    if (spotRates?.CHF) {
      pairs.push({ label: 'USD/CHF', value: spotRates.CHF.toFixed(4), change: changes?.CHF });
    }
    if (spotRates?.AUD) {
      pairs.push({ label: 'AUD/USD', value: (1 / spotRates.AUD).toFixed(4), change: changes?.AUD });
    }
    if (spotRates?.CAD) {
      pairs.push({ label: 'USD/CAD', value: spotRates.CAD.toFixed(4), change: changes?.CAD });
    }
    return pairs;
  }, [spotRates, changes]);

  // Strongest/weakest
  const extremes = useMemo(() => {
    const sorted = Object.entries(changes || {})
      .filter(([c]) => c !== 'USD')
      .sort((a, b) => b[1] - a[1]);
    return {
      strongest: sorted[0] ? { code: sorted[0][0], change: sorted[0][1] } : null,
      weakest: sorted[sorted.length - 1] ? { code: sorted[sorted.length - 1][0], change: sorted[sorted.length - 1][1] } : null,
    };
  }, [changes]);

  // G10 vs EM averages
  const averages = useMemo(() => {
    const g10Avg = G10.filter(c => changes?.[c] != null).reduce((s, c) => s + changes[c], 0) / G10.filter(c => changes?.[c] != null).length || 0;
    const emAvg = EM.filter(c => changes?.[c] != null).reduce((s, c) => s + changes[c], 0) / EM.filter(c => changes?.[c] != null).length || 0;
    return { g10: g10Avg, em: emAvg };
  }, [changes]);

  // Rate differentials table
  const rateDiff = useMemo(() => {
    if (!rateDifferentials) return null;
    return Object.entries(rateDifferentials)
      .filter(([, v]) => v != null)
      .slice(0, 8);
  }, [rateDifferentials]);

  // DXY chart option
  const dxyOption = useMemo(() => {
    if (!dxyHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 20, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dxyHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dxyHistory.dates.length / 5) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: dxyHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2 }, areaStyle: { color: 'rgba(59,130,246,0.1)' } }],
    };
  }, [dxyHistory, colors]);

  // REER chart option
  const reerOption = useMemo(() => {
    if (!reer?.dates?.length) return null;
    const countries = ['US', 'EU', 'JP', 'GB', 'CN'].filter(k => reer[k]?.length);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: countries, top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 24, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: reer.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(reer.dates.length / 5) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: countries.map(k => ({
        name: k,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5 },
        data: reer[k],
      })),
    };
  }, [reer, colors]);

  // COT Positioning History chart option
  const cotOption = useMemo(() => {
    if (!cotHistory || !Object.keys(cotHistory).length) return null;
    const currencies = Object.keys(cotHistory).slice(0, 6); // Show top 6
    const dates = cotHistory[currencies[0]]?.map(d => d.date.slice(5)) || [];
    const lineColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: currencies, top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 24, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 5) } },
      yAxis: { type: 'value', name: 'Net % of OI', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: currencies.map((ccy, idx) => ({
        name: ccy,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: lineColors[idx % lineColors.length] },
        data: cotHistory[ccy].map(d => d.net),
      })),
    };
  }, [cotHistory, colors]);

  // Currency Correlation Matrix (calculated from 30-day rate changes)
  const correlationMatrix = useMemo(() => {
    if (!history || !Object.keys(history).length) return null;
    const currencies = Object.keys(history).filter(c => c !== 'USD').slice(0, 8);
    if (currencies.length < 2) return null;

    // Get returns series for each currency
    const returns = {};
    currencies.forEach(ccy => {
      const rates = history[ccy];
      if (!rates || rates.length < 2) return;
      // Calculate daily returns
      returns[ccy] = [];
      for (let i = 1; i < rates.length; i++) {
        const prev = rates[i - 1];
        const curr = rates[i];
        if (prev && curr) {
          returns[ccy].push((curr - prev) / prev);
        }
      }
    });

    // Calculate correlation matrix
    const matrix = currencies.map((ccy1, i) =>
      currencies.map((ccy2, j) => {
        const r1 = returns[ccy1] || [];
        const r2 = returns[ccy2] || [];
        if (r1.length < 2 || r2.length < 2 || i === j) return i === j ? 1 : 0;

        const n = Math.min(r1.length, r2.length);
        const mean1 = r1.slice(0, n).reduce((a, b) => a + b, 0) / n;
        const mean2 = r2.slice(0, n).reduce((a, b) => a + b, 0) / n;

        let cov = 0, var1 = 0, var2 = 0;
        for (let k = 0; k < n; k++) {
          const d1 = r1[k] - mean1;
          const d2 = r2[k] - mean2;
          cov += d1 * d2;
          var1 += d1 * d1;
          var2 += d2 * d2;
        }

        const denom = Math.sqrt(var1 * var2);
        return denom > 0 ? Math.round((cov / denom) * 100) / 100 : 0;
      })
    );

    return { currencies, matrix };
  }, [history]);

  // Correlation Heatmap chart option
  const correlationOption = useMemo(() => {
    if (!correlationMatrix) return null;
    const { currencies, matrix } = correlationMatrix;
    const data = [];
    matrix.forEach((row, i) => {
      row.forEach((val, j) => {
        data.push([i, j, val]);
      });
    });
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const [i, j, val] = params.data;
          return `${currencies[i]} vs ${currencies[j]}: ${val.toFixed(2)}`;
        },
      },
      grid: { top: 30, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: currencies, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitArea: { show: true } },
      yAxis: { type: 'category', data: currencies, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitArea: { show: true } },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 0,
        inRange: { color: ['#ef4444', '#fef3c7', '#22c55e'] },
        text: ['+1', '-1'],
        textStyle: { color: colors.textMuted, fontSize: 9 },
      },
      series: [{
        type: 'heatmap',
        data: data,
        label: { show: true, fontSize: 8, color: colors.textSecondary, formatter: (p) => p.data[2].toFixed(1) },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
      }],
    };
  }, [correlationMatrix, colors]);

  return (
    <div className="fx-dashboard" role="region" aria-label="FX Dashboard">
      {/* Left Sidebar */}
      <div className="fx-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }} role="region" aria-label="FX Metrics">
        {/* Key Pairs */}
        <div className="fx-sidebar-section">
          <div className="fx-sidebar-title">Key Pairs</div>
          {keyPairs.slice(0, 4).map((pair) => (
            <div key={pair.label} className="fx-metric-card">
              <div className="fx-metric-label">{pair.label}</div>
              <div className="fx-metric-value" style={{ color: pair.change >= 0 ? '#4ade80' : '#f87171' }}>
                {pair.value}
              </div>
              {pair.change != null && (
                <span style={{ fontSize: 10, color: pair.change >= 0 ? '#4ade80' : '#f87171' }}>
                  {pair.change >= 0 ? '+' : ''}{pair.change.toFixed(3)}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Market Movers */}
        <div className="fx-sidebar-section">
          <div className="fx-sidebar-title">Movers</div>
          {extremes.strongest && (
            <div className="fx-metric-card">
              <div className="fx-metric-label">Strongest</div>
              <div className="fx-metric-value" style={{ color: '#4ade80' }}>
                {extremes.strongest.code}
                <span style={{ fontSize: 11, marginLeft: 6 }}>+{extremes.strongest.change.toFixed(2)}%</span>
              </div>
            </div>
          )}
          {extremes.weakest && (
            <div className="fx-metric-card">
              <div className="fx-metric-label">Weakest</div>
              <div className="fx-metric-value" style={{ color: '#f87171' }}>
                {extremes.weakest.code}
                <span style={{ fontSize: 11, marginLeft: 6 }}>{extremes.weakest.change.toFixed(2)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Averages */}
        <div className="fx-sidebar-section">
          <div className="fx-sidebar-title">Averages</div>
          <div className="fx-metric-card">
            <div className="fx-metric-row">
              <span className="fx-metric-name">G10 Avg</span>
              <span className="fx-metric-num" style={{ color: averages.g10 >= 0 ? '#4ade80' : '#f87171' }}>
                {averages.g10 >= 0 ? '+' : ''}{averages.g10.toFixed(3)}%
              </span>
            </div>
            <div className="fx-metric-row">
              <span className="fx-metric-name">EM Avg</span>
              <span className="fx-metric-num" style={{ color: averages.em >= 0 ? '#4ade80' : '#f87171' }}>
                {averages.em >= 0 ? '+' : ''}{averages.em.toFixed(3)}%
              </span>
            </div>
          </div>
        </div>

        {/* Rate Differentials */}
        {rateDiff && rateDiff.length > 0 && (
          <div className="fx-sidebar-section">
            <div className="fx-sidebar-title">Rate Diff vs USD</div>
            <div className="fx-metric-card">
              {rateDiff.slice(0, 5).map(([ccy, diff]) => (
                <div key={ccy || `rate-${diff}`} className="fx-metric-row">
                  <span className="fx-metric-name">{ccy}</span>
                  <span className="fx-metric-num" style={{ color: diff >= 0 ? '#4ade80' : '#f87171' }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COT Positioning */}
        {cotHistory && (
          <div className="fx-sidebar-section">
            <div className="fx-sidebar-title">COT (% OI)</div>
            <div className="fx-metric-card">
              {Object.entries(cotHistory).slice(0, 5).map(([ccy, data]) => {
                const latest = data[data.length - 1];
                if (!latest) return null;
                return (
                  <div key={ccy} className="fx-metric-row">
                    <span className="fx-metric-name">{ccy}</span>
                    <span className="fx-metric-num" style={{ color: latest.net >= 0 ? '#4ade80' : '#f87171' }}>
                      {latest.net >= 0 ? '+' : ''}{latest.net.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Content - ALL visible at once */}
      <div className="fx-main" role="region" aria-label="FX Charts">
        <div className="fx-content-grid">
          {/* Top Movers */}
          <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="fx-panel-title">Top Movers vs USD</div>
            <div className="fx-movers-list">
              {movers.slice(0, 8).map((m, i) => (
                <div key={m.code} className="fx-mover-row">
                  <span className="fx-mover-rank">{i + 1}</span>
                  <span className="fx-mover-code">{m.code}</span>
                  <span className="fx-mover-pct" style={{ color: m.changePct >= 0 ? '#4ade80' : '#f87171' }}>
                    {m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(3)}%
                  </span>
                  <Sparkline values={m.spark} />
                </div>
              ))}
            </div>
          </div>

          {/* DXY Chart */}
          {dxyOption && (
            <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="fx-panel-title">DXY Dollar Index</div>
              <div className="fx-chart-wrap">
                <SafeECharts option={dxyOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* COT Positioning Chart */}
          {cotOption && (
            <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="fx-panel-title">CFTC COT Positioning</div>
              <div className="fx-chart-wrap" style={{ minHeight: 140 }}>
                <SafeECharts option={cotOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Correlation Matrix */}
          {correlationOption && (
            <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="fx-panel-title">Currency Correlation (30D)</div>
              <div className="fx-chart-wrap" style={{ minHeight: 200 }}>
                <SafeECharts option={correlationOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* REER Chart */}
          {reerOption && (
            <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="fx-panel-title">Real Effective Exchange Rates</div>
              <div className="fx-chart-wrap" style={{ minHeight: 140 }}>
                <SafeECharts option={reerOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Rate Differentials Table */}
          {rateDiff && (
            <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="fx-panel-title">Rate Differentials</div>
              <div className="fx-mini-table" style={{ paddingTop: 8 }}>
                {rateDiff.map(([ccy, diff]) => (
                  <div key={ccy} className="fx-mini-row">
                    <span className="fx-mini-name">{ccy}</span>
                    <span className="fx-mini-value" style={{ color: diff >= 0 ? '#4ade80' : '#f87171' }}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(FXDashboard);