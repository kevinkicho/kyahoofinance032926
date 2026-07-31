import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import { useMarketData } from '../../../hub/DataContext';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import EmptyPanelBody from '../../../components/BentoCard/EmptyPanelBody';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import { MARKET_PANELS } from '../../../data/marketPanels';
import YieldCurve from './YieldCurve';
import SpreadMonitor from './SpreadMonitor';
import DurationLadder from './DurationLadder';
import CreditMatrix from './CreditMatrix';
import BreakevenMonitor from './BreakevenMonitor';
import RealYields from './RealYields';
import CpiComponents from './CpiComponents';
import { MacroIndicatorsPanel, EcbPolicyRatesPanel, CentralBankRatesPanel } from './MacroAndRatesPanels';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import { buildSpreadHistoryOption, buildFedBalanceOption, buildM2Option, buildDebtToGdpOption } from './bondsChartOptions';
import './BondsDashboard.css';

function BondsDashboard({
  yieldCurveData, creditRatingsData, creditRatingsAsOf, spreadIndicators, spreadData, durationLadderData, durationLadderMeta,
  breakevensData, fredYieldHistory, treasuryRates, fedFundsFutures, yieldHistory,
  mortgageSpread, tipsYields, realYieldHistory, macroData, fedBalanceSheetHistory,
  m2HistoryData, auctionData, nationalDebt, spreadHistory, cpiComponents, debtToGdpHistory,
  isLive, lastUpdated, fetchLog, provenance, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const { convertAndFormat, currentSymbol } = useCurrency();
  // Cross-market data for the new Foreign Holders + Money Market panels.
  const ticCtx = useMarketData('treasuryTIC');
  const nyfedCtx = useMarketData('nyfed');
  const auctionCtx = useMarketData('treasuryAuctions');
  const ecbCtx = useMarketData('ecb');
  const treasuryCostCtx = useMarketData('treasuryCost');

  // KPI panel is a real bento child at row 0 (h:2 = 240px). All other
  // panels shifted down by 2 rows. Storage key bumped to avoid stale
  // layouts merging with the new schema.
  const layout = {
    lg: [
      { i: 'kpi',        x: 0, y: 0,  w: 12, h: 2 },
      { i: 'yield',      x: 0, y: 2,  w: 8,  h: 5 },
      { i: 'metrics',    x: 8, y: 2,  w: 4,  h: 5 },
      { i: 'credit',     x: 0, y: 7,  w: 4,  h: 3 },
      { i: 'realYield',  x: 4, y: 7,  w: 4,  h: 3 },
      { i: 'ratings',    x: 8, y: 7,  w: 4,  h: 3 },
      { i: 'curvespreads', x: 0, y: 10, w: 4, h: 3 },
      { i: 'fed',        x: 4, y: 10, w: 4,  h: 3 },
      { i: 'm2',         x: 8, y: 10, w: 4,  h: 3 },
      { i: 'cpi',        x: 0, y: 13, w: 4,  h: 3 },
      { i: 'debtgdp',    x: 4, y: 13, w: 4,  h: 3 },
      { i: 'breakevens', x: 8, y: 13, w: 4,  h: 3 },
      { i: 'duration',   x: 0, y: 16, w: 6,  h: 5 },
      { i: 'macro',      x: 6, y: 16, w: 6,  h: 5 },
      { i: 'foreign-holders', x: 0, y: 21, w: 6, h: 4 },
      { i: 'money-market',    x: 6, y: 21, w: 6, h: 4 },
      { i: 'auctions',        x: 0, y: 25, w: 12, h: 5 },
      { i: 'ecb-yields',      x: 0, y: 30, w: 6, h: 7 },
      { i: 'global-rates',    x: 6, y: 30, w: 6, h: 7 },
      { i: 'treasury-cost',   x: 0, y: 37, w: 6, h: 3 },
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
    const n = (...vals) => {
      for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
      return null;
    };
    const us10 = n(treasuryRates?.US10Y, yieldCurveData?.US?.['10y']);
    const us2 = n(treasuryRates?.US2Y, yieldCurveData?.US?.['2y']);
    const curve = n(spreadIndicators?.t10y2y, (us10 != null && us2 != null ? us10 - us2 : null));
    const fed = n(fedFundsFutures?.m1, treasuryRates?.fedFunds, treasuryRates?.US3M);
    const ig = n(spreadData?.current?.igSpread, spreadData?.current?.ig);
    const hy = n(spreadData?.current?.hySpread, spreadData?.current?.hy);
    const be5 = n(breakevensData?.current?.be5y);
    return [
      { label: 'US 10Y',    rawValue: us10, value: fmtPct(us10), format: fmtPct, seriesKey: '10y',      sublabel: 'Treasury' },
      { label: 'US 2Y',     rawValue: us2,  value: fmtPct(us2),  format: fmtPct, seriesKey: '2y',       sublabel: 'Treasury' },
      { label: 'Fed Funds', rawValue: fed,  value: fmtPct(fed),  format: fmtPct, seriesKey: 'fedFunds', sublabel: 'Policy rate' },
      { label: '10Y-2Y',    rawValue: curve, value: fmtPct(curve), format: fmtPct, seriesKey: 't10y2y', color: curve != null && curve < 0 ? '#f87171' : '#4ade80', sublabel: 'Curve' },
      { label: 'IG OAS',    rawValue: ig,   value: fmtBps(ig),   format: fmtBps, seriesKey: 'igOAS',    sublabel: 'Investment Grade' },
      { label: 'HY OAS',    rawValue: hy,   value: fmtBps(hy),   format: fmtBps, seriesKey: 'hyOAS',    sublabel: 'High Yield' },
      { label: '5Y BE',     rawValue: be5,  value: fmtPct(be5),  format: fmtPct, seriesKey: 't5yie',    sublabel: 'Breakeven' },
    ];
  }, [treasuryRates, fedFundsFutures, spreadIndicators, spreadData, breakevensData, yieldCurveData]);

  // Spread History chart
  const spreadHistoryOption = useMemo(
    () => buildSpreadHistoryOption(spreadHistory, colors),
    [spreadHistory, colors],
  );


  const fedBalanceOption = useMemo(
    () => buildFedBalanceOption(fedBalanceSheetHistory, colors, currentSymbol),
    [fedBalanceSheetHistory, colors, currentSymbol],
  );

  const m2Option = useMemo(
    () => buildM2Option(m2HistoryData, colors, currentSymbol),
    [m2HistoryData, colors, currentSymbol],
  );
 
  const debtToGdpOption = useMemo(
    () => buildDebtToGdpOption(debtToGdpHistory, colors),
    [debtToGdpHistory, colors],
  );

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

  // ── Foreign Holders chart (Treasury TIC) ────────────────────────────────
  // Multi-line over the latest ~12 months for the top 5 holders + "All Other".
  // Snapshot-bar version was a one-month picture; the rotation between Japan
  // / China / UK is the more interesting story to surface here. Server's
  // /api/treasury/tic endpoint already returns `history` keyed by country.
  const foreignHoldersOption = useMemo(() => {
    const history = ticCtx?.data?.history;
    const latest = ticCtx?.data?.latest || [];
    if (!history || !latest.length) return null;
    // Pick top-5 by latest holdings, plus "All Other" if present in history.
    const ranked = latest.filter(r => r.country !== 'All Other').slice(0, 5).map(r => r.country);
    const countries = [...ranked];
    if (history['All Other']) countries.push('All Other');
    // Periods come straight from any one country's series — they're all aligned.
    const sample = history[countries[0]] || [];
    const periods = sample.map(p => p.period);
    if (!periods.length) return null;
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#a78bfa', '#ec4899', '#94a3b8'];
    const seriesByCountry = countries.map((c, i) => {
      const periodMap = Object.fromEntries((history[c] || []).map(p => [p.period, p.holdingsB]));
      const values = periods.map(p => periodMap[p] ?? null);
      const last = values[values.length - 1];
      return {
        name: `${c} ($${last?.toFixed(0)}B)`,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        data: values,
        lineStyle: { color: palette[i % palette.length], width: 1.8 },
        itemStyle: { color: palette[i % palette.length] },
      };
    });
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: v => v != null ? `$${v.toFixed(0)}B` : '—' },
      legend: { top: 0, type: 'scroll', textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 28, right: 12, bottom: 24, left: 48 },
      xAxis: { type: 'category', data: periods, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(periods.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { formatter: v => `$${v}B`, color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: seriesByCountry,
    };
  }, [ticCtx, colors]);

  // ── Money Market chart (NY Fed: SOFR + ON RRP) ──────────────────────────
  const moneyMarketOption = useMemo(() => {
    const sofrSeries = nyfedCtx?.data?.sofr?.series || [];
    const rrpSeries = nyfedCtx?.data?.rrp || [];
    if (!sofrSeries.length && !rrpSeries.length) return null;
    // NY Fed returns both series newest-first; reverse so the chart reads
    // left=oldest, right=newest. Without the reverse, the SOFR line ran
    // backwards (latest 04-30 on the left) and the ON RRP bars all
    // clustered on the left edge because RRP only happens ~10 of 30 days.
    const sofrAsc = [...sofrSeries].reverse();
    const last30  = sofrAsc.slice(-30);
    const dates   = last30.map(r => r.date);
    const sofrVals = last30.map(r => r.rate);
    const rrpByDate = Object.fromEntries(rrpSeries.map(r => [r.date, r.acceptedB]));
    const rrpVols = dates.map(d => rrpByDate[d] != null ? rrpByDate[d] : null);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['SOFR (%)', 'ON RRP ($B)'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 22, right: 50, bottom: 22, left: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(1, Math.floor(dates.length / 5)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: [
        { type: 'value', name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'value', name: '$B', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, position: 'right', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}' }, splitLine: { show: false } },
      ],
      series: [
        { name: 'SOFR (%)', type: 'line', yAxisIndex: 0, data: sofrVals, symbol: 'none', smooth: 0.3, lineStyle: { color: '#22d3ee', width: 1.6 } },
        { name: 'ON RRP ($B)', type: 'bar', yAxisIndex: 1, data: rrpVols, itemStyle: { color: '#f59e0b88' }, barWidth: 6 },
      ],
    };
  }, [nyfedCtx, colors]);

  // ── Auction quality trend (Treasury Fiscal Data) ────────────────────────
  // Two complementary signals on one chart: bid-to-cover ratio (line, left
  // axis) and indirect-bidder share (bar, right axis). Strong demand looks
  // like rising BTC + rising indirect %; weak demand is the opposite, with
  // dealers absorbing more.
  const auctionTrendOption = useMemo(() => {
    const rows = (auctionCtx?.data?.auctions || []).slice(0, 20).reverse();
    if (!rows.length) return null;
    const dates = rows.map(r => `${r.auctionDate}\n${r.securityTerm}`);
    const btc   = rows.map(r => r.bidToCover);
    const ind   = rows.map(r => r.indirectPct != null ? Math.round(r.indirectPct * 10) / 10 : null);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: ps => {
        const i = ps[0]?.dataIndex;
        const r = rows[i];
        if (!r) return '';
        return `<b>${r.auctionDate}</b> · ${r.securityType} ${r.securityTerm}<br/>BTC: ${r.bidToCover?.toFixed(2)}<br/>Indirect: ${r.indirectPct?.toFixed(1)}%<br/>Direct: ${r.directPct?.toFixed(1)}%<br/>Dealer: ${r.dealerPct?.toFixed(1)}%${r.stopYieldPct != null ? `<br/>Stop yield: ${r.stopYieldPct.toFixed(3)}%` : ''}`;
      }},
      legend: { data: ['Bid-to-Cover', 'Indirect %'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 56, bottom: 40, left: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 8, interval: 0, rotate: 35 }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: [
        { type: 'value', name: 'BTC', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'value', name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, position: 'right', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { show: false }, max: 100 },
      ],
      series: [
        { name: 'Bid-to-Cover', type: 'line', yAxisIndex: 0, data: btc, symbol: 'circle', symbolSize: 4, lineStyle: { color: '#22d3ee', width: 2 }, itemStyle: { color: '#22d3ee' } },
        { name: 'Indirect %', type: 'bar', yAxisIndex: 1, data: ind, itemStyle: { color: '#10b98155' }, barWidth: 8 },
      ],
    };
  }, [auctionCtx, colors]);

  const auctionDemandSummary = useMemo(() => {
    const rows = auctionCtx?.data?.auctions || [];
    if (!rows.length) return null;
    const recent = rows.slice(0, 10);
    const summary = auctionCtx?.data?.summary || {};
    const avg = (values) => {
      const nums = values.map(Number).filter(Number.isFinite);
      return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
    };
    const avgBidToCover = Number.isFinite(Number(summary.avgBidToCover)) ? Number(summary.avgBidToCover) : avg(recent.map(r => r.bidToCover));
    const avgIndirectPct = Number.isFinite(Number(summary.avgIndirectPct)) ? Number(summary.avgIndirectPct) : avg(recent.map(r => r.indirectPct));
    const avgDealerPct = avg(recent.map(r => r.dealerPct));
    const demandLabel = avgBidToCover == null
      ? 'Unknown'
      : avgBidToCover >= 2.6 && (avgIndirectPct ?? 0) >= 60
        ? 'Strong'
        : avgBidToCover >= 2.2
          ? 'Stable'
          : 'Soft';
    return {
      latest: rows[0],
      count: summary.count ?? rows.length,
      avgBidToCover,
      avgIndirectPct,
      avgDealerPct,
      demandLabel,
    };
  }, [auctionCtx]);

  return (
    <div className="bonds-dashboard bonds-dashboard--bento">
      <BentoWrapper
        layout={layout}
        storageKey="bonds-layout-v9"
        accent="bonds"
        panelTitles={Object.fromEntries((MARKET_PANELS.bonds || []).map(p => [p.id, p.title]))}
      >
        {/* KPI strip — first bento child, full-width across row 0. Each
            pill is clickable (MetricValue popover with FRED series ID). */}
        <BentoCard
          key="kpi"
          title="Key Metrics"
          subtitle="US Treasury yields · Fed funds · curve spread · credit spreads · 5Y breakeven"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="FRED / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <MarketKpiStrip kpis={kpiItems} bare />
        </BentoCard>

        {/* Yield Curve */}
        <BentoCard
          key="yield"
          title="Yield Curve"
          subtitle={`${countryCount} markets · US multi-tenor + global 10Y`}
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content yc-host"
          source="FRED"
          timestamp={lastUpdated}
          isLive={Object.keys(yieldCurveData || {}).some(k => yieldCurveData[k] && Object.values(yieldCurveData[k]).some(v => v != null))}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <YieldCurve
            yieldCurveData={yieldCurveData}
            spreadIndicators={spreadIndicators}
            fredYieldHistory={fredYieldHistory}
            yieldHistory={yieldHistory}
            lastUpdated={lastUpdated}
          />
        </BentoCard>

        {/* Key Metrics (sidebar) */}
        <BentoCard
          key="metrics"
          title="Key Metrics"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="FRED / Treasury / World Bank"
          timestamp={lastUpdated}
          isLive={macroData && Object.values(macroData).some(v => v != null)}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <>
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
                    {spreadData.current?.igSpread != null && <div className="bonds-metric-row"><span className="bonds-metric-name">IG</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.igSpread} format={v => `${v.toFixed(0)}bp`} seriesKey="igSpread" timestamp={lastUpdated} /></span></div>}
                    {spreadData.current?.hySpread != null && <div className="bonds-metric-row"><span className="bonds-metric-name">HY</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.hySpread} format={v => `${v.toFixed(0)}bp`} seriesKey="hySpread" timestamp={lastUpdated} /></span></div>}
                    {spreadData.current?.emSpread != null && <div className="bonds-metric-row"><span className="bonds-metric-name">EM</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.emSpread} format={v => `${v.toFixed(0)}bp`} seriesKey="emSpread" timestamp={lastUpdated} /></span></div>}
                 </div>
               </div>
             )}


          </>
        </BentoCard>

        {/* Credit Spreads */}
        <BentoCard key="credit" title="Credit Spreads" subtitle="IG · HY · EM · BBB" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED ICE BofA" timestamp={lastUpdated} isLive={!!(spreadData?.dates?.length || spreadData?.current?.hySpread != null)} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {(spreadData?.dates?.length || spreadData?.current)
            ? <SpreadMonitor spreadData={spreadData} mortgageSpread={mortgageSpread} lastUpdated={lastUpdated} />
            : <div className="bonds-empty">No spread data available</div>}
        </BentoCard>

        {/* Real Yields — RealYields was refactored in Phase 6b to expose
            just chart content; chrome handled by BentoCard like everywhere
            else. */}
        <BentoCard
          key="realYield"
          title="TIPS Real Yields"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="FRED DFII5 / DFII10"
          timestamp={lastUpdated}
          isLive={realYieldHistory?.dates?.length > 0}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <RealYields realYieldHistory={realYieldHistory} lastUpdated={lastUpdated} />
        </BentoCard>

        {/* Credit Ratings */}
        <BentoCard key="ratings" title="Credit Ratings" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="S&P / Moody's / Fitch" timestamp={lastUpdated} isLive={!!creditRatingsAsOf} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error} disabled={!creditRatingsData?.length}>
          {creditRatingsData?.length
            ? <CreditMatrix creditRatingsData={creditRatingsData} creditRatingsAsOf={creditRatingsAsOf} lastUpdated={lastUpdated} />
            : <EmptyPanelBody message="No credit ratings data" />}
        </BentoCard>

        {/* Curve Spreads */}
        <BentoCard key="curvespreads" title="Curve Spreads" subtitle="2s10s · 10s3m · 5s30s" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED T10Y2Y / T10Y3M" timestamp={lastUpdated} isLive={spreadHistory?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error} disabled={!spreadHistoryOption}>
          {spreadHistoryOption
            ? <SafeECharts option={spreadHistoryOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Credit Spread History', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'T10Y2Y' }], updatedAt: lastUpdated }} />
            : <EmptyPanelBody message="No curve spread history" />}
        </BentoCard>

        {/* Fed Balance Sheet */}
        <BentoCard key="fed" title="Fed Balance Sheet" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED WALCL" timestamp={lastUpdated} isLive={fedBalanceSheetHistory?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error} disabled={!fedBalanceOption}>
          {fedBalanceOption
            ? <SafeECharts option={fedBalanceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fed Balance Sheet', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'WALCL' }], updatedAt: lastUpdated }} />
            : <EmptyPanelBody message="No Fed balance sheet data" />}
        </BentoCard>

        {/* M2 Money Supply */}
        <BentoCard key="m2" title="M2 Money Supply" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED M2SL" timestamp={lastUpdated} isLive={m2HistoryData?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error} disabled={!m2Option}>
          {m2Option
            ? <SafeECharts option={m2Option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'M2 Money Supply', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'M2SL' }], updatedAt: lastUpdated }} />
            : <EmptyPanelBody message="No M2 data" />}
        </BentoCard>

        {/* CPI Components */}
        <BentoCard key="cpi" title="CPI Components (YoY)" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED CPIAUCSL / CPILFESL" timestamp={lastUpdated} isLive={cpiComponents?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          <CpiComponents cpiComponents={cpiComponents} lastUpdated={lastUpdated} />
        </BentoCard>

        {/* Debt-to-GDP */}
        <BentoCard key="debtgdp" title="Debt-to-GDP" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED GFDEBTN / GDP" timestamp={lastUpdated} isLive={debtToGdpHistory?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error} disabled={!debtToGdpOption}>
          {debtToGdpOption
            ? <SafeECharts option={debtToGdpOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Debt-to-GDP', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'GFDEBTN' }], updatedAt: lastUpdated }} />
            : <EmptyPanelBody message="No debt-to-GDP data" />}
        </BentoCard>

        {/* Breakevens */}
        <BentoCard key="breakevens" title="Breakeven Inflation" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED DFII5 / DFII10" timestamp={lastUpdated} isLive={!!breakevensData?.current?.be5y} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error} disabled={!breakevensData}>
          {breakevensData
            ? <BreakevenMonitor breakevensData={breakevensData} lastUpdated={lastUpdated} />
            : <EmptyPanelBody message="No breakeven data" />}
        </BentoCard>

        {/* Duration Ladder — US Treasury debt by maturity */}
        <BentoCard
          key="duration"
          title="Duration Ladder"
          subtitle={`US Treasury marketable debt by maturity${durationLadderMeta?.asOf ? ` (as of ${new Date(durationLadderMeta.asOf + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})` : ''}`}
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content dl-host"
          source="Treasury Fiscal Data / CME ZQ"
          timestamp={lastUpdated}
          isLive={!!durationLadderMeta || !!(fedFundsFutures && Object.keys(fedFundsFutures).length > 1)}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <DurationLadder
            bare
            durationLadderData={durationLadderData}
            durationLadderMeta={durationLadderMeta}
            treasuryRates={treasuryRates}
            fedFundsFutures={fedFundsFutures}
          />
        </BentoCard>

        {/* Macro Indicators */}
        {/* Foreign Holders — Major foreign holders of US Treasuries (Treasury TIC) */}
        <BentoCard
          key="foreign-holders"
          title="Foreign Holders"
          subtitle="Top-5 + All Other · 12-month rotation · USD billions"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="US Treasury TIC"
          timestamp={ticCtx?.lastUpdated || lastUpdated}
          isLive={!!(ticCtx?.data?.latest?.length)}
          isCurrent={ticCtx?.isCurrent ?? isCurrent}
          fetchedOn={ticCtx?.fetchedOn || fetchedOn}
          fetchLog={ticCtx?.fetchLog || fetchLog}
          error={ticCtx?.error || error}
        >
          {foreignHoldersOption ? (
            <SafeECharts option={foreignHoldersOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Foreign Holders', source: 'US Treasury TIC', endpoint: '/api/treasury/tic', series: [], updatedAt: ticCtx?.lastUpdated || lastUpdated }} />
          ) : (
            <div className="bonds-empty">No TIC data available</div>
          )}
        </BentoCard>

        {/* Money Market — SOFR + ON RRP overnight (NY Fed Markets data) */}
        <BentoCard
          key="money-market"
          title="Money Market"
          subtitle="SOFR (left) · ON RRP volume (right) · last 30 days"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="NY Fed Markets"
          timestamp={nyfedCtx?.lastUpdated || lastUpdated}
          isLive={!!(nyfedCtx?.data?.sofr?.series?.length)}
          isCurrent={nyfedCtx?.isCurrent ?? isCurrent}
          fetchedOn={nyfedCtx?.fetchedOn || fetchedOn}
          fetchLog={nyfedCtx?.fetchLog || fetchLog}
          error={nyfedCtx?.error || error}
        >
          {moneyMarketOption ? (
            <SafeECharts option={moneyMarketOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Money Market', source: 'NY Fed Markets', endpoint: '/api/nyfed', series: [], updatedAt: nyfedCtx?.lastUpdated || lastUpdated }} />
          ) : (
            <div className="bonds-empty">No NY Fed data available</div>
          )}
        </BentoCard>

        {/* Recent Auctions — bid-to-cover trend + indirect-bidder share table */}
        <BentoCard
          key="auctions"
          title="Recent Auctions"
          subtitle={auctionDemandSummary
            ? `${auctionDemandSummary.demandLabel} demand · avg BTC ${auctionDemandSummary.avgBidToCover?.toFixed(2) ?? '—'} · indirect ${auctionDemandSummary.avgIndirectPct?.toFixed(0) ?? '—'}%`
            : 'Bid-to-cover trend · indirect-bidder share = foreign demand proxy'}
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content auc-host"
          source="US Treasury Fiscal Data"
          timestamp={auctionCtx?.lastUpdated || lastUpdated}
          isLive={!!(auctionCtx?.data?.auctions?.length)}
          isCurrent={auctionCtx?.isCurrent ?? isCurrent}
          fetchedOn={auctionCtx?.fetchedOn || fetchedOn}
          fetchLog={auctionCtx?.fetchLog || fetchLog}
          error={auctionCtx?.error || error}
        >
          {auctionTrendOption ? (
            <div className="auc-panel">
              {auctionDemandSummary && (
                <div className="auc-kpis">
                  {[
                    ['Demand', auctionDemandSummary.demandLabel, '#22d3ee'],
                    ['Avg BTC', auctionDemandSummary.avgBidToCover, '#10b981', (v) => v.toFixed(2)],
                    ['Indirect', auctionDemandSummary.avgIndirectPct, '#a78bfa', (v) => `${v.toFixed(0)}%`],
                    ['Dealer', auctionDemandSummary.avgDealerPct, '#f59e0b', (v) => `${v.toFixed(0)}%`],
                  ].map(([label, value, color, format]) => (
                    <div key={label} className="auc-kpi">
                      <span className="auc-kpi-label">{label}</span>
                      <span className="auc-kpi-value" style={{ color }}>
                        {typeof format === 'function' && Number.isFinite(Number(value))
                          ? format(Number(value))
                          : (value ?? '—')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="auc-main">
                <div className="auc-chart-card">
                  <div className="auc-section-title">Bid-to-cover · indirect %</div>
                  <div className="auc-chart-body">
                    <SafeECharts
                      option={auctionTrendOption}
                      style={{ height: '100%', width: '100%' }}
                      sourceInfo={{
                        title: 'Auction Bid-to-Cover',
                        source: 'US Treasury Fiscal Data',
                        endpoint: '/api/treasury/auctions',
                        series: [],
                        updatedAt: auctionCtx?.lastUpdated || lastUpdated,
                      }}
                    />
                  </div>
                </div>
                <div className="auc-table-card">
                  <div className="auc-section-title">
                    Recent results · {(auctionCtx?.data?.auctions || []).length} auctions
                  </div>
                  <div className="auc-table" role="table">
                    <div className="auc-table-head" role="row">
                      <span role="columnheader">Date</span>
                      <span role="columnheader">Issue</span>
                      <span role="columnheader">BTC</span>
                      <span role="columnheader">Ind%</span>
                      <span role="columnheader">Yield</span>
                    </div>
                    <div className="auc-table-body">
                      {(auctionCtx?.data?.auctions || []).slice(0, 30).map((r, i) => {
                        const btc = r.bidToCover;
                        const btcColor =
                          btc == null ? undefined
                            : btc >= 2.5 ? '#10b981'
                              : btc >= 2.0 ? '#fbbf24'
                                : '#f87171';
                        return (
                          <div
                            key={`${r.auctionDate}-${r.securityTerm}-${i}`}
                            className="auc-table-row"
                            role="row"
                          >
                            <span className="auc-td-date" role="cell">
                              {r.auctionDate?.slice(5) || '—'}
                            </span>
                            <span className="auc-td-issue" role="cell" title={`${r.securityType || ''} ${r.securityTerm || ''}`}>
                              {(r.securityType?.[0] || '?')} · {r.securityTerm || '—'}
                            </span>
                            <span className="auc-td-num" role="cell" style={{ color: btcColor }}>
                              {btc != null ? btc.toFixed(2) : '—'}
                            </span>
                            <span className="auc-td-num" role="cell">
                              {r.indirectPct != null ? `${r.indirectPct.toFixed(0)}%` : '—'}
                            </span>
                            <span className="auc-td-num" role="cell">
                              {r.stopYieldPct != null ? `${r.stopYieldPct.toFixed(2)}%` : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bonds-empty">No auction data available</div>
          )}
        </BentoCard>

        <BentoCard
          key="macro"
          title="Macro Indicators"
          subtitle="Fed balance sheet · money · labor · growth · policy rates"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content mi-host"
          source="FRED"
          timestamp={lastUpdated}
          isLive={macroData && Object.keys(macroData).length > 0}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <MacroIndicatorsPanel
            macroData={macroData}
            nationalDebt={nationalDebt}
            debtToGdpHistory={debtToGdpHistory}
            lastUpdated={lastUpdated}
            convertAndFormat={convertAndFormat}
          />
        </BentoCard>

        <BentoCard
          key="ecb-yields"
          title="ECB Policy Rates"
          subtitle="Key rates · €STR · EURIBOR · M3/HICP"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content ecb-host"
          source="ECB SDW"
          timestamp={ecbCtx?.lastUpdated || lastUpdated}
          isLive={!!ecbCtx?.data?.policyRates || !!ecbCtx?.data?.moneyMarket}
          isCurrent={ecbCtx?.isCurrent ?? isCurrent}
          fetchedOn={ecbCtx?.fetchedOn || fetchedOn}
          fetchLog={ecbCtx?.fetchLog || fetchLog}
          error={ecbCtx?.error || error}
        >
          <EcbPolicyRatesPanel data={ecbCtx?.data} />
        </BentoCard>

        <BentoCard
          key="global-rates"
          title="Global Central Bank Policy Rates"
          subtitle="Overnight / policy rates · FRED + ECB"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content mi-host"
          source="FRED / ECB"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <CentralBankRatesPanel
            rates={macroData?.centralBankRates}
            meta={macroData?.centralBankMeta}
            ecbRate={ecbCtx?.data?.policyRates?.mainRefinancing?.value}
          />
        </BentoCard>

        <BentoCard key="treasury-cost" title="Treasury Avg Interest Cost" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="US Treasury Fiscal Data" timestamp={treasuryCostCtx?.lastUpdated || lastUpdated} isLive={!!treasuryCostCtx?.data?.latest} isCurrent={treasuryCostCtx?.isCurrent ?? isCurrent} fetchedOn={treasuryCostCtx?.fetchedOn || fetchedOn} fetchLog={treasuryCostCtx?.fetchLog || fetchLog} error={treasuryCostCtx?.error || error}>
          {treasuryCostCtx?.data?.latest ? (
            <div className="bonds-metrics-grid">
              {Object.entries(treasuryCostCtx.data.latest).map(([type, val]) => (
                <div key={type} className="bonds-metric-row">
                  <span className="bonds-metric-name">{type}</span>
                  <span className="bonds-metric-num">{val?.rate != null ? `${val.rate.toFixed(2)}%` : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bonds-empty">Treasury cost data unavailable</div>
          )}
        </BentoCard>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(BondsDashboard);
