import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

const MARKET_COLORS = {
  US: '#60a5fa', UK: '#34d399', DE: '#f472b6',
  AU: '#fbbf24', CA: '#a78bfa', JP: '#fb923c',
};

export default function PriceIndex({ priceIndexData }) {
  const { colors } = useTheme();

  const option = useMemo(() => {
    const markets = Object.keys(priceIndexData);
    const dates = priceIndexData[markets[0]]?.dates ?? [];
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) =>
          `<b>${params[0].axisValue}</b><br/>` +
          params.map(p => `${p.seriesName}: <b>${p.value}</b>`).join('<br/>'),
      },
      legend: {
        data: markets,
        top: 0,
        textStyle: { color: colors.textSecondary, fontSize: 11 },
      },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: colors.textMuted, fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: markets.map(m => ({
        name: m,
        type: 'line',
        smooth: true,
        data: priceIndexData[m].values,
        itemStyle: { color: MARKET_COLORS[m] || colors.textSecondary },
        lineStyle: { width: 2 },
        symbol: 'none',
      })),
    };
  }, [priceIndexData, colors]);

  const marketCount = Object.keys(priceIndexData).length;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Price Index</span>
        <span className="re-panel-subtitle">{marketCount} markets · quarterly · indexed to 100 at 2015 Q1</span>
      </div>
      <div className="re-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="re-panel-footer">
        Index base = 100 · Q1 2015 · Source: national statistical agencies
      </div>
    </div>
  );
}
