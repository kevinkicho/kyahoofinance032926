import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import BentoWrapper from '../../../components/BentoWrapper';
import SafeECharts from '../../../components/SafeECharts';
import './SentimentDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'key-metrics', x: 0, y: 0, w: 3, h: 3 },
    { i: 'fear-greed', x: 3, y: 0, w: 3, h: 3 },
    { i: 'fsi', x: 6, y: 0, w: 3, h: 3 },
    { i: 'cross-asset', x: 9, y: 0, w: 3, h: 3 },
    { i: 'risk-signals', x: 0, y: 3, w: 6, h: 2 },
    { i: 'leverage', x: 6, y: 3, w: 6, h: 2 },
  ]
};

function SentimentDashboard({
  fearGreedData,
  riskData,
  returnsData,
  marginDebt,
  consumerCredit,
  fsiHistory,
}) {
  const { colors } = useTheme();

  const fgiValue = fearGreedData?.value ?? fearGreedData?.score;
  const fgiLabel = fearGreedData?.classification ?? fearGreedData?.label;
  const vixValue = riskData?.vix ?? riskData?.signals?.find(s => s.name === 'VIX')?.value;
  const putCallRatio = riskData?.putCallRatio;

  const fgiOption = useMemo(() => {
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

  const fsiOption = useMemo(() => {
    if (!fsiHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: fsiHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fsiHistory.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fsiHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 } }],
    };
  }, [fsiHistory, colors]);

  const returnsList = useMemo(() => {
    const assets = returnsData?.assets || returnsData;
    if (!assets?.length) return [];
    return assets.map(a => ({
      asset: a.label || a.ticker || a.asset,
      return: a.ret1d ?? a.return ?? a['1d'] ?? 0,
    }));
  }, [returnsData]);

  return (
    <div className="sent-dashboard sent-dashboard--bento">
      <BentoWrapper layout={LAYOUT} storageKey="sentiment-layout">
        {/* Key Metrics */}
        <div key="key-metrics" className="sent-bento-card">
          <div className="sent-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
            <div className="sent-sidebar-section">
              <div className="sent-sidebar-title">Fear & Greed</div>
              {fgiValue != null && (
                <div className="sent-metric-card">
                  <div className="sent-metric-label">Current</div>
                  <div className="sent-metric-value" style={{
                    color: fgiValue < 25 ? '#ef4444' : fgiValue < 50 ? '#fbbf24' : fgiValue < 75 ? '#22c55e' : '#14b8a6'
                  }}>
                    {fgiValue}
                  </div>
                  {fgiLabel && <div className="sent-metric-status">{fgiLabel}</div>}
                </div>
              )}
            </div>

            <div className="sent-sidebar-section">
              <div className="sent-sidebar-title">Risk Metrics</div>
              {typeof vixValue === 'number' && (
                <div className="sent-metric-card">
                  <div className="sent-metric-row">
                    <span className="sent-metric-name">VIX</span>
                    <span className="sent-metric-num" style={{ color: vixValue > 25 ? '#f87171' : vixValue > 18 ? '#fbbf24' : '#22c55e' }}>
                      {vixValue.toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              {typeof putCallRatio === 'number' && (
                <div className="sent-metric-card">
                  <div className="sent-metric-row">
                    <span className="sent-metric-name">Put/Call</span>
                    <span className="sent-metric-num" style={{ color: putCallRatio > 1.2 ? '#22c55e' : putCallRatio < 0.8 ? '#f87171' : '#fbbf24' }}>
                      {putCallRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {(() => {
                const hySignal = riskData?.signals?.find(s => s.name?.includes('HY'));
                return hySignal && typeof hySignal.value === 'number' ? (
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">HY Spread</span>
                      <span className="sent-metric-num" style={{ color: hySignal.value > 400 ? '#f87171' : '#fbbf24' }}>
                        {hySignal.value.toFixed(0)} bps
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {(marginDebt || consumerCredit) && (
              <div className="sent-sidebar-section">
                <div className="sent-sidebar-title">Leverage</div>
                {typeof marginDebt?.value === 'number' && (
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">Margin Debt</span>
                      <span className="sent-metric-num" style={{ color: '#a78bfa' }}>
                        ${(marginDebt.value / 1e9).toFixed(0)}B
                      </span>
                    </div>
                  </div>
                )}
                {typeof consumerCredit?.value === 'number' && (
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">Consumer Credit</span>
                      <span className="sent-metric-num" style={{ color: '#60a5fa' }}>
                        ${(consumerCredit.value / 1e9).toFixed(0)}B
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fear & Greed Index */}
        {fgiOption && (
          <div key="fear-greed" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Fear & Greed Index</span>
            </div>
            <div className="sent-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Financial Stress Index */}
        {fsiOption && (
          <div key="fsi" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Financial Stress Index</span>
            </div>
            <div className="sent-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={fsiOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Cross-Asset Returns */}
        {returnsList.length > 0 && (
          <div key="cross-asset" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Cross-Asset Returns</span>
            </div>
            <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
              {returnsList.slice(0, 8).map((r) => (
                <div key={r.asset || r.ticker || r.name} className="sent-mini-row">
                  <span className="sent-mini-name">{r.asset}</span>
                  <span className="sent-mini-value" style={{ color: (r.return || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                    {(r.return || 0) >= 0 ? '+' : ''}{(r.return || 0).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Signals */}
        {riskData?.signals?.length > 0 && (
          <div key="risk-signals" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Risk Signals</span>
            </div>
            <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
              {riskData.signals.slice(0, 8).map((s) => (
                <div key={s.name || s.signal} className="sent-mini-row">
                  <span className="sent-mini-name">{s.name}</span>
                  <span className="sent-mini-value" style={{ color: s.signal === 'risk-on' ? '#22c55e' : s.signal === 'risk-off' ? '#f87171' : '#fbbf24' }}>
                    {s.fmt || s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leverage Metrics */}
        {(marginDebt || consumerCredit) && (
          <div key="leverage" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Leverage Metrics</span>
            </div>
            <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
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
      </BentoWrapper>
    </div>
  );
}

export default React.memo(SentimentDashboard);