// src/markets/realEstate/components/RealEstateDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './RealEstateDashboard.css';

export default function RealEstateDashboard({
  priceIndexData,
  reitData,
  affordabilityData,
  capRateData,
  mortgageRates,
  caseShillerData,
  supplyData,
  homeownershipRate,
  rentCpi,
  reitEtf,
  treasury10y,
  housingStarts,
  existingHomeSales,
  rentalVacancy,
  medianHomePrice,
}) {
  const { colors } = useTheme();

  // Case-Shiller chart
  const shillerOption = useMemo(() => {
    const shillerData = caseShillerData?.national || caseShillerData;
    if (!shillerData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: shillerData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(shillerData.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: shillerData.values, smooth: true, symbol: 'none', lineStyle: { color: '#60a5fa', width: 2 }, areaStyle: { color: 'rgba(96,165,250,0.1)' } }],
    };
  }, [caseShillerData, colors]);

  // REIT ETF chart
  const reitOption = useMemo(() => {
    if (!reitEtf?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: reitEtf.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(reitEtf.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: reitEtf.values, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 }, areaStyle: { color: 'rgba(20,184,166,0.1)' } }],
    };
  }, [reitEtf, colors]);

  // Shiller latest value
  const shillerLatest = useMemo(() => {
    const shillerValues = caseShillerData?.national?.values || caseShillerData?.values;
    return shillerValues?.[shillerValues.length - 1];
  }, [caseShillerData]);

  return (
    <div className="re-dashboard">
      {/* Left Sidebar */}
      <div className="re-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }}>
        {/* Home Prices */}
        <div className="re-sidebar-section">
          <div className="re-sidebar-title">Home Prices</div>
          {typeof shillerLatest === 'number' && (
            <div className="re-metric-card">
              <div className="re-metric-label">Case-Shiller</div>
              <div className="re-metric-value" style={{ color: '#60a5fa' }}>{shillerLatest.toFixed(1)}</div>
            </div>
          )}
          {typeof medianHomePrice === 'number' && (
            <div className="re-metric-card">
              <div className="re-metric-row">
                <span className="re-metric-name">Median Price</span>
                <span className="re-metric-num">${(medianHomePrice / 1000).toFixed(0)}K</span>
              </div>
            </div>
          )}
        </div>

        {/* Mortgage Rates */}
        {mortgageRates && (
          <div className="re-sidebar-section">
            <div className="re-sidebar-title">Mortgage Rates</div>
            <div className="re-metric-card">
              {typeof mortgageRates.rate30Y === 'number' && (
                <div className="re-metric-row">
                  <span className="re-metric-name">30Y Fixed</span>
                  <span className="re-metric-num" style={{ color: mortgageRates.rate30Y > 7 ? '#f87171' : mortgageRates.rate30Y > 5 ? '#fbbf24' : '#4ade80' }}>
                    {mortgageRates.rate30Y.toFixed(2)}%
                  </span>
                </div>
              )}
              {typeof mortgageRates.rate15Y === 'number' && (
                <div className="re-metric-row">
                  <span className="re-metric-name">15Y Fixed</span>
                  <span className="re-metric-num">{mortgageRates.rate15Y.toFixed(2)}%</span>
                </div>
              )}
              {typeof mortgageRates.rate5YArm === 'number' && (
                <div className="re-metric-row">
                  <span className="re-metric-name">5/1 ARM</span>
                  <span className="re-metric-num">{mortgageRates.rate5YArm.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Housing Activity */}
        <div className="re-sidebar-section">
          <div className="re-sidebar-title">Activity</div>
          <div className="re-metric-card">
            {typeof housingStarts === 'number' && (
              <div className="re-metric-row">
                <span className="re-metric-name">Housing Starts</span>
                <span className="re-metric-num">{(housingStarts / 1000).toFixed(1)}M</span>
              </div>
            )}
            {typeof existingHomeSales === 'number' && (
              <div className="re-metric-row">
                <span className="re-metric-name">Existing Sales</span>
                <span className="re-metric-num">{(existingHomeSales / 1000).toFixed(1)}M</span>
              </div>
            )}
            {typeof homeownershipRate === 'number' && (
              <div className="re-metric-row">
                <span className="re-metric-name">Homeownership</span>
                <span className="re-metric-num">{homeownershipRate.toFixed(1)}%</span>
              </div>
            )}
            {typeof rentalVacancy === 'number' && (
              <div className="re-metric-row">
                <span className="re-metric-name">Rental Vacancy</span>
                <span className="re-metric-num">{rentalVacancy.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - ALL visible at once */}
      <div className="re-main">
        <div className="re-content-grid">
          {/* Case-Shiller Chart */}
          {shillerOption && (
            <div className="re-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="re-panel-title">Case-Shiller Index</div>
              <div className="re-chart-wrap">
                <SafeECharts option={shillerOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* REIT ETF Chart */}
          {reitOption && (
            <div className="re-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="re-panel-title">REIT ETF (VNQ)</div>
              <div className="re-chart-wrap">
                <SafeECharts option={reitOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* REIT Performance */}
          {reitData?.length > 0 && (
            <div className="re-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="re-panel-title">REIT Performance</div>
              <div className="re-mini-table">
                {reitData.slice(0, 8).map((r, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{r.symbol}</span>
                    <span className="re-mini-value" style={{ color: (r.changePct || 0) >= 0 ? '#4ade80' : '#f87171' }}>
                      {(r.changePct || 0) >= 0 ? '+' : ''}{(r.changePct || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cap Rates */}
          {capRateData?.length > 0 && (
            <div className="re-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="re-panel-title">Cap Rates by Sector</div>
              <div className="re-mini-table">
                {capRateData.slice(0, 8).map((c, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{c.sector}</span>
                    <span className="re-mini-value">{c.capRate?.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affordability */}
          {affordabilityData?.length > 0 && (
            <div className="re-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="re-panel-title">Affordability Index</div>
              <div className="re-mini-table">
                {affordabilityData.slice(0, 8).map((a, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{a.region}</span>
                    <span className="re-mini-value" style={{ color: a.index > 100 ? '#4ade80' : a.index > 80 ? '#fbbf24' : '#f87171' }}>
                      {a.index?.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supply/Demand */}
          {supplyData?.length > 0 && (
            <div className="re-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="re-panel-title">Supply & Demand</div>
              <div className="re-mini-table">
                {supplyData.slice(0, 8).map((s, i) => (
                  <div key={i} className="re-mini-row">
                    <span className="re-mini-name">{s.metric}</span>
                    <span className="re-mini-value" style={{ color: s.trend === 'up' ? '#4ade80' : s.trend === 'down' ? '#f87171' : '#fbbf24' }}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}