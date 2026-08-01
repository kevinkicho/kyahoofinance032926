import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EiaMarket from '../../markets/eia/EiaMarket';

vi.mock('../../components/BentoWrapper', () => ({ default: ({ children }) => <div data-testid="bento-wrapper">{children}</div> }));

const mockCentralData = {
  isLoading: false,
  isLive: true,
  isCurrent: true,
  lastUpdated: '2026-04-17',
  fetchedOn: '2026-04-17',
  error: null,
  fetchLog: [],
  provenance: {},
  refetch: () => {},
  data: {
    electricity: {
      residential: { dates: ['2026-01'], sales: { values: [145115], unit: 'M kWh' }, revenue: { values: [25323], unit: 'M$' }, price: { values: [17.45], unit: 'cents/kWh' }, latest: { period: '2026-01', sales: 145115, revenue: 25323, price: 17.45 }, previous: null },
      commercial: null,
      industrial: null,
    },
    co2Emissions: { total: [{ name: 'Total', latest: 4800, unit: 'MMT CO2', period: '2022' }], bySector: [{ name: 'Electric Power', latest: 1532, unit: 'MMT CO2', period: '2022', history: [] }] },
    _sources: { eia_elecResidential: true, eia_co2Total: true, eia_co2BySector: true },
    lastUpdated: '2026-04-17',
  },
};

describe('EiaMarket', () => {
  it('mounts market shell without centralData (panel-health contract, no hard crash)', () => {
    // Hooks must run before empty-state UI — full-tab skeleton-only was removed.
    const { container } = render(<EiaMarket />);
    expect(container.querySelector('.skeleton-market')).toBeFalsy();
    expect(
      container.querySelector('.eia-market')
      || container.querySelector('[data-testid="bento-wrapper"]')
      || container.firstChild,
    ).toBeTruthy();
  });

  it('mounts market shell while loading (no full-tab skeleton)', () => {
    const { container } = render(<EiaMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeFalsy();
    expect(container.querySelector('.eia-market')).toBeTruthy();
  });

  it('always mounts bento panels even with empty data (panel-health contract)', () => {
    const empty = {
      isLoading: false,
      isLive: false,
      data: {
        electricity: { residential: null, commercial: null, industrial: null },
        co2Emissions: { total: null, bySector: null },
        petroleum: {},
        naturalGas: {},
      },
      fetchLog: [],
      refetch: () => {},
    };
    const { container } = render(<EiaMarket centralData={empty} />);
    expect(container.querySelector('.eia-market')).toBeTruthy();
    expect(container.querySelector('[data-testid="bento-wrapper"]')).toBeTruthy();
    // Titles from MARKET_PANELS / independent panel modules (panel-health contract)
    expect(screen.getAllByText(/US Electricity Retail Prices/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Petroleum/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Natural Gas/i).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.bento-panel-title').length).toBeGreaterThanOrEqual(6);
  });

  it('renders fetched status when live', () => {
    render(<EiaMarket centralData={mockCentralData} />);
    expect(screen.getByText(/EIA.*Energy Information Administration/)).toBeInTheDocument();
  });

  it('renders electricity price', () => {
    render(<EiaMarket centralData={mockCentralData} />);
    expect(screen.getByText('17.45')).toBeInTheDocument();
  });

  it('renders consumption sales in B kWh and revenue in $B', () => {
    render(<EiaMarket centralData={mockCentralData} />);
    expect(screen.getByText('145.1')).toBeInTheDocument();
    expect(screen.getByText(/\$25\.3B/)).toBeInTheDocument();
  });

  it('filters Total sector from CO2 emissions table', () => {
    const dataWithTotal = {
      ...mockCentralData,
      data: {
        ...mockCentralData.data,
        co2Emissions: {
          total: [{ name: 'Total', latest: 4800, unit: 'MMT CO2', period: '2022', history: [] }],
          bySector: [
            { name: 'Electric Power', latest: 1532, unit: 'MMT CO2', period: '2022', history: [] },
            { name: 'Total', latest: 4800, unit: 'MMT CO2', period: '2022', history: [] },
            { name: 'Transportation', latest: 1810, unit: 'MMT CO2', period: '2022', history: [] },
          ],
        },
      },
    };
    render(<EiaMarket centralData={dataWithTotal} />);
    expect(screen.getByText('Electric Power')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.queryByText('Total')).not.toBeInTheDocument();
  });
});