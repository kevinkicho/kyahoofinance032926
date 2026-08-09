// src/markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import BentoCard from '../../../components/BentoCard/BentoCard';
import MetricValue from '../../../components/MetricValue/MetricValue';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import InsiderTrading from './InsiderTrading';
import FactorRankings from './FactorRankings';
import { useTheme } from '../../../hub/ThemeContext';
import './EquitiesDeepDiveDashboard.css';

function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;
}

function peBadgeColor(pe) {
  if (pe == null) return '#6b7280';
  if (pe < 18) return '#22c55e';
  if (pe <= 25) return '#f59e0b';
  return '#ef4444';
}

function buffettBadgeColor(ratio) {
  if (ratio == null) return '#6b7280';
  if (ratio < 100) return '#22c55e';
  if (ratio <= 150) return '#f59e0b';
  return '#ef4444';
}

function erpBadgeColor(erp) {
  if (erp == null) return '#6b7280';
  if (erp > 3) return '#22c55e';
  if (erp >= 1) return '#f59e0b';
  return '#ef4444';
}

function beatColor(rate) {
  if (rate == null || Number.isNaN(rate)) return '#6b7280';
  if (rate >= 70) return '#6366f1';
  if (rate >= 50) return '#f59e0b';
  return '#ef4444';
}

function shortBarColor(v) {
  if (v == null || Number.isNaN(v)) return '#6b7280';
  if (v > 20) return '#ef4444';
  if (v > 10) return '#f59e0b';
  return '#22c55e';
}

function factorHeat(score) {
  if (score == null || Number.isNaN(score)) return 'eqd-heat-neu';
  if (score >= 70) return 'eqd-heat-dg';
  if (score >= 50) return 'eqd-heat-lg';
  if (score >= 30) return 'eqd-heat-neu';
  if (score >= 15) return 'eqd-heat-lr';
  return 'eqd-heat-dr';
}

function buildRankedOption(sectors, colors) {
  const spy = sectors.find(s => s.code === 'SPY');
  const spyRef = spy?.perf1m ?? 0;
  const etfs = [...sectors]
    .filter(s => s.code !== 'SPY')
    .sort((a, b) => (b.perf1m ?? -99) - (a.perf1m ?? -99));

  const horizons = [
    { key: 'perf1w', label: '1W', color: '#94a3b8' },
    { key: 'perf1m', label: '1M', color: '#6366f1' },
    { key: 'perf3m', label: '3M', color: '#22c55e' },
    { key: 'perf1y', label: '1Y', color: '#f59e0b' },
  ];

  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const name = params[0]?.name ?? '';
        const s = etfs.find(e => e.name === name);
        const d = Number(s?.perf1d ?? 0);
        const dLine = s ? `1D: <b>${d >= 0 ? '+' : ''}${d.toFixed(2)}%</b>` : '';
        const vsSpy = s?.perf1m != null ? `vs SPY 1M: <b>${(s.perf1m - spyRef) >= 0 ? '+' : ''}${(s.perf1m - spyRef).toFixed(1)}%</b>` : '';
        const lines = params.map(p => `${p.marker}${p.seriesName}: ${(p.value ?? 0).toFixed(1)}%`);
        return `${name}<br/>${dLine ? `${dLine}<br/>` : ''}${vsSpy ? `${vsSpy}<br/>` : ''}${lines.join('<br/>')}`;
      },
    },
    legend: {
      top: 0,
      textStyle: { color: colors.textSecondary, fontSize: 9 },
      itemWidth: 10,
      itemHeight: 8,
    },
    grid: { top: 24, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: etfs.map(s => s.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 9 },
    },
    series: horizons.map((h, i) => ({
      name: h.label,
      type: 'bar',
      data: etfs.map(s => ({
        value: s[h.key] ?? 0,
        itemStyle: i === 1 ? { color: (s.perf1m ?? 0) >= spyRef ? h.color : '#ef4444' } : { color: h.color },
      })),
      markLine: i === 1 ? {
        data: [{ xAxis: spyRef }],
        symbol: 'none',
        lineStyle: { color: colors.text, type: 'dashed', width: 1 },
        label: { show: true, formatter: 'SPY 1M', color: colors.textSecondary, fontSize: 9 },
      } : undefined,
    })),
  };
}

function buildInFavorOption(inFavor, stocks, colors) {
  const factors = [
    { name: 'Low-Vol', key: 'lowVol', value: inFavor.lowVol ?? 0 },
    { name: 'Quality', key: 'quality', value: inFavor.quality ?? 0 },
    { name: 'Value', key: 'value', value: inFavor.value ?? 0 },
    { name: 'Momentum', key: 'momentum', value: inFavor.momentum ?? 0 },
  ];
  const topByFactor = {};
  factors.forEach(f => {
    let best = null;
    (stocks || []).forEach(s => {
      if (s[f.key] != null && (best == null || s[f.key] > best[f.key])) best = s;
    });
    topByFactor[f.key] = best;
  });
  const nameToKey = {};
  factors.forEach(f => { nameToKey[f.name] = f.key; });
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const base = `${params[0].name}: ${params[0].value?.toFixed(1)}%`;
        const key = nameToKey[params[0].name];
        const top = key ? topByFactor[key] : null;
        if (!top) return base;
        return `${base} · Top ${top.ticker} ${top[key].toFixed(0)}`;
      },
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: factors.map(f => f.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: factors.map(f => ({
        value: f.value,
        itemStyle: { color: f.value >= 0 ? '#6366f1' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

function buildBeatRateOption(beatRates, sectors, colors) {
  const sorted = [...beatRates].sort((a, b) => (b.beatRate ?? 0) - (a.beatRate ?? 0));
  const perf1mByName = new Map((sectors ?? []).map(s => [s.name, s.perf1m]));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        const base = `${params[0].name}: ${params[0].value?.toFixed(1)}%`;
        if (!item) return base;
        const perf1m = perf1mByName.get(item.sector);
        const perf1mStr = perf1m != null ? ` · 1M ${perf1m >= 0 ? '+' : ''}${perf1m.toFixed(1)}%` : '';
        return `${base} (${item.beatCount}/${item.totalCount})${perf1mStr}`;
      },
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0, max: 100,
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.sector),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(s => ({
        value: s.beatRate,
        itemStyle: { color: beatColor(s.beatRate) },
      })),
      markLine: {
        data: [{ xAxis: 50 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: true, formatter: '50%', color: colors.textSecondary, fontSize: 9 },
      },
    }],
  };
}

function buildShortedOption(mostShorted, colors) {
  const sorted = [...mostShorted].sort((a, b) => (b.shortFloat ?? 0) - (a.shortFloat ?? 0));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        const base = `${params[0].name}: ${params[0].value?.toFixed(1)}% short`;
        if (!item) return base;
        const dtc = item.daysToCover != null ? ` · ${item.daysToCover.toFixed(1)}d to cover` : '';
        const pw = item.perf1w != null ? ` · 1W ${item.perf1w >= 0 ? '+' : ''}${item.perf1w.toFixed(1)}%` : '';
        const mcap = item.marketCapB != null ? ` · $${item.marketCapB}B` : '';
        const sec = item.sector ? ` · ${item.sector}` : '';
        return `${base}${dtc}${pw}${mcap}${sec}`;
      },
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.ticker),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(s => ({
        value: s.shortFloat,
        itemStyle: { color: shortBarColor(s.shortFloat) },
      })),
      markLine: {
        data: [{ xAxis: 20 }, { xAxis: 10 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: true, color: colors.textMuted, fontSize: 9 },
      },
    }],
  };
}

function buildSqueezeOption(mostShorted, colors) {
  const candidates = mostShorted.filter(s => (s.shortFloat ?? 0) > 10);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p.data[4] || p.data[3]}${p.data[5] ? `<br/>${p.data[5]}` : ''}<br/>Short Float: ${p.data[0]?.toFixed(1)}%<br/>1W Return: ${p.data[1]?.toFixed(1)}%${p.data[2] != null ? `<br/>Mkt Cap: $${p.data[2]}B` : ''}`,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Short Float %',
      nameTextStyle: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'value',
      name: '1W Return %',
      nameTextStyle: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'scatter',
      data: candidates.map(s => [s.shortFloat ?? 0, s.perf1w ?? 0, s.marketCapB ?? 1, s.ticker, s.name, s.sector]),
      symbolSize: d => Math.max(8, Math.min(40, Math.sqrt(d[2] ?? 1) * 3)),
      itemStyle: { color: '#ef4444', opacity: 0.8 },
      label: {
        show: true,
        formatter: p => p.data[3],
        position: 'right',
        color: colors.textSecondary,
        fontSize: 9,
      },
      markLine: {
        data: [{ xAxis: 15 }, { yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

// KPI strip and sidebar are now real bento children at top + right column.
// Other panels shifted to make room.
const LAYOUT = {
  lg: [
    { i: 'kpi',          x: 0, y: 0, w: 12, h: 2 },
    { i: 'sidebar',      x: 9, y: 2, w: 3,  h: 11 },
    { i: 'valuation',    x: 0, y: 2, w: 3,  h: 2 },
    { i: 'etf',          x: 3, y: 2, w: 3,  h: 3 },
    { i: 'factor-favor', x: 6, y: 2, w: 3,  h: 3 },
    { i: 'sector-beat',  x: 0, y: 5, w: 3,  h: 3 },
    { i: 'shorted',      x: 3, y: 5, w: 3,  h: 3 },
    { i: 'scores',       x: 6, y: 5, w: 3,  h: 3 },
    { i: 'earnings',     x: 0, y: 8, w: 6,  h: 3 },
    { i: 'institutions', x: 6, y: 8, w: 3,  h: 2 },
    { i: 'insider',      x: 6, y: 10, w: 3, h: 3 },
    { i: 'factor-rankings', x: 0, y: 12, w: 6, h: 4 },
    { i: 'earnings-quality', x: 0, y: 16, w: 12, h: 3 },
  ]
};

function EquitiesDeepDiveDashboard({
  kpiPanel,
  sidebarPanel,
  sectorData,
  factorData,
  earningsData,
  shortData,
  institutionalData,
  insiderData,
  equityRiskPremium,
  spPE,
  buffettIndicator,
  breadthDivergence,
  fetchLog,
  isLive,
  lastUpdated,
  error,
  fetchedOn,
  isCurrent,
}) {
  const { colors } = useTheme();

  const { sectors = [] } = sectorData ?? {};
  const { inFavor = {}, stocks = [] } = factorData ?? {};
  const upcoming = earningsData?.upcoming ?? [];
  const beatRates = earningsData?.beatRates ?? [];
  const { mostShorted = [] } = shortData ?? {};
  const { institutions = [], aggregateTopHoldings = [], recentChanges = {} } = institutionalData ?? {};
  const { holders: insiderHolders = [], transactions: insiderTransactions = [] } = insiderData ?? {};

  const rankedOption = useMemo(() => sectors?.length > 0 ? buildRankedOption(sectors, colors) : null, [sectors, colors]);
  const inFavorOption = useMemo(() => inFavor ? buildInFavorOption(inFavor, stocks, colors) : null, [inFavor, stocks, colors]);
  const beatRateOption = useMemo(() => beatRates?.length > 0 ? buildBeatRateOption(beatRates, sectors, colors) : null, [beatRates, sectors, colors]);
  const shortedOption = useMemo(() => mostShorted?.length > 0 ? buildShortedOption(mostShorted, colors) : null, [mostShorted, colors]);
  const squeezeOption = useMemo(() => mostShorted?.length > 0 ? buildSqueezeOption(mostShorted, colors) : null, [mostShorted, colors]);

  const sectorKpis = useMemo(() => {
    if (!sectors.length) return null;
    const spy = sectors.find(s => s.code === 'SPY');
    const etfs = sectors.filter(s => s.code !== 'SPY');
    if (!etfs.length) return null;
    const best = etfs.reduce((a, b) => (a.perf1m ?? -99) > (b.perf1m ?? -99) ? a : b);
    const worst = etfs.reduce((a, b) => (a.perf1m ?? 99) < (b.perf1m ?? 99) ? a : b);
    const spyPerf = spy?.perf1m ?? 0;
    const outperforming = etfs.filter(s => (s.perf1m ?? 0) >= spyPerf).length;
    return { best, worst, spyPerf, outperforming, total: etfs.length };
  }, [sectors]);

  const factorKpis = useMemo(() => {
    if (!stocks.length) return null;
    const factors = [
      { name: 'Momentum', val: inFavor.momentum ?? 0 },
      { name: 'Value', val: inFavor.value ?? 0 },
      { name: 'Quality', val: inFavor.quality ?? 0 },
      { name: 'Low-Vol', val: inFavor.lowVol ?? 0 },
    ];
    const topFactor = factors.reduce((a, b) => a.val > b.val ? a : b);
    const topStock = stocks.reduce((a, b) => (a.composite ?? 0) > (b.composite ?? 0) ? a : b);
    const avgComposite = stocks.reduce((s, st) => s + (st.composite ?? 0), 0) / stocks.length;
    const highQuality = stocks.filter(s => (s.quality ?? 0) >= 70).length;
    return { topFactor, topStock, avgComposite, highQuality };
  }, [inFavor, stocks]);

  const shortKpis = useMemo(() => {
    if (!mostShorted.length) return null;
    const top = mostShorted.reduce((a, b) => (a.shortFloat ?? 0) > (b.shortFloat ?? 0) ? a : b);
    const avgShort = mostShorted.reduce((s, st) => s + (st.shortFloat ?? 0), 0) / mostShorted.length;
    const above20 = mostShorted.filter(s => (s.shortFloat ?? 0) > 20).length;
    return { top, avgShort, above20, total: mostShorted.length };
  }, [mostShorted]);

  const earningsQuality = useMemo(() => {
    const numeric = arr => arr.filter(v => v != null && !Number.isNaN(Number(v))).map(Number);
    const avg = arr => {
      const vals = numeric(arr);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };
    const sortedUpcoming = [...upcoming].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const avgBeatRate = avg((beatRates || []).map(row => row.beatRate));
    const bestBeat = (beatRates || []).reduce((best, row) => (row.beatRate ?? -Infinity) > (best?.beatRate ?? -Infinity) ? row : best, null);
    const factors = [
      { name: 'Momentum', value: inFavor.momentum },
      { name: 'Value', value: inFavor.value },
      { name: 'Quality', value: inFavor.quality },
      { name: 'Low-Vol', value: inFavor.lowVol },
    ].filter(row => row.value != null);
    const topFactor = factors.reduce((best, row) => Number(row.value) > Number(best?.value ?? -Infinity) ? row : best, null);
    const positiveRevisions = upcoming.filter(row => row.epsEst != null && row.epsPrev != null && Number(row.epsEst) >= Number(row.epsPrev)).length;
    const revisionRate = upcoming.length ? (positiveRevisions / upcoming.length) * 100 : null;
    const qualityCount = stocks.filter(row => Number(row.quality ?? 0) >= 70).length;
    const avgComposite = avg(stocks.map(row => row.composite));
    return {
      next: sortedUpcoming[0] || null,
      totalUpcoming: upcoming.length,
      avgBeatRate,
      bestBeat,
      topFactor,
      revisionRate,
      qualityCount,
      avgComposite,
      breadth: breadthDivergence?.signal || breadthDivergence?.status || breadthDivergence?.summary
        || (breadthDivergence?.divergence != null
          ? (breadthDivergence.divergence > 2 ? 'Narrow breadth (top-heavy)' : breadthDivergence.divergence < -2 ? 'Broad breadth' : 'Neutral')
          : null),
    };
  }, [upcoming, beatRates, inFavor, stocks, breadthDivergence]);

  const panelCtx = useMemo(() => {
    const valuationBody = (
      <>
        {(spPE != null || buffettIndicator || equityRiskPremium) && (
          <div className="eqd-metric-card">
            <div className="eqd-sidebar-title">Market Valuation</div>
            {spPE != null && (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name">S&P P/E</span>
                <span className="eqd-metric-num" style={{ color: peBadgeColor(spPE) }}><MetricValue value={spPE} seriesKey="spPE" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} /></span>
              </div>
            )}
            {buffettIndicator && (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name">Buffett</span>
                <span className="eqd-metric-num" style={{ color: buffettBadgeColor(buffettIndicator.ratio) }}>
                  <MetricValue value={buffettIndicator.ratio} seriesKey="buffettIndicator" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
                </span>
              </div>
            )}
            {equityRiskPremium && (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name">ERP</span>
                <span className="eqd-metric-num" style={{ color: erpBadgeColor(equityRiskPremium.erp) }}>
                  <MetricValue value={equityRiskPremium.erp} seriesKey="equityRiskPremium" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
                </span>
              </div>
            )}
          </div>
        )}
        {sectorKpis && (
          <div className="eqd-metric-card">
            <div className="eqd-sidebar-title">Sector Performance</div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Best</span>
              <span className="eqd-metric-num" style={{ color: '#22c55e' }}>{sectorKpis.best.name}</span>
            </div>
            {sectorKpis.best.perf1d != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">1D {(sectorKpis.best.perf1d >= 0 ? '+' : '')}{sectorKpis.best.perf1d.toFixed(1)}% · 1M {(sectorKpis.best.perf1m ?? 0) >= 0 ? '+' : ''}{(sectorKpis.best.perf1m ?? 0).toFixed(1)}%</span>
              </div>
            ) : null}
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Worst</span>
              <span className="eqd-metric-num" style={{ color: '#ef4444' }}>{sectorKpis.worst.name}</span>
            </div>
            {sectorKpis.worst.perf1d != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">1D {(sectorKpis.worst.perf1d >= 0 ? '+' : '')}{sectorKpis.worst.perf1d.toFixed(1)}% · 1M {(sectorKpis.worst.perf1m ?? 0) >= 0 ? '+' : ''}{(sectorKpis.worst.perf1m ?? 0).toFixed(1)}%</span>
              </div>
            ) : null}
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">SPY</span>
              <span className="eqd-metric-num"><MetricValue value={sectorKpis.spyPerf} seriesKey="sp500Perf" timestamp={lastUpdated} format={v => fmtChangePct(v)} /></span>
            </div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Beating SPY</span>
              <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{sectorKpis.outperforming}/{sectorKpis.total}</span>
            </div>
          </div>
        )}
        {factorKpis && (
          <div className="eqd-metric-card">
            <div className="eqd-sidebar-title">Factor Leaders</div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Top Factor</span>
              <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{factorKpis.topFactor.name}</span>
            </div>
            {factorKpis.topFactor.value != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{Number(factorKpis.topFactor.value).toFixed(1)}% MTD</span>
              </div>
            ) : null}
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Top Stock</span>
              <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{factorKpis.topStock.ticker}</span>
            </div>
            {factorKpis.topStock.name ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{factorKpis.topStock.name}</span>
              </div>
            ) : null}
            {factorKpis.topStock.composite != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">Composite {factorKpis.topStock.composite}</span>
              </div>
            ) : null}
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Avg Composite</span>
              <span className="eqd-metric-num"><MetricValue value={factorKpis.avgComposite} seriesKey="avgFactorScore" timestamp={lastUpdated} format={v => v.toFixed(0)} /></span>
            </div>
          </div>
        )}
        {shortKpis && (
          <div className="eqd-metric-card">
            <div className="eqd-sidebar-title">Short Interest</div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Most Shorted</span>
              <span className="eqd-metric-num" style={{ color: '#ef4444' }}>{shortKpis.top.ticker}</span>
            </div>
            {shortKpis.top.name ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{shortKpis.top.name}</span>
              </div>
            ) : null}
            {shortKpis.top.daysToCover != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{shortKpis.top.daysToCover.toFixed(1)}d to cover</span>
              </div>
            ) : null}
            {shortKpis.top.marketCapB != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">${shortKpis.top.marketCapB}B</span>
              </div>
            ) : null}
            {shortKpis.top.perf1w != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">1W {(shortKpis.top.perf1w >= 0 ? '+' : '')}{shortKpis.top.perf1w.toFixed(1)}%</span>
              </div>
            ) : null}
            {shortKpis.top.sector ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{shortKpis.top.sector}</span>
              </div>
            ) : null}
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Avg Float</span>
              <span className="eqd-metric-num"><MetricValue value={shortKpis.avgShort} seriesKey="avgShortInterest" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} /></span>
            </div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">{`Short > 20%`}</span>
              <span className="eqd-metric-num" style={{ color: shortKpis.above20 > 3 ? '#ef4444' : '#6366f1' }}>
                <MetricValue value={shortKpis.above20} seriesKey="avgShortInterest" timestamp={lastUpdated} format={v => `${v}`} />/<MetricValue value={shortKpis.total} seriesKey="avgShortInterest" timestamp={lastUpdated} format={v => `${v}`} />
              </span>
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <div className="eqd-metric-card">
            <div className="eqd-sidebar-title">Earnings</div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Next Report</span>
              <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{upcoming[0].ticker}</span>
            </div>
            {upcoming[0].name ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{upcoming[0].name}</span>
              </div>
            ) : null}
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Upcoming</span>
              <span className="eqd-metric-num"><MetricValue value={upcoming.length} seriesKey="earningsEpsEst" timestamp={lastUpdated} /></span>
            </div>
          </div>
        )}
        {institutions.length > 0 && (
          <div className="eqd-metric-card">
            <div className="eqd-sidebar-title">Institutions</div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Tracked</span>
              <span className="eqd-metric-num"><MetricValue value={institutions.length} seriesKey="earningsEpsEst" timestamp={lastUpdated} /></span>
            </div>
            {aggregateTopHoldings?.[0] && (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name">Top Holding</span>
                <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{aggregateTopHoldings[0].ticker}</span>
              </div>
            )}
            {aggregateTopHoldings?.[0]?.name ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{aggregateTopHoldings[0].name}</span>
              </div>
            ) : null}
            {aggregateTopHoldings?.[0]?.holders != null ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{aggregateTopHoldings[0].holders}/{institutions.length} institutions</span>
              </div>
            ) : null}
          </div>
        )}
        {insiderTransactions.length > 0 && (
          <div className="eqd-metric-card">
            <div className="eqd-sidebar-title">Insider Activity</div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Buys</span>
              <span className="eqd-metric-num" style={{ color: '#22c55e' }}>{insiderTransactions.filter(t => { const ty = (t.type || '').toLowerCase(); return ty.includes('purchase') || ty.includes('buy'); }).length}</span>
            </div>
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Sells</span>
              <span className="eqd-metric-num" style={{ color: '#ef4444' }}>{insiderTransactions.filter(t => { const ty = (t.type || '').toLowerCase(); return ty.includes('sale') || ty.includes('sell'); }).length}</span>
            </div>
            {(() => {
              let buyVal = 0, sellVal = 0;
              insiderTransactions.forEach(t => {
                const ty = (t.type || '').toLowerCase();
                const v = Number(t.value) || 0;
                if (ty.includes('purchase') || ty.includes('buy')) buyVal += v;
                else if (ty.includes('sale') || ty.includes('sell')) sellVal += v;
              });
              if (buyVal === 0 && sellVal === 0) return null;
              const net = buyVal - sellVal;
              const fmt = n => {
                const abs = Math.abs(n);
                if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
                if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
                if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
                return `$${Math.round(n)}`;
              };
              return (
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Net $</span>
                  <span className="eqd-metric-num" style={{ color: net >= 0 ? '#22c55e' : '#ef4444' }}>{net >= 0 ? '+' : ''}{fmt(net)}</span>
                </div>
              );
            })()}
            <div className="eqd-metric-row">
              <span className="eqd-metric-name">Tickers</span>
              <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{new Set(insiderTransactions.map(t => t.ticker)).size}</span>
            </div>
            {insiderTransactions[0] && (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name">Latest</span>
                <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{insiderTransactions[0].ticker}</span>
              </div>
            )}
            {insiderTransactions[0]?.type ? (
              <div className="eqd-metric-row">
                <span className="eqd-metric-name" />
                <span className="eqd-metric-num eqd-name">{insiderTransactions[0].name ? `${insiderTransactions[0].name} · ` : ''}{insiderTransactions[0].type}</span>
              </div>
            ) : null}
          </div>
        )}
      </>
    );

    const scoresBody = stocks.length > 0 ? (
      <table className="eqd-table">
        <thead>
          <tr>
            <th className="eqd-th">Ticker</th>
            <th className="eqd-th">Company</th>
            <th className="eqd-th">Sector</th>
            <th className="eqd-th">Value</th>
            <th className="eqd-th">Momentum</th>
            <th className="eqd-th">Quality</th>
            <th className="eqd-th">Low-Vol</th>
            <th className="eqd-th">Composite</th>
          </tr>
        </thead>
        <tbody>
          {stocks.slice(0, 10).map(s => (
            <tr key={s.ticker} className="eqd-row">
              <td className="eqd-cell"><strong>{s.ticker}</strong></td>
              <td className="eqd-cell eqd-name">{s.name || '—'}</td>
              <td className="eqd-cell eqd-name">{s.sector || '—'}</td>
              <td className={`eqd-cell eqd-score ${factorHeat(s.value)}`}><MetricValue value={s.value} seriesKey="factorValue" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></td>
              <td className={`eqd-cell eqd-score ${factorHeat(s.momentum)}`}><MetricValue value={s.momentum} seriesKey="factorMomentum" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></td>
              <td className={`eqd-cell eqd-score ${factorHeat(s.quality)}`}><MetricValue value={s.quality} seriesKey="factorQuality" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></td>
              <td className={`eqd-cell eqd-score ${factorHeat(s.lowVol)}`}><MetricValue value={s.lowVol} seriesKey="factorLowVol" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></td>
              <td className={`eqd-cell eqd-score ${factorHeat(s.composite)}`}><strong><MetricValue value={s.composite} seriesKey="factorComposite" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : null;

    const earningsBody = upcoming.length > 0 ? (
      <table className="eqd-table eqd-earnings-table">
        <colgroup>
          <col className="eqd-col-date" />
          <col className="eqd-col-ticker" />
          <col className="eqd-col-sector" />
          <col className="eqd-col-mcap" />
          <col className="eqd-col-eps" />
          <col className="eqd-col-dir" />
        </colgroup>
        <thead>
          <tr>
            <th className="eqd-th eqd-col-date">Date</th>
            <th className="eqd-th eqd-col-ticker">Ticker</th>
            <th className="eqd-th eqd-col-sector">Sector</th>
            <th className="eqd-th eqd-col-mcap">Mkt Cap</th>
            <th className="eqd-th eqd-col-eps">EPS Est</th>
            <th className="eqd-th eqd-col-dir" title="Estimate vs prior-quarter EPS">Dir</th>
          </tr>
        </thead>
        <tbody>
          {upcoming.slice(0, 10).map(e => {
            const hasDir = e.epsEst != null && e.epsPrev != null;
            const isUp = hasDir && Number(e.epsEst) >= Number(e.epsPrev);
            return (
              <tr key={e.ticker} className="eqd-row">
                <td className="eqd-cell eqd-col-date eqd-date">{e.date || '—'}</td>
                <td className="eqd-cell eqd-col-ticker">
                  <strong className="eqd-ticker">{e.ticker}</strong>
                  {e.name ? <span className="eqd-name">{e.name}</span> : null}
                </td>
                <td className="eqd-cell eqd-col-sector">{e.sector || '—'}</td>
                <td className="eqd-cell eqd-col-mcap eqd-num">{e.marketCapB != null ? `$${e.marketCapB}B` : '—'}</td>
                <td className="eqd-cell eqd-col-eps eqd-num">
                  <MetricValue
                    value={e.epsEst}
                    seriesKey="earningsEpsEst"
                    timestamp={lastUpdated}
                    format={v => (v != null ? `$${Number(v).toFixed(2)}` : '—')}
                  />
                  {e.epsPrev != null ? <span className="eqd-name">prior ${Number(e.epsPrev).toFixed(2)}</span> : null}
                </td>
                <td className="eqd-cell eqd-col-dir">
                  {hasDir ? (
                    <span
                      className={`eqd-dir-badge ${isUp ? 'is-up' : 'is-down'}`}
                      title={isUp ? 'EPS est ≥ prior quarter' : 'EPS est < prior quarter'}
                      aria-label={isUp ? 'Estimate above prior' : 'Estimate below prior'}
                    >
                      {isUp ? '▲' : '▼'}
                    </span>
                  ) : (
                    <span className="eqd-dir-badge is-muted" title="Prior EPS unavailable">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    ) : null;

    const institutionsBody = institutions.length > 0 ? (
      <div className="eqd-mini-table">
        {institutions.slice(0, 6).map((inst, i) => (
          <div key={i} className="eqd-mini-row">
            <span className="eqd-mini-name">{inst.name.length > 18 ? inst.name.slice(0, 18) + '…' : inst.name}</span>
            <span className="eqd-mini-value"><MetricValue value={inst.totalValue} seriesKey="institutionTotalValue" timestamp={lastUpdated} format={v => `$${(v / 1000).toFixed(1)}T`} /></span>
            {inst.topHoldings?.[0] ? <span className="eqd-mini-sub">Top: {inst.topHoldings[0].ticker}{inst.topHoldings[0].name ? ` · ${inst.topHoldings[0].name}` : ''} · {inst.topHoldings[0].pctOfPortfolio != null ? `${inst.topHoldings[0].pctOfPortfolio.toFixed(1)}%` : ''}</span> : null}
          </div>
        ))}
      </div>
    ) : null;

    const topHoldingsBody = aggregateTopHoldings.length > 0 ? (
      <div className="eqd-mini-table">
        {aggregateTopHoldings.slice(0, 6).map((h, i) => (
          <div key={i} className="eqd-mini-row">
            <span className="eqd-mini-name"><strong>{h.ticker}</strong> {h.name}</span>
            <span className="eqd-mini-value"><MetricValue value={h.totalValue} seriesKey="institutionTotalValue" timestamp={lastUpdated} format={v => `$${v.toFixed(0)}B`} /></span>
            {h.holders != null || h.totalShares != null ? <span className="eqd-mini-sub">{h.holders != null ? `${h.holders} holders` : ''}{h.holders != null && h.totalShares != null ? ' · ' : ''}{h.totalShares != null ? `${h.totalShares}M sh` : ''}</span> : null}
          </div>
        ))}
      </div>
    ) : null;

    const recentChangesBody = (recentChanges?.bigBuys?.length > 0 || recentChanges?.bigSells?.length > 0 || recentChanges?.newPositions?.length > 0) ? (
      <div className="eqd-mini-table">
        {recentChanges.bigBuys?.slice(0, 2).map((b, i) => (
          <div key={`buy-${i}`} className="eqd-mini-row">
            <span className="eqd-mini-name"><strong>{b.ticker}</strong> {b.name}</span>
            <span className="eqd-mini-value" style={{ color: '#22c55e' }}>Buy · {b.buyer}</span>
            {b.shares ? <span className="eqd-mini-sub">{b.shares}</span> : null}
            {b.thesis ? <span className="eqd-mini-sub">{b.thesis}</span> : null}
          </div>
        ))}
        {recentChanges.bigSells?.slice(0, 2).map((s, i) => (
          <div key={`sell-${i}`} className="eqd-mini-row">
            <span className="eqd-mini-name"><strong>{s.ticker}</strong> {s.name}</span>
            <span className="eqd-mini-value" style={{ color: '#ef4444' }}>Sell · {s.seller}</span>
            {s.shares ? <span className="eqd-mini-sub">{s.shares}</span> : null}
            {s.thesis ? <span className="eqd-mini-sub">{s.thesis}</span> : null}
          </div>
        ))}
        {recentChanges.newPositions?.slice(0, 2).map((n, i) => (
          <div key={`new-${i}`} className="eqd-mini-row">
            <span className="eqd-mini-name"><strong>{n.ticker}</strong> {n.name}</span>
            <span className="eqd-mini-value" style={{ color: '#6366f1' }}>New · {n.buyer}</span>
            {n.thesis ? <span className="eqd-mini-sub">{n.thesis}</span> : null}
          </div>
        ))}
      </div>
    ) : null;

    const earningsQualityBody = (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'Next Report', value: earningsQuality.next?.ticker || '—', sub: [earningsQuality.next?.name, earningsQuality.next?.sector, earningsQuality.next?.date, (earningsQuality.next?.epsEst != null && earningsQuality.next?.epsPrev != null ? `est $${earningsQuality.next.epsEst} vs prior $${earningsQuality.next.epsPrev}` : null)].filter(Boolean).join(' · ') || 'schedule' },
            { label: 'Beat Breadth', value: earningsQuality.avgBeatRate != null ? `${earningsQuality.avgBeatRate.toFixed(1)}%` : '—', sub: earningsQuality.bestBeat?.beatCount != null && earningsQuality.bestBeat?.totalCount ? `${earningsQuality.bestBeat.sector || earningsQuality.bestBeat.name || 'best sector'} (${earningsQuality.bestBeat.beatCount}/${earningsQuality.bestBeat.totalCount})` : (earningsQuality.bestBeat?.sector || earningsQuality.bestBeat?.name || 'by sector') },
            { label: 'Positive Revisions', value: earningsQuality.revisionRate != null ? `${earningsQuality.revisionRate.toFixed(0)}%` : '—', sub: `${earningsQuality.totalUpcoming} upcoming` },
            { label: 'Top Factor', value: earningsQuality.topFactor?.name || '—', sub: earningsQuality.topFactor?.value != null ? `${Number(earningsQuality.topFactor.value).toFixed(1)} score` : 'rotation' },
          ].map(item => (
            <div key={item.label} className="eqd-metric-card" style={{ margin: 0 }}>
              <div className="eqd-sidebar-title">{item.label}</div>
              <div className="eqd-metric-row">
                <span className="eqd-metric-num" style={{ color: '#6366f1', fontSize: 14 }}>{item.value}</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{item.sub}</div>
            </div>
          ))}
        </div>
        <table className="eqd-table">
          <thead>
            <tr>
              <th className="eqd-th">Metric</th>
              <th className="eqd-th">Value</th>
              <th className="eqd-th">Read</th>
            </tr>
          </thead>
          <tbody>
            <tr className="eqd-row">
              <td className="eqd-cell">High-quality stocks</td>
              <td className="eqd-cell eqd-num">{earningsQuality.qualityCount}/{stocks.length || 0}</td>
              <td className="eqd-cell">{(() => {
                const hq = stocks.filter(s => Number(s.quality ?? 0) >= 70).sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))[0];
                return hq ? `Top: ${hq.ticker} (${hq.composite})` : 'Quality score 70+';
              })()}</td>
            </tr>
            <tr className="eqd-row">
              <td className="eqd-cell">Average composite</td>
              <td className="eqd-cell eqd-num">{earningsQuality.avgComposite != null ? earningsQuality.avgComposite.toFixed(1) : '—'}</td>
              <td className="eqd-cell">{(() => {
                const top = [...stocks].sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))[0];
                return top ? `Top: ${top.ticker} (${top.composite})` : 'Factor universe';
              })()}</td>
            </tr>
            <tr className="eqd-row">
              <td className="eqd-cell">Breadth signal</td>
              <td className="eqd-cell">{earningsQuality.breadth || '—'}</td>
              <td className="eqd-cell">{breadthDivergence?.spy1m != null && breadthDivergence?.rsp1m != null ? `SPY ${(breadthDivergence.spy1m >= 0 ? '+' : '')}${breadthDivergence.spy1m.toFixed(2)}% · RSP ${(breadthDivergence.rsp1m >= 0 ? '+' : '')}${breadthDivergence.rsp1m.toFixed(2)}%` : 'Divergence context'}</td>
            </tr>
          </tbody>
        </table>
      </>
    );

    const bodies = {
      kpi: kpiPanel || null,
      sidebar: sidebarPanel || null,
      valuation: valuationBody,
      etf: rankedOption
        ? <SafeECharts option={rankedOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'ETF Performance', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [], updatedAt: lastUpdated }} />
        : null,
      'factor-favor': inFavorOption
        ? <SafeECharts option={inFavorOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Factor In Favor', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [], updatedAt: lastUpdated }} />
        : null,
      'sector-beat': beatRateOption
        ? <SafeECharts option={beatRateOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Sector Beat Rate', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [], updatedAt: lastUpdated }} />
        : null,
      shorted: (shortedOption || squeezeOption) ? (
        <div className="eqd-shorted-body">
          {shortedOption && (
            <SafeECharts option={shortedOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Most Shorted', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [], updatedAt: lastUpdated }} />
          )}
          {squeezeOption && (
            <SafeECharts option={squeezeOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Squeeze Watch', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [], updatedAt: lastUpdated }} />
          )}
        </div>
      ) : null,
      scores: scoresBody,
      earnings: earningsBody,
      institutions: (institutionsBody || topHoldingsBody || recentChangesBody) ? (
        <>
          {institutionsBody}
          {topHoldingsBody}
          {recentChangesBody}
        </>
      ) : null,
      insider: (
        <InsiderTrading
          insiderData={insiderData}
          isLive={isLive}
          lastUpdated={lastUpdated}
          fetchLog={fetchLog}
          error={error}
          fetchedOn={fetchedOn}
          isCurrent={isCurrent}
        />
      ),
      'earnings-quality': earningsQualityBody,
    };

    return {
      __render: (panelId) => bodies[panelId] ?? null,
      __live: {
        kpi: !!isLive,
        sidebar: !!isLive,
        valuation: !!isLive,
        etf: !!isLive && !!rankedOption,
        'factor-favor': !!isLive && !!inFavorOption,
        'sector-beat': !!isLive && !!beatRateOption,
        shorted: !!isLive && !!shortedOption,
        scores: !!isLive && stocks.length > 0,
        earnings: !!isLive && upcoming.length > 0,
        institutions: !!isLive && institutions.length > 0,
        insider: !!isLive && (insiderHolders.length > 0 || insiderTransactions.length > 0),
        'earnings-quality': !!isLive,
      },
      __subtitle: {
        kpi: 'Sector ETFs · factor rotation · vs SPY',
        sidebar: 'Sectors · factors · earnings · short interest',
        etf: '1W · 1M · 3M · 1Y returns vs SPY',
        'factor-favor': 'Average composite by factor',
        'sector-beat': '% of names beating EPS estimates',
        shorted: '% of float short · days to cover',
        scores: stocks.length > 0 ? `Top ${Math.min(stocks.length, 10)} by composite` : undefined,
        earnings: upcoming.length > 0 ? `Next ${Math.min(upcoming.length, 10)} reports` : undefined,
        institutions: 'By total AUM (13F)',
        insider: 'Form 4 filings · mega-cap sample',
        'earnings-quality': 'Upcoming reports, beat-rate breadth, factor leadership',
      },
      __source: {
        kpi: 'Yahoo Finance / FRED',
        sidebar: 'Yahoo Finance / FRED',
        valuation: 'Yahoo Finance / FRED',
        etf: 'Yahoo Finance',
        'factor-favor': 'Yahoo Finance',
        'sector-beat': 'Yahoo Finance',
        shorted: 'Yahoo Finance',
        scores: 'Yahoo Finance',
        earnings: 'Yahoo Finance',
        institutions: 'SEC EDGAR / Yahoo Finance',
        insider: 'SEC EDGAR / Yahoo Finance',
        'earnings-quality': 'Yahoo Finance / FRED',
      },
    };
  }, [
    kpiPanel, sidebarPanel, spPE, buffettIndicator, equityRiskPremium, sectorKpis, factorKpis,
    shortKpis, upcoming, institutions, aggregateTopHoldings, insiderTransactions, insiderHolders,
    stocks, rankedOption, inFavorOption, beatRateOption, shortedOption, earningsQuality,
    insiderData, isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent,
  ]);

  // factor-rankings is UI-present but not in MARKET_PANELS.equitiesDeepDive — mount via extra.
  const factorRankingsExtra = (
    <BentoCard
      key="factor-rankings"
      panelKey="factor-rankings"
      title="Factor Rankings"
      subtitle="Percentile scores · composite · breadth divergence · ERP"
      accent="equitiesDeepDive"
      className="eqd-bento-card"
      contentClassName="eqd-panel-scroll"
      source="Yahoo Finance / FRED"
      timestamp={lastUpdated}
      isLive={isLive}
      isCurrent={isCurrent}
      fetchedOn={fetchedOn}
      fetchLog={fetchLog}
      error={error}
    >
      <FactorRankings
        factorData={factorData}
        breadthDivergence={breadthDivergence}
        equityRiskPremium={equityRiskPremium}
      />
    </BentoCard>
  );

  return (
    <div className="eqd-dashboard eqd-dashboard--bento" role="region" aria-label="Equities Deep Dive Dashboard">
      <MarketPanelGrid
        marketId="equitiesDeepDive"
        layout={LAYOUT}
        storageKey="equities-deepdive-layout-v4"
        accent="equitiesDeepDive"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
        extra={factorRankingsExtra}
      />
    </div>
  );
}

export default React.memo(EquitiesDeepDiveDashboard);
