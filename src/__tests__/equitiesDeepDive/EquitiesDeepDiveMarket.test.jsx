import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EquitiesDeepDiveMarket from '../../markets/equitiesDeepDive/EquitiesDeepDiveMarket';

vi.mock('../../components/SafeECharts/SafeECharts', () => ({ default: (props) => <div data-testid="echarts-mock" /> }));

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
    sectorData: {
      sectors: [
        { code: 'SPY', name: 'S&P 500', perf1m: 3.0, perf3m: 8.0, pe: 22.0 },
        { code: 'XLK', name: 'Technology', perf1m: 5.2, perf3m: 12.1, pe: 28.5 },
        { code: 'XLF', name: 'Financials', perf1m: 2.1, perf3m: 6.5, pe: 14.2 },
        { code: 'XLE', name: 'Energy', perf1m: -1.5, perf3m: 3.0, pe: 12.0 },
      ],
    },
    factorData: {
      inFavor: { momentum: 72, value: 45, quality: 68, lowVol: 55 },
      stocks: [
        { ticker: 'AAPL', composite: 85, momentum: 90, value: 60, quality: 88, lowVol: 70 },
      ],
    },
    shortData: {
      mostShorted: [
        { ticker: 'TSLA', shortFloat: 25.3, composite: 80 },
      ],
    },
  },
};

const mockInstitutionalData = {
  isLoading: false,
  isLive: false,
  isCurrent: false,
  lastUpdated: null,
  fetchedOn: null,
  error: null,
  fetchLog: [],
  refetch: () => {},
  data: {
    lastUpdated: null,
    institutions: [],
    aggregateTopHoldings: [],
    recentChanges: { lastQuarter: null, bigBuys: [], bigSells: [], newPositions: [] },
  },
};

describe('EquitiesDeepDiveMarket', () => {
  it('renders unified dashboard with status bar', () => {
    render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={mockInstitutionalData} />);
    expect(screen.getAllByText(/WAITING|PENDING|NO DATA|STALE|FETCHED|LOADING|UNAVAIL/i).length).toBeGreaterThan(0);
  });

  it('shows sidebar with Sector Performance', () => {
    render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={mockInstitutionalData} />);
    expect(screen.getAllByText('Sector Performance').length).toBeGreaterThan(0);
  });

  it('shows Factor Scores / Factor Leaders panels', () => {
    render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={mockInstitutionalData} />);
    expect(screen.getAllByText(/Factor Scores|Factor Leaders/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows ETF Performance panel', () => {
    render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={mockInstitutionalData} />);
    expect(screen.getAllByText('ETF Performance').length).toBeGreaterThan(0);
  });

  it('shows no data received status when not live', () => {
    render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={mockInstitutionalData} />);
    expect(screen.getAllByText(/WAITING|PENDING|NO DATA|STALE|FETCHED|LOADING|UNAVAIL/i).length).toBeGreaterThan(0);
  });

  it('handles leftover isLive institution bags without remount-crashing', () => {
    expect(() => render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={{ ...mockInstitutionalData, data: { isLive: true } }} />)).not.toThrow();
    expect(() => render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={{ ...mockInstitutionalData, data: { institutions: { isLive: true } } }} />)).not.toThrow();
    expect(() => render(<EquitiesDeepDiveMarket centralData={mockCentralData} institutionalData={{ ...mockInstitutionalData, data: { institutions: [{ isLive: true }] } }} />)).not.toThrow();
  });

});
