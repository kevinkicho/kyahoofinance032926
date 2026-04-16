// src/markets/sentiment/components/RiskDashboard.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './SentimentComponents.css';

function badgeClass(signal) {
  if (signal === 'risk-on')  return 'sent-badge sent-badge-on';
  if (signal === 'risk-off') return 'sent-badge sent-badge-off';
  return 'sent-badge sent-badge-neu';
}

function badgeLabel(signal) {
  if (signal === 'risk-on')  return 'Risk-On';
  if (signal === 'risk-off') return 'Risk-Off';
  return 'Neutral';
}

function scoreColor(score, textSecondary = '#94a3b8') {
  if (score >= 65) return '#7c3aed';
  if (score >= 50) return '#a78bfa';
  if (score >= 35) return textSecondary;
  return '#f87171';
}

function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  // accepts YYYY-MM-DD or YYYY-MM
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length >= 2) return `${parts[1]}/${parts[0].slice(2)}`;
  return dateStr;
}

function buildLineOption({ dates, values, color, minBuffer = 0, yLabel = '', colors, areaColor }) {
  const labels = dates.map(fmtShortDate);
  const interval = Math.max(0, Math.floor(labels.length / 6) - 1);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.05 || 1;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}: ${params[0].value != null ? params[0].value.toLocaleString() : '—'}`,
    },
    grid: { top: 6, right: 8, bottom: 18, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: labels,
      axisLabel: { color: colors.textDim, fontSize: 9, interval },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      min: Math.floor(min - pad),
      max: Math.ceil(max + pad),
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => yLabel ? `${v}${yLabel}` : v.toLocaleString() },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: values,
      lineStyle: { width: 1.5, color },
      itemStyle: { color },
      symbol: 'none',
      areaStyle: areaColor
        ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: areaColor + '44' }, { offset: 1, color: areaColor + '05' }] } }
        : undefined,
    }],
  };
}

export default function RiskDashboard({ riskData, marginDebt, vvixHistory, fsiHistory }) {
  const { colors } = useTheme();
  if (!riskData) return null;
  const { signals = [], overallScore = 50, overallLabel = 'Neutral' } = riskData;
  const color = scoreColor(overallScore, colors.textSecondary);

  const vvixOption = useMemo(() => {
    if (!vvixHistory?.dates?.length) return null;
    return buildLineOption({
      dates: vvixHistory.dates,
      values: vvixHistory.values,
      color: '#f97316',
      colors,
      areaColor: '#f97316',
    });
  }, [vvixHistory, colors]);

  const fsiOption = useMemo(() => {
    if (!fsiHistory?.dates?.length) return null;
    const labels = fsiHistory.dates.map(d => d.slice(0, 7));
    const interval = Math.max(0, Math.floor(labels.length / 6) - 1);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: params => {
          const v = params[0]?.value;
          const status = v < 0 ? 'Below average (calm)' : v > 1 ? 'Elevated stress' : 'Near normal';
          return `<b>${params[0].axisValue}</b><br/>FSI: <b>${v?.toFixed(2)}</b><br/><span style="color:#94a3b8">${status}</span>`;
        },
      },
      grid: { top: 6, right: 8, bottom: 18, left: 8, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: colors.textDim, fontSize: 9, interval },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 9 },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'line',
        data: fsiHistory.values,
        lineStyle: { width: 1.5, color: '#06b6d4' },
        itemStyle: { color: '#06b6d4' },
        symbol: 'none',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.3)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.02)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          data: [
            { yAxis: 0, lineStyle: { color: '#64748b' }, label: { formatter: 'Normal', position: 'end' } },
            { yAxis: 1, lineStyle: { color: '#f59e0b' }, label: { formatter: 'Stress', position: 'end' } },
          ],
        },
      }],
    };
  }, [fsiHistory, colors]);

  const marginOption = useMemo(() => {
    if (!marginDebt?.dates?.length) return null;
    const last = marginDebt.values[marginDebt.values.length - 1];
    const prev = marginDebt.values[marginDebt.values.length - 2];
    const rising = last != null && prev != null && last >= prev;
    const lineColor = rising ? '#7c3aed' : '#f87171';
    return { option: buildLineOption({
      dates: marginDebt.dates,
      values: marginDebt.values,
      color: lineColor,
      colors,
      areaColor: lineColor,
    }), rising, last };
  }, [marginDebt, colors]);

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Risk Dashboard</span>
        <span className="sent-panel-subtitle">Cross-asset risk-on / risk-off signals · FRED + Yahoo Finance</span>
      </div>

      {/* Signal cards grid */}
      <div className="sent-risk-grid">
        {signals.map(sig => (
          <div key={sig.name} className="sent-risk-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="sent-risk-name">{sig.name}</span>
              <span className={badgeClass(sig.signal)}>{badgeLabel(sig.signal)}</span>
            </div>
            <div className="sent-risk-value">{sig.fmt}</div>
            <div className="sent-risk-desc">{sig.description}</div>
          </div>
        ))}
      </div>

      {/* Overall score */}
      <div className="sent-score-display">
        <div className="sent-score-value" style={{ color }}>{overallScore}</div>
        <div className="sent-score-label">Overall Risk Appetite Score · {overallLabel}</div>
      </div>

      {/* VVIX + Margin Debt + FSI charts */}
      {(vvixOption || marginOption || fsiOption) && (
        <div className="sent-three-col" style={{ flex: 'none', height: 160 }}>
          {vvixOption ? (
            <div className="sent-chart-panel">
              <div className="sent-chart-title">VVIX — Vol of Vol</div>
              <div className="sent-chart-subtitle">VIX of VIX · elevated = tail-risk</div>
              <div className="sent-chart-wrap">
                <SafeECharts option={vvixOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'VVIX — Vol of Vol', source: 'CBOE / Yahoo Finance', endpoint: '/api/sentiment', series: [] }} />
              </div>
            </div>
          ) : <div className="sent-chart-panel" />}

          {fsiOption ? (
            <div className="sent-chart-panel">
              <div className="sent-chart-title">Financial Stress Index</div>
              <div className="sent-chart-subtitle">St. Louis Fed FSI · &lt;0 = calm · &gt;1 = stress</div>
              <div className="sent-chart-wrap">
                <SafeECharts option={fsiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Financial Stress Index', source: 'FRED', endpoint: '/api/sentiment', series: [{ id: 'STLFSI4' }] }} />
              </div>
            </div>
          ) : <div className="sent-chart-panel" />}

          {marginOption ? (
            <div className="sent-chart-panel">
              <div className="sent-chart-title">
                Margin Debt
                <span style={{ marginLeft: 6, fontSize: 9, color: marginOption.rising ? '#7c3aed' : '#f87171' }}>
                  {marginOption.rising ? '▲ Rising' : '▼ Falling'}
                </span>
              </div>
              <div className="sent-chart-subtitle">FINRA margin · quarterly · USD bn</div>
              <div className="sent-chart-wrap">
                <SafeECharts option={marginOption.option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Margin Debt', source: 'FINRA / FRED', endpoint: '/api/sentiment', series: [{ id: 'FINNSAMBS' }] }} />
              </div>
            </div>
          ) : <div className="sent-chart-panel" />}
        </div>
      )}
    </div>
  );
}
