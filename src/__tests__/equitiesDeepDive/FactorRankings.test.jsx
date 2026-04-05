import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FactorRankings from '../../markets/equitiesDeepDive/components/FactorRankings';
import { factorData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('FactorRankings', () => {
  it('renders panel title', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getByText(/factor rankings/i)).toBeInTheDocument();
  });

  it('renders factor in favor chart title', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getByText(/factor in favor/i)).toBeInTheDocument();
  });

  it('renders stock factor scores table title', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getByText(/stock factor scores/i)).toBeInTheDocument();
  });

  it('renders 1 echarts instance', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(1);
  });

  it('handles null factorData gracefully', () => {
    expect(() => render(<FactorRankings factorData={null} />)).not.toThrow();
  });
});
