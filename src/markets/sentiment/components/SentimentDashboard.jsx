// src/markets/sentiment/components/SentimentDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './SentimentDashboard.css';

export default function SentimentDashboard({
  fearGreedData,
  cftcData,
  riskData,
  returnsData,
  marginDebt,
  consumerCredit,
  vvixHistory,
  fsiHistory,
}) {
  const { colors } = useTheme();

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    // Fear & Greed - handle both { value, classification } and { score, label } structures
    const fgiValue = fearGreedData?.value ?? fearGreedData?.score;
    const fgiLabel = fearGreedData?.classification ?? fearGreedData?.label;
    if (fgiValue != null) {
      result.push({
        label: 'Fear & Greed',
        value: fgiValue,
        classification: fgiLabel,
        color: fgiValue < 25 ? '#ef4444' : fgiValue < 50 ? '#f59e0b' : fgiValue < 75 ? '#22c55e' : '#14b8a6',
      });
    }
    // VIX - handle both direct property and signals array
    const vixValue = riskData?.vix ?? riskData?.signals?.find(s => s.name === 'VIX')?.value;
    if (vixValue != null) {
      result.push({
        label: 'VIX',
        value: vixValue.toFixed(1),
        color: vixValue > 25 ? '#ef4444' : vixValue > 18 ? '#f59e0b' : '#22c55e',
      });
    }
    // Put/Call - check for direct property
    if (riskData?.putCallRatio != null) {
      result.push({
        label: 'Put/Call',
        value: riskData.putCallRatio.toFixed(2),
        color: riskData.putCallRatio > 1.2 ? '#22c55e' : riskData.putCallRatio < 0.8 ? '#ef4444' : '#f59e0b',
      });
    }
    // Margin Debt
    if (marginDebt?.value != null) {
      result.push({
        label: 'Margin Debt',
        value: `$${(marginDebt.value / 1e9).toFixed(0)}B`,
        color: '#a78bfa',
      });
    }
    // Consumer Credit
    if (consumerCredit?.value != null) {
      result.push({
        label: 'Consumer Credit',
        value: `$${(consumerCredit.value / 1e9).toFixed(0)}B`,
        color: '#60a5fa',
      });
    }
    // HY Spread from signals
    const hySpread = riskData?.signals?.find(s => s.name?.includes('HY') || s.name?.includes('Credit'))?.value;
    if (hySpread != null) {
      result.push({
        label: 'HY Spread',
        value: `${hySpread.toFixed(0)} bps`,
        color: hySpread > 400 ? '#ef4444' : hySpread > 250 ? '#f59e0b' : '#22c55e',
      });
    }
    return result;
  }, [fearGreedData, riskData, marginDebt, consumerCredit]);

  // Fear & Greed chart
  const fgiOption = useMemo(() => {
    // Handle both { history: [{ date, value }] } and { history: { dates, values } }
    const history = fearGreedData?.history;
    if (!history?.length && !history?.dates?.length) return null;

    const dates = history?.dates || history?.map?.(h => h.date);
    const values = history?.values || history?.map?.(h => h.value);

    if (!dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 6) } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 2 },
        areaStyle: { color: '#a78bfa', opacity: 0.1 },
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: colors.textDim },
          data: [
            { yAxis: 25, label: { formatter: 'Fear', color: colors.textMuted, fontSize: 9 } },
            { yAxis: 75, label: { formatter: 'Greed', color: colors.textMuted, fontSize: 9 } },
          ],
        },
      }],
    };
  }, [fearGreedData, colors]);

  // Risk dashboard (VIX + VVIX)
  const riskOption = useMemo(() => {
    if (!vvixHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['VIX', 'VVIX'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: vvixHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(vvixHistory.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'VIX', type: 'line', data: vvixHistory.vix, smooth: true, symbol: 'none', lineStyle: { color: '#ef4444', width: 2 } },
        { name: 'VVIX', type: 'line', data: vvixHistory.vvix, smooth: true, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2 } },
      ],
    };
  }, [vvixHistory, colors]);

  // CFTC Positioning
  const cftcOption = useMemo(() => {
    // Handle both { currencies: [...] } and direct array
    const currencies = cftcData?.currencies || cftcData;
    if (!currencies?.length) return null;
    const names = currencies.slice(0, 6).map(c => c.name || c.code);
    const netLongs = currencies.slice(0, 6).map(c => c.netLong || c.longK || 0);
    const netShorts = currencies.slice(0, 6).map(c => c.netShort || c.shortK || 0);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Net Long', 'Net Short'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 30, bottom: 30, left: 80 },
      xAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'category', data: names, axisLabel: { color: colors.textMuted, fontSize: 10 } },
      series: [
        { name: 'Net Long', type: 'bar', data: netLongs, itemStyle: { color: '#22c55e' } },
        { name: 'Net Short', type: 'bar', data: netShorts, itemStyle: { color: '#ef4444' } },
      ],
    };
  }, [cftcData, colors]);

  // Cross-asset returns
  const returnsList = useMemo(() => {
    const assets = returnsData?.assets || returnsData;
    if (!assets?.length) return [];
    return assets.map(a => ({
      asset: a.label || a.ticker || a.asset,
      return: a.ret1d ?? a.return ?? a['1d'] ?? 0,
    }));
  }, [returnsData]);

  return (
    <div className="sent-dashboard">
      {/* KPI Strip */}
      <div className="sent-kpi-strip">
        {kpis.map((kpi, i) => (
          <div key={i} className="sent-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="sent-kpi-label">{kpi.label}</span>
            <span className="sent-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
            {kpi.classification && (
              <span className="sent-kpi-status">{kpi.classification}</span>
            )}
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="sent-chart-grid">
        {/* Fear & Greed */}
        {fgiOption && (
          <div className="sent-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="sent-panel-title">Fear & Greed Index</div>
            <div className="sent-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* VIX / VVIX */}
        {riskOption && (
          <div className="sent-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="sent-panel-title">VIX & VVIX</div>
            <div className="sent-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={riskOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* CFTC Positioning */}
        {cftcOption && (
          <div className="sent-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="sent-panel-title">CFTC Positioning</div>
            <div className="sent-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={cftcOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Cross-Asset Returns */}
        {returnsList.length > 0 && (
          <div className="sent-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="sent-panel-title">Cross-Asset Returns</div>
            <div className="sent-mini-table">
              {returnsList.slice(0, 8).map((r, i) => (
                <div key={i} className="sent-mini-row">
                  <span className="sent-mini-name">{r.asset}</span>
                  <span className="sent-mini-value" style={{ color: (r.return || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(r.return || 0) >= 0 ? '+' : ''}{(r.return || 0).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Summary */}
        {riskData?.signals?.length > 0 && (
          <div className="sent-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="sent-panel-title">Risk Metrics</div>
            <div className="sent-mini-table">
              {riskData.signals.slice(0, 6).map((s, i) => (
                <div key={i} className="sent-mini-row">
                  <span className="sent-mini-name">{s.name}</span>
                  <span className="sent-mini-value" style={{ color: s.signal === 'risk-on' ? '#22c55e' : s.signal === 'risk-off' ? '#ef4444' : '#f59e0b' }}>
                    {s.fmt || s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Margin & Credit */}
        {(marginDebt || consumerCredit) && (
          <div className="sent-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="sent-panel-title">Leverage Metrics</div>
            <div className="sent-mini-table">
              {marginDebt?.value != null && (
                <div className="sent-mini-row">
                  <span className="sent-mini-name">Margin Debt</span>
                  <span className="sent-mini-value">${(marginDebt.value / 1e9).toFixed(0)}B</span>
                </div>
              )}
              {consumerCredit?.value != null && (
                <div className="sent-mini-row">
                  <span className="sent-mini-name">Consumer Credit</span>
                  <span className="sent-mini-value">${(consumerCredit.value / 1e9).toFixed(0)}B</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}