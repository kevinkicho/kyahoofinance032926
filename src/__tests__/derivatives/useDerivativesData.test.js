import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDerivativesData } from '../../markets/derivatives/data/useDerivativesData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useDerivativesData', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('returns mock volSurfaceData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { volSurfaceData } = result.current;
    expect(Array.isArray(volSurfaceData.strikes)).toBe(true);
    expect(volSurfaceData.grid.length).toBe(volSurfaceData.expiries.length);
    expect(result.current.isLive).toBe(false);
  });

  it('returns mock vixTermStructure on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { vixTermStructure } = result.current;
    expect(vixTermStructure.dates.length).toBeGreaterThan(0);
    expect(vixTermStructure.values.length).toBe(vixTermStructure.dates.length);
    expect(vixTermStructure.prevValues.length).toBe(vixTermStructure.dates.length);
  });

  it('uses live vixTermStructure when server responds', async () => {
    const liveData = {
      vixTermStructure: { dates: ['9D', '1M', '3M', '6M'], values: [14.2, 16.8, 18.5, 20.1], prevValues: [13.9, 16.2, 17.9, 19.6] },
      optionsFlow: null, volSurfaceData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.vixTermStructure.values).toEqual([14.2, 16.8, 18.5, 20.1]);
  });

  it('uses live optionsFlow when server responds', async () => {
    const liveFlow = [
      { ticker: 'SPY', strike: 520, expiry: '16 May 25', type: 'P', volume: 45200, openInterest: 12400, premium: 8.20, sentiment: 'bearish' },
    ];
    const liveData = {
      vixTermStructure: null, optionsFlow: liveFlow, volSurfaceData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.optionsFlow[0].ticker).toBe('SPY');
  });

  it('does not return fearGreedData', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fearGreedData).toBeUndefined();
  });
});
