import { describe, it, expect } from 'vitest';
import { getExtendedDetails } from '../utils/dataHelpers.js';
import { exchangeRates } from '../utils/constants.js';

const mockTicker = {
  ticker: 'AAPL',
  regionCurrency: 'USD',
  regionSymbol: '$',
  value: '3000',
  perf: '+1.5%',
};

describe('getExtendedDetails', () => {
  it('returns null for null/undefined input', () => {
    expect(getExtendedDetails(null)).toBeNull();
    expect(getExtendedDetails(undefined)).toBeNull();
  });

  it('returns an object with all expected keys', () => {
    const result = getExtendedDetails(mockTicker);
    const expectedKeys = [
      'price', 'changeAmt', 'changePct', 'prevClose', 'open',
      'bid', 'ask', 'dayRange', 'wk52Range', 'volume', 'avgVol',
      'marketCapGlobal', 'marketCapNative', 'beta', 'pe', 'eps',
      'earningsDate', 'dividend',
    ];
    for (const key of expectedKeys) {
      expect(result, `missing key: ${key}`).toHaveProperty(key);
    }
  });

  it('is deterministic — same ticker gives same result', () => {
    const a = getExtendedDetails(mockTicker);
    const b = getExtendedDetails({ ...mockTicker });
    expect(a).toEqual(b);
  });

  it('different tickers produce different prices', () => {
    const msft = getExtendedDetails({ ...mockTicker, ticker: 'MSFT' });
    const aapl = getExtendedDetails(mockTicker);
    expect(msft.price).not.toBe(aapl.price);
  });

  it('marketCapGlobal includes the USD value from tickerInfo', () => {
    const result = getExtendedDetails(mockTicker);
    expect(result.marketCapGlobal).toContain('3,000');
    expect(result.marketCapGlobal).toContain('(USD)');
  });

  it('applies currency conversion — JPY price is ~151x USD price numerically', () => {
    const jpyTicker = { ...mockTicker, regionCurrency: 'JPY', regionSymbol: '¥' };
    const usdResult = getExtendedDetails(mockTicker);
    const jpyResult = getExtendedDetails(jpyTicker);

    // Strip symbol and commas to parse numeric values
    const parsePrice = (str) => parseFloat(str.replace(/[^0-9.]/g, ''));
    const usdNum = parsePrice(usdResult.price);
    const jpyNum = parsePrice(jpyResult.price);

    const ratio = jpyNum / usdNum;
    const expectedRate = exchangeRates.JPY; // ~151.3
    expect(ratio).toBeCloseTo(expectedRate, 0);
  });

  it('changePct sign matches perf field', () => {
    const upTicker = { ...mockTicker, perf: '+2%' };
    const downTicker = { ...mockTicker, perf: '-2%' };
    expect(getExtendedDetails(upTicker).changePct).toMatch(/^\+/);
    expect(getExtendedDetails(downTicker).changePct).toMatch(/^-/);
  });

  it('falls back to static exchangeRates when no rates provided', () => {
    const result = getExtendedDetails(mockTicker);
    expect(result).not.toBeNull();
  });

  it('uses provided rates override instead of static constants', () => {
    const customRates = { ...exchangeRates, USD: 2 }; // artificially doubled
    const normal = getExtendedDetails(mockTicker);
    const boosted = getExtendedDetails(mockTicker, customRates);
    const parsePrice = (str) => parseFloat(str.replace(/[^0-9.]/g, ''));
    expect(parsePrice(boosted.price)).toBeCloseTo(parsePrice(normal.price) * 2, 0);
  });
});
