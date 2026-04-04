import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInsuranceData } from '../../markets/insurance/data/useInsuranceData';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useInsuranceData', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mock catBondSpreads on initial render', async () => {
    mockFetch.mockRejectedValue(new Error('server unavailable'));
    const { result } = renderHook(() => useInsuranceData());
    expect(Array.isArray(result.current.catBondSpreads)).toBe(true);
    expect(result.current.catBondSpreads.length).toBeGreaterThanOrEqual(8);
    expect(result.current.catBondSpreads[0]).toMatchObject({
      name: expect.any(String),
      peril: expect.any(String),
      spread: expect.any(Number),
      rating: expect.any(String),
    });
  });

  it('returns mock combinedRatioData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('server unavailable'));
    const { result } = renderHook(() => useInsuranceData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.combinedRatioData.quarters)).toBe(true);
    expect(result.current.combinedRatioData.quarters.length).toBeGreaterThan(0);
    expect(result.current.isLive).toBe(false);
  });

  it('returns mock reserveAdequacyData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('server unavailable'));
    const { result } = renderHook(() => useInsuranceData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { reserveAdequacyData } = result.current;
    const len = reserveAdequacyData.lines.length;
    expect(len).toBeGreaterThanOrEqual(4);
    expect(reserveAdequacyData.reserves.length).toBe(len);
    expect(reserveAdequacyData.required.length).toBe(len);
    expect(reserveAdequacyData.adequacy.length).toBe(len);
  });

  it('uses live combinedRatioData when server responds', async () => {
    const liveData = {
      combinedRatioData: {
        quarters: ['Q1 23', 'Q2 23', 'Q3 23', 'Q4 23'],
        lines: { Progressive: [94.1, 92.8, 95.3, 93.7] },
      },
      reserveAdequacyData: {
        lines: ['Progressive'], reserves: [45200], required: [40680], adequacy: [111.1],
      },
      reinsurers: [],
      hyOAS: 350,
      igOAS: 100,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useInsuranceData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.combinedRatioData.lines['Progressive']).toEqual([94.1, 92.8, 95.3, 93.7]);
    expect(result.current.isLive).toBe(true);
    expect(result.current.lastUpdated).toBe('2026-04-04');
  });

  it('scales catBondSpreads when hyOAS is provided', async () => {
    const liveData = {
      combinedRatioData: { quarters: ['Q1 23'], lines: { Progressive: [94.1] } },
      reserveAdequacyData: { lines: ['Progressive'], reserves: [45200], required: [40680], adequacy: [111.1] },
      reinsurers: [],
      hyOAS: 700,  // 2x baseline of 350
      igOAS: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useInsuranceData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // hyOAS 700 / baseline 350 = factor 2.0, so spreads should double
    const originalSpreads = [620, 580, 840, 710, 390, 450, 760, 310, 920, 540];
    result.current.catBondSpreads.forEach((bond, i) => {
      expect(bond.spread).toBe(Math.round(originalSpreads[i] * 2));
    });
  });

  it('returns reinsurancePricing array with required fields', async () => {
    mockFetch.mockRejectedValue(new Error('server unavailable'));
    const { result } = renderHook(() => useInsuranceData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { reinsurancePricing } = result.current;
    expect(Array.isArray(reinsurancePricing)).toBe(true);
    expect(reinsurancePricing.length).toBeGreaterThanOrEqual(8);
    expect(reinsurancePricing[0]).toMatchObject({
      peril: expect.any(String),
      rol: expect.any(Number),
      capacity: expect.stringMatching(/^(Ample|Adequate|Tight|Very Tight)$/),
    });
  });
});
