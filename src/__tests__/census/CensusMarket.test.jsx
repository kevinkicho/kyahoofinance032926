import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CensusMarket from '../../markets/census/CensusMarket';

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
      housingStarts: { label: 'Housing Starts', unit: 'K', seriesId: 'HOUST', source: 'Census Bureau', latest: { date: '2026-01-01', value: 1487 }, previous: { date: '2025-12-01', value: 1460 }, history: { dates: ['2026-01-01'], values: [1487] }, _source: true },
      tradeBalance: { label: 'Trade Balance', unit: 'M$', seriesId: 'BOPGSTB', source: 'Census Bureau / BEA', latest: { date: '2026-02-01', value: -57347 }, previous: { date: '2026-01-01', value: -56200 }, history: { dates: ['2026-02-01'], values: [-57347] }, _source: true },
    },
    _sources: { census_housingStarts: true, census_tradeBalance: true },
    lastUpdated: '2026-04-17',
  },
};

describe('CensusMarket', () => {
  it('renders skeleton when no centralData provided', () => {
    const { container } = render(<CensusMarket />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<CensusMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders fetched status when live', () => {
    render(<CensusMarket centralData={mockCentralData} />);
    expect(screen.getByText(/Census Bureau/)).toBeInTheDocument();
  });

  it('renders unavailable message when not live', () => {
    const notLive = { ...mockCentralData, isLive: false };
    render(<CensusMarket centralData={notLive} />);
    expect(screen.getByText(/Data source temporarily unavailable/i)).toBeInTheDocument();
  });

  it('renders housing starts KPI', () => {
    render(<CensusMarket centralData={mockCentralData} />);
    expect(screen.getByText('Housing Starts')).toBeInTheDocument();
  });
});