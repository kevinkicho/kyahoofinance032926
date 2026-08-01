/**
 * Chronic false-negatives: catalog wrappers with one dense child + null sibling
 * must count as filled (fundingData, returnsData, earningsData, …).
 */
import { describe, it, expect } from 'vitest';
import { placeholderValueOk, bagDensityOk } from '../../hub/lib/panelHealthUtils.js';

describe('bagDensityOk nested wrappers', () => {
  it('accepts fundingData-style { rates: dense, openInterestHistory: null }', () => {
    const fundingData = {
      rates: [
        { symbol: 'BTC', rate8h: 0.0001, rateAnnualized: 10.95, openInterestB: 18 },
        { symbol: 'ETH', rate8h: 0.00005, rateAnnualized: 5.5, openInterestB: 9 },
        { symbol: 'SOL', rate8h: 0.0002, rateAnnualized: 22, openInterestB: 3 },
      ],
      openInterestHistory: null,
    };
    expect(bagDensityOk(fundingData)).toBe(true);
    expect(placeholderValueOk(fundingData, 'fundingData')).toBe(true);
  });

  it('accepts returnsData-style { asOf, assets: dense }', () => {
    const returnsData = {
      asOf: '2026-07-31',
      assets: [
        { ticker: 'SPY', ret1d: 1.2, ret1w: 0.5, ret1m: 3.1 },
        { ticker: 'QQQ', ret1d: 0.8, ret1w: 0.2, ret1m: 2.0 },
        { ticker: 'IWM', ret1d: -0.1, ret1w: 0.4, ret1m: 1.5 },
        { ticker: 'EFA', ret1d: 0.3, ret1w: 0.1, ret1m: 0.9 },
      ],
    };
    expect(bagDensityOk(returnsData)).toBe(true);
    expect(placeholderValueOk(returnsData, 'returnsData')).toBe(true);
  });

  it('accepts earningsData-style { upcoming: dense, beatRates: null }', () => {
    const earningsData = {
      upcoming: [
        { ticker: 'CAT', epsEst: 6.2, epsPrev: 5.1 },
        { ticker: 'AAPL', epsEst: 1.5, epsPrev: 1.4 },
        { ticker: 'MSFT', epsEst: 2.8, epsPrev: 2.6 },
      ],
      beatRates: null,
    };
    expect(bagDensityOk(earningsData)).toBe(true);
    expect(placeholderValueOk(earningsData, 'earningsData')).toBe(true);
  });

  it('accepts foreclosureData nested series maps', () => {
    const foreclosureData = {
      foreclosures: {
        dates: ['2013-04', '2013-07', '2014-01'],
        values: [3.2, 3.1, 2.9, 2.7],
      },
      delinquencies: {
        dates: ['2013-04', '2013-07'],
        values: [5.1, 5.0],
      },
    };
    expect(bagDensityOk(foreclosureData)).toBe(true);
    expect(placeholderValueOk(foreclosureData, 'foreclosureData')).toBe(true);
  });

  it('still rejects sparse quote tables (1 filled of 20)', () => {
    const sparse = Array.from({ length: 20 }, (_, i) => (
      i === 0 ? { ticker: 'AAPL', price: 100 } : { ticker: `T${i}`, name: '', price: null }
    ));
    expect(placeholderValueOk(sparse, 'quotes')).toBe(false);
  });

  it('accepts optionsExpiry event rows without numbers', () => {
    const optionsExpiry = [
      { date: '2026-08-21', type: 'Monthly Options Expiry (3rd Friday)' },
      { date: '2026-09-18', type: 'Monthly Options Expiry (3rd Friday)' },
    ];
    expect(placeholderValueOk(optionsExpiry, 'optionsExpiry')).toBe(true);
  });

  it('accepts empty alerts feed as healthy All Clear', () => {
    expect(placeholderValueOk([], 'alerts')).toBe(true);
  });

  it('accepts alert rules metadata arrays', () => {
    const rules = [
      { id: 'r1', name: 'VIX spike', severity: 'high', enabled: true },
      { id: 'r2', name: 'HY OAS', severity: 'med', enabled: true },
    ];
    expect(placeholderValueOk(rules, 'rules')).toBe(true);
  });
});
