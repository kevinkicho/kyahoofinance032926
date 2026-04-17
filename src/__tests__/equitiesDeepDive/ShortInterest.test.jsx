import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShortInterest from '../../markets/equitiesDeepDive/components/ShortInterest';
const shortData = {
  mostShorted: [
    { ticker: 'GME', shortFloat: 22.5, daysToCover: 3.2, perf1w: 8.5, marketCapB: 6.5 },
    { ticker: 'AMC', shortFloat: 18.1, daysToCover: 2.8, perf1w: -3.2, marketCapB: 3.2 },
    { ticker: 'BBBY', shortFloat: 15.3, daysToCover: 1.5, perf1w: 2.1, marketCapB: 0.8 },
    { ticker: 'SOFI', shortFloat: 12.8, daysToCover: 1.9, perf1w: -1.5, marketCapB: 8.5 },
    { ticker: 'OPEN', shortFloat: 11.2, daysToCover: 2.1, perf1w: 0.5, marketCapB: 1.5 },
  ],
};

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

describe('ShortInterest', () => {
  it('renders panel title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getByText(/short interest/i)).toBeInTheDocument();
  });

  it('renders most shorted chart title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getAllByText(/most shorted/i).length).toBeGreaterThanOrEqual(1);
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
