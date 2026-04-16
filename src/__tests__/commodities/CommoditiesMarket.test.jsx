import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommoditiesMarket from '../../markets/commodities/CommoditiesMarket';

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
    priceDashboardData: [
      {
        sector: 'Energy',
        commodities: [
          { ticker: 'CL=F', name: 'WTI Crude', price: 78.50, change1d: 1.2 },
        ],
      },
    ],
    fredCommodities: {
      goldHistory: { dates: ['2024-01', '2024-02'], values: [2000, 2050] },
    },
  },
};

describe('CommoditiesMarket', () => {
  it('renders dashboard with commodity prices panel', () => {
    render(<CommoditiesMarket centralData={mockCentralData} />);
    expect(screen.getByText('Commodity Prices')).toBeInTheDocument();
  });

  it('shows the WTI Crude commodity', () => {
    render(<CommoditiesMarket centralData={mockCentralData} />);
    const wtiElements = screen.getAllByText('WTI Crude');
    expect(wtiElements.length).toBeGreaterThan(0);
  });

  it('shows all panels visible at once (no tabs)', () => {
    render(<CommoditiesMarket centralData={mockCentralData} />);
    expect(screen.getByText('Sector Performance')).toBeInTheDocument();
    const tabButtons = screen.queryAllByRole('button');
    const tabNavButtons = tabButtons.filter(btn =>
      btn.className && btn.className.includes('tab') && btn.className.includes('com')
    );
    expect(tabNavButtons.length).toBe(0);
  });

  it('shows data footer when not live', () => {
    render(<CommoditiesMarket centralData={mockCentralData} />);
    const pendingBadges = screen.getAllByText('PENDING');
    expect(pendingBadges.length).toBeGreaterThan(0);
  });
});