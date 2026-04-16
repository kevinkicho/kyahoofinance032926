import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsuranceMarket from '../../markets/insurance/InsuranceMarket';

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
    combinedRatioData: {
      industry: 98.5,
      byLine: [
        { line: 'Property', ratio: 95.2 },
        { line: 'Casualty', ratio: 101.3 },
      ],
    },
    fredHyOasHistory: {
      dates: ['2024-01', '2024-02', '2024-03'],
      values: [350, 340, 330],
    },
  },
};

describe('InsuranceMarket', () => {
  it('renders unified dashboard with Key Metrics panel', () => {
    render(<InsuranceMarket centralData={mockCentralData} />);
    expect(screen.getByText('Key Metrics')).toBeInTheDocument();
  });

  it('shows Combined Ratio section', () => {
    render(<InsuranceMarket centralData={mockCentralData} />);
    expect(screen.getByText('Combined Ratio')).toBeInTheDocument();
  });

  it('shows HY OAS Spread chart', () => {
    render(<InsuranceMarket centralData={mockCentralData} />);
    expect(screen.getByText('HY OAS Spread')).toBeInTheDocument();
  });

  it('shows data footer when not live', () => {
    render(<InsuranceMarket centralData={mockCentralData} />);
    const pendingBadges = screen.getAllByText('PENDING');
    expect(pendingBadges.length).toBeGreaterThan(0);
  });
});