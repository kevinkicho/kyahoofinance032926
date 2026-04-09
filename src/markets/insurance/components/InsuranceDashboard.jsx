// src/markets/insurance/components/InsuranceDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './InsuranceDashboard.css';

function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

export default function InsuranceDashboard({
  catBondSpreads,
  combinedRatioData,
  reserveAdequacyData,
  reinsurancePricing,
  reinsurers,
  hyOAS,
  igOAS,
  fredHyOasHistory,
  sectorETF,
  catBondProxy,
  industryAvgCombinedRatio,
  treasury10y,
}) {
  const { colors } = useTheme();

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    if (hyOAS != null) {
      result.push({
        label: 'HY OAS',
        value: `${hyOAS.toFixed(0)} bps`,
        color: hyOAS > 400 ? '#ef4444' : hyOAS > 250 ? '#f59e0b' : '#22c55e',
      });
    }
    if (igOAS != null) {
      result.push({
        label: 'IG OAS',
        value: `${igOAS.toFixed(0)} bps`,
        color: igOAS > 150 ? '#ef4444' : igOAS > 100 ? '#f59e0b' : '#22c55e',
      });
    }
    if (combinedRatioData?.industry != null) {
      result.push({
        label: 'Combined Ratio',
        value: `${combinedRatioData.industry.toFixed(0)}%`,
        color: combinedRatioData.industry > 100 ? '#ef4444' : '#22c55e',
      });
    }
    if (reinsurancePricing?.avgRate != null) {
      result.push({
        label: 'Reins Rate',
        value: `${reinsurancePricing.avgRate.toFixed(1)}%`,
        color: '#a78bfa',
      });
    }
    return result;
  }, [hyOAS, igOAS, combinedRatioData, reinsurancePricing]);

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
      series: [{ type: 'line', data: fredHyOasHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: '#f59e0b', opacity: 0.1 } }],
    };
  }, [fredHyOasHistory, colors]);

  return (
    <div className="ins-dashboard">
      {/* KPI Strip */}
      <div className="ins-kpi-strip">
        {kpis.map((kpi, i) => (
          <div key={i} className="ins-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="ins-kpi-label">{kpi.label}</span>
            <span className="ins-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
        {reinsurers?.map(r => (
          <div key={r.ticker} className="ins-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="ins-kpi-label">{r.ticker}</span>
            <span className="ins-kpi-value" style={{ color: (r.changePct || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
              {fmtChangePct(r.changePct)}
            </span>
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="ins-chart-grid">
        {/* HY OAS History */}
        {hyOasOption && (
          <div className="ins-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="ins-panel-title">HY OAS Spread</div>
            <div className="ins-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={hyOasOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Combined Ratio */}
        {combinedRatioData && (
          <div className="ins-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="ins-panel-title">Combined Ratio</div>
            <div className="ins-mini-table">
              <div className="ins-mini-row">
                <span className="ins-mini-name">Industry</span>
                <span className="ins-mini-value" style={{ color: combinedRatioData.industry > 100 ? '#ef4444' : '#22c55e' }}>
                  {combinedRatioData.industry?.toFixed(1)}%
                </span>
              </div>
              {combinedRatioData.byLine?.slice(0, 5).map((l, i) => (
                <div key={i} className="ins-mini-row">
                  <span className="ins-mini-name">{l.line}</span>
                  <span className="ins-mini-value" style={{ color: l.ratio > 100 ? '#ef4444' : '#22c55e' }}>
                    {l.ratio?.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reinsurance Pricing */}
        {reinsurancePricing?.byCategory?.length > 0 && (
          <div className="ins-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="ins-panel-title">Reinsurance Rates</div>
            <div className="ins-mini-table">
              {reinsurancePricing.byCategory.slice(0, 6).map((c, i) => (
                <div key={i} className="ins-mini-row">
                  <span className="ins-mini-name">{c.category}</span>
                  <span className="ins-mini-value">{c.rate?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reserve Adequacy */}
        {reserveAdequacyData?.length > 0 && (
          <div className="ins-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="ins-panel-title">Reserve Adequacy</div>
            <div className="ins-mini-table">
              {reserveAdequacyData.slice(0, 6).map((r, i) => (
                <div key={i} className="ins-mini-row">
                  <span className="ins-mini-name">{r.insurer}</span>
                  <span className="ins-mini-value" style={{ color: r.ratio > 1.1 ? '#22c55e' : r.ratio < 1 ? '#ef4444' : '#f59e0b' }}>
                    {r.ratio?.toFixed(2)}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cat Bond Spreads */}
        {catBondSpreads?.length > 0 && (
          <div className="ins-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="ins-panel-title">Cat Bond Spreads</div>
            <div className="ins-mini-table">
              {catBondSpreads.slice(0, 6).map((b, i) => (
                <div key={i} className="ins-mini-row">
                  <span className="ins-mini-name">{b.name}</span>
                  <span className="ins-mini-value" style={{ color: b.spread > 8 ? '#22c55e' : '#f59e0b' }}>
                    {b.spread?.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}