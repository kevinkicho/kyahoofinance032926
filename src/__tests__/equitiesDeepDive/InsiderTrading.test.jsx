import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsiderTrading from '../../markets/equitiesDeepDive/components/InsiderTrading';

const insiderData = {
  holders: [
    { name: 'Cook', ticker: 'AAPL', shares: 3200000 },
    { name: 'Iger', ticker: 'DIS', shares: 900000 },
  ],
  transactions: [
    { ticker: 'AAPL', name: 'Cook', type: 'Purchase', shares: 1200, value: 240000, date: '2026-01-12' },
    { ticker: 'DIS', name: 'Iger', type: 'Sale', shares: 400, value: 45000, date: '2026-01-08' },
  ],
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('InsiderTrading', () => {
  it('renders insider KPIs from real rows', () => {
    render(<InsiderTrading insiderData={insiderData} />);
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
  });

  it('handles null insiderData gracefully', () => {
    expect(() => render(<InsiderTrading insiderData={null} />)).not.toThrow();
  });

  it('handles leftover isLive holder / transaction bags without remount-crashing', () => {
    expect(() => render(<InsiderTrading insiderData={{ isLive: true }} />)).not.toThrow();
    expect(() => render(<InsiderTrading insiderData={{ holders: { isLive: true } }} />)).not.toThrow();
    expect(() => render(<InsiderTrading insiderData={{ transactions: { isLive: true } }} />)).not.toThrow();
    expect(() => render(<InsiderTrading insiderData={{ holders: true, transactions: { isLive: true } }} />)).not.toThrow();
  });
});
