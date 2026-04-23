import { describe, it, expect, vi } from 'vitest';
import { useInterval } from '../hooks/useInterval.js';
import { renderHook, act } from '@testing-library/react';

describe('useInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call callback when delay is null', () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, null));
    expect(callback).not.toHaveBeenCalled();
  });

  it('does not call callback when delay is undefined', () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, undefined));
    expect(callback).not.toHaveBeenCalled();
  });

  it('calls callback at the specified delay interval', () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 1000));

    expect(callback).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('clears interval on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useInterval(callback, 1000));

    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(1);

    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('refreshes interval when delay changes', () => {
    const callback = vi.fn();
    const { rerender } = renderHook(({ delay }) => useInterval(callback, delay), {
      initialProps: { delay: 1000 },
    });

    act(() => vi.advanceTimersByTime(1000));
    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ delay: 2000 });
    act(() => vi.advanceTimersByTime(2000));
    expect(callback).toHaveBeenCalledTimes(2);
  });
});