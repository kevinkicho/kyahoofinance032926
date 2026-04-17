import React, { useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import SafeECharts from '../../components/SafeECharts/SafeECharts';

const SERIES_COLORS = {
  US: '#818cf8', GB: '#f59e0b', DE: '#4ade80', FR: '#f87171',
  JP: '#38bdf8', IT: '#a78bfa', CA: '#fb923c', CN: '#e879f9',
  IN: '#34d399', BR: '#fbbf24',
};

function WbDevScatter({ countries, lastUpdated }) {
  const { colors } = useTheme();

  const option = useMemo(() => {
    if (!countries?.length) return null;

    const data = countries
      .filter(c => c.gdpPerCap != null && c.gdpGrowth != null)
      .map(c => ({
        name: `${c.flag} ${c.code}`,
        value: [c.gdpPerCap, c.gdpGrowth],
        itemStyle: { color: SERIES_COLORS[c.code] || '#818cf8' },
      }));

    if (data.length < 2) return null;

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: (p) => `${p.data.name}<br/>GDP/Cap: <b>$${(p.data.value[0] / 1000).toFixed(1)}k</b><br/>GDP Growth: <b>${p.data.value[1].toFixed(1)}%</b>`,
      },
      grid: { left: 70, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'value',
        name: 'GDP per Capita (USD)',
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: v => `$${(v / 1000).toFixed(0)}k` },
        splitLine: { lineStyle: { color: colors.borderSubtle } },
        axisLine: { lineStyle: { color: colors.border } },
      },
      yAxis: {
        type: 'value',
        name: 'GDP Growth (%)',
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.borderSubtle } },
        axisLine: { lineStyle: { color: colors.border } },
      },
      series: [{
        type: 'scatter',
        data,
        symbolSize: (val) => Math.max(12, Math.min(30, Math.abs(val[1]) * 4 + 10)),
        label: {
          show: true,
          formatter: (p) => p.data.name.slice(-2),
          position: 'right',
          fontSize: 9,
          color: colors.textSecondary,
        },
      }],
    };
  }, [countries, colors]);

  if (!option) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No data available</div>;

  return <SafeECharts option={option} style={{ height: '100%', minHeight: 280 }} />;
}

export default React.memo(WbDevScatter);