import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEquityDeepDiveData } from '../../markets/equitiesDeepDive/data/useEquityDeepDiveData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useEquityDeepDiveData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns sectorData with 12 sectors on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sectorData.sectors).toHaveLength(12);
    expect(result.current.sectorData.sectors[0]).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      perf1d: expect.any(Number),
      perf1m: expect.any(Number),
    });
  });

  it('returns factorData with inFavor and 20 stocks on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.factorData.stocks).toHaveLength(20);
    expect(result.current.factorData.inFavor).toMatchObject({
      value: expect.any(Number),
      momentum: expect.any(Number),
    });
  });

  it('returns earningsData with upcoming events and beatRates on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.earningsData.upcoming.length).toBeGreaterThan(0);
    expect(result.current.earningsData.beatRates.length).toBeGreaterThan(0);
  });

  it('returns shortData with 20 mostShorted entries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shortData.mostShorted).toHaveLength(20);
    expect(result.current.shortData.mostShorted[0]).toMatchObject({
      ticker: expect.any(String),
      shortFloat: expect.any(Number),
    });
  });

  it('sets isLive true and replaces sectorData when server responds with sufficient data', async () => {
    const liveData = {
      sectorData: {
        sectors: Array.from({ length: 10 }, (_, i) => ({
          code: `X${i}`, name: `Sector ${i}`,
          perf1d: 0.5, perf1w: 1.0, perf1m: 2.0, perf3m: 5.0, perf1y: 12.0,
        })),
      },
      factorData:   { inFavor: { value: 10, momentum: 20, quality: 5, lowVol: -1 }, stocks: Array.from({ length: 12 }, (_, i) => ({ ticker: `T${i}`, name: `Stock ${i}`, sector: 'Technology', value: 50, momentum: 50, quality: 50, lowVol: 50, composite: 50 })) },
      earningsData: { upcoming: Array.from({ length: 6 }, (_, i) => ({ ticker: `E${i}`, name: `Co ${i}`, sector: 'Technology', date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100 })), beatRates: [] },
      shortData:    { mostShorted: Array.from({ length: 12 }, (_, i) => ({ ticker: `S${i}`, name: `Short ${i}`, sector: 'Technology', shortFloat: 15, daysToCover: 2, marketCapB: 5, perf1w: 1 })) },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.lastUpdated).toBe('2026-04-05');
    expect(result.current.sectorData.sectors[0].code).toBe('X0');
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('guard: does not apply live sectorData when sectors length < 8', async () => {
    const liveData = {
      sectorData: { sectors: [{ code: 'SPY', name: 'S&P 500', perf1d: 0.5, perf1w: 1.3, perf1m: 3.2, perf3m: 8.1, perf1y: 18.9 }] },
      factorData:   { inFavor: {}, stocks: [] },
      earningsData: { upcoming: [], beatRates: [] },
      shortData:    { mostShorted: [] },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sectorData.sectors).toHaveLength(12);
    expect(result.current.isLive).toBe(false);
  });
});
