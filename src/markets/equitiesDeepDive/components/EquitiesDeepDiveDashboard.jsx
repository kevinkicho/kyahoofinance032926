// src/markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
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

  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
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
      data: etfs.map(s => s.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: etfs.map(s => ({
        value: s.perf1m,
        itemStyle: { color: (s.perf1m ?? 0) >= spyRef ? '#6366f1' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: spyRef }],
        symbol: 'none',
        lineStyle: { color: colors.text, type: 'dashed', width: 1 },
        label: { show: true, formatter: 'SPY', color: colors.textSecondary, fontSize: 9 },
      },
    }],
  };
}

function buildInFavorOption(inFavor, colors) {
  const factors = [
    { name: 'Low-Vol', value: inFavor.lowVol ?? 0 },
    { name: 'Quality', value: inFavor.quality ?? 0 },
    { name: 'Value', value: inFavor.value ?? 0 },
    { name: 'Momentum', value: inFavor.momentum ?? 0 },
  ];
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
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

function buildBeatRateOption(beatRates, colors) {
  const sorted = [...beatRates].sort((a, b) => (b.beatRate ?? 0) - (a.beatRate ?? 0));
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
        return item ? `${base} (${item.beatCount}/${item.totalCount})` : base;
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
        return item ? `${base} · ${item.daysToCover?.toFixed(1)}d to cover` : base;
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

const LAYOUT = {
  lg: [
    { i: 'valuation', x: 0, y: 0, w: 4, h: 2 },
    { i: 'etf', x: 4, y: 0, w: 4, h: 3 },
    { i: 'factor-favor', x: 8, y: 0, w: 4, h: 3 },
    { i: 'sector-beat', x: 0, y: 3, w: 4, h: 3 },
    { i: 'shorted', x: 4, y: 3, w: 4, h: 3 },
    { i: 'scores', x: 8, y: 3, w: 4, h: 3 },
    { i: 'earnings', x: 0, y: 6, w: 6, h: 3 },
    { i: 'institutions', x: 6, y: 6, w: 6, h: 2 },
  ]
};

function EquitiesDeepDiveDashboard({
  sectorData,
  factorData,
  earningsData,
  shortData,
  institutionalData,
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

  const rankedOption = useMemo(() => sectors?.length > 0 ? buildRankedOption(sectors, colors) : null, [sectors, colors]);
  const inFavorOption = useMemo(() => inFavor ? buildInFavorOption(inFavor, colors) : null, [inFavor, colors]);
  const beatRateOption = useMemo(() => beatRates?.length > 0 ? buildBeatRateOption(beatRates, colors) : null, [beatRates, colors]);
  const shortedOption = useMemo(() => mostShorted?.length > 0 ? buildShortedOption(mostShorted, colors) : null, [mostShorted, colors]);

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

  const stopDrag = (e) => e.stopPropagation();

  return (
    <div className="eqd-dashboard eqd-dashboard--bento" role="region" aria-label="Equities Deep Dive Dashboard">
      <BentoWrapper layout={LAYOUT} storageKey="equities-deepdive-layout">
        {/* Key Metrics */}
        <div key="valuation" className="eqd-bento-card">
          <div className="eqd-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content eqd-panel-scroll" onMouseDown={stopDrag}>
            {/* Market Valuation */}
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
            {/* Sector Performance */}
            {sectorKpis && (
              <div className="eqd-metric-card">
                <div className="eqd-sidebar-title">Sector Performance</div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Best</span>
                  <span className="eqd-metric-num" style={{ color: '#22c55e' }}>{sectorKpis.best.name}</span>
                </div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Worst</span>
                  <span className="eqd-metric-num" style={{ color: '#ef4444' }}>{sectorKpis.worst.name}</span>
                </div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">SPY</span>
                  <span className="eqd-metric-num"><MetricValue value={sectorKpis.spyPerf} seriesKey="sp500Perf" timestamp={lastUpdated} format={v => fmtChangePct(v)} /></span>
                </div>
              </div>
            )}
            {/* Factor Scores */}
            {factorKpis && (
              <div className="eqd-metric-card">
                <div className="eqd-sidebar-title">Factor Scores</div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Top Factor</span>
                  <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{factorKpis.topFactor.name}</span>
                </div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Top Stock</span>
                  <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{factorKpis.topStock.ticker}</span>
                </div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Avg Composite</span>
                  <span className="eqd-metric-num"><MetricValue value={factorKpis.avgComposite} seriesKey="avgFactorScore" timestamp={lastUpdated} format={v => v.toFixed(0)} /></span>
                </div>
              </div>
            )}
            {/* Short Interest */}
            {shortKpis && (
              <div className="eqd-metric-card">
                <div className="eqd-sidebar-title">Short Interest</div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Most Shorted</span>
                  <span className="eqd-metric-num" style={{ color: '#ef4444' }}>{shortKpis.top.ticker}</span>
                </div>
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
            {/* Earnings */}
            {upcoming.length > 0 && (
              <div className="eqd-metric-card">
                <div className="eqd-sidebar-title">Earnings</div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Next Report</span>
                  <span className="eqd-metric-num" style={{ color: '#6366f1' }}>{upcoming[0].ticker}</span>
                </div>
                <div className="eqd-metric-row">
                  <span className="eqd-metric-name">Upcoming</span>
                  <span className="eqd-metric-num"><MetricValue value={upcoming.length} seriesKey="earningsEpsEst" timestamp={lastUpdated} /></span>
                </div>
              </div>
            )}
            {/* Institutions */}
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
              </div>
            )}
            <DataFooter source="Yahoo Finance / FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        </div>

        {/* ETF Performance Chart */}
        {rankedOption && (
          <div key="etf" className="eqd-bento-card">
            <div className="eqd-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">ETF Performance</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={rankedOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'ETF Performance', source: 'Yahoo Finance', endpoint: '/api/equities-deep-dive', series: [], updatedAt: lastUpdated }} />
              <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          </div>
        )}

        {/* Factor In Favor Chart */}
        {inFavorOption && (
          <div key="factor-favor" className="eqd-bento-card">
            <div className="eqd-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Factor In Favor</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={inFavorOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Factor In Favor', source: 'Yahoo Finance', endpoint: '/api/equities-deep-dive', series: [], updatedAt: lastUpdated }} />
              <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          </div>
        )}

        {/* Sector Beat Rate Chart */}
        {beatRateOption && (
          <div key="sector-beat" className="eqd-bento-card">
            <div className="eqd-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Sector Beat Rate</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={beatRateOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Sector Beat Rate', source: 'Yahoo Finance', endpoint: '/api/equities-deep-dive', series: [], updatedAt: lastUpdated }} />
              <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          </div>
        )}

        {/* Most Shorted Chart */}
        {shortedOption && (
          <div key="shorted" className="eqd-bento-card">
            <div className="eqd-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Most Shorted</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={shortedOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Most Shorted', source: 'Yahoo Finance', endpoint: '/api/equities-deep-dive', series: [], updatedAt: lastUpdated }} />
              <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          </div>
        )}

        {/* Stock Factor Scores Table */}
        {stocks.length > 0 && (
          <div key="scores" className="eqd-bento-card">
            <div className="eqd-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Stock Factor Scores</span>
            </div>
            <div className="bento-panel-content eqd-panel-scroll" onMouseDown={stopDrag}>
              <table className="eqd-table">
                <thead>
                  <tr>
                    <th className="eqd-th">Ticker</th>
                    <th className="eqd-th">Value</th>
                    <th className="eqd-th">Momentum</th>
                    <th className="eqd-th">Quality</th>
                    <th className="eqd-th">Composite</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.slice(0, 10).map(s => (
                    <tr key={s.ticker} className="eqd-row">
                      <td className="eqd-cell"><strong>{s.ticker}</strong></td>
                      <td className={`eqd-cell eqd-score ${factorHeat(s.value)}`}><MetricValue value={s.value} seriesKey="factorValue" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></td>
                      <td className={`eqd-cell eqd-score ${factorHeat(s.momentum)}`}><MetricValue value={s.momentum} seriesKey="factorMomentum" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></td>
                      <td className={`eqd-cell eqd-score ${factorHeat(s.quality)}`}><MetricValue value={s.quality} seriesKey="factorQuality" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></td>
                      <td className={`eqd-cell eqd-score ${factorHeat(s.composite)}`}><strong><MetricValue value={s.composite} seriesKey="factorComposite" timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} /></strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          </div>
        )}

        {/* Upcoming Earnings */}
        {upcoming.length > 0 && (
          <div key="earnings" className="eqd-bento-card">
            <div className="eqd-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Upcoming Earnings</span>
            </div>
            <div className="bento-panel-content eqd-panel-scroll" onMouseDown={stopDrag}>
              <table className="eqd-table">
                <thead>
                  <tr>
                    <th className="eqd-th">Date</th>
                    <th className="eqd-th">Ticker</th>
                    <th className="eqd-th">EPS Est</th>
                    <th className="eqd-th">Dir</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.slice(0, 10).map(e => (
                    <tr key={e.ticker} className="eqd-row">
                      <td className="eqd-cell eqd-date">{e.date}</td>
                      <td className="eqd-cell"><strong>{e.ticker}</strong></td>
                      <td className="eqd-cell eqd-num"><MetricValue value={e.epsEst} seriesKey="earningsEpsEst" timestamp={lastUpdated} format={v => v != null ? `$${v.toFixed(2)}` : '—'} /></td>
                      <td className="eqd-cell eqd-dir">
                        {(e.epsEst ?? 0) >= (e.epsPrev ?? 0) ? '▲' : '▼'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <DataFooter source="Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          </div>
        )}

        {/* Institutions */}
        {institutions.length > 0 && (
          <div key="institutions" className="eqd-bento-card">
            <div className="eqd-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Top Institutions</span>
            </div>
            <div className="bento-panel-content eqd-panel-scroll" onMouseDown={stopDrag}>
              <div className="eqd-mini-table">
                {institutions.slice(0, 6).map((inst, i) => (
                  <div key={i} className="eqd-mini-row">
                    <span className="eqd-mini-name">{inst.name.length > 18 ? inst.name.slice(0, 18) + '…' : inst.name}</span>
                     <span className="eqd-mini-value"><MetricValue value={inst.totalValue} seriesKey="institutionTotalValue" timestamp={lastUpdated} format={v => `$${(v / 1000).toFixed(1)}T`} /></span>
                  </div>
                ))}
              </div>
              <DataFooter source="SEC EDGAR / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
            </div>
          </div>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(EquitiesDeepDiveDashboard);