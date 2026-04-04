import { describe, it, expect } from 'vitest';
import { exchangeRates, REGION_SUFFIX, currencySymbols } from '../utils/constants.js';

describe('exchangeRates', () => {
  it('USD rate is exactly 1', () => {
    expect(exchangeRates.USD).toBe(1.0);
  });

  it('all rates are positive finite numbers', () => {
    for (const [currency, rate] of Object.entries(exchangeRates)) {
      expect(typeof rate, `${currency} rate is not a number`).toBe('number');
      expect(isFinite(rate), `${currency} rate is not finite`).toBe(true);
      expect(rate, `${currency} rate is not positive`).toBeGreaterThan(0);
    }
  });

  it('contains major world currencies', () => {
    const major = ['EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF'];
    for (const c of major) {
      expect(exchangeRates).toHaveProperty(c);
    }
  });

  it('JPY rate is significantly greater than 1 (weak currency)', () => {
    expect(exchangeRates.JPY).toBeGreaterThan(100);
  });

  it('KWD rate is less than 1 (strong currency)', () => {
    expect(exchangeRates.KWD).toBeLessThan(1);
  });
});

describe('REGION_SUFFIX', () => {
  it('all values are strings', () => {
    for (const [region, suffix] of Object.entries(REGION_SUFFIX)) {
      expect(typeof suffix, `${region} suffix is not a string`).toBe('string');
    }
  });

  it('Crypto exchange suffix is empty string', () => {
    expect(REGION_SUFFIX['Crypto']).toBe('');
  });

  it('contains major exchanges', () => {
    expect(REGION_SUFFIX).toHaveProperty('Japan Exchange');
    expect(REGION_SUFFIX).toHaveProperty('LSE (UK)');
    expect(REGION_SUFFIX).toHaveProperty('TSX (Canada)');
    expect(REGION_SUFFIX).toHaveProperty('NSE (India)');
  });

  it('no suffix values are null or undefined', () => {
    for (const [region, suffix] of Object.entries(REGION_SUFFIX)) {
      expect(suffix, `${region} has null/undefined suffix`).not.toBeNull();
      expect(suffix, `${region} has null/undefined suffix`).not.toBeUndefined();
    }
  });
});

describe('currencySymbols', () => {
  it('USD symbol is $', () => {
    expect(currencySymbols.USD).toBe('$');
  });

  it('EUR symbol is €', () => {
    expect(currencySymbols.EUR).toBe('€');
  });

  it('all values are non-empty strings', () => {
    for (const [currency, symbol] of Object.entries(currencySymbols)) {
      expect(typeof symbol, `${currency} symbol is not a string`).toBe('string');
      expect(symbol.length, `${currency} symbol is empty`).toBeGreaterThan(0);
    }
  });

  it('covers all currencies in exchangeRates', () => {
    for (const currency of Object.keys(exchangeRates)) {
      expect(currencySymbols, `${currency} missing from currencySymbols`).toHaveProperty(currency);
    }
  });
});
