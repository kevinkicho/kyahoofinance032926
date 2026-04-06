import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './DerivComponents.css';

export default function VolSurface({ volSurfaceData, volPremium = null, skewIndex = null }) {
  const { colors } = useTheme();
  const { strikes, expiries, grid } = volSurfaceData;

  // KPI computations
  const atm1mIV = volPremium?.atm1mIV ?? (grid[2]?.[4] ?? null);
  const realized = volPremium?.realizedVol30d ?? null;
  const premium = volPremium?.premium ?? null;
  // 25-delta skew: 90% strike IV minus 110% strike IV for 1M expiry (row index 2)
  const row1m = grid[2] || [];
  const idx90 = strikes.indexOf(90);
  const idx110 = strikes.indexOf(110);
  const skew25d = (idx90 >= 0 && idx110 >= 0 && row1m[idx90] != null && row1m[idx110] != null)
    ? Math.round((row1m[idx90] - row1m[idx110]) * 10) / 10
    : null;

  const heatmapOption = useMemo(() => {
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
      tooltip: {
        formatter: (params) => {
          const [si, ei, vol] = params.data;
          return `<b>${expiries[ei]} / ${strikes[si]}%</b><br/>IV: <b>${vol.toFixed(1)}%</b>`;
        },
      },
      grid: { top: 30, right: 90, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: strikes.map(s => `${s}%`),
        name: 'Strike (% of spot)',
        nameLocation: 'middle',
        nameGap: 22,
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.cardBg } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: expiries,
        name: 'Expiry',
        nameLocation: 'middle',
        nameGap: 36,
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.cardBg } },
        splitLine: { show: false },
      },
      visualMap: {
        min: minVol, max: maxVol, calculable: true, orient: 'vertical',
        right: 4, top: 30,
        textStyle: { color: colors.textMuted, fontSize: 9 },
        inRange: { color: ['#1e3a5f', '#2563eb', '#7c3aed', '#db2777', '#ef4444'] },
      },
      series: [{
        type: 'heatmap', data,
        label: { show: true, fontSize: 8, color: colors.text, formatter: p => p.data[2].toFixed(1) },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    };
  }, [volSurfaceData, colors]);

  // Skew profile: IV at each strike for 1M expiry
  const skewOption = useMemo(() => {
    if (!row1m.length) return null;
    const atmIdx = strikes.indexOf(100);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
      },
      grid: { top: 8, right: 8, bottom: 24, left: 36 },
      xAxis: {
        type: 'category',
        data: strikes.map(s => `${s}%`),
        axisLabel: { color: colors.textMuted, fontSize: 9 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 9 },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'line',
        data: row1m,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { width: 2, color: '#a78bfa' },
        itemStyle: { color: '#a78bfa' },
        areaStyle: { color: '#a78bfa', opacity: 0.06 },
        markPoint: atmIdx >= 0 ? {
          data: [{ coord: [atmIdx, row1m[atmIdx]], itemStyle: { color: '#f59e0b' }, symbolSize: 10 }],
          label: { show: true, formatter: 'ATM', fontSize: 9, color: '#f59e0b', position: 'top' },
        } : undefined,
      }],
    };
  }, [volSurfaceData, colors]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Vol Surface</span>
        <span className="deriv-panel-subtitle">SPX implied volatility · strike % of spot × expiry</span>
      </div>

      {/* KPI Strip */}
      <div className="deriv-kpi-strip">
        <div className="deriv-kpi-pill">
          <span className="deriv-kpi-label">ATM 1M IV</span>
          <span className="deriv-kpi-value accent">{atm1mIV != null ? `${atm1mIV.toFixed(1)}%` : '—'}</span>
        </div>
        {realized != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">30d Realized</span>
            <span className="deriv-kpi-value">{realized.toFixed(1)}%</span>
          </div>
        )}
        {premium != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">IV Premium</span>
            <span className={`deriv-kpi-value ${premium >= 0 ? 'positive' : 'negative'}`}>
              {premium >= 0 ? '+' : ''}{premium.toFixed(1)}%
            </span>
            <span className="deriv-kpi-sub">IV − Realized</span>
          </div>
        )}
        {skew25d != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">25Δ Skew (1M)</span>
            <span className="deriv-kpi-value accent">{skew25d > 0 ? '+' : ''}{skew25d.toFixed(1)}%</span>
            <span className="deriv-kpi-sub">90% IV − 110% IV</span>
          </div>
        )}
        {skewIndex?.value != null && (
          <div className="deriv-kpi-pill">
            <span className="deriv-kpi-label">CBOE SKEW</span>
            <span className={`deriv-kpi-value ${
              skewIndex.interpretation?.toLowerCase().includes('elevated')
                ? 'negative'
                : skewIndex.interpretation?.toLowerCase().includes('low')
                  ? 'positive'
                  : 'amber'
            }`}>
              {skewIndex.value.toFixed(1)}
            </span>
            {skewIndex.interpretation && (
              <span className="deriv-kpi-sub">{skewIndex.interpretation}</span>
            )}
          </div>
        )}
      </div>

      {/* Main: heatmap (wide) + skew profile (narrow) */}
      <div className="deriv-wide-narrow">
        <div style={{ minHeight: 200, display: 'flex' }}>
          <ReactECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
        </div>
        {skewOption && (
          <div className="deriv-chart-panel">
            <div className="deriv-chart-title">Skew Profile — 1M Expiry</div>
            <div className="deriv-mini-chart">
              <ReactECharts option={skewOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      <div className="deriv-panel-footer">
        IV % · Volatility smile: OTM puts carry higher IV than ATM (skew) · Darker = lower vol
      </div>
    </div>
  );
}
