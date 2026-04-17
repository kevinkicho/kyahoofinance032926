import React, { useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import SafeECharts from '../../components/SafeECharts/SafeECharts';

const COFER_COLORS = {
  USD: '#22c55e',
  EUR: '#3b82f6',
  JPY: '#f87171',
  GBP: '#a78bfa',
  CNY: '#f59e0b',
  CHF: '#64748b',
  SDR: '#14b8a6',
  Other: '#6b7280',
};

function ImfCofier({ cofer, lastUpdated }) {
  const { colors } = useTheme();

  const hasData = cofer && typeof cofer === 'object' && Object.keys(cofer).length >= 3;

  const option = useMemo(() => {
    if (!hasData) return null;

    const entries = Object.entries(cofer)
      .filter(([, v]) => v?.value != null)
      .sort((a, b) => b[1].value - a[1].value);

    const names = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v.value);
    const colorList = entries.map(([k]) => COFER_COLORS[k] || '#6b7280');
    const asOf = entries[0]?.[1]?.asOf || '';

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: (p) => `<b>${p.name}</b><br/>Share: <b>${p.value.toFixed(1)}%</b>${asOf ? `<br/>As of: ${asOf}` : ''}`,
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: colors.textSecondary, fontSize: 11 },
        itemWidth: 12,
        itemHeight: 12,
      },
      series: [{
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: colors.cardBg, borderWidth: 2 },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 10,
          color: colors.textSecondary,
        },
        data: names.map((name, i) => ({
          name,
          value: values[i],
          itemStyle: { color: colorList[i] },
        })),
      }],
    };
  }, [cofer, hasData, colors]);

  if (!option) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No COFER data available</div>;

  return <SafeECharts option={option} style={{ height: '100%', minHeight: 280 }} />;
}

export default React.memo(ImfCofier);