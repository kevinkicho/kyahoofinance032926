import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './BondsDashboard.css';

const MIDPOINTS = { '0\u20132y': 1, '2\u20135y': 3.5, '5\u201310y': 7.5, '10y+': 15 };

const FFF_MONTHS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
const FFF_LABELS = ['1M', '2M', '3M', '4M', '5M', '6M'];

export default function DurationLadder({ durationLadderData, durationLadderMeta, treasuryRates = null, fedFundsFutures = null, bare = false }) {
  const { colors } = useTheme();
  const safeData = Array.isArray(durationLadderData) && durationLadderData.length
    ? durationLadderData
    : [
        { bucket: '0–2y', amount: null, pct: null },
        { bucket: '2–5y', amount: null, pct: null },
        { bucket: '5–10y', amount: null, pct: null },
        { bucket: '10y+', amount: null, pct: null },
      ];

  const option = useMemo(() => {
    const buckets = safeData.map(d => d.bucket);
    const amounts = safeData.map(d => d.amount != null ? +(d.amount / 1000).toFixed(1) : null);
    const pcts    = safeData.map(d => d.pct);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const i = params[0].dataIndex;
          const d = durationLadderData[i];
          const amt = d.amount != null ? `$${(d.amount / 1000).toFixed(1)}B` : '\u2014';
          return `<b>${d.bucket}</b><br/>Amount: <b>${amt}</b><br/>Weight: <b>${d.pct != null ? d.pct + '%' : '\u2014'}</b>`;
        },
      },
      grid: { top: 20, right: 80, bottom: 30, left: 80 },
      xAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 11, formatter: '${value}B' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'category',
        data: buckets,
        inverse: true,
        axisLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: 500 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'bar',
        data: amounts,
        itemStyle: {
          color: (params) => {
            const seriesColors = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
            return seriesColors[params.dataIndex % seriesColors.length];
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: colors.textSecondary,
          fontSize: 11,
          formatter: (params) => `${pcts[params.dataIndex]}%`,
        },
      }],
    };
  }, [durationLadderData, colors]);

  // KPIs
  const totalAmount = safeData.reduce((s, d) => s + (d.amount || 0), 0);
  const validBuckets = safeData.filter(d => d.pct != null && d.pct > 0);
  const largest = validBuckets.length > 0 ? validBuckets.reduce((a, b) => a.pct > b.pct ? a : b) : safeData[0];
  const avgMaturity = useMemo(() => {
    let wSum = 0, wTotal = 0;
    safeData.forEach(d => {
      const mid = MIDPOINTS[d.bucket] || 5;
      wSum += mid * (d.pct || 0);
      wTotal += (d.pct || 0);
    });
    return wTotal > 0 ? (wSum / wTotal).toFixed(1) : '\u2014';
  }, [durationLadderData]);
  const shortBucket = safeData.find(d => d.bucket.startsWith('0'));
  const longBucket  = safeData.find(d => d.bucket.startsWith('10'));
  const shortLong = (shortBucket && longBucket && longBucket.pct > 0)
    ? (shortBucket.pct / longBucket.pct).toFixed(1) + 'x'
    : '\u2014';

  const fffOption = useMemo(() => {
    if (!fedFundsFutures) return null;
    const vals = FFF_MONTHS.map(k => fedFundsFutures[k] ?? null);
    if (vals.every(v => v == null)) return null;
    const minVal = Math.min(...vals.filter(v => v != null));
    const yMin = Math.max(0, Math.floor((minVal - 0.25) * 4) / 4);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => `${params[0].name}: <b>${params[0].value?.toFixed(3)}%</b>`,
      },
      grid: { top: 10, right: 10, bottom: 24, left: 50 },
      xAxis: {
        type: 'category',
        data: FFF_LABELS,
        axisLabel: { color: colors.textMuted, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        min: yMin,
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'bar',
        data: vals,
        itemStyle: { color: '#60a5fa', borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: 'top',
          color: colors.textSecondary,
          fontSize: 10,
          formatter: (p) => p.value != null ? p.value.toFixed(2) + '%' : '',
        },
      }],
    };
  }, [fedFundsFutures, colors]);

  const fmtTotal = totalAmount > 0
    ? `$${(totalAmount / 1000).toFixed(1)}T`
    : '\u2014';

  const hasData = safeData.some(d => d.amount != null);

  const body = (
    <div className="dl-body">
      {/* KPI Strip \u2014 4 compact pills (uses inherited bonds-kpi-* styles). */}
      <div className="bonds-kpi-strip dl-kpi">
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Total Marketable</span>
          <span className="bonds-kpi-value accent">{fmtTotal}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Largest Bucket</span>
          <span className="bonds-kpi-value accent">{largest?.bucket ?? '\u2014'}</span>
          <span className="bonds-kpi-sub">{largest?.pct != null ? `${largest.pct}%` : ''}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Avg Maturity</span>
          <span className="bonds-kpi-value accent">{avgMaturity}{avgMaturity !== '\u2014' ? 'y' : ''}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Short / Long</span>
          <span className="bonds-kpi-value accent">{shortLong}</span>
        </div>
      </div>

      {/* Two-column grid: ranked bar chart + bucket detail table. */}
      <div className="dl-grid">
        <div className="dl-chart">
          {hasData ? (
            <SafeECharts
              option={option}
              style={{ height: '100%', width: '100%', minHeight: 180 }}
              sourceInfo={{ title: 'Duration Ladder', source: 'Treasury Fiscal Data', endpoint: '/api/bonds', series: [] }}
            />
          ) : (
            <div className="dl-empty">Treasury Fiscal Data unavailable \u2014 buckets shown without amounts</div>
          )}
        </div>
        <div className="dl-table-wrap">
          <table className="dl-table">
            <thead>
              <tr>
                <th>Bucket</th>
                <th>Outstanding</th>
                <th>%</th>
                <th>Avg Rate</th>
              </tr>
            </thead>
            <tbody>
              {safeData.map(d => {
                // Prefer per-bucket rate from server payload, fall back to
                // a separate treasuryRates map keyed by bucket label (used
                // by older tests / external rate sources).
                const rate = d.rate ?? treasuryRates?.[d.bucket] ?? null;
                return (
                  <tr key={d.bucket} className="bonds-rate-item">
                    <td className="dl-bucket">{d.bucket}</td>
                    <td className="dl-num">{d.amount != null ? `$${(d.amount / 1000).toFixed(1)}B` : '\u2014'}</td>
                    <td className="dl-num">{d.pct != null ? `${d.pct}%` : '\u2014'}</td>
                    <td className="dl-num">{rate != null ? `${rate.toFixed(2)}%` : '\u2014'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fed Funds Futures \u2014 implied path next 6 months. */}
      {fffOption && (
        <div className="dl-fff">
          <div className="dl-section-title">Fed Funds Futures \u00b7 Implied Rate 1\u20136 Months Out</div>
          <SafeECharts option={fffOption} style={{ height: 110, width: '100%' }} sourceInfo={{ title: 'Fed Funds Futures', source: 'CME', endpoint: '/api/bonds', series: [] }} />
        </div>
      )}

      <div className="bonds-panel-footer dl-footer">
        Maturity buckets: 0{'\u2013'}2y (Bills+FRNs+short Notes), 2{'\u2013'}5y (medium Notes), 5{'\u2013'}10y (long Notes), 10y+ (Bonds+long Notes)
        {durationLadderMeta?.avgRate != null && ` \u00b7 Weighted avg rate: ${durationLadderMeta.avgRate.toFixed(2)}%`}
        {' \u00b7 Source: fiscaldata.treasury.gov'}
      </div>
    </div>
  );

  if (bare) return body;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Duration Ladder</span>
        <span className="bonds-panel-subtitle">US Treasury marketable debt by maturity{durationLadderMeta?.asOf ? ` (as of ${new Date(durationLadderMeta.asOf + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})` : ''}</span>
      </div>
      {body}
    </div>
  );
}
