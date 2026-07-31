import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';

// Mock react-grid-layout so we can drive `onLayoutChange` directly without
// having to simulate real drag/resize events. Capture the cols+breakpoints
// props too so the test can assert the persistence-critical configuration:
// every breakpoint gets the same layout AND every breakpoint uses 12 cols
// (otherwise `correctBounds` clamps x when the lg→md fallback fires).
const rglState = { onLayoutChange: null, lastLayouts: null, cols: null, breakpoints: null, onDragStop: null, onResizeStop: null };

function MockResponsive({ layouts, onLayoutChange, onDragStop, onResizeStop, cols, breakpoints, children }) {
  rglState.onLayoutChange = onLayoutChange;
  rglState.onDragStop = onDragStop;
  rglState.onResizeStop = onResizeStop;
  rglState.lastLayouts = layouts;
  rglState.cols = cols;
  rglState.breakpoints = breakpoints;
  return <div data-testid="rgl-mock">{children}</div>;
}

vi.mock('react-grid-layout', () => ({
  useContainerWidth: () => ({ width: 1200, mounted: true, containerRef: { current: null }, measureWidth: () => {} }),
  ResponsiveGridLayout: MockResponsive,
  Responsive: MockResponsive,
}));

// BentoWrapper imports Responsive from react-grid-layout/legacy
vi.mock('react-grid-layout/legacy', () => ({
  Responsive: MockResponsive,
  ResponsiveGridLayout: MockResponsive,
}));

import BentoWrapper from '../../components/BentoWrapper';

const STORAGE_KEY = 'bento-test-layout';
const LAYOUT = { lg: [
  { i: 'a', x: 0, y: 0, w: 6, h: 2 },
  { i: 'b', x: 6, y: 0, w: 6, h: 2 },
] };

beforeEach(() => {
  // The vitest jsdom environment ships a localStorage stub without
  // `clear()`. Replace with a real Storage backed by a Map so the test
  // controls what loadLayout sees from one render to the next.
  const store = new Map();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    },
  });
  rglState.onLayoutChange = null;
  rglState.lastLayouts = null;
});

describe('BentoWrapper persistence', () => {
  it('always mounts layout slots even when a child is missing', () => {
    const { container } = render(
      <BentoWrapper layout={LAYOUT} storageKey={STORAGE_KEY} panelTitles={{ a: 'Panel A', b: 'Panel B' }}>
        <div key="a">only a</div>
        {/* key "b" intentionally omitted */}
      </BentoWrapper>
    );
    expect(container.querySelector('[data-panel-key="a"]')).toBeTruthy();
    expect(container.querySelector('[data-panel-key="b"]')).toBeTruthy();
    expect(container.querySelector('.bento-card--disabled')).toBeTruthy();
  });

  it('uses 12 cols at every breakpoint (so correctBounds never clamps x)', () => {
    // The original "drag x-position lost on reload" bug came from RGL's
    // breakpoint fallback: when actual container width drops below 1200px
    // RGL switches lg→md (10 cols), runs correctBounds, and clamps any
    // saved x where x+w > 10. Locking every breakpoint to 12 cols keeps
    // the saved layout valid regardless of which breakpoint RGL picks.
    render(
      <BentoWrapper layout={LAYOUT} storageKey={STORAGE_KEY}>
        <div key="a" />
        <div key="b" />
      </BentoWrapper>
    );
    expect(rglState.cols).toEqual({ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 });
  });

  it('provides the same layout under every breakpoint', () => {
    render(
      <BentoWrapper layout={LAYOUT} storageKey={STORAGE_KEY}>
        <div key="a" />
        <div key="b" />
      </BentoWrapper>
    );
    const layouts = rglState.lastLayouts;
    expect(Object.keys(layouts).sort()).toEqual(['lg', 'md', 'sm', 'xs', 'xxs']);
    // Each breakpoint should reference the same array — guards against a
    // future regression where someone passes only `lg` and lets RGL
    // regenerate other breakpoints (which triggers correctBounds again).
    expect(layouts.md).toBe(layouts.lg);
    expect(layouts.sm).toBe(layouts.lg);
  });

  it('saves the user-customized layout to localStorage on layout change', () => {
    render(
      <BentoWrapper layout={LAYOUT} storageKey={STORAGE_KEY}>
        <div key="a" />
        <div key="b" />
      </BentoWrapper>
    );
    expect(typeof rglState.onLayoutChange).toBe('function');
    const dragged = [
      { i: 'a', x: 0, y: 4, w: 6, h: 3 }, // user moved + resized 'a'
      { i: 'b', x: 6, y: 0, w: 6, h: 2 },
    ];
    act(() => { rglState.onLayoutChange(dragged); });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // Geometry only is persisted (no static/isDraggable flags)
    expect(stored).toEqual(dragged.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })));
  });

  it('rehydrates the saved layout on remount', () => {
    const saved = [
      { i: 'a', x: 3, y: 6, w: 6, h: 4 },
      { i: 'b', x: 9, y: 6, w: 3, h: 2 },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    render(
      <BentoWrapper layout={LAYOUT} storageKey={STORAGE_KEY}>
        <div key="a" />
        <div key="b" />
      </BentoWrapper>
    );

    // RGL receives the saved positions, not the LAYOUT defaults.
    expect(rglState.lastLayouts.lg.find(i => i.i === 'a')).toEqual(
      expect.objectContaining({ x: 3, y: 6, w: 6, h: 4 })
    );
    expect(rglState.lastLayouts.lg.find(i => i.i === 'b')).toEqual(
      expect.objectContaining({ x: 9, y: 6, w: 3, h: 2 })
    );
  });

  it('does NOT loop infinitely when parent reconstructs layout each render', () => {
    // Simulate a parent that builds `dynamicLayout = { lg: [...] }` inline,
    // producing a fresh object reference on every render. Without the
    // signature-based dep, the useEffect would re-merge → setState → render →
    // useEffect → ... and exhaust React's update budget.
    let renderCount = 0;
    function Parent() {
      renderCount++;
      const dynamicLayout = { lg: [
        { i: 'a', x: 0, y: 0, w: 6, h: 2 },
        { i: 'b', x: 6, y: 0, w: 6, h: 2 },
      ] };
      return (
        <BentoWrapper layout={dynamicLayout} storageKey={STORAGE_KEY}>
          <div key="a" />
          <div key="b" />
        </BentoWrapper>
      );
    }
    render(<Parent />);
    // If the bug were back, this would either throw (max update depth)
    // or render dozens of times. Allow a small startup margin.
    expect(renderCount).toBeLessThan(5);
  });

  it('never freezes a panel after a layout change that includes static/isDraggable:false', () => {
    render(
      <BentoWrapper layout={LAYOUT} storageKey={STORAGE_KEY}>
        <div key="a" />
        <div key="b" />
      </BentoWrapper>
    );
    act(() => {
      rglState.onLayoutChange([
        { i: 'a', x: 0, y: 0, w: 6, h: 3, static: true, isDraggable: false },
        { i: 'b', x: 6, y: 0, w: 6, h: 2, isDraggable: false },
      ]);
    });
    const layouts = rglState.lastLayouts.lg;
    for (const item of layouts) {
      expect(item.static).toBe(false);
      expect(item.isDraggable).toBeUndefined();
    }
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    for (const item of stored) {
      expect(item.static).toBeUndefined();
      expect(item.isDraggable).toBeUndefined();
    }
  });

  it('preserves user customization when a new conditional panel appears', () => {
    // First render: 2 panels. User drags 'a'.
    const { rerender } = render(
      <BentoWrapper layout={LAYOUT} storageKey={STORAGE_KEY}>
        <div key="a" />
        <div key="b" />
      </BentoWrapper>
    );
    act(() => {
      rglState.onLayoutChange([
        { i: 'a', x: 0, y: 5, w: 6, h: 3 },
        { i: 'b', x: 6, y: 0, w: 6, h: 2 },
      ]);
    });

    // Second render: 3 panels — a new 'c' became available (e.g., data
    // arrived for a conditional panel). 'a' must keep its dragged spot.
    const expandedLayout = { lg: [
      { i: 'a', x: 0, y: 0, w: 6, h: 2 },
      { i: 'b', x: 6, y: 0, w: 6, h: 2 },
      { i: 'c', x: 0, y: 2, w: 12, h: 3 },
    ] };
    rerender(
      <BentoWrapper layout={expandedLayout} storageKey={STORAGE_KEY}>
        <div key="a" />
        <div key="b" />
        <div key="c" />
      </BentoWrapper>
    );

    // 'a' kept the user's drag, 'c' picked up the default position.
    const a = rglState.lastLayouts.lg.find(i => i.i === 'a');
    const c = rglState.lastLayouts.lg.find(i => i.i === 'c');
    expect(a).toEqual(expect.objectContaining({ x: 0, y: 5, w: 6, h: 3 }));
    expect(c).toEqual(expect.objectContaining({ x: 0, y: 2, w: 12, h: 3 }));
  });
});
