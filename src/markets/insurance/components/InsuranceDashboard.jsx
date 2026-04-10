// src/markets/insurance/components/InsuranceDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './InsuranceDashboard.css';

function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

function InsuranceDashboard({
  catBondSpreads,
  combinedRatioData,
  reserveAdequacyData,
  reinsurancePricing,
  reinsurers,
  fredHyOasHistory,
  sectorETF,
  catBondProxy,
  industryAvgCombinedRatio,
  treasury10y,
  catLosses,
  combinedRatioHistory,
}) {
  const { colors } = useTheme();

  // HY OAS chart
  const hyOasOption = useMemo(() => {
    if (!fredHyOasHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: fredHyOasHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fredHyOasHistory.dates.length / 6) } },
      yAxis: { type: 'value', name: 'bps', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fredHyOasHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: 'rgba(245,158,11,0.1)' } }],
    };
  }, [fredHyOasHistory, colors]);

  // Cat Losses chart
  const catLossesOption = useMemo(() => {
    if (!catLosses?.values?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: catLosses.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(catLosses.dates.length / 6) } },
      yAxis: { type: 'value', name: '$B', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'bar', data: catLosses.values, itemStyle: { color: '#ef4444' }, barMaxWidth: 20 }],
    };
  }, [catLosses, colors]);

  // Combined Ratio History chart
  const combinedRatioOption = useMemo(() => {
    if (!combinedRatioHistory?.values?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: combinedRatioHistory.quarters, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'value', name: '%', min: 80, max: 110, nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: combinedRatioHistory.values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#8b5cf6', width: 2 },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: colors.textDim },
          data: [{ yAxis: 100, label: { position: 'end', formatter: '100%', fontSize: 9, color: colors.textMuted } }],
        },
      }],
    };
  }, [combinedRatioHistory, colors]);

  return (
    <div className="ins-dashboard" role="region" aria-label="Insurance Dashboard">
      {/* Left Sidebar */}
      <div className="ins-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }} role="region" aria-label="Insurance Metrics">
        {/* Combined Ratio */}
        {combinedRatioData && (
          <div className="ins-sidebar-section">
            <div className="ins-sidebar-title">Combined Ratio</div>
            <div className="ins-metric-card">
              {typeof combinedRatioData.industry === 'number' && (
                <div className="ins-metric-row">
                  <span className="ins-metric-name">Industry</span>
                  <span className="ins-metric-num" style={{ color: combinedRatioData.industry > 100 ? '#f87171' : '#4ade80' }}>
                    {combinedRatioData.industry.toFixed(1)}%
                  </span>
                </div>
              )}
              {typeof industryAvgCombinedRatio === 'number' && (
                <div className="ins-metric-row">
                  <span className="ins-metric-name">Avg</span>
                  <span className="ins-metric-num" style={{ color: industryAvgCombinedRatio > 100 ? '#f87171' : '#4ade80' }}>
                    {industryAvgCombinedRatio.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reinsurers */}
        {reinsurers?.length > 0 && (
          <div className="ins-sidebar-section">
            <div className="ins-sidebar-title">Reinsurers</div>
            <div className="ins-metric-card">
              {reinsurers.slice(0, 4).map((r) => (
                <div key={r.ticker} className="ins-metric-row">
                  <span className="ins-metric-name">{r.ticker}</span>
                  <span className="ins-metric-num" style={{ color: (r.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                    {fmtChangePct(r.changePct)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content - ALL visible at once */}
      <div className="ins-main" role="region" aria-label="Insurance Charts">
        <div className="ins-content-grid">
          {/* HY OAS History Chart */}
          {hyOasOption && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">HY OAS Spread</div>
              <div className="ins-chart-wrap">
                <SafeECharts option={hyOasOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Combined Ratio by Line */}
          {combinedRatioData?.byLine?.length > 0 && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">Combined Ratio by Line</div>
              <div className="ins-mini-table">
                {combinedRatioData.byLine.slice(0, 8).map((l) => (
                  <div key={l.line} className="ins-mini-row">
                    <span className="ins-mini-name">{l.line}</span>
                    <span className="ins-mini-value" style={{ color: l.ratio > 100 ? '#f87171' : '#4ade80' }}>
                      {l.ratio?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reinsurance Rates */}
          {reinsurancePricing?.byCategory?.length > 0 && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">Reinsurance Rates</div>
              <div className="ins-mini-table">
                {reinsurancePricing.byCategory.slice(0, 8).map((c) => (
                  <div key={c.category} className="ins-mini-row">
                    <span className="ins-mini-name">{c.category}</span>
                    <span className="ins-mini-value">{c.rate?.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reserve Adequacy */}
          {reserveAdequacyData?.length > 0 && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">Reserve Adequacy</div>
              <div className="ins-mini-table">
                {reserveAdequacyData.slice(0, 8).map((r) => (
                  <div key={r.insurer} className="ins-mini-row">
                    <span className="ins-mini-name">{r.insurer}</span>
                    <span className="ins-mini-value" style={{ color: r.ratio > 1.1 ? '#4ade80' : r.ratio < 1 ? '#f87171' : '#fbbf24' }}>
                      {r.ratio?.toFixed(2)}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cat Bond Spreads */}
          {catBondSpreads?.length > 0 && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">Cat Bond Spreads</div>
              <div className="ins-mini-table">
                {catBondSpreads.slice(0, 8).map((b) => (
                  <div key={b.name} className="ins-mini-row">
                    <span className="ins-mini-name">{b.name}</span>
                    <span className="ins-mini-value" style={{ color: b.spread > 8 ? '#4ade80' : '#fbbf24' }}>
                      {b.spread?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sector ETF */}
          {sectorETF?.length > 0 && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">Sector ETFs</div>
              <div className="ins-mini-table">
                {sectorETF.slice(0, 8).map((e) => (
                  <div key={e.symbol} className="ins-mini-row">
                    <span className="ins-mini-name">{e.symbol}</span>
                    <span className="ins-mini-value" style={{ color: (e.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      {(e.changePct || 0) >= 0 ? '+' : ''}{(e.changePct || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cat Losses */}
          {catLossesOption && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">Natural Catastrophe Losses</div>
              <div className="ins-chart-wrap" style={{ minHeight: 140 }}>
                <SafeECharts option={catLossesOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Combined Ratio History */}
          {combinedRatioOption && (
            <div className="ins-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="ins-panel-title">Industry Combined Ratio</div>
              <div className="ins-chart-wrap" style={{ minHeight: 140 }}>
                <SafeECharts option={combinedRatioOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(InsuranceDashboard);