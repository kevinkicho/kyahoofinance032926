import React, { useCallback, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import { useMarketData } from '../../../hub/DataContext';
import EmptyPanelBody from '../../../components/BentoCard/EmptyPanelBody';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import CreditMatrix from './CreditMatrix';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import {
  buildSpreadHistoryOption,
  buildFedBalanceOption,
  buildM2Option,
  buildDebtToGdpOption,
  seriesLevelMeta,
} from './bondsChartOptions';
import { hasBondsKpiMetrics, hasBondsMetricsContent, hasCreditRatingsRows, hasTreasuryCostRates, hasCurveSpreadSeries, hasFedBalanceSeries, hasM2Series, hasDebtGdpSeries, hasForeignHoldersContent, hasMoneyMarketContent, hasAuctionContent, auctionRows, sofrSeriesRows, rrpRows } from './BondsLiveChips.js';
import './BondsDashboard.css';

// KPI panel is a real bento child at row 0 (h:2 = 240px). All other
// panels shifted down by 2 rows. Storage key bumped to avoid stale
// layouts merging with the new schema.
const LAYOUT = {
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
  ],
};

function BondsDashboard({
  yieldCurveData, creditRatingsData, creditRatingsAsOf, spreadIndicators, spreadData, durationLadderData, durationLadderMeta,
  breakevensData, fredYieldHistory, treasuryRates, fedFundsFutures, yieldHistory,
  mortgageSpread, tipsYields, realYieldHistory, macroData, fedBalanceSheetHistory,
  m2HistoryData, nationalDebt, spreadHistory, cpiComponents, debtToGdpHistory,
  isLive, lastUpdated, fetchLog, provenance, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const { convertAndFormat, currentSymbol } = useCurrency();
  // Cross-market data for Foreign Holders + Money Market + auctions panels.
  const ticCtx = useMarketData('treasuryTIC');
  const nyfedCtx = useMarketData('nyfed');
  const auctionCtx = useMarketData('treasuryAuctions');
  const ecbCtx = useMarketData('ecb');
  const treasuryCostCtx = useMarketData('treasuryCost');

  // Top-of-page KPI metrics — clickable via MetricValue (seriesKey wires
  // each pill to FRED ID + source for the popover).
  const kpiItems = useMemo(() => {
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

  const spreadHistoryOption = useMemo(
    () => hasCurveSpreadSeries(spreadHistory) ? buildSpreadHistoryOption(spreadHistory, colors) : null,
    [spreadHistory, colors],
  );

  const fedBalanceOption = useMemo(
    () => hasFedBalanceSeries(fedBalanceSheetHistory) ? buildFedBalanceOption(fedBalanceSheetHistory, colors, currentSymbol) : null,
    [fedBalanceSheetHistory, colors, currentSymbol],
  );

  const m2Option = useMemo(
    () => hasM2Series(m2HistoryData) ? buildM2Option(m2HistoryData, colors, currentSymbol) : null,
    [m2HistoryData, colors, currentSymbol],
  );

  const debtToGdpOption = useMemo(
    () => hasDebtGdpSeries(debtToGdpHistory) ? buildDebtToGdpOption(debtToGdpHistory, colors) : null,
    [debtToGdpHistory, colors],
  );

  // Key metrics sidebar data
  const usCurve = yieldCurveData?.US;
  const steepest = useMemo(() => {
    if (!yieldCurveData) return null;
    let best = null, bestSpread = -Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve?.['30y'], s3m = curve?.['3m'];
      if (s30 != null && s3m != null) {
        const spread = s30 - s3m;
        if (spread > bestSpread) { bestSpread = spread; best = cc; }
      }
    }
    return best ? { country: best, spread: bestSpread } : null;
  }, [yieldCurveData]);

  const flattest = useMemo(() => {
    if (!yieldCurveData) return null;
    let best = null, bestSpread = Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve?.['30y'], s3m = curve?.['3m'];
      if (s30 != null && s3m != null) {
        const spread = s30 - s3m;
        if (spread < bestSpread) { bestSpread = spread; best = cc; }
      }
    }
    return best ? { country: best, spread: bestSpread } : null;
  }, [yieldCurveData]);

  const foreignHoldersOption = useMemo(() => {
    const history = ticCtx?.data?.history;
    const latest = ticCtx?.data?.latest || [];
    if (!history || !latest.length) return null;
    const ranked = latest.filter(r => r.country !== 'All Other').slice(0, 5).map(r => r.country);
    const countries = [...ranked];
    if (history['All Other']) countries.push('All Other');
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

  const moneyMarketOption = useMemo(() => {
    const sofrSeries = sofrSeriesRows(nyfedCtx?.data);
    const rrpSeries = rrpRows(nyfedCtx?.data);
    if (!sofrSeries.length && !rrpSeries.length) return null;
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

  const auctionTrendOption = useMemo(() => {
    const rows = auctionRows(auctionCtx?.data).slice(0, 20).reverse();
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
    const rows = auctionRows(auctionCtx?.data);
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

  // Bridge-panel bodies (hand-written modules own their Body and ignore __render).
  const renderPanel = useCallback((panelId) => {
    switch (panelId) {
      case 'kpi':
        return <MarketKpiStrip kpis={kpiItems} bare />;

      case 'metrics':
        return (
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
        );

      case 'ratings':
        return creditRatingsData?.length
          ? <CreditMatrix creditRatingsData={creditRatingsData} creditRatingsAsOf={creditRatingsAsOf} lastUpdated={lastUpdated} />
          : <EmptyPanelBody message="No credit ratings data" />;

      case 'curvespreads':
        return spreadHistoryOption
          ? <SafeECharts option={spreadHistoryOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Credit Spread History', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'T10Y2Y' }], updatedAt: lastUpdated }} />
          : <EmptyPanelBody message="No curve spread history" />;

      case 'fed': {
        const meta = seriesLevelMeta(fedBalanceSheetHistory);
        return fedBalanceOption ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {meta && (
              <div style={{ display: 'flex', gap: 10, padding: '2px 6px 4px', fontSize: 11, flexWrap: 'wrap' }}>
                <span><strong>{currentSymbol}{meta.latest?.toFixed?.(2) ?? meta.latest}T</strong> WALCL</span>
                {meta.yoy != null && (
                  <span style={{ color: meta.yoy >= 0 ? '#4ade80' : '#f87171' }}>
                    ~12m {meta.yoy >= 0 ? '+' : ''}{meta.yoy.toFixed(1)}%
                  </span>
                )}
                {meta.asOf && <span style={{ opacity: 0.55 }}>{meta.asOf}</span>}
                {Array.isArray(nyfedCtx?.data?.rrp) && nyfedCtx.data.rrp[0]?.acceptedB != null && (
                  <span style={{ opacity: 0.8 }}>
                    ON RRP ${Number(nyfedCtx.data.rrp[0].acceptedB).toFixed(0)}B
                  </span>
                )}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <SafeECharts option={fedBalanceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fed Balance Sheet', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'WALCL' }], updatedAt: lastUpdated }} />
            </div>
          </div>
        ) : <EmptyPanelBody message="No Fed balance sheet data" />;
      }

      case 'm2': {
        const meta = seriesLevelMeta(m2HistoryData);
        return m2Option ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {meta && (
              <div style={{ display: 'flex', gap: 10, padding: '2px 6px 4px', fontSize: 11, flexWrap: 'wrap' }}>
                <span><strong>{currentSymbol}{meta.latest?.toFixed?.(2) ?? meta.latest}T</strong> M2</span>
                {meta.yoy != null && (
                  <span style={{ color: meta.yoy >= 0 ? '#4ade80' : '#f87171' }}>
                    YoY {meta.yoy >= 0 ? '+' : ''}{meta.yoy.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <SafeECharts option={m2Option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'M2 Money Supply', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'M2SL' }], updatedAt: lastUpdated }} />
            </div>
          </div>
        ) : <EmptyPanelBody message="No M2 data" />;
      }

      case 'debtgdp': {
        const meta = seriesLevelMeta(debtToGdpHistory);
        return debtToGdpOption ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {meta && (
              <div style={{ display: 'flex', gap: 10, padding: '2px 6px 4px', fontSize: 11, flexWrap: 'wrap' }}>
                <span><strong>{meta.latest?.toFixed?.(1) ?? meta.latest}%</strong> Debt/GDP</span>
                {meta.yoy != null && (
                  <span style={{ color: meta.yoy >= 0 ? '#f87171' : '#4ade80' }}>
                    Δ {meta.yoy >= 0 ? '+' : ''}{meta.yoy.toFixed(1)}%
                  </span>
                )}
                {nationalDebt != null && (
                  <span style={{ opacity: 0.75 }}>
                    Debt <MetricValue value={nationalDebt} seriesKey="nationalDebt" timestamp={lastUpdated} format={(v) => `${currentSymbol}${(Number(v) / 1e12).toFixed(2)}T`} />
                  </span>
                )}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <SafeECharts option={debtToGdpOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Debt-to-GDP', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'GFDEBTN' }], updatedAt: lastUpdated }} />
            </div>
          </div>
        ) : <EmptyPanelBody message="No debt-to-GDP data" />;
      }

      case 'foreign-holders':
        return foreignHoldersOption ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {(ticCtx?.data?.latest || []).filter((r) => r.country !== 'All Other').slice(0, 5).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 4, padding: '2px 6px 4px', fontSize: 10 }}>
                {(ticCtx?.data?.latest || []).filter((r) => r.country !== 'All Other').slice(0, 5).map((r) => (
                  <React.Fragment key={r.country}>
                    <span style={{ opacity: 0.85 }}>{r.country}</span>
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ${Number(r.holdingsB).toFixed(0)}B
                    </span>
                    <span style={{
                      textAlign: 'right',
                      color: r.change1m == null ? undefined : r.change1m >= 0 ? '#4ade80' : '#f87171',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {r.change1m == null ? '—' : `${r.change1m >= 0 ? '+' : ''}${Number(r.change1m).toFixed(1)}`}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <SafeECharts option={foreignHoldersOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Foreign Holders', source: 'US Treasury TIC', endpoint: '/api/treasury/tic', series: [], updatedAt: ticCtx?.lastUpdated || lastUpdated }} />
            </div>
          </div>
        ) : <div className="bonds-empty">No TIC data available</div>;

      case 'money-market':
        return moneyMarketOption ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 12, padding: '2px 6px 4px', fontSize: 11, flexWrap: 'wrap' }}>
              {nyfedCtx?.data?.sofr?.latest != null && (
                <span>SOFR <strong>{Number(nyfedCtx.data.sofr.latest.rate ?? nyfedCtx.data.sofr.latest).toFixed?.(2) ?? nyfedCtx.data.sofr.latest}%</strong></span>
              )}
              {Array.isArray(nyfedCtx?.data?.rrp) && nyfedCtx.data.rrp[0]?.acceptedB != null && (
                <span>ON RRP <strong>${Number(nyfedCtx.data.rrp[0].acceptedB).toFixed(0)}B</strong></span>
              )}
              {nyfedCtx?.data?.effr != null && (
                <span>EFFR <strong>{Number(nyfedCtx.data.effr.latest ?? nyfedCtx.data.effr).toFixed?.(2)}%</strong></span>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <SafeECharts option={moneyMarketOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Money Market', source: 'NY Fed Markets', endpoint: '/api/nyfed', series: [], updatedAt: nyfedCtx?.lastUpdated || lastUpdated }} />
            </div>
          </div>
        ) : <div className="bonds-empty">No NY Fed data available</div>;

      case 'auctions':
        return auctionTrendOption ? (
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
                  Recent results · {auctionRows(auctionCtx?.data).length} auctions
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
                    {auctionRows(auctionCtx?.data).slice(0, 30).map((r, i) => {
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
        );

      case 'treasury-cost':
        return treasuryCostCtx?.data?.latest ? (
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
        );

      default:
        return null;
    }
  }, [
    kpiItems, usCurve, lastUpdated, steepest, flattest, spreadIndicators, spreadHistory,
    tipsYields, macroData, nationalDebt, convertAndFormat, debtToGdpHistory, breakevensData,
    fedFundsFutures, spreadData, creditRatingsData, creditRatingsAsOf, spreadHistoryOption,
    fedBalanceOption, m2Option, debtToGdpOption, foreignHoldersOption, moneyMarketOption,
    auctionTrendOption, auctionDemandSummary, auctionCtx, ticCtx, nyfedCtx, treasuryCostCtx,
  ]);

  const panelCtx = useMemo(() => ({
    bonds: {
      yieldCurveData,
      spreadIndicators,
      spreadData,
      mortgageSpread,
      tipsYields,
      realYieldHistory,
      breakevensData,
      durationLadderData,
      durationLadderMeta,
      treasuryRates,
      fedFundsFutures,
      cpiComponents,
      macroData,
      nationalDebt,
      debtToGdpHistory,
      convertAndFormat,
      lastUpdated,
      fredYieldHistory,
      yieldHistory,
    },
    ecb: ecbCtx,
    treasuryTIC: ticCtx,
    nyfed: nyfedCtx,
    treasuryAuctions: auctionCtx,
    treasuryCost: treasuryCostCtx,
    __render: renderPanel,
    __live: {
      kpi: hasBondsKpiMetrics({ treasuryRates, yieldCurveData, spreadIndicators, fedFundsFutures, spreadData, breakevensData }),
      metrics: hasBondsMetricsContent({ yieldCurveData, spreadIndicators, spreadHistory, tipsYields, macroData, nationalDebt, debtToGdpHistory, breakevensData, fedFundsFutures, spreadData }),
      ratings: hasCreditRatingsRows(creditRatingsData),
      curvespreads: hasCurveSpreadSeries(spreadHistory),
      fed: hasFedBalanceSeries(fedBalanceSheetHistory),
      m2: hasM2Series(m2HistoryData),
      debtgdp: hasDebtGdpSeries(debtToGdpHistory),
      'foreign-holders': hasForeignHoldersContent(ticCtx?.data),
      'money-market': hasMoneyMarketContent(nyfedCtx?.data),
      auctions: hasAuctionContent(auctionCtx?.data),
      'treasury-cost': hasTreasuryCostRates(treasuryCostCtx?.data?.latest),
    },
    __subtitle: {
      kpi: 'US Treasury yields · Fed funds · curve spread · credit spreads · 5Y breakeven',
      curvespreads: '2s10s · 10s3m · 5s30s',
      'foreign-holders': 'Top-5 + All Other · 12-month rotation · USD billions',
      'money-market': 'SOFR (left) · ON RRP volume (right) · last 30 days',
      auctions: auctionDemandSummary
        ? `${auctionDemandSummary.demandLabel} demand · avg BTC ${auctionDemandSummary.avgBidToCover?.toFixed(2) ?? '—'} · indirect ${auctionDemandSummary.avgIndirectPct?.toFixed(0) ?? '—'}%`
        : 'Bid-to-cover trend · indirect-bidder share = foreign demand proxy',
    },
    __disabled: {
      ratings: !creditRatingsData?.length,
      curvespreads: !spreadHistoryOption,
      fed: !fedBalanceOption,
      m2: !m2Option,
      debtgdp: !debtToGdpOption,
    },
  }), [
    yieldCurveData, spreadIndicators, spreadData, mortgageSpread, tipsYields,
    realYieldHistory, breakevensData, durationLadderData, durationLadderMeta,
    treasuryRates, fedFundsFutures, cpiComponents, macroData, nationalDebt,
    debtToGdpHistory, convertAndFormat, lastUpdated, fredYieldHistory, yieldHistory,
    ecbCtx, ticCtx, nyfedCtx, auctionCtx, treasuryCostCtx, renderPanel,
    creditRatingsAsOf, creditRatingsData, spreadHistory, fedBalanceSheetHistory,
    m2HistoryData, auctionDemandSummary, spreadHistoryOption, fedBalanceOption,
    m2Option, debtToGdpOption,
  ]);

  return (
    <div className="bonds-dashboard bonds-dashboard--bento">
      <MarketPanelGrid
        marketId="bonds"
        layout={LAYOUT}
        storageKey="bonds-layout-v9"
        accent="bonds"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
      />
    </div>
  );
}

export default React.memo(BondsDashboard);
