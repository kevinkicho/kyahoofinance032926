import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EiaMarket from '../../markets/eia/EiaMarket';

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
  it('renders skeleton when no centralData provided', () => {
    const { container } = render(<EiaMarket />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<EiaMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders fetched status when live', () => {
    render(<EiaMarket centralData={mockCentralData} />);
    expect(screen.getByText(/EIA.*Energy Information Administration/)).toBeInTheDocument();
  });

  it('renders unavailable message when not live and no data', () => {
    const notLive = {
      ...mockCentralData,
      isLive: false,
      data: {
        electricity: { residential: null, commercial: null, industrial: null },
        co2Emissions: { total: null, bySector: null },
        _sources: {},
        lastUpdated: null,
      },
    };
    render(<EiaMarket centralData={notLive} />);
    expect(screen.getByText(/Data source temporarily unavailable/i)).toBeInTheDocument();
  });

  it('renders electricity price', () => {
    render(<EiaMarket centralData={mockCentralData} />);
    expect(screen.getByText('17.45')).toBeInTheDocument();
  });
});