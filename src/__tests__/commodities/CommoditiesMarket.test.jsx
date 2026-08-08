import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CommoditiesMarket from '../../markets/commodities/CommoditiesMarket';
import DataContext from '../../hub/DataContext';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

function renderWithContext(ui, { usda = {}, getMarketExtra = {} } = {}) {
  const ctxValue = {
    getMarket: (id) => {
      if (id === 'usda') return { data: usda, isLoading: false, isLive: false, error: null };
      return getMarketExtra[id] || { isLoading: false, isLive: false, data: {} };
    },
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
    expect(screen.getAllByText('Commodity Prices').length).toBeGreaterThan(0);
  });

  it('shows the WTI Crude commodity', () => {
    render(<CommoditiesMarket centralData={mockCentralData} />);
    const wtiElements = screen.getAllByText('WTI Crude');
    expect(wtiElements.length).toBeGreaterThan(0);
  });

  it('shows all panels visible at once (no tabs)', () => {
    render(<CommoditiesMarket centralData={mockCentralData} />);
    expect(screen.getAllByText('Sector Performance').length).toBeGreaterThan(0);
    const tabButtons = screen.queryAllByRole('button');
    const tabNavButtons = tabButtons.filter(btn =>
      btn.className && btn.className.includes('tab') && btn.className.includes('com')
    );
    expect(tabNavButtons.length).toBe(0);
  });

  it('shows data footer when not live', () => {
    render(<CommoditiesMarket centralData={mockCentralData} />);
    const pendingBadges = screen.getAllByText(/WAITING|PENDING|STALE|NO DATA|FETCHED/i);
    expect(pendingBadges.length).toBeGreaterThan(0);
  });

  it('renders FRED fallback ag chart (not loading text) when USDA is empty', () => {
    const fredFallback = {
      data: {
        ...mockCentralData.data,
        enhancedData: {
          fred: {
            corn: { value: 200, date: '2026-07', history: [{ date: '2026-01', value: 190 }, { date: '2026-02', value: 200 }] },
            wheat: { value: 240, date: '2026-07', history: [{ date: '2026-01', value: 230 }, { date: '2026-02', value: 240 }] },
            soybeans: { value: 400, date: '2026-07', history: [{ date: '2026-01', value: 390 }, { date: '2026-02', value: 400 }] },
          },
        },
      },
    };
    renderWithContext(<CommoditiesMarket centralData={fredFallback} />, { usda: { isLive: false, summary: null } });
    expect(screen.queryByText(/ag prices loading/i)).not.toBeInTheDocument();
    expect(screen.getAllByTestId('echarts-mock').length).toBeGreaterThan(0);
    expect(screen.getByText(/FRED fallback · Corn\/Wheat\/Soybeans/i)).toBeInTheDocument();
  });

  it('renders honest empty state (no FRED fallback) instead of perpetual loading', () => {
    const noFred = { data: { ...mockCentralData.data, enhancedData: {} } };
    renderWithContext(<CommoditiesMarket centralData={noFred} />, { usda: { isLive: false, summary: null } });
    expect(screen.getByText(/no USDA key and no FRED fallback/i)).toBeInTheDocument();
  });
});