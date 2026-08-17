import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import SafeECharts from '../../../components/SafeECharts';
import CountryDetailPanel from './CountryDetailPanel';
import MetricValue from '../../../components/MetricValue/MetricValue';
// Merged-in panels from former IMF + World Bank tabs.
import ImfReserves, { hasReserveRows } from '../../imf/ImfReserves';
import ImfCofier from '../../imf/ImfCofier';
import WbDevScatter from '../../worldbank/WbDevScatter';
import WbTradeOpenness from '../../worldbank/WbTradeOpenness';
import ClevelandNowcastPanel from './ClevelandNowcastPanel';
import { GdpBars, CpiBars, RateBars, DebtBars } from './MacroBarCharts';
import {
  hasMacroKpiMetrics,
  hasScorecardRows,
  hasRateBarRows,
  hasDebtBarRows,
  hasMacroSidebarContent,
  hasActivityContent,
  hasCliRows,
  hasWbTradeRows,
  hasWbDevRows,
  hasEcbEurContent,
  hasTgaSeries,
  hasGdpNowEvolution,
  hasFomcSepProjections,
  hasClevelandNowcast,
  hasBeaAccountsRows,
  hasEurostatRows,
  hasOecdDirectRows,
  hasBeaIncomeContent,
  hasImfCoferShares,
  hasGlobalLiquidityContent,
  ecbM3GrowthRows,
  dtsSeriesRows,
  gdpNowEvolutionRows,
  gdpNowPriorQuarterRows,
} from './MacroLiveChips.js';
import './GlobalMacroDashboard.css';


// KPI strip is now a real bento child at row 0 (h:2). Other panels shifted
// down by 2 rows. IMF + World Bank panels are merged in below at y=14+.
const LAYOUT = {
  lg: [
    { i: 'kpi',       x: 0, y: 0,  w: 12, h: 2 },
    { i: 'sidebar',   x: 8, y: 2,  w: 4,  h: 5 },
    { i: 'scorecard', x: 0, y: 2,  w: 8,  h: 3 },
    { i: 'gdp',       x: 0, y: 5,  w: 4,  h: 3 },
    { i: 'cpi',       x: 4, y: 5,  w: 4,  h: 3 },
    { i: 'rates',     x: 0, y: 8,  w: 4,  h: 3 },
    { i: 'debt',      x: 4, y: 8,  w: 4,  h: 3 },
    { i: 'cxstrength',x: 8, y: 7,  w: 4,  h: 3 },
    { i: 'activity',  x: 0, y: 11, w: 6,  h: 3 },
    { i: 'cli',       x: 6, y: 11, w: 6,  h: 3 },
    // IMF + WB merged panels — conditionally rendered when those endpoints
    // return data; layout entries are present so RGL has positions ready.
    { i: 'imf-reserves', x: 0, y: 14, w: 6,  h: 4 },
    { i: 'imf-cofer',    x: 6, y: 14, w: 6,  h: 4 },
    { i: 'wb-trade',     x: 0, y: 18, w: 6,  h: 4 },
    { i: 'wb-dev',       x: 6, y: 18, w: 6,  h: 4 },
    // Tier-1 addition: ECB euro-area policy stance + price/money signals.
    { i: 'ecb-eur',      x: 0, y: 22, w: 12, h: 5 },
    // Tier-1 addition (2026-05-04): US Treasury DTS — TGA cash balance and
    // daily net flow. Sourced from /api/treasury/dts via useMarketData.
    { i: 'tga-balance',  x: 0, y: 27, w: 12, h: 4 },
    // Federal Reserve panels (2026-05-04): Atlanta GDPNow, FOMC SEP, and
    // Cleveland Fed inflation nowcast. All three live in the macro tab
    // because they're forward-looking US macro indicators.
    { i: 'gdpnow',       x: 0, y: 31, w: 6,  h: 4 },
    { i: 'fomc-sep',     x: 6, y: 31, w: 6,  h: 4 },
    { i: 'cleveland',    x: 0, y: 35, w: 12, h: 5 },
    { i: 'bea-accounts', x: 0, y: 40, w: 6,  h: 4 },
    { i: 'eurostat',     x: 6, y: 40, w: 6,  h: 4 },
    { i: 'oecd-direct',  x: 0, y: 44, w: 12, h: 4 },
    { i: 'bea-income',   x: 0, y: 48, w: 12, h: 4 },
    // KPI strip + 2×2 chart grid (rowHeight 120 → ~720px usable).
    { i: 'global-liquidity', x: 0, y: 52, w: 12, h: 6 },
  ]
};

function GlobalMacroDashboard({
  kpiSidebar,
  scorecardData, growthInflationData, centralBankData, debtData,
  m2Growth, tradeBalance, industrialProd, consumerSentiment, yieldSpread, cfnai, oecdCli, oecdCliDetail, cpiBreakdown,
  imfData, wbData,
  ecbData, ecbLastUpdated,
  dtsData, dtsLastUpdated,
  sepData, sepLastUpdated,
  gdpNowData, gdpNowLastUpdated,
  cleveData, cleveLastUpdated,
  beaData, beaLastUpdated, beaCtx,
  eurostatData, eurostatLastUpdated, eurostatCtx,
  oecdData, oecdLastUpdated, oecdCtx,
  fetchLog, isLive, lastUpdated, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const { convertAndFormat, currentSymbol } = useCurrency();
  const [selectedCountry, setSelectedCountry] = useState(null);
  const fxCtx = useMarketData('fx');

  const sortedByGdp = useMemo(() => {
    if (!Array.isArray(scorecardData)) return [];
    return [...scorecardData].sort((a, b) => (b.gdp ?? -999) - (a.gdp ?? -999));
  }, [scorecardData]);

  const sortedByCpi = useMemo(() => {
    if (!Array.isArray(scorecardData)) return [];
    return [...scorecardData].sort((a, b) => (a.cpi ?? 999) - (b.cpi ?? 999));
  }, [scorecardData]);

  const gdpHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v >= 3) return 'mac-heat-dg'; if (v >= 1) return 'mac-heat-lg'; if (v >= 0) return 'mac-heat-neu'; return 'mac-heat-dr'; };
  const cpiHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 2) return 'mac-heat-dg'; if (v <= 4) return 'mac-heat-lg'; if (v <= 6) return 'mac-heat-lr'; return 'mac-heat-dr'; };
  const rateHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 3) return 'mac-heat-dg'; if (v <= 6) return 'mac-heat-lg'; return 'mac-heat-lr'; };
  const unempHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 4) return 'mac-heat-dg'; if (v <= 6) return 'mac-heat-lg'; if (v <= 8) return 'mac-heat-lr'; return 'mac-heat-dr'; };
  const debtHeat = (v) => { if (v == null) return 'mac-heat-neu'; if (v <= 60) return 'mac-heat-dg'; if (v <= 90) return 'mac-heat-lg'; if (v <= 120) return 'mac-heat-lr'; return 'mac-heat-dr'; };

  // ECB HICP — line chart, last ~24 months. Reference line at the 2% target.
  const hicpOption = useMemo(() => {
    const series = ecbData?.hicpDetail || [];
    if (!series.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: { left: 36, right: 12, top: 8, bottom: 24 },
      tooltip: { trigger: 'axis', formatter: p => `${p[0].axisValue}<br/>HICP YoY: ${p[0].value.toFixed(2)}%` },
      xAxis: { type: 'category', data: series.map(p => p.period), axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.ceil(series.length / 6) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { formatter: v => `${v.toFixed(1)}%`, color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        data: series.map(p => p.value),
        lineStyle: { color: '#ef4444', width: 2 },
        itemStyle: { color: '#ef4444' },
        areaStyle: { color: 'rgba(239, 68, 68, 0.12)' },
        markLine: { silent: true, symbol: 'none', lineStyle: { color: '#4ade80', type: 'dashed', width: 1 }, data: [{ yAxis: 2, label: { show: true, formatter: 'ECB target 2%', color: '#4ade80', fontSize: 9 } }] },
      }],
    };
  }, [ecbData, colors]);

  // ECB M3 — last 12 monthly observations as bars (annual rate of change).
  const m3Option = useMemo(() => {
    const series = ecbM3GrowthRows(ecbData).slice(-12);
    if (!series.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: { left: 36, right: 12, top: 8, bottom: 24 },
      tooltip: { trigger: 'axis', formatter: p => `${p[0].axisValue}<br/>M3 YoY: ${p[0].value.toFixed(2)}%` },
      xAxis: { type: 'category', data: series.map(p => p.period), axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.ceil(series.length / 6) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { formatter: v => `${v.toFixed(1)}%`, color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'bar',
        data: series.map(p => p.value),
        itemStyle: { color: '#3b82f6', borderRadius: [3, 3, 0, 0] },
      }],
    };
  }, [ecbData, colors]);

  // ── TGA Cash Balance + daily net flow (US Treasury DTS) ────────────────
  // Closing balance line (left axis) + net deposits-minus-withdrawals bar
  // (right axis). When TGA rises faster than the Treasury issues, it
  // drains private-sector liquidity; falling TGA does the opposite.
  const tgaOption = useMemo(() => {
    const series = dtsSeriesRows(dtsData).slice(-90); // ~4 trading months
    if (!series.length) return null;
    const dates = series.map(p => p.date);
    const closeVals = series.map(p => p.closeB);
    const netVals = series.map(p => p.netB);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: ps => {
        const i = ps[0]?.dataIndex;
        const r = series[i];
        if (!r) return '';
        return `<b>${r.date}</b><br/>TGA close: $${r.closeB?.toFixed(0)}B<br/>Deposits: $${r.depositsB?.toFixed(0)}B<br/>Withdrawals: $${r.withdrawalsB?.toFixed(0)}B<br/>Net: ${r.netB > 0 ? '+' : ''}$${r.netB?.toFixed(0)}B`;
      }},
      legend: { data: ['TGA close ($B)', 'Net flow ($B)'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 56, bottom: 28, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: [
        { type: 'value', name: '$B', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'value', name: 'Net $B', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, position: 'right', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { show: false } },
      ],
      series: [
        { name: 'TGA close ($B)', type: 'line', yAxisIndex: 0, data: closeVals, symbol: 'none', smooth: true, lineStyle: { color: '#22d3ee', width: 2 }, areaStyle: { color: 'rgba(34, 211, 238, 0.08)' } },
        { name: 'Net flow ($B)', type: 'bar', yAxisIndex: 1, data: netVals, itemStyle: {
          color: p => p.value >= 0 ? '#10b98155' : '#ef444455',
        }, barWidth: 4 },
      ],
    };
  }, [dtsData, colors]);

  // ── Atlanta GDPNow — current quarter evolution ──────────────────────────
  // Bar chart of: BEA actual prior quarters + each in-quarter release with
  // its post-release nowcast. New-data shocks read directly off the chart.
  const gdpNowOption = useMemo(() => {
    const prior = gdpNowPriorQuarterRows(gdpNowData);
    const evo = gdpNowEvolutionRows(gdpNowData);
    if (!prior.length && !evo.length) return null;
    // Concatenate prior actuals + current-quarter nowcast evolution. Use the
    // event label as the x-axis category. Color the prior actuals neutral
    // grey and the current quarter cyan so the eye separates them.
    const all = [
      ...prior.map(r => ({ label: (r.event.match(/(\d{2}:Q[1-4])/i) || [, 'BEA'])[1] + ' actual', value: r.gdp, kind: 'prior' })),
      ...evo.map(r => ({ label: r.event, value: r.gdp, kind: 'current' })),
    ];
    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 56, left: 36 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: ps => {
        const i = ps[0]?.dataIndex;
        const r = all[i];
        return r ? `<b>${r.label}</b><br/>${r.value?.toFixed(2)}%` : '';
      }},
      xAxis: { type: 'category', data: all.map(r => r.label), axisLabel: { color: colors.textMuted, fontSize: 9, interval: 0, rotate: 35, formatter: s => s.length > 18 ? s.slice(0, 18) + '…' : s }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'bar',
        data: all.map(r => ({ value: r.value, itemStyle: { color: r.kind === 'prior' ? '#94a3b8' : '#22d3ee' } })),
        label: { show: true, position: 'top', formatter: p => p.value?.toFixed(2) + '%', color: colors.textSecondary, fontSize: 9 },
        barWidth: 18,
      }],
    };
  }, [gdpNowData, colors]);

  const cfnaiStatus = useMemo(() => {
    const v = cfnai?.latest ?? cfnai?.values?.[cfnai.values?.length - 1];
    if (v == null) return { label: '—', color: colors.textMuted };
    if (v < -0.7) return { label: 'Recession', color: '#ef4444' };
    if (v < -0.3) return { label: 'Contraction', color: '#f87171' };
    if (v < 0) return { label: 'Below Trend', color: '#fbbf24' };
    if (v < 0.3) return { label: 'Near Trend', color: '#a3e635' };
    return { label: 'Above Trend', color: '#4ade80' };
  }, [cfnai, colors.textMuted]);

  const cfnaiMiniOption = useMemo(() => {
    if (!cfnai?.dates?.length || !cfnai?.values?.length) return null;
    const dates = cfnai.dates.slice(-36);
    const values = cfnai.values.slice(-36);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: ps => {
          const p = ps[0];
          const v = p?.value;
          return p ? `${p.axisValue}<br/>CFNAI: ${typeof v === 'number' ? v.toFixed(2) : '—'}` : '';
        },
      },
      grid: { left: 36, right: 12, top: 8, bottom: 20 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 5)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 2 },
        areaStyle: { color: 'rgba(167, 139, 250, 0.12)' },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0 }, { yAxis: -0.7 }], lineStyle: { color: colors.textDim, type: 'dashed', width: 1 } },
      }],
    };
  }, [cfnai, colors]);

  const beaSummary = useMemo(() => {
    // Partial/hollow BEA payloads often set fields to null (not undefined) —
    // default params do not apply to null, so always coerce to an array.
    const latestByDesc = (rows, match) => {
      if (!Array.isArray(rows) || !match) return null;
      return rows.find(r => (r.desc || '').toLowerCase().includes(match)) || null;
    };
    return {
      gdp: latestByDesc(beaData?.gdpComponents, 'gross domestic product'),
      consumption: latestByDesc(beaData?.gdpComponents, 'personal consumption'),
      investment: latestByDesc(beaData?.gdpComponents, 'gross private domestic investment'),
      income: latestByDesc(beaData?.personalIncome, 'personal income'),
      saving: latestByDesc(beaData?.savingRate, 'personal saving as a percentage'),
    };
  }, [beaData]);

  const beaIncomeRows = useMemo(() => {
    const rows = Array.isArray(beaData?.savingRate) ? beaData.savingRate : [];
    const latestPeriod = rows[0]?.period;
    return rows
      .filter(row => row.period === latestPeriod && row.value != null)
      .filter(row => {
        const desc = (row.desc || '').toLowerCase();
        return desc.includes('personal income')
          || desc.includes('disposable personal income')
          || desc.includes('personal outlays')
          || desc.includes('personal consumption')
          || desc.includes('personal saving');
      })
      .sort((a, b) => Number(a.line ?? 0) - Number(b.line ?? 0))
      .slice(0, 8)
      .map(row => ({
        label: row.desc || row.lineDescription || row.line || 'Personal income',
        period: row.period || row.timePeriod || row.year || null,
        value: Number(row.value),
      }));
  }, [beaData]);

  const beaIncomeCycleOption = useMemo(() => {
    const rows = (Array.isArray(beaData?.savingRate) ? beaData.savingRate : [])
      .filter(r => (r.desc || '').toLowerCase().includes('personal saving as a percentage'))
      .slice()
      .reverse()
      .slice(-60);
    if (!rows.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: v => v != null ? `${Number(v).toFixed(1)}%` : '—' },
      grid: { top: 12, right: 12, bottom: 24, left: 42 },
      xAxis: { type: 'category', data: rows.map(r => r.period), axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(rows.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        name: 'Personal saving rate',
        type: 'line',
        data: rows.map(r => Number(r.value)),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#10b981', width: 2 },
        areaStyle: { color: 'rgba(16, 185, 129, 0.1)' },
      }],
    };
  }, [beaData, colors]);

  const globalLiquidity = useMemo(() => {
    const tgaLatest = dtsData?.latest || dtsData?.series?.at?.(-1);
    const tgaPrior = dtsData?.series?.at?.(-6);
    const tgaChange5d = tgaLatest?.closeB != null && tgaPrior?.closeB != null ? tgaLatest.closeB - tgaPrior.closeB : null;
    const m3Latest = ecbData?.m3Growth?.at?.(-1);
    const saving = beaSummary.saving;
    const gdpNow = gdpNowData?.latest?.gdp ?? gdpNowData?.evolution?.at?.(-1)?.gdp;
    const contrib = {
      tga: tgaChange5d != null ? Math.max(-25, Math.min(25, -tgaChange5d / 10)) : 0,
      m3: m3Latest?.value != null ? Math.max(-20, Math.min(20, (m3Latest.value - 3) * 4)) : 0,
      saving: saving?.value != null ? Math.max(-15, Math.min(15, (Number(saving.value) - 4) * -3)) : 0,
      gdpNow: gdpNow != null ? Math.max(-20, Math.min(20, (gdpNow - 2) * 4)) : 0,
    };
    const drainScore = contrib.tga + contrib.m3 + contrib.saving + contrib.gdpNow;
    const label = drainScore >= 15 ? 'Supportive' : drainScore <= -15 ? 'Tightening' : 'Neutral';
    return { tgaLatest, tgaChange5d, m3Latest, saving, gdpNow, drainScore, label, contrib };
  }, [dtsData, ecbData, beaSummary, gdpNowData]);

  // Compact chart options for Global Liquidity (reuse series, denser grids).
  const liqTgaOption = useMemo(() => {
    const series = dtsSeriesRows(dtsData).slice(-60);
    if (!series.length) return null;
    const dates = series.map(p => p.date);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (ps) => {
          const i = ps[0]?.dataIndex;
          const r = series[i];
          if (!r) return '';
          return `<b>${r.date}</b><br/>Close: $${r.closeB?.toFixed(0)}B<br/>Net: ${r.netB > 0 ? '+' : ''}$${r.netB?.toFixed(0)}B`;
        },
      },
      grid: { top: 8, right: 8, bottom: 18, left: 36, containLabel: false },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: colors.textMuted, fontSize: 8, interval: Math.max(0, Math.floor(dates.length / 4)) },
        axisLine: { lineStyle: { color: colors.cardBg } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 8, formatter: v => `$${v}` },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      },
      series: [{
        type: 'line',
        data: series.map(p => p.closeB),
        symbol: 'none',
        smooth: true,
        lineStyle: { color: '#22d3ee', width: 1.75 },
        areaStyle: { color: 'rgba(34, 211, 238, 0.12)' },
      }],
    };
  }, [dtsData, colors]);

  const liqM3Option = useMemo(() => {
    const series = ecbM3GrowthRows(ecbData).slice(-24);
    if (!series.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (ps) => {
          const p = ps[0];
          return p ? `${p.axisValue}<br/>M3 YoY: ${Number(p.value).toFixed(2)}%` : '';
        },
      },
      grid: { top: 8, right: 8, bottom: 18, left: 32, containLabel: false },
      xAxis: {
        type: 'category',
        data: series.map(p => p.period),
        axisLabel: { color: colors.textMuted, fontSize: 8, interval: Math.max(0, Math.floor(series.length / 5)) },
        axisLine: { lineStyle: { color: colors.cardBg } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 8, formatter: v => `${v}%` },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      },
      series: [{
        type: 'bar',
        data: series.map(p => ({
          value: p.value,
          itemStyle: {
            color: p.value >= 3 ? '#22c55e' : p.value >= 1.5 ? '#f59e0b' : '#f87171',
            borderRadius: [2, 2, 0, 0],
          },
        })),
        barMaxWidth: 10,
      }],
    };
  }, [ecbData, colors]);

  const liqSavingOption = useMemo(() => {
    const rows = (Array.isArray(beaData?.savingRate) ? beaData.savingRate : [])
      .filter(r => (r.desc || '').toLowerCase().includes('personal saving as a percentage'))
      .slice()
      .reverse()
      .slice(-36);
    if (!rows.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        valueFormatter: v => (v != null ? `${Number(v).toFixed(1)}%` : '—'),
      },
      grid: { top: 8, right: 8, bottom: 18, left: 32, containLabel: false },
      xAxis: {
        type: 'category',
        data: rows.map(r => r.period),
        axisLabel: { color: colors.textMuted, fontSize: 8, interval: Math.max(0, Math.floor(rows.length / 5)) },
        axisLine: { lineStyle: { color: colors.cardBg } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 8, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      },
      series: [{
        type: 'line',
        data: rows.map(r => r.value),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 1.75 },
        areaStyle: { color: 'rgba(167, 139, 250, 0.12)' },
      }],
    };
  }, [beaData, colors]);

  const liqContribOption = useMemo(() => {
    const c = globalLiquidity.contrib;
    if (!c) return null;
    const rows = [
      { name: 'TGA flow', value: c.tga },
      { name: 'ECB M3', value: c.m3 },
      { name: 'Saving', value: c.saving },
      { name: 'GDPNow', value: c.gdpNow },
    ];
    if (!rows.some(r => Number.isFinite(r.value) && r.value !== 0) && globalLiquidity.drainScore == null) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (ps) => {
          const p = ps[0];
          if (!p) return '';
          const v = Number(p.value);
          return `${p.name}<br/>Contribution: ${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
        },
      },
      grid: { top: 8, right: 12, bottom: 8, left: 64, containLabel: false },
      xAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 8 },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: rows.map(r => r.name),
        axisLabel: { color: colors.textSecondary, fontSize: 9 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: rows.map(r => ({
          value: r.value,
          itemStyle: {
            color: r.value > 0 ? '#22c55e' : r.value < 0 ? '#f87171' : '#94a3b8',
            borderRadius: r.value >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3],
          },
        })),
        barWidth: 12,
        label: {
          show: true,
          position: 'right',
          formatter: (p) => {
            const v = Number(p.value);
            return `${v >= 0 ? '+' : ''}${v.toFixed(0)}`;
          },
          color: colors.textMuted,
          fontSize: 9,
        },
      }],
    };
  }, [globalLiquidity, colors]);

  const eurostatOption = useMemo(() => {
    const rows = [
      ...(Array.isArray(eurostatData?.hicp) ? eurostatData.hicp : []).map(r => ({ ...r, metric: 'HICP' })),
      ...(Array.isArray(eurostatData?.unemployment) ? eurostatData.unemployment : []).map(r => ({ ...r, metric: 'Unemployment' })),
      ...(Array.isArray(eurostatData?.govtDeficit) ? eurostatData.govtDeficit : []).map(r => ({ ...r, metric: 'Govt Deficit' })),
    ];
    if (!rows.length) return null;
    const latest = ['HICP', 'Unemployment', 'Govt Deficit'].map(metric => [...rows].reverse().find(r => r.metric === metric)).filter(Boolean);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 12, right: 12, bottom: 24, left: 80 },
      xAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'category', data: latest.map(r => r.metric), axisLabel: { color: colors.textSecondary, fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{ type: 'bar', data: latest.map(r => ({ value: r.value, itemStyle: { color: r.metric === 'HICP' ? '#f59e0b' : r.metric === 'Unemployment' ? '#ef4444' : '#a78bfa' } })), barWidth: 16 }],
    };
  }, [eurostatData, colors]);

  const oecdDirectRows = useMemo(() => {
    const cli = oecdData?.cli && typeof oecdData.cli === 'object' ? oecdData.cli : {};
    return Object.entries(cli).map(([code, rows]) => {
      const series = Array.isArray(rows) ? rows : [];
      const latest = series[series.length - 1];
      const prior = series[Math.max(0, series.length - 4)];
      return {
        code,
        value: latest?.value ?? null,
        period: latest?.period ?? null,
        momentum: latest?.value != null && prior?.value != null ? latest.value - prior.value : null,
      };
    }).filter(r => r.value != null).sort((a, b) => (b.momentum ?? -99) - (a.momentum ?? -99));
  }, [oecdData]);

  const oecdDirectOption = useMemo(() => {
    if (!oecdDirectRows.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: v => v != null ? Number(v).toFixed(2) : '—' },
      grid: { top: 12, right: 16, bottom: 24, left: 42 },
      xAxis: { type: 'category', data: oecdDirectRows.map(r => r.code), axisLabel: { color: colors.textMuted, fontSize: 9 }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'bar',
        data: oecdDirectRows.map(r => ({ value: r.momentum, itemStyle: { color: (r.momentum ?? 0) >= 0 ? '#22c55e' : '#ef4444' } })),
        barWidth: 18,
      }],
    };
  }, [oecdDirectRows, colors]);

  // Always mount the bento shell. Returning null when scorecard is empty made
  // Macro look "crashed" (blank mac-market) while other tabs still worked.
  const scorecard = Array.isArray(scorecardData) ? scorecardData : [];

  // Compose independent panels via MarketPanelGrid bridge (__render).
  // Note: layout key `cxstrength` has no BentoCard body and no MARKET_PANELS entry.
  const panelBodies = {
        kpi: (
          kpiSidebar || <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>Macro KPI strip loading…</div>
        ),

        sidebar: (
          <>
            <div className="mac-sidebar-section">
              <div className="mac-sidebar-title">GDP Growth</div>
              <GdpBars data={sortedByGdp} lastUpdated={lastUpdated} />
            </div>
            <div className="mac-sidebar-section">
              <div className="mac-sidebar-title">Inflation</div>
              <CpiBars data={sortedByCpi} lastUpdated={lastUpdated} />
            </div>
            <div className="mac-sidebar-section">
              <div className="mac-sidebar-title">CB Rates</div>
              <RateBars data={centralBankData} lastUpdated={lastUpdated} />
            </div>
            <div className="mac-sidebar-section" style={{ borderBottom: 'none' }}>
              <div className="mac-sidebar-title">Debt/GDP</div>
              <DebtBars data={debtData} lastUpdated={lastUpdated} convertAndFormat={convertAndFormat} currentSymbol={currentSymbol} />
            </div>
          </>
        ),

        scorecard: (
              <div className="mac-scorecard-compact" style={{ background: colors.bgCard }}>
                <div className="mac-scorecard-header-row">
                  <div className="mac-scorecell mac-scorecell-flag"></div>
                  <div className="mac-scorecell mac-scorecell-country">Country</div>
                  <div className="mac-scorecell">GDP</div>
                  <div className="mac-scorecell">CPI</div>
                  <div className="mac-scorecell">Rate</div>
                  <div className="mac-scorecell">Unemp</div>
                  <div className="mac-scorecell">Debt</div>
                </div>
                {scorecard.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted, #888)', fontSize: '0.85rem' }}>
                    Scorecard unavailable — other macro panels still load when data arrives
                  </div>
                ) : scorecard.map(country => (
                  <div
                    key={country.code}
                    className={`mac-scorecard-row ${selectedCountry?.code === country.code ? 'selected' : ''}`}
                    onClick={() => setSelectedCountry(country)}
                    style={{ background: selectedCountry?.code === country.code ? 'rgba(20, 184, 166, 0.1)' : 'transparent' }}
                  >
                    <div className="mac-scorecell mac-scorecell-flag">{country.flag}</div>
                    <div className="mac-scorecell mac-scorecell-country">{country.code}</div>
                    <div className={`mac-scorecell ${gdpHeat(country.gdp)}`}><MetricValue value={country.gdp} seriesKey="gdp" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${cpiHeat(country.cpi)}`}><MetricValue value={country.cpi} seriesKey="cpiBreakdown" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${rateHeat(country.rate)}`}><MetricValue value={country.rate} seriesKey="fedRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${unempHeat(country.unemp)}`}><MetricValue value={country.unemp} seriesKey="unemployment" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} /></div>
                    <div className={`mac-scorecell ${debtHeat(country.debt)}`}><MetricValue value={country.debt} seriesKey="debtToGdp" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(0)}%` : '—'} /></div>
                  </div>
                ))}
              </div>
        ),

        gdp: (
            <GdpBars data={sortedByGdp} lastUpdated={lastUpdated} />
        ),

        cpi: (
            <CpiBars data={sortedByCpi} lastUpdated={lastUpdated} />
        ),

        rates: (
            <RateBars data={centralBankData} lastUpdated={lastUpdated} />
        ),

        debt: (
            <DebtBars data={debtData} lastUpdated={lastUpdated} convertAndFormat={convertAndFormat} currentSymbol={currentSymbol} />
        ),

        activity: (
          <>
            <div className="mac-activity-summary">
              <div className="mac-activity-metric">
                <span className="mac-activity-label">CFNAI</span>
                <span className="mac-activity-value" style={{ color: cfnaiStatus.color }}><MetricValue value={cfnai?.latest} seriesKey="cfnai" timestamp={lastUpdated} format={v => v != null ? v.toFixed(2) : '—'} /></span>
                <span className="mac-activity-status">{cfnaiStatus.label}</span>
              </div>
              {yieldSpread?.values?.length > 0 && (
                <div className="mac-activity-metric">
                  <span className="mac-activity-label">10Y-2Y Spread</span>
                  <span className="mac-activity-value" style={{ color: yieldSpread.values[yieldSpread.values.length - 1] < 0 ? '#ef4444' : '#4ade80' }}>
                    <MetricValue value={yieldSpread.values[yieldSpread.values.length - 1]} seriesKey="t10y2y" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
                  </span>
                </div>
              )}
            </div>
            {cfnaiMiniOption && (
              <div style={{ height: 120, marginTop: 8 }}>
                <SafeECharts option={cfnaiMiniOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'CFNAI — Economic Activity', source: 'FRED', endpoint: '/api/globalMacro', series: [{ id: 'CFNAI' }], updatedAt: lastUpdated }} />
              </div>
            )}
          </>
        ),

        cli: (
            <div className="mac-cli-mini-grid">
              {(oecdCliDetail?.countries?.length ? oecdCliDetail.countries : Object.entries(oecdCli || {}).map(([code, entry]) => ({ code, value: entry?.value, cli: entry?.value, date: entry?.date }))).map((entry) => {
                const code = entry.code;
                const meta = scorecard.find(sc => sc.code === code);
                const v = entry?.value ?? entry?.cli;
                return (
                  <div key={code} className="mac-cli-mini-card">
                    <span className="mac-cli-mini-flag">{meta?.flag || entry.flag || code}</span>
                    <span className="mac-cli-mini-value" style={{ color: v > 100 ? '#4ade80' : v != null ? '#f87171' : '#94a3b8' }}>
                      <MetricValue value={v} seriesKey="oecdCli" timestamp={entry?.date || lastUpdated} format={x => x != null ? `${x.toFixed(1)}` : '—'} />
                    </span>
                    <span className="mac-cli-mini-trend" style={{ color: v > 100 ? '#4ade80' : v < 99 ? '#f87171' : '#fbbf24' }}>
                      {v > 100 ? '↗' : v < 99 ? '↘' : '→'}
                    </span>
                  </div>
                );
              })}
              {(!oecdCliDetail?.countries?.length && (!oecdCli || Object.keys(oecdCli).length === 0)) && (
                <div className="mac-empty">No CLI data available — FRED OECD series unavailable</div>
              )}
            </div>
        ),

        'imf-reserves': (
          imfData?.countries?.length > 0
            ? <ImfReserves countries={imfData.countries} ifsReserves={imfData.ifsReserves} lastUpdated={lastUpdated} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>IMF reserves loading…</div>
        ),

        'imf-cofer': (
            <ImfCofier cofer={imfData?.cofer} lastUpdated={lastUpdated} />
        ),

        'wb-trade': (
          wbData?.countries?.length > 0
            ? <WbTradeOpenness countries={wbData.countries} lastUpdated={lastUpdated} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>World Bank trade data loading…</div>
        ),

        'wb-dev': (
          wbData?.countries?.length > 0
            ? <WbDevScatter countries={wbData.countries} lastUpdated={lastUpdated} />
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>World Bank development data loading…</div>
        ),

        'ecb-eur': (
          ecbData?.policyRates ? (
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 14, height: '100%' }}>
                <div style={{ overflowY: 'auto', minHeight: 0 }}>
                  <div className="mac-sidebar-title">Policy Rates</div>
                  {[
                    { key: 'depositFacility',  label: 'Deposit Facility (DFR)',  color: '#3b82f6' },
                    { key: 'mainRefinancing', label: 'Main Refinancing (MRR)', color: '#14b8a6' },
                    { key: 'marginalLending',  label: 'Marginal Lending (MLFR)', color: '#f59e0b' },
                  ].map(row => {
                    const obs = ecbData.policyRates[row.key];
                    if (!obs) return null;
                    return (
                      <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colors.cardBg}` }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: colors.textSecondary, fontSize: 11 }}>{row.label}</span>
                          <span style={{ color: colors.textMuted, fontSize: 9 }}>since {obs.period}</span>
                        </div>
                        <span style={{ color: row.color, fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          <MetricValue value={obs.value} seriesKey={`ecb-${row.key}`} timestamp={obs.period} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
                        </span>
                      </div>
                    );
                  })}
                  {ecbData.moneyMarket && (
                    <>
                      <div className="mac-sidebar-title" style={{ marginTop: 10 }}>€STR &amp; EURIBOR</div>
                      {[
                        { label: '€STR', value: ecbData.moneyMarket.estr?.value, period: ecbData.moneyMarket.estr?.period, digits: 3 },
                        { label: 'EURIBOR 1M', value: ecbData.moneyMarket.euribor1m?.value, period: ecbData.moneyMarket.euribor1m?.period, digits: 3 },
                        { label: 'EURIBOR 3M', value: ecbData.moneyMarket.euribor3m?.value, period: ecbData.moneyMarket.euribor3m?.period, digits: 3 },
                        { label: 'EURIBOR 6M', value: ecbData.moneyMarket.euribor6m?.value, period: ecbData.moneyMarket.euribor6m?.period, digits: 3 },
                        { label: 'EURIBOR 1Y', value: ecbData.moneyMarket.euribor1y?.value, period: ecbData.moneyMarket.euribor1y?.period, digits: 3 },
                        { label: 'Corridor width', value: ecbData.policyRates.corridorWidth?.value, period: ecbData.policyRates.corridorWidth?.period, digits: 2 },
                      ].filter(r => r.value != null && Number.isFinite(Number(r.value))).map(row => (
                        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${colors.cardBg}` }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: colors.textSecondary, fontSize: 11 }}>{row.label}</span>
                            {row.period && <span style={{ color: colors.textMuted, fontSize: 9 }}>{row.period}</span>}
                          </div>
                          <span style={{ color: '#a78bfa', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {Number(row.value).toFixed(row.digits)}%
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="mac-sidebar-title">HICP Inflation (YoY)</div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    {hicpOption && <SafeECharts option={hicpOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Euro Area HICP', source: 'ECB SDW (ICP)', endpoint: '/api/ecb', series: [{ id: 'M.U2.N.000000.4.ANR' }], updatedAt: ecbLastUpdated || lastUpdated }} />}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="mac-sidebar-title">M3 Growth (YoY)</div>
                  <div style={{ flex: 1, minHeight: 0 }}>
                    {m3Option && <SafeECharts option={m3Option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Euro Area M3', source: 'ECB SDW (BSI)', endpoint: '/api/ecb', series: [{ id: 'M.U2.N.V.M30.X.I.U2.2300.Z01.A' }], updatedAt: ecbLastUpdated || lastUpdated }} />}
                  </div>
                </div>
              </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>ECB policy rates loading…</div>
          )
        ),

        'tga-balance': (
          dtsData?.series?.length > 0
            ? (tgaOption
              ? <SafeECharts option={tgaOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'TGA Cash Balance', source: 'US Treasury Fiscal Data', endpoint: '/api/treasury/dts', series: [], updatedAt: dtsLastUpdated || lastUpdated }} />
              : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>TGA chart loading…</div>)
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>TGA series loading…</div>
        ),

        gdpnow: (
          gdpNowData?.evolution?.length > 0
            ? (gdpNowOption
              ? <SafeECharts option={gdpNowOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'GDPNow', source: 'Atlanta Fed', endpoint: '/api/fed/gdpnow', series: [], updatedAt: gdpNowLastUpdated || lastUpdated }} />
              : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>GDPNow chart loading…</div>)
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>GDPNow loading…</div>
        ),

        'fomc-sep': (
          sepData?.projections?.length > 0 ? (
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.cardBg}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Variable</th>
                    {(sepData.yearHeaders || ['Y1', 'Y2', 'Y3', 'Longer']).map((y, i) => (
                      <th key={i} style={{ textAlign: 'right', padding: '6px 8px' }}>{y}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sepData.projections.map((p, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${colors.cardBg}` }}>
                      <td style={{ padding: '6px 8px', color: colors.textSecondary }}>{p.variable}</td>
                      {['current', 'next', 'twoOut', 'longerRun'].map(k => (
                        <td key={k} style={{ padding: '6px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: colors.textPrimary || '#e2e8f0' }}>
                          {typeof p.median[k] === 'number' && Number.isFinite(p.median[k]) ? `${p.median[k].toFixed(1)}%` : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>FOMC SEP loading…</div>
          )
        ),

        cleveland: (
            <ClevelandNowcastPanel data={cleveData} lastUpdated={cleveLastUpdated || lastUpdated} />
        ),

        'bea-accounts': (
          beaData && (beaData.gdpComponents?.length || beaData.savingRate?.length) ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, height: '100%' }}>
                {[
                  ['GDP', beaSummary.gdp],
                  ['Consumption', beaSummary.consumption],
                  ['Investment', beaSummary.investment],
                  ['Personal Income', beaSummary.income],
                ].map(([label, row]) => (
                  <div key={label} className="mac-metric-row">
                    <span className="mac-metric-label">{label}</span>
                    <span className="mac-metric-value">
                      {row?.value != null ? Number(row.value).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                    </span>
                  </div>
                ))}
              </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>BEA national accounts loading…</div>
          )
        ),

        eurostat: (
          eurostatData && (eurostatData.hicp?.length || eurostatData.unemployment?.length || eurostatData.govtDeficit?.length)
            ? (eurostatOption
              ? <SafeECharts option={eurostatOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Euro Area Macro', source: 'Eurostat', endpoint: '/api/eurostat', series: [], updatedAt: eurostatLastUpdated || lastUpdated }} />
              : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>Eurostat chart loading…</div>)
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>Eurostat data loading…</div>
        ),

        'oecd-direct': (
          oecdDirectRows.length > 0
            ? (oecdDirectOption
              ? <SafeECharts option={oecdDirectOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'OECD CLI Momentum', source: 'OECD', endpoint: '/api/oecd', series: [], updatedAt: oecdLastUpdated || lastUpdated }} />
              : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>OECD chart loading…</div>)
            : <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>OECD CLI momentum loading…</div>
        ),

        'bea-income': (
          (beaIncomeRows.length > 0 || beaIncomeCycleOption) ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12, height: '100%', minHeight: 0 }}>
                <div style={{ minHeight: 0 }}>
                  {beaIncomeCycleOption && <SafeECharts option={beaIncomeCycleOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'BEA Income & Savings Cycle', source: 'BEA', endpoint: '/api/bea', series: [], updatedAt: beaLastUpdated || lastUpdated }} />}
                </div>
                <div style={{ overflow: 'auto', minHeight: 0 }}>
                  <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.cardBg}` }}>
                        <th style={{ textAlign: 'left', padding: '5px 6px' }}>Line</th>
                        <th style={{ textAlign: 'right', padding: '5px 6px' }}>Latest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beaIncomeRows.map((row, i) => (
                        <tr key={`${row.label}-${i}`} style={{ borderBottom: `1px solid ${colors.cardBg}` }}>
                          <td style={{ padding: '5px 6px', color: colors.textSecondary }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>{row.label}</div>
                            <div style={{ color: colors.textMuted, fontSize: 9 }}>{row.period || 'latest'}</div>
                          </td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                            {Number.isFinite(row.value) ? row.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 8 }}>BEA income cycle loading…</div>
          )
        ),

        'global-liquidity': (
            <div className="mac-liq">
              <div className="mac-liq-top">
                <div className={`mac-liq-hero mac-liq-tone-${globalLiquidity.label === 'Supportive' ? 'supportive' : globalLiquidity.label === 'Tightening' ? 'tight' : 'neutral'}`}>
                  <span className="mac-liq-hero-label">Liquidity score</span>
                  <div className="mac-liq-hero-main">
                    <strong className="mac-liq-hero-value">
                      {Number.isFinite(globalLiquidity.drainScore)
                        ? `${globalLiquidity.drainScore >= 0 ? '+' : ''}${globalLiquidity.drainScore.toFixed(0)}`
                        : '—'}
                    </strong>
                    <em className="mac-liq-hero-regime">{globalLiquidity.label}</em>
                  </div>
                  <span className="mac-liq-hero-hint">TGA · M3 · saving · GDPNow</span>
                </div>

                <div className="mac-liq-cards">
                  {[
                    {
                      key: 'tga',
                      label: 'TGA Close',
                      value: globalLiquidity.tgaLatest?.closeB,
                      format: v => `$${Number(v).toFixed(0)}B`,
                      sub: globalLiquidity.tgaLatest?.date || 'Treasury cash',
                      tone: 'info',
                    },
                    {
                      key: 'tga5d',
                      label: 'TGA 5D Flow',
                      value: globalLiquidity.tgaChange5d,
                      format: v => `${Number(v) >= 0 ? '+' : ''}$${Number(v).toFixed(0)}B`,
                      sub: Number.isFinite(globalLiquidity.tgaChange5d)
                        ? (globalLiquidity.tgaChange5d <= 0 ? 'Drain → risk-on bias' : 'Rebuild → tighter')
                        : '5-session Δ',
                      tone: Number.isFinite(globalLiquidity.tgaChange5d)
                        ? (globalLiquidity.tgaChange5d <= 0 ? 'pos' : 'neg')
                        : 'muted',
                    },
                    {
                      key: 'm3',
                      label: 'ECB M3 YoY',
                      value: globalLiquidity.m3Latest?.value,
                      format: v => `${Number(v).toFixed(1)}%`,
                      sub: globalLiquidity.m3Latest?.period || 'Euro broad money',
                      tone: Number.isFinite(globalLiquidity.m3Latest?.value)
                        ? (globalLiquidity.m3Latest.value >= 3 ? 'pos' : globalLiquidity.m3Latest.value >= 1.5 ? 'warn' : 'neg')
                        : 'muted',
                    },
                    {
                      key: 'saving',
                      label: 'Saving Rate',
                      value: globalLiquidity.saving?.value != null ? Number(globalLiquidity.saving.value) : null,
                      format: v => `${Number(v).toFixed(1)}%`,
                      sub: globalLiquidity.saving?.period || 'BEA personal',
                      tone: 'info',
                    },
                    {
                      key: 'gdpnow',
                      label: 'GDPNow',
                      value: globalLiquidity.gdpNow,
                      format: v => `${Number(v).toFixed(1)}%`,
                      sub: 'Atlanta Fed',
                      tone: Number.isFinite(globalLiquidity.gdpNow)
                        ? (globalLiquidity.gdpNow >= 2 ? 'pos' : globalLiquidity.gdpNow >= 0 ? 'warn' : 'neg')
                        : 'muted',
                    },
                  ].map(card => (
                    <div key={card.key} className={`mac-liq-card mac-liq-card--${card.tone}`}>
                      <span className="mac-liq-card-label">{card.label}</span>
                      <strong className="mac-liq-card-value">
                        {typeof card.value === 'number' && Number.isFinite(card.value) ? card.format(card.value) : '—'}
                      </strong>
                      <span className="mac-liq-card-sub">{card.sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mac-liq-charts">
                <div className="mac-liq-chart-cell">
                  <div className="mac-liq-chart-head">
                    <span className="mac-liq-chart-title">TGA balance</span>
                    <span className="mac-liq-chart-meta">60 sessions · $B</span>
                  </div>
                  <div className="mac-liq-chart-body">
                    {liqTgaOption
                      ? (
                        <SafeECharts
                          option={liqTgaOption}
                          style={{ height: '100%', width: '100%' }}
                          sourceInfo={{ title: 'TGA Cash Balance', source: 'US Treasury DTS', endpoint: '/api/treasury/dts', series: [], updatedAt: dtsLastUpdated || lastUpdated }}
                        />
                      )
                      : <div className="mac-liq-chart-empty">No TGA series</div>}
                  </div>
                </div>

                <div className="mac-liq-chart-cell">
                  <div className="mac-liq-chart-head">
                    <span className="mac-liq-chart-title">ECB M3 growth</span>
                    <span className="mac-liq-chart-meta">24 months · YoY %</span>
                  </div>
                  <div className="mac-liq-chart-body">
                    {liqM3Option
                      ? (
                        <SafeECharts
                          option={liqM3Option}
                          style={{ height: '100%', width: '100%' }}
                          sourceInfo={{ title: 'Euro Area M3', source: 'ECB SDW', endpoint: '/api/ecb', series: [{ id: 'M.U2.N.V.M30.X.I.U2.2300.Z01.A' }], updatedAt: ecbLastUpdated || lastUpdated }}
                        />
                      )
                      : <div className="mac-liq-chart-empty">No M3 series</div>}
                  </div>
                </div>

                <div className="mac-liq-chart-cell">
                  <div className="mac-liq-chart-head">
                    <span className="mac-liq-chart-title">Personal saving rate</span>
                    <span className="mac-liq-chart-meta">BEA · %</span>
                  </div>
                  <div className="mac-liq-chart-body">
                    {liqSavingOption
                      ? (
                        <SafeECharts
                          option={liqSavingOption}
                          style={{ height: '100%', width: '100%' }}
                          sourceInfo={{ title: 'US Personal Saving Rate', source: 'BEA', endpoint: '/api/bea', series: [], updatedAt: beaLastUpdated || lastUpdated }}
                        />
                      )
                      : <div className="mac-liq-chart-empty">No saving-rate series</div>}
                  </div>
                </div>

                <div className="mac-liq-chart-cell">
                  <div className="mac-liq-chart-head">
                    <span className="mac-liq-chart-title">Score contributions</span>
                    <span className="mac-liq-chart-meta">Supportive → right</span>
                  </div>
                  <div className="mac-liq-chart-body">
                    {liqContribOption
                      ? (
                        <SafeECharts
                          option={liqContribOption}
                          style={{ height: '100%', width: '100%' }}
                          sourceInfo={{ title: 'Liquidity Score Contributions', source: 'Composite', endpoint: '/api/globalMacro', series: [], updatedAt: lastUpdated }}
                        />
                      )
                      : <div className="mac-liq-chart-empty">Waiting for inputs</div>}
                  </div>
                </div>
              </div>
            </div>
        ),
  };

  const panelCtx = {
    __render: (panelId) => panelBodies[panelId] ?? null,
    __live: {
      kpi: hasMacroKpiMetrics({
        scorecardData,
        centralBankData,
        dxyHistory: fxCtx?.data?.dxyHistory,
      }),
      sidebar: hasMacroSidebarContent({ scorecardData, centralBankData, debtData }),
      scorecard: hasScorecardRows(scorecard),
      gdp: hasScorecardRows(sortedByGdp),
      cpi: hasScorecardRows(sortedByCpi),
      rates: hasRateBarRows(centralBankData),
      debt: hasDebtBarRows(debtData),
      activity: hasActivityContent(cfnai, yieldSpread),
      cli: hasCliRows(oecdCliDetail, oecdCli),
      'imf-reserves': hasReserveRows(imfData?.countries, imfData?.ifsReserves),
      'imf-cofer': hasImfCoferShares(imfData?.cofer),
      'wb-trade': hasWbTradeRows(wbData),
      'wb-dev': hasWbDevRows(wbData),
      'ecb-eur': hasEcbEurContent(ecbData),
      'tga-balance': hasTgaSeries(dtsData),
      gdpnow: hasGdpNowEvolution(gdpNowData),
      'fomc-sep': hasFomcSepProjections(sepData),
      cleveland: hasClevelandNowcast(cleveData),
      'bea-accounts': hasBeaAccountsRows(beaData),
      eurostat: hasEurostatRows(eurostatData),
      'oecd-direct': hasOecdDirectRows(oecdData),
      'bea-income': hasBeaIncomeContent(beaData),
      'global-liquidity': hasGlobalLiquidityContent({ dtsData, ecbData, beaData, gdpNowData }),
    },
    __subtitle: {
      scorecard: scorecard.length ? 'Click row for details' : 'Waiting for country scorecard data…',
      cli: 'Amplitude-adjusted CLI · 100 = trend',
      'imf-reserves': 'Central-bank FX reserves · USD billions · IMF IFS',
      'imf-cofer': 'Global FX reserves by currency · IMF COFER · quarterly',
      'wb-trade': '(Exports + Imports) / GDP · World Bank WDI',
      'wb-dev': 'Bubble = population · World Bank WDI',
      'ecb-eur': 'Policy rates · HICP inflation · M3 monetary aggregate',
      'tga-balance': dtsData?.latest ? `Closing $${dtsData.latest.closeB?.toFixed(0)}B · net ${dtsData.latest.netB > 0 ? '+' : ''}$${dtsData.latest.netB?.toFixed(0)}B (${dtsData.latest.date})` : 'Daily Treasury Statement · 90 days',
      gdpnow: gdpNowData?.latest ? `Latest ${gdpNowData.latest.gdp?.toFixed(2)}% (${gdpNowData.latest.event})` : 'Atlanta Fed real-time GDP nowcast',
      'fomc-sep': sepData?.summary?.releaseDate ? `Median forecasts · ${sepData.summary.releaseDate} release` : 'Median forecasts (current year + 2 forward + longer run)',
      cleveland: (() => {
        const tables = Array.isArray(cleveData?.tables) ? cleveData.tables : [];
        const yoy = tables.find((t) => t.kind === 'yoy')?.rows?.[0]
          || cleveData?.byKind?.yoy
          || (tables.filter((t) => t.kind === 'mom').length > 1 ? tables[1]?.rows?.[0] : null)
          || cleveData?.latest;
        if (yoy && yoy.cpi != null) {
          const core = yoy.coreCpi != null ? ` · Core ${Number(yoy.coreCpi).toFixed(2)}%` : '';
          const pce = yoy.pce != null ? ` · PCE ${Number(yoy.pce).toFixed(2)}%` : '';
          return `${yoy.period || 'Latest'} YoY · CPI ${Number(yoy.cpi).toFixed(2)}%${core}${pce}`;
        }
        return cleveData ? 'Current-month inflation projection · Cleveland Fed' : 'Loading Cleveland Fed nowcast…';
      })(),
      'bea-accounts': beaSummary.saving ? `Saving rate ${Number(beaSummary.saving.value).toFixed(1)}% · ${beaSummary.saving.period}` : 'NIPA GDP components · personal income · saving rate',
      eurostat: 'HICP · unemployment · government deficit',
      'oecd-direct': `Direct OECD route · latest ${oecdDirectRows[0]?.period || ''} · 3-month change`,
      'bea-income': beaSummary.saving ? `Latest saving rate ${Number(beaSummary.saving.value).toFixed(1)}% · ${beaSummary.saving.period}` : 'Personal income detail · saving-rate cycle',
      'global-liquidity': `${globalLiquidity.label} backdrop · TGA, ECB M3, saving rate, GDPNow`,
    },
    __disabled: {
      'imf-reserves': !hasReserveRows(imfData?.countries, imfData?.ifsReserves),
      'wb-trade': !(wbData?.countries?.length > 0),
      'wb-dev': !(wbData?.countries?.length > 0),
      'ecb-eur': !ecbData?.policyRates,
      'tga-balance': !(dtsData?.series?.length > 0),
      gdpnow: !(gdpNowData?.evolution?.length > 0),
      'fomc-sep': !(sepData?.projections?.length > 0),
      'bea-accounts': !(beaData && (beaData.gdpComponents?.length || beaData.savingRate?.length)),
      eurostat: !(eurostatData && (eurostatData.hicp?.length || eurostatData.unemployment?.length || eurostatData.govtDeficit?.length)),
      'oecd-direct': !(oecdDirectRows.length > 0),
      'bea-income': !(beaIncomeRows.length > 0 || beaIncomeCycleOption),
    },
    __noFooter: {
      kpi: true,
    },
    __source: {
      sidebar: 'World Bank / FRED / BIS',
      scorecard: 'World Bank / FRED / BIS',
      gdp: 'World Bank / FRED / BIS',
      cpi: 'FRED',
      rates: 'FRED / BIS',
      debt: 'World Bank / FRED / BIS',
      activity: 'FRED / BIS',
      cli: 'FRED OECD CLI',
      'imf-reserves': 'IMF IFS (RAXFSFX)',
      'imf-cofer': 'IMF COFER',
      'wb-trade': 'World Bank WDI',
      'wb-dev': 'World Bank WDI',
      'ecb-eur': 'ECB SDW',
      'tga-balance': 'US Treasury Fiscal Data',
      gdpnow: 'Atlanta Fed',
      'fomc-sep': 'Federal Reserve Board',
      cleveland: 'Cleveland Fed',
      'bea-accounts': 'BEA NIPA',
      eurostat: 'Eurostat',
      'oecd-direct': 'OECD SDMX',
      'bea-income': 'BEA NIPA',
      'global-liquidity': 'US Treasury / ECB / BEA / Atlanta Fed',
    },
  };

  return (
    <div className="mac-dashboard mac-dashboard--bento" data-market="globalMacro">
      <MarketPanelGrid
        marketId="globalMacro"
        layout={LAYOUT}
        storageKey="macro-layout-v10"
        accent="globalMacro"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
      />
      {selectedCountry && (
        <CountryDetailPanel
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
          centralBankData={centralBankData}
          oecdCli={oecdCli}
          scorecardData={scorecardData}
          convertAndFormat={convertAndFormat}
          currentSymbol={currentSymbol}
        />
      )}
    </div>
  );
}

export default React.memo(GlobalMacroDashboard);
