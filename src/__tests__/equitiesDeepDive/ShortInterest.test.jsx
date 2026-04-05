import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShortInterest from '../../markets/equitiesDeepDive/components/ShortInterest';
import { shortData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('ShortInterest', () => {
  it('renders panel title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getByText(/short interest/i)).toBeInTheDocument();
  });

  it('renders most shorted chart title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getByText(/most shorted/i)).toBeInTheDocument();
  });

  it('renders squeeze watch chart title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getByText(/squeeze watch/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null shortData gracefully', () => {
    expect(() => render(<ShortInterest shortData={null} />)).not.toThrow();
  });
});
