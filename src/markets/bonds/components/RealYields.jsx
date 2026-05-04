import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';

// Renders just the chart content. Parent wraps in <BentoCard
// title="TIPS Real Yields"> and supplies the DataFooter slots.
function RealYields({ realYieldHistory, lastUpdated }) {
  const { colors } = useTheme();

  const option = useMemo(() => {
    if (!realYieldHistory?.dates?.length) return null;
    const d = realYieldHistory.dates;
    const step = Math.max(1, Math.floor(d.length / 50));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const subsample = (arr) => arr ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1) : [];
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['5Y TIPS', '10Y TIPS'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '5Y TIPS', type: 'line', data: subsample(realYieldHistory.d5y), symbol: 'none', smooth: true, lineStyle: { color: '#22d3ee', width: 1.5 } },
        { name: '10Y TIPS', type: 'line', data: subsample(realYieldHistory.d10y), symbol: 'none', smooth: true, lineStyle: { color: '#a78bfa', width: 1.5 } },
      ],
    };
  }, [realYieldHistory, colors]);

  return option ? (
    <SafeECharts
      option={option}
      style={{ height: '100%', width: '100%' }}
      sourceInfo={{ title: 'TIPS Real Yields', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'DFII5' }, { id: 'DFII10' }], updatedAt: lastUpdated }}
    />
  ) : (
    <div className="bonds-empty">No real yield data available</div>
  );
}

export default React.memo(RealYields);
