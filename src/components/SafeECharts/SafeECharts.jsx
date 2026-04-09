import React, { useRef, useEffect, useCallback, useMemo, forwardRef } from 'react';
import ReactECharts from 'echarts-for-react';

/**
 * SafeECharts - wraps echarts-for-react with disposal safety
 *
 * Prevents "Instance has been disposed" errors when React's update cycle
 * tries to call methods on an ECharts instance that was already unmounted.
 * This commonly happens with React StrictMode or fast tab switching.
 *
 * Features:
 * - Tracks mounted state and instance reference
 * - Uses lazyUpdate by default to reduce race conditions
 * - Wraps onEvents to check disposal before firing
 * - Forwards refs to the underlying ReactECharts component
 *
 * Props: same as ReactECharts (option, style, className, etc.)
 */
const SafeECharts = forwardRef(function SafeECharts({ option, style, className, opts, onEvents, ...rest }, ref) {
  const instanceRef = useRef(null);
  const mountedRef = useRef(false);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      instanceRef.current = null;
    };
  }, []);

  // Safe onChartReady that captures instance reference
  const handleChartReady = useCallback((instance) => {
    if (mountedRef.current) {
      instanceRef.current = instance;
    }
  }, []);

  // Wrap onEvents to check disposal before firing
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

  // Merge opts with lazyUpdate to reduce race conditions
  const safeOpts = useMemo(() => ({
    lazyUpdate: true, // Defer updates to next animation frame
    ...opts,
  }), [opts]);

  return (
    <ReactECharts
      ref={ref}
      option={option}
      style={style}
      className={className}
      opts={safeOpts}
      onChartReady={handleChartReady}
      onEvents={safeOnEvents}
      {...rest}
    />
  );
});

export default SafeECharts;