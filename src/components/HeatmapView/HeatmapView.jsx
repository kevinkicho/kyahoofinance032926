import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import SafeECharts from '../SafeECharts';
import { useTheme } from '../../hub/ThemeContext';

const LONG_PRESS_MS = 650;

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
function stockTooltip(d, currentRate, currentSymbol, currency, metricKey, themeColors) {
  const textSecondary = themeColors?.textSecondary || '#94a3b8';
  const isNum = /^\d/.test(d.name || '');
  const title = isNum ? (d.fullName || d.name) : d.name;
  const subtitle = [d.fullName && !isNum ? d.fullName : null, d.regionName].filter(Boolean).join(' · ');

  let body = `<div style="font-weight:700;font-size:1rem;margin-bottom:2px">${title}</div>`;
  if (subtitle) body += `<div style="color:${textSecondary};font-size:0.75rem;margin-bottom:6px">${subtitle}</div>`;

  const priceNum = Number(d.price);
  if (Number.isFinite(priceNum)) {
    const priceStr = priceNum.toLocaleString(undefined, { maximumFractionDigits: 2 });
    body += `<div style="font-size:0.82rem;margin-bottom:2px">Price: <strong>${d.regionSymbol || '$'}${priceStr}</strong></div>`;
  }

  const cp = Number(d.changePct);
  if (Number.isFinite(cp)) {
    const color = cp >= 0 ? '#22c55e' : '#ef4444';
    const sign = cp >= 0 ? '+' : '';
    body += `<div style="font-size:0.82rem;margin-bottom:2px">Change: <span style="color:${color};font-weight:600">${sign}${cp.toFixed(2)}%</span></div>`;
  }

  const mc = Number(d.marketCap ?? d.metricValue ?? d.value);
  if (Number.isFinite(mc) && mc > 0) {
    const converted = (mc * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
    body += `<div style="font-size:0.82rem;margin-bottom:2px">${metricKey}: <strong>${currentSymbol}${converted} B</strong> (${currency})</div>`;
  }

  if (d.sector) {
    body += `<div style="font-size:0.75rem;color:${textSecondary};margin-top:4px">Sector: ${d.sector}</div>`;
  }

  return body;
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
  const longPressRef = useRef(null);
  const [viewPath, setViewPath] = useState(['Global Market']);

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
    const norm = (node, path = []) => {
      const nodeId = [...path, node.name || node.ticker || 'node'].join('>');
      return node.children
        ? { ...node, id: node.id || nodeId, children: node.children.map(child => norm(child, [...path, node.name || 'node'])) }
        : { ...node, id: node.id || nodeId, value: node.metricValue || node.adjustedValue || node.value };
    };
    return data.map(node => norm(node));
  }, [data, rankMetric]);

  const levels = useMemo(() => {
    if (groupBy === 'sectorInMarket') return [
      { visibleMin: 8, itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },
      { visibleMin: 8, itemStyle: { borderWidth: 2, gapWidth: 2 }, upperLabel: { show: true, height: 20, fontSize: 10 } },
      { visibleMin: 4, itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },
    ];
    if (groupBy === 'sectorGlobal') return [
      { visibleMin: 8, itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },
      { visibleMin: 4, itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },
    ];
    return [
      { visibleMin: 8, itemStyle: { borderWidth: 2, gapWidth: 3 }, upperLabel: { show: true } },
      { visibleMin: 4, itemStyle: { borderWidth: 1, gapWidth: 2 }, label: { show: true } },
    ];
  }, [groupBy]);

  const chartOption = useMemo(() => ({
    animation: false,
    tooltip: {
      formatter: function (info) {
        if (!info.data) return '';
        const d = info.data;
        const label = METRIC_LABEL[rankMetric] || 'Mkt Cap';
        if (d.children?.length > 0) return groupTooltip(d, currentRate, currentSymbol, currency, label, colors);
        return stockTooltip(d, currentRate, currentSymbol, currency, label, colors);
      }
    },
    series: [{
      name: 'Global Market',
      type: 'treemap',
      animation: false,
      animationDurationUpdate: 0,
      visibleMin: 4,
      childrenVisibleMin: 12,
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
      nodeClick: false,
      breadcrumb: { show: false },
      data: chartData,
      width: '100%',
      height: '100%',
    }]
  }), [chartData, levels, currentRate, currentSymbol, currency, rankMetric, colors]);

  // Handle chart ready - store instance and attach event handlers
  const handleChartReady = useCallback((instance) => {
    if (!instance || !mountedRef.current) return;
    instRef.current = instance;
    const zr = instance.getZr();
    zrRef.current = zr;

    const handleBgClick = (e) => {
      if (!mountedRef.current) return;
      // Only restore if clicking on empty background (no target)
      if (!e.target) {
        if (instRef.current && !instRef.current.isDisposed?.()) {
          instRef.current.dispatchAction({ type: 'restore' });
          setViewPath(['Global Market']);
        }
      }
    };

    const handleCellClick = (params) => {
      if (!mountedRef.current) return;
      // Check if this is a leaf node (individual stock)
      if (params.data && !params.data.children && onSelect) {
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

    const clearLongPress = () => {
      if (longPressRef.current?.timer) clearTimeout(longPressRef.current.timer);
      longPressRef.current = null;
    };

    const handlePressStart = (e) => {
      if (!mountedRef.current) return;
      const treemapView = instRef.current?._chartsViews?.find(view => view?.type === 'treemap' && typeof view.findTarget === 'function');
      const targetInfo = treemapView?.findTarget(e.offsetX, e.offsetY);
      const node = targetInfo?.node;
      if (!node?.children?.length) return;
      clearLongPress();
      longPressRef.current = {
        node,
        timer: setTimeout(() => {
          const inst = instRef.current;
          if (!mountedRef.current || !inst || inst.isDisposed?.()) return;
          inst.dispatchAction({
            type: 'treemapZoomToNode',
            seriesIndex: 0,
            targetNode: node,
          });
          setViewPath(['Global Market', ...node.getAncestors(true).slice(1).map(n => n.name)]);
          longPressRef.current = null;
        }, LONG_PRESS_MS),
      };
    };

    zr.on('click', handleBgClick);
    zr.on('mousedown', handlePressStart);
    zr.on('mouseup', clearLongPress);
    zr.on('mouseout', clearLongPress);
    zr.on('globalout', clearLongPress);
    instance.on('click', handleCellClick);
  }, [onSelect]);

  // Cleanup event handlers on unmount
  useEffect(() => {
    return () => {
      if (zrRef.current && instRef.current && !instRef.current.isDisposed?.()) {
        try {
          zrRef.current.off('click');
          zrRef.current.off('mousedown');
          zrRef.current.off('mouseup');
          zrRef.current.off('mouseout');
          zrRef.current.off('globalout');
          instRef.current.off('click');
          if (longPressRef.current?.timer) clearTimeout(longPressRef.current.timer);
        } catch {
          // Instance already disposed, ignore
        }
      }
    };
  }, []);

  const startBreadcrumbPress = useCallback((targetId, pathIndex) => {
    if (!mountedRef.current) return;
    if (longPressRef.current?.timer) clearTimeout(longPressRef.current.timer);
    longPressRef.current = {
      dataId: targetId || 'Global Market',
      timer: setTimeout(() => {
        const inst = instRef.current;
        if (!mountedRef.current || !inst || inst.isDisposed?.()) return;
        if (!targetId) {
          inst.dispatchAction({ type: 'restore' });
          setViewPath(['Global Market']);
        } else {
          inst.dispatchAction({
            type: 'treemapZoomToNode',
            seriesIndex: 0,
            targetNodeId: targetId,
          });
          setViewPath(viewPath.slice(0, pathIndex + 1));
        }
        longPressRef.current = null;
      }, LONG_PRESS_MS),
    };
  }, [viewPath]);

  const clearBreadcrumbPress = useCallback(() => {
    if (longPressRef.current?.timer) clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  }, []);

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
        onChartReady={handleChartReady}
      />
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 6,
          maxWidth: 'calc(100% - 16px)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          borderRadius: 4,
          background: 'rgba(2, 6, 23, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          fontSize: 10,
          color: '#e2e8f0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
        }}
      >
        {viewPath.map((label, index) => {
          const targetId = index === 0 ? null : viewPath.slice(1, index + 1).join('>');
          return (
            <React.Fragment key={`${label}-${index}`}>
              {index > 0 && <span style={{ color: '#64748b' }}>›</span>}
              <button
                type="button"
                onMouseDown={() => startBreadcrumbPress(targetId, index)}
                onMouseUp={clearBreadcrumbPress}
                onMouseLeave={clearBreadcrumbPress}
                onTouchStart={() => startBreadcrumbPress(targetId, index)}
                onTouchEnd={clearBreadcrumbPress}
                title="Long-click to zoom here"
                style={{
                  border: 0,
                  background: 'transparent',
                  color: index === viewPath.length - 1 ? '#fff' : '#93c5fd',
                  font: 'inherit',
                  fontWeight: index === viewPath.length - 1 ? 700 : 500,
                  padding: '1px 2px',
                  cursor: 'pointer',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default HeatmapView;
