import React, { useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import SafeECharts from '../../components/SafeECharts/SafeECharts';

function WbTradeOpenness({ countries, lastUpdated }) {
  const { colors } = useTheme();

  const option = useMemo(() => {
    if (!countries?.length) return null;

    const sorted = [...countries]
      .filter(c => c.tradeGdp != null)
      .sort((a, b) => b.tradeGdp - a.tradeGdp);

    if (sorted.length === 0) return null;

    const categories = sorted.map(c => `${c.flag} ${c.code}`);
    const values = sorted.map(c => c.tradeGdp);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: (params) => {
          const idx = params[0]?.dataIndex;
          const cur = sorted[idx];
          if (!cur) return '';
          return `<b>${cur.flag} ${cur.name}</b><br/>Trade: <b>${cur.tradeGdp.toFixed(0)}% of GDP</b>`;
        },
      },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: colors.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.border } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.borderSubtle } },
        axisLine: { lineStyle: { color: colors.border } },
      },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: {
            color: v > 80 ? '#f59e0b' : v > 50 ? '#818cf8' : '#64748b',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barMaxWidth: 40,
        label: {
          show: true,
          position: 'top',
          formatter: (p) => `${p.value.toFixed(0)}%`,
          fontSize: 9,
          color: colors.textSecondary,
        },
      }],
    };
  }, [countries, colors]);

  if (!option) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No trade data available</div>;

  return <SafeECharts option={option} style={{ height: '100%', minHeight: 280 }} />;
}

export default React.memo(WbTradeOpenness);