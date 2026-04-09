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

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    // Case-Shiller Index (nested structure: caseShillerData.national.values)
    const shillerValues = caseShillerData?.national?.values || caseShillerData?.values;
    if (shillerValues?.length) {
      const latest = shillerValues[shillerValues.length - 1];
      result.push({
        label: 'Case-Shiller',
        value: latest.toFixed(1),
        color: '#60a5fa',
      });
    }
    // 30Y Mortgage Rate
    if (mortgageRates?.rate30Y != null) {
      result.push({
        label: '30Y Mortgage',
        value: `${mortgageRates.rate30Y.toFixed(2)}%`,
        color: mortgageRates.rate30Y > 7 ? '#ef4444' : mortgageRates.rate30Y > 5 ? '#f59e0b' : '#22c55e',
      });
    }
    // Homeownership Rate
    if (homeownershipRate != null) {
      result.push({
        label: 'Homeownership',
        value: `${homeownershipRate.toFixed(1)}%`,
        color: '#a78bfa',
      });
    }
    // Median Home Price
    if (medianHomePrice != null) {
      result.push({
        label: 'Median Price',
        value: `$${(medianHomePrice / 1000).toFixed(0)}K`,
        color: '#14b8a6',
      });
    }
    // Housing Starts
    if (housingStarts != null) {
      result.push({
        label: 'Housing Starts',
        value: `${(housingStarts / 1000).toFixed(1)}M`,
        color: '#f59e0b',
      });
    }
    return result;
  }, [caseShillerData, mortgageRates, homeownershipRate, medianHomePrice, housingStarts]);

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
      series: [{ type: 'line', data: shillerData.values, smooth: true, symbol: 'none', lineStyle: { color: '#60a5fa', width: 2 }, areaStyle: { color: '#60a5fa', opacity: 0.1 } }],
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
      series: [{ type: 'line', data: reitEtf.values, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 } }],
    };
  }, [reitEtf, colors]);

  return (
    <div className="re-dashboard">
      {/* KPI Strip */}
      <div className="re-kpi-strip">
        {kpis.map((kpi, i) => (
          <div key={i} className="re-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="re-kpi-label">{kpi.label}</span>
            <span className="re-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="re-chart-grid">
        {/* Case-Shiller */}
        {shillerOption && (
          <div className="re-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="re-panel-title">Case-Shiller Home Price Index</div>
            <div className="re-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={shillerOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* REIT ETF */}
        {reitOption && (
          <div className="re-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="re-panel-title">REIT ETF (VNQ)</div>
            <div className="re-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={reitOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Mortgage Rates */}
        {mortgageRates && (
          <div className="re-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="re-panel-title">Mortgage Rates</div>
            <div className="re-mini-table">
              <div className="re-mini-row">
                <span className="re-mini-name">30Y Fixed</span>
                <span className="re-mini-value">{mortgageRates.rate30Y?.toFixed(2)}%</span>
              </div>
              <div className="re-mini-row">
                <span className="re-mini-name">15Y Fixed</span>
                <span className="re-mini-value">{mortgageRates.rate15Y?.toFixed(2)}%</span>
              </div>
              <div className="re-mini-row">
                <span className="re-mini-name">5/1 ARM</span>
                <span className="re-mini-value">{mortgageRates.rate5YArm?.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Housing Activity */}
        {(housingStarts || existingHomeSales || homeownershipRate || rentalVacancy) && (
          <div className="re-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="re-panel-title">Housing Activity</div>
            <div className="re-mini-table">
              {housingStarts != null && (
                <div className="re-mini-row">
                  <span className="re-mini-name">Housing Starts</span>
                  <span className="re-mini-value">{(housingStarts / 1000).toFixed(1)}M</span>
                </div>
              )}
              {existingHomeSales != null && (
                <div className="re-mini-row">
                  <span className="re-mini-name">Existing Sales</span>
                  <span className="re-mini-value">{(existingHomeSales / 1000).toFixed(1)}M</span>
                </div>
              )}
              {homeownershipRate != null && (
                <div className="re-mini-row">
                  <span className="re-mini-name">Homeownership</span>
                  <span className="re-mini-value">{homeownershipRate.toFixed(1)}%</span>
                </div>
              )}
              {rentalVacancy != null && (
                <div className="re-mini-row">
                  <span className="re-mini-name">Rental Vacancy</span>
                  <span className="re-mini-value">{rentalVacancy.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REIT Summary */}
        {reitData?.length > 0 && (
          <div className="re-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="re-panel-title">REIT Performance</div>
            <div className="re-mini-table">
              {reitData.slice(0, 6).map((r, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{r.symbol}</span>
                  <span className="re-mini-value" style={{ color: (r.changePct || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {(r.changePct || 0) >= 0 ? '+' : ''}{(r.changePct || 0).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cap Rates */}
        {capRateData?.length > 0 && (
          <div className="re-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="re-panel-title">Cap Rates by Sector</div>
            <div className="re-mini-table">
              {capRateData.slice(0, 6).map((c, i) => (
                <div key={i} className="re-mini-row">
                  <span className="re-mini-name">{c.sector}</span>
                  <span className="re-mini-value">{c.capRate?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}