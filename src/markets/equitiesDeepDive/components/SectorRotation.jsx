import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './EquityComponents.css';

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

function buildRotationOption(sectors, colors) {
  const etfs = sectors.filter(s => s.code !== 'SPY');
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p.data[2]}<br/>1M: ${p.data[0]?.toFixed(1)}%<br/>3M: ${p.data[1]?.toFixed(1)}%`,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: '1M %',
      nameTextStyle: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'value',
      name: '3M %',
      nameTextStyle: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'scatter',
      data: etfs.map(s => [s.perf1m ?? 0, s.perf3m ?? 0, s.code]),
      symbolSize: 14,
      itemStyle: { color: '#6366f1' },
      label: {
        show: true,
        formatter: p => p.data[2],
        position: 'right',
        color: colors.textSecondary,
        fontSize: 9,
      },
      markLine: {
        data: [{ xAxis: 0 }, { yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: colors.textDim, type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

function peBadgeColor(pe) {
  if (pe == null) return '#6b7280';
  if (pe < 18)   return '#22c55e';
  if (pe <= 25)  return '#f59e0b';
  return '#ef4444';
}

function buffettBadgeColor(ratio) {
  if (ratio == null) return '#6b7280';
  if (ratio < 100)   return '#22c55e';
  if (ratio <= 150)  return '#f59e0b';
  return '#ef4444';
}

function erpBadgeColor(erp) {
  if (erp == null) return '#6b7280';
  if (erp > 3)    return '#22c55e';
  if (erp >= 1)   return '#f59e0b';
  return '#ef4444';
}

export default function SectorRotation({ sectorData, spPE, buffettIndicator, equityRiskPremium }) {
  const { colors } = useTheme();
  const { sectors = [] } = sectorData ?? {};

  const rankedOption = useMemo(() => buildRankedOption(sectors, colors), [sectors, colors]);
  const rotationOption = useMemo(() => buildRotationOption(sectors, colors), [sectors, colors]);

  const kpis = useMemo(() => {
    const spy = sectors.find(s => s.code === 'SPY');
    const etfs = sectors.filter(s => s.code !== 'SPY');
    if (!etfs.length) return null;
    const best = etfs.reduce((a, b) => (a.perf1m ?? -99) > (b.perf1m ?? -99) ? a : b);
    const worst = etfs.reduce((a, b) => (a.perf1m ?? 99) < (b.perf1m ?? 99) ? a : b);
    const spyPerf = spy?.perf1m ?? 0;
    const outperforming = etfs.filter(s => (s.perf1m ?? 0) >= spyPerf).length;
    return { best, worst, spyPerf, outperforming, total: etfs.length };
  }, [sectors]);

  if (!sectorData) return null;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Sector Rotation</span>
        <span className="eq-panel-subtitle">1M performance vs S&amp;P 500 · quadrant scatter chart</span>
      </div>
      {/* KPI Strip */}
      {kpis && (
        <div className="eq-kpi-strip">
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Best Sector</span>
            <span className="eq-kpi-value accent">{kpis.best.name}</span>
            <span className="eq-kpi-sub">{kpis.best.perf1m >= 0 ? '+' : ''}{kpis.best.perf1m?.toFixed(1)}%</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Worst Sector</span>
            <span className="eq-kpi-value" style={{ color: '#ef4444' }}>{kpis.worst.name}</span>
            <span className="eq-kpi-sub">{kpis.worst.perf1m >= 0 ? '+' : ''}{kpis.worst.perf1m?.toFixed(1)}%</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">SPY 1M</span>
            <span className={`eq-kpi-value ${kpis.spyPerf >= 0 ? 'positive' : 'negative'}`}>
              {kpis.spyPerf >= 0 ? '+' : ''}{kpis.spyPerf.toFixed(1)}%
            </span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Outperforming</span>
            <span className="eq-kpi-value accent">{kpis.outperforming}</span>
            <span className="eq-kpi-sub">of {kpis.total} sectors</span>
          </div>
        </div>
      )}
      {/* Market Valuation KPI Strip */}
      {(spPE != null || buffettIndicator || equityRiskPremium) && (
        <div style={{ marginBottom: '12px' }}>
          <div className="eq-chart-title" style={{ marginBottom: '6px' }}>Market Valuation</div>
          <div className="eq-kpi-strip">
            {spPE != null && (
              <div className="eq-kpi-pill">
                <span className="eq-kpi-label">S&amp;P P/E</span>
                <span className="eq-kpi-value" style={{ color: peBadgeColor(spPE) }}>{spPE.toFixed(1)}x</span>
                <span className="eq-kpi-sub">{spPE < 18 ? 'Cheap' : spPE <= 25 ? 'Fair' : 'Elevated'}</span>
              </div>
            )}
            {buffettIndicator && (
              <div className="eq-kpi-pill">
                <span className="eq-kpi-label">Buffett Indicator</span>
                <span className="eq-kpi-value" style={{ color: buffettBadgeColor(buffettIndicator.ratio) }}>
                  {buffettIndicator.ratio?.toFixed(1)}%
                </span>
                <span className="eq-kpi-sub">{buffettIndicator.ratio < 100 ? 'Undervalued' : buffettIndicator.ratio <= 150 ? 'Fair value' : 'Overvalued'}</span>
              </div>
            )}
            {equityRiskPremium && (
              <div className="eq-kpi-pill">
                <span className="eq-kpi-label">ERP Spread</span>
                <span className="eq-kpi-value" style={{ color: erpBadgeColor(equityRiskPremium.erp) }}>
                  {equityRiskPremium.erp?.toFixed(2)}%
                </span>
                <span className="eq-kpi-sub">{equityRiskPremium.erp > 3 ? 'Attractive' : equityRiskPremium.erp >= 1 ? 'Fair' : 'Unattractive'}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">ETF Performance</div>
          <div className="eq-chart-subtitle">1M return vs SPY benchmark · indigo = outperforming</div>
          <div className="eq-chart-wrap">
            <SafeECharts option={rankedOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Rotation Quadrant</div>
          <div className="eq-chart-subtitle">X = 1M · Y = 3M · top-right = Leading · top-left = Improving</div>
          <div className="eq-chart-wrap">
            <SafeECharts option={rotationOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
