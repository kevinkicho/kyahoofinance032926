// src/markets/fx/components/FXDashboard.jsx
import React, { useMemo, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('overview');

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

  return (
    <div className="fx-dashboard">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Key Metrics */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="fx-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }}>
        {/* Key Pairs */}
        <div className="fx-sidebar-section">
          <div className="fx-sidebar-title">Key Pairs</div>
          {keyPairs.slice(0, 4).map((pair, i) => (
            <div key={i} className="fx-metric-card">
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
                <div key={ccy} className="fx-metric-row">
                  <span className="fx-metric-name">{ccy}</span>
                  <span className="fx-metric-num" style={{ color: diff >= 0 ? '#4ade80' : '#f87171' }}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="fx-main">
        {/* Tab Navigation */}
        <div className="fx-tabs">
          <button className={`fx-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`fx-tab ${activeTab === 'dxy' ? 'active' : ''}`} onClick={() => setActiveTab('dxy')}>DXY</button>
          <button className={`fx-tab ${activeTab === 'reer' ? 'active' : ''}`} onClick={() => setActiveTab('reer')}>REER</button>
          <button className={`fx-tab ${activeTab === 'movers' ? 'active' : ''}`} onClick={() => setActiveTab('movers')}>All Movers</button>
        </div>

        {/* Tab Content */}
        <div className="fx-tab-content">
          {/* OVERVIEW TAB */}
          <div className={`fx-tab-panel ${activeTab === 'overview' ? 'active' : ''}`}>
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

              {/* Rate Differentials */}
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

          {/* DXY TAB */}
          <div className={`fx-tab-panel ${activeTab === 'dxy' ? 'active' : ''}`}>
            <div className="fx-content-grid single">
              {dxyOption && (
                <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="fx-panel-header">
                    <span className="fx-panel-title">DXY Dollar Index</span>
                    <span className="fx-panel-subtitle">Dollar strength vs basket</span>
                  </div>
                  <div className="fx-chart-wrap" style={{ minHeight: 200 }}>
                    <SafeECharts option={dxyOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* REER TAB */}
          <div className={`fx-tab-panel ${activeTab === 'reer' ? 'active' : ''}`}>
            <div className="fx-content-grid single">
              {reerOption && (
                <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="fx-panel-header">
                    <span className="fx-panel-title">Real Effective Exchange Rates</span>
                    <span className="fx-panel-subtitle">Inflation-adjusted</span>
                  </div>
                  <div className="fx-chart-wrap" style={{ minHeight: 200 }}>
                    <SafeECharts option={reerOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ALL MOVERS TAB */}
          <div className={`fx-tab-panel ${activeTab === 'movers' ? 'active' : ''}`}>
            <div className="fx-content-grid wide-2">
              {/* All Movers */}
              <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                <div className="fx-panel-title">All Currency Movers</div>
                <div className="fx-movers-list">
                  {movers.map((m, i) => (
                    <div key={m.code} className="fx-mover-row">
                      <span className="fx-mover-rank">{i + 1}</span>
                      <span className="fx-mover-code">{m.code}</span>
                      <span className="fx-mover-pct" style={{ color: m.changePct >= 0 ? '#4ade80' : '#f87171' }}>
                        {m.changePct >= 0 ? '+' : ''}{m.changePct.toFixed(3)}%
                      </span>
                      <span className="fx-mover-1w" style={{ color: m.change1w == null ? colors.textMuted : m.change1w >= 0 ? '#4ade80' : '#f87171' }}>
                        {m.change1w == null ? '—' : `${m.change1w >= 0 ? '+' : ''}${m.change1w.toFixed(2)}%`}
                      </span>
                      <Sparkline values={m.spark} />
                    </div>
                  ))}
                </div>
              </div>

              {/* G10 vs EM */}
              <div className="fx-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                <div className="fx-panel-title">G10 vs EM</div>
                <div className="fx-mini-table" style={{ paddingTop: 8 }}>
                  <div className="fx-mini-row" style={{ fontWeight: 600 }}>
                    <span className="fx-mini-name">G10 Average</span>
                    <span className="fx-mini-value" style={{ color: averages.g10 >= 0 ? '#4ade80' : '#f87171' }}>
                      {averages.g10 >= 0 ? '+' : ''}{averages.g10.toFixed(3)}%
                    </span>
                  </div>
                  {G10.filter(c => changes?.[c] != null).slice(0, 6).map(code => (
                    <div key={code} className="fx-mini-row">
                      <span className="fx-mini-name">{code}</span>
                      <span className="fx-mini-value" style={{ color: changes[code] >= 0 ? '#4ade80' : '#f87171' }}>
                        {changes[code] >= 0 ? '+' : ''}{changes[code].toFixed(3)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}