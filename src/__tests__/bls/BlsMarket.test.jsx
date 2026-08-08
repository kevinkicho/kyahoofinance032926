import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BlsMarket from '../../markets/bls/BlsMarket';

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

  it('mounts dashboard shell while loading (no full-tab skeleton)', () => {
    // Markets keep bento shells mounted so cold FRED does not hide panels.
    const { container } = render(<BlsMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeFalsy();
    expect(container.querySelector('.bls-market')).toBeTruthy();
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
    // Master-detail layout: selected metric label/value appear in the tile
    // rail and again in the detail header (and in Trends when the same
    // series is reused). Accept multiple matches.
    expect(screen.getAllByText('Unemployment Rate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('4.3').length).toBeGreaterThanOrEqual(1);
  });

  it('shows unavailable note when duration series are missing (no silent tile drop)', () => {
    const partial = {
      ...mockCentralData,
      data: {
        ...mockCentralData.data,
        series: {
          ...mockCentralData.data.series,
          unempLess5Weeks: { label: '< 5 Weeks', unit: 'K', seriesId: 'LNS13008396', latest: { period: 'March', year: '2026', value: 2182 }, previous: { period: 'February', year: '2026', value: 2200 }, history: { dates: ['2026-03'], values: [2182] }, _source: true },
          unemp5To14Weeks: { label: '5–14 Weeks', unit: 'K', seriesId: 'LNS13008756', latest: { period: 'March', year: '2026', value: 30.7 }, previous: { period: 'February', year: '2026', value: 31 }, history: { dates: ['2026-03'], values: [30.7] }, _source: true },
          unemp15To26Weeks: { label: '15–26 Weeks', unit: 'K', seriesId: 'UEMP15T26', latest: null, history: { dates: [], values: [] }, _source: false },
          unemp27PlusWeeks: { label: '27+ Weeks', unit: 'K', seriesId: 'UEMP27OV', latest: null, history: { dates: [], values: [] }, _source: false },
        },
      },
    };
    render(<BlsMarket centralData={partial} />);
    expect(screen.getByText(/2 of 4 series currently unavailable/i)).toBeInTheDocument();
  });
});