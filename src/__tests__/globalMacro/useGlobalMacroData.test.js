import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGlobalMacroData } from '../../markets/globalMacro/data/useGlobalMacroData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useGlobalMacroData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns scorecardData with 12 countries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scorecardData).toHaveLength(12);
    expect(result.current.scorecardData[0]).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      flag: expect.any(String),
      gdp:  expect.any(Number),
    });
  });

  it('returns growthInflationData with year and 12 countries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.growthInflationData.year).toBeGreaterThan(2000);
    expect(result.current.growthInflationData.countries).toHaveLength(12);
  });

  it('returns centralBankData with 12 current rates and 7 history series on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.centralBankData.current).toHaveLength(12);
    expect(result.current.centralBankData.history.series).toHaveLength(7);
    expect(result.current.centralBankData.history.dates).toHaveLength(60);
  });

  it('returns debtData with 12 countries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.debtData.countries).toHaveLength(12);
    expect(result.current.debtData.countries[0]).toMatchObject({
      code: expect.any(String),
      debt: expect.any(Number),
      currentAccount: expect.any(Number),
    });
  });

  it('sets isLive true and replaces data when server responds with sufficient data', async () => {
    const liveData = {
      scorecardData: Array.from({ length: 10 }, (_, i) => ({
        code: `C${i}`, name: `Country ${i}`, flag: '🏳️', region: 'G7',
        gdp: 2.0, cpi: 3.0, rate: 4.0, unemp: 5.0, debt: 80.0,
      })),
      growthInflationData: {
        year: 2024,
        countries: Array.from({ length: 10 }, (_, i) => ({ code: `C${i}`, name: `Country ${i}`, flag: '🏳️', gdp: 2.0, cpi: 3.0 })),
      },
      centralBankData: {
        current: Array.from({ length: 10 }, (_, i) => ({ code: `C${i}`, name: `Country ${i}`, flag: '🏳️', rate: 4.0, bank: 'CB', isLive: true })),
        history: { dates: ['2020-01'], series: [{ code: 'US', name: 'United States', flag: '🇺🇸', values: [1.75] }] },
      },
      debtData: {
        year: 2024,
        countries: Array.from({ length: 10 }, (_, i) => ({ code: `C${i}`, name: `Country ${i}`, flag: '🏳️', debt: 80.0, currentAccount: 1.0 })),
      },
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.lastUpdated).toBe('2026-04-04');
    expect(result.current.scorecardData[0].code).toBe('C0');
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('guard: does not apply live data when scorecardData length < 8', async () => {
    const liveData = {
      scorecardData: [{ code: 'US', name: 'United States', flag: '🇺🇸', region: 'G7', gdp: 2.8, cpi: 3.2, rate: 5.25, unemp: 3.7, debt: 122.0 }],
      growthInflationData: { year: 2023, countries: [] },
      centralBankData: { current: [], history: { dates: [], series: [] } },
      debtData: { year: 2023, countries: [] },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // scorecardData guard (< 8) prevents replacement — should keep 12-country mock
    expect(result.current.scorecardData).toHaveLength(12);
    expect(result.current.isLive).toBe(true); // fetch succeeded even if guards blocked
  });
});
