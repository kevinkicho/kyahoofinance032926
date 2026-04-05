import { renderHook, waitFor } from '@testing-library/react';
import { useFXData } from '../../markets/fx/data/useFXData';

const WEEK_RATES = {
  '2025-03-28': { EUR: 0.90, GBP: 0.77, JPY: 148.0, CAD: 1.33, SEK: 10.2, CHF: 0.87,
                  AUD: 1.55, CNY: 7.25, NOK: 10.8, NZD: 1.69, HKD: 7.78, SGD: 1.34,
                  INR: 83.5, KRW: 1350, MXN: 17.0, BRL: 5.05, ZAR: 18.2 },
  '2025-03-31': { EUR: 0.91, GBP: 0.78, JPY: 149.0, CAD: 1.34, SEK: 10.3, CHF: 0.88,
                  AUD: 1.56, CNY: 7.26, NOK: 10.9, NZD: 1.70, HKD: 7.79, SGD: 1.35,
                  INR: 83.6, KRW: 1355, MXN: 17.1, BRL: 5.06, ZAR: 18.3 },
  '2025-04-01': { EUR: 0.92, GBP: 0.79, JPY: 150.0, CAD: 1.35, SEK: 10.4, CHF: 0.89,
                  AUD: 1.57, CNY: 7.27, NOK: 11.0, NZD: 1.71, HKD: 7.80, SGD: 1.36,
                  INR: 83.7, KRW: 1360, MXN: 17.2, BRL: 5.07, ZAR: 18.4 },
};

describe('useFXData', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      // 7-day mover range (symbols includes BRL)
      if (url.includes('..') && url.includes('BRL')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ base: 'USD', rates: WEEK_RATES }),
        });
      }
      // 30-day DXY history range
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
      // Latest endpoint
      if (url.includes('/latest')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            date: '2025-04-03',
            rates: { EUR: 0.93, GBP: 0.80, JPY: 152.0, CAD: 1.36, SEK: 10.5, CHF: 0.90,
                     AUD: 1.58, CNY: 7.28, NOK: 11.1, NZD: 1.72, HKD: 7.81, SGD: 1.37,
                     INR: 83.8, KRW: 1365, MXN: 17.3, BRL: 5.08, ZAR: 18.5 },
          }),
        });
      }
      // 30d single-date snapshot (has MOVER_SYMBOLS but no ..)
      if (url.includes('BRL') && !url.includes('..')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            date: '2025-03-04',
            rates: { EUR: 0.88, GBP: 0.74, JPY: 145.0, CAD: 1.30, SEK: 10.0, CHF: 0.85,
                     AUD: 1.52, CNY: 7.20, NOK: 10.5, NZD: 1.65, HKD: 7.75, SGD: 1.31,
                     INR: 82.0, KRW: 1330, MXN: 16.5, BRL: 4.95, ZAR: 17.8 },
          }),
        });
      }
      // Yesterday single-date fallback
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          base: 'USD',
          date: '2025-04-02',
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
    expect(result.current.spotRates.EUR).toBe(0.93);
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
    // EUR: spot=0.93, prev=0.91 → negated = -((0.93-0.91)/0.91*100) ≈ -2.198%
    expect(result.current.changes.EUR).toBeCloseTo(-2.198, 1);
  });

  describe('changes1w and sparklines from 7d range', () => {
    it('computes changes1w for EUR from 7d range', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      // EUR: first=0.90, last=0.92 → negated = -((0.92-0.90)/0.90*100) ≈ -2.222%
      expect(result.current.changes1w.EUR).toBeCloseTo(-2.222, 1);
    });

    it('returns sparklines array with length equal to number of dates', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      expect(result.current.sparklines.EUR).toHaveLength(3);
    });

    it('sparklines first value is 0 (normalized from base)', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      expect(result.current.sparklines.EUR[0]).toBe(0);
    });
  });

  describe('changes1m from 30d single-date snapshot', () => {
    it('computes changes1m for EUR using distinct 30d snapshot', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      // EUR: spot=0.93, month30=0.88 → negated = -((0.93-0.88)/0.88*100) ≈ -5.682%
      expect(result.current.changes1m.EUR).toBeCloseTo(-5.682, 1);
    });
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
