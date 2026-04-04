import { describe, it, expect } from 'vitest';
import { useDerivativesData } from '../../markets/derivatives/data/useDerivativesData';

describe('useDerivativesData', () => {
  it('returns volSurfaceData with strikes and expiries arrays', () => {
    const { volSurfaceData } = useDerivativesData();
    expect(Array.isArray(volSurfaceData.strikes)).toBe(true);
    expect(Array.isArray(volSurfaceData.expiries)).toBe(true);
    expect(volSurfaceData.strikes.length).toBeGreaterThan(0);
  });

  it('volSurfaceData grid has rows matching expiries count', () => {
    const { volSurfaceData } = useDerivativesData();
    expect(volSurfaceData.grid.length).toBe(volSurfaceData.expiries.length);
    volSurfaceData.grid.forEach(row => {
      expect(row.length).toBe(volSurfaceData.strikes.length);
    });
  });

  it('vixTermStructure has dates and values arrays of equal length', () => {
    const { vixTermStructure } = useDerivativesData();
    expect(vixTermStructure.dates.length).toBeGreaterThan(0);
    expect(vixTermStructure.values.length).toBe(vixTermStructure.dates.length);
  });

  it('optionsFlow has at least 8 entries with required fields', () => {
    const { optionsFlow } = useDerivativesData();
    expect(optionsFlow.length).toBeGreaterThanOrEqual(8);
    expect(optionsFlow[0]).toMatchObject({
      ticker: expect.any(String),
      strike: expect.any(Number),
      expiry: expect.any(String),
      type: expect.stringMatching(/^(C|P)$/),
      volume: expect.any(Number),
      openInterest: expect.any(Number),
      premium: expect.any(Number),
      sentiment: expect.stringMatching(/^(bullish|bearish|neutral)$/),
    });
  });

  it('fearGreedData has score 0-100 and 7 indicators', () => {
    const { fearGreedData } = useDerivativesData();
    expect(fearGreedData.score).toBeGreaterThanOrEqual(0);
    expect(fearGreedData.score).toBeLessThanOrEqual(100);
    expect(fearGreedData.indicators.length).toBe(7);
    fearGreedData.indicators.forEach(ind => {
      expect(ind).toMatchObject({
        name: expect.any(String),
        value: expect.any(Number),
        score: expect.any(Number),
        label: expect.any(String),
      });
    });
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useDerivativesData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
