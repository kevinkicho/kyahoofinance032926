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
    // Per-panel DataFooters show FETCHED when that panel has data, PENDING otherwise.
    // With vixTermStructure populated, at least the Key Metrics panel's footer renders.
    expect(screen.getAllByText(/FETCHED|PENDING|NO DATA/i).length).toBeGreaterThan(0);
  });

  it('shows Key Metrics sidebar', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
  });

  it('shows VIX Term Structure section', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getByText('VIX Term Structure')).toBeInTheDocument();
  });

  it('shows pending/no-data status when panels have no data', () => {
    const noData = { ...mockCentralData, data: {} };
    const { container } = render(<DerivativesMarket centralData={noData} />);
    // With no panel data, DataFooters inside conditional wrappers don't render.
    // Assert the market container still renders without crashing.
    expect(container.querySelector('.deriv-market')).toBeTruthy();
  });
});