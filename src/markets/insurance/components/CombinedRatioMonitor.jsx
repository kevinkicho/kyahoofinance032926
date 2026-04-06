import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './InsComponents.css';

const LINE_COLORS = ['#0ea5e9', '#a78bfa', '#f59e0b', '#22c55e'];

export default function CombinedRatioMonitor({ combinedRatioData, industryAvgCombinedRatio, treasury10y, sectorETF }) {
  const { colors } = useTheme();
  const { quarters, lines } = combinedRatioData;
  const lineNames = Object.keys(lines);

  // KPI computations
  const latestIdx = quarters.length - 1;
  const latestVals = lineNames.map(n => ({ name: n, val: lines[n]?.[latestIdx] })).filter(v => v.val != null);
  const best = latestVals.length ? latestVals.reduce((a, b) => b.val < a.val ? b : a) : null;
  const industryAvg = latestVals.length ? Math.round(latestVals.reduce((s, v) => s + v.val, 0) / latestVals.length * 10) / 10 : null;
  const autoLatest = lines['Auto']?.[latestIdx] ?? null;
  const homeLatest = lines['Homeowners']?.[latestIdx] ?? null;

  const series = lineNames.map((name, i) => ({
    name, type: 'line', data: lines[name], smooth: true,
    lineStyle: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    itemStyle: { color: LINE_COLORS[i % LINE_COLORS.length] },
    symbol: 'circle', symbolSize: 4,
  }));

  const option = {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => params[0].axisValue + '<br/>' + params.map(p => `${p.seriesName}: ${p.value?.toFixed(1) ?? '—'}`).join('<br/>'),
    },
    legend: { data: lineNames, textStyle: { color: colors.textSecondary, fontSize: 10 }, top: 0 },
    grid: { left: 50, right: 16, top: 30, bottom: 24 },
    xAxis: { type: 'category', data: quarters, axisLabel: { color: colors.textMuted, fontSize: 10 }, axisLine: { lineStyle: { color: colors.cardBg } } },
    yAxis: { type: 'value', name: 'CR (%)', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
    series: [
      ...series,
      { type: 'line', markLine: { silent: true, data: [{ yAxis: 100 }], lineStyle: { color: '#ef4444', type: 'dashed', width: 1 }, label: { formatter: '100%', color: '#ef4444', fontSize: 9 } }, data: [] },
    ],
  };

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Combined Ratio Monitor</span>
        <span className="ins-panel-subtitle">Loss ratio + expense ratio by line · below 100% = underwriting profit</span>
      </div>

      {/* Live data KPI Strip */}
      {(industryAvgCombinedRatio != null || treasury10y != null || sectorETF) && (
        <div className="ins-kpi-strip" style={{ borderBottom: `1px solid`, marginBottom: 4 }}>
          {industryAvgCombinedRatio != null && (
            <div className="ins-kpi-pill">
              <span className="ins-kpi-label">Industry Avg CR</span>
              <span className={`ins-kpi-value ${industryAvgCombinedRatio < 95 ? 'positive' : industryAvgCombinedRatio <= 100 ? '' : 'negative'}`}
                    style={industryAvgCombinedRatio >= 95 && industryAvgCombinedRatio <= 100 ? { color: '#f59e0b' } : undefined}>
                {industryAvgCombinedRatio.toFixed(1)}%
              </span>
              <span className="ins-kpi-sub">5-insurer avg</span>
            </div>
          )}
          {treasury10y != null && (
            <div className="ins-kpi-pill">
              <span className="ins-kpi-label">10Y Treasury</span>
              <span className="ins-kpi-value accent">{treasury10y.toFixed(2)}%</span>
              <span className="ins-kpi-sub">investment income</span>
            </div>
          )}
          {sectorETF && (
            <div className="ins-kpi-pill">
              <span className="ins-kpi-label">KIE ETF</span>
              <span className="ins-kpi-value">${sectorETF.price?.toFixed(2)}</span>
              <span className="ins-kpi-sub" style={{ color: sectorETF.changePct >= 0 ? '#22c55e' : '#ef4444' }}>
                {sectorETF.changePct >= 0 ? '+' : ''}{sectorETF.changePct?.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI Strip */}
      <div className="ins-kpi-strip">
        {autoLatest != null && (
          <div className="ins-kpi-pill">
            <span className="ins-kpi-label">Auto CR</span>
            <span className={`ins-kpi-value ${autoLatest < 100 ? 'positive' : 'negative'}`}>{autoLatest.toFixed(1)}%</span>
            <span className="ins-kpi-sub">{quarters[latestIdx]}</span>
          </div>
        )}
        {homeLatest != null && (
          <div className="ins-kpi-pill">
            <span className="ins-kpi-label">Homeowners CR</span>
            <span className={`ins-kpi-value ${homeLatest < 100 ? 'positive' : 'negative'}`}>{homeLatest.toFixed(1)}%</span>
            <span className="ins-kpi-sub">{quarters[latestIdx]}</span>
          </div>
        )}
        {best && (
          <div className="ins-kpi-pill">
            <span className="ins-kpi-label">Best Performing</span>
            <span className="ins-kpi-value accent">{best.name}</span>
            <span className="ins-kpi-sub" style={{ color: '#22c55e' }}>{best.val.toFixed(1)}%</span>
          </div>
        )}
        {industryAvg != null && (
          <div className="ins-kpi-pill">
            <span className="ins-kpi-label">Industry Avg</span>
            <span className={`ins-kpi-value ${industryAvg < 100 ? 'positive' : 'negative'}`}>{industryAvg.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Main: chart (wide) + latest quarter bars (narrow) */}
      <div className="ins-wide-narrow">
        <div style={{ minHeight: 0, display: 'flex' }}>
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
        <div className="ins-chart-panel">
          <div className="ins-chart-title">Latest Quarter — {quarters[latestIdx]}</div>
          <div className="ins-bar-list" style={{ marginTop: 4 }}>
            {latestVals.sort((a, b) => a.val - b.val).map(({ name, val }) => {
              const pct = Math.min((val / 120) * 100, 100);
              const color = val < 95 ? '#22c55e' : val < 100 ? '#84cc16' : val < 105 ? '#f59e0b' : '#ef4444';
              return (
                <div key={name} className="ins-bar-row">
                  <span className="ins-bar-name">{name}</span>
                  <div className="ins-bar-wrap">
                    <div className="ins-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="ins-bar-val" style={{ color }}>{val.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ins-panel-footer">
        Combined Ratio = Loss Ratio + Expense Ratio · &lt;100% = profit · &gt;100% = loss
      </div>
    </div>
  );
}
