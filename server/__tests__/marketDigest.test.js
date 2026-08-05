import { describe, it, expect } from 'vitest';
import { extractMarketDigest, fieldPresence, MAX_DIGEST_BYTES } from '../lib/marketDigest.js';

describe('extractMarketDigest', () => {
  it('keeps bonds digests tiny vs full history', () => {
    const data = {
      fetchedOn: '2026-08-04',
      isLive: true,
      treasuryRates: { '10y': 4.25, '2y': 3.9, fedFunds: 5.25 },
      yieldCurveData: { US: { '3m': 5.1, '2y': 3.9, '10y': 4.25, '30y': 4.5 } },
      tipsYields: { '10y': 1.8 },
      // Fat history should NOT appear in digest
      fredYieldHistory: {
        dates: Array.from({ length: 2000 }, (_, i) => `d${i}`),
        values: Array.from({ length: 2000 }, (_, i) => 4 + i * 0.001),
      },
    };
    const { digest, bytes, truncated } = extractMarketDigest('bonds', data);
    expect(digest.kind).toBe('bonds');
    expect(digest.treasuryRates['10y']).toBe(4.25);
    expect(digest.usCurve['10y']).toBe(4.25);
    expect(digest.fredYieldHistory).toBeUndefined();
    expect(bytes).toBeLessThan(MAX_DIGEST_BYTES);
    expect(truncated).toBe(false);
    expect(JSON.stringify(digest).length).toBeLessThan(8000);
  });

  it('samples equities quotes without full universe', () => {
    const quotes = {};
    for (let i = 0; i < 500; i++) {
      quotes[`T${i}`] = { price: 10 + i, changePct: 0.1, marketCap: 1e9 * i };
    }
    const { digest, bytes } = extractMarketDigest('equities', {
      quotes,
      indices: { '^GSPC': { price: 5000 } },
      fetchedOn: '2026-08-04',
    });
    expect(digest.kind).toBe('equities');
    expect(digest.quoteCount).toBe(500);
    expect(Object.keys(digest.sampleQuotes).length).toBeLessThanOrEqual(12);
    expect(bytes).toBeLessThan(MAX_DIGEST_BYTES);
  });

  it('fieldPresence counts hollow keys', () => {
    const p = fieldPresence({
      a: 1,
      b: null,
      c: [],
      d: { x: 1 },
      _skip: true,
      fetchedOn: '2026-08-04',
    });
    expect(p.total).toBe(4);
    expect(p.filled).toBe(2);
    expect(p.hollow).toEqual(expect.arrayContaining(['b', 'c']));
  });

  it('crypto top coins capped', () => {
    const coins = Array.from({ length: 40 }, (_, i) => ({
      id: `c${i}`,
      current_price: 100 + i,
      market_cap: 1e9,
    }));
    const { digest } = extractMarketDigest('crypto', { coinMarketData: coins });
    expect(digest.top.length).toBeLessThanOrEqual(8);
  });
});
