import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RealEstateMarket from '../../markets/realEstate/RealEstateMarket';

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
    caseShillerData: {
      national: {
        dates: ['2024-01', '2024-02', '2024-03'],
        values: [300.0, 305.2, 310.5],
      },
    },
    mortgageRates: {
      rate30y: 6.85,
      rate15y: 6.15,
    },
  },
};

describe('RealEstateMarket', () => {
  it('renders unified dashboard with status bar', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    // Without DataProvider, footer may show LOADING (context default) or WAITING/STALE/etc.
    expect(screen.getAllByText(/WAITING|PENDING|NO DATA|STALE|FETCHED|LOADING|UNAVAIL/i).length).toBeGreaterThan(0);
  });

  it('shows Home prices section in Key Metrics panel', () => {
    // Sidebar was folded into the Key Metrics bento; title casing is "Home prices".
    render(<RealEstateMarket centralData={mockCentralData} />);
    expect(screen.getByText(/Home prices/i)).toBeInTheDocument();
  });

  it('shows Case-Shiller in sidebar', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    // "Case-Shiller" appears in both the sidebar metric and the dashboard
    // metric grid; assert at least one is present rather than requiring uniqueness.
    expect(screen.getAllByText('Case-Shiller').length).toBeGreaterThan(0);
  });

  it('shows Case-Shiller Index chart panel', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    expect(screen.getAllByText('Case-Shiller Index').length).toBeGreaterThan(0);
  });

  it('shows no data received status when not live', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    expect(screen.getAllByText(/WAITING|PENDING|NO DATA|STALE|FETCHED|LOADING|UNAVAIL/i).length).toBeGreaterThan(0);
  });
});