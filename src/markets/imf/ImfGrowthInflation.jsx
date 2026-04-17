import React, { useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import SafeECharts from '../../components/SafeECharts/SafeECharts';

const INDICATOR_META = {
  gdpReal:   { label: 'GDP Growth (%)',  colorPositive: '#4ade80', colorNegative: '#f87171' },
  inflation: { label: 'Inflation (%)',   colorGood: '#4ade80', colorWarn: '#fbbf24', colorBad: '#f87171' },
};

function ImfGrowthInflation({ countries, weoForecasts, indicator, lastUpdated }) {
  const { colors } = useTheme();
  const meta = INDICATOR_META[indicator] || INDICATOR_META.gdpReal;
  const isGdp = indicator === 'gdpReal';

  const chartData = useMemo(() => {
    if (!countries?.length) return null;
    const sorted = [...countries].sort((a, b) => (b[indicator] ?? -999) - (a[indicator] ?? -999));
    return sorted.filter(c => c[indicator] != null);
  }, [countries, indicator]);

  const option = useMemo(() => {
    if (!chartData?.length) return null;

    const categories = chartData.map(c => `${c.flag} ${c.code}`);
    const values = chartData.map(c => c[indicator]);
    const prevValues = chartData.map(c => c[indicator + 'Prev']);

    const barColor = isGdp
      ? values.map(v => v >= 0 ? meta.colorPositive : meta.colorNegative)
      : values.map(v => v <= 2 ? meta.colorGood : v <= 4 ? meta.colorWarn : meta.colorBad);

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
          const prev = cur[indicator + 'Prev'];
          let html = `<b>${cur.flag} ${cur.name}</b><br/>${meta.label}: <b>${cur[indicator]?.toFixed(1)}%</b>`;
          if (prev != null) html += `<br/>Prev: ${prev.toFixed(1)}%`;
          return html;
        },
      },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: colors.textMuted, fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: colors.border } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.borderSubtle } },
        axisLine: { lineStyle: { color: colors.border } },
      },
      series: [
        {
          type: 'bar',
          data: values.map((v, i) => ({
            value: v,
            itemStyle: { color: barColor[i], borderRadius: [3, 3, 0, 0] },
          })),
          barMaxWidth: 32,
          label: {
            show: true,
            position: 'top',
            formatter: (p) => `${p.value.toFixed(1)}%`,
            fontSize: 9,
            color: colors.textSecondary,
          },
        },
        ...(prevValues.some(v => v != null) ? [{
          type: 'bar',
          name: 'Previous',
          data: prevValues.map((v, i) => ({
            value: v ?? '-',
            itemStyle: { color: colors.textDim, opacity: 0.4, borderRadius: [3, 3, 0, 0] },
          })),
          barMaxWidth: 32,
        }] : []),
      ],
    };
  }, [chartData, colors, indicator, isGdp, meta]);

  if (!option) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No data available</div>;

  return <SafeECharts option={option} style={{ height: '100%', minHeight: 280 }} />;
}

export default React.memo(ImfGrowthInflation);