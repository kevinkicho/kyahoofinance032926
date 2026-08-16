import React, { useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import SafeECharts from '../../components/SafeECharts/SafeECharts';

/** Merge IFS year maps onto country rows; used by the tile and live chip. */
export function reserveRows(countries, ifsReserves) {
  if (!Array.isArray(countries) || !countries.length) return [];
  return countries
    .map((c) => {
      if (c.intlReserves != null) return c;
      const reservesByYear = ifsReserves?.[c.code];
      if (reservesByYear && typeof reservesByYear === 'object') {
        const years = Object.keys(reservesByYear).sort();
        const latest = years.length ? reservesByYear[years[years.length - 1]] : null;
        if (typeof latest === 'number') return { ...c, intlReserves: latest };
      }
      return c;
    })
    .filter((c) => c.intlReserves != null)
    .sort((a, b) => b.intlReserves - a.intlReserves);
}

export function hasReserveRows(countries, ifsReserves) {
  return reserveRows(countries, ifsReserves).length > 0;
}

function ImfReserves({ countries, ifsReserves, lastUpdated }) {
  const { colors } = useTheme();

  const chartData = useMemo(() => {
    const rows = reserveRows(countries, ifsReserves);
    return rows.length ? rows : null;
  }, [countries, ifsReserves]);

  const option = useMemo(() => {
    if (!chartData?.length) return null;

    const categories = chartData.map(c => `${c.flag} ${c.code}`);
    const values = chartData.map(c => c.intlReserves);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: (params) => {
          const idx = params[0]?.dataIndex;
          const cur = chartData[idx];
          if (!cur) return '';
          return `<b>${cur.flag} ${cur.name}</b><br/>Reserves: <b>$${cur.intlReserves.toFixed(1)}B</b>`;
        },
      },
      grid: { left: 70, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: colors.textMuted, fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: colors.border } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '${value}B' },
        splitLine: { lineStyle: { color: colors.borderSubtle } },
        axisLine: { lineStyle: { color: colors.border } },
      },
      series: [{
        type: 'bar',
        data: values.map(v => ({
          value: v,
          itemStyle: { color: '#818cf8', borderRadius: [3, 3, 0, 0] },
        })),
        barMaxWidth: 32,
        label: {
          show: true,
          position: 'top',
          formatter: (p) => `$${p.value.toFixed(0)}B`,
          fontSize: 9,
          color: colors.textSecondary,
        },
      }],
    };
  }, [chartData, colors]);

  if (!option) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No reserve data available</div>;

  return <SafeECharts option={option} style={{ height: '100%', minHeight: 280 }} />;
}

export default React.memo(ImfReserves);