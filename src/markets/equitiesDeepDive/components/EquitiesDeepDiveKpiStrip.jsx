import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';

const FACTOR_KEYS = [
  { key: 'momentum', label: 'Momentum' },
  { key: 'value',    label: 'Value' },
  { key: 'quality',  label: 'Quality' },
  { key: 'lowVol',   label: 'Low-Vol' },
];

function buildSectorBarOption({ sectors, spyPerf, colors }) {
  const sorted = [...sectors].sort((a, b) => (b.perf1m ?? -99) - (a.perf1m ?? -99));
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const i = params[0]?.dataIndex;
        const s = sorted[i];
        if (!s) return '';
        const d = Number(s.perf1d ?? 0);
        const w = Number(s.perf1w ?? 0);
        const v = Number(s.perf1m ?? 0);
        const m3 = Number(s.perf3m ?? 0);
        const y = Number(s.perf1y ?? 0);
        const vsSpy = spyPerf != null ? v - spyPerf : null;
        return `<b>${s.code || s.name}</b><br/>1D: <b>${d >= 0 ? '+' : ''}${d.toFixed(2)}%</b><br/>1W: <b>${w >= 0 ? '+' : ''}${w.toFixed(2)}%</b><br/>1M: <b>${v >= 0 ? '+' : ''}${v.toFixed(2)}%</b>${vsSpy != null ? `<br/>vs SPY: ${vsSpy >= 0 ? '+' : ''}${vsSpy.toFixed(2)}pp` : ''}<br/>3M: <b>${m3 >= 0 ? '+' : ''}${m3.toFixed(2)}%</b><br/>1Y: <b>${y >= 0 ? '+' : ''}${y.toFixed(2)}%</b>`;
      },
    },
    grid: { top: 4, right: 44, bottom: 4, left: 4, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.code || s.name),
      axisLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: 500 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      barMaxWidth: 14,
      data: sorted.map(s => ({
        value: Number(s.perf1m ?? 0),
        itemStyle: { color: (s.perf1m ?? 0) >= (spyPerf ?? 0) ? '#22c55e' : '#ef4444' },
      })),
      label: {
        show: true, position: 'right',
        formatter: (p) => `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%`,
        color: colors.textSecondary, fontSize: 9,
      },
      markLine: spyPerf != null ? {
        symbol: 'none', silent: true,
        data: [{ xAxis: spyPerf }],
        lineStyle: { color: colors.textDim || '#94a3b8', type: 'dashed', width: 1 },
        label: { show: true, formatter: 'SPY', color: colors.textSecondary, fontSize: 9, position: 'end' },
      } : undefined,
    }],
  };
}

function FactorRow({ label, value, colors }) {
  const v = Number(value ?? 0);
  const safe = Number.isFinite(v) ? v : 0;
  const positive = safe >= 0;
  const color = positive ? '#22c55e' : '#ef4444';
  // Bar fill width: cap at ±10% range, scale to 100%
  const pct = Math.min(Math.abs(safe) / 10, 1) * 100;
  return (
    <div className="eqd-factor-row">
      <span className="eqd-factor-label">{label}</span>
      <div className="eqd-factor-bar-track" style={{ background: colors.cardBg }}>
        <div
          className="eqd-factor-bar-fill"
          style={{
            width: `${pct}%`,
            background: color,
            marginLeft: positive ? '50%' : `${50 - pct / 2}%`,
            transform: positive ? 'none' : 'translateX(-100%)',
          }}
        />
        <div className="eqd-factor-bar-axis" style={{ background: colors.textDim }} />
      </div>
      <span className="eqd-factor-value" style={{ color }}>
        {safe >= 0 ? '+' : ''}{safe.toFixed(2)}%
      </span>
    </div>
  );
}

const EquitiesDeepDiveKpiStrip = ({ sectorData, factorData }) => {
  const { colors } = useTheme();

  const sectors = Array.isArray(sectorData)
    ? sectorData
    : Array.isArray(sectorData?.sectors) ? sectorData.sectors : [];

  const factors = useMemo(() => {
    if (Array.isArray(factorData)) return factorData;
    if (factorData?.inFavor) {
      return FACTOR_KEYS.map(({ key, label }) => ({ name: label, value: factorData.inFavor[key] }));
    }
    return [];
  }, [factorData]);

  // SPY is included in the sector list — pull it out so the chart shows
  // only the 11 sector ETFs and uses SPY as the reference line.
  const { etfs, spyPerf } = useMemo(() => {
    const spy = sectors.find(s => s.code === 'SPY' || s.name === 'S&P 500');
    return {
      etfs: sectors.filter(s => s !== spy),
      spyPerf: spy?.perf1m ?? null,
    };
  }, [sectors]);

  const summary = useMemo(() => {
    if (!etfs.length) return null;
    const ranked = [...etfs].sort((a, b) => (b.perf1m ?? -99) - (a.perf1m ?? -99));
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    const ref = spyPerf ?? 0;
    const beating = etfs.filter(s => (s.perf1m ?? 0) >= ref).length;
    const yrLeader = [...etfs].sort((a, b) => (b.perf1y ?? -99) - (a.perf1y ?? -99))[0];
    return { best, worst, beating, total: etfs.length, yrLeader };
  }, [etfs, spyPerf]);

  const sectorOption = useMemo(
    () => etfs.length ? buildSectorBarOption({ sectors: etfs, spyPerf, colors }) : null,
    [etfs, spyPerf, colors]
  );

  if (!sectors.length && !factors.length) {
    return <div className="eqd-kpi-strip eqd-kpi-strip-empty">Waiting for sector & factor data…</div>;
  }

  return (
    <div className="eqd-kpi-strip">
      {/* Left: ranked sector bar chart */}
      <div className="eqd-kpi-section eqd-kpi-section-sectors">
        <div className="eqd-kpi-section-title">Sector ETFs · 1M (vs SPY)</div>
        {sectorOption ? (
          <SafeECharts
            option={sectorOption}
            style={{ width: '100%', height: '100%', minHeight: 160 }}
            sourceInfo={{ title: 'Sector ETFs · 1M', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [] }}
          />
        ) : (
          <div className="eqd-kpi-empty">No sector data</div>
        )}
      </div>

      {/* Middle: factor rotation bar pills */}
      <div className="eqd-kpi-section eqd-kpi-section-factors">
        <div className="eqd-kpi-section-title">Factor Rotation</div>
        <div className="eqd-factor-list">
          {factors.length ? factors.map(f => (
            <FactorRow key={f.name} label={f.name} value={f.value} colors={colors} />
          )) : <div className="eqd-kpi-empty">No factor data</div>}
        </div>
      </div>

      {/* Right: at-a-glance KPI pills */}
      <div className="eqd-kpi-section eqd-kpi-section-summary">
        <div className="eqd-kpi-section-title">Summary</div>
        {summary && (
          <div className="eqd-kpi-pill-grid">
            <div className="eqd-kpi-pill">
              <span className="eqd-kpi-pill-label">Leader</span>
              <span className="eqd-kpi-pill-value" style={{ color: '#22c55e' }}>{summary.best.code}</span>
              <span className="eqd-kpi-pill-sub">{summary.best.name ? `${summary.best.name} · ` : ''}+{(summary.best.perf1m ?? 0).toFixed(1)}%{summary.best.perf1d != null ? ` · 1D ${summary.best.perf1d >= 0 ? '+' : ''}${summary.best.perf1d.toFixed(1)}%` : ''}</span>
            </div>
            <div className="eqd-kpi-pill">
              <span className="eqd-kpi-pill-label">Laggard</span>
              <span className="eqd-kpi-pill-value" style={{ color: '#ef4444' }}>{summary.worst.code}</span>
              <span className="eqd-kpi-pill-sub">{summary.worst.name ? `${summary.worst.name} · ` : ''}{(summary.worst.perf1m ?? 0).toFixed(1)}%{summary.worst.perf1d != null ? ` · 1D ${summary.worst.perf1d >= 0 ? '+' : ''}${summary.worst.perf1d.toFixed(1)}%` : ''}</span>
            </div>
            <div className="eqd-kpi-pill">
              <span className="eqd-kpi-pill-label">SPY</span>
              <span className="eqd-kpi-pill-value">{spyPerf != null ? `${spyPerf >= 0 ? '+' : ''}${spyPerf.toFixed(1)}%` : '—'}</span>
              <span className="eqd-kpi-pill-sub">benchmark</span>
            </div>
            <div className="eqd-kpi-pill">
              <span className="eqd-kpi-pill-label">Beating SPY</span>
              <span className="eqd-kpi-pill-value" style={{ color: '#6366f1' }}>{summary.beating}/{summary.total}</span>
              <span className="eqd-kpi-pill-sub">sectors</span>
            </div>
            <div className="eqd-kpi-pill">
              <span className="eqd-kpi-pill-label">1Y Leader</span>
              <span className="eqd-kpi-pill-value" style={{ color: '#f59e0b' }}>{summary.yrLeader.code}</span>
              <span className="eqd-kpi-pill-sub">{summary.yrLeader.name ? `${summary.yrLeader.name} · ` : ''}+{(summary.yrLeader.perf1y ?? 0).toFixed(1)}% 1Y{summary.yrLeader.perf1d != null ? ` · 1D ${summary.yrLeader.perf1d >= 0 ? '+' : ''}${summary.yrLeader.perf1d.toFixed(1)}%` : ''}{summary.yrLeader.perf1m != null ? ` · 1M ${summary.yrLeader.perf1m >= 0 ? '+' : ''}${summary.yrLeader.perf1m.toFixed(1)}%` : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(EquitiesDeepDiveKpiStrip);
