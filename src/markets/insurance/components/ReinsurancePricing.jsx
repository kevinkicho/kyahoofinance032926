import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './InsComponents.css';

function capacityClass(capacity) {
  const map = {
    'Ample': 'ins-capacity-ample', 'Adequate': 'ins-capacity-adequate',
    'Tight': 'ins-capacity-tight', 'Very Tight': 'ins-capacity-verytight',
  };
  return map[capacity] || '';
}

function fmtChange(v) {
  return v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;
}

export default function ReinsurancePricing({ reinsurancePricing, fredHyOasHistory }) {
  const { colors } = useTheme();

  const stats = useMemo(() => {
    const avgROL = reinsurancePricing.reduce((s, r) => s + r.rol, 0) / reinsurancePricing.length;
    const hardest = reinsurancePricing.reduce((a, b) => b.rol > a.rol ? b : a);
    const tightCount = reinsurancePricing.filter(r => r.capacity === 'Tight' || r.capacity === 'Very Tight').length;
    const avgROLChange = reinsurancePricing.reduce((s, r) => s + r.rolChange, 0) / reinsurancePricing.length;
    return { avgROL, hardest, tightCount, avgROLChange };
  }, [reinsurancePricing]);

  // FRED HY OAS 1yr chart
  const fh = fredHyOasHistory;
  const fredOption = fh?.dates?.length >= 20 ? {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    grid: { top: 8, right: 12, bottom: 24, left: 44 },
    xAxis: {
      type: 'category', data: fh.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(fh.dates.length / 6) },
    },
    yAxis: {
      type: 'value', axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [{
      type: 'line', data: fh.values, smooth: true, symbol: 'none',
      lineStyle: { width: 2, color: '#0ea5e9' }, itemStyle: { color: '#0ea5e9' },
      areaStyle: { color: '#0ea5e9', opacity: 0.1 },
    }],
  } : null;

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Reinsurance Pricing</span>
        <span className="ins-panel-subtitle">Treaty reinsurance market · rate-on-line and risk-adjusted premium at latest renewal</span>
      </div>

      {/* KPI Strip */}
      <div className="ins-kpi-strip">
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Avg ROL</span>
          <span className="ins-kpi-value accent">{stats.avgROL.toFixed(1)}%</span>
        </div>
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Hardest Market</span>
          <span className="ins-kpi-value" style={{ color: '#ef4444' }}>{stats.hardest.peril}</span>
          <span className="ins-kpi-sub">ROL {stats.hardest.rol.toFixed(1)}%</span>
        </div>
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Tight / Very Tight</span>
          <span className="ins-kpi-value">{stats.tightCount}</span>
          <span className="ins-kpi-sub">of {reinsurancePricing.length} lines</span>
        </div>
        <div className="ins-kpi-pill">
          <span className="ins-kpi-label">Avg ROL Change</span>
          <span className={`ins-kpi-value ${stats.avgROLChange >= 0 ? 'negative' : 'positive'}`}>
            {fmtChange(stats.avgROLChange)}
          </span>
          <span className="ins-kpi-sub">YoY at renewal</span>
        </div>
      </div>

      {/* Table */}
      <div className="ins-scroll">
        <table className="ins-table">
          <thead>
            <tr>
              <th className="ins-th">Peril</th>
              <th className="ins-th">Layer</th>
              <th className="ins-th">ROL %</th>
              <th className="ins-th">ROL Chg</th>
              <th className="ins-th">RPL %</th>
              <th className="ins-th">RPL Chg</th>
              <th className="ins-th">Capacity</th>
              <th className="ins-th">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {reinsurancePricing.map((row, i) => (
              <tr key={i} className="ins-row">
                <td className="ins-cell">{row.peril}</td>
                <td className="ins-cell">{row.layer}</td>
                <td className="ins-cell">{row.rol.toFixed(1)}%</td>
                <td className={`ins-cell ${row.rolChange >= 0 ? 'ins-change-up' : 'ins-change-down'}`}>
                  {fmtChange(row.rolChange)}
                </td>
                <td className="ins-cell">{row.rpl.toFixed(1)}%</td>
                <td className={`ins-cell ${row.rplChange >= 0 ? 'ins-change-up' : 'ins-change-down'}`}>
                  {fmtChange(row.rplChange)}
                </td>
                <td className={`ins-cell ${capacityClass(row.capacity)}`}>{row.capacity}</td>
                <td className="ins-cell">{row.renewalDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FRED HY OAS 1yr chart */}
      {fredOption && (
        <div className="ins-chart-panel" style={{ height: 160, flexShrink: 0, marginTop: 12 }}>
          <div className="ins-chart-title">HY Credit Spread — 1 Year (FRED OAS, bps)</div>
          <div className="ins-mini-chart">
            <ReactECharts option={fredOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="ins-panel-footer">
        ROL = Rate-on-Line (premium ÷ limit) · RPL = Risk-adjusted Premium Level · HY OAS drives cat bond spreads
      </div>
    </div>
  );
}
