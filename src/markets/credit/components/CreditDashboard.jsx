// src/markets/credit/components/CreditDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './CreditDashboard.css';

function CreditDashboard({
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

  // Extract key values
  const igSpread = spreadData?.current?.igSpread ?? spreadData?.find?.(s => s.name?.includes('IG'))?.spread;
  const hySpread = spreadData?.current?.hySpread ?? spreadData?.find?.(s => s.name?.includes('HY'))?.spread;
  const emSpread = spreadData?.current?.emSpread ?? emBondData?.countries?.[0]?.spread;
  const defaultRate = defaultData?.rates?.[0]?.value ?? defaultData?.defaultRate;

  // IG/HY Spread chart
  const spreadOption = useMemo(() => {
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

  // EM bond chart
  const emOption = useMemo(() => {
    if (!emBondData?.history?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: emBondData.history.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(emBondData.history.dates.length / 6) } },
      yAxis: { type: 'value', name: 'bps', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: emBondData.history.values, smooth: true, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2 } }],
    };
  }, [emBondData, colors]);

  // Spread summary items
  const spreadSummary = useMemo(() => {
    if (spreadData?.current) {
      return [
        { name: 'IG OAS', spread: spreadData.current.igSpread },
        { name: 'HY OAS', spread: spreadData.current.hySpread },
        { name: 'EM OAS', spread: spreadData.current.emSpread },
        { name: 'BBB OAS', spread: spreadData.current.bbbSpread },
      ].filter(s => s.spread != null);
    }
    return Array.isArray(spreadData) ? spreadData.slice(0, 6) : [];
  }, [spreadData]);

  return (
    <div className="credit-dashboard" role="region" aria-label="Credit Dashboard">
      {/* Left Sidebar */}
      <div className="credit-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }} role="region" aria-label="Credit Metrics">
        {/* Spreads */}
        <div className="credit-sidebar-section">
          <div className="credit-sidebar-title">Credit Spreads</div>
          {typeof igSpread === 'number' && (
            <div className="credit-metric-card">
              <div className="credit-metric-label">IG OAS</div>
              <div className="credit-metric-value" style={{
                color: igSpread > 150 ? '#f87171' : igSpread > 100 ? '#fbbf24' : '#22c55e'
              }}>
                {igSpread.toFixed(0)} bps
              </div>
            </div>
          )}
          {typeof hySpread === 'number' && (
            <div className="credit-metric-card">
              <div className="credit-metric-row">
                <span className="credit-metric-name">HY OAS</span>
                <span className="credit-metric-num" style={{ color: hySpread > 400 ? '#f87171' : hySpread > 250 ? '#fbbf24' : '#22c55e' }}>
                  {hySpread.toFixed(0)} bps
                </span>
              </div>
            </div>
          )}
          {typeof emSpread === 'number' && (
            <div className="credit-metric-card">
              <div className="credit-metric-row">
                <span className="credit-metric-name">EM Spread</span>
                <span className="credit-metric-num" style={{ color: '#a78bfa' }}>{emSpread.toFixed(0)} bps</span>
              </div>
            </div>
          )}
        </div>

        {/* Defaults */}
        <div className="credit-sidebar-section">
          <div className="credit-sidebar-title">Default Watch</div>
          {typeof defaultRate === 'number' && (
            <div className="credit-metric-card">
              <div className="credit-metric-row">
                <span className="credit-metric-name">Default Rate</span>
                <span className="credit-metric-num" style={{ color: defaultRate > 3 ? '#f87171' : '#22c55e' }}>
                  {defaultRate.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
          {delinquencyRates?.[0] && typeof delinquencyRates[0].rate === 'number' && (
            <div className="credit-metric-card">
              <div className="credit-metric-row">
                <span className="credit-metric-name">{delinquencyRates[0].type}</span>
                <span className="credit-metric-num">{delinquencyRates[0].rate.toFixed(2)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Commercial Paper */}
        {commercialPaper?.rate != null && typeof commercialPaper.rate === 'number' && (
          <div className="credit-sidebar-section">
            <div className="credit-sidebar-title">Short-Term</div>
            <div className="credit-metric-card">
              <div className="credit-metric-row">
                <span className="credit-metric-name">CP Rate</span>
                <span className="credit-metric-num" style={{ color: '#14b8a6' }}>
                  {commercialPaper.rate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - ALL visible at once */}
      <div className="credit-main" role="region" aria-label="Credit Charts">
        <div className="credit-content-grid">
          {/* Credit Spreads Chart */}
          {spreadOption && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">Credit Spreads</div>
              <div className="credit-chart-wrap">
                <SafeECharts option={spreadOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Spread Summary */}
          {spreadSummary.length > 0 && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">Spread Summary</div>
              <div className="credit-mini-table" style={{ paddingTop: 8 }}>
                {spreadSummary.map((s) => (
                  <div key={s.name} className="credit-mini-row">
                    <span className="credit-mini-name">{s.name}</span>
                    <span className="credit-mini-value" style={{ color: s.spread > 150 ? '#f87171' : s.spread > 80 ? '#fbbf24' : '#22c55e' }}>
                      {s.spread?.toFixed(0)} bps
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EM Spread History */}
          {emOption && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">EM Spread History</div>
              <div className="credit-chart-wrap">
                <SafeECharts option={emOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* EM Yields */}
          {(emBondData?.countries || emBondData)?.length > 0 && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">EM Yields</div>
              <div className="credit-mini-table" style={{ paddingTop: 8 }}>
                {(emBondData.countries || emBondData).slice(0, 8).map((e) => (
                  <div key={e.country || e.name} className="credit-mini-row">
                    <span className="credit-mini-name">{e.country || e.name}</span>
                    <span className="credit-mini-value">{e.yld10y?.toFixed(2) || e.yield?.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commercial Paper */}
          {commercialPaper?.history?.dates?.length > 0 && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">Commercial Paper</div>
              <div className="credit-mini-table" style={{ paddingTop: 8 }}>
                <div className="credit-mini-row">
                  <span className="credit-mini-name">AA 30-Day</span>
                  <span className="credit-mini-value">{commercialPaper.rate?.toFixed(2)}%</span>
                </div>
                {commercialPaper.volume != null && (
                  <div className="credit-mini-row">
                    <span className="credit-mini-name">Volume</span>
                    <span className="credit-mini-value">${(commercialPaper.volume / 1e9).toFixed(0)}B</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CLO Tranches */}
          {(loanData?.cloTranches || loanData)?.length > 0 && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">CLO Tranches</div>
              <div className="credit-mini-table" style={{ paddingTop: 8 }}>
                {(loanData.cloTranches || loanData).slice(0, 8).map((l) => (
                  <div key={l.tranche || l.sector} className="credit-mini-row">
                    <span className="credit-mini-name">{l.tranche || l.sector}</span>
                    <span className="credit-mini-value">{l.yield?.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Rates */}
          {defaultData?.rates?.length > 0 && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">Default Rates</div>
              <div className="credit-mini-table" style={{ paddingTop: 8 }}>
                {defaultData.rates.slice(0, 8).map((d) => (
                  <div key={d.category} className="credit-mini-row">
                    <span className="credit-mini-name">{d.category}</span>
                    <span className="credit-mini-value" style={{ color: d.value > 3 ? '#f87171' : '#fbbf24' }}>
                      {d.value?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delinquency Rates */}
          {delinquencyRates?.length > 0 && (
            <div className="credit-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="credit-panel-title">Delinquency Rates</div>
              <div className="credit-mini-table" style={{ paddingTop: 8 }}>
                {delinquencyRates.slice(0, 8).map((d) => (
                  <div key={d.type} className="credit-mini-row">
                    <span className="credit-mini-name">{d.type}</span>
                    <span className="credit-mini-value">{d.rate?.toFixed(2)}%</span>
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

export default React.memo(CreditDashboard);