import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorldBankMarket from '../../markets/worldbank/WorldBankMarket';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

const mockTrendData = {
  gdpGrowth: {
    US: [{ date: '2024', value: 2.79 }, { date: '2023', value: 2.89 }, { date: '2022', value: 2.51 }],
    CN: [{ date: '2024', value: 4.98 }, { date: '2023', value: 5.41 }],
  },
};

const mockCentralData = {
  isLoading: false,
  isLive: true,
  isCurrent: true,
  lastUpdated: '2026-04-16',
  fetchedOn: '2026-04-16',
  error: null,
  fetchLog: [],
  provenance: {},
  refetch: () => {},
  data: {
    countries: [
      { code: 'US', iso3: 'USA', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', gdpGrowth: 2.79, gdpGrowthPrev: 2.89, gdpGrowthYear: '2024', gdpPerCap: 82000, gdpPerCapPrev: 78000, gdpPerCapYear: '2024', inflation: 3.2, inflationPrev: 4.1, inflationYear: '2024', tradeGdp: 24, tradeGdpPrev: 23, tradeGdpYear: '2024', population: 334, populationPrev: 331, populationYear: '2024' },
      { code: 'CN', iso3: 'CHN', name: 'China', flag: '\u{1F1E8}\u{1F1F3}', gdpGrowth: 4.98, gdpGrowthPrev: 5.41, gdpGrowthYear: '2024', gdpPerCap: 12700, gdpPerCapPrev: 12500, gdpPerCapYear: '2024', inflation: 0.2, inflationPrev: 0.5, inflationYear: '2024', tradeGdp: 38, tradeGdpPrev: 39, tradeGdpYear: '2024', population: 1412, populationPrev: 1410, populationYear: '2024' },
      { code: 'DE', iso3: 'DEU', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', gdpGrowth: -0.5, gdpGrowthPrev: -0.87, gdpGrowthYear: '2024', gdpPerCap: 52000, gdpPerCapYear: '2024', inflation: 2.9, inflationYear: '2024', tradeGdp: 88, tradeGdpYear: '2024', population: 84, populationYear: '2024', intlReserves: null },
    ],
    trendData: mockTrendData,
    _sources: { wb_gdpGrowth: true, wb_gdpPerCap: true, wb_inflation: true, wb_tradeGdp: true, wb_population: true },
    lastUpdated: '2026-04-16',
    fetchedOn: '2026-04-16',
    isCurrent: true,
  },
};

describe('WorldBankMarket', () => {
  it('renders skeleton when no centralData provided', () => {
    const { container } = render(<WorldBankMarket />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<WorldBankMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders fetched status when live', () => {
    render(<WorldBankMarket centralData={mockCentralData} />);
    expect(screen.getAllByText(/FETCHED/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/World Bank WDI/).length).toBeGreaterThan(0);
  });

  it('renders no data received when not live', () => {
    const notLive = { ...mockCentralData, isLive: false };
    render(<WorldBankMarket centralData={notLive} />);
    expect(screen.getAllByText(/PENDING|NO DATA/i).length).toBeGreaterThan(0);
  });

  it('renders all bento panel titles', () => {
    render(<WorldBankMarket centralData={mockCentralData} />);
    expect(screen.getByText('World Development Indicators')).toBeInTheDocument();
    expect(screen.getByText('GDP Growth Trends')).toBeInTheDocument();
    expect(screen.getByText('GDP per Capita vs Growth')).toBeInTheDocument();
    expect(screen.getByText('Trade Openness (% of GDP)')).toBeInTheDocument();
  });

  it('renders scorecard with country rows', () => {
    render(<WorldBankMarket centralData={mockCentralData} />);
    const rows = document.querySelectorAll('.wb-scorecard-row');
    expect(rows.length).toBe(3);
  });

  it('renders scorecard header with indicator labels', () => {
    render(<WorldBankMarket centralData={mockCentralData} />);
    expect(screen.getByText('GDP')).toBeInTheDocument();
    expect(screen.getByText('CPI')).toBeInTheDocument();
    expect(screen.getByText('Trade')).toBeInTheDocument();
  });

  it('handles null gdpPerCap gracefully', () => {
    render(<WorldBankMarket centralData={mockCentralData} />);
    const rows = document.querySelectorAll('.wb-scorecard-row');
    expect(rows.length).toBe(3);
  });

  it('stale badge shown when data is not current', () => {
    const stale = { ...mockCentralData, isCurrent: false, fetchedOn: '2026-04-14' };
    render(<WorldBankMarket centralData={stale} />);
    expect(screen.getAllByText(/Stale/).length).toBeGreaterThan(0);
  });
});