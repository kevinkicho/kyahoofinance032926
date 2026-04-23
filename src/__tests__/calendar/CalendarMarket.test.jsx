import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarMarket from '../../markets/calendar/CalendarMarket';

vi.mock('../../components/BentoWrapper', () => ({ default: ({ children }) => <div data-testid="bento-wrapper">{children}</div> }));
vi.mock('../../components/DataFooter/DataFooter', () => ({ default: () => <div data-testid="data-footer" /> }));
vi.mock('../../markets/calendar/components/EconomicCalendar', () => ({ default: () => <div data-testid="economic-calendar" /> }));
vi.mock('../../markets/calendar/components/CentralBankSchedule', () => ({ default: () => <div data-testid="central-bank-schedule" /> }));
vi.mock('../../markets/calendar/components/EarningsSeason', () => ({ default: () => <div data-testid="earnings-season" /> }));
vi.mock('../../markets/calendar/components/KeyReleases', () => ({ default: () => <div data-testid="key-releases" /> }));

const mockEvents = [
  { id: '1', date: '2026-04-23', time: '08:30', country: 'US', name: 'CPI', importance: 'high', actual: null, forecast: '2.6%', prior: '2.5%' },
  { id: '2', date: '2026-04-24', time: '10:00', country: 'US', name: 'Existing Home Sales', importance: 'medium', actual: null, forecast: '5.1M', prior: '5.0M' },
];

const mockCentralBanks = [
  { code: 'Fed', name: 'Federal Reserve', meetingDate: '2026-05-07', rate: '4.50%', forwardGuidance: 'data-dependent' },
  { code: 'ECB', name: 'European Central Bank', meetingDate: '2026-04-24', rate: '2.75%', forwardGuidance: 'data-dependent' },
];

const mockEarningsSeason = [
  { ticker: 'AAPL', date: '2026-04-28', estimate: '1.52', period: 'Q2' },
  { ticker: 'MSFT', date: '2026-04-29', estimate: '2.75', period: 'Q3' },
];

const mockKeyReleases = [
  { date: '2026-04-23', name: 'CPI', agency: 'BLS', importance: 'high' },
  { date: '2026-04-24', name: 'Existing Home Sales', agency: 'NAR', importance: 'medium' },
];

const mockTreasuryAuctions = [
  { date: '2026-04-27', term: '2Y', amount: '42B' },
  { date: '2026-04-28', term: '5Y', amount: '58B' },
];

const mockOptionsExpiry = [
  { date: '2026-04-17', type: 'Monthly' },
  { date: '2026-05-15', type: 'Monthly' },
];

const mockCentralData = {
  isLoading: false,
  isLive: true,
  isCurrent: true,
  lastUpdated: '2026-04-22',
  fetchedOn: '2026-04-22',
  error: null,
  fetchLog: [],
  refetch: () => {},
  data: {
    economicEvents: mockEvents,
    centralBanks: mockCentralBanks,
    earningsSeason: mockEarningsSeason,
    keyReleases: mockKeyReleases,
    treasuryAuctions: mockTreasuryAuctions,
    optionsExpiry: mockOptionsExpiry,
    dividendCalendar: [],
  },
};

describe('CalendarMarket', () => {
  it('renders skeleton when no centralData provided', () => {
    const { container } = render(<CalendarMarket />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders skeleton when loading', () => {
    const { container } = render(<CalendarMarket centralData={{ isLoading: true, data: null }} />);
    expect(container.querySelector('.skeleton-market')).toBeTruthy();
  });

  it('renders all bento panel titles', () => {
    render(<CalendarMarket centralData={mockCentralData} />);
    expect(screen.getByText('Economic Calendar')).toBeInTheDocument();
    expect(screen.getByText('Central Bank Rates')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
    expect(screen.getByText('Earnings Season')).toBeInTheDocument();
    expect(screen.getByText('Key US Releases')).toBeInTheDocument();
    expect(screen.getByText('Treasury Auctions')).toBeInTheDocument();
    expect(screen.getByText('Options Expiry')).toBeInTheDocument();
  });

  it('renders economic calendar panel with events', () => {
    render(<CalendarMarket centralData={mockCentralData} />);
    expect(screen.getByText('High-importance macro releases · next 30 days')).toBeInTheDocument();
  });

  it('renders central bank rates section', () => {
    render(<CalendarMarket centralData={mockCentralData} />);
    expect(screen.getByText('Fed / ECB / BOE / BOJ')).toBeInTheDocument();
  });

  it('renders earnings season section', () => {
    render(<CalendarMarket centralData={mockCentralData} />);
    expect(screen.getByText('Mega-cap earnings · next 60 days')).toBeInTheDocument();
  });

  it('renders key US releases section', () => {
    render(<CalendarMarket centralData={mockCentralData} />);
    expect(screen.getByText('Scheduled macro data')).toBeInTheDocument();
  });

  it('renders treasury auctions section', () => {
    render(<CalendarMarket centralData={mockCentralData} />);
    expect(screen.getByText('US Treasury schedule')).toBeInTheDocument();
  });

  it('renders options expiry section', () => {
    render(<CalendarMarket centralData={mockCentralData} />);
    expect(screen.getByText('Monthly expiry dates')).toBeInTheDocument();
    expect(screen.getByText('2026-04-17')).toBeInTheDocument();
    expect(screen.getAllByText('Monthly').length).toBe(2);
  });

  it('renders empty state when no events available', () => {
    const noData = {
      ...mockCentralData,
      data: {
        economicEvents: [],
        centralBanks: [],
        earningsSeason: [],
        keyReleases: [],
        treasuryAuctions: [],
        optionsExpiry: [],
        dividendCalendar: [],
      },
    };
    render(<CalendarMarket centralData={noData} />);
    expect(screen.getByText('Press ▶ to fetch economic events')).toBeInTheDocument();
  });

  it('handles missing data props gracefully', () => {
    const minimalData = {
      isLoading: false,
      isLive: true,
      isCurrent: true,
      lastUpdated: '2026-04-22',
      fetchedOn: '2026-04-22',
      error: null,
      fetchLog: [],
      refetch: () => {},
      data: {},
    };
    render(<CalendarMarket centralData={minimalData} />);
    expect(screen.getByText('Press ▶ to fetch economic events')).toBeInTheDocument();
  });
});