import { describe, it, expect } from 'vitest';
import { useBondsData } from '../../markets/bonds/data/useBondsData';

describe('useBondsData', () => {
  it('returns yieldCurveData with expected countries', () => {
    const { yieldCurveData } = useBondsData();
    expect(Object.keys(yieldCurveData)).toEqual(
      expect.arrayContaining(['US', 'DE', 'JP', 'GB'])
    );
  });

  it('each country has all 7 tenor keys', () => {
    const { yieldCurveData } = useBondsData();
    const tenors = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
    for (const country of Object.keys(yieldCurveData)) {
      expect(Object.keys(yieldCurveData[country])).toEqual(tenors);
    }
  });

  it('creditRatingsData has at least 10 entries with required fields', () => {
    const { creditRatingsData } = useBondsData();
    expect(creditRatingsData.length).toBeGreaterThanOrEqual(10);
    expect(creditRatingsData[0]).toMatchObject({
      country: expect.any(String),
      name: expect.any(String),
      sp: expect.any(String),
      moodys: expect.any(String),
      fitch: expect.any(String),
      region: expect.any(String),
    });
  });

  it('spreadData has parallel arrays of equal length', () => {
    const { spreadData } = useBondsData();
    const len = spreadData.dates.length;
    expect(len).toBeGreaterThan(0);
    expect(spreadData.IG.length).toBe(len);
    expect(spreadData.HY.length).toBe(len);
    expect(spreadData.EM.length).toBe(len);
  });

  it('durationLadderData percentages sum to ~100', () => {
    const { durationLadderData } = useBondsData();
    const total = durationLadderData.reduce((s, d) => s + d.pct, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useBondsData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
