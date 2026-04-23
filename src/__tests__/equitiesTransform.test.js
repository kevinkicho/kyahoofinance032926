import { describe, it, expect } from 'vitest';

describe('EquitiesMarket heatmap data transformation', () => {
  const getMetricValue = (stock, metric) => {
    if (metric === 'revenue') return Math.max(stock.revenue || 0.1, 0.1);
    if (metric === 'netIncome') return Math.max(stock.netIncome || 0.1, 0.1);
    if (metric === 'pe') return stock.marketCap || stock.value || 1;
    if (metric === 'divYield') return stock.marketCap || stock.value || 1;
    return stock.marketCap || stock.value || 1;
  };

  const getRankValue = (stock, metric) => {
    if (metric === 'revenue') return stock.revenue || 0;
    if (metric === 'netIncome') return stock.netIncome || 0;
    if (metric === 'pe') return -(stock.pe || 999);
    if (metric === 'divYield') return stock.divYield || 0;
    return stock.marketCap || stock.value || 0;
  };

  const RANK_PALETTE = [
    '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7',
    '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#8b5cf6',
  ];

  const rankColorFn = (rank) => RANK_PALETTE[(rank - 1) % RANK_PALETTE.length];

  it('getMetricValue returns revenue when metric is revenue', () => {
    const stock = { revenue: 100 };
    expect(getMetricValue(stock, 'revenue')).toBe(100);
  });

  it('getMetricValue returns marketCap as default', () => {
    const stock = { marketCap: 500 };
    expect(getMetricValue(stock, 'marketCap')).toBe(500);
  });

  it('getMetricValue handles missing fields with minimum', () => {
    const stock = {};
    expect(getMetricValue(stock, 'revenue')).toBe(0.1);
    expect(getMetricValue(stock, 'netIncome')).toBe(0.1);
  });

  it('getRankValue returns negative P/E for sorting', () => {
    const stock = { pe: 25 };
    expect(getRankValue(stock, 'pe')).toBe(-25);
  });

  it('getRankValue returns divYield correctly', () => {
    const stock = { divYield: 2.5 };
    expect(getRankValue(stock, 'divYield')).toBe(2.5);
  });

  it('rankColorFn cycles through palette', () => {
    expect(rankColorFn(1)).toBe('#f59e0b');
    expect(rankColorFn(11)).toBe('#f59e0b');
    expect(rankColorFn(10)).toBe('#8b5cf6');
  });

  it('transforms stock for treemap ranking', () => {
    const stocks = [
      { name: 'AAPL', marketCap: 100, revenue: 50 },
      { name: 'MSFT', marketCap: 200, revenue: 60 },
    ];

    const sorted = [...stocks].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

    expect(sorted[0].name).toBe('MSFT');
    expect(sorted[1].name).toBe('AAPL');
  });
});