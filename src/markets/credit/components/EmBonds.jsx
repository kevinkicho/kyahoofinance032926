// src/markets/credit/components/EmBonds.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './CreditComponents.css';

function ratingClass(r) {
  if (!r) return 'credit-rating-nr';
  const u = r.toUpperCase();
  if (u.startsWith('AA') || u.startsWith('A') || u === 'BBB+' || u === 'BBB' || u === 'BBB-') return 'credit-rating-ig';
  if (u.startsWith('B')) return 'credit-rating-hy';
  return 'credit-rating-nr';
}

function fmtChange(v) {
  if (v == null) return { text: '—', cls: 'credit-neu' };
  const cls = v < -5 ? 'credit-pos' : v > 5 ? 'credit-neg' : 'credit-neu';
  return { text: `${v >= 0 ? '+' : ''}${v}bps`, cls };
}

function buildRegionOption(regions, colors) {
  const sorted = [...regions].sort((a, b) => b.avgSpread - a.avgSpread);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].name}: ${params[0].value}bps avg spread`,
    },
    grid: { top: 8, right: 64, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}bps` },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(r => r.region),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map((r, i) => ({
        value: r.avgSpread,
        itemStyle: { color: i === 0 ? '#f87171' : i === 1 ? '#f59e0b' : i === 2 ? '#06b6d4' : '#818cf8' },
      })),
      label: {
        show: true, position: 'right',
        formatter: p => `${p.value}bps`,
        color: colors.textSecondary, fontSize: 9,
      },
    }],
  };
}

export default function EmBonds({ emBondData, lastUpdated }) {
  if (!emBondData) return null;
  const { colors } = useTheme();
  const { countries = [], regions = [] } = emBondData;

  const kpis = useMemo(() => {
    if (!countries.length) return null;
    const tightest = countries.reduce((a, b) => b.spread < a.spread ? b : a);
    const widest   = countries.reduce((a, b) => b.spread > a.spread ? b : a);
    const avgSpread = Math.round(countries.reduce((s, c) => s + c.spread, 0) / countries.length);
    const igCount = countries.filter(c => {
      if (!c.rating) return false;
      const u = c.rating.toUpperCase();
      return u.startsWith('AA') || u.startsWith('A') || u === 'BBB+' || u === 'BBB' || u === 'BBB-';
    }).length;
    return { tightest, widest, avgSpread, igCount };
  }, [countries]);

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">EM Bonds</span>
        <span className="credit-panel-subtitle">Sovereign spreads · EMBI · 10yr yield · debt/GDP · FRED / Bloomberg proxies</span>
      </div>
      {kpis && (
        <div className="credit-kpi-strip">
          <div className="credit-kpi-pill">
            <span className="credit-kpi-label">Tightest Spread</span>
            <span className="credit-kpi-value accent">{kpis.tightest.country} {kpis.tightest.spread}bps</span>
          </div>
          <div className="credit-kpi-pill">
            <span className="credit-kpi-label">Widest Spread</span>
            <span className="credit-kpi-value">{kpis.widest.country} {kpis.widest.spread}bps</span>
          </div>
          <div className="credit-kpi-pill">
            <span className="credit-kpi-label">Avg EM Spread</span>
            <span className="credit-kpi-value">{kpis.avgSpread}bps</span>
          </div>
          <div className="credit-kpi-pill">
            <span className="credit-kpi-label"># Investment Grade</span>
            <span className="credit-kpi-value">{kpis.igCount}</span>
          </div>
        </div>
      )}
      <div className="credit-two-col">
        <div className="credit-chart-panel">
          <div className="credit-chart-title">Sovereign Spread by Country</div>
          <div className="credit-chart-subtitle">EMBI spread (bps) · rating · 10yr yield · debt/GDP · 1m change</div>
          <div className="credit-scroll">
            <table className="credit-table">
              <thead>
                <tr>
                  <th className="credit-th" style={{ textAlign: 'left' }}>Country</th>
                  <th className="credit-th" style={{ textAlign: 'center' }}>Rtg</th>
                  <th className="credit-th">Spread</th>
                  <th className="credit-th">1m Δ</th>
                  <th className="credit-th">10yr Yld</th>
                  <th className="credit-th">Debt/GDP</th>
                </tr>
              </thead>
              <tbody>
                {[...countries].sort((a, b) => a.spread - b.spread).map(c => {
                  const ch = fmtChange(c.change1m);
                  return (
                    <tr key={c.code} className="credit-row">
                      <td className="credit-cell"><strong>{c.country}</strong></td>
                      <td className="credit-cell" style={{ textAlign: 'center' }}>
                        <span className={`credit-rating-badge ${ratingClass(c.rating)}`}>{c.rating}</span>
                      </td>
                      <td className="credit-cell credit-num"><MetricValue value={c.spread} seriesKey="emBondSpread" timestamp={lastUpdated} format={v => `${v}bps`} /></td>
                      <td className={`credit-cell credit-num ${ch.cls}`}>{c.change1m != null ? <MetricValue value={c.change1m} seriesKey="emBondSpread" timestamp={lastUpdated} format={v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'} /> : ch.text}</td>
                      <td className="credit-cell credit-num"><MetricValue value={c.yld10y} seriesKey="emYield" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></td>
                      <td className="credit-cell credit-num"><MetricValue value={c.debtGdp} seriesKey="emDebtGdp" timestamp={lastUpdated} format={v => `${v}%`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="credit-chart-panel">
          <div className="credit-chart-title">EM Region Spread Comparison</div>
          <div className="credit-chart-subtitle">Average EMBI spread by region · red = widest · blue = tightest</div>
          <div className="credit-chart-wrap">
            <SafeECharts option={buildRegionOption(regions, colors)} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'EM Region Spread Comparison', source: 'FRED / Bloomberg', endpoint: '/api/credit', series: [{ id: 'BAMLEMRACRPIOAS' }] }} />
          </div>
        </div>
      </div>
    </div>
  );
}
