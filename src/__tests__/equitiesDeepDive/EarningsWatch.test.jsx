import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EarningsWatch from '../../markets/equitiesDeepDive/components/EarningsWatch';
const earningsData = {
  upcoming: [
    { ticker: 'AAPL', name: 'Apple Inc', date: '2024-04-25', epsEst: 1.52, epsPrev: 1.36 },
    { ticker: 'MSFT', name: 'Microsoft', date: '2024-04-22', epsEst: 2.83, epsPrev: 2.45 },
    { ticker: 'GOOGL', name: 'Alphabet', date: '2024-04-25', epsEst: 1.51, epsPrev: 1.17 },
  ],
  beatRates: [
    { sector: 'Technology', beatRate: 78, beatCount: 28, totalCount: 36 },
    { sector: 'Healthcare', beatRate: 65, beatCount: 20, totalCount: 31 },
    { sector: 'Financials', beatRate: 52, beatCount: 13, totalCount: 25 },
  ],
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('EarningsWatch', () => {
  it('renders panel title', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getByText(/earnings watch/i)).toBeInTheDocument();
  });

  it('renders upcoming earnings table title', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getByText(/upcoming earnings/i)).toBeInTheDocument();
  });

  it('renders sector beat rate chart title', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getByText(/sector beat rate/i)).toBeInTheDocument();
  });

  it('renders 1 echarts instance', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(1);
  });

  it('handles null earningsData gracefully', () => {
    expect(() => render(<EarningsWatch earningsData={null} />)).not.toThrow();
  });
});
