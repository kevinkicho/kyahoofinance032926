import React, { useRef, useEffect, useCallback, useMemo, forwardRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

const SafeECharts = forwardRef(function SafeECharts({ option, style, className, opts, onEvents, onChartReady, ...rest }, ref) {
  const instanceRef = useRef(null);
  const mountedRef = useRef(false);
  const containerRef = useRef(null);
  const chartWrapperRef = useRef(null);
  const [hasDimensions, setHasDimensions] = useState(false);

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
          } catch {}
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
          } catch {}
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

  const safeOnEvents = useMemo(() => {
    if (!onEvents) return undefined;
    const wrapped = {};
    for (const [event, handler] of Object.entries(onEvents)) {
      wrapped[event] = (...args) => {
        if (mountedRef.current && instanceRef.current && !instanceRef.current.isDisposed?.()) {
          handler(...args);
        }
      };
    }
    return wrapped;
  }, [onEvents]);

  const safeOpts = useMemo(() => ({ ...opts }), [opts]);

  const containerStyle = useMemo(() => ({
    ...style,
    width: '100%',
    height: '100%',
    minHeight: style?.minHeight || style?.height || '200px',
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
  }), [style]);

  if (!hasDimensions) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
    >
      <ReactECharts
        ref={ref}
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={safeOpts}
        onChartReady={handleChartReady}
        onEvents={safeOnEvents}
        {...rest}
      />
    </div>
  );
});

export default SafeECharts;