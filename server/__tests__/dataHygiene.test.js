import { describe, it, expect } from 'vitest';
import {
  omitNullFields,
  filterRowsWithData,
  sanitizeMarketPayload,
  computeIsLive,
  isHollowField,
} from '../lib/dataHygiene.js';

describe('dataHygiene', () => {
  it('omitNullFields drops null/undefined/empty string', () => {
    expect(omitNullFields({ a: 1, b: null, c: '', d: 0, e: false })).toEqual({
      a: 1,
      d: 0,
      e: false,
    });
  });

  it('filterRowsWithData keeps rows with required fields', () => {
    const rows = [
      { name: 'A', value: 1 },
      { name: 'B', value: null },
      { name: 'C' },
    ];
    expect(filterRowsWithData(rows, ['value'])).toEqual([{ name: 'A', value: 1 }]);
  });

  it('sanitizeMarketPayload strips null credit loan shells', () => {
    const clean = sanitizeMarketPayload({
      loanData: {
        cloTranches: [{ tranche: 'AAA', spread: 120 }, { tranche: 'B', spread: null, yield: null }],
        indices: [
          { name: 'BKLN NAV', value: 20.1 },
          { name: 'CS Lev Loan 100 Index', value: null, change1d: null, spread: null },
        ],
      },
      defaultData: {
        rates: [
          { category: 'C&I', value: 1.4 },
          { category: 'Fake', value: null },
        ],
      },
    });
    expect(clean.loanData.indices).toHaveLength(1);
    expect(clean.loanData.indices[0].name).toBe('BKLN NAV');
    expect(clean.loanData.cloTranches).toHaveLength(1);
    expect(clean.defaultData.rates).toHaveLength(1);
  });

  it('sanitizeMarketPayload strips null F&G indicators and risk flats', () => {
    const clean = sanitizeMarketPayload({
      fearGreedData: {
        score: 55,
        indicators: [
          { name: 'VIX', value: 18 },
          { name: 'Empty', value: null, percentile: null },
        ],
      },
      riskData: {
        overallScore: 50,
        vix: 18,
        hyOas: null,
        signals: [{ name: 'VIX', value: 18 }, { name: 'Bad', value: null }],
      },
    });
    expect(clean.fearGreedData.indicators).toHaveLength(1);
    expect(clean.riskData.hyOas).toBeUndefined();
    expect(clean.riskData.vix).toBe(18);
    expect(clean.riskData.signals).toHaveLength(1);
  });

  it('sanitizeMarketPayload filters banks without rates', () => {
    const clean = sanitizeMarketPayload({
      centralBanks: [
        { bank: 'Fed', rate: 4.5 },
        { bank: 'Ghost', rate: null },
      ],
    });
    expect(clean.centralBanks).toHaveLength(1);
    expect(clean.centralBanks[0].bank).toBe('Fed');
  });

  it('computeIsLive / isHollowField detect empty shells', () => {
    expect(isHollowField([])).toBe(true);
    expect(isHollowField([{ value: null }, { value: null }])).toBe(true);
    expect(isHollowField([{ value: 12 }])).toBe(false);
    expect(computeIsLive({ loanData: null, defaultData: { rates: [{ value: 1 }] } }, ['loanData', 'defaultData'])).toBe(true);
    expect(computeIsLive({ loanData: null }, ['loanData'])).toBe(false);
  });
});
