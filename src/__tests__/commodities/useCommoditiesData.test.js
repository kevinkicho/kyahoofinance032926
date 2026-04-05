// src/__tests__/commodities/useCommoditiesData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCommoditiesData } from '../../markets/commodities/data/useCommoditiesData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCommoditiesData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns priceDashboardData with 3 sectors on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.priceDashboardData).toHaveLength(3);
    expect(result.current.priceDashboardData[0]).toMatchObject({
      sector: expect.any(String),
      commodities: expect.any(Array),
    });
    expect(result.current.priceDashboardData[0].commodities).toHaveLength(4);
  });

  it('returns futuresCurveData with labels and prices arrays on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { futuresCurveData } = result.current;
    expect(Array.isArray(futuresCurveData.labels)).toBe(true);
    expect(futuresCurveData.labels.length).toBeGreaterThanOrEqual(6);
    expect(futuresCurveData.prices.length).toBe(futuresCurveData.labels.length);
  });

  it('returns sectorHeatmapData with 12 commodities on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sectorHeatmapData.commodities).toHaveLength(12);
    expect(result.current.sectorHeatmapData.commodities[0]).toMatchObject({
      ticker: expect.any(String),
      name: expect.any(String),
      sector: expect.any(String),
      d1: expect.any(Number),
    });
  });

  it('returns supplyDemandData with crudeStocks, natGasStorage, crudeProduction on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { supplyDemandData } = result.current;
    expect(Array.isArray(supplyDemandData.crudeStocks.periods)).toBe(true);
    expect(Array.isArray(supplyDemandData.natGasStorage.periods)).toBe(true);
    expect(Array.isArray(supplyDemandData.crudeProduction.periods)).toBe(true);
  });

  it('sets isLive true and uses live priceDashboardData when server responds', async () => {
    const liveData = {
      priceDashboardData: [
        { sector: 'Energy', commodities: [{ ticker: 'CL=F', name: 'WTI Crude', unit: '$/bbl', price: 90.0, change1d: 1.5, change1w: 2.0, change1m: 3.0, sparkline: [88, 89, 90] }] },
        { sector: 'Metals', commodities: [{ ticker: 'GC=F', name: 'Gold', unit: '$/oz', price: 2400, change1d: 0.5, change1w: 1.0, change1m: 2.0, sparkline: [2380, 2390, 2400] }] },
        { sector: 'Agriculture', commodities: [{ ticker: 'ZW=F', name: 'Wheat', unit: '¢/bu', price: 550, change1d: -0.5, change1w: -1.0, change1m: -2.0, sparkline: [560, 555, 550] }] },
      ],
      futuresCurveData: { labels: ["Jun '26", "Jul '26", "Aug '26", "Sep '26"], prices: [90.0, 89.8, 89.6, 89.4], commodity: 'WTI Crude Oil', spotPrice: 90.0 },
      sectorHeatmapData: { commodities: [{ ticker: 'CL=F', name: 'WTI Crude', sector: 'Energy', d1: 1.5, w1: 2.0, m1: 3.0 }], columns: ['1d%', '1w%', '1m%'] },
      supplyDemandData: {
        crudeStocks: { periods: ['2026-04-04'], values: [460], avg5yr: 432 },
        natGasStorage: { periods: ['2026-04-04'], values: [1900], avg5yr: 1742 },
        crudeProduction: { periods: ['2026-04-04'], values: [13.2] },
      },
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.priceDashboardData[0].commodities[0].price).toBe(90.0);
    expect(result.current.futuresCurveData.prices[0]).toBe(90.0);
    expect(result.current.lastUpdated).toBe('2026-04-04');
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });
});
