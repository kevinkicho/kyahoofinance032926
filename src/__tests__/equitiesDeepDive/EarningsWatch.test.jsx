import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EarningsWatch from '../../markets/equitiesDeepDive/components/EarningsWatch';
import { earningsData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

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
