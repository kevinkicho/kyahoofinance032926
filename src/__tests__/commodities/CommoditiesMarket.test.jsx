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

  it('shows honest "— wk" (not +0K) for COT Wk Change when sentiment fallback has no history', () => {
    const centralData = {
      ...mockCentralData,
      isLive: true,
      data: { ...mockCentralData.data, cotData: null },
    };
    const sentiment = {
      data: {
        cftcData: {
          asOf: '2026-08-04',
          commodities: [
            { code: 'CL', name: 'WTI Crude Oil', netPct: 20, longK: 300, shortK: 200, oiK: 500 },
            { code: 'GC', name: 'Gold', netPct: 10, longK: 150, shortK: 100, oiK: 250 },
          ],
        },
      },
      isLoading: false,
      isLive: true,
    };
    renderWithContext(<CommoditiesMarket centralData={centralData} />, { getMarketExtra: { sentiment } });
    // WTI + Gold KPI pills and the commodity table all show "— wk" (no fake +0K).
    expect(screen.getAllByText('— wk').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('+0K wk')).not.toBeInTheDocument();
  });

  it('does not remount-crash when leftover EIA history bags are isLive-only', () => {
    const leftover = {
      ...mockCentralData,
      isLive: true,
      data: {
        ...mockCentralData.data,
        eia: {
          wti_price: { value: 78.5 },
          crude_stocks: { history: { isLive: true } },
          natgas_storage: { history: { isLive: true } },
          crude_production: { isLive: true },
        },
      },
    };
    expect(() => renderWithContext(<CommoditiesMarket centralData={leftover} />)).not.toThrow();
    expect(screen.getAllByText(/WTI Crude/).length).toBeGreaterThan(0);
  });
});