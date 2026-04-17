import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FactorRankings from '../../markets/equitiesDeepDive/components/FactorRankings';
const factorData = {
  inFavor: { lowVol: 2.1, quality: -1.3, value: 0.8, momentum: 3.5 },
  stocks: [
    { ticker: 'NVDA', sector: 'Technology', value: 45, momentum: 92, quality: 78, lowVol: 30, composite: 61.25 },
    { ticker: 'AAPL', sector: 'Technology', value: 52, momentum: 68, quality: 85, lowVol: 72, composite: 69.25 },
    { ticker: 'MSFT', sector: 'Technology', value: 48, momentum: 75, quality: 82, lowVol: 65, composite: 67.5 },
  ],
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

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
