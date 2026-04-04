import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealEstateData } from '../../markets/realEstate/data/useRealEstateData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useRealEstateData', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('returns mock reitData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { reitData } = result.current;
    expect(Array.isArray(reitData)).toBe(true);
    expect(reitData.length).toBeGreaterThanOrEqual(8);
    expect(result.current.isLive).toBe(false);
  });

  it('returns mock priceIndexData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { priceIndexData } = result.current;
    expect(priceIndexData.US).toBeDefined();
    expect(Array.isArray(priceIndexData.US.dates)).toBe(true);
    expect(priceIndexData.US.values.length).toBe(priceIndexData.US.dates.length);
  });

  it('uses live reitData when server responds', async () => {
    const liveData = {
      reitData: [
        { ticker: 'PLD', name: 'Prologis', sector: 'Industrial', dividendYield: 3.1, pFFO: 18.4, ytdReturn: 7.5, marketCap: 98, price: 110.2, changePct: 0.5 },
      ],
      priceIndexData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.reitData[0].price).toBe(110.2);
    expect(result.current.reitData[0].dividendYield).toBe(3.1);
  });

  it('uses live priceIndexData when server responds', async () => {
    const liveData = {
      reitData: null,
      priceIndexData: {
        US: { dates: ['Q1 20', 'Q2 20', 'Q3 20', 'Q4 20'], values: [100, 97.2, 103.5, 107.1] },
        UK: { dates: ['Q1 20', 'Q2 20', 'Q3 20', 'Q4 20'], values: [100, 96.8, 102.1, 106.3] },
      },
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.priceIndexData.US.values[0]).toBe(100);
  });

  it('always returns mock affordabilityData and capRateData', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.affordabilityData)).toBe(true);
    expect(result.current.affordabilityData.length).toBeGreaterThan(0);
    expect(result.current.capRateData).toBeDefined();
  });
});
