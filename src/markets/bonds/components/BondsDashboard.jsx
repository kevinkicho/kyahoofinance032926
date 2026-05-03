import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import BentoWrapper from '../../../components/BentoWrapper';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import YieldCurve from './YieldCurve';
import SpreadMonitor from './SpreadMonitor';
import DurationLadder from './DurationLadder';
import CreditMatrix from './CreditMatrix';
import BreakevenMonitor from './BreakevenMonitor';
import RealYields from './RealYields';
import CpiComponents from './CpiComponents';
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
  isLive, lastUpdated, fetchLog, provenance, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const { convertAndFormat, currentSymbol } = useCurrency();

  // KPI panel is a real bento child at row 0 (h:2 = 240px). All other
  // panels shifted down by 2 rows. Storage key bumped to avoid stale
  // layouts merging with the new schema.
  const layout = {
    lg: [
      { i: 'kpi',        x: 0, y: 0,  w: 12, h: 2 },
      { i: 'yield',      x: 0, y: 2,  w: 8,  h: 4 },
      { i: 'metrics',    x: 8, y: 2,  w: 4,  h: 4 },
      { i: 'credit',     x: 0, y: 6,  w: 4,  h: 3 },
      { i: 'realYield',  x: 4, y: 6,  w: 4,  h: 3 },
      { i: 'ratings',    x: 8, y: 6,  w: 4,  h: 3 },
      { i: 'curvespreads', x: 0, y: 9, w: 4, h: 3 },
      { i: 'fed',        x: 4, y: 9,  w: 4,  h: 3 },
      { i: 'm2',         x: 8, y: 9,  w: 4,  h: 3 },
      { i: 'cpi',        x: 0, y: 12, w: 4,  h: 3 },
      { i: 'debtgdp',    x: 4, y: 12, w: 4,  h: 3 },
      { i: 'breakevens', x: 8, y: 12, w: 4,  h: 3 },
      { i: 'duration',   x: 0, y: 15, w: 6,  h: 4 },
      { i: 'macro',      x: 6, y: 15, w: 6,  h: 4 },
    ]
  };

  // Top-of-page KPI metrics — clickable via MetricValue (seriesKey wires
  // each pill to FRED ID + source for the popover).
  const kpiItems = useMemo(() => {
    // Guard for non-numeric values — `format` is also called with the
    // pre-rendered string ('—') when data is missing, so toFixed/round
    // need to bail out rather than throw.
    const fmtPct = v => typeof v === 'number' ? `${v.toFixed(2)}%` : '—';
    const fmtBps = v => typeof v === 'number' ? `${Math.round(v)} bps` : '—';
    return [
      { label: 'US 10Y',      rawValue: treasuryRates?.US10Y,           value: fmtPct(treasuryRates?.US10Y),           format: fmtPct, seriesKey: '10y',      sublabel: 'Treasury' },
      { label: 'US 2Y',       rawValue: treasuryRates?.US2Y,            value: fmtPct(treasuryRates?.US2Y),            format: fmtPct, seriesKey: '2y',       sublabel: 'Treasury' },
      { label: 'Fed Funds',   rawValue: fedFundsFutures?.effectiveRate, value: fmtPct(fedFundsFutures?.effectiveRate), format: fmtPct, seriesKey: 'fedFunds', sublabel: 'Policy rate' },
      { label: '10Y-2Y',      rawValue: spreadIndicators?.t10y2y,       value: fmtPct(spreadIndicators?.t10y2y),       format: fmtPct, seriesKey: 't10y2y',   color: spreadIndicators?.t10y2y < 0 ? '#f87171' : '#4ade80', sublabel: 'Curve' },
      { label: 'IG OAS',      rawValue: spreadData?.current?.igSpread,  value: fmtBps(spreadData?.current?.igSpread),  format: fmtBps, seriesKey: 'igOAS',    sublabel: 'Investment Grade' },
      { label: 'HY OAS',      rawValue: spreadData?.current?.hySpread,  value: fmtBps(spreadData?.current?.hySpread),  format: fmtBps, seriesKey: 'hyOAS',    sublabel: 'High Yield' },
      { label: '5Y BE',       rawValue: breakevensData?.current?.be5y,  value: fmtPct(breakevensData?.current?.be5y),  format: fmtPct, seriesKey: 't5yie',    sublabel: 'Breakeven' },
    ];
  }, [treasuryRates, fedFundsFutures, spreadIndicators, spreadData, breakevensData]);

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


  // Fed Balance Sheet chart
  const fedBalanceOption = useMemo(() => {
    if (!fedBalanceSheetHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: fedBalanceSheetHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fedBalanceSheetHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${currentSymbol}${v}T` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fedBalanceSheetHistory.values, areaStyle: { color: 'rgba(167,139,250,0.1)' }, lineStyle: { color: '#a78bfa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [fedBalanceSheetHistory, colors, currentSymbol]);

  // M2 chart
  const m2Option = useMemo(() => {
    if (!m2HistoryData?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: m2HistoryData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(m2HistoryData.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${currentSymbol}${v}T` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: m2HistoryData.values, areaStyle: { color: 'rgba(96,165,250,0.1)' }, lineStyle: { color: '#60a5fa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [m2HistoryData, colors, currentSymbol]);
 
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
  const usCurve = yieldCurveData?.US; 
  const us10y = usCurve?.['10y'];
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

  const flattest = useMemo(() => {
    if (!yieldCurveData) return null;
    let best = null, bestSpread = Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve?.['30y'], s3m = curve?.['3m'];
      if (s30 != null && s3m != null) { const spread = s30 - s3m; if (spread < bestSpread) { bestSpread = spread; best = cc; } }
    }
    return best ? { country: best, spread: bestSpread } : null;
  }, [yieldCurveData]);

  return (
    <div className="bonds-dashboard bonds-dashboard--bento">
      <BentoWrapper layout={layout} storageKey="bonds-layout-v2">
        {/* KPI strip — first bento child, full-width across row 0. Each
            pill is clickable (MetricValue popover with FRED series ID).
            `bare` mode skips the inner panel-card chrome since the
            outer .bonds-bento-card already owns it. */}
        <div key="kpi" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Key Metrics</span>
            <span className="bonds-panel-subtitle">US Treasury yields · Fed funds · curve spread · credit spreads · 5Y breakeven</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <MarketKpiStrip kpis={kpiItems} bare />
          </div>
          <DataFooter
            source="FRED / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            fetchLog={fetchLog}
            error={error}
            fetchedOn={fetchedOn}
            isCurrent={isCurrent}
          />
        </div>
        {/* Yield Curve */}
        <div key="yield" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Yield Curve</span>
            <span className="bonds-panel-subtitle">{countryCount} countries · sovereign benchmark rates</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {yieldCurveData && <YieldCurve yieldCurveData={yieldCurveData} spreadIndicators={spreadIndicators} fredYieldHistory={fredYieldHistory} yieldHistory={yieldHistory} lastUpdated={lastUpdated} />}
          </div>
          <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={Object.keys(yieldCurveData).some(k => yieldCurveData[k] && Object.values(yieldCurveData[k]).some(v => v != null))} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Key Metrics */}
        <div key="metrics" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Key Metrics</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
               <div className="bonds-sidebar-section">
                 <div className="bonds-sidebar-title">Yields (US)</div>
                 <div className="bonds-metric-card">
                   {['3m', '2y', '5y', '10y', '30y'].map(tenor => (
                     <div key={tenor} className="bonds-metric-row">
                       <span className="bonds-metric-name">{tenor.toUpperCase()}</span>
                       <span className="bonds-metric-num">
                         <MetricValue value={usCurve?.[tenor]} format={v => `${v?.toFixed(2)}%`} seriesKey={`us-${tenor}`} timestamp={lastUpdated} />
                       </span>
                     </div>
                   ))}
                 </div>
                 <div className="bonds-metric-card">
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">Steepest</span>
                     <span className="bonds-metric-num info">{steepest?.country} ({steepest?.spread?.toFixed(0)}bp)</span>
                   </div>
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">Flattest</span>
                     <span className="bonds-metric-num info">{flattest?.country} ({flattest?.spread?.toFixed(0)}bp)</span>
                   </div>
                 </div>
               </div>
               <div className="bonds-sidebar-section">
                 <div className="bonds-sidebar-title">Spreads</div>
                 <div className="bonds-metric-card">
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">2s10s</span>
                     <span className={`bonds-metric-num ${spreadIndicators?.t10y2y >= 0 ? 'positive' : 'negative'}`}>
                       <MetricValue value={spreadIndicators?.t10y2y} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y2y" timestamp={lastUpdated} />
                     </span>
                   </div>
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">10s3m</span>
                     <span className={`bonds-metric-num ${spreadIndicators?.t10y3m >= 0 ? 'positive' : 'negative'}`}>
                       <MetricValue value={spreadIndicators?.t10y3m} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y3m" timestamp={lastUpdated} />
                     </span>
                   </div>
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">5s30s</span>
                     <span className={`bonds-metric-num ${spreadHistory?.latest?.t5y30y >= 0 ? 'positive' : 'negative'}`}>
                       <MetricValue value={spreadHistory?.latest?.t5y30y} format={v => `${v >= 0 ? '+' : ''}${v?.toFixed(2)}%`} seriesKey="t5y30y" timestamp={lastUpdated} />
                     </span>
                   </div>
                 </div>
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
                   {nationalDebt != null && <div className="bonds-metric-row"><span className="bonds-metric-name">US Debt</span><span className="bonds-metric-num" style={{ color: '#f87171' }}><MetricValue value={nationalDebt} format={v => convertAndFormat(v, 'USD', 1)} seriesKey="federalDebt" timestamp={lastUpdated} /></span></div>}

                  {debtToGdpHistory?.latest != null && <div className="bonds-metric-row"><span className="bonds-metric-name">Debt/GDP</span><span className="bonds-metric-num" style={{ color: '#f87171' }}><MetricValue value={debtToGdpHistory.latest} format={v => `${v.toFixed(1)}%`} seriesKey="debtToGdp" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
            {breakevensData && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Breakevens</div>
                <div className="bonds-metric-card">
                  {breakevensData.current?.be5y != null && <div className="bonds-metric-row"><span className="bonds-metric-name">5Y BE</span><span className="bonds-metric-num" style={{ color: '#f59e0b' }}><MetricValue value={breakevensData.current.be5y} format={v => `${v.toFixed(2)}%`} seriesKey="be5y" timestamp={lastUpdated} /></span></div>}
                  {breakevensData.current?.be10y != null && <div className="bonds-metric-row"><span className="bonds-metric-name">10Y BE</span><span className="bonds-metric-num" style={{ color: '#f59e0b' }}><MetricValue value={breakevensData.current.be10y} format={v => `${v.toFixed(2)}%`} seriesKey="be10y" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
            {fedFundsFutures && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Fed Funds</div>
                <div className="bonds-metric-card">
                  <div className="bonds-metric-row">
                    <span className="bonds-metric-name">Effective Rate</span>
                    <span className="bonds-metric-num accent">
                      <MetricValue value={fedFundsFutures?.effectiveRate} format={v => `${v?.toFixed(2)}%`} seriesKey="effRate" timestamp={lastUpdated} />
                    </span>
                  </div>
                </div>
              </div>
            )}
             {spreadData && (
               <div className="bonds-sidebar-section">
                 <div className="bonds-sidebar-title">Credit Spreads</div>
                 <div className="bonds-metric-card">
                   {spreadData.current?.ig != null && <div className="bonds-metric-row"><span className="bonds-metric-name">IG</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.ig} format={v => `${v.toFixed(0)}bp`} seriesKey="igSpread" timestamp={lastUpdated} /></span></div>}
                   {spreadData.current?.hy != null && <div className="bonds-metric-row"><span className="bonds-metric-name">HY</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.hy} format={v => `${v.toFixed(0)}bp`} seriesKey="hySpread" timestamp={lastUpdated} /></span></div>}
                   {spreadData.current?.em != null && <div className="bonds-metric-row"><span className="bonds-metric-name">EM</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.em} format={v => `${v.toFixed(0)}bp`} seriesKey="emSpread" timestamp={lastUpdated} /></span></div>}
                 </div>
               </div>
             )}


          </div>
          <DataFooter source="FRED / Treasury / World Bank" timestamp={lastUpdated} isLive={macroData && Object.values(macroData).some(v => v != null)} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
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
          <DataFooter source="FRED ICE BofA" timestamp={lastUpdated} isLive={spreadData?.dates?.length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Real Yields */}
        <div key="realYield" className="bonds-bento-card">
          <RealYields 
            realYieldHistory={realYieldHistory} 
            lastUpdated={lastUpdated} 
            isLive={realYieldHistory?.dates?.length > 0} 
            fetchLog={fetchLog} 
            error={error} 
            fetchedOn={fetchedOn} 
            isCurrent={isCurrent} 
          />
        </div>

        {/* Credit Ratings */}
        <div key="ratings" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Credit Ratings</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {creditRatingsData && <CreditMatrix creditRatingsData={creditRatingsData} creditRatingsAsOf={creditRatingsAsOf} lastUpdated={lastUpdated} />}
          </div>
          <DataFooter source="S&P / Moody's / Fitch" timestamp={lastUpdated} isLive={!!creditRatingsAsOf} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
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
          <DataFooter source="FRED T10Y2Y / T10Y3M" timestamp={lastUpdated} isLive={spreadHistory?.dates?.length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Fed Balance Sheet */}
        <div key="fed" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Fed Balance Sheet</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {fedBalanceOption && <SafeECharts option={fedBalanceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fed Balance Sheet', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'WALCL' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED WALCL" timestamp={lastUpdated} isLive={fedBalanceSheetHistory?.dates?.length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* M2 Money Supply */}
        <div key="m2" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">M2 Money Supply</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {m2Option && <SafeECharts option={m2Option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'M2 Money Supply', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'M2SL' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED M2SL" timestamp={lastUpdated} isLive={m2HistoryData?.dates?.length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

         {/* CPI Components */}
         <div key="cpi" className="bonds-bento-card">
           <div className="bonds-panel-title-row bento-panel-title-row">
             <span className="bonds-panel-title">CPI Components (YoY)</span>
           </div>
           <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
             <CpiComponents cpiComponents={cpiComponents} lastUpdated={lastUpdated} />
           </div>
           <DataFooter source="FRED CPIAUCSL / CPILFESL" timestamp={lastUpdated} isLive={cpiComponents?.dates?.length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
         </div>

        {/* Debt-to-GDP */}
        <div key="debtgdp" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Debt-to-GDP</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {debtToGdpOption && <SafeECharts option={debtToGdpOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Debt-to-GDP', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'GFDEBTN' }], updatedAt: lastUpdated }} />}
          </div>
          <DataFooter source="FRED GFDEBTN / GDP" timestamp={lastUpdated} isLive={debtToGdpHistory?.dates?.length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Breakevens */}
        <div key="breakevens" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Breakeven Inflation</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {breakevensData && <BreakevenMonitor breakevensData={breakevensData} lastUpdated={lastUpdated} />}
          </div>
          <DataFooter source="FRED DFII5 / DFII10" timestamp={lastUpdated} isLive={!!breakevensData?.current?.be5y} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Duration Ladder — US Treasury debt by maturity */}
        <div key="duration" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Duration Ladder</span>
            <span className="bonds-panel-subtitle">US Treasury marketable debt by maturity{durationLadderMeta?.asOf ? ` (as of ${new Date(durationLadderMeta.asOf + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})` : ''}</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <DurationLadder bare durationLadderData={durationLadderData} durationLadderMeta={durationLadderMeta} treasuryRates={treasuryRates} fedFundsFutures={fedFundsFutures} />
          </div>
          <DataFooter source="Treasury Fiscal Data" timestamp={lastUpdated} isLive={!!durationLadderMeta} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Macro Indicators */}
        <div key="macro" className="bonds-bento-card">
          <div className="bonds-panel-title-row bento-panel-title-row">
            <span className="bonds-panel-title">Macro Indicators</span>
          </div>
          <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {macroData && Object.keys(macroData).length > 0 ? (
              <div className="bonds-metrics-grid">
                {Object.entries(macroData).map(([key, val]) => {
                  if (val == null) return null;
                  const isMonetary = ['fedBalanceSheet', 'm2', 'federalDebt', 'surplusDeficit'].includes(key);
                  return <div key={key} className="bonds-metric-row"><span className="bonds-metric-name">{key}</span><span className="bonds-metric-num"><MetricValue value={isMonetary ? val : val} format={v => typeof v !== 'number' ? String(v) : isMonetary ? convertAndFormat(v, 'USD', 1) : `${v.toFixed(1)}%`} seriesKey={key} timestamp={lastUpdated} /></span></div>;
                })}
              </div>
            ) : <div className="bonds-empty">No macro data available</div>}
          </div>
          <DataFooter source="FRED" timestamp={lastUpdated} isLive={macroData && Object.keys(macroData).length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(BondsDashboard);