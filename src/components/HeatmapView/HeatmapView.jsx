import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import SafeECharts from '../SafeECharts';
import { useTheme } from '../../hub/ThemeContext';
import {
  applySizeControlToTree,
  buildTreemapLevels,
  getDensityPreset,
} from './heatmapSizeControl';

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
  if (!node.children || node.children.length === 0) return node.isOtherBucket ? 0 : 1;
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
  if (d.isOtherBucket) {
    const names = (d.otherTickers || []).slice(0, 8).join(', ');
    const more = (d.otherTickers?.length || 0) > 8 ? '…' : '';
    return `<div style="font-weight:700;font-size:1rem;margin-bottom:4px">${d.name}</div>`
      + `<div style="color:${textSecondary};font-size:0.78rem;margin-bottom:6px">Below size threshold · not labeled</div>`
      + (names ? `<div style="font-size:0.75rem;max-width:220px">${names}${more}</div>` : '');
  }
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
    if (metricKey === 'P/E') {
      const peVal = Number(d.metricValue ?? d.pe);
      body += `<div style="font-size:0.82rem;margin-bottom:2px">${metricKey}: <strong>${Number.isFinite(peVal) ? peVal.toFixed(1) + 'x' : '—'}</strong></div>`;
    } else if (metricKey === 'Div Yield') {
      const dyVal = Number(d.metricValue ?? d.divYield);
      body += `<div style="font-size:0.82rem;margin-bottom:2px">${metricKey}: <strong>${Number.isFinite(dyVal) ? dyVal.toFixed(2) + '%' : '—'}</strong></div>`;
    } else {
      const converted = (mc * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
      body += `<div style="font-size:0.82rem;margin-bottom:2px">${metricKey}: <strong>${currentSymbol}${converted} B</strong> (${currency})</div>`;
    }
  }

  if (d.sector) {
    body += `<div style="font-size:0.75rem;color:${textSecondary};margin-top:4px">Sector: ${d.sector}</div>`;
  }

  return body;
}

function groupTooltip(d, currentRate, currentSymbol, currency, metricKey, themeColors) {
  const total = sumLeaves(d);
  const count = countLeaves(d);
  const textSecondary = themeColors?.textSecondary || '#94a3b8';
  let body = `<div style="font-weight:700;font-size:1rem;margin-bottom:4px">${d.name}</div>`;
  body += `<div style="color:${textSecondary};font-size:0.78rem;margin-bottom:6px">${count} companies</div>`;
  if (metricKey === 'P/E') {
    body += `<div style="margin-bottom:4px">${metricKey}: <strong>${total.toFixed(1)}x avg</strong></div>`;
  } else if (metricKey === 'Div Yield') {
    body += `<div style="margin-bottom:4px">${metricKey}: <strong>${total.toFixed(2)}% avg</strong></div>`;
  } else {
    const converted = (total * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
    body += `<div style="margin-bottom:4px">${metricKey}: <strong>${currentSymbol}${converted} B</strong> (${currency})</div>`;
  }
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
      .filter((st) => !st.isOtherBucket)
      .sort((a, b) => (b.metricValue || b.value || 0) - (a.metricValue || a.value || 0))
      .slice(0, 3);
    if (stocks.length) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:${textSecondary}">Top holdings:</div>`;
      stocks.forEach(st => {
        const isNum = /^\d/.test(st.name);
        const label = isNum ? (st.fullName || st.name) : `${st.name}${st.regionName ? ` · ${st.regionName}` : ''}`;
        const v = metricKey === 'P/E' ? `${(st.metricValue || st.value || 0).toFixed(1)}x` :
                  metricKey === 'Div Yield' ? `${(st.metricValue || st.value || 0).toFixed(2)}%` :
                  `${currentSymbol}${((st.metricValue || st.value || 0) * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}B`;
        body += `<div style="font-size:0.78rem">· ${label} <span style="color:#60a5fa">${v}</span></div>`;
      });
    }
  }
  return body;
}

const HeatmapView = ({
  data,
  currentRate, currentSymbol, currency,
  rankMetric = 'marketCap', groupBy = 'market',
  colorByPerf,
  density = 'auto',
  onSelect,
}) => {
  const { colors } = useTheme();
  const chartRef = useRef(null);
  const mountedRef = useRef(false);
  const instRef = useRef(null);
  const zrRef = useRef(null);
  const longPressRef = useRef(null);
  const [viewPath, setViewPath] = useState(['Global Market']);

  const preset = useMemo(() => getDensityPreset(density), [density]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      instRef.current = null;
      zrRef.current = null;
    };
  }, []);

  // Layer 1: data prune — small shares roll into Other (remain / leave)
  const { sizedData, sizeStats } = useMemo(() => {
    const { tree, stats } = applySizeControlToTree(data || [], preset);
    return { sizedData: tree, sizeStats: stats };
  }, [data, preset]);

  const chartData = useMemo(() => {
    const norm = (node, path = []) => {
      const nodeId = [...path, node.name || node.ticker || 'node'].join('>');
      if (node.children?.length > 0) {
        return {
          ...node,
          id: node.id || nodeId,
          children: node.children.map(child => norm(child, [...path, node.name || 'node'])),
        };
      }
      const useMetric = rankMetric === 'pe' || rankMetric === 'divYield';
      const val = useMetric
        ? (node.metricValue || node.adjustedValue || node.value)
        : (node.metricValue || node.adjustedValue || node.value);
      return {
        ...node,
        id: node.id || nodeId,
        value: Math.max(Number(val) || 0.01, 0.01),
      };
    };
    return sizedData.map(node => norm(node));
  }, [sizedData, rankMetric]);

  // Layer 2: pixel thresholds for labels / tiny tiles
  const levels = useMemo(
    () => buildTreemapLevels(groupBy, preset),
    [groupBy, preset],
  );

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
      // Absolute pixel² — nodes smaller than this leave the visible surface
      visibleMin: preset.visibleMin,
      childrenVisibleMin: preset.childrenVisibleMin,
      squareRatio: 0.5 * (1 + Math.sqrt(5)),
      label: {
        show: true,
        fontSize: 11,
        fontWeight: 'bold',
        overflow: 'truncate',
        formatter: (params) => {
          const d = params.data;
          if (!d) return '';
          if (d.children?.length > 0) return params.name;
          if (d.isOtherBucket) {
            // Only label Other when large enough
            if (params.rect && (params.rect.width < preset.labelMinWidth || params.rect.height < preset.labelMinHeight)) {
              return '';
            }
            return d.name;
          }
          if (params.rect && (
            params.rect.width < preset.labelMinWidth
            || params.rect.height < preset.labelMinHeight
          )) {
            return '';
          }
          const isNum = /^\d/.test(d.name || '');
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
  }), [chartData, levels, currentRate, currentSymbol, currency, rankMetric, colors, preset]);

  const handleChartReady = useCallback((instance) => {
    if (!instance || !mountedRef.current) return;
    instRef.current = instance;
    const zr = instance.getZr();
    zrRef.current = zr;

    const handleBgClick = () => {
      if (!mountedRef.current) return;
      const inst = instRef.current;
      if (!inst || inst.isDisposed?.()) return;
      inst.dispatchAction({ type: 'restore' });
      setViewPath(['Global Market']);
    };

    const handleCellClick = (params) => {
      if (!mountedRef.current) return;
      if (params.data && !params.data.children && onSelect) {
        const stock = params.data;
        if (stock.isOtherBucket) return; // aggregate, not a ticker
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
          // disposed
        }
      }
    };
  }, []);

  const sizeHint = sizeStats?.rolled > 0
    ? `${sizeStats.shown} shown · ${sizeStats.rolled} in Other (${preset.label})`
    : `${sizeStats?.shown ?? '—'} shown · ${preset.label} size`;

  const hasLeaves = useMemo(() => {
    const walk = (nodes) => {
      if (!Array.isArray(nodes)) return false;
      for (const n of nodes) {
        if (n?.children?.length) {
          if (walk(n.children)) return true;
        } else if (n && (n.value != null || n.marketCap != null || n.metricValue != null)) {
          return true;
        }
      }
      return false;
    };
    return walk(chartData);
  }, [chartData]);

  return (
    <div
      className="eq-heatmap-root"
      data-heatmap-ready={hasLeaves ? '1' : '0'}
      style={{
        flex: '1 1 auto',
        width: '100%',
        height: '100%',
        minHeight: 240,
        minWidth: 0,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!hasLeaves ? (
        <div
          style={{
            flex: 1,
            minHeight: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontSize: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          Heatmap has no equity tiles yet — wait for quotes or click ▶ to refresh.
        </div>
      ) : (
      <SafeECharts
        ref={chartRef}
        key={`${colorByPerf ? 'perf' : 'rank'}-${rankMetric}-${preset.id}`}
        option={chartOption}
        notMerge
        lazyUpdate={false}
        style={{ flex: '1 1 auto', height: '100%', width: '100%', minHeight: 240 }}
        opts={{ renderer: 'canvas' }}
        onChartReady={handleChartReady}
        sourceInfo={{ title: 'Equity Heatmap', source: 'Yahoo Finance', endpoint: '/api/stocks', series: [] }}
      />
      )}
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 6,
          maxWidth: 'calc(100% - 16px)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '2px 8px',
          borderRadius: 4,
          background: 'rgba(2, 6, 23, 0.72)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          fontSize: 10,
          color: '#e2e8f0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {viewPath.map((label, index) => {
            const targetId = index === 0 ? null : viewPath.slice(1, index + 1).join('>');
            return (
              <React.Fragment key={`${label}-${index}`}>
                {index > 0 && <span style={{ color: '#64748b' }}>›</span>}
                <button
                  type="button"
                  onClick={() => {
                    if (!mountedRef.current) return;
                    const inst = instRef.current;
                    if (!inst || inst.isDisposed?.()) return;
                    inst.dispatchAction({ type: 'restore' });
                    setViewPath(['Global Market']);
                  }}
                  title="Click to zoom to fit"
                  style={{
                    border: 0,
                    background: 'transparent',
                    color: index === viewPath.length - 1 ? '#fff' : '#93c5fd',
                    font: 'inherit',
                    fontWeight: index === viewPath.length - 1 ? 700 : 500,
                    padding: '1px 2px',
                    cursor: 'pointer',
                    maxWidth: 140,
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
        <span style={{ color: '#64748b' }}>·</span>
        <span
          style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}
          title={`Size control (${preset.id}): share≥${(preset.minShareOfParent * 100).toFixed(2)}% of parent or top ${preset.minKeepPerParent}; max ${preset.maxLeavesPerParent}/group. Pixel visibleMin=${preset.visibleMin}.`}
        >
          {sizeHint}
        </span>
      </div>
    </div>
  );
};

export default HeatmapView;
