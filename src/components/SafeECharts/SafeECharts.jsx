import React, { useRef, useEffect, useCallback, useMemo, forwardRef, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import echarts from '../../lib/echarts';
import ChartSourcePopover from './ChartSourcePopover';

const SafeECharts = forwardRef(function SafeECharts({ option, style, className, opts, onEvents, onChartReady, sourceInfo, ...rest }, ref) {
  const instanceRef = useRef(null);
  const mountedRef = useRef(false);
  const containerRef = useRef(null);
  const chartWrapperRef = useRef(null);
  const [hasDimensions, setHasDimensions] = useState(false);
  const [popoverPos, setPopoverPos] = useState(null);
  const [popoverInfo, setPopoverInfo] = useState(null);
  const [chartError, setChartError] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
      setHasDimensions(true);
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!mountedRef.current) return;
      if (container.offsetWidth > 0 && container.offsetHeight > 0) {
        setHasDimensions(true);
        observer.disconnect();
      }
    });
    observer.observe(container);
    return () => { observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!hasDimensions) return;
    let raf1 = requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      let raf2 = requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        const echartsInstance = instanceRef.current;
        if (echartsInstance && !echartsInstance.isDisposed?.()) {
          try {
            echartsInstance.resize({ width: 'auto', height: 'auto' });
          } catch (e) { console.warn('[SafeECharts] resize error:', e?.message); }
        }
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [hasDimensions]);

  useEffect(() => {
    if (!hasDimensions) return;
    const container = containerRef.current;
    if (!container) return;

    let resizeTimeout;
    const observer = new ResizeObserver(() => {
      if (!mountedRef.current) return;
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const echartsInstance = instanceRef.current;
        if (echartsInstance && !echartsInstance.isDisposed?.()) {
          try {
            echartsInstance.resize({ width: 'auto', height: 'auto' });
          } catch (e) { console.warn('[SafeECharts] resize error:', e?.message); }
        }
      }, 60);
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(resizeTimeout);
    };
  }, [hasDimensions]);

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

  const safeOpts = useMemo(() => {
    const w = containerRef.current?.offsetWidth;
    const h = containerRef.current?.offsetHeight;
    return {
      ...opts,
      ...(w > 0 ? { width: w } : {}),
      ...(h > 0 ? { height: h } : {}),
    };
  }, [opts, hasDimensions]);

  const containerStyle = useMemo(() => ({
    ...style,
    width: '100%',
    height: '100%',
    minHeight: style?.minHeight || style?.height || '200px',
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
    cursor: sourceInfo ? 'pointer' : undefined,
  }), [style, sourceInfo]);

  if (!hasDimensions) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
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

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
    >
      <ReactEChartsCore
        ref={ref}
        echarts={echarts}
        option={option}
        style={{ width: '100%', height: '100%' }}
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