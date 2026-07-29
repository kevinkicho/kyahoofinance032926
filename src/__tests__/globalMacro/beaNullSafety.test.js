/**
 * Regression: BEA partial payloads set gdpComponents/personalIncome/savingRate
 * to null (not undefined). Default-parameter `rows = []` does NOT apply to null,
 * so `.find` on null crashed Global Macro.
 */
import { describe, it, expect } from 'vitest';

function latestByDesc(rows, match) {
  if (!Array.isArray(rows) || !match) return null;
  return rows.find((r) => (r.desc || '').toLowerCase().includes(match)) || null;
}

function buildBeaSummary(beaData) {
  return {
    gdp: latestByDesc(beaData?.gdpComponents, 'gross domestic product'),
    consumption: latestByDesc(beaData?.gdpComponents, 'personal consumption'),
    investment: latestByDesc(beaData?.gdpComponents, 'gross private domestic investment'),
    income: latestByDesc(beaData?.personalIncome, 'personal income'),
    saving: latestByDesc(beaData?.savingRate, 'personal saving as a percentage'),
  };
}

describe('BEA null-safe summary helpers', () => {
  it('does not throw when all BEA arrays are null', () => {
    expect(() => buildBeaSummary({
      gdpComponents: null,
      personalIncome: null,
      savingRate: null,
    })).not.toThrow();
    const s = buildBeaSummary({
      gdpComponents: null,
      personalIncome: null,
      savingRate: null,
    });
    expect(s.gdp).toBeNull();
    expect(s.saving).toBeNull();
  });

  it('finds GDP row when components present', () => {
    const s = buildBeaSummary({
      gdpComponents: [
        { desc: 'Gross domestic product', value: 2.1 },
        { desc: 'Personal consumption expenditures', value: 1.8 },
      ],
      personalIncome: null,
      savingRate: [{ desc: 'Personal saving as a percentage of disposable personal income', value: 4.2 }],
    });
    expect(s.gdp?.value).toBe(2.1);
    expect(s.consumption?.value).toBe(1.8);
    expect(s.saving?.value).toBe(4.2);
  });
});
