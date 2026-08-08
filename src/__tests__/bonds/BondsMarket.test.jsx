import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BondsMarket from '../../markets/bonds/BondsMarket';
import DataContext from '../../hub/DataContext';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

function renderWithContext(ui, { getMarketExtra = {} } = {}) {
  const ctxValue = {
    getMarket: (id) => getMarketExtra[id] || { isLoading: false, isLive: false, data: {} },
    refetchSingle: vi.fn(),
  };
  return render(<DataContext.Provider value={ctxValue}>{ui}</DataContext.Provider>);
}

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
    // Sidebar headers: Yield Curve, Spreads, Credit Spreads (OAS), Breakevens.
    expect(screen.getAllByText('Yield Curve').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Spreads').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Breakevens').length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/WAITING|PENDING|NO DATA|STALE|FETCHED|LOADING|UNAVAIL/i).length).toBeGreaterThan(0);
  });

  it('renders exactly one 5s30s row with the real spreadHistory value', () => {
    const withSpreads = {
      ...mockCentralData,
      data: {
        ...mockCentralData.data,
        spreadIndicators: { t10y2y: 0.4, t10y3m: 0.8 },
        spreadHistory: {
          dates: ['2026-08-03'],
          t10y2y: [0.4],
          t10y3m: [0.8],
          t5y30y: [0.82],
          latest: { t10y2y: 0.4, t10y3m: 0.8, t5y30y: 0.82 },
        },
      },
    };
    render(<BondsMarket centralData={withSpreads} />);
    const rows = screen.getAllByText('5s30s');
    expect(rows.length).toBe(1);
    expect(screen.getByText('+0.82%')).toBeInTheDocument();
  });

  it('renders ON RRP hint in the fed panel when nyfed data is present', () => {
    const withFed = {
      ...mockCentralData,
      data: {
        ...mockCentralData.data,
        fedBalanceSheetHistory: { dates: ['2026-08-01'], values: [7.1] },
      },
    };
    renderWithContext(<BondsMarket centralData={withFed} />, {
      getMarketExtra: { nyfed: { isLoading: false, isLive: true, data: { rrp: [{ date: '2026-08-04', acceptedB: 2127 }] } } },
    });
    expect(screen.getByText(/ON RRP \$2127B/i)).toBeInTheDocument();
  });

  it('renders no RRP hint when nyfed rrp is empty', () => {
    const withFed = {
      ...mockCentralData,
      data: {
        ...mockCentralData.data,
        fedBalanceSheetHistory: { dates: ['2026-08-01'], values: [7.1] },
      },
    };
    renderWithContext(<BondsMarket centralData={withFed} />, {
      getMarketExtra: { nyfed: { isLoading: false, isLive: true, data: { rrp: [] } } },
    });
    expect(screen.queryByText(/ON RRP \$\d+B/i)).not.toBeInTheDocument();
  });
});