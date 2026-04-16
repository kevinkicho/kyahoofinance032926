import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DerivativesMarket from '../../markets/derivatives/DerivativesMarket';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

const mockCentralData = {
  isLoading: false,
  isLive: false,
  isCurrent: false,
  lastUpdated: null,
  fetchedOn: null,
  error: null,
  fetchLog: [],
  provenance: {},
  refetch: () => {},
  data: {
    vixTermStructure: {
      dates: ['Spot', '1M', '2M', '3M'],
      values: [18.5, 19.2, 19.8, 20.1],
      prevValues: [17.8, 18.9, 19.5, 19.9],
    },
  },
};

describe('DerivativesMarket', () => {
  it('renders unified dashboard with status bar', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getByText(/No data received/i)).toBeInTheDocument();
  });

  it('shows Key Metrics sidebar', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
  });

  it('shows VIX Term Structure section', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getByText('VIX Term Structure')).toBeInTheDocument();
  });

  it('shows no data received status when not live', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getByText(/No data received/i)).toBeInTheDocument();
  });
});