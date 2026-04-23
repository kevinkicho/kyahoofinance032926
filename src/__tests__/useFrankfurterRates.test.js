import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFrankfurterRates } from '../utils/useFrankfurterRates.js';
import { exchangeRates, currencySymbols } from '../utils/constants.js';

describe('useFrankfurterRates', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial static fallback values', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ rates: null }),
    });

    const { result } = renderHook(() => useFrankfurterRates());

    expect(result.current.rates).toEqual(exchangeRates);
    expect(result.current.symbols).toEqual(currencySymbols);
    expect(result.current.isLive).toBe(false);
  });

  it('updates to live rates when fetch succeeds', async () => {
    const liveRates = { USD: 1, EUR: 0.85, GBP: 0.73 };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        rates: { EUR: 0.85, GBP: 0.73 },
        date: '2024-03-15',
      }),
    });

    const { result } = renderHook(() => useFrankfurterRates());

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.rates).toEqual(liveRates);
    expect(result.current.isLive).toBe(true);
    expect(result.current.lastUpdated).toContain('2024-03-15');
  });

  it('falls back to static rates when fetch fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFrankfurterRates());

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.rates).toEqual(exchangeRates);
    expect(result.current.isLive).toBe(false);
  });

  it('falls back when response has no rates', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useFrankfurterRates());

    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.rates).toEqual(exchangeRates);
    expect(result.current.isLive).toBe(false);
  });
});