import React, { useRef, useEffect, useCallback, useMemo, forwardRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';

// Check if ResizeObserver is available (not in all test environments)
const hasResizeObserver = typeof ResizeObserver !== 'undefined';

/**
 * SafeECharts - wraps echarts-for-react with disposal and dimension safety
 *
 * Prevents common ECharts issues:
 * 1. "Instance has been disposed" errors when React's update cycle
 *    tries to call methods on an ECharts instance that was already unmounted.
 *    This commonly happens with React StrictMode or fast tab switching.
 * 2. "Can't get DOM width or height" warnings when ECharts initializes
 *    on a container with zero dimensions (common during initial render).
 *
 * Features:
 * - Tracks mounted state and instance reference
 * - Uses lazyUpdate by default to reduce race conditions
 * - Wraps onEvents to check disposal before firing
 * - Forwards refs to the underlying ReactECharts component
 * - Waits for container to have valid dimensions before rendering (when ResizeObserver available)
 *
 * Props: same as ReactECharts (option, style, className, etc.)
 */
const SafeECharts = forwardRef(function SafeECharts({ option, style, className, opts, onEvents, onChartReady, ...rest }, ref) {
  const instanceRef = useRef(null);
  const mountedRef = useRef(false);
  const containerRef = useRef(null);
  // Default to true when ResizeObserver isn't available (test environments)
  const [hasDimensions, setHasDimensions] = useState(!hasResizeObserver);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      instanceRef.current = null;
    };
  }, []);

  // Use ResizeObserver to detect when container has valid dimensions (browser only)
  useEffect(() => {
    if (!hasResizeObserver) return;

    const container = containerRef.current;
    if (!container) return;

    const checkDimensions = () => {
      if (!mountedRef.current) return;
      const { clientWidth, clientHeight } = container;
      setHasDimensions(clientWidth > 0 && clientHeight > 0);
    };

    // Check immediately
    checkDimensions();

    // Use ResizeObserver for ongoing dimension changes
    const resizeObserver = new ResizeObserver(() => {
      checkDimensions();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Safe onChartReady that captures instance reference and calls external handler
  const handleChartReady = useCallback((instance) => {
    if (mountedRef.current) {
      instanceRef.current = instance;
      // Call external onChartReady if provided
      if (onChartReady) {
        onChartReady(instance);
      }
    }
  }, [onChartReady]);

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

  // Compute style with minimum dimensions placeholder
  const containerStyle = useMemo(() => ({
    ...style,
    // Ensure we have a minimum height for dimension calculation
    minHeight: style?.minHeight || style?.height || '200px',
  }), [style]);

  // When ResizeObserver isn't available (tests), just render directly without dimension check
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

  // Browser: wait for valid dimensions
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
          style={{ width: '100%', height: '100%', ...(style || {}) }}
          opts={safeOpts}
          onChartReady={handleChartReady}
          onEvents={safeOnEvents}
          {...rest}
        />
      ) : (
        // Placeholder with same dimensions while waiting
        <div style={{ width: '100%', height: '100%', minHeight: containerStyle.minHeight }} />
      )}
    </div>
  );
});

export default SafeECharts;