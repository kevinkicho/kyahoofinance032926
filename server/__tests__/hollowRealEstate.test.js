import { describe, it, expect } from 'vitest';
import { isStructurallyHollow } from '../lib/cache.js';

describe('isStructurallyHollow realEstate', () => {
  it('treats empty shell as hollow', () => {
    expect(isStructurallyHollow('realEstate', { lastUpdated: '2026-07-29', isLive: false })).toBe(true);
    expect(isStructurallyHollow('realEstate', { mortgageRates: {}, reitData: [] })).toBe(true);
  });

  it('accepts mortgage rates alone as enough for partial paint', () => {
    expect(isStructurallyHollow('realEstate', {
      mortgageRates: { rate30y: 6.5, rate15y: 5.9 },
    })).toBe(false);
  });

  it('accepts Case-Shiller national series', () => {
    expect(isStructurallyHollow('realEstate', {
      caseShillerData: {
        national: {
          values: [100, 101, 102, 103, 104],
          dates: ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05'],
        },
      },
    })).toBe(false);
  });
});
