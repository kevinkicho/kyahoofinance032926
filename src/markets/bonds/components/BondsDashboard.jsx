import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import BentoWrapper from '../../../components/BentoWrapper';
import YieldCurve from './YieldCurve';
import SpreadMonitor from './SpreadMonitor';
import DurationLadder from './DurationLadder';
import CreditMatrix from './CreditMatrix';
import BreakevenMonitor from './BreakevenMonitor';
import SafeECharts from '../../../components/SafeECharts';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './BondsDashboard.css';

const stopDrag = (e) => e.stopPropagation();

function BondsDashboard({
  yieldCurveData, creditRatingsData, creditRatingsAsOf, spreadIndicators, spreadData, durationLadderData, durationLadderMeta,
  breakevensData, fredYieldHistory, treasuryRates, fedFundsFutures, yieldHistory,
  mortgageSpread, tipsYields, realYieldHistory, macroData, fedBalanceSheetHistory,
  m2HistoryData, auctionData, nationalDebt, spreadHistory, cpiComponents, debtToGdpHistory,
  isLive, lastUpdated, fetchLog, provenance,
}) {
  const { colors } = useTheme();

  const layout = {
    lg: [
      { i: 'yield',   x: 0, y: 0, w: 8, h: 4 },
      { i: 'metrics', x: 8, y: 0, w: 4, h: 4 },
      { i: 'credit',  x: 0, y: 4, w: 4, h: 3 },
      { i: 'realYield', x: 4, y: 4, w: 4, h: 3 },
      { i: 'ratings', x: 8, y: 4, w: 4, h: 3 },
      { i: 'curvespreads', x: 0, y: 7, w: 4, h: 3 },
      { i: 'fed',     x: 4, y: 7, w: 4, h: 3 },
      { i: 'm2',      x: 8, y: 7, w: 4, h: 3 },
      { i: 'cpi',     x: 0, y: 10, w: 4, h: 3 },
      { i: 'debtgdp', x: 4, y: 10, w: 4, h: 3 },
      { i: 'breakevens', x: 8, y: 10, w: 4, h: 3 },
      { i: 'duration', x: 0, y: 13, w: 6, h: 4 },
      { i: 'macro',   x: 6, y: 13, w: 6, h: 4 },
    ]
  };

  // Spread History chart
  const spreadHistoryOption = useMemo(() => {
    if (!spreadHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['2s10s', '10s3s', '5s30s'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: spreadHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(spreadHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '2s10s', type: 'line', data: spreadHistory.t10y2y, symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
        { name: '10s3s', type: 'line', data: spreadHistory.t10y3m, symbol: 'none', smooth: true, lineStyle: { color: '#f59e0b', width: 1.5 } },
        { name: '5s30s', type: 'line', data: spreadHistory.t5y30y, symbol: 'none', smooth: true, lineStyle: { color: '#10b981', width: 1.5 } },
      ],
    };
  }, [spreadHistory, colors]);

  // Real Yields chart
  const realYieldOption = useMemo(() => {
    if (!realYieldHistory?.dates?.length) return null;
    const d = realYieldHistory.dates;
    const step = Math.max(1, Math.floor(d.length / 50));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const subsample = (arr) => arr ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1) : [];
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['5Y TIPS', '10Y TIPS'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '5Y TIPS', type: 'line', data: subsample(realYieldHistory.d5y), symbol: 'none', smooth: true, lineStyle: { color: '#22d3ee', width: 1.5 } },
        { name: '10Y TIPS', type: 'line', data: subsample(realYieldHistory.d10y), symbol: 'none', smooth: true, lineStyle: { color: '#a78bfa', width: 1.5 } },
      ],
    };
  }, [realYieldHistory, colors]);

  // Fed Balance Sheet chart
  const fedBalanceOption = useMemo(() => {
    if (!fedBalanceSheetHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: fedBalanceSheetHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fedBalanceSheetHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '${value}T' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fedBalanceSheetHistory.values, areaStyle: { color: 'rgba(167,139,250,0.1)' }, lineStyle: { color: '#a78bfa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [fedBalanceSheetHistory, colors]);

  // M2 chart
  const m2Option = useMemo(() => {
    if (!m2HistoryData?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: m2HistoryData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(m2HistoryData.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '${value}T' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: m2HistoryData.values, areaStyle: { color: 'rgba(96,165,250,0.1)' }, lineStyle: { color: '#60a5fa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [m2HistoryData, colors]);

  // CPI chart
  const cpiOption = useMemo(() => {
    if (!cpiComponents?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['All', 'Core', 'Food', 'Energy'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: cpiComponents.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(cpiComponents.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'All', type: 'line', data: cpiComponents.all, symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
        { name: 'Core', type: 'line', data: cpiComponents.core, symbol: 'none', smooth: true, lineStyle: { color: '#a78bfa', width: 1.5 } },
        { name: 'Food', type: 'line', data: cpiComponents.food, symbol: 'none', smooth: true, lineStyle: { color: '#22c55e', width: 1.5 } },
        { name: 'Energy', type: 'line', data: cpiComponents.energy, symbol: 'none', smooth: true, lineStyle: { color: '#f59e0b', width: 1.5 } },
      ],
    };
  }, [cpiComponents, colors]);

  // Debt-to-GDP chart
  const debtToGdpOption = useMemo(() => {
    if (!debtToGdpHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: debtToGdpHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(debtToGdpHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: debtToGdpHistory.values, areaStyle: { color: 'rgba(239,68,68,0.1)' }, lineStyle: { color: '#ef4444', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [debtToGdpHistory, colors]);

  // Key metrics sidebar data
  const us10y = yieldCurveData?.US?.['10y'];
  const countryCount = yieldCurveData ? Object.keys(yieldCurveData).length : 0;
  const steepest = useMemo(() => {
    if (!yieldCurveData) return null;
    let best = null, bestSpread = -Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve?.['30y'], s3m = curve?.['3m'];
      if (s30 != null && s3m != null) { const spread = s30 - s3m; if (spread > bestSpread) { bestSpread = spread; best = cc; } }
    }
    return best ? { country: best, spread: bestSpread } : null;
  }, [yieldCurveData]);

  return (
    <div className="bonds-dashboard bonds-dashboard--bento">
      <BentoWrapper layout={layout} storageKey="bonds-layout">
        {/* Yield Curve */}
        <div key="yield" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Yield Curve</span>
            <span className="bonds-panel-subtitle">{countryCount} countries · sovereign benchmark rates</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {yieldCurveData && <YieldCurve yieldCurveData={yieldCurveData} spreadIndicators={spreadIndicators} fredYieldHistory={fredYieldHistory} yieldHistory={yieldHistory} lastUpdated={lastUpdated} />}
          </div>
          <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={Object.keys(yieldCurveData).some(k => yieldCurveData[k] && Object.values(yieldCurveData[k]).some(v => v != null))} fetchLog={fetchLog} />
        </div>

        {/* Key Metrics */}
        <div key="metrics" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Key Metrics</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <div className="bonds-sidebar-section">
              <div className="bonds-sidebar-title">Yields</div>
              <div className="bonds-metric-card">
                <div className="bonds-metric-label">US 10Y</div>
                <div className="bonds-metric-value accent"><MetricValue value={us10y} format={v => `${v.toFixed(2)}%`} seriesKey="10y" timestamp={lastUpdated} /></div>
              </div>
              <div className="bonds-metric-card">
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">10Y−2Y</span>
                  <span className={`bonds-metric-num ${spreadIndicators?.t10y2y >= 0 ? 'positive' : 'negative'}`}>
                    <MetricValue value={spreadIndicators?.t10y2y} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y2y" timestamp={lastUpdated} />
                  </span>
                </div>
                <div className="bonds-metric-row">
                  <span className="bonds-metric-name">10Y−3M</span>
                  <span className={`bonds-metric-num ${spreadIndicators?.t10y3m >= 0 ? 'positive' : 'negative'}`}>
                    <MetricValue value={spreadIndicators?.t10y3m} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y3m" timestamp={lastUpdated} />
                  </span>
                </div>
              </div>
              {steepest && (
                <div className="bonds-metric-card">
                  <div className="bonds-metric-label">Steepest Curve</div>
                  <div className="bonds-metric-value info">{steepest.country} <span style={{ fontSize: 12 }}>(<MetricValue value={steepest.spread} seriesKey="sovereignMaxSpread" timestamp={lastUpdated} format={v => v.toFixed(0)} />bp)</span></div>
                </div>
              )}
            </div>
            {tipsYields && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Real Yields (TIPS)</div>
                <div className="bonds-metric-card">
                  {tipsYields['5y'] != null && <div className="bonds-metric-row"><span className="bonds-metric-name">5Y TIPS</span><span className="bonds-metric-num" style={{ color: '#22d3ee' }}><MetricValue value={tipsYields['5y']} format={v => `${v.toFixed(2)}%`} seriesKey="tips5y" timestamp={lastUpdated} /></span></div>}
                  {tipsYields['10y'] != null && <div className="bonds-metric-row"><span className="bonds-metric-name">10Y TIPS</span><span className="bonds-metric-num" style={{ color: '#a78bfa' }}><MetricValue value={tipsYields['10y']} format={v => `${v.toFixed(2)}%`} seriesKey="tips10y" timestamp={lastUpdated} /></span></div>}
                  {tipsYields['30y'] != null && <div className="bonds-metric-row"><span className="bonds-metric-name">30Y TIPS</span><span className="bonds-metric-num"><MetricValue value={tipsYields['30y']} format={v => `${v.toFixed(2)}%`} seriesKey="tips30y" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
            {macroData && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Macro</div>
                <div className="bonds-metric-card">
                  {macroData.unemployment != null && <div className="bonds-metric-row"><span className="bonds-metric-name">Unemployment</span><span className="bonds-metric-num"><MetricValue value={macroData.unemployment} format={v => `${v.toFixed(1)}%`} seriesKey="unemployment" timestamp={lastUpdated} /></span></div>}
                  {macroData.gdp != null && <div className="bonds-metric-row"><span className="bonds-metric-name">GDP Growth</span><span className="bonds-metric-num" style={{ color: macroData.gdp > 0 ? '#4ade80' : '#f87171' }}><MetricValue value={macroData.gdp} format={v => `${v.toFixed(1)}%`} seriesKey="gdp" timestamp={lastUpdated} /></span></div>}
                  {macroData.pce != null && <div className="bonds-metric-row"><span className="bonds-metric-name">PCE Inflation</span><span className="bonds-metric-num" style={{ color: macroData.pce > 2 ? '#fbbf24' : '#4ade80' }}><MetricValue value={macroData.pce} format={v => `${v.toFixed(1)}%`} seriesKey="pce" timestamp={lastUpdated} /></span></div>}
                  {nationalDebt != null && <div className="bonds-metric-row"><span className="bonds-metric-name">US Debt</span><span className="bonds-metric-num" style={{ color: '#f87171' }}><MetricValue value={nationalDebt} format={v => `$${v.toFixed(1)}T`} seriesKey="federalDebt" timestamp={lastUpdated} /></span></div>}
                  {debtToGdpHistory?.latest != null && <div className="bonds-metric-row"><span className="bonds-metric-name">Debt/GDP</span><span className="bonds-metric-num" style={{ color: '#f87171' }}><MetricValue value={debtToGdpHistory.latest} format={v => `${v.toFixed(1)}%`} seriesKey="debtToGdp" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
            {cpiComponents?.latest && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">CPI YoY</div>
                <div className="bonds-metric-card">
                  {cpiComponents.latest.allYoy != null && <div className="bonds-metric-row"><span className="bonds-metric-name">All Items</span><span className="bonds-metric-num" style={{ color: cpiComponents.latest.allYoy > 3 ? '#f87171' : cpiComponents.latest.allYoy > 2 ? '#fbbf24' : '#4ade80' }}><MetricValue value={cpiComponents.latest.allYoy} format={v => `${v.toFixed(1)}%`} seriesKey="cpiAll" timestamp={lastUpdated} /></span></div>}
                  {cpiComponents.core?.[cpiComponents.core.length - 1] != null && <div className="bonds-metric-row"><span className="bonds-metric-name">Core</span><span className="bonds-metric-num" style={{ color: '#a78bfa' }}><MetricValue value={cpiComponents.core[cpiComponents.core.length - 1]} format={v => `${v.toFixed(1)}%`} seriesKey="cpiCore" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
          </div>
          <DataFooter source="FRED / Treasury / World Bank" timestamp={lastUpdated} isLive={macroData && Object.values(macroData).some(v => v != null)} fetchLog={fetchLog} />
        </div>

        {/* Credit Spreads */}
        <div key="credit" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Credit Spreads</span>
            <span className="bonds-panel-subtitle">IG · HY · EM · BBB</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {spreadData?.dates?.length ? <SpreadMonitor spreadData={spreadData} mortgageSpread={mortgageSpread} /> : <div className="bonds-empty">No spread data available</div>}
          </div>
          <DataFooter source="FRED ICE BofA" timestamp={lastUpdated} isLive={spreadData?.dates?.length > 0} fetchLog={fetchLog} />
        </div>

        {/* Real Yields */}
        <div key="realYield" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">TIPS Real Yields</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {realYieldOption && <SafeECharts option={realYieldOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'TIPS Real Yields', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'DFII5' }, { id: 'DFII10' }, { id: 'DFII30' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED DFII5 / DFII10" timestamp={lastUpdated} isLive={realYieldHistory?.dates?.length > 0} fetchLog={fetchLog} />
        </div>

        {/* Credit Ratings */}
        <div key="ratings" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Credit Ratings</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {creditRatingsData && <CreditMatrix creditRatingsData={creditRatingsData} creditRatingsAsOf={creditRatingsAsOf} lastUpdated={lastUpdated} />}
          </div>
          <DataFooter source="S&P / Moody's / Fitch" timestamp={lastUpdated} isLive={!!creditRatingsAsOf} fetchLog={fetchLog} />
        </div>

        {/* Curve Spreads */}
        <div key="curvespreads" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Curve Spreads</span>
            <span className="bonds-panel-subtitle">2s10s · 10s3m · 5s30s</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {spreadHistoryOption && <SafeECharts option={spreadHistoryOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Credit Spread History', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'T10Y2Y' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED T10Y2Y / T10Y3M" timestamp={lastUpdated} isLive={spreadHistory?.dates?.length > 0} fetchLog={fetchLog} />
        </div>

        {/* Fed Balance Sheet */}
        <div key="fed" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Fed Balance Sheet</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {fedBalanceOption && <SafeECharts option={fedBalanceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fed Balance Sheet', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'WALCL' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED WALCL" timestamp={lastUpdated} isLive={fedBalanceSheetHistory?.dates?.length > 0} fetchLog={fetchLog} />
        </div>

        {/* M2 Money Supply */}
        <div key="m2" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">M2 Money Supply</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {m2Option && <SafeECharts option={m2Option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'M2 Money Supply', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'M2SL' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED M2SL" timestamp={lastUpdated} isLive={m2HistoryData?.dates?.length > 0} fetchLog={fetchLog} />
        </div>

        {/* CPI Components */}
        <div key="cpi" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">CPI Components (YoY)</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {cpiOption && <SafeECharts option={cpiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'CPI Components', source: 'FRED/BLS', endpoint: '/api/bonds', series: [{ id: 'CPIAUCSL' }, { id: 'CPILFESL' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED CPIAUCSL / CPILFESL" timestamp={lastUpdated} isLive={cpiComponents?.dates?.length > 0} fetchLog={fetchLog} />
        </div>

        {/* Debt-to-GDP */}
        <div key="debtgdp" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Debt-to-GDP</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {debtToGdpOption && <SafeECharts option={debtToGdpOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Debt-to-GDP', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'GFDEBTN' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED GFDEBTN / GDP" timestamp={lastUpdated} isLive={debtToGdpHistory?.dates?.length > 0} fetchLog={fetchLog} />
        </div>

        {/* Breakevens */}
        <div key="breakevens" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Breakeven Inflation</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {breakevensData && <BreakevenMonitor breakevensData={breakevensData} lastUpdated={lastUpdated} />}
          </div>
          <DataFooter source="FRED DFII5 / DFII10" timestamp={lastUpdated} isLive={!!breakevensData?.current?.be5y} fetchLog={fetchLog} />
        </div>

        {/* Duration Ladder — US Treasury debt by maturity */}
        <div key="duration" className="bonds-bento-card">
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <DurationLadder durationLadderData={durationLadderData} durationLadderMeta={durationLadderMeta} treasuryRates={null} fedFundsFutures={fedFundsFutures} />
          </div>
          <DataFooter source="Treasury Fiscal Data" timestamp={lastUpdated} isLive={!!durationLadderMeta} fetchLog={fetchLog} />
        </div>

        {/* Macro Indicators */}
        <div key="macro" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Macro Indicators</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {macroData && Object.keys(macroData).length > 0 ? (
              <div className="bonds-metrics-grid">
                {Object.entries(macroData).map(([key, val]) => (
                  val != null ? <div key={key} className="bonds-metric-row"><span className="bonds-metric-name">{key}</span><span className="bonds-metric-num"><MetricValue value={val} format={v => typeof v === 'number' ? v.toFixed(1) : v} seriesKey={key} timestamp={lastUpdated} /></span></div> : null
                ))}
              </div>
            ) : <div className="bonds-empty">No macro data available</div>}
          </div>
          <DataFooter source="FRED" timestamp={lastUpdated} isLive={macroData && Object.keys(macroData).length > 0} fetchLog={fetchLog} />
        </div>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(BondsDashboard);