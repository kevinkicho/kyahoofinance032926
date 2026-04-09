// src/markets/derivatives/components/DerivativesDashboard.jsx
import React, { useMemo, useState } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './DerivativesDashboard.css';

export default function DerivativesDashboard({
  volSurfaceData,
  vixTermStructure,
  optionsFlow,
  vixEnrichment,
  volPremium,
  fredVixHistory,
  putCallRatio,
  skewIndex,
  vixPercentile,
  termSpread,
}) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('vix');

  // VIX term structure chart
  const vixOption = useMemo(() => {
    if (!vixTermStructure?.dates?.length) return null;
    const { dates, values, prevValues } = vixTermStructure;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Current', 'Prev Close'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 24, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'value', name: 'VIX', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'Current', type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#a78bfa' }, itemStyle: { color: '#a78bfa' } },
        { name: 'Prev Close', type: 'line', data: prevValues, smooth: true, symbol: 'none', lineStyle: { width: 1, type: 'dashed', color: colors.textDim } },
      ],
    };
  }, [vixTermStructure, colors]);

  // FRED VIX history chart
  const fredOption = useMemo(() => {
    if (!fredVixHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 12, bottom: 20, left: 40 },
      xAxis: { type: 'category', data: fredVixHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fredVixHistory.dates.length / 5) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fredVixHistory.values, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#a78bfa' }, areaStyle: { color: 'rgba(167,139,250,0.1)' } }],
    };
  }, [fredVixHistory, colors]);

  // Vol surface heatmap
  const heatmapOption = useMemo(() => {
    if (!volSurfaceData?.grid?.length) return null;
    const { strikes, expiries, grid } = volSurfaceData;
    const data = [];
    expiries.forEach((_, ei) => {
      strikes.forEach((_, si) => {
        data.push([si, ei, grid[ei][si]]);
      });
    });
    const allVols = grid.flat();
    const minVol = Math.min(...allVols);
    const maxVol = Math.max(...allVols);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { formatter: p => `<b>${expiries[p.data[1]]} / ${strikes[p.data[0]]}%</b><br/>IV: <b>${p.data[2].toFixed(1)}%</b>` },
      grid: { top: 28, right: 80, bottom: 28, left: 48 },
      xAxis: { type: 'category', data: strikes.map(s => `${s}%`), name: 'Strike', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'category', data: expiries, name: 'Expiry', nameLocation: 'middle', nameGap: 32, nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      visualMap: { min: minVol, max: maxVol, calculable: true, orient: 'vertical', right: 4, top: 24, textStyle: { color: colors.textMuted, fontSize: 8 }, inRange: { color: ['#1e3a5f', '#2563eb', '#7c3aed', '#db2777', '#ef4444'] } },
      series: [{ type: 'heatmap', data, label: { show: true, fontSize: 7, color: colors.text, formatter: p => p.data[2].toFixed(1) } }],
    };
  }, [volSurfaceData, colors]);

  // Options flow summary
  const flowSummary = useMemo(() => {
    if (!optionsFlow?.length) return null;
    return optionsFlow.slice(0, 8);
  }, [optionsFlow]);

  // Determine contango/backwardation
  const termStatus = useMemo(() => {
    if (!vixTermStructure?.values?.length >= 2) return null;
    const spot = vixTermStructure.values[0];
    const back = vixTermStructure.values[vixTermStructure.values.length - 1];
    const pct = Math.round(((back - spot) / spot) * 1000) / 10;
    return { spot, back, pct, isContango: spot < back };
  }, [vixTermStructure]);

  return (
    <div className="deriv-dashboard">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR - Key Metrics */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="deriv-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }}>
        {/* VIX */}
        <div className="deriv-sidebar-section">
          <div className="deriv-sidebar-title">VIX</div>
          <div className="deriv-metric-card">
            <div className="deriv-metric-label">Spot</div>
            <div className="deriv-metric-value" style={{
              color: vixTermStructure?.values?.[0] > 25 ? '#f87171' : vixTermStructure?.values?.[0] > 18 ? '#fbbf24' : '#4ade80'
            }}>
              {vixTermStructure?.values?.[0]?.toFixed(1) || '—'}
            </div>
          </div>
          {termStatus && (
            <div className="deriv-metric-card">
              <div className="deriv-metric-row">
                <span className="deriv-metric-name">{termStatus.isContango ? 'Contango' : 'Backwardation'}</span>
                <span className="deriv-metric-num" style={{ color: termStatus.isContango ? '#4ade80' : '#f87171' }}>
                  {termStatus.pct >= 0 ? '+' : ''}{termStatus.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
          {vixEnrichment?.vvix != null && (
            <div className="deriv-metric-card">
              <div className="deriv-metric-row">
                <span className="deriv-metric-name">VVIX</span>
                <span className="deriv-metric-num" style={{ color: '#a78bfa' }}>{vixEnrichment.vvix.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Volatility */}
        <div className="deriv-sidebar-section">
          <div className="deriv-sidebar-title">Volatility</div>
          {putCallRatio != null && (
            <div className="deriv-metric-card">
              <div className="deriv-metric-row">
                <span className="deriv-metric-name">Put/Call</span>
                <span className="deriv-metric-num" style={{ color: putCallRatio > 1.0 ? '#f87171' : putCallRatio < 0.7 ? '#4ade80' : '#fbbf24' }}>
                  {putCallRatio.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          {volPremium?.atm1mIV != null && (
            <div className="deriv-metric-card">
              <div className="deriv-metric-row">
                <span className="deriv-metric-name">ATM 1M IV</span>
                <span className="deriv-metric-num" style={{ color: '#60a5fa' }}>{volPremium.atm1mIV.toFixed(1)}%</span>
              </div>
            </div>
          )}
          {vixPercentile != null && (
            <div className="deriv-metric-card">
              <div className="deriv-metric-row">
                <span className="deriv-metric-name">VIX %ile</span>
                <span className="deriv-metric-num">{vixPercentile.toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Term Spread */}
        {typeof termSpread === 'number' && (
          <div className="deriv-sidebar-section">
            <div className="deriv-sidebar-title">Term Structure</div>
            <div className="deriv-metric-card">
              <div className="deriv-metric-row">
                <span className="deriv-metric-name">Term Spread</span>
                <span className="deriv-metric-num" style={{ color: termSpread > 0 ? '#4ade80' : '#f87171' }}>
                  {termSpread >= 0 ? '+' : ''}{termSpread.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="deriv-main">
        {/* Tab Navigation */}
        <div className="deriv-tabs">
          <button className={`deriv-tab ${activeTab === 'vix' ? 'active' : ''}`} onClick={() => setActiveTab('vix')}>VIX</button>
          <button className={`deriv-tab ${activeTab === 'surface' ? 'active' : ''}`} onClick={() => setActiveTab('surface')}>Vol Surface</button>
          <button className={`deriv-tab ${activeTab === 'flow' ? 'active' : ''}`} onClick={() => setActiveTab('flow')}>Flow</button>
        </div>

        {/* Tab Content */}
        <div className="deriv-tab-content">
          {/* VIX TAB */}
          <div className={`deriv-tab-panel ${activeTab === 'vix' ? 'active' : ''}`}>
            <div className="deriv-content-grid">
              {vixOption && (
                <div className="deriv-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="deriv-panel-title">VIX Term Structure</div>
                  <div className="deriv-chart-wrap">
                    <SafeECharts option={vixOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              )}
              {fredOption && (
                <div className="deriv-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="deriv-panel-title">VIX — 1 Year</div>
                  <div className="deriv-chart-wrap">
                    <SafeECharts option={fredOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* VOL SURFACE TAB */}
          <div className={`deriv-tab-panel ${activeTab === 'surface' ? 'active' : ''}`}>
            <div className="deriv-content-grid single">
              {heatmapOption && (
                <div className="deriv-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="deriv-panel-header">
                    <span className="deriv-panel-title">Vol Surface (SPX)</span>
                    <span className="deriv-panel-subtitle">IV by strike/expiry</span>
                  </div>
                  <div className="deriv-chart-wrap" style={{ minHeight: 280 }}>
                    <SafeECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FLOW TAB */}
          <div className={`deriv-tab-panel ${activeTab === 'flow' ? 'active' : ''}`}>
            <div className="deriv-content-grid">
              {flowSummary && (
                <div className="deriv-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="deriv-panel-title">Options Flow</div>
                  <div className="deriv-mini-table" style={{ paddingTop: 8 }}>
                    {flowSummary.map((f, i) => (
                      <div key={i} className="deriv-mini-row">
                        <span className="deriv-mini-name">{f.ticker || f.symbol}</span>
                        <span className="deriv-mini-type">{f.type}</span>
                        <span className="deriv-mini-value" style={{ color: f.side === 'BUY' ? '#4ade80' : '#f87171' }}>
                          {f.side}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Vol Premium */}
              {volPremium && (
                <div className="deriv-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
                  <div className="deriv-panel-title">Vol Premium</div>
                  <div className="deriv-mini-table" style={{ paddingTop: 8 }}>
                    {volPremium.atm1mIV != null && (
                      <div className="deriv-mini-row">
                        <span className="deriv-mini-name">ATM 1M IV</span>
                        <span className="deriv-mini-value">{volPremium.atm1mIV.toFixed(1)}%</span>
                      </div>
                    )}
                    {volPremium.premium != null && (
                      <div className="deriv-mini-row">
                        <span className="deriv-mini-name">Vol Premium</span>
                        <span className="deriv-mini-value" style={{ color: volPremium.premium > 0 ? '#4ade80' : '#f87171' }}>
                          {volPremium.premium >= 0 ? '+' : ''}{volPremium.premium.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}