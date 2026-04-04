import { renderHook, waitFor } from '@testing-library/react';
import { useFXData } from '../../markets/fx/data/useFXData';

describe('useFXData', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      // History range endpoint (contains ..)
      if (url.includes('..')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            rates: {
              '2024-12-16': { EUR: 0.91, GBP: 0.78, JPY: 149.0, CAD: 1.34, SEK: 10.3, CHF: 0.88 },
              '2024-12-17': { EUR: 0.93, GBP: 0.80, JPY: 152.0, CAD: 1.36, SEK: 10.5, CHF: 0.90 },
            },
          }),
        });
      }
      // Latest endpoint (no date in path)
      if (url.includes('/latest')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            date: '2025-01-15',
            rates: { EUR: 0.93, GBP: 0.80, JPY: 152.0, CAD: 1.36, SEK: 10.5, CHF: 0.90 },
          }),
        });
      }
      // Yesterday's specific date endpoint
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          base: 'USD',
          date: '2025-01-14',
          rates: { EUR: 0.91, GBP: 0.78, JPY: 149.0, CAD: 1.34, SEK: 10.3, CHF: 0.88 },
        }),
      });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('starts with static fallback rates before fetch resolves', () => {
    const { result } = renderHook(() => useFXData());
    expect(result.current.spotRates.USD).toBe(1);
    expect(typeof result.current.spotRates.EUR).toBe('number');
  });

  it('sets isLive true after successful fetch', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
  });

  it('updates spotRates from API response', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.spotRates.EUR).toBe(0.93);  // from latest mock
    expect(result.current.spotRates.JPY).toBe(152.0);
  });

  it('computes a changes object with one key per currency', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(typeof result.current.changes.EUR).toBe('number');
    expect(result.current.changes.USD).toBe(0);
  });

  it('computes non-zero changes when spot and prev rates differ', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // EUR: spot=0.93, prev=0.91 → change = (0.93 - 0.91) / 0.91 * 100 ≈ +2.198%
    expect(result.current.changes.EUR).toBeCloseTo(2.198, 1);
    // USD always 0
    expect(result.current.changes.USD).toBe(0);
  });

  describe('on network error', () => {
    beforeEach(() => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    });
    afterEach(() => vi.restoreAllMocks());

    it('keeps static fallback and isLive false', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isLive).toBe(false);
      expect(result.current.spotRates.USD).toBe(1);
    });
  });
});
