import { describe, it, expect } from 'vitest';
import { groupFilingsByCompany } from '../../markets/equities/components/SecFilingActivityPanel.jsx';

describe('groupFilingsByCompany', () => {
  const rows = [
    { ticker: 'MSFT', form: '4', date: '2026-07-20', category: 'insider', description: 'Form 4' },
    { ticker: 'AAPL', form: '8-K', date: '2026-07-22', category: 'material', description: 'Item 2.02' },
    { ticker: 'AAPL', form: '10-Q', date: '2026-07-18', category: 'earnings', description: 'Quarterly' },
    { ticker: 'MSFT', form: '8-K', date: '2026-07-21', category: 'material', description: 'Event' },
    { ticker: 'NVDA', form: '4', date: '2026-07-10', category: 'insider', description: 'Insider' },
  ];

  it('groups list items under companies with counts', () => {
    const groups = groupFilingsByCompany(rows, { sortBy: 'ticker', sortDir: 'asc' });
    expect(groups.map((g) => g.ticker)).toEqual(['AAPL', 'MSFT', 'NVDA']);
    expect(groups.find((g) => g.ticker === 'AAPL').count).toBe(2);
    expect(groups.find((g) => g.ticker === 'MSFT').count).toBe(2);
    expect(groups.find((g) => g.ticker === 'NVDA').count).toBe(1);
  });

  it('sorts companies by latest filing date desc by default intent', () => {
    const groups = groupFilingsByCompany(rows, { sortBy: 'date', sortDir: 'desc' });
    expect(groups.map((g) => g.ticker)).toEqual(['AAPL', 'MSFT', 'NVDA']);
    expect(groups[0].latestDate).toBe('2026-07-22');
  });

  it('preserves filings under each company', () => {
    const groups = groupFilingsByCompany(rows, { sortBy: 'ticker', sortDir: 'asc' });
    const aapl = groups.find((g) => g.ticker === 'AAPL');
    expect(aapl.filings.map((f) => f.form).sort()).toEqual(['10-Q', '8-K']);
  });

  it('returns empty for empty input', () => {
    expect(groupFilingsByCompany([])).toEqual([]);
  });
});
