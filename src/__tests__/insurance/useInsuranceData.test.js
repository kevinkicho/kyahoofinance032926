import { describe, it, expect } from 'vitest';
import { useInsuranceData } from '../../markets/insurance/data/useInsuranceData';

describe('useInsuranceData', () => {
  it('returns catBondSpreads array with required fields', () => {
    const { catBondSpreads } = useInsuranceData();
    expect(Array.isArray(catBondSpreads)).toBe(true);
    expect(catBondSpreads.length).toBeGreaterThanOrEqual(8);
    expect(catBondSpreads[0]).toMatchObject({
      name:         expect.any(String),
      peril:        expect.any(String),
      sponsor:      expect.any(String),
      spread:       expect.any(Number),
      rating:       expect.any(String),
      trigger:      expect.any(String),
      maturity:     expect.any(String),
      notional:     expect.any(Number),
      expectedLoss: expect.any(Number),
    });
  });

  it('returns combinedRatioData with quarters and lines', () => {
    const { combinedRatioData } = useInsuranceData();
    expect(Array.isArray(combinedRatioData.quarters)).toBe(true);
    expect(combinedRatioData.quarters.length).toBeGreaterThan(0);
    expect(typeof combinedRatioData.lines).toBe('object');
    const lineNames = Object.keys(combinedRatioData.lines);
    expect(lineNames.length).toBeGreaterThanOrEqual(4);
    lineNames.forEach(k => {
      expect(combinedRatioData.lines[k].length).toBe(combinedRatioData.quarters.length);
    });
  });

  it('returns reserveAdequacyData with lines, reserves, required, adequacy arrays of equal length', () => {
    const { reserveAdequacyData } = useInsuranceData();
    const len = reserveAdequacyData.lines.length;
    expect(len).toBeGreaterThanOrEqual(5);
    expect(reserveAdequacyData.reserves.length).toBe(len);
    expect(reserveAdequacyData.required.length).toBe(len);
    expect(reserveAdequacyData.adequacy.length).toBe(len);
  });

  it('returns reinsurancePricing array with required fields', () => {
    const { reinsurancePricing } = useInsuranceData();
    expect(Array.isArray(reinsurancePricing)).toBe(true);
    expect(reinsurancePricing.length).toBeGreaterThanOrEqual(8);
    expect(reinsurancePricing[0]).toMatchObject({
      peril:       expect.any(String),
      layer:       expect.any(String),
      rol:         expect.any(Number),
      rolChange:   expect.any(Number),
      rpl:         expect.any(Number),
      rplChange:   expect.any(Number),
      capacity:    expect.stringMatching(/^(Ample|Adequate|Tight|Very Tight)$/),
      renewalDate: expect.any(String),
    });
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useInsuranceData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
