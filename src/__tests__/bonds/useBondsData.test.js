import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBondsData } from '../../markets/bonds/data/useBondsData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useBondsData', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('returns mock yieldCurveData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { yieldCurveData } = result.current;
    expect(typeof yieldCurveData).toBe('object');
    expect(yieldCurveData.US).toBeDefined();
    expect(typeof yieldCurveData.US['10y']).toBe('number');
    expect(result.current.isLive).toBe(false);
  });

  it('returns mock spreadData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { spreadData } = result.current;
    expect(Array.isArray(spreadData.dates)).toBe(true);
    expect(spreadData.dates.length).toBe(12);
    expect(Array.isArray(spreadData.IG)).toBe(true);
    expect(spreadData.IG.length).toBe(12);
  });

  it('merges live US yields into yieldCurveData when server responds', async () => {
    const liveData = {
      yieldCurveData: { US: { '3m': 5.10, '6m': 4.95, '1y': 4.70, '2y': 4.45, '5y': 4.20, '10y': 4.05, '30y': 4.25 } },
      spreadData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.yieldCurveData.US['10y']).toBe(4.05);
    expect(result.current.yieldCurveData.US['3m']).toBe(5.10);
  });

  it('scales international curve using live 10yr anchor', async () => {
    const liveData = {
      yieldCurveData: { US: { '3m': 5.1, '6m': 4.9, '1y': 4.7, '2y': 4.4, '5y': 4.2, '10y': 4.0, '30y': 4.2 }, DE: { '10y': 3.0 } },
      spreadData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // DE mock 10yr = 2.65, live 10yr = 3.0, scale = 3.0/2.65 ≈ 1.132
    // DE mock 5yr = 2.85, scaled ≈ 2.85 * 1.132 ≈ 3.23
    const de = result.current.yieldCurveData.DE;
    expect(de['10y']).toBe(3.0);
    expect(de['5y']).toBeGreaterThan(2.85); // scaled up
  });

  it('falls back to mock spreadData when server returns null', async () => {
    const liveData = { yieldCurveData: { US: { '10y': 4.0 } }, spreadData: null, lastUpdated: '2026-04-04' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.spreadData.dates.length).toBe(12);
  });

  it('returns creditRatingsData and durationLadderData unchanged (always mock)', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.creditRatingsData)).toBe(true);
    expect(result.current.creditRatingsData.length).toBeGreaterThan(0);
    expect(Array.isArray(result.current.durationLadderData)).toBe(true);
  });
});
