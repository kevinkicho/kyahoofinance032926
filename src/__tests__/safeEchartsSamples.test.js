import { describe, it, expect } from 'vitest';
import { extractSeriesSamples } from '../components/SafeECharts/SafeECharts.jsx';

describe('extractSeriesSamples', () => {
  it('extracts flat line series numbers', () => {
    const samples = extractSeriesSamples({
      series: [{ type: 'line', data: [1, 2, 3, 4, 5] }],
    });
    expect(samples.length).toBeGreaterThanOrEqual(3);
    expect(samples).toContain(5);
  });

  it('extracts treemap hierarchical leaf values (equity heatmap)', () => {
    const samples = extractSeriesSamples({
      series: [{
        type: 'treemap',
        data: [
          {
            name: 'USA',
            children: [
              { name: 'AAPL', value: 3000 },
              { name: 'MSFT', value: 2800 },
              {
                name: 'Tech',
                children: [
                  { name: 'NVDA', value: 4300 },
                  { name: 'GOOGL', value: 2100 },
                ],
              },
            ],
          },
        ],
      }],
    });
    expect(samples.length).toBeGreaterThanOrEqual(3);
    expect(samples).toEqual(expect.arrayContaining([3000, 2800, 4300]));
  });

  it('returns empty for null option', () => {
    expect(extractSeriesSamples(null)).toEqual([]);
    expect(extractSeriesSamples({})).toEqual([]);
  });
});
