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
    expect(screen.getByText(/No data received/i)).toBeInTheDocument();
  });

  it('shows sidebar with Home Prices section', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    expect(screen.getByText('Home Prices')).toBeInTheDocument();
  });

  it('shows Case-Shiller in sidebar', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    expect(screen.getByText('Case-Shiller')).toBeInTheDocument();
  });

  it('shows Case-Shiller Index chart panel', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    expect(screen.getByText('Case-Shiller Index')).toBeInTheDocument();
  });

  it('shows no data received status when not live', () => {
    render(<RealEstateMarket centralData={mockCentralData} />);
    expect(screen.getByText(/No data received/i)).toBeInTheDocument();
  });
});