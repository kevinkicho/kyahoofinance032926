// src/markets/derivatives/components/DerivativesDashboard.jsx
import React, { useMemo } from 'react';
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

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    // VIX spot
    if (vixTermStructure?.values?.length) {
      result.push({
        label: 'VIX Spot',
        value: vixTermStructure.values[0].toFixed(1),
        color: vixTermStructure.values[0] > 25 ? '#ef4444' : vixTermStructure.values[0] > 18 ? '#f59e0b' : '#22c55e',
      });
    }
    // Contango/Backwardation
    if (vixTermStructure?.values?.length >= 2) {
      const spot = vixTermStructure.values[0];
      const back = vixTermStructure.values[vixTermStructure.values.length - 1];
      const pct = Math.round(((back - spot) / spot) * 1000) / 10;
      result.push({
        label: spot < back ? 'Contango' : 'Backwardation',
        value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        color: spot < back ? '#22c55e' : '#ef4444',
      });
    }
    // VVIX
    if (vixEnrichment?.vvix != null) {
      result.push({
        label: 'VVIX',
        value: vixEnrichment.vvix.toFixed(1),
        color: '#a78bfa',
      });
    }
    // Put/Call
    if (putCallRatio != null) {
      result.push({
        label: 'Put/Call',
        value: putCallRatio.toFixed(2),
        color: putCallRatio > 1.0 ? '#ef4444' : putCallRatio < 0.7 ? '#22c55e' : '#f59e0b',
      });
    }
    // ATM 1M IV
    if (volPremium?.atm1mIV != null) {
      result.push({
        label: 'ATM 1M IV',
        value: `${volPremium.atm1mIV.toFixed(1)}%`,
        color: '#60a5fa',
      });
    }
    return result;
  }, [vixTermStructure, vixEnrichment, putCallRatio, volPremium]);

  // VIX term structure chart
  const vixOption = useMemo(() => {
    if (!vixTermStructure?.dates?.length) return null;
    const { dates, values, prevValues } = vixTermStructure;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Current', 'Prev Close'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 10 } },
      yAxis: { type: 'value', name: 'VIX', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted, fontSize: 10 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'Current', type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2.5, color: '#a78bfa' }, itemStyle: { color: '#a78bfa' } },
        { name: 'Prev Close', type: 'line', data: prevValues, smooth: true, symbol: 'none', lineStyle: { width: 1.5, type: 'dashed', color: colors.textDim } },
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
      grid: { top: 8, right: 12, bottom: 24, left: 40 },
      xAxis: { type: 'category', data: fredVixHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v?.slice(5), interval: Math.floor(fredVixHistory.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fredVixHistory.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#a78bfa' }, areaStyle: { color: '#a78bfa', opacity: 0.1 } }],
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
      grid: { top: 30, right: 90, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: strikes.map(s => `${s}%`), name: 'Strike', nameLocation: 'middle', nameGap: 22, nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted, fontSize: 10 } },
      yAxis: { type: 'category', data: expiries, name: 'Expiry', nameLocation: 'middle', nameGap: 36, nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted, fontSize: 10 } },
      visualMap: { min: minVol, max: maxVol, calculable: true, orient: 'vertical', right: 4, top: 30, textStyle: { color: colors.textMuted, fontSize: 9 }, inRange: { color: ['#1e3a5f', '#2563eb', '#7c3aed', '#db2777', '#ef4444'] } },
      series: [{ type: 'heatmap', data, label: { show: true, fontSize: 8, color: colors.text, formatter: p => p.data[2].toFixed(1) } }],
    };
  }, [volSurfaceData, colors]);

  // Options flow summary
  const flowSummary = useMemo(() => {
    if (!optionsFlow?.length) return null;
    return optionsFlow.slice(0, 6);
  }, [optionsFlow]);

  return (
    <div className="deriv-dashboard">
      {/* KPI Strip */}
      <div className="deriv-kpi-strip-new">
        {kpis.map((kpi, i) => (
          <div key={i} className="deriv-kpi-pill-new" style={{ background: colors.bgCard }}>
            <span className="deriv-kpi-label">{kpi.label}</span>
            <span className="deriv-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="deriv-chart-grid">
        {/* VIX Term Structure */}
        {vixOption && (
          <div className="deriv-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="deriv-panel-title">VIX Term Structure</div>
            <div className="deriv-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={vixOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* VIX 1Y History */}
        {fredOption && (
          <div className="deriv-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="deriv-panel-title">VIX — 1 Year</div>
            <div className="deriv-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={fredOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Vol Surface Heatmap */}
        {heatmapOption && (
          <div className="deriv-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="deriv-panel-title">Vol Surface (SPX)</div>
            <div className="deriv-chart-wrap" style={{ minHeight: 200 }}>
              <SafeECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Options Flow */}
        {flowSummary && (
          <div className="deriv-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="deriv-panel-title">Options Flow</div>
            <div className="deriv-mini-table">
              {flowSummary.map((f, i) => (
                <div key={i} className="deriv-mini-row">
                  <span className="deriv-mini-name">{f.ticker || f.symbol}</span>
                  <span className="deriv-mini-type">{f.type}</span>
                  <span className="deriv-mini-value" style={{ color: f.side === 'BUY' ? '#22c55e' : '#ef4444' }}>
                    {f.side}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}