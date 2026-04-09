import React, { useMemo } from 'react';
import SafeECharts from '../SafeECharts';
import { useTheme } from '../../hub/ThemeContext';

const SECTOR_COLORS = {
  'Technology':  '#3b82f6',
  'Financials':  '#10b981',
  'Consumer':    '#f59e0b',
  'Healthcare':  '#ec4899',
  'Energy':      '#f97316',
  'Industrials': '#8b5cf6',
  'Crypto':      '#f7931a',
  'Other':       '#64748b',
};

const REGION_COLORS = {
  'United States': '#3b82f6',
  'China':         '#ef4444',
  'Europe':        '#10b981',
  'Japan':         '#eab308',
  'UK':            '#8b5cf6',
  'India':         '#f97316',
  'Canada':        '#06b6d4',
  'Australia':     '#84cc16',
  'Brazil':        '#ec4899',
  'South Africa':  '#14b8a6',
  'Saudi Arabia':  '#fbbf24',
  'South Korea':   '#6366f1',
  'Taiwan':        '#d946ef',
};

const BarRaceView = ({ flatData, currentRate, currentSymbol, currency, snapshotDate, groupBy = 'market' }) => {
  const { colors } = useTheme();

  // Sort descending by value, take top 30, then reverse so ECharts shows largest on top
  const top = useMemo(() => {
    return [...flatData]
      .sort((a, b) => (b.adjustedValue || b.value) - (a.adjustedValue || a.value))
      .slice(0, 30)
      .reverse(); // ECharts y-axis renders bottom-to-top; last item = top
  }, [flatData]);

  // Color function: by sector or by region depending on groupBy
  const getColor = (s) => {
    if (groupBy === 'market') return REGION_COLORS[s.region] || '#64748b';
    return SECTOR_COLORS[s.sector] || '#64748b';
  };

  const option = useMemo(() => ({
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 12, bottom: 42, left: 210, right: 120 },
    xAxis: {
      max: 'dataMax',
      type: 'value',
      axisLine: { lineStyle: { color: colors.border } },
      splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
      axisLabel: {
        color: colors.textMuted,
        fontSize: 11,
        formatter: v => {
          if (v >= 1000) return `${currentSymbol}${(v * currentRate / 1000).toFixed(1)}T`;
          return `${currentSymbol}${(v * currentRate).toFixed(0)}B`;
        }
      }
    },
    yAxis: {
      type: 'category',
      data: top.map(s => s.fullName || s.ticker),
      axisLabel: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '600',
        width: 200,
        overflow: 'truncate',
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      realtimeSort: false,
      type: 'bar',
      data: top.map(s => ({
        value: s.adjustedValue || s.value,
        name: s.fullName || s.ticker,
        ticker: s.ticker,
        sector: s.sector,
        region: s.region,
        itemStyle: {
          color: getColor(s),
          borderRadius: [0, 4, 4, 0],
        }
      })),
      barMaxWidth: 40,
      label: {
        show: true,
        position: 'right',
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'JetBrains Mono, monospace',
        formatter: params => {
          const v = params.value * currentRate;
          if (v >= 1000) return `${currentSymbol}${(v / 1000).toFixed(2)}T`;
          return `${currentSymbol}${v.toFixed(0)}B`;
        }
      },
      emphasis: { itemStyle: { opacity: 0.85 } }
    }],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 12 },
      formatter: params => {
        const d = params[0]?.data;
        if (!d) return '';
        const v = d.value * currentRate;
        const cap = v >= 1000
          ? `${currentSymbol}${(v / 1000).toFixed(3)}T`
          : `${currentSymbol}${v.toFixed(0)}B`;
        return `<strong>${d.name}</strong><br/>${d.ticker} · ${d.sector}<br/>Market Cap: ${cap} (${currency})<br/><span style="color:${colors.textMuted};font-size:0.75rem">${d.region}</span>`;
      }
    },
  }), [top, currentRate, currentSymbol, currency, groupBy, colors]);

  // Legend items (by sector or by region)
  const legendItems = useMemo(() => {
    const seen = new Set();
    const out  = [];
    [...flatData]
      .sort((a, b) => (b.adjustedValue || b.value) - (a.adjustedValue || a.value))
      .slice(0, 30)
      .forEach(s => {
        const key = groupBy === 'market' ? s.region : s.sector;
        const col = groupBy === 'market' ? (REGION_COLORS[key] || '#64748b') : (SECTOR_COLORS[key] || '#64748b');
        if (key && !seen.has(key)) { seen.add(key); out.push({ label: key, color: col }); }
      });
    return out;
  }, [flatData, groupBy]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        padding: '0.45rem 1rem 0.25rem',
        borderBottom: `1px solid ${colors.cardBg}`,
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Bar Race
        </span>
        <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>
          Top 30 by Market Cap · colored by {groupBy === 'market' ? 'region' : 'sector'}
        </span>
        {snapshotDate && (
          <span style={{ fontSize: '0.68rem', color: '#a855f7', fontWeight: 600 }}>
            {snapshotDate}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {legendItems.map(({ label, color }) => (
          <span key={label} style={{
            fontSize: '0.6rem', fontWeight: 600,
            color,
            background: `${color}22`,
            border: `1px solid ${color}55`,
            borderRadius: '999px', padding: '0.04rem 0.38rem',
            whiteSpace: 'nowrap',
          }}>{label}</span>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SafeECharts
          option={option}
          notMerge={false}
          lazyUpdate={false}
          style={{ height: '100%', width: '100%', minHeight: '400px' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    </div>
  );
};

export default BarRaceView;
