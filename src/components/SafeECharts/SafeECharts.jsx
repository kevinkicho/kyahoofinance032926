import React, { useRef, useEffect, useCallback, useMemo, forwardRef, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import ChartSourcePopover from './ChartSourcePopover';

/** Walk treemap / nested tree nodes for numeric leaf values. */
function collectTreeValues(nodes, out, max, depth = 0) {
  if (!Array.isArray(nodes) || out.length >= max || depth > 8) return;
  for (const node of nodes) {
    if (out.length >= max) return;
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node.children) && node.children.length > 0) {
      collectTreeValues(node.children, out, max, depth + 1);
      continue;
    }
    let n = null;
    if (typeof node.value === 'number' && Number.isFinite(node.value)) n = node.value;
    else if (typeof node.metricValue === 'number' && Number.isFinite(node.metricValue)) n = node.metricValue;
    else if (typeof node.marketCap === 'number' && Number.isFinite(node.marketCap)) n = node.marketCap;
    else if (Array.isArray(node.value)) {
      const last = node.value[node.value.length - 1];
      if (typeof last === 'number' && Number.isFinite(last)) n = last;
    }
    if (n != null && n !== 0) out.push(n);
  }
}

/** Extract a few leaf numbers from an echarts option for panel-health confirm. */
export function extractSeriesSamples(option, max = 12) {
  const out = [];
  if (!option || typeof option !== 'object') return out;
  const series = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  for (const s of series) {
    const data = s?.data;
    if (!Array.isArray(data)) continue;
    // Treemap / sunburst / tree: hierarchical nodes with children
    if (s.type === 'treemap' || s.type === 'sunburst' || s.type === 'tree'
      || data.some((pt) => pt && typeof pt === 'object' && Array.isArray(pt.children))) {
      collectTreeValues(data, out, max);
      if (out.length >= max) return out;
      continue;
    }
    for (const pt of data.slice(-max)) {
      let n = null;
      if (typeof pt === 'number' && Number.isFinite(pt)) n = pt;
      else if (Array.isArray(pt)) {
        const last = pt[pt.length - 1];
        if (typeof last === 'number' && Number.isFinite(last)) n = last;
      } else if (pt && typeof pt === 'object') {
        const v = pt.value ?? pt[1];
        if (typeof v === 'number' && Number.isFinite(v)) n = v;
        else if (Array.isArray(v) && typeof v[v.length - 1] === 'number') n = v[v.length - 1];
      }
      if (n != null) {
        out.push(n);
        if (out.length >= max) return out;
      }
    }
  }
  return out;
}

const MIN_CHART_H = 200;
const MIN_CHART_W = 120;

const SafeECharts = forwardRef(function SafeECharts({ option, style, className, opts, onEvents, onChartReady, sourceInfo, ...rest }, ref) {
  const instanceRef = useRef(null);
  const mountedRef = useRef(false);
  const containerRef = useRef(null);
  const [hasDimensions, setHasDimensions] = useState(false);
  /** Explicit pixel box so ECharts never paints into a 0×0 % height collapse. */
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [popoverPos, setPopoverPos] = useState(null);
  const [popoverInfo, setPopoverInfo] = useState(null);
  const [chartError, setChartError] = useState(null);

  // Stamp series samples on the DOM so panel-health can confirm chart data
  // without relying on window.echarts / painted canvas text.
  const seriesSamples = useMemo(() => extractSeriesSamples(option), [option]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (seriesSamples.length) {
      el.setAttribute('data-series-samples', seriesSamples.map(n => String(n)).join(','));
      el.dataset.seriesSampleCount = String(seriesSamples.length);
    } else {
      el.removeAttribute('data-series-samples');
      delete el.dataset.seriesSampleCount;
    }
  }, [seriesSamples]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      instanceRef.current = null;
    };
  }, []);

  const measureAndReady = useCallback(() => {
    const container = containerRef.current;
    if (!container || !mountedRef.current) return false;

    // Walk up for a non-zero host (RGL / flex often report 0 on first paint).
    let host = container.parentElement;
    let hostW = 0;
    let hostH = 0;
    for (let i = 0; i < 6 && host; i++) {
      const rw = host.clientWidth || host.offsetWidth || 0;
      const rh = host.clientHeight || host.offsetHeight || 0;
      if (rw > hostW) hostW = rw;
      if (rh > hostH) hostH = rh;
      if (hostW >= MIN_CHART_W && hostH >= MIN_CHART_H) break;
      host = host.parentElement;
    }

    const cw = container.clientWidth || container.offsetWidth || 0;
    const ch = container.clientHeight || container.offsetHeight || 0;
    const w = Math.max(cw, hostW, MIN_CHART_W);
    // Prefer real host height; fall back to min so we always mount a canvas.
    const h = Math.max(ch, hostH > 40 ? hostH : 0, MIN_CHART_H);

    if (container.offsetWidth <= 0) {
      container.style.minWidth = `${MIN_CHART_W}px`;
    }
    if (container.offsetHeight <= 0) {
      container.style.minHeight = `${MIN_CHART_H}px`;
    }

    setBox({ w, h });
    setHasDimensions(true);

    const echartsInstance = instanceRef.current;
    if (echartsInstance && !echartsInstance.isDisposed?.()) {
      try {
        echartsInstance.resize({ width: w, height: h });
      } catch (e) {
        console.warn('[SafeECharts] resize error:', e?.message);
      }
    }
    return w > 0 && h > 0;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    measureAndReady();

    const observer = new ResizeObserver(() => {
      if (!mountedRef.current) return;
      measureAndReady();
    });
    observer.observe(container);
    if (container.parentElement) observer.observe(container.parentElement);

    const t1 = setTimeout(() => measureAndReady(), 80);
    const t2 = setTimeout(() => measureAndReady(), 300);
    const t3 = setTimeout(() => measureAndReady(), 800);
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => measureAndReady());
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      cancelAnimationFrame(raf1);
      try { observer.disconnect(); } catch { /* ignore */ }
    };
  }, [measureAndReady]);

  // Re-measure when option identity changes (heatmap remount / metric switch).
  useEffect(() => {
    if (!hasDimensions) return undefined;
    const id = requestAnimationFrame(() => measureAndReady());
    return () => cancelAnimationFrame(id);
  }, [option, hasDimensions, measureAndReady]);

  const handleChartReady = useCallback((instance) => {
    if (mountedRef.current) {
      instanceRef.current = instance;
      if (onChartReady) onChartReady(instance);
    }
  }, [onChartReady]);

  const handleChartClick = useCallback((params) => {
    if (!sourceInfo) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (params.event?.event?.clientX || rect.left + rect.width / 2) + 4;
    const y = (params.event?.event?.clientY || rect.top + rect.height / 2) + 4;
    setPopoverPos({ x, y });
    setPopoverInfo(sourceInfo);
  }, [sourceInfo]);

  const handleClosePopover = useCallback(() => {
    setPopoverPos(null);
    setPopoverInfo(null);
  }, []);

  const mergedOnEvents = useMemo(() => {
    const events = { ...(onEvents || {}) };
    if (sourceInfo) {
      const existingClick = events.click;
      events.click = (params) => {
        handleChartClick(params);
        if (existingClick) existingClick(params);
      };
    }
    return events;
  }, [onEvents, sourceInfo, handleChartClick]);

  const safeOnEvents = useMemo(() => {
    const wrapped = {};
    for (const [event, handler] of Object.entries(mergedOnEvents)) {
      wrapped[event] = (...args) => {
        if (mountedRef.current && instanceRef.current && !instanceRef.current.isDisposed?.()) {
          handler(...args);
        }
      };
    }
    return wrapped;
  }, [mergedOnEvents]);

  const chartW = box.w > 0 ? box.w : MIN_CHART_W;
  const chartH = box.h > 0 ? box.h : MIN_CHART_H;

  const safeOpts = useMemo(() => ({
    ...opts,
    width: chartW,
    height: chartH,
    renderer: opts?.renderer || 'canvas',
  }), [opts, chartW, chartH]);

  const containerStyle = useMemo(() => ({
    ...style,
    width: '100%',
    height: '100%',
    minHeight: style?.minHeight || style?.height || `${MIN_CHART_H}px`,
    minWidth: 0,
    flex: style?.flex ?? '1 1 auto',
    position: 'relative',
    overflow: 'hidden',
    cursor: sourceInfo ? 'pointer' : undefined,
  }), [style, sourceInfo]);

  const chartStyle = useMemo(() => ({
    width: '100%',
    height: '100%',
    minHeight: chartH,
    minWidth: chartW > 0 ? undefined : MIN_CHART_W,
  }), [chartW, chartH]);

  if (!hasDimensions) {
    // Still expose series samples so health/confirm can see bound data while
    // ResizeObserver / force-timeout catches up — avoids false bridge-only.
    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        data-series-samples={seriesSamples.length ? seriesSamples.join(',') : undefined}
        data-chart-pending="1"
      />
    );
  }

  if (chartError) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
      >
        <div style={{ color: '#9ca3af', fontSize: 12, padding: 16, textAlign: 'center' }}>
          Chart unavailable
        </div>
      </div>
    );
  }

  // Force-mounted panels often pass option={null} until series load. ECharts
  // throws "Cannot read properties of null (reading 'baseOption')" otherwise.
  if (!option || typeof option !== 'object') {
    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
      >
        <div style={{ color: '#9ca3af', fontSize: 12, padding: 16, textAlign: 'center' }}>
          Chart loading…
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      data-series-samples={seriesSamples.length ? seriesSamples.join(',') : undefined}
      data-chart-box={`${chartW}x${chartH}`}
    >
      <ReactEChartsCore
        ref={ref}
        echarts={echarts}
        option={option}
        style={chartStyle}
        opts={safeOpts}
        onChartReady={handleChartReady}
        onEvents={safeOnEvents}
        onError={(err) => { setChartError(err); console.warn('[SafeECharts] render error:', err?.message); }}
        {...rest}
      />
      {popoverPos && popoverInfo && (
        <ChartSourcePopover
          sourceInfo={popoverInfo}
          anchorPos={popoverPos}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
});

export default SafeECharts;