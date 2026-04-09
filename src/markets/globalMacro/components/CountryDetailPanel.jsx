// src/markets/globalMacro/components/CountryDetailPanel.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import './CountryDetailPanel.css';

/**
 * CountryDetailPanel - Sidebar showing detailed country metrics
 * Slides in from right when a country is clicked
 */
export default function CountryDetailPanel({ country, onClose, centralBankData, oecdCli, scorecardData }) {
  const { colors } = useTheme();

  // Find matching data from other sources
  const rateInfo = useMemo(() => {
    if (!centralBankData?.current) return null;
    return centralBankData.current.find(c => c.code === country?.code);
  }, [centralBankData, country]);

  const rateHistory = useMemo(() => {
    if (!centralBankData?.history || !country) return null;
    const series = centralBankData.history.series.find(s => s.code === country.code);
    if (!series) return null;
    return {
      dates: centralBankData.history.dates,
      values: series.values,
    };
  }, [centralBankData, country]);

  const cliInfo = useMemo(() => {
    if (!oecdCli?.countries) return null;
    return oecdCli.countries.find(c => c.code === country?.code);
  }, [oecdCli, country]);

  // Rank among peers
  const rankings = useMemo(() => {
    if (!scorecardData || !country) return {};
    const byGdp = [...scorecardData].sort((a, b) => (b.gdp ?? -999) - (a.gdp ?? -999));
    const byCpi = [...scorecardData].sort((a, b) => (a.cpi ?? 999) - (b.cpi ?? 999));
    const byDebt = [...scorecardData].sort((a, b) => (b.debt ?? -999) - (a.debt ?? -999));

    return {
      gdp: byGdp.findIndex(c => c.code === country.code) + 1,
      cpi: byCpi.findIndex(c => c.code === country.code) + 1,
      debt: byDebt.findIndex(c => c.code === country.code) + 1,
      total: scorecardData.length,
    };
  }, [scorecardData, country]);

  if (!country) return null;

  // Heat color helpers
  const gdpColor = (v) => v > 3 ? '#4ade80' : v > 1 ? '#fbbf24' : '#f87171';
  const cpiColor = (v) => v < 2 ? '#4ade80' : v < 4 ? '#fbbf24' : '#f87171';
  const rateColor = (v) => v < 3 ? '#4ade80' : v < 6 ? '#fbbf24' : '#f87171';
  const debtColor = (v) => v < 60 ? '#4ade80' : v < 90 ? '#fbbf24' : '#f87171';
  const unempColor = (v) => v < 4 ? '#4ade80' : v < 6 ? '#fbbf24' : '#f87171';

  return (
    <div className="mac-detail-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
      {/* Header */}
      <div className="mac-detail-header" style={{ borderBottom: `1px solid ${colors.borderColor}` }}>
        <div className="mac-detail-country">
          <span className="mac-detail-flag">{country.flag}</span>
          <div className="mac-detail-name">
            <div className="mac-detail-country-name" style={{ color: colors.textPrimary }}>{country.name}</div>
            <div className="mac-detail-region" style={{ color: colors.textSecondary }}>{country.region}</div>
          </div>
        </div>
        <button className="mac-detail-close" onClick={onClose} style={{ color: colors.textSecondary }}>
          ×
        </button>
      </div>

      {/* Core Metrics Grid */}
      <div className="mac-detail-section">
        <div className="mac-detail-section-title" style={{ color: colors.textMuted }}>Core Metrics</div>
        <div className="mac-detail-metrics">
          <div className="mac-metric-row">
            <span className="mac-metric-label">GDP Growth</span>
            <span className="mac-metric-value" style={{ color: gdpColor(country.gdp) }}>
              {country.gdp?.toFixed(1)}%
              <span className="mac-metric-rank">#{rankings.gdp}/{rankings.total}</span>
            </span>
          </div>
          <div className="mac-metric-row">
            <span className="mac-metric-label">CPI Inflation</span>
            <span className="mac-metric-value" style={{ color: cpiColor(country.cpi) }}>
              {country.cpi?.toFixed(1)}%
              <span className="mac-metric-rank">#{rankings.cpi}/{rankings.total}</span>
            </span>
          </div>
          <div className="mac-metric-row">
            <span className="mac-metric-label">Policy Rate</span>
            <span className="mac-metric-value" style={{ color: rateColor(country.rate) }}>
              {country.rate?.toFixed(2)}%
              {rateInfo?.bank && <span className="mac-metric-bank">{rateInfo.bank}</span>}
            </span>
          </div>
          <div className="mac-metric-row">
            <span className="mac-metric-label">Unemployment</span>
            <span className="mac-metric-value" style={{ color: unempColor(country.unemp) }}>
              {country.unemp?.toFixed(1)}%
            </span>
          </div>
          <div className="mac-metric-row">
            <span className="mac-metric-label">Debt / GDP</span>
            <span className="mac-metric-value" style={{ color: debtColor(country.debt) }}>
              {country.debt?.toFixed(1)}%
              <span className="mac-metric-rank">#{rankings.debt}/{rankings.total}</span>
            </span>
          </div>
        </div>
      </div>

      {/* OECD CLI */}
      {cliInfo && (
        <div className="mac-detail-section">
          <div className="mac-detail-section-title" style={{ color: colors.textMuted }}>OECD Leading Indicator</div>
          <div className="mac-cli-card" style={{ background: colors.bgPrimary }}>
            <div className="mac-cli-value" style={{ color: cliInfo.cli > 100 ? '#4ade80' : '#f87171' }}>
              {cliInfo.cli?.toFixed(1)}
            </div>
            <div className="mac-cli-label" style={{ color: colors.textSecondary }}>
              {cliInfo.cli > 100 ? 'Above trend' : 'Below trend'}
            </div>
            <div className="mac-cli-trend" style={{
              color: cliInfo.trend === 'improving' ? '#4ade80' : cliInfo.trend === 'slowing' ? '#f87171' : '#fbbf24'
            }}>
              {cliInfo.trend === 'improving' ? '↗' : cliInfo.trend === 'slowing' ? '↘' : '→'} {cliInfo.trend}
            </div>
          </div>
        </div>
      )}

      {/* Rate History Sparkline */}
      {rateHistory && (
        <div className="mac-detail-section">
          <div className="mac-detail-section-title" style={{ color: colors.textMuted }}>Rate History (5Y)</div>
          <div className="mac-sparkline">
            <svg viewBox="0 0 60 20" style={{ width: '100%', height: 40 }}>
              <polyline
                fill="none"
                stroke={colors.accentColor || '#14b8a6'}
                strokeWidth="1.5"
                points={rateHistory.values
                  .map((v, i) => {
                    if (v == null) return null;
                    const x = (i / (rateHistory.values.length - 1)) * 60;
                    // Normalize rate to 0-20 range (assume rates 0-15%)
                    const y = 20 - (v / 15) * 20;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            </svg>
            <div className="mac-sparkline-labels" style={{ color: colors.textMuted }}>
              <span>{rateHistory.dates[0]}</span>
              <span>{rateHistory.dates[rateHistory.dates.length - 1]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="mac-detail-section">
        <div className="mac-detail-section-title" style={{ color: colors.textMuted }}>Context</div>
        <div className="mac-context-notes" style={{ color: colors.textSecondary }}>
          {country.region === 'G7' && 'G7 advanced economy with developed markets'}
          {country.region === 'Advanced' && 'Advanced economy outside G7'}
          {country.region === 'EM' && 'Emerging market with higher growth potential'}
        </div>
      </div>
    </div>
  );
}