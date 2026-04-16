import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VIXTermStructure from '../../markets/derivatives/components/VIXTermStructure';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

const mockVixTS = {
  dates:      ['9D', '1M', '3M', '6M'],
  values:     [14.2, 16.8, 18.5, 20.1],
  prevValues: [13.9, 16.2, 17.9, 19.6],
};

const mockEnrichment = {
  vvix: 92.4,
  vixPercentile: 28,
};

describe('VIXTermStructure', () => {
  it('renders panel title', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={null} />);
    expect(screen.getByText('VIX Term Structure')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={null} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders VVIX value when enrichment provided', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={mockEnrichment} />);
    expect(screen.getByText(/VVIX/i)).toBeInTheDocument();
    expect(screen.getByText(/92\.4/)).toBeInTheDocument();
  });

  it('renders VIX percentile when enrichment provided', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={mockEnrichment} />);
    expect(screen.getByText(/Percentile/i)).toBeInTheDocument();
    expect(screen.getByText(/28/)).toBeInTheDocument();
  });

  it('renders without enrichment (null is acceptable)', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={null} />);
    expect(screen.queryByText(/VVIX/i)).not.toBeInTheDocument();
  });
});
