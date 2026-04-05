import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCOTData } from '../../markets/fx/data/useCOTData';

const MOCK_CFTC = [
  {
    report_date_as_yyyy_mm_dd: '2025-04-01',
    market_and_exchange_names: 'EURO FX - CHICAGO MERCANTILE EXCHANGE',
    noncomm_positions_long_all:  '200000',
    noncomm_positions_short_all: '80000',
    open_interest_all:           '600000',
  },
  {
    report_date_as_yyyy_mm_dd: '2025-04-01',
    market_and_exchange_names: 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
    noncomm_positions_long_all:  '50000',
    noncomm_positions_short_all: '150000',
    open_interest_all:           '400000',
  },
  {
    report_date_as_yyyy_mm_dd: '2025-04-01',
    market_and_exchange_names: 'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE',
    noncomm_positions_long_all:  '30000',
    noncomm_positions_short_all: '30000',
    open_interest_all:           '200000',
  },
];

describe('useCOTData', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CFTC),
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('starts with isLive false', () => {
    const { result } = renderHook(() => useCOTData());
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true after successful fetch', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
  });

  it('computes positive netSpecPct for EUR (net long)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // (200000 - 80000) / 600000 * 100 = 20%
    expect(result.current.cotData.EUR).toBeCloseTo(20.0, 1);
  });

  it('computes negative netSpecPct for JPY (net short)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // (50000 - 150000) / 400000 * 100 = -25%
    expect(result.current.cotData.JPY).toBeCloseTo(-25.0, 1);
  });

  it('computes zero netSpecPct for GBP (balanced)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // (30000 - 30000) / 200000 * 100 = 0%
    expect(result.current.cotData.GBP).toBeCloseTo(0.0, 1);
  });

  it('returns undefined for currencies not in CFTC (e.g. SEK)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.cotData.SEK).toBeUndefined();
  });

  describe('on network error', () => {
    beforeEach(() => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    });
    afterEach(() => vi.restoreAllMocks());

    it('keeps cotData as empty object and isLive false', async () => {
      const { result } = renderHook(() => useCOTData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isLive).toBe(false);
      expect(result.current.cotData).toEqual({});
    });
  });
});
