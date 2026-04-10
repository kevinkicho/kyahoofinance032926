// src/markets/commodities/components/CommoditiesDashboard.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import './CommoditiesDashboard.css';

function CommoditiesDashboard({
  priceDashboardData,
  futuresCurveData,
  sectorHeatmapData,
  supplyDemandData,
  cotData,
  fredCommodities,
  goldFuturesCurve,
  dbcEtf,
  goldOilRatio,
  contangoIndicator,
  commodityCurrencies,
  seasonalPatterns,
}) {
  const { colors } = useTheme();

  // Extract key commodity data
  const allCommodities = useMemo(() => {
    return (priceDashboardData || []).flatMap(s => s.commodities || []);
  }, [priceDashboardData]);

  const gold = useMemo(() => allCommodities.find(c => c.ticker === 'GC=F' || c.name?.includes('Gold')), [allCommodities]);
  const oil = useMemo(() => allCommodities.find(c => c.ticker === 'CL=F' || c.name?.includes('Crude')), [allCommodities]);
  const natGas = useMemo(() => allCommodities.find(c => c.ticker === 'NG=F' || c.name?.includes('Natural Gas')), [allCommodities]);

  // Gold chart
  const goldOption = useMemo(() => {
    const goldData = fredCommodities?.gold || fredCommodities?.goldHistory;
    if (!goldData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: goldData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(goldData.dates.length / 6) } },
      yAxis: { type: 'value', name: '$/oz', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: goldData.values, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 } }],
    };
  }, [fredCommodities, colors]);

  // Oil chart
  const oilOption = useMemo(() => {
    const oilData = fredCommodities?.oil || fredCommodities?.wtiHistory;
    if (!oilData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: oilData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(oilData.dates.length / 6) } },
      yAxis: { type: 'value', name: '$/bbl', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: oilData.values, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 } }],
    };
  }, [fredCommodities, colors]);

  // Natural gas chart
  const natGasOption = useMemo(() => {
    const ngData = fredCommodities?.natGas || fredCommodities?.natGasHistory;
    if (!ngData?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: ngData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(ngData.dates.length / 6) } },
      yAxis: { type: 'value', name: '$/MMBtu', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: ngData.values, smooth: true, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2 } }],
    };
  }, [fredCommodities, colors]);

  return (
    <div className="com-dashboard" role="region" aria-label="Commodities Dashboard">
      {/* Left Sidebar */}
      <div className="com-sidebar" style={{ background: colors.bgPrimary, borderColor: colors.borderColor }} role="region" aria-label="Commodities Metrics">
        {/* Key Prices */}
        <div className="com-sidebar-section">
          <div className="com-sidebar-title">Key Prices</div>
          {gold && typeof gold.price === 'number' && (
            <div className="com-metric-card">
              <div className="com-metric-label">Gold</div>
              <div className="com-metric-value" style={{ color: '#f59e0b' }}>${gold.price.toFixed(0)}</div>
              {typeof gold.change1d === 'number' && (
                <div className="com-metric-row">
                  <span className="com-metric-name">1D</span>
                  <span className="com-metric-num" style={{ color: gold.change1d >= 0 ? '#22c55e' : '#f87171' }}>
                    {gold.change1d >= 0 ? '+' : ''}{gold.change1d.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
          {oil && typeof oil.price === 'number' && (
            <div className="com-metric-card">
              <div className="com-metric-label">WTI Oil</div>
              <div className="com-metric-value" style={{ color: '#14b8a6' }}>${oil.price.toFixed(2)}</div>
              {typeof oil.change1d === 'number' && (
                <div className="com-metric-row">
                  <span className="com-metric-name">1D</span>
                  <span className="com-metric-num" style={{ color: oil.change1d >= 0 ? '#22c55e' : '#f87171' }}>
                    {oil.change1d >= 0 ? '+' : ''}{oil.change1d.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
          {natGas && typeof natGas.price === 'number' && (
            <div className="com-metric-card">
              <div className="com-metric-label">Nat Gas</div>
              <div className="com-metric-value" style={{ color: '#a78bfa' }}>${natGas.price.toFixed(2)}</div>
              {typeof natGas.change1d === 'number' && (
                <div className="com-metric-row">
                  <span className="com-metric-name">1D</span>
                  <span className="com-metric-num" style={{ color: natGas.change1d >= 0 ? '#22c55e' : '#f87171' }}>
                    {natGas.change1d >= 0 ? '+' : ''}{natGas.change1d.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ratios & ETFs */}
        <div className="com-sidebar-section">
          <div className="com-sidebar-title">Ratios & ETFs</div>
          {typeof goldOilRatio === 'number' && (
            <div className="com-metric-card">
              <div className="com-metric-row">
                <span className="com-metric-name">Gold/Oil</span>
                <span className="com-metric-num" style={{ color: '#60a5fa' }}>{goldOilRatio.toFixed(1)}</span>
              </div>
            </div>
          )}
          {dbcEtf && typeof dbcEtf.changePct === 'number' && (
            <div className="com-metric-card">
              <div className="com-metric-row">
                <span className="com-metric-name">DBC ETF</span>
                <span className="com-metric-num" style={{ color: dbcEtf.changePct >= 0 ? '#22c55e' : '#f87171' }}>
                  {dbcEtf.changePct >= 0 ? '+' : ''}{dbcEtf.changePct.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
          {typeof contangoIndicator === 'number' && (
            <div className="com-metric-card">
              <div className="com-metric-row">
                <span className="com-metric-name">Contango</span>
                <span className="com-metric-num" style={{ color: contangoIndicator > 0 ? '#f87171' : '#22c55e' }}>
                  {contangoIndicator > 0 ? '+' : ''}{contangoIndicator.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* COT */}
        {cotData?.length > 0 && (
          <div className="com-sidebar-section">
            <div className="com-sidebar-title">Positioning</div>
            <div className="com-metric-card">
              {cotData.slice(0, 4).map((c) => (
                <div key={c.commodity || c.ticker || `cot-${c}`} className="com-metric-row">
                  <span className="com-metric-name">{c.commodity}</span>
                  <span className="com-metric-num" style={{ color: (c.netLong || 0) > 0 ? '#22c55e' : '#f87171' }}>
                    {(c.netLong || 0) > 0 ? 'Long' : 'Short'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content - ALL visible at once */}
      <div className="com-main">
        <div className="com-content-grid">
          {/* Energy Prices */}
          {allCommodities.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Energy</div>
              <div className="com-mini-table">
                {allCommodities.filter(c => c.sector === 'Energy' || c.ticker?.includes('CL') || c.ticker?.includes('NG') || c.ticker?.includes('RB')).slice(0, 6).map((c) => (
                  <div key={c.ticker || c.name} className="com-mini-row">
                    <span className="com-mini-name">{c.name || c.ticker}</span>
                    <span className="com-mini-price">${c.price?.toFixed(2)}</span>
                    <span className="com-mini-change" style={{ color: (c.change1d || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                      {(c.change1d || 0) >= 0 ? '+' : ''}{(c.change1d || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metals Prices */}
          {allCommodities.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Metals</div>
              <div className="com-mini-table">
                {allCommodities.filter(c => c.sector === 'Metals' || c.ticker?.includes('GC') || c.ticker?.includes('SI') || c.ticker?.includes('HG')).slice(0, 6).map((c) => (
                  <div key={c.ticker || c.name} className="com-mini-row">
                    <span className="com-mini-name">{c.name || c.ticker}</span>
                    <span className="com-mini-price">${c.price?.toFixed(2)}</span>
                    <span className="com-mini-change" style={{ color: (c.change1d || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                      {(c.change1d || 0) >= 0 ? '+' : ''}{(c.change1d || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gold Chart */}
          {goldOption && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Gold Price</div>
              <div className="com-chart-wrap">
                <SafeECharts option={goldOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Oil Chart */}
          {oilOption && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">WTI Oil Price</div>
              <div className="com-chart-wrap">
                <SafeECharts option={oilOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Natural Gas Chart */}
          {natGasOption && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Natural Gas</div>
              <div className="com-chart-wrap">
                <SafeECharts option={natGasOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Agriculture */}
          {allCommodities.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Agriculture</div>
              <div className="com-mini-table">
                {allCommodities.filter(c => c.sector === 'Agriculture' || c.ticker?.includes('ZC') || c.ticker?.includes('ZS') || c.ticker?.includes('ZW')).slice(0, 6).map((c) => (
                  <div key={c.ticker || c.name} className="com-mini-row">
                    <span className="com-mini-name">{c.name || c.ticker}</span>
                    <span className="com-mini-price">${c.price?.toFixed(2)}</span>
                    <span className="com-mini-change" style={{ color: (c.change1d || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                      {(c.change1d || 0) >= 0 ? '+' : ''}{(c.change1d || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sector Performance */}
          {sectorHeatmapData?.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Sector Performance</div>
              <div className="com-mini-table">
                {sectorHeatmapData.slice(0, 6).map((s) => (
                  <div key={s.sector || s.name} className="com-mini-row">
                    <span className="com-mini-name">{s.sector || s.name}</span>
                    <span className="com-mini-value" style={{ color: (s.d1 || s.changePct || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                      {(s.d1 || s.changePct || 0) >= 0 ? '+' : ''}{(s.d1 || s.changePct || 0).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COT Positioning */}
          {cotData?.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">COT Positioning</div>
              <div className="com-mini-table" style={{ paddingTop: 8 }}>
                {cotData.slice(0, 8).map((c) => (
                  <div key={c.commodity || c.ticker || `cot-${c}`} className="com-mini-row">
                    <span className="com-mini-name">{c.commodity}</span>
                    <span className="com-mini-value" style={{ color: (c.netLong || 0) > 0 ? '#22c55e' : '#f87171' }}>
                      {(c.netLong || 0) > 0 ? 'Long' : 'Short'} {Math.abs(c.netLong || 0).toFixed(0)}K
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supply/Demand */}
          {supplyDemandData?.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Supply/Demand</div>
              <div className="com-mini-table" style={{ paddingTop: 8 }}>
                {supplyDemandData.slice(0, 8).map((s) => (
                  <div key={s.commodity} className="com-mini-row">
                    <span className="com-mini-name">{s.commodity}</span>
                    <span className="com-mini-value" style={{ color: s.balance > 0 ? '#22c55e' : '#f87171' }}>
                      {s.balance > 0 ? 'Surplus' : 'Deficit'} {Math.abs(s.balance).toFixed(1)}Mbbl
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Commodity Currencies */}
          {commodityCurrencies?.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Commodity FX</div>
              <div className="com-mini-table" style={{ paddingTop: 8 }}>
                {commodityCurrencies.slice(0, 6).map((c) => (
                  <div key={c.pair || c.code} className="com-mini-row">
                    <span className="com-mini-name">{c.pair}</span>
                    <span className="com-mini-value" style={{ color: (c.change || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                      {c.rate?.toFixed(4)} ({(c.change || 0) >= 0 ? '+' : ''}{(c.change || 0).toFixed(2)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gold Futures Curve */}
          {goldFuturesCurve?.expiries?.length > 0 && (
            <div className="com-panel" style={{ background: colors.bgCard, borderColor: colors.borderColor }}>
              <div className="com-panel-title">Gold Futures Curve</div>
              <div className="com-mini-table" style={{ paddingTop: 8 }}>
                {goldFuturesCurve.expiries.slice(0, 8).map((e) => (
                  <div key={e.month || e.expiry} className="com-mini-row">
                    <span className="com-mini-name">{e.month}</span>
                    <span className="com-mini-value">${e.price?.toFixed(2)}</span>
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

export default React.memo(CommoditiesDashboard);