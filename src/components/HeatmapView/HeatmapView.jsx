import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

const METRIC_LABEL = {
  marketCap:  'Mkt Cap',
  revenue:    'Revenue',
  netIncome:  'Net Income',
  pe:         'P/E',
  divYield:   'Div Yield',
};

// Recursively sum leaf node values
function sumLeaves(node) {
  if (!node.children || node.children.length === 0) return node.value || 0;
  return node.children.reduce((s, c) => s + sumLeaves(c), 0);
}

// Recursively count leaf nodes
function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

// Get sector breakdown from direct stock children (or nested)
function getSectors(children) {
  const map = {};
  const collectSectors = (nodes) => {
    nodes.forEach(n => {
      if (n.children) collectSectors(n.children);
      else if (n.sector) map[n.sector] = (map[n.sector] || 0) + (n.metricValue || n.value || 0);
    });
  };
  collectSectors(children);
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}

// Build region/sector group hover tooltip
function groupTooltip(d, currentRate, currentSymbol, currency, metricKey) {
  const total = sumLeaves(d);
  const converted = (total * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const count = countLeaves(d);

  let body = `<div style="font-weight:700;font-size:1rem;margin-bottom:4px">${d.name}</div>`;
  body += `<div style="color:#94a3b8;font-size:0.78rem;margin-bottom:6px">${count} companies</div>`;
  body += `<div style="margin-bottom:4px">${metricKey}: <strong>${currentSymbol}${converted} B</strong> (${currency})</div>`;

  if (!d.isSectorGroup) {
    // Region node — show sector breakdown
    const sectors = getSectors(d.children || []);
    const topSectors = sectors.slice(0, 4);
    if (topSectors.length > 0) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:#94a3b8">Sectors:</div>`;
      topSectors.forEach(([sec, val]) => {
        const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
        body += `<div style="font-size:0.78rem">· ${sec} <span style="color:#60a5fa">${pct}%</span></div>`;
      });
    }
  } else {
    // Sector group — show top 3 stocks
    const stocks = (d.children || [])
      .slice()
      .sort((a, b) => (b.metricValue || b.value || 0) - (a.metricValue || a.value || 0))
      .slice(0, 3);
    if (stocks.length > 0) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:#94a3b8">Top holdings:</div>`;
      stocks.forEach(st => {
        const isNum = /^\d/.test(st.name);
        const label = isNum ? (st.fullName || st.name) : `${st.name}${st.regionName ? ` · ${st.regionName}` : ''}`;
        const v = ((st.metricValue || st.value || 0) * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
        body += `<div style="font-size:0.78rem">· ${label} <span style="color:#60a5fa">${currentSymbol}${v}B</span></div>`;
      });
    }
  }
  return body;
}

const HeatmapView = ({ data, onChartClick, currentRate, currentSymbol, currency, rankMetric = 'marketCap', groupBy = 'market' }) => {

  // For sectorGlobal the top nodes ARE the data; for others wrap them
  const chartData = useMemo(() => {
    const normalizeValue = (node) => {
      if (!node.children) {
        return { ...node, value: node.metricValue || node.adjustedValue || node.value };
      }
      return { ...node, children: node.children.map(normalizeValue) };
    };
    return data.map(normalizeValue);
  }, [data, rankMetric]);

  const levels = useMemo(() => {
    if (groupBy === 'sectorInMarket') return [
      { itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },   // region
      { itemStyle: { borderWidth: 2, gapWidth: 2 }, upperLabel: { show: true, height: 20, fontSize: 10 } }, // sector
      { itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },         // stock
    ];
    if (groupBy === 'sectorGlobal') return [
      { itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },   // sector
      { itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },         // stock
    ];
    return [
      { itemStyle: { borderWidth: 2, gapWidth: 3 }, upperLabel: { show: true } },
      { itemStyle: { borderWidth: 1, gapWidth: 2 }, label: { show: true } },
    ];
  }, [groupBy]);

  const chartOption = useMemo(() => ({
    animation: false,
    tooltip: {
      formatter: function (info) {
        if (!info.data) return '';
        const d = info.data;
        const metricKey = METRIC_LABEL[rankMetric] || 'Mkt Cap';

        // Group node (region or sector): rich hover summary
        if (d.children && d.children.length > 0) {
          return groupTooltip(d, currentRate, currentSymbol, currency, metricKey);
        }

        // Leaf stock node
        const metricVal = d.metricValue || d.value;
        const converted = (metricVal * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
        const isNumericTicker = /^\d/.test(d.name);
        const displayName = isNumericTicker ? (d.fullName || d.name) : d.name;
        const subLine = isNumericTicker
          ? (d.regionName ? `<div style="font-size:0.78rem;color:#94a3b8">${d.regionName}</div>` : '')
          : (d.fullName   ? `<div style="font-size:0.78rem;color:#94a3b8">${d.fullName}${d.regionName ? ` · ${d.regionName}` : ''}</div>` : '');
        const rankBadge = d.rank ? `<span style="color:#facc15;font-weight:700">#${d.rank}</span> ` : '';
        return (
          `<div style="font-weight:700;margin-bottom:2px">${rankBadge}${displayName}</div>` +
          subLine +
          `${metricKey}: ${currentSymbol}${converted} B (${currency})<br/>` +
          (d.pe       ? `P/E: ${d.pe}x &nbsp;&nbsp;` : '') +
          (d.divYield ? `Div: ${d.divYield}%` : '')
        );
      }
    },
    series: [{
      name: 'Global Market',
      type: 'treemap',
      visibleMin: 50,
      label: {
        show: true,
        fontSize: 11,
        fontWeight: 'bold',
        overflow: 'truncate',
        formatter: function (params) {
          const d = params.data;
          if (!d || (d.children && d.children.length > 0)) return params.name;
          const rank = d.rank ? `#${d.rank} ` : '';
          const isNumericTicker = /^\d/.test(d.name);
          const label = isNumericTicker ? (d.fullName || d.name) : d.name;
          return rank + label;
        },
      },
      upperLabel: { show: true, height: 22, fontSize: 11, color: '#fff', fontWeight: '600' },
      itemStyle: { borderColor: '#1e1e1e', borderWidth: 1, gapWidth: 2 },
      levels,
      roam: true,
      nodeClick: 'zoomToNode',
      breadcrumb: { show: true, left: 'center', bottom: 10, itemStyle: { textStyle: { color: '#fff' } } },
      data: chartData,
      width: '100%',
      height: '90%',
    }]
  }), [chartData, levels, currentRate, currentSymbol, currency, rankMetric]);

  return (
    <ReactECharts
      option={chartOption}
      notMerge={true}
      lazyUpdate={false}
      style={{ height: '100%', width: '100%', minHeight: '600px' }}
      opts={{ renderer: 'canvas' }}
      onEvents={{ 'click': onChartClick }}
    />
  );
};

export default HeatmapView;
