import React, { useRef, useEffect, useCallback, useMemo, forwardRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

const hasResizeObserver = typeof ResizeObserver !== 'undefined';

/**
 * SafeECharts — wraps echarts-for-react with:
 * 1. Disposal safety (no "instance disposed" errors)
 * 2. Dimension safety (wait for valid container size before rendering)
 * 3. Proper resize handling inside flex/grid layouts
 */
const SafeECharts = forwardRef(function SafeECharts({ option, style, className, opts, onEvents, onChartReady, ...rest }, ref) {
  const instanceRef = useRef(null);
  const mountedRef = useRef(false);
  const containerRef = useRef(null);
  const [hasDimensions, setHasDimensions] = useState(!hasResizeObserver);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      instanceRef.current = null;
    };
  }, []);

  // Wait for container to have valid dimensions before rendering chart.
  // Once dimensions are found, latch to true — never go back.
  useEffect(() => {
    if (!hasResizeObserver) return;
    const container = containerRef.current;
    if (!container) return;

    if (container.clientWidth > 0 && container.clientHeight > 0) {
      setHasDimensions(true);
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!mountedRef.current) return;
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        setHasDimensions(true);
        observer.disconnect();
      }
    });
    observer.observe(container);
    return () => { observer.disconnect(); };
  }, []);

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
    minHeight: style?.minHeight || style?.height || '200px',
  }), [style]);

  if (!hasResizeObserver) {
    return (
      <ReactECharts
        ref={ref}
        option={option}
        style={containerStyle}
        className={className}
        opts={safeOpts}
        onChartReady={handleChartReady}
        onEvents={safeOnEvents}
        {...rest}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
    >
      {hasDimensions ? (
        <ReactECharts
          ref={ref}
          option={option}
          style={{ width: '100%', height: '100%' }}
          opts={safeOpts}
          onChartReady={handleChartReady}
          onEvents={safeOnEvents}
          {...rest}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', minHeight: containerStyle.minHeight }} />
      )}
    </div>
  );
});

export default SafeECharts;