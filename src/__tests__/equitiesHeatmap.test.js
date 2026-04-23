import { describe, it, expect } from 'vitest';
import { stockUniverseData } from '../data/stockUniverse';

describe('EquitiesMarket heatmap data structure', () => {
  it('stockUniverseData is a non-empty array', () => {
    expect(stockUniverseData).toBeDefined();
    expect(Array.isArray(stockUniverseData)).toBe(true);
    expect(stockUniverseData.length).toBeGreaterThan(0);
  });

  it('each region has required properties', () => {
    stockUniverseData.forEach(region => {
      expect(region).toHaveProperty('name');
      expect(region).toHaveProperty('children');
      expect(Array.isArray(region.children)).toBe(true);
    });
  });

  it('each stock has required properties', () => {
    stockUniverseData.forEach(region => {
      if (region.children.length === 0) return;
      region.children.forEach(stock => {
        expect(stock).toHaveProperty('name');
        expect(stock).toHaveProperty('sector');
        expect(stock).toHaveProperty('marketCap');
        expect(stock).toHaveProperty('value');
      });
    });
  });

  it('stocks have valid numeric fields', () => {
    stockUniverseData.forEach(region => {
      region.children.forEach(stock => {
        expect(typeof stock.marketCap).toBe('number');
        expect(typeof stock.value).toBe('number');
      });
    });
  });

  it('sectors are valid categories', () => {
    const validSectors = new Set([
      'Technology', 'Financials', 'Consumer', 'Healthcare',
      'Energy', 'Industrials', 'Crypto', 'Materials',
      'Utilities', 'Real Estate', 'Communication',
    ]);

    stockUniverseData.forEach(region => {
      region.children.forEach(stock => {
        expect(validSectors.has(stock.sector) || stock.sector).toBeTruthy();
      });
    });
  });
});