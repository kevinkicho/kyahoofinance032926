import { describe, it, expect } from 'vitest';
import { classifyFieldValue } from '../components/ProgressiveSlicePreview/ProgressiveSlicePreview.jsx';

describe('classifyFieldValue', () => {
  it('classifies quote maps as tables', () => {
    const v = classifyFieldValue('quotes', {
      AAPL: { price: 190, changePct: 1.2 },
      MSFT: { price: 420, changePct: -0.5 },
    });
    expect(v.mode).toBe('table');
    expect(v.columns).toContain('Ticker');
    expect(v.rows.length).toBe(2);
  });

  it('classifies rate maps as kpi-grid', () => {
    const v = classifyFieldValue('treasuryRates', { '10y': 4.25, '2y': 3.9, '3m': 5.1 });
    expect(v.mode).toBe('kpi-grid');
    expect(v.items.length).toBeGreaterThanOrEqual(3);
  });

  it('classifies numeric series', () => {
    const v = classifyFieldValue('history.values', [1, 2, 3, 4.5]);
    expect(v.mode).toBe('series');
    expect(v.latest).toMatch(/4/);
  });

  it('classifies plain numbers as kpi', () => {
    const v = classifyFieldValue('total', 42);
    expect(v.mode).toBe('kpi');
    expect(v.value).toBe('42');
  });
});
