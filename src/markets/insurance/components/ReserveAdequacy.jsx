import React from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './InsComponents.css';

function adequacyColor(pct) {
  if (pct >= 105) return '#22c55e';
  if (pct >= 100) return '#84cc16';
  if (pct >= 95)  return '#f59e0b';
  return '#ef4444';
}

export default function ReserveAdequacy({ reserveAdequacyData }) {
  const { colors } = useTheme();
  const { lines, reserves, required, adequacy } = reserveAdequacyData;

  // KPI computations
  const avgAdequacy = adequacy.length ? Math.round(adequacy.reduce((s, v) => s + v, 0) / adequacy.length * 10) / 10 : null;
  const mostAdequateIdx = adequacy.length ? adequacy.indexOf(Math.max(...adequacy)) : -1;
  const leastAdequateIdx = adequacy.length ? adequacy.indexOf(Math.min(...adequacy)) : -1;
  const totalReserves = reserves.reduce((s, v) => s + v, 0);

  const option = {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const idx = params[0].dataIndex;
        return `${lines[idx]}<br/>Reserves: $${reserves[idx].toLocaleString()}M<br/>Required: $${required[idx].toLocaleString()}M<br/>Adequacy: ${adequacy[idx].toFixed(1)}%`;
      },
    },
    legend: { data: ['Held Reserves ($M)', 'Required Reserves ($M)'], textStyle: { color: colors.textSecondary, fontSize: 10 }, top: 0 },
    grid: { left: 140, right: 16, top: 30, bottom: 16 },
    xAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '${value}M' }, splitLine: { lineStyle: { color: colors.cardBg } } },
    yAxis: { type: 'category', data: lines, axisLabel: { color: colors.textSecondary, fontSize: 10 }, axisLine: { lineStyle: { color: colors.cardBg } } },
    series: [
      { name: 'Held Reserves ($M)', type: 'bar', data: reserves.map((v, i) => ({ value: v, itemStyle: { color: adequacyColor(adequacy[i]) } })), barMaxWidth: 20, label: { show: true, position: 'right', formatter: (p) => `${adequacy[p.dataIndex].toFixed(1)}%`, color: colors.textSecondary, fontSize: 9 } },
      { name: 'Required Reserves ($M)', type: 'bar', data: required, barMaxWidth: 20, itemStyle: { color: colors.cardBg, borderColor: colors.textDim, borderWidth: 1 } },
    ],
  };

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Reserves vs Requirements</span>
        <span className="ins-panel-subtitle">Held vs required by line of business · % label = adequacy ratio</span>
      </div>

      {/* KPI Strip */}
      <div className="ins-kpi-strip">
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Avg Adequacy</span>
          <span className={`ins-kpi-value ${avgAdequacy != null ? (avgAdequacy >= 100 ? 'positive' : 'negative') : ''}`}>
            {avgAdequacy != null ? `${avgAdequacy.toFixed(1)}%` : '—'}
          </span>
        </div>
        {mostAdequateIdx >= 0 && (
          <div className="ins-kpi-pill">
            <span className="ins-kpi-label">Most Adequate</span>
            <span className="ins-kpi-value accent">{lines[mostAdequateIdx]}</span>
            <span className="ins-kpi-sub" style={{ color: '#22c55e' }}>{adequacy[mostAdequateIdx].toFixed(1)}%</span>
          </div>
        )}
        {leastAdequateIdx >= 0 && (
          <div className="ins-kpi-pill">
            <span className="ins-kpi-label">Least Adequate</span>
            <span className="ins-kpi-value" style={{ color: '#ef4444' }}>{lines[leastAdequateIdx]}</span>
            <span className="ins-kpi-sub" style={{ color: '#ef4444' }}>{adequacy[leastAdequateIdx].toFixed(1)}%</span>
          </div>
        )}
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Total Reserves</span>
          <span className="ins-kpi-value">${(totalReserves / 1000).toFixed(1)}B</span>
        </div>
      </div>

      {/* Main: chart (wide) + adequacy list (narrow) */}
      <div className="ins-wide-narrow">
        <div style={{ minHeight: 0, display: 'flex' }}>
          <SafeECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
        <div className="ins-chart-panel">
          <div className="ins-chart-title">Adequacy Ratio by Line</div>
          <div className="ins-adequacy-list" style={{ marginTop: 4 }}>
            {lines.map((line, i) => (
              <div key={line} className="ins-adequacy-item">
                <span className="ins-adequacy-name">{line}</span>
                <span className="ins-adequacy-pct" style={{ color: adequacyColor(adequacy[i]) }}>
                  {adequacy[i].toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ins-panel-footer">
        Adequacy = Held ÷ Required · ≥105% oversupply · 100–104% adequate · 95–99% watch · &lt;95% deficient
      </div>
    </div>
  );
}
