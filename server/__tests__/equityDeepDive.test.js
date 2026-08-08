import { describe, it, expect } from 'vitest';
import { computeBeatRates } from '../routes/equityDeepDive.js';

const factorMeta = {
  AAPL: { name: 'Apple', sector: 'Technology' },
  MSFT: { name: 'Microsoft', sector: 'Technology' },
  JPM:  { name: 'JPMorgan', sector: 'Financials' },
};

const summary = (ticker, quarters) => ({
  ticker,
  earningsHistory: { history: quarters },
});

const q = (epsActual, epsEstimate, surprisePercent) => ({
  epsActual,
  epsEstimate,
  surprisePercent,
  period: '0q',
});

describe('computeBeatRates', () => {
  it('returns an array of { sector, beatCount, totalCount, beatRate } grouped by sector', () => {
    const summaries = [
      summary('AAPL', [q(1.5, 1.4, 7.1), q(1.3, 1.5, -13.3)]),
      summary('MSFT', [q(2.8, 2.6, 7.7)]),
      summary('JPM', [q(4.0, 3.9, 2.6)]),
    ];

    const rates = computeBeatRates(summaries, factorMeta);

    expect(rates).toEqual([
      { sector: 'Technology', beatCount: 2, totalCount: 3, beatRate: 66.7 },
      { sector: 'Financials', beatCount: 1, totalCount: 1, beatRate: 100 },
    ]);
  });

  it('treats a null surprisePercent as epsActual >= epsEstimate', () => {
    const summaries = [
      summary('AAPL', [q(1.5, 1.5, null), q(1.2, 1.5, null)]),
    ];

    const rates = computeBeatRates(summaries, factorMeta);

    expect(rates).toEqual([
      { sector: 'Technology', beatCount: 1, totalCount: 2, beatRate: 50 },
    ]);
  });

  it('skips quarters with missing epsActual/epsEstimate', () => {
    const summaries = [
      summary('AAPL', [q(1.5, 1.4, 7.1), q(null, 1.5, 0), q(1.2, null, 0)]),
    ];

    const rates = computeBeatRates(summaries, factorMeta);

    expect(rates).toEqual([
      { sector: 'Technology', beatCount: 1, totalCount: 1, beatRate: 100 },
    ]);
  });

  it('returns null when no qualifying quarters exist (honest empty)', () => {
    expect(computeBeatRates([summary('AAPL', [])], factorMeta)).toBeNull();
    expect(computeBeatRates([summary('AAPL', [q(null, null, null)])], factorMeta)).toBeNull();
    expect(computeBeatRates([], factorMeta)).toBeNull();
    expect(computeBeatRates(null, factorMeta)).toBeNull();
  });

  it('skips tickers with no sector meta', () => {
    const rates = computeBeatRates([summary('UNKNOWN', [q(1.0, 0.5, 100)])], factorMeta);
    expect(rates).toBeNull();
  });
});
