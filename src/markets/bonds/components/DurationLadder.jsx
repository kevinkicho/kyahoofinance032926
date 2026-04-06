import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './BondsComponents.css';

const MIDPOINTS = { '0\u20132y': 1, '2\u20135y': 3.5, '5\u201310y': 7.5, '10y+': 15 };

export default function DurationLadder({ durationLadderData, treasuryRates = null }) {
  const { colors } = useTheme();

  const option = useMemo(() => {
    const buckets = durationLadderData.map(d => d.bucket);
    const amounts = durationLadderData.map(d => d.amount);
    const pcts    = durationLadderData.map(d => d.pct);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const i = params[0].dataIndex;
          return `<b>${durationLadderData[i].bucket}</b><br/>` +
            `Amount: <b>$${durationLadderData[i].amount.toLocaleString()}M</b><br/>` +
            `Weight: <b>${durationLadderData[i].pct}%</b>`;
        },
      },
      grid: { top: 20, right: 80, bottom: 30, left: 80 },
      xAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 11, formatter: '${value}M' },
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
  const totalAmount = durationLadderData.reduce((s, d) => s + d.amount, 0);
  const largest = durationLadderData.reduce((a, b) => a.pct > b.pct ? a : b, durationLadderData[0]);
  const avgMaturity = useMemo(() => {
    let wSum = 0, wTotal = 0;
    durationLadderData.forEach(d => {
      const mid = MIDPOINTS[d.bucket] || 5;
      wSum += mid * d.pct;
      wTotal += d.pct;
    });
    return wTotal > 0 ? (wSum / wTotal).toFixed(1) : '\u2014';
  }, [durationLadderData]);
  const shortBucket = durationLadderData.find(d => d.bucket.startsWith('0'));
  const longBucket  = durationLadderData.find(d => d.bucket.startsWith('10'));
  const shortLong = (shortBucket && longBucket && longBucket.pct > 0)
    ? (shortBucket.pct / longBucket.pct).toFixed(1) + 'x'
    : '\u2014';

  const fmtTotal = totalAmount >= 1000
    ? `$${(totalAmount / 1000).toFixed(1)}B`
    : `$${totalAmount.toLocaleString()}M`;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Duration Ladder</span>
        <span className="bonds-panel-subtitle">Portfolio allocation by maturity bucket</span>
      </div>

      {/* KPI Strip */}
      <div className="bonds-kpi-strip">
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Total Portfolio</span>
          <span className="bonds-kpi-value accent">{fmtTotal}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Largest Bucket</span>
          <span className="bonds-kpi-value accent">{largest.bucket}</span>
          <span className="bonds-kpi-sub">{largest.pct}%</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Avg Maturity</span>
          <span className="bonds-kpi-value accent">{avgMaturity}y</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Short/Long</span>
          <span className="bonds-kpi-value accent">{shortLong}</span>
        </div>
      </div>

      {/* Wide-Narrow: Chart + Rate Panel */}
      <div className={treasuryRates ? 'bonds-wide-narrow' : ''}>
        <div className="bonds-chart-wrap">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
        {treasuryRates && (
          <div className="bonds-chart-panel">
            <div className="bonds-chart-title">Treasury Avg Rates</div>
            {durationLadderData.map(d => {
              const rate = treasuryRates[d.bucket];
              return (
                <div key={d.bucket} className="bonds-rate-item">
                  <span className="bonds-rate-bucket">{d.bucket}</span>
                  <span className="bonds-rate-value">
                    {rate != null ? `${rate.toFixed(2)}%` : '\u2014'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bonds-panel-footer">
        Maturity buckets: 0{'\u2013'}2y (short), 2{'\u2013'}5y (medium), 5{'\u2013'}10y (long), 10y+ (ultra-long)
        {treasuryRates && ' \u00b7 Avg Rate: US Treasury avg coupon rate (fiscaldata.treasury.gov)'}
      </div>
    </div>
  );
}
