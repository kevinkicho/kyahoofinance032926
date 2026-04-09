import React, { useMemo, useRef, useEffect } from 'react';
import SafeECharts from '../SafeECharts';
import { useTheme } from '../../hub/ThemeContext';

const METRIC_LABEL = {
  marketCap:  'Mkt Cap',
  revenue:    'Revenue',
  netIncome:  'Net Income',
  pe:         'P/E',
  divYield:   'Div Yield',
};

function sumLeaves(node) {
  if (!node.children || node.children.length === 0) return node.value || 0;
  return node.children.reduce((s, c) => s + sumLeaves(c), 0);
}
function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}
function getSectors(children) {
  const map = {};
  const collect = (nodes) => nodes.forEach(n => {
    if (n.children) collect(n.children);
    else if (n.sector) map[n.sector] = (map[n.sector] || 0) + (n.metricValue || n.value || 0);
  });
  collect(children);
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}
function groupTooltip(d, currentRate, currentSymbol, currency, metricKey, themeColors) {
  const total = sumLeaves(d);
  const converted = (total * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const count = countLeaves(d);
  const textSecondary = themeColors?.textSecondary || '#94a3b8';
  let body = `<div style="font-weight:700;font-size:1rem;margin-bottom:4px">${d.name}</div>`;
  body += `<div style="color:${textSecondary};font-size:0.78rem;margin-bottom:6px">${count} companies</div>`;
  body += `<div style="margin-bottom:4px">${metricKey}: <strong>${currentSymbol}${converted} B</strong> (${currency})</div>`;
  if (!d.isSectorGroup) {
    const sectors = getSectors(d.children || []).slice(0, 4);
    if (sectors.length) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:${textSecondary}">Sectors:</div>`;
      sectors.forEach(([sec, val]) => {
        const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
        body += `<div style="font-size:0.78rem">· ${sec} <span style="color:#60a5fa">${pct}%</span></div>`;
      });
    }
  } else {
    const stocks = (d.children || []).slice()
      .sort((a, b) => (b.metricValue || b.value || 0) - (a.metricValue || a.value || 0))
      .slice(0, 3);
    if (stocks.length) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:${textSecondary}">Top holdings:</div>`;
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

// Main component
const HeatmapView = ({
  data,
  currentRate, currentSymbol, currency,
  rankMetric = 'marketCap', groupBy = 'market',
  colorByPerf,
  onSelect, // callback when a cell is clicked
}) => {
  const { colors } = useTheme();
  const chartRef = useRef(null);
  const mountedRef = useRef(false);
  const instRef = useRef(null);
  const zrRef = useRef(null);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      instRef.current = null;
      zrRef.current = null;
    };
  }, []);

  const chartData = useMemo(() => {
    const norm = (node) => node.children
      ? { ...node, children: node.children.map(norm) }
      : { ...node, value: node.metricValue || node.adjustedValue || node.value };
    return data.map(norm);
  }, [data, rankMetric]);

  const levels = useMemo(() => {
    if (groupBy === 'sectorInMarket') return [
      { visibleMin: 100, itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },
      { visibleMin: 200, itemStyle: { borderWidth: 2, gapWidth: 2 }, upperLabel: { show: true, height: 20, fontSize: 10 } },
      { visibleMin: 300, itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },
    ];
    if (groupBy === 'sectorGlobal') return [
      { visibleMin: 100, itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },
      { visibleMin: 300, itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },
    ];
    return [
      { visibleMin: 100, itemStyle: { borderWidth: 2, gapWidth: 3 }, upperLabel: { show: true } },
      { visibleMin: 300, itemStyle: { borderWidth: 1, gapWidth: 2 }, label: { show: true } },
    ];
  }, [groupBy]);

  const chartOption = useMemo(() => ({
    animation: false,
    tooltip: {
      formatter: function (info) {
        if (!info.data) return '';
        const d = info.data;
        if (d.children?.length > 0) return groupTooltip(d, currentRate, currentSymbol, currency, METRIC_LABEL[rankMetric] || 'Mkt Cap', colors);
        return '';
      }
    },
    series: [{
      name: 'Global Market',
      type: 'treemap',
      animation: false,
      animationDurationUpdate: 0,
      visibleMin: 300,
      childrenVisibleMin: 600,
      squareRatio: 0.5 * (1 + Math.sqrt(5)),
      label: {
        show: true, fontSize: 11, fontWeight: 'bold', overflow: 'truncate',
        formatter: (params) => {
          const d = params.data;
          if (!d || d.children?.length > 0) return params.name;
          if (params.rect && params.rect.width < 50) return '';
          const isNum = /^\d/.test(d.name);
          return (d.rank ? `#${d.rank} ` : '') + (isNum ? (d.fullName || d.name) : d.name);
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
      height: '100%',
    }]
  }), [chartData, levels, currentRate, currentSymbol, currency, rankMetric, colors]);

  // Background click → zoom-to-fit (reset to root view)
  // Cell click → select ticker
  useEffect(() => {
    const inst = chartRef.current?.getEchartsInstance?.();
    if (!inst || !mountedRef.current) return;

    // Store instance references for cleanup
    instRef.current = inst;
    const zr = inst.getZr();
    zrRef.current = zr;

    const handleBgClick = (e) => {
      if (!mountedRef.current) return;
      if (!e.target) {
        if (instRef.current && !instRef.current.isDisposed?.()) {
          instRef.current.dispatchAction({ type: 'restore' });
        }
      }
    };

    const handleCellClick = (params) => {
      if (!mountedRef.current) return;
      if (params.data && !params.data.children && onSelect) {
        // This is a leaf node (individual stock)
        // Normalize the data to match expected tickerInfo structure
        const stock = params.data;
        onSelect({
          ticker: stock.name || stock.ticker,
          name: stock.fullName || stock.name,
          fullName: stock.fullName || stock.name,
          sector: stock.sector,
          value: stock.adjustedValue || stock.metricValue || stock.value,
          marketCap: stock.marketCap || stock.value,
          region: stock.regionName || stock.region,
          regionSymbol: stock.regionSymbol,
          regionCurrency: stock.regionCurrency,
          ...stock,
        });
      }
    };

    zr.on('click', handleBgClick);
    inst.on('click', handleCellClick);

    // Cleanup: only remove listeners if still mounted and instance not disposed
    return () => {
      // Skip cleanup if unmounted - ECharts will clean up when instance is disposed
      if (!mountedRef.current) return;

      try {
        if (zr && inst && !inst.isDisposed?.()) {
          zr.off('click', handleBgClick);
          inst.off('click', handleCellClick);
        }
      } catch {
        // Instance already disposed, ignore
      }
    };
  }, [onSelect]);

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <SafeECharts
        ref={chartRef}
        key={`${colorByPerf ? 'perf' : 'rank'}-${rankMetric}`}
        option={chartOption}
        notMerge={false}
        lazyUpdate={false}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default HeatmapView;