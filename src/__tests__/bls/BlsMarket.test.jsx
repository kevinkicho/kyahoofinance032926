import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlsMarket from '../../markets/bls/BlsMarket';

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
    series: {
      unemployment: { label: 'Unemployment Rate', unit: '%', seriesId: 'LNS14000000', latest: { period: 'March', year: '2026', value: 4.3 }, previous: { period: 'February', year: '2026', value: 4.4 }, history: { dates: ['2026-03'], values: [4.3] }, _source: true },
      cpi: { label: 'CPI (All Urban)', unit: 'index', seriesId: 'CUUR0000SA0', latest: { period: 'March', year: '2026', value: 330.2 }, previous: { period: 'February', year: '2026', value: 326.8 }, history: { dates: ['2026-03'], values: [330.2] }, _source: true },
    },
    _sources: { bls_unemployment: true, bls_cpi: true },
    lastUpdated: '2026-04-17',
  },
};

describe('BlsMarket', () => {
  it('renders skeleton when no centralData provided', () => {
    const { container } = render(<BlsMarket />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<BlsMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders fetched status when live', () => {
    render(<BlsMarket centralData={mockCentralData} />);
    expect(screen.getByText(/Bureau of Labor Statistics/)).toBeInTheDocument();
  });

  it('renders unavailable message when not live and no data', () => {
    const notLive = { ...mockCentralData, isLive: false, data: { series: {}, _sources: {}, lastUpdated: null } };
    render(<BlsMarket centralData={notLive} />);
    expect(screen.getByText(/Data source temporarily unavailable/i)).toBeInTheDocument();
  });

  it('renders KPI labels and values', () => {
    render(<BlsMarket centralData={mockCentralData} />);
    expect(screen.getByText('Unemployment Rate')).toBeInTheDocument();
    expect(screen.getByText('4.3')).toBeInTheDocument();
  });
});