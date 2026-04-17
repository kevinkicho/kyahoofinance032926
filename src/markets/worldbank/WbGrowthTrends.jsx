import React, { useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import SafeECharts from '../../components/SafeECharts/SafeECharts';

const COUNTRY_LOOKUP = {
  US: { name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  GB: { name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  DE: { name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  FR: { name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  JP: { name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}' },
  IT: { name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  CA: { name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  CN: { name: 'China', flag: '\u{1F1E8}\u{1F1F3}' },
  IN: { name: 'India', flag: '\u{1F1EE}\u{1F1F3}' },
  BR: { name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}' },
};

const SERIES_COLORS = ['#818cf8', '#f59e0b', '#4ade80', '#f87171', '#38bdf8', '#a78bfa', '#fb923c', '#34d399', '#e879f9', '#fbbf24'];

function WbGrowthTrends({ trendData, lastUpdated }) {
  const { colors } = useTheme();

  const option = useMemo(() => {
    const gdpByCountry = trendData?.gdpGrowth;
    if (!gdpByCountry || Object.keys(gdpByCountry).length === 0) return null;

    const allYears = new Set();
    for (const points of Object.values(gdpByCountry)) {
      for (const dp of points) {
        if (dp.value != null) allYears.add(dp.date);
      }
    }
    const years = [...allYears].sort();

    const series = Object.entries(COUNTRY_LOOKUP).map(([code, info], idx) => {
      const points = gdpByCountry[code] || [];
      const data = years.map(y => {
        const dp = points.find(p => p.date === y);
        return dp?.value != null ? parseFloat(dp.value.toFixed(2)) : null;
      });
      return {
        name: `${info.flag} ${code}`,
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: SERIES_COLORS[idx] },
        itemStyle: { color: SERIES_COLORS[idx] },
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: (params) => {
          const year = params[0]?.axisValue;
          let html = `<b>${year}</b><br/>`;
          for (const p of params) {
            if (p.value != null) html += `${p.marker} ${p.seriesName}: <b>${p.value.toFixed(1)}%</b><br/>`;
          }
          return html;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { color: colors.textSecondary, fontSize: 10 },
        itemWidth: 14,
        itemHeight: 8,
      },
      grid: { left: 50, right: 20, top: 10, bottom: 50 },
      xAxis: {
        type: 'category',
        data: years,
        axisLabel: { color: colors.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.border } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.borderSubtle } },
        axisLine: { lineStyle: { color: colors.border } },
      },
      series,
    };
  }, [trendData, colors]);

  if (!option) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No trend data available</div>;

  return <SafeECharts option={option} style={{ height: '100%', minHeight: 280 }} />;
}

export default React.memo(WbGrowthTrends);