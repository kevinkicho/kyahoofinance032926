import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import { hasCpiComponentsSeries, cpiComponentSeries } from './BondsLiveChips';

const CpiComponents = ({ cpiComponents, lastUpdated }) => {
  const { colors } = useTheme();

  const option = useMemo(() => {
    if (!hasCpiComponentsSeries(cpiComponents)) return null;

    // Filter for last 60 months if data is longer
    const datesAll = cpiComponentSeries(cpiComponents, 'dates');
    const dataLength = datesAll.length;
    const sliceStart = Math.max(0, dataLength - 60);
    const dates = datesAll.slice(sliceStart);

    const slice = (key) => cpiComponentSeries(cpiComponents, key).slice(sliceStart);

    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { 
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: { 
        data: ['All', 'Core', 'Food', 'Energy'], 
        top: 0, 
        textStyle: { color: colors.textSecondary, fontSize: 10 } 
      },
      grid: { 
        top: 24, 
        right: 16, 
        bottom: 24, 
        left: 48 
      },
      xAxis: { 
        type: 'category', 
        data: dates, 
        axisLabel: { 
          color: colors.textMuted, 
          fontSize: 9, 
          interval: Math.floor(dates.length / 6) 
        }, 
        axisLine: { lineStyle: { color: colors.cardBg } } 
      },
      yAxis: { 
        type: 'value', 
        axisLabel: { 
          color: colors.textMuted, 
          fontSize: 9, 
          formatter: '{value}%' 
        }, 
        splitLine: { lineStyle: { color: colors.cardBg } } 
      },
      series: [
        { name: 'All', type: 'line', data: slice('all'), symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
        { name: 'Core', type: 'line', data: slice('core'), symbol: 'none', smooth: true, lineStyle: { color: '#a78bfa', width: 1.5 } },
        { name: 'Food', type: 'line', data: slice('food'), symbol: 'none', smooth: true, lineStyle: { color: '#22c55e', width: 1.5 } },
        { name: 'Energy', type: 'line', data: slice('energy'), symbol: 'none', smooth: true, lineStyle: { color: '#f59e0b', width: 1.5 } },
      ],
    };
  }, [cpiComponents, colors]);

  if (!option) return <div className="bonds-empty">No CPI data available</div>;

  return (
    <SafeECharts 
      option={option} 
      style={{ height: '100%', width: '100%' }} 
      sourceInfo={{ 
        title: 'CPI Components', 
        source: 'FRED/BLS', 
        endpoint: '/api/bonds', 
        series: [{ id: 'CPIAUCSL' }, { id: 'CPILFESL' }], 
        updatedAt: lastUpdated 
      }} 
    />
  );
};

export default React.memo(CpiComponents);
