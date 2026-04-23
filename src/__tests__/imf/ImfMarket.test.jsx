import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ImfMarket from '../../markets/imf/ImfMarket';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

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
      { code: 'US', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}', gdpReal: 2.5, gdpRealPrev: 2.1, inflation: 3.2, inflationPrev: 4.1, unemployment: 3.8, unemploymentPrev: 3.9, currentAccount: -3.0, govDebt: 120.5, govDebtPrev: 118.2, govRevenue: 17.2, investment: 21.0, pop: 334.0, intlReserves: 240.0 },
      { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', gdpReal: 0.5, gdpRealPrev: 0.2, inflation: 4.0, inflationPrev: 6.5, unemployment: 4.2, govDebt: 101.0, intlReserves: null },
      { code: 'JP', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', gdpReal: 1.9, gdpRealPrev: 1.7, inflation: 3.3, inflationPrev: 2.8, unemployment: 2.6, govDebt: 254.0, intlReserves: 1300.0 },
    ],
    weoForecasts: {
      gdpReal: { US: { 2025: 2.5, 2024: 2.1 }, GB: { 2025: 0.5, 2024: 0.2 }, JP: { 2025: 1.9, 2024: 1.7 } },
    },
    ifsReserves: { US: { 2024: 240000 }, JP: { 2024: 1300000 } },
    cofer: { USD: { asOf: '2024-Q4', value: 58.2 }, EUR: { asOf: '2024-Q4', value: 20.1 }, JPY: { asOf: '2024-Q4', value: 5.7 }, GBP: { asOf: '2024-Q4', value: 4.8 }, CNY: { asOf: '2024-Q4', value: 2.3 } },
    _sources: { imfWEO_gdpReal: true, imfIFS_Reserves: true, imfCOFER: true },
    lastUpdated: '2026-04-16',
    fetchedOn: '2026-04-16',
    isCurrent: true,
  },
};

describe('ImfMarket', () => {
  it('renders skeleton when no centralData provided', () => {
    const { container } = render(<ImfMarket />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<ImfMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders fetched status when live', () => {
    render(<ImfMarket centralData={mockCentralData} />);
    expect(screen.getAllByText(/FETCHED/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/IMF WEO/).length).toBeGreaterThan(0);
  });

  it('renders no data received when not live', () => {
    const notLive = { ...mockCentralData, isLive: false };
    render(<ImfMarket centralData={notLive} />);
    expect(screen.getAllByText(/PENDING|NO DATA/i).length).toBeGreaterThan(0);
  });

  it('renders all bento panel titles', () => {
    render(<ImfMarket centralData={mockCentralData} />);
    expect(screen.getByText('IMF Scorecard')).toBeInTheDocument();
    expect(screen.getByText('GDP Growth')).toBeInTheDocument();
    expect(screen.getByText('Inflation')).toBeInTheDocument();
    expect(screen.getByText('International Reserves')).toBeInTheDocument();
    expect(screen.getByText('COFER Currency Shares')).toBeInTheDocument();
  });

  it('renders scorecard with country rows', () => {
    render(<ImfMarket centralData={mockCentralData} />);
    const rows = document.querySelectorAll('.imf-scorecard-row');
    expect(rows.length).toBe(3);
  });

  it('renders scorecard header with indicator labels', () => {
    render(<ImfMarket centralData={mockCentralData} />);
    expect(screen.getByText('GDP')).toBeInTheDocument();
    expect(screen.getByText('CPI')).toBeInTheDocument();
    expect(screen.getByText('Unemp')).toBeInTheDocument();
    expect(screen.getByText('Debt')).toBeInTheDocument();
  });

  it('stale badge shown when data is not current', () => {
    const stale = { ...mockCentralData, isCurrent: false, fetchedOn: '2026-04-14' };
    render(<ImfMarket centralData={stale} />);
    expect(screen.getAllByText(/Stale/).length).toBeGreaterThan(0);
  });

  it('handles countries with null intlReserves gracefully', () => {
    render(<ImfMarket centralData={mockCentralData} />);
    const rows = document.querySelectorAll('.imf-scorecard-row');
    expect(rows.length).toBe(3);
  });
});

describe('ImfMarket with empty data', () => {
  it('renders when countries array is empty', () => {
    // ImfDashboard early-returns null when countries is empty, so no panels render.
    // This test just ensures it doesn't crash.
    const emptyData = { ...mockCentralData, data: { ...mockCentralData.data, countries: [] } };
    const { container } = render(<ImfMarket centralData={emptyData} />);
    expect(container).toBeTruthy();
  });
});