import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

// Cap heatmap to top N stocks per region — reduces DOM nodes from 2,500 to ~500 max
const HEATMAP_LIMIT = 15;

const HeatmapView = ({ data, onChartClick, currentRate, currentSymbol, currency }) => {
  // Memoize the chart data so it only recomputes when the source data actually changes
  const chartData = useMemo(() =>
    data.map(region => ({
      ...region,
      children: region.children
        .slice()
        .sort((a, b) => (b.adjustedValue || b.value) - (a.adjustedValue || a.value))
        .slice(0, HEATMAP_LIMIT)
        .map(stock => ({
          ...stock,
          value: stock.adjustedValue || stock.value
        }))
    })),
  [data]);

  const chartOption = useMemo(() => ({
    animation: false,           // Disable ECharts built-in animation for instant era switches
    tooltip: {
      formatter: function (info) {
        if (!info.data || info.data.children) return '';
        const value = info.data.adjustedValue || info.value;
        const convertedValue = (value * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
        const treePath = info.treePathInfo.slice(1).map(n => n.name);
        return (
          '<div class="tooltip-title">' + treePath.join(' › ') + '</div>' +
          'Market Cap: ' + currentSymbol + convertedValue + ' B (' + currency + ')'
        );
      }
    },
    series: [{
      name: 'Global Market',
      type: 'treemap',
      visibleMin: 100,
      label: { show: true, formatter: '{b}', fontSize: 12, fontWeight: 'bold', overflow: 'truncate' },
      upperLabel: { show: true, height: 22, fontSize: 11, color: '#fff', fontWeight: '600' },
      itemStyle: { borderColor: '#1e1e1e', borderWidth: 1, gapWidth: 2 },
      levels: [
        { itemStyle: { borderWidth: 2, gapWidth: 3 }, upperLabel: { show: true } },
        { itemStyle: { borderWidth: 1, gapWidth: 2 }, label: { show: true } }
      ],
      roam: true,
      nodeClick: 'zoomToNode',
      breadcrumb: { show: true, left: 'center', bottom: 10, itemStyle: { textStyle: { color: '#fff' } } },
      data: chartData,
      width: '100%',
      height: '90%'
    }]
  }), [chartData, currentRate, currentSymbol, currency]);

  return (
    <ReactECharts
      option={chartOption}
      notMerge={false}
      lazyUpdate={true}
      style={{ height: '100%', width: '100%', minHeight: '600px' }}
      opts={{ renderer: 'canvas' }}  // Canvas is 3-5x faster than SVG for many nodes
      onEvents={{ 'click': onChartClick }}
    />
  );
};

export default HeatmapView;
