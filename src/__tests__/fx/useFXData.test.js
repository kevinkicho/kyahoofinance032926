import { renderHook, waitFor } from '@testing-library/react';
import { useFXData } from '../../markets/fx/data/useFXData';

describe('useFXData', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({
        base: 'USD',
        date: '2025-01-15',
        rates: { EUR: 0.92, GBP: 0.79, JPY: 150.0, CAD: 1.36, SEK: 10.5, CHF: 0.90 },
      }),
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
    expect(result.current.spotRates.EUR).toBe(0.92);
    expect(result.current.spotRates.JPY).toBe(150.0);
  });

  it('computes a changes object with one key per currency', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(typeof result.current.changes.EUR).toBe('number');
    expect(result.current.changes.USD).toBe(0);
  });

  it('stays on static fallback and isLive false on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
    expect(result.current.spotRates.USD).toBe(1);
  });
});
