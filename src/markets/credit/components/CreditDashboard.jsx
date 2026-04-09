// src/markets/credit/components/CreditDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './CreditDashboard.css';

export default function CreditDashboard({
  spreadData,
  emBondData,
  loanData,
  defaultData,
  delinquencyRates,
  lendingStandards,
  commercialPaper,
  excessReserves,
}) {
  const { colors } = useTheme();

  // KPI calculations
  const kpis = useMemo(() => {
    const result = [];
    // IG Spread - handle both object and array structures
    const igValue = spreadData?.current?.igSpread || spreadData?.find?.(s => s.name?.includes('IG'))?.spread;
    if (igValue != null) {
      result.push({
        label: 'IG OAS',
        value: `${igValue.toFixed(0)} bps`,
        color: igValue > 150 ? '#ef4444' : igValue > 100 ? '#f59e0b' : '#22c55e',
      });
    }
    // HY Spread
    const hyValue = spreadData?.current?.hySpread || spreadData?.find?.(s => s.name?.includes('HY'))?.spread;
    if (hyValue != null) {
      result.push({
        label: 'HY OAS',
        value: `${hyValue.toFixed(0)} bps`,
        color: hyValue > 400 ? '#ef4444' : hyValue > 250 ? '#f59e0b' : '#22c55e',
      });
    }
    // EM Spread
    const emValue = spreadData?.current?.emSpread || emBondData?.countries?.[0]?.spread || emBondData?.find?.(e => e.spread != null)?.spread;
    if (emValue != null) {
      result.push({
        label: 'EM Spread',
        value: `${emValue.toFixed(0)} bps`,
        color: '#a78bfa',
      });
    }
    // Loan Default Rate
    const defaultRate = defaultData?.rates?.[0]?.value || defaultData?.defaultRate;
    if (defaultRate != null) {
      result.push({
        label: 'Default Rate',
        value: `${defaultRate.toFixed(2)}%`,
        color: defaultRate > 3 ? '#ef4444' : '#22c55e',
      });
    }
    // Commercial Paper
    if (commercialPaper?.rate != null) {
      result.push({
        label: 'CP Rate',
        value: `${commercialPaper.rate.toFixed(2)}%`,
        color: '#14b8a6',
      });
    }
    return result;
  }, [spreadData, emBondData, defaultData, commercialPaper]);

  // IG/HY Spread chart
  const spreadOption = useMemo(() => {
    // Handle both object and array structures
    const history = spreadData?.history;
    const dates = history?.dates || spreadData?.[0]?.history?.dates;
    const igValues = history?.IG || spreadData?.find?.(s => s.name?.includes('IG'))?.history?.values;
    const hyValues = history?.HY || spreadData?.find?.(s => s.name?.includes('HY'))?.history?.values;

    if (!dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['IG OAS', 'HY OAS'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 6) } },
      yAxis: { type: 'value', name: 'bps', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'IG OAS', type: 'line', data: igValues || [], smooth: true, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2 } },
        { name: 'HY OAS', type: 'line', data: hyValues || [], smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 } },
      ],
    };
  }, [spreadData, colors]);

  // Spread summary items - handle both object and array structures
  const spreadSummary = useMemo(() => {
    if (spreadData?.current) {
      // Object structure: { current: { igSpread, hySpread, emSpread, bbbSpread } }
      return [
        { name: 'IG OAS', spread: spreadData.current.igSpread },
        { name: 'HY OAS', spread: spreadData.current.hySpread },
        { name: 'EM OAS', spread: spreadData.current.emSpread },
        { name: 'BBB OAS', spread: spreadData.current.bbbSpread },
      ].filter(s => s.spread != null);
    }
    // Array structure: [{ name, spread }]
    return Array.isArray(spreadData) ? spreadData.slice(0, 6) : [];
  }, [spreadData]);

  return (
    <div className="credit-dashboard">
      {/* KPI Strip */}
      <div className="credit-kpi-strip">
        {kpis.map((kpi, i) => (
          <div key={i} className="credit-kpi-pill" style={{ background: colors.bgCard }}>
            <span className="credit-kpi-label">{kpi.label}</span>
            <span className="credit-kpi-value" style={{ color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Chart Grid */}
      <div className="credit-chart-grid">
        {/* IG/HY Spreads */}
        {spreadOption && (
          <div className="credit-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="credit-panel-title">Credit Spreads</div>
            <div className="credit-chart-wrap" style={{ minHeight: 180 }}>
              <SafeECharts option={spreadOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}

        {/* Spread Summary */}
        {spreadSummary.length > 0 && (
          <div className="credit-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="credit-panel-title">Spread Summary</div>
            <div className="credit-mini-table">
              {spreadSummary.map((s, i) => (
                <div key={i} className="credit-mini-row">
                  <span className="credit-mini-name">{s.name}</span>
                  <span className="credit-mini-value" style={{ color: s.spread > 150 ? '#ef4444' : s.spread > 80 ? '#f59e0b' : '#22c55e' }}>
                    {s.spread?.toFixed(0)} bps
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EM Bonds */}
        {(emBondData?.countries || emBondData)?.length > 0 && (
          <div className="credit-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="credit-panel-title">EM Bonds</div>
            <div className="credit-mini-table">
              {(emBondData.countries || emBondData).slice(0, 6).map((e, i) => (
                <div key={i} className="credit-mini-row">
                  <span className="credit-mini-name">{e.country || e.name}</span>
                  <span className="credit-mini-value">{e.yld10y?.toFixed(2) || e.yield?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loan Market */}
        {(loanData?.cloTranches || loanData)?.length > 0 && (
          <div className="credit-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="credit-panel-title">CLO Tranches</div>
            <div className="credit-mini-table">
              {(loanData.cloTranches || loanData).slice(0, 6).map((l, i) => (
                <div key={i} className="credit-mini-row">
                  <span className="credit-mini-name">{l.tranche || l.sector}</span>
                  <span className="credit-mini-value">{l.yield?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Default Watch */}
        {defaultData?.rates?.length > 0 && (
          <div className="credit-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="credit-panel-title">Default Rates</div>
            <div className="credit-mini-table">
              {defaultData.rates.slice(0, 6).map((d, i) => (
                <div key={i} className="credit-mini-row">
                  <span className="credit-mini-name">{d.category}</span>
                  <span className="credit-mini-value" style={{ color: d.value > 3 ? '#ef4444' : '#f59e0b' }}>
                    {d.value?.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delinquency Rates */}
        {delinquencyRates?.length > 0 && (
          <div className="credit-panel-card" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
            <div className="credit-panel-title">Delinquency Rates</div>
            <div className="credit-mini-table">
              {delinquencyRates.slice(0, 6).map((d, i) => (
                <div key={i} className="credit-mini-row">
                  <span className="credit-mini-name">{d.type}</span>
                  <span className="credit-mini-value">{d.rate?.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}