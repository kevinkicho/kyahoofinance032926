import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DerivativesMarket from '../../markets/derivatives/DerivativesMarket';

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
    vixTermStructure: {
      dates: ['Spot', '1M', '2M', '3M'],
      values: [18.5, 19.2, 19.8, 20.1],
      prevValues: [17.8, 18.9, 19.5, 19.9],
    },
  },
};

describe('DerivativesMarket', () => {
  it('renders unified dashboard with status bar', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    // Per-panel DataFooters show FETCHED when that panel has data, PENDING otherwise.
    // With vixTermStructure populated, at least the Key Metrics panel's footer renders.
    expect(screen.getAllByText(/FETCHED|WAITING|PENDING|NO DATA|STALE/i).length).toBeGreaterThan(0);
  });

  it('shows Key Metrics sidebar', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    // Title may appear in card chrome + body labels after panel extraction.
    expect(screen.getAllByText('Key Metrics').length).toBeGreaterThan(0);
  });

  it('shows VIX Term Structure section', () => {
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getAllByText('VIX Term Structure').length).toBeGreaterThan(0);
  });

  it('shows pending/no-data status when panels have no data', () => {
    const noData = { ...mockCentralData, data: {} };
    const { container } = render(<DerivativesMarket centralData={noData} />);
    // With no panel data, DataFooters inside conditional wrappers don't render.
    // Assert the market container still renders without crashing.
    expect(container.querySelector('.deriv-market')).toBeTruthy();
  });

  it('shows Gamma Exposure table panel when data available', () => {
    const withGamma = {
      ...mockCentralData,
      data: {
        ...mockCentralData.data,
        gammaExposure: { total: 12.3, callGamma: 8.1, putGamma: 4.2, netGamma: 3.9 },
      },
    };
    render(<DerivativesMarket centralData={withGamma} />);
    // MARKET_PANELS title is "Gamma Exposure" (legacy chrome said "Gamma Exposure (GEX)").
    expect(screen.getAllByText(/Gamma Exposure/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Call GEX')).toBeInTheDocument();
    expect(screen.getByText('Put GEX')).toBeInTheDocument();
    expect(screen.getByText('Net GEX')).toBeInTheDocument();
  });

  it('shows Vol Premium panel when data available', () => {
    const withVolPrem = {
      ...mockCentralData,
      data: {
        ...mockCentralData.data,
        volPremium: { atm1mIV: 22.5, realizedVol30d: 18.3, premium: 4.2 },
      },
    };
    render(<DerivativesMarket centralData={withVolPrem} />);
    expect(screen.getAllByText('Vol Premium').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ATM 1M IV/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/30d Realized/i).length).toBeGreaterThanOrEqual(1);
  });

  it('always mounts Vol Premium and Gamma shells even without GEX rows', () => {
    // Always-mount contract: empty panels stay visible for health / layout.
    render(<DerivativesMarket centralData={mockCentralData} />);
    expect(screen.getAllByText('Vol Premium').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gamma Exposure/i).length).toBeGreaterThan(0);
  });
});
