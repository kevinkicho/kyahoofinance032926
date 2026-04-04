import { describe, it, expect } from 'vitest';
import { useRealEstateData } from '../../markets/realEstate/data/useRealEstateData';

describe('useRealEstateData', () => {
  it('returns priceIndexData with expected markets', () => {
    const { priceIndexData } = useRealEstateData();
    expect(Object.keys(priceIndexData)).toEqual(
      expect.arrayContaining(['US', 'UK', 'DE', 'AU'])
    );
  });

  it('each market has matching dates and values arrays', () => {
    const { priceIndexData } = useRealEstateData();
    for (const market of Object.keys(priceIndexData)) {
      const { dates, values } = priceIndexData[market];
      expect(dates.length).toBeGreaterThan(0);
      expect(values.length).toBe(dates.length);
    }
  });

  it('reitData has at least 8 entries with required fields', () => {
    const { reitData } = useRealEstateData();
    expect(reitData.length).toBeGreaterThanOrEqual(8);
    expect(reitData[0]).toMatchObject({
      ticker: expect.any(String),
      name: expect.any(String),
      sector: expect.any(String),
      dividendYield: expect.any(Number),
      pFFO: expect.any(Number),
      ytdReturn: expect.any(Number),
      marketCap: expect.any(Number),
    });
  });

  it('affordabilityData has required fields per market', () => {
    const { affordabilityData } = useRealEstateData();
    expect(affordabilityData.length).toBeGreaterThan(0);
    expect(affordabilityData[0]).toMatchObject({
      city: expect.any(String),
      country: expect.any(String),
      priceToIncome: expect.any(Number),
      mortgageToIncome: expect.any(Number),
      medianPrice: expect.any(Number),
      yoyChange: expect.any(Number),
    });
  });

  it('capRateData has dates array and at least 3 property types', () => {
    const { capRateData } = useRealEstateData();
    expect(capRateData.dates.length).toBeGreaterThan(0);
    const types = Object.keys(capRateData).filter(k => k !== 'dates');
    expect(types.length).toBeGreaterThanOrEqual(3);
    types.forEach(t => {
      expect(capRateData[t].length).toBe(capRateData.dates.length);
    });
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useRealEstateData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
