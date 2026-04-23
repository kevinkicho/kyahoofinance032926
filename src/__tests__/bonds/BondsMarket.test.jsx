import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BondsMarket from '../../markets/bonds/BondsMarket';

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
    yieldCurveData: {
      US: { '3m': 5.10, '6m': 4.95, '1y': 4.70, '2y': 4.45, '5y': 4.20, '10y': 4.05, '30y': 4.25 },
    },
  },
};

describe('BondsMarket', () => {
  it('renders unified dashboard after loading', () => {
    render(<BondsMarket centralData={mockCentralData} />);
    const yieldCurveElements = screen.getAllByText(/Yield Curve/i);
    expect(yieldCurveElements.length).toBeGreaterThan(0);
  });

  it('shows sidebar with key metrics', () => {
    render(<BondsMarket centralData={mockCentralData} />);
    const yieldsSection = screen.getByText('Yields');
    expect(yieldsSection).toBeInTheDocument();
  });

  it('shows all charts visible at once (no tabs)', () => {
    render(<BondsMarket centralData={mockCentralData} />);
    const yieldCurveElements = screen.getAllByText('Yield Curve');
    expect(yieldCurveElements.length).toBeGreaterThan(0);
    const tabButtons = screen.queryAllByRole('button');
    const tabNavButtons = tabButtons.filter(btn =>
      btn.className && btn.className.includes('tab') && btn.className.includes('bonds')
    );
    expect(tabNavButtons.length).toBe(0);
  });

  it('shows status when server unavailable', () => {
    render(<BondsMarket centralData={mockCentralData} />);
    expect(screen.getAllByText(/PENDING|NO DATA/i).length).toBeGreaterThan(0);
  });
});