// src/markets/bonds/components/BondsDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './BondsDashboard.css';

const TENORS = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
const COUNTRY_COLORS = {
  US: '#60a5fa', DE: '#34d399', JP: '#f472b6',
  GB: '#a78bfa', IT: '#fb923c', FR: '#facc15',
  CN: '#f87171', AU: '#4ade80',
};

/**
 * BondsDashboard - Unified view showing all bond data at once
 * Combines: Yield Curve, Credit Matrix, Spread Monitor, Duration Ladder, Breakevens
 */
export default function BondsDashboard({
  yieldCurveData,
  creditRatingsData,
  spreadData,
  spreadIndicators,
  durationLadderData,
  breakevensData,
  treasuryRates,
  fredYieldHistory,
  fedFundsFutures,
  yieldHistory,
  mortgageSpread,
}) {
  const { colors } = useTheme();

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    // 10Y-2Y Spread
    if (spreadIndicators?.t10y2y != null) {
      result.push({
        label: '10Y-2Y Spread',
        value: spreadIndicators.t10y2y.toFixed(2),
        unit: '%',
        color: spreadIndicators.t10y2y < 0 ? '#f87171' : '#4ade80',
        status: spreadIndicators.t10y2y < 0 ? 'Inverted' : 'Normal',
      });
    }
    // Fed Funds Rate
    if (treasuryRates?.fedFunds != null) {
      result.push({
        label: 'Fed Funds',
        value: treasuryRates.fedFunds.toFixed(2),
        unit: '%',
        color: treasuryRates.fedFunds < 3 ? '#4ade80' : '#fbbf24',
      });
    }
    // 10Y Treasury
    if (treasuryRates?.tenYear != null) {
      result.push({
        label: '10Y Treasury',
        value: treasuryRates.tenYear.toFixed(2),
        unit: '%',
        color: '#a78bfa',
      });
    }
    // Credit Spread (IG)
    const igSpread = spreadData?.IG?.length ? spreadData.IG[spreadData.IG.length - 1] : null;
    if (igSpread != null) {
      result.push({
        label: 'IG Spread',
        value: igSpread.toFixed(0),
        unit: 'bp',
        color: igSpread > 150 ? '#f87171' : '#4ade80',
      });
    }
    // Breakeven Inflation
    if (breakevensData?.fiveYear != null) {
      result.push({
        label: '5Y Breakeven',
        value: breakevensData.fiveYear.toFixed(2),
        unit: '%',
        color: breakevensData.fiveYear > 3 ? '#fbbf24' : '#4ade80',
      });
    }
    return result;
  }, [spreadIndicators, treasuryRates, spreadData, breakevensData]);

  // Yield Curve chart - multi-country
  const yieldCurveOption = useMemo(() => {
    if (!yieldCurveData || !Object.keys(yieldCurveData).length) return null;
    const countries = Object.keys(yieldCurveData);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) => params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>') },
      legend: { data: countries, top: 0, textStyle: { color: colors.textSecondary, fontSize: 11 } },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: TENORS, axisLabel: { color: colors.textMuted, fontSize: 11 }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 11, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: countries.map(c => ({
        name: c,
        type: 'line',
        smooth: true,
        data: TENORS.map(t => yieldCurveData[c]?.[t] ?? null),
        itemStyle: { color: COUNTRY_COLORS[c] || colors.textSecondary },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 5,
      })),
    };
  }, [yieldCurveData, colors]);

  // FRED 10Y history chart
  const historyOption = useMemo(() => {
    if (!fredYieldHistory?.dates?.length) return null;
    const d = fredYieldHistory.dates;
    const v = fredYieldHistory.values;
    const step = Math.max(1, Math.floor(d.length / 60));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const vals = v.filter((_, i) => i % step === 0 || i === v.length - 1);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>10Y: <b>${p[0].value?.toFixed(2)}%</b>` },
      grid: { top: 10, right: 20, bottom: 24, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 10, interval: Math.floor(dates.length / 5) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: vals, areaStyle: { color: 'rgba(16,185,129,0.12)' }, lineStyle: { color: '#10b981', width: 1.5 }, itemStyle: { color: '#10b981' }, symbol: 'none', smooth: true }],
    };
  }, [fredYieldHistory, colors]);

  // Multi-tenor history (2Y/10Y/30Y)
  const multiTenorOption = useMemo(() => {
    if (!yieldHistory?.dates?.length) return null;
    const d = yieldHistory.dates;
    const step = Math.max(1, Math.floor(d.length / 80));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const subsample = (arr) => arr ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1) : [];
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) => `<b>${params[0].axisValue}</b><br/>` + params.map(p => `${p.seriesName}: <b>${p.value != null ? p.value.toFixed(2) + '%' : '—'}</b>`).join('<br/>') },
      legend: { data: ['2Y', '10Y', '30Y'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 24, right: 20, bottom: 24, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 10, interval: Math.floor(dates.length / 5) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '2Y', type: 'line', data: subsample(yieldHistory.dgs2), symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 }, itemStyle: { color: '#60a5fa' } },
        { name: '10Y', type: 'line', data: subsample(yieldHistory.dgs10), symbol: 'none', smooth: true, lineStyle: { color: '#fbbf24', width: 1.5 }, itemStyle: { color: '#fbbf24' } },
        { name: '30Y', type: 'line', data: subsample(yieldHistory.dgs30), symbol: 'none', smooth: true, lineStyle: { color: '#f87171', width: 1.5 }, itemStyle: { color: '#f87171' } },
      ],
    };
  }, [yieldHistory, colors]);

  // Country count for display
  const countryCount = yieldCurveData ? Object.keys(yieldCurveData).length : 0;

  return (
    <div className="bonds-dashboard">
      {/* KPI Strip */}
      <div className="bonds-kpi-strip">
        {kpis.map((kpi, i) => (
          <div key={i} className="bonds-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="bonds-kpi-label">{kpi.label}</span>
            <span className="bonds-kpi-value" style={{ color: kpi.color }}>
              {kpi.value}{kpi.unit}
            </span>
            {kpi.status && <span className="bonds-kpi-status">{kpi.status}</span>}
          </div>
        ))}
      </div>

      {/* Chart Grid - 2 columns */}
      <div className="bonds-chart-grid">
        {/* Yield Curve - Multi-country */}
        {yieldCurveOption && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Yield Curve ({countryCount} Countries)</div>
            <div className="bonds-chart-wrap" style={{ minHeight: 200 }}>
              <SafeECharts option={yieldCurveOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* US 10Y History */}
        {historyOption && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">US 10Y Yield — 1Y History (FRED)</div>
            <div className="bonds-chart-wrap" style={{ minHeight: 200 }}>
              <SafeECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Multi-Tenor History */}
        {multiTenorOption && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">2Y / 10Y / 30Y Yield — 252-Day History</div>
            <div className="bonds-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={multiTenorOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Credit Spreads */}
        <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="bonds-panel-title">Credit Spreads</div>
          <div className="bonds-mini-table">
            {spreadData?.IG && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">IG OAS</span>
                <span className="bonds-mini-value" style={{ color: spreadData.IG[spreadData.IG.length - 1] > 150 ? '#f87171' : '#4ade80' }}>
                  {spreadData.IG[spreadData.IG.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
            {spreadData?.HY && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">HY OAS</span>
                <span className="bonds-mini-value" style={{ color: spreadData.HY[spreadData.HY.length - 1] > 400 ? '#f87171' : spreadData.HY[spreadData.HY.length - 1] > 250 ? '#fbbf24' : '#4ade80' }}>
                  {spreadData.HY[spreadData.HY.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
            {spreadData?.EM && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">EM Spread</span>
                <span className="bonds-mini-value" style={{ color: spreadData.EM[spreadData.EM.length - 1] > 400 ? '#f87171' : '#fbbf24' }}>
                  {spreadData.EM[spreadData.EM.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
            {spreadData?.BBB && (
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">BBB Spread</span>
                <span className="bonds-mini-value" style={{ color: spreadData.BBB[spreadData.BBB.length - 1] > 200 ? '#f87171' : '#fbbf24' }}>
                  {spreadData.BBB[spreadData.BBB.length - 1]?.toFixed(0)}bp
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Duration Ladder */}
        <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="bonds-panel-title">Duration Ladder</div>
          <div className="bonds-mini-table">
            {durationLadderData?.slice(0, 6).map((d, i) => (
              <div key={i} className="bonds-mini-row">
                <span className="bonds-mini-name">{d.bucket}</span>
                <span className="bonds-mini-value">${(d.amount / 1000).toFixed(0)}B</span>
                <span className="bonds-mini-duration">{d.pct?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakevens */}
        <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
          <div className="bonds-panel-title">Inflation Breakevens</div>
          <div className="bonds-mini-table">
            {breakevensData && (
              <>
                <div className="bonds-mini-row">
                  <span className="bonds-mini-name">5-Year</span>
                  <span className="bonds-mini-value">{breakevensData.fiveYear?.toFixed(2)}%</span>
                </div>
                <div className="bonds-mini-row">
                  <span className="bonds-mini-name">10-Year</span>
                  <span className="bonds-mini-value">{breakevensData.tenYear?.toFixed(2)}%</span>
                </div>
                <div className="bonds-mini-row">
                  <span className="bonds-mini-name">5Y5Y Forward</span>
                  <span className="bonds-mini-value">{breakevensData.fiveYear5Year?.toFixed(2)}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Credit Ratings */}
        {creditRatingsData?.length > 0 && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Credit Quality</div>
            <div className="bonds-mini-table">
              {creditRatingsData.slice(0, 5).map((c, i) => (
                <div key={i} className="bonds-mini-row">
                  <span className="bonds-mini-name">{c.rating}</span>
                  <span className="bonds-mini-value" style={{ color: c.rating?.startsWith('A') ? '#4ade80' : c.rating?.startsWith('B') ? '#fbbf24' : '#f87171' }}>
                    {c.yield?.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mortgage Spread */}
        {mortgageSpread && (
          <div className="bonds-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="bonds-panel-title">Mortgage Spreads</div>
            <div className="bonds-mini-table">
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">30Y Fixed</span>
                <span className="bonds-mini-value">{mortgageSpread.rate30Y?.toFixed(2)}%</span>
              </div>
              <div className="bonds-mini-row">
                <span className="bonds-mini-name">15Y Fixed</span>
                <span className="bonds-mini-value">{mortgageSpread.rate15Y?.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}